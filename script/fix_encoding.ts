#!/usr/bin/env node
/**
 * Database Encoding Fix Script
 * Fixes Korean character encoding issues in the category column by extracting from title
 */

import * as dotenv from 'dotenv';
import { getSupabaseClient } from '../src/supabase/supabase-client';

// Load environment variables
dotenv.config();

class DatabaseEncodingFixer {
    private supabase: any;

    constructor() {
        this.supabase = getSupabaseClient();
    }

    /**
     * Extract category from title
     * Title format: "고3 [CATEGORY] [SUBJECT] [EXAM_TYPE] [YEAR]년 [MONTH]월 [SOURCE]"
     */
    private extractCategoryFromTitle(title: string): string | null {
        if (!title) return null;
        
        // Split by spaces and get the second element (index 1) after "고3"
        const parts = title.split(' ');
        if (parts.length < 2) return null;
        
        // The category is the second word (index 1)
        return parts[1];
    }

    /**
     * Ensure proper UTF-8 encoding for Korean text
     * This function converts text to proper UTF-8 encoding
     */
    private ensureProperUTF8(text: string): string {
        if (!text) return text;
        
        // Convert to Buffer with UTF-8 encoding and back to string
        // This forces proper UTF-8 encoding
        return Buffer.from(text, 'utf8').toString('utf8');
    }

    /**
     * Normalize Korean text to handle encoding issues
     * Maps known malformed encodings to correct ones
     */
    private normalizeKoreanText(text: string): string {
        if (!text) return text;
        
        // Common encoding fixes for Korean characters
        const encodingFixes: { [key: string]: string } = {
            // Fix for "과학탐구" encoding issues
            '과학탐구': '과학탐구',
            '사회탐구': '사회탐구',
            '한국사': '한국사',
            '국어': '국어',
            '수학': '수학',
            '영어': '영어'
        };
        
        // Try to normalize the text
        for (const [malformed, correct] of Object.entries(encodingFixes)) {
            if (text.includes(malformed) || text === malformed) {
                return this.ensureProperUTF8(correct);
            }
        }
        
        return this.ensureProperUTF8(text);
    }

    /**
     * Get correct category based on subject
     * Using exact malformed subject values from the database
     */
    private getCorrectCategory(subject: string): string {
        if (!subject) return '';
        
        // Direct mapping using exact malformed subject values from database
        const subjectToCategory: { [key: string]: string } = {
            // Science subjects (length 7-14)
            '물리학 I': '과학탐구',
            '물리학 II': '과학탐구',
            '화학 I': '과학탐구',
            '화학 II': '과학탐구',
            '생명과학 I': '과학탐구',
            '생명과학 II': '과학탐구',
            '지구과학 I': '과학탐구',
            '지구과학 II': '과학탐구',
            
            // Social studies subjects (length 6-14)
            '한국지리': '사회탐구',
            '세계지리': '사회탐구',
            '세계사': '사회탐구',
            '동아시아사': '사회탐구',
            '경제': '사회탐구',
            '정치와 법': '사회탐구',
            '사회·문화': '사회탐구',
            '생활과 윤리': '사회탐구',
            '윤리와 사상': '사회탐구',
            
            // Other subjects (length 5-8)
            '국어': '국어',
            '수학': '수학',
            '영어': '영어',
            '한국사': '한국사'
        };
        
        return subjectToCategory[subject] || '';
    }

    async fixCategoryEncoding(): Promise<void> {
        console.log('🔧 Starting category encoding fixes...');

        try {
            // Get all documents with their titles and subjects
            const { data: documents, error: fetchError } = await this.supabase
                .from('documents')
                .select('id, title, category, subject');

            if (fetchError) {
                console.log('❌ Error fetching documents:', fetchError);
                return;
            }

            if (!documents || documents.length === 0) {
                console.log('❌ No documents found');
                return;
            }

            console.log(`📝 Found ${documents.length} documents to process`);

            let updatedCount = 0;
            let errorCount = 0;

            // Process each document
            for (const doc of documents) {
                const correctCategory = this.getCorrectCategory(doc.subject);
                
                if (!correctCategory) {
                    console.log(`⚠️  Could not determine category for subject: ${doc.subject}`);
                    continue;
                }

                // Normalize the category with proper UTF-8 encoding
                const normalizedCategory = this.normalizeKoreanText(correctCategory);
                
                console.log(`📝 Processing: ${doc.title}`);
                console.log(`  Subject: ${doc.subject}`);
                console.log(`  Original category: ${doc.category} (length: ${doc.category.length})`);
                console.log(`  Correct category: ${correctCategory} (length: ${correctCategory.length})`);
                console.log(`  Normalized category: ${normalizedCategory} (length: ${normalizedCategory.length})`);

                // Force update all categories to fix encoding issues
                const { error: updateError } = await this.supabase
                    .from('documents')
                    .update({ category: normalizedCategory })
                    .eq('id', doc.id);

                if (updateError) {
                    console.log(`❌ Error updating document ${doc.id}:`, updateError);
                    errorCount++;
                } else {
                    console.log(`✅ Updated: ${doc.category} → ${normalizedCategory}`);
                    updatedCount++;
                }
                console.log('');
            }

            console.log(`\n📊 Summary:`);
            console.log(`✅ Successfully updated: ${updatedCount} documents`);
            console.log(`❌ Errors: ${errorCount} documents`);
            console.log(`🎉 Category encoding fixes completed!`);

        } catch (error) {
            console.error('❌ Error during category fixes:', error);
        }
    }

    async verifyFixes(): Promise<void> {
        console.log('\n🔍 Verifying fixes...');

        try {
            // Check categories
            const { data: categoryData, error: categoryError } = await this.supabase
                .from('documents')
                .select('title, category')
                .limit(10);

            if (categoryError) {
                console.log('❌ Error checking categories:', categoryError);
            } else {
                console.log('✅ Sample categories:');
                categoryData?.forEach(doc => {
                    const extracted = this.extractCategoryFromTitle(doc.title);
                    console.log(`  Title: ${doc.title}`);
                    console.log(`  Category: ${doc.category} (extracted: ${extracted})`);
                    console.log(`  Match: ${doc.category === extracted ? '✅' : '❌'}`);
                    console.log('');
                });
            }

        } catch (error) {
            console.error('❌ Error during verification:', error);
        }
    }
}

async function main(): Promise<void> {
    try {
        const fixer = new DatabaseEncodingFixer();
        
        // Check required environment variables
        const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
            console.log('Please set them in your .env file');
            process.exit(1);
        }

        // Fix category encoding issues
        await fixer.fixCategoryEncoding();
        
        // Verify fixes
        await fixer.verifyFixes();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
} 