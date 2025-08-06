# Korean Text Normalization Solution

## 🔍 Problem Description

The database contains Korean text with **Unicode normalization issues**. Specifically, Korean characters are stored in **decomposed form (NFD)** instead of **precomposed form (NFC)**.

### Example of the Issue

- **What looks like**: `국어` (2 characters)
- **What's actually stored**: `국어` (4 decomposed characters)

This causes problems with:
- Database queries and filtering
- Text matching and comparison
- Search functionality
- API responses

## ✅ Solution Overview

### 1. **Fix Existing Data**
- Script to normalize all Korean text in the database
- Converts decomposed characters to precomposed form

### 2. **Prevent Future Issues**
- Updated upload scripts to normalize text before insertion
- Updated service layer to handle normalization consistently
- Added utility functions for input normalization

## 🛠️ Implementation

### Scripts Created

#### `script/fix_korean_normalization.ts`
**Purpose**: Fix existing Korean text normalization issues in the database

**Usage**:
```bash
# Show examples of normalization issues (without making changes)
npm run script:fix:korean show

# Fix all normalization issues
npm run script:fix:korean fix
```

**Features**:
- Detects Korean text that needs normalization
- Shows before/after examples
- Updates database records safely
- Provides detailed progress reporting

### Updated Files

#### `script/upload_exams.ts`
- **Added**: Korean text normalization before database insertion
- **Ensures**: All uploaded exam data uses proper NFC form

#### `src/documents/documents.service.ts`
- **Simplified**: Removed complex workarounds for encoding issues
- **Added**: `normalizeInput()` utility method
- **Updated**: All filtering methods to use database queries instead of in-memory filtering
- **Improved**: Performance by leveraging database indexes

## 📋 How to Use

### 1. Fix Existing Data

```bash
# First, check what needs to be fixed
npm run script:fix:korean show

# Then fix all issues
npm run script:fix:korean fix
```

### 2. For New Uploads

The upload scripts now automatically normalize Korean text:

```bash
# Upload new exam files (normalization happens automatically)
npm run script:upload
```

### 3. In Your Application Code

Use the normalization utility in your services:

```typescript
import { DocumentsService } from './documents/documents.service';

// Normalize user input before processing
const normalizedInput = documentsService.normalizeInput(userInput);

// Use normalized input for database queries
const results = await documentsService.getDocumentsByCategory(normalizedInput);
```

## 🔧 Technical Details

### Unicode Normalization

- **NFD (Normalization Form Decomposed)**: Characters are broken down into their component parts
- **NFC (Normalization Form Composed)**: Characters are in their complete, precomposed form

### Korean Text Fields Affected

The following fields in the `documents` table are normalized:
- `title`
- `subject`
- `category`
- `exam_type`
- `selection`
- `grade_level`
- `source`

### Database Impact

- **Before**: In-memory filtering required due to encoding mismatches
- **After**: Direct database queries work correctly
- **Performance**: Improved due to database indexing

## 🚀 Benefits

1. **Consistent Text Handling**: All Korean text uses the same normalization
2. **Better Performance**: Database queries work directly without workarounds
3. **Improved Search**: Text matching works correctly
4. **Future-Proof**: Prevents similar issues from occurring again
5. **Maintainable Code**: Removed complex encoding workarounds

## ⚠️ Important Notes

1. **Backup**: Always backup your database before running the fix script
2. **Testing**: Test the fix script on a development environment first
3. **Monitoring**: Monitor the script output for any errors during execution
4. **Validation**: Verify that queries work correctly after the fix

## 🔍 Verification

After running the fix script, you can verify the results:

```sql
-- Check that Korean text is properly normalized
SELECT category, LENGTH(category) as char_count 
FROM documents 
WHERE category LIKE '%국어%' 
LIMIT 5;
```

Expected result: `char_count` should be 2 for `국어`, not 4.

## 📞 Support

If you encounter any issues:

1. Check the script output for error messages
2. Verify your database connection settings
3. Ensure you have proper permissions to update the database
4. Review the console logs for detailed progress information 