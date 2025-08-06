#!/usr/bin/env node
/**
 * Thumbnail Update Script
 * Regenerates PNG thumbnails from the first page of PDF files in S3 documents bucket
 * with proper aspect ratio preservation using pure Node.js libraries
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getSupabaseClient } from '../src/supabase/supabase-client';

// Load environment variables
dotenv.config();

interface DocumentRecord {
    id: string;
    title: string;
    subject: string;
    filename: string;
    storage_path: string;
    category: string;
    source: string;
    grade_level: string;
    exam_year: number;
    exam_month: number;
    exam_type: string;
    selection?: string;
}

class ThumbnailUpdater {
    private supabase: SupabaseClient;
    private s3Client: S3Client;
    private s3Bucket: string;
    private s3Region: string;
    private tempDir: string;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
        this.s3Bucket = process.env.S3_BUCKET_NAME || '';
        this.s3Region = process.env.AWS_REGION || 'us-east-1';

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }

        if (!awsAccessKey || !awsSecretKey || !this.s3Bucket) {
            throw new Error('Missing AWS configuration');
        }

        // Initialize clients
        this.supabase = getSupabaseClient();
        this.s3Client = new S3Client({
            region: this.s3Region,
            credentials: {
                accessKeyId: awsAccessKey,
                secretAccessKey: awsSecretKey,
            },
        });

        // Create temporary directory for processing
        this.tempDir = path.join(os.tmpdir(), 'pdf-thumbnails-update');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Get all documents from Supabase database
     */
    async getAllDocuments(): Promise<DocumentRecord[]> {
        try {
            const { data, error } = await this.supabase
                .from('documents')
                .select('*');

            if (error) {
                throw new Error(`Failed to fetch documents: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    }

    /**
     * Download PDF file from S3
     */
    async downloadPDFFromS3(s3Key: string, localPath: string): Promise<boolean> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
            });

            const response = await this.s3Client.send(command);
            
            if (!response.Body) {
                throw new Error('No body in S3 response');
            }

            const fileStream = fs.createWriteStream(localPath);
            const bodyStream = response.Body as any;
            
            return new Promise((resolve, reject) => {
                bodyStream.pipe(fileStream);
                bodyStream.on('error', reject);
                fileStream.on('finish', () => resolve(true));
                fileStream.on('error', reject);
            });
        } catch (error) {
            console.error(`Error downloading PDF from S3: ${s3Key}`, error);
            return false;
        }
    }

    /**
     * Generate thumbnail from PDF with proper aspect ratio preservation
     */
    async generateThumbnail(pdfPath: string, outputPath: string): Promise<boolean> {
        try {
            // Use pdf2pic library for PDF to image conversion
            const { fromPath } = require('pdf2pic');
            
            const options = {
                density: 150,           // Higher density for better quality
                saveFilename: path.basename(outputPath, '.png'),
                savePath: path.dirname(outputPath),
                format: 'png',
                width: 800,             // Set a reasonable max width
                height: 1200,           // Set a reasonable max height
                quality: 100,           // Maximum quality
                // Don't specify GraphicsMagick path to use system default
                // This should preserve aspect ratio better
            };

            const convert = fromPath(pdfPath, options);
            
            // Convert first page only
            const pageData = await convert(1);
            
            if (pageData && pageData.path) {
                // Rename the output file to match expected name
                const generatedPath = pageData.path;
                if (generatedPath !== outputPath && fs.existsSync(generatedPath)) {
                    fs.renameSync(generatedPath, outputPath);
                }
                return fs.existsSync(outputPath);
            }
            
            return false;
        } catch (error) {
            console.error('Error generating thumbnail with pdf2pic:', error);
            return false;
        }
    }

    /**
     * Delete existing thumbnail from S3
     */
    async deleteThumbnailFromS3(s3Key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            console.error(`Error deleting thumbnail from S3: ${s3Key}`, error);
            return false;
        }
    }

    /**
     * Upload thumbnail to S3
     */
    async uploadThumbnailToS3(localPath: string, s3Key: string): Promise<boolean> {
        try {
            const fileContent = fs.readFileSync(localPath);
            
            const command = new PutObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
                Body: fileContent,
                ContentType: 'image/png',
                CacheControl: 'public, max-age=31536000', // 1 year cache
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            console.error(`Error uploading thumbnail to S3: ${s3Key}`, error);
            return false;
        }
    }

    /**
     * Check if thumbnail already exists in S3
     */
    async thumbnailExists(s3Key: string): Promise<boolean> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Process a single document to update thumbnail
     */
    async processDocument(document: DocumentRecord): Promise<boolean> {
        const documentId = document.id;
        const pdfS3Key = `documents/${documentId}.pdf`;
        const thumbnailS3Key = `thumbnails/${documentId}.png`;
        
        console.log(`Processing document: ${document.title} (${documentId})`);

        // Create temporary file paths
        const tempPdfPath = path.join(this.tempDir, `${documentId}.pdf`);
        const tempThumbnailPath = path.join(this.tempDir, `${documentId}.png`);

        try {
            // Download PDF from S3
            console.log(`Downloading PDF: ${pdfS3Key}`);
            const downloadSuccess = await this.downloadPDFFromS3(pdfS3Key, tempPdfPath);
            if (!downloadSuccess) {
                console.error(`Failed to download PDF: ${pdfS3Key}`);
                return false;
            }

            // Generate new thumbnail with proper aspect ratio
            console.log(`Generating new thumbnail for: ${documentId}`);
            const thumbnailSuccess = await this.generateThumbnail(tempPdfPath, tempThumbnailPath);
            if (!thumbnailSuccess) {
                console.error(`Failed to generate thumbnail for: ${documentId}`);
                return false;
            }

            // Delete existing thumbnail if it exists
            if (await this.thumbnailExists(thumbnailS3Key)) {
                console.log(`Deleting existing thumbnail: ${thumbnailS3Key}`);
                await this.deleteThumbnailFromS3(thumbnailS3Key);
            }

            // Upload new thumbnail to S3
            console.log(`Uploading new thumbnail: ${thumbnailS3Key}`);
            const uploadSuccess = await this.uploadThumbnailToS3(tempThumbnailPath, thumbnailS3Key);
            if (!uploadSuccess) {
                console.error(`Failed to upload thumbnail: ${thumbnailS3Key}`);
                return false;
            }

            console.log(`Successfully updated: ${documentId}`);
            return true;
        } catch (error) {
            console.error(`Error processing document ${documentId}:`, error);
            return false;
        } finally {
            // Clean up temporary files
            try {
                if (fs.existsSync(tempPdfPath)) {
                    fs.unlinkSync(tempPdfPath);
                }
                if (fs.existsSync(tempThumbnailPath)) {
                    fs.unlinkSync(tempThumbnailPath);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up temporary files:', cleanupError);
            }
        }
    }

    /**
     * Update all document thumbnails with proper aspect ratio
     */
    async updateAllThumbnails(): Promise<void> {
        try {
            console.log('Fetching documents from database...');
            const documents = await this.getAllDocuments();
            
            if (documents.length === 0) {
                console.log('No documents found in database');
                return;
            }

            console.log(`Found ${documents.length} documents to update`);

            let successCount = 0;
            let errorCount = 0;

            // Process documents one at a time to avoid overwhelming the system
            for (let i = 0; i < documents.length; i++) {
                const document = documents[i];
                
                console.log(`\n--- Processing document ${i + 1}/${documents.length} ---`);
                
                const success = await this.processDocument(document);
                if (success) {
                    successCount++;
                } else {
                    errorCount++;
                }
                
                // Small delay between documents to be gentle on the system
                if (i + 1 < documents.length) {
                    console.log('Waiting 2 seconds before next document...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            console.log(`\n=== Thumbnail update completed! ===`);
            console.log(`Success: ${successCount}`);
            console.log(`Errors: ${errorCount}`);
            console.log(`Total: ${documents.length}`);

        } catch (error) {
            console.error('Error updating thumbnails:', error);
            throw error;
        } finally {
            // Clean up temporary directory
            try {
                if (fs.existsSync(this.tempDir)) {
                    fs.rmSync(this.tempDir, { recursive: true, force: true });
                }
            } catch (cleanupError) {
                console.error('Error cleaning up temporary directory:', cleanupError);
            }
        }
    }
}

async function main(): Promise<void> {
    try {
        console.log('Starting thumbnail update process...');
        console.log('This will regenerate ALL thumbnails with proper aspect ratio preservation');
        console.log('Make sure you have sufficient storage and bandwidth for this operation');
        
        // Ask for confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise<string>((resolve) => {
            rl.question('Do you want to continue? (yes/no): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
            console.log('Operation cancelled by user');
            return;
        }
        
        const updater = new ThumbnailUpdater();
        await updater.updateAllThumbnails();
        
        console.log('Thumbnail update process completed successfully!');
    } catch (error) {
        console.error('Thumbnail update process failed:', error);
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

export { ThumbnailUpdater }; 