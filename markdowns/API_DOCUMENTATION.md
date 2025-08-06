# Dasy CSAT API Documentation

This API provides access to all documents stored in the Supabase database for the Swift iPad app.

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Get All Documents
**GET** `/documents`

Returns all documents from the database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "subject": "string", 
      "category": "string",
      "exam_year": number,
      "exam_month": number,
      "exam_type": "string",
      "selection": "string",
      "grade_level": "string",
      "filename": "string",
      "storage_path": "string",
      "created_at": "string",
      "source": "string"
    }
  ],
  "count": number
}
```

### 2. Get Documents by Category
**GET** `/documents/category/{category}`

Returns documents filtered by category.

**Parameters:**
- `category` (path): The category name (e.g., "과학탐구", "사회탐구", "수학", "국어", "영어", "한국사")

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": number
}
```

### 3. Get Documents by Subject
**GET** `/documents/subject/{subject}`

Returns documents filtered by subject.

**Parameters:**
- `subject` (path): The subject name (e.g., "물리학 I", "화학 II", "생명과학 I", etc.)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": number
}
```

### 4. Get Document by ID
**GET** `/documents/{id}`

Returns a specific document by its UUID.

**Parameters:**
- `id` (path): The document UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "subject": "string",
    "category": "string",
    "exam_year": number,
    "exam_month": number,
    "exam_type": "string",
    "selection": "string",
    "grade_level": "string",
    "filename": "string",
    "storage_path": "string",
    "created_at": "string",
    "source": "string"
  }
}
```

### 5. Get Available Categories
**GET** `/documents/categories/list`

Returns a list of all available categories.

**Response:**
```json
{
  "success": true,
  "data": ["과학탐구", "사회탐구", "수학", "국어", "영어", "한국사"]
}
```

### 6. Get Available Subjects
**GET** `/documents/subjects/list`

Returns a list of all available subjects.

**Response:**
```json
{
  "success": true,
  "data": ["물리학 I", "물리학 II", "화학 I", "화학 II", "생명과학 I", "생명과학 II", "지구과학 I", "지구과학 II", ...]
}
```

## Available Categories
- 과학탐구 (Science)
- 사회탐구 (Social Studies)
- 수학 (Mathematics)
- 국어 (Korean Language)
- 영어 (English)
- 한국사 (Korean History)

## Available Subjects (Examples)
- 물리학 I, 물리학 II (Physics I, II)
- 화학 I, 화학 II (Chemistry I, II)
- 생명과학 I, 생명과학 II (Biology I, II)
- 지구과학 I, 지구과학 II (Earth Science I, II)
- 한국지리, 세계지리 (Korean Geography, World Geography)
- 정치와 법, 경제 (Politics & Law, Economics)
- 사회·문화, 생활과 윤리 (Society & Culture, Life & Ethics)
- 윤리와 사상, 동아시아사, 세계사 (Ethics & Thought, East Asian History, World History)

## Error Response Format
```json
{
  "success": false,
  "data": [],
  "count": 0
}
```

## CORS
The API has CORS enabled for cross-origin requests from the Swift iPad app.

## Environment Variables
The API uses the following environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `PORT`: Server port (default: 3000)

## Usage Examples for Swift

```swift
// Get all documents
let url = URL(string: "http://localhost:3000/documents")!
let request = URLRequest(url: url)

// Get documents by category
let categoryUrl = URL(string: "http://localhost:3000/documents/category/과학탐구")!
let categoryRequest = URLRequest(url: categoryUrl)

// Get available categories
let categoriesUrl = URL(string: "http://localhost:3000/documents/categories/list")!
let categoriesRequest = URLRequest(url: categoriesUrl)
``` 