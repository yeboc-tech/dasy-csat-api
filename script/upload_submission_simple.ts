#!/usr/bin/env node
/**
 * Document Submission Upload Script
 * Uploads user submission files to Supabase database and AWS S3 bucket with flat UUID-based structure
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SubmissionData {
    user_id: string;
    document_id: string;
    user_answers: Record<string, any>;
    score?: number;
    incorrect_questions?: number[];
    unanswered_questions?: number[];
    filePath?: string; // Optional: if uploading a file
}

interface SupabaseSubmissionRecord {
    id: string;
    user_id: string;
    document_id: string;
    storage_path: string;
    user_answers: Record<string, any>;
    score: number | null;
    incorrect_questions: number[];
    unanswered_questions: number[];
    created_at?: string;
}

class DocumentSubmissionUploader {
    private supabase: SupabaseClient;
    private s3Client: S3Client;
    private s3Bucket: string;
    private s3Region: string;

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
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        });
        this.s3Client = new S3Client({
            region: this.s3Region,
            credentials: {
                accessKeyId: awsAccessKey,
                secretAccessKey: awsSecretKey,
            },
        });
    }

    generateSubmissionStoragePath(submissionId: string): string {
        /** Generate storage path for submission using UUID */
        return `document_submissions/${submissionId}.pdf`;
    }

    async uploadFileToS3(filePath: string, s3Key: string): Promise<boolean> {
        /** Upload file to S3 */
        try {
            const fileContent = fs.readFileSync(filePath);
            const command = new PutObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
                Body: fileContent,
                ContentType: 'application/pdf',
                Metadata: {
                    'original-filename': Buffer.from(path.basename(filePath)).toString('base64'),
                    'upload-timestamp': new Date().toISOString(),
                    'type': 'submission',
                },
            });

            await this.s3Client.send(command);
            console.log(`✅ Uploaded submission to S3: ${s3Key}`);
            return true;
        } catch (error) {
            console.log(`❌ S3 upload failed for ${filePath}:`, error);
            return false;
        }
    }

    async uploadSubmissionToSupabase(data: SubmissionData): Promise<string | null> {
        /** Upload submission data to Supabase and return the submission ID */
        try {
            const submissionId = crypto.randomUUID();
            const storagePath = data.filePath ? this.generateSubmissionStoragePath(submissionId) : '';

            const submissionData: SupabaseSubmissionRecord = {
                id: submissionId,
                user_id: data.user_id,
                document_id: data.document_id,
                storage_path: storagePath,
                user_answers: data.user_answers,
                score: data.score || null,
                incorrect_questions: data.incorrect_questions || [],
                unanswered_questions: data.unanswered_questions || [],
                created_at: new Date().toISOString(),
            };

            const { error } = await this.supabase
                .from('document_submissions')
                .insert(submissionData);

            if (error) {
                throw error;
            }

            console.log(`✅ Uploaded submission to Supabase (ID: ${submissionId})`);
            return submissionId;
        } catch (error) {
            console.log(`❌ Supabase submission upload failed:`, error);
            return null;
        }
    }

    async processSubmission(data: SubmissionData): Promise<boolean> {
        /** Process a single submission */
        // Upload to Supabase first to get the submission ID
        const submissionId = await this.uploadSubmissionToSupabase(data);
        if (!submissionId) {
            return false;
        }

        // If there's a file to upload, do it
        if (data.filePath) {
            const storagePath = this.generateSubmissionStoragePath(submissionId);
            
            // Update the storage path in Supabase
            const { error } = await this.supabase
                .from('document_submissions')
                .update({ storage_path: storagePath })
                .eq('id', submissionId);

            if (error) {
                console.log(`❌ Failed to update storage path for ${submissionId}:`, error);
                return false;
            }

            // Upload file to S3
            const s3Success = await this.uploadFileToS3(data.filePath, storagePath);
            return s3Success;
        }

        return true;
    }

    async uploadSubmission(data: SubmissionData): Promise<boolean> {
        /** Upload a single submission */
        console.log(`📝 Processing submission for user ${data.user_id} on document ${data.document_id}`);
        
        const success = await this.processSubmission(data);
        
        if (success) {
            console.log(`✅ Submission processed successfully`);
        } else {
            console.log(`❌ Submission processing failed`);
        }
        
        return success;
    }

    async uploadMultipleSubmissions(submissions: SubmissionData[]): Promise<void> {
        /** Upload multiple submissions */
        console.log(`📝 Processing ${submissions.length} submissions`);
        console.log(`📂 S3 Structure: s3://${this.s3Bucket}/document_submissions/{submission_uuid}.pdf`);

        let successCount = 0;
        for (const submission of submissions) {
            if (await this.processSubmission(submission)) {
                successCount++;
            }
        }

        console.log(`\n📊 Upload Summary:`);
        console.log(`✅ Successfully uploaded: ${successCount}/${submissions.length} submissions`);
        console.log(`📂 Files stored in: s3://${this.s3Bucket}/document_submissions/`);
    }
}

// Example usage function
async function exampleUsage(): Promise<void> {
    const uploader = new DocumentSubmissionUploader();

    // Example submission data
    const submissionData: SubmissionData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        document_id: '987fcdeb-51a2-43d1-b789-123456789abc',
        user_answers: {
            '1': 'A',
            '2': 'B',
            '3': 'C',
            // ... more answers
        },
        score: 85.5,
        incorrect_questions: [2, 5, 8],
        unanswered_questions: [10],
        filePath: '/path/to/submission.pdf', // Optional
    };

    await uploader.uploadSubmission(submissionData);
}

async function main(): Promise<void> {
    /** Main function */
    try {
        const uploader = new DocumentSubmissionUploader();

        // Check required environment variables
        const requiredVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'S3_BUCKET_NAME',
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
            console.log('Please set them in your .env file');
            process.exit(1);
        }

        // Run example usage
        await exampleUsage();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
} 