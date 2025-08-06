# Document Filtering API Documentation

## Overview
The document filtering API allows you to fetch documents with multiple filter criteria. Users can select multiple values for each filter field to create complex queries.

## New Endpoints

### 1. Get Available Filter Values
**Endpoint:** `GET /documents/filters/available`

**Description:** Returns all available values for each filter field.

**Response:**
```json
{
  "success": true,
  "data": {
    "grade_levels": ["고1", "고2", "고3"],
    "categories": ["수능", "모의고사", "기출문제"],
    "exam_years": [2024, 2023, 2022],
    "exam_months": [11, 10, 9, 6, 3]
  }
}
```

### 2. Get Filtered Documents
**Endpoint:** `GET /documents/filtered`

**Description:** Returns documents that match the specified filter criteria.

**Query Parameters:**
- `grade_levels` (optional): Comma-separated list of grade levels
- `categories` (optional): Comma-separated list of categories
- `exam_years` (optional): Comma-separated list of exam years
- `exam_months` (optional): Comma-separated list of exam months

**Example Requests:**

1. Filter by grade level and category:
   ```
   GET /documents/filtered?grade_levels=고3&categories=수능
   ```

2. Filter by multiple years:
   ```
   GET /documents/filtered?exam_years=2024,2023
   ```

3. Complex filter with multiple criteria:
   ```
   GET /documents/filtered?grade_levels=고3&categories=수능,모의고사&exam_years=2024&exam_months=11,10
   ```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "고3_국어_국어__수능_2024_11_평가원",
      "subject": "국어",
      "category": "수능",
      "exam_year": 2024,
      "exam_month": 11,
      "exam_type": "평가원",
      "selection": "국어",
      "grade_level": "고3",
      "filename": "고3_국어_국어__수능_2024_11_평가원_problem.pdf",
      "storage_path": "exams/고3_국어_국어__수능_2024_11_평가원_problem.pdf",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

## Frontend Implementation

### 1. Loading Available Filter Options
```javascript
async function loadAvailableFilters() {
  const response = await fetch('/documents/filters/available');
  const result = await response.json();
  
  if (result.success) {
    const { grade_levels, categories, exam_years, exam_months } = result.data;
    // Populate your filter UI with these values
  }
}
```

### 2. Applying Filters
```javascript
async function applyFilters(selectedFilters) {
  const params = new URLSearchParams();
  
  if (selectedFilters.grade_levels.length > 0) {
    params.append('grade_levels', selectedFilters.grade_levels.join(','));
  }
  
  if (selectedFilters.categories.length > 0) {
    params.append('categories', selectedFilters.categories.join(','));
  }
  
  if (selectedFilters.exam_years.length > 0) {
    params.append('exam_years', selectedFilters.exam_years.join(','));
  }
  
  if (selectedFilters.exam_months.length > 0) {
    params.append('exam_months', selectedFilters.exam_months.join(','));
  }
  
  const response = await fetch(`/documents/filtered?${params.toString()}`);
  const result = await response.json();
  
  if (result.success) {
    // Display the filtered documents
    displayDocuments(result.data);
  }
}
```

## Filter Logic

- **Multiple Values**: Each filter field accepts multiple values separated by commas
- **AND Logic**: All specified filters are combined with AND logic
- **Empty Filters**: If a filter field is not provided or empty, it doesn't restrict the results
- **Case Sensitivity**: Filter values are case-sensitive and should match exactly

## Example Usage Scenarios

1. **Show all 고3 수능 documents from 2024:**
   ```
   GET /documents/filtered?grade_levels=고3&categories=수능&exam_years=2024
   ```

2. **Show all documents from November and October:**
   ```
   GET /documents/filtered?exam_months=11,10
   ```

3. **Show all 고2 and 고3 documents from 2023 and 2024:**
   ```
   GET /documents/filtered?grade_levels=고2,고3&exam_years=2023,2024
   ```

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "data": [],
  "count": 0
}
```

Common error scenarios:
- Invalid filter values
- Database connection issues
- Malformed query parameters

## Frontend Example

See `frontend-example.html` for a complete working example that demonstrates:
- Loading available filter options
- Rendering filter UI with checkboxes
- Applying multiple filters
- Displaying filtered results 