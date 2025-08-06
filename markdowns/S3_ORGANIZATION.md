# Simplified S3 Organization Strategy

## Overview

This document outlines the simplified S3 bucket organization strategy that uses flat UUID-based file storage instead of complex folder hierarchies.

## S3 Structure

### Simple Flat Organization
```
s3://your-bucket/
├── documents/
│   ├── {document_uuid}.pdf
│   ├── {document_uuid}.pdf
│   └── ...
└── document_submissions/
    ├── {submission_uuid}.pdf
    ├── {submission_uuid}.pdf
    └── ...
```

### File Naming Convention
- **Documents**: `documents/{document_uuid}.pdf`
- **Document Submissions**: `document_submissions/{submission_uuid}.pdf`

## Benefits

### ✅ **Simplicity**
- No complex folder hierarchies to manage
- Direct access by UUID
- Easy to understand and maintain

### ✅ **Performance**
- No folder traversal needed
- Direct S3 key access
- Faster file operations

### ✅ **Scalability**
- No folder limits or performance degradation
- Can handle millions of files efficiently
- No depth limitations

### ✅ **Consistency**
- Mirrors database structure exactly
- UUID-based naming ensures uniqueness
- Easy to map between DB and S3

### ✅ **Flexibility**
- Easy to move files between buckets
- No path dependencies
- Simple backup and restore

## Database Integration

### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,           -- Used for S3 key
    title TEXT,
    subject TEXT,
    filename TEXT,                 -- Original filename
    storage_path TEXT,             -- S3 path: documents/{id}.pdf
    correct_answers JSONB,
    question_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    category TEXT,
    source TEXT,
    grade_level TEXT,
    exam_year INTEGER,
    exam_month INTEGER,
    exam_type TEXT,
    selection TEXT
);
```

### Document Submissions Table
```sql
CREATE TABLE document_submissions (
    id UUID PRIMARY KEY,           -- Used for S3 key
    user_id UUID,
    document_id UUID REFERENCES documents(id),
    storage_path TEXT,             -- S3 path: document_submissions/{id}.pdf
    user_answers JSONB,
    score NUMERIC,
    incorrect_questions INTEGER[],
    unanswered_questions INTEGER[],
    created_at TIMESTAMP WITH TIME ZONE
);
```

## File Access Patterns

### 1. **Get Document by ID**
```typescript
const documentId = '123e4567-e89b-12d3-a456-426614174000';
const s3Key = `documents/${documentId}.pdf`;
```

### 2. **Get Submission by ID**
```typescript
const submissionId = '987fcdeb-51a2-43d1-b789-123456789abc';
const s3Key = `document_submissions/${submissionId}.pdf`;
```

### 3. **Database Query → S3 Access**
```typescript
// Get document from database
const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

// Access file in S3 using the same ID
const s3Key = `documents/${document.id}.pdf`;
```

## Implementation Scripts

### Upload Script
```bash
npm run script:upload:simple
```

**Features:**
- Parses filenames according to naming convention
- Generates UUID for each document
- Uploads to S3 with UUID-based key
- Stores metadata in Supabase
- Updates storage_path with S3 key

### Cleanup Script
```bash
npm run script:cleanup:simple -- --confirm
```

**Features:**
- Deletes all documents from Supabase
- Deletes all submissions from Supabase
- Deletes all files from S3 documents/ folder
- Deletes all files from S3 document_submissions/ folder

## S3 Lifecycle Policies

### Recommended Lifecycle Policy
```json
{
  "Rules": [
    {
      "ID": "DocumentsLifecycle",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "documents/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "ID": "SubmissionsLifecycle",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "document_submissions/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## Security Considerations

### IAM Policy Example
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DocumentsAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket/documents/*",
        "arn:aws:s3:::your-bucket/document_submissions/*"
      ]
    }
  ]
}
```

## Migration from Complex Structure

If migrating from the complex folder structure:

1. **Export current data** from Supabase
2. **Download files** from current S3 structure
3. **Run simplified upload script** to re-upload with new structure
4. **Update application code** to use new S3 keys
5. **Clean up old S3 structure** once migration is complete

## Monitoring & Analytics

### CloudWatch Metrics to Track
- `NumberOfObjects` by prefix
- `BucketSizeBytes` by prefix
- `GetObject` and `PutObject` requests
- Error rates and latency

### S3 Analytics
Enable S3 analytics to track:
- Most accessed files
- Storage costs by prefix
- Access patterns for optimization

## Best Practices

### 1. **Consistent Naming**
- Always use UUIDs from database
- Keep file extensions (.pdf)
- Use lowercase folder names

### 2. **Error Handling**
- Always check if file exists before accessing
- Handle S3 errors gracefully
- Implement retry logic for failed operations

### 3. **Performance**
- Use CloudFront for frequently accessed files
- Implement caching strategies
- Consider batch operations for multiple files

### 4. **Backup Strategy**
- Regular S3 bucket backups
- Cross-region replication for critical files
- Versioning for important documents

## Comparison: Complex vs Simple Structure

| Aspect | Complex Structure | Simple Structure |
|--------|------------------|------------------|
| **Complexity** | High (deep folders) | Low (flat structure) |
| **Performance** | Slower (folder traversal) | Faster (direct access) |
| **Scalability** | Limited by folder depth | Unlimited |
| **Maintenance** | Complex | Simple |
| **Migration** | Difficult | Easy |
| **Cost** | Higher (more operations) | Lower (fewer operations) |

## Conclusion

The simplified S3 organization provides:
- **Better performance** through direct UUID-based access
- **Easier maintenance** with flat structure
- **Improved scalability** without folder limitations
- **Consistent mapping** between database and S3
- **Simplified operations** for upload, download, and cleanup

This approach is recommended for systems with large numbers of files and frequent access patterns. 