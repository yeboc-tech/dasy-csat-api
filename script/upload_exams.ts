#!/usr/bin/env node
/**
 * Exam File Upload Script
 * Uploads exam files to Supabase database and AWS S3 bucket
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getSupabaseClient } from '../src/supabase/supabase-client';

// Load environment variables
dotenv.config();

interface ExamMetadata {
    grade_level: string;
    category: string;
    subject: string;
    selection: string;
    exam_type: string;
    exam_year: number;
    exam_month: number;
    source: string;
    doc_type: string;
    filename: string;
}

interface SupabaseRecord {
    id: string;
    title: string;
    subject: string;
    filename: string;
    storage_path: string;
    correct_answers: Record<string, any>;
    question_scores: Record<string, any>;
    created_at?: string;
    category: string;
    source: string;
    grade_level: string;
    exam_year: number;
    exam_month: number;
    exam_type: string;
    selection?: string;
}

class ExamFileUploader {
    private supabase: SupabaseClient;
    private s3Client: S3Client;
    private s3Bucket: string;
    private s3Region: string;

    // Valid values from naming convention
    private readonly validGradeLevels = ['고1', '고2', '고3'];
    private readonly validCategories = ['국어', '수학', '영어', '한국사', '사회탐구', '과학탐구', '직업탐구', '제2외국어'];
    private readonly validExamTypes = ['수능', '학력평가', '모의고사'];
    private readonly validSources = ['평가원', '교육청', '사설'];
    private readonly validDocTypes = ['problem', 'answer', 'explanation'];

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
    }

    parseFilename(filename: string): ExamMetadata | null {
        /** Parse filename according to naming convention */
        if (!filename.endsWith('.pdf')) {
            return null;
        }

        // Remove .pdf extension
        const name = filename.slice(0, -4);
        const parts = name.split('_');

        // Expected format: grade_category_subject_selection_examType_year_month_source_docType
        // For files with empty selection: grade_category_subject__examType_year_month_source_docType
        if (parts.length < 8 || parts.length > 9) {
            return null;
        }

        const gradeLevel = parts[0];
        const category = parts[1];
        const subject = parts[2];

        let selection: string;
        let examType: string;
        let examYear: number;
        let examMonth: number;
        let source: string;
        let docType: string;

        // Check if we have 8 parts (no selection) or 9 parts (with selection)
        if (parts.length === 8) {
            // No selection field: grade_category_subject_examType_year_month_source_docType
            selection = '';
            examType = parts[3];
            examYear = parseInt(parts[4]);
            examMonth = parseInt(parts[5]);
            source = parts[6];
            docType = parts[7];
        } else {
            // With selection field: grade_category_subject_selection_examType_year_month_source_docType
            // Check if parts[3] is empty (double underscore case)
            if (parts[3] === '') {
                selection = '';
                examType = parts[4];
                examYear = parseInt(parts[5]);
                examMonth = parseInt(parts[6]);
                source = parts[7];
                docType = parts[8];
            } else {
                // Check if parts[3] is a valid selection or exam_type
                if (this.validExamTypes.includes(parts[3])) {
                    // parts[3] is exam_type, so no selection
                    selection = '';
                    examType = parts[3];
                    examYear = parseInt(parts[4]);
                    examMonth = parseInt(parts[5]);
                    source = parts[6];
                    docType = parts[7];
                } else {
                    // parts[3] is selection
                    selection = parts[3];
                    examType = parts[4];
                    examYear = parseInt(parts[5]);
                    examMonth = parseInt(parts[6]);
                    source = parts[7];
                    docType = parts[8];
                }
            }
        }

        // Validate components

        
        // Normalize strings to handle Unicode encoding issues
        // Convert decomposed Hangul characters (NFD) to precomposed form (NFC)
        const normalizedGradeLevel = gradeLevel.normalize('NFC');
        const normalizedCategory = category.normalize('NFC');
        const normalizedExamType = examType.normalize('NFC');
        const normalizedSource = source.normalize('NFC');
        const normalizedDocType = docType.normalize('NFC');
        
        // Normalize subject and selection as well
        const normalizedSubject = subject.normalize('NFC');
        const normalizedSelection = selection.normalize('NFC');
        
        // Ensure proper UTF-8 encoding for Korean characters
        const ensureUTF8 = (str: string): string => {
          // Convert to Buffer and back to ensure proper UTF-8 encoding
          return Buffer.from(str, 'utf8').toString('utf8');
        };
        
        const gradeLevelValid = this.validGradeLevels.includes(normalizedGradeLevel);
        const categoryValid = this.validCategories.includes(normalizedCategory);
        const examTypeValid = this.validExamTypes.includes(normalizedExamType);
        const sourceValid = this.validSources.includes(normalizedSource);
        const docTypeValid = this.validDocTypes.includes(normalizedDocType);
        const examYearValid = !isNaN(examYear);
        const examMonthValid = !isNaN(examMonth);

        if (
            !gradeLevelValid ||
            !categoryValid ||
            !examTypeValid ||
            !sourceValid ||
            !docTypeValid ||
            !examYearValid ||
            !examMonthValid
        ) {
            return null;
        }

        return {
            grade_level: ensureUTF8(normalizedGradeLevel),
            category: ensureUTF8(normalizedCategory),
            subject: ensureUTF8(normalizedSubject),
            selection: ensureUTF8(normalizedSelection),
            exam_type: ensureUTF8(normalizedExamType),
            exam_year: examYear,
            exam_month: examMonth,
            source: ensureUTF8(normalizedSource),
            doc_type: ensureUTF8(normalizedDocType),
            filename,
        };
    }

    generateTitle(metadata: ExamMetadata): string {
        /** Generate a human-readable title from metadata */
        const selectionText = metadata.selection ? ` ${metadata.selection}` : '';
        return `${metadata.grade_level} ${metadata.category} ${metadata.subject}${selectionText} ${metadata.exam_type} ${metadata.exam_year}년 ${metadata.exam_month}월 ${metadata.source}`;
    }

    generateStoragePath(metadata: ExamMetadata): string {
        /** Generate storage path based on metadata */
        const selectionPath = metadata.selection ? `/${metadata.selection}` : '';
        return `exams/${metadata.grade_level}/${metadata.category}/${metadata.subject}${selectionPath}/${metadata.exam_year}/${metadata.exam_month}/${metadata.source}/${metadata.doc_type}.pdf`;
    }

    async uploadToS3(filePath: string, s3Key: string): Promise<boolean> {
        /** Upload file to S3 */
        try {
            const fileContent = fs.readFileSync(filePath);
            const command = new PutObjectCommand({
                Bucket: this.s3Bucket,
                Key: s3Key,
                Body: fileContent,
                ContentType: 'application/pdf',
            });

            await this.s3Client.send(command);
            console.log(`✅ Uploaded to S3: ${s3Key}`);
            return true;
        } catch (error) {
            console.log(`❌ S3 upload failed for ${filePath}:`, error);
            return false;
        }
    }

    async uploadToSupabase(metadata: ExamMetadata, storagePath: string): Promise<boolean> {
        /** Upload metadata to Supabase */
        try {
            const title = this.generateTitle(metadata);

            const data: SupabaseRecord = {
                id: crypto.randomUUID(), // Generate UUID for the documents table
                title: title,
                subject: metadata.subject,
                filename: metadata.filename,
                storage_path: storagePath,
                correct_answers: {}, // Empty object as default
                question_scores: {}, // Empty object as default
                created_at: new Date().toISOString(),
                category: metadata.category,
                source: metadata.source,
                grade_level: metadata.grade_level,
                exam_year: metadata.exam_year,
                exam_month: metadata.exam_month,
                exam_type: metadata.exam_type,
                selection: metadata.selection,
            };

            const { error } = await this.supabase
                .from('documents')
                .upsert(data);

            if (error) {
                throw error;
            }

            console.log(`✅ Uploaded to Supabase: ${metadata.filename}`);
            return true;
        } catch (error) {
            console.log(`❌ Supabase upload failed for ${metadata.filename}:`, error);
            return false;
        }
    }

    async processFile(filePath: string): Promise<boolean> {
        /** Process a single file */
        const filename = path.basename(filePath);
        const metadata = this.parseFilename(filename);

        if (!metadata) {
            console.log(`⚠️  Skipping invalid filename: ${filename}`);
            return false;
        }

        // Generate storage path
        const storagePath = this.generateStoragePath(metadata);

        // Upload to S3
        const s3Success = await this.uploadToS3(filePath, storagePath);
        if (!s3Success) {
            return false;
        }

        // Upload to Supabase
        const supabaseSuccess = await this.uploadToSupabase(metadata, storagePath);
        return supabaseSuccess;
    }

    async uploadAllFiles(dataDir: string = 'script/data'): Promise<void> {
        /** Upload all PDF files in the data directory */
        const dataPath = path.resolve(dataDir);

        if (!fs.existsSync(dataPath)) {
            console.log(`❌ Data directory not found: ${dataPath}`);
            return;
        }

        const files = fs.readdirSync(dataPath);
        const pdfFiles = files
            .filter(file => file.endsWith('.pdf'))
            .map(file => path.join(dataPath, file));

        if (pdfFiles.length === 0) {
            console.log(`❌ No PDF files found in ${dataPath}`);
            return;
        }

        console.log(`📁 Found ${pdfFiles.length} PDF files to upload`);

        let successCount = 0;
        for (const filePath of pdfFiles) {
            if (await this.processFile(filePath)) {
                successCount++;
            }
        }

        console.log(`\n📊 Upload Summary:`);
        console.log(`✅ Successfully uploaded: ${successCount}/${pdfFiles.length} files`);
    }
}

async function main(): Promise<void> {
    /** Main function */
    try {
        const uploader = new ExamFileUploader();

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

        // Upload files
        await uploader.uploadAllFiles();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
} 