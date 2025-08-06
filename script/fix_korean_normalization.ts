#!/usr/bin/env node
/**
 * Korean Text Normalization Fix Script
 * Fixes Unicode normalization issues in Korean text fields in the database
 * Converts decomposed Hangul characters (NFD) to precomposed form (NFC)
 */

import * as dotenv from 'dotenv';
import { getSupabaseClient } from '../src/supabase/supabase-client';

// Load environment variables
dotenv.config();

interface DocumentRecord {
  id: string;
  title: string;
  subject: string;
  category: string;
  exam_type: string;
  selection: string;
  grade_level: string;
  source: string;
  filename: string;
}

class KoreanNormalizationFixer {
  private supabase: any;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Normalize Korean text to NFC (precomposed form)
   * This converts decomposed Hangul characters to proper Korean syllables
   */
  private normalizeKoreanText(text: string): string {
    if (!text) return text;
    
    // Normalize to NFC (precomposed form)
    // This converts characters like 국어 to 국어
    return text.normalize('NFC');
  }

  /**
   * Check if text needs normalization
   */
  private needsNormalization(text: string): boolean {
    if (!text) return false;
    
    const normalized = this.normalizeKoreanText(text);
    return text !== normalized;
  }

  /**
   * Get all documents from the database
   */
  async getAllDocuments(): Promise<DocumentRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('id, title, subject, category, exam_type, selection, grade_level, source, filename');

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error fetching documents: ${error.message}`);
    }
  }

  /**
   * Update a single document with normalized Korean text
   */
  async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('documents')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.log(`❌ Failed to update document ${id}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.log(`❌ Error updating document ${id}:`, error);
      return false;
    }
  }

  /**
   * Fix Korean text normalization for all documents
   */
  async fixAllDocuments(): Promise<void> {
    console.log('🔍 Fetching all documents from database...');
    
    const documents = await this.getAllDocuments();
    console.log(`📊 Found ${documents.length} documents to check`);

    let totalFixed = 0;
    let documentsWithIssues = 0;

    for (const doc of documents) {
      const updates: Partial<DocumentRecord> = {};
      let hasChanges = false;

      // Check and normalize each Korean text field
      const fieldsToCheck = ['title', 'subject', 'category', 'exam_type', 'selection', 'grade_level', 'source'] as const;
      
      for (const field of fieldsToCheck) {
        const originalValue = doc[field];
        if (originalValue && this.needsNormalization(originalValue)) {
          const normalizedValue = this.normalizeKoreanText(originalValue);
          updates[field] = normalizedValue;
          hasChanges = true;
          
          console.log(`  🔧 ${field}: "${originalValue}" → "${normalizedValue}"`);
        }
      }

      if (hasChanges) {
        documentsWithIssues++;
        console.log(`📝 Document ${doc.id} (${doc.filename}) needs normalization`);
        
        const success = await this.updateDocument(doc.id, updates);
        if (success) {
          totalFixed++;
          console.log(`✅ Fixed document ${doc.id}`);
        } else {
          console.log(`❌ Failed to fix document ${doc.id}`);
        }
      }
    }

    console.log('\n📊 Normalization Summary:');
    console.log(`📁 Total documents checked: ${documents.length}`);
    console.log(`🔧 Documents with normalization issues: ${documentsWithIssues}`);
    console.log(`✅ Successfully fixed: ${totalFixed}`);
    console.log(`❌ Failed to fix: ${documentsWithIssues - totalFixed}`);
  }

  /**
   * Show examples of normalization issues
   */
  async showExamples(): Promise<void> {
    console.log('🔍 Finding examples of Korean text normalization issues...');
    
    const documents = await this.getAllDocuments();
    let examplesFound = 0;

    for (const doc of documents) {
      const fieldsToCheck = ['title', 'subject', 'category', 'exam_type', 'selection', 'grade_level', 'source'] as const;
      let hasIssues = false;
      
      for (const field of fieldsToCheck) {
        const originalValue = doc[field];
        if (originalValue && this.needsNormalization(originalValue)) {
          if (!hasIssues) {
            console.log(`\n📄 Document: ${doc.filename}`);
            hasIssues = true;
          }
          
          const normalizedValue = this.normalizeKoreanText(originalValue);
          console.log(`  ${field}: "${originalValue}" (${originalValue.length} chars) → "${normalizedValue}" (${normalizedValue.length} chars)`);
        }
      }
      
      if (hasIssues) {
        examplesFound++;
        if (examplesFound >= 5) break; // Show only first 5 examples
      }
    }

    if (examplesFound === 0) {
      console.log('✅ No normalization issues found!');
    }
  }
}

async function main(): Promise<void> {
  try {
    const fixer = new KoreanNormalizationFixer();

    // Check required environment variables
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      console.log('Please set them in your .env file');
      process.exit(1);
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'fix';

    switch (command) {
      case 'show':
        console.log('🔍 Showing examples of Korean text normalization issues...');
        await fixer.showExamples();
        break;
      
      case 'fix':
        console.log('🔧 Fixing Korean text normalization issues...');
        await fixer.fixAllDocuments();
        break;
      
      default:
        console.log('Usage: npm run fix-korean [show|fix]');
        console.log('  show: Show examples of normalization issues');
        console.log('  fix:  Fix all normalization issues (default)');
        break;
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