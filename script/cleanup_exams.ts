#!/usr/bin/env node
/**
 * Exam File Cleanup Script
 * Deletes all exam files from Supabase database and AWS S3 bucket
 */

import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ExamFileCleanup {
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
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.s3Client = new S3Client({
            region: this.s3Region,
            credentials: {
                accessKeyId: awsAccessKey,
                secretAccessKey: awsSecretKey,
            },
        });
    }

    async deleteFromSupabase(): Promise<number> {
        /** Delete all records from Supabase documents table */
        try {
            // First, count the records
            const { count, error: countError } = await this.supabase
                .from('documents')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                throw countError;
            }

            // Then delete all records
            const { error } = await this.supabase
                .from('documents')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

            if (error) {
                throw error;
            }

            console.log(`✅ Deleted ${count || 0} records from Supabase`);
            return count || 0;
        } catch (error) {
            console.log(`❌ Supabase deletion failed:`, error);
            return 0;
        }
    }

    async listS3Objects(prefix: string = 'exams/'): Promise<string[]> {
        /** List all objects in S3 with the given prefix */
        try {
            const objects: string[] = [];
            let continuationToken: string | undefined;

            do {
                const command = new ListObjectsV2Command({
                    Bucket: this.s3Bucket,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                });

                const response = await this.s3Client.send(command);
                
                if (response.Contents) {
                    objects.push(...response.Contents.map(obj => obj.Key!).filter(key => key !== undefined));
                }

                continuationToken = response.NextContinuationToken;
            } while (continuationToken);

            return objects;
        } catch (error) {
            console.log(`❌ S3 listing failed:`, error);
            return [];
        }
    }

    async deleteFromS3(): Promise<number> {
        /** Delete all exam files from S3 */
        try {
            const objects = await this.listS3Objects();
            
            if (objects.length === 0) {
                console.log('ℹ️  No objects found in S3 to delete');
                return 0;
            }

            console.log(`📁 Found ${objects.length} objects in S3 to delete`);

            // Delete objects in batches of 1000 (S3 limit)
            const batchSize = 1000;
            let deletedCount = 0;

            for (let i = 0; i < objects.length; i += batchSize) {
                const batch = objects.slice(i, i + batchSize);
                
                const deletePromises = batch.map(key => {
                    const command = new DeleteObjectCommand({
                        Bucket: this.s3Bucket,
                        Key: key,
                    });
                    return this.s3Client.send(command);
                });

                await Promise.all(deletePromises);
                deletedCount += batch.length;
                console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} objects`);
            }

            console.log(`✅ Successfully deleted ${deletedCount} objects from S3`);
            return deletedCount;
        } catch (error) {
            console.log(`❌ S3 deletion failed:`, error);
            return 0;
        }
    }

    async cleanup(): Promise<void> {
        /** Perform complete cleanup of all exam files */
        console.log('🧹 Starting cleanup process...\n');

        // Delete from Supabase first
        console.log('🗄️  Deleting from Supabase...');
        const supabaseDeleted = await this.deleteFromSupabase();

        // Delete from S3
        console.log('\n☁️  Deleting from S3...');
        const s3Deleted = await this.deleteFromS3();

        console.log('\n📊 Cleanup Summary:');
        console.log(`✅ Supabase: ${supabaseDeleted} records deleted`);
        console.log(`✅ S3: ${s3Deleted} objects deleted`);
        console.log(`\n🎉 Cleanup completed successfully!`);
    }
}

async function main(): Promise<void> {
    /** Main function */
    try {
        const cleanup = new ExamFileCleanup();

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

        // Confirm before proceeding
        console.log('⚠️  WARNING: This will delete ALL exam files from both S3 and Supabase!');
        console.log('This action cannot be undone.\n');
        
        // For safety, we'll require explicit confirmation
        console.log('To proceed with cleanup, please run:');
        console.log('npm run script:cleanup -- --confirm');
        console.log('\nOr if you want to proceed without confirmation, modify the script.');
        
        // Check if --confirm flag is provided
        if (process.argv.includes('--confirm')) {
            await cleanup.cleanup();
        } else {
            console.log('\n❌ Cleanup cancelled. Use --confirm flag to proceed.');
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
} 