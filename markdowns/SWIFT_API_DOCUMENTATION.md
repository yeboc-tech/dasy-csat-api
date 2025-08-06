# Dasy CSAT API Documentation for Swift iOS iPad App

This document provides comprehensive API documentation for integrating with the Dasy CSAT API from your Swift iOS iPad application.

## Base Configuration

### Base URL
```
http://localhost:3000
```

**Note:** For production, replace `localhost:3000` with your actual server URL.

### Content Type
All requests should use:
```
Content-Type: application/json
```

## Data Models

### Document Model
```swift
struct Document: Codable {
    let id: String
    let title: String
    let subject: String
    let category: String
    let examYear: Int
    let examMonth: Int
    let examType: String
    let selection: String
    let gradeLevel: String
    let filename: String
    let storagePath: String
    let createdAt: String
    let source: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case subject
        case category
        case examYear = "exam_year"
        case examMonth = "exam_month"
        case examType = "exam_type"
        case selection
        case gradeLevel = "grade_level"
        case filename
        case storagePath = "storage_path"
        case createdAt = "created_at"
        case source
    }
}
```

### API Response Models
```swift
struct DocumentsResponse: Codable {
    let success: Bool
    let data: [Document]
    let count: Int
}

struct DocumentResponse: Codable {
    let success: Bool
    let data: Document?
}

struct ListResponse: Codable {
    let success: Bool
    let data: [String]
}
```

## API Endpoints

### 1. Get All Documents
**GET** `/documents`

Retrieves all documents from the database.

**Swift Implementation:**
```swift
func fetchAllDocuments() async throws -> [Document] {
    guard let url = URL(string: "http://localhost:3000/documents") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(DocumentsResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "고3_과학탐구_물리학 I__수능_2024_11_평가원",
      "subject": "물리학 I",
      "category": "과학탐구",
      "exam_year": 2024,
      "exam_month": 11,
      "exam_type": "수능",
      "selection": "평가원",
      "grade_level": "고3",
      "filename": "고3_과학탐구_물리학 I__수능_2024_11_평가원_problem.pdf",
      "storage_path": "exams/2024/11/고3_과학탐구_물리학 I__수능_2024_11_평가원_problem.pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "source": "평가원"
    }
  ],
  "count": 1
}
```

### 2. Get Documents by Category
**GET** `/documents/category/{category}`

Retrieves documents filtered by category.

**Swift Implementation:**
```swift
func fetchDocumentsByCategory(_ category: String) async throws -> [Document] {
    let encodedCategory = category.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? category
    guard let url = URL(string: "http://localhost:3000/documents/category/\(encodedCategory)") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(DocumentsResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

**Available Categories:**
- `과학탐구` (Science)
- `사회탐구` (Social Studies)
- `수학` (Mathematics)
- `국어` (Korean Language)
- `영어` (English)
- `한국사` (Korean History)

### 3. Get Documents by Subject
**GET** `/documents/subject/{subject}`

Retrieves documents filtered by subject.

**Swift Implementation:**
```swift
func fetchDocumentsBySubject(_ subject: String) async throws -> [Document] {
    let encodedSubject = subject.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? subject
    guard let url = URL(string: "http://localhost:3000/documents/subject/\(encodedSubject)") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(DocumentsResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

**Available Subjects:**
- **과학탐구**: `물리학 I`, `물리학 II`, `화학 I`, `화학 II`, `생명과학 I`, `생명과학 II`, `지구과학 I`, `지구과학 II`
- **사회탐구**: `한국지리`, `세계지리`, `정치와 법`, `경제`, `사회·문화`, `생활과 윤리`, `윤리와 사상`, `동아시아사`, `세계사`
- **수학**: `수학`
- **국어**: `국어`
- **영어**: `영어`
- **한국사**: `한국사`

### 4. Get Document by ID
**GET** `/documents/{id}`

Retrieves a specific document by its UUID.

**Swift Implementation:**
```swift
func fetchDocumentById(_ id: String) async throws -> Document? {
    guard let url = URL(string: "http://localhost:3000/documents/\(id)") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(DocumentResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

### 5. Get Available Categories
**GET** `/documents/categories/list`

Retrieves a list of all available categories.

**Swift Implementation:**
```swift
func fetchAvailableCategories() async throws -> [String] {
    guard let url = URL(string: "http://localhost:3000/documents/categories/list") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(ListResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

### 6. Get Available Subjects
**GET** `/documents/subjects/list`

Retrieves a list of all available subjects.

**Swift Implementation:**
```swift
func fetchAvailableSubjects() async throws -> [String] {
    guard let url = URL(string: "http://localhost:3000/documents/subjects/list") else {
        throw URLError(.badURL)
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(ListResponse.self, from: data)
    
    guard response.success else {
        throw APIError.requestFailed
    }
    
    return response.data
}
```

## Complete Swift API Client

Here's a complete Swift API client class you can use in your iPad app:

```swift
import Foundation

enum APIError: Error {
    case requestFailed
    case invalidURL
    case decodingError
    case networkError(Error)
}

class DasyCSATAPI {
    private let baseURL = "http://localhost:3000"
    
    // MARK: - Document Fetching
    
    func fetchAllDocuments() async throws -> [Document] {
        return try await performRequest(endpoint: "/documents", responseType: DocumentsResponse.self).data
    }
    
    func fetchDocumentsByCategory(_ category: String) async throws -> [Document] {
        let encodedCategory = category.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? category
        return try await performRequest(endpoint: "/documents/category/\(encodedCategory)", responseType: DocumentsResponse.self).data
    }
    
    func fetchDocumentsBySubject(_ subject: String) async throws -> [Document] {
        let encodedSubject = subject.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? subject
        return try await performRequest(endpoint: "/documents/subject/\(encodedSubject)", responseType: DocumentsResponse.self).data
    }
    
    func fetchDocumentById(_ id: String) async throws -> Document? {
        return try await performRequest(endpoint: "/documents/\(id)", responseType: DocumentResponse.self).data
    }
    
    // MARK: - List Fetching
    
    func fetchAvailableCategories() async throws -> [String] {
        return try await performRequest(endpoint: "/documents/categories/list", responseType: ListResponse.self).data
    }
    
    func fetchAvailableSubjects() async throws -> [String] {
        return try await performRequest(endpoint: "/documents/subjects/list", responseType: ListResponse.self).data
    }
    
    // MARK: - Private Helper
    
    private func performRequest<T: Codable>(endpoint: String, responseType: T.Type) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw APIError.requestFailed
            }
            
            let decodedResponse = try JSONDecoder().decode(responseType, from: data)
            return decodedResponse
        } catch let error as DecodingError {
            throw APIError.decodingError
        } catch {
            throw APIError.networkError(error)
        }
    }
}
```

## Usage Examples

### Basic Usage
```swift
let api = DasyCSATAPI()

// Fetch all documents
do {
    let documents = try await api.fetchAllDocuments()
    print("Found \(documents.count) documents")
} catch {
    print("Error: \(error)")
}

// Fetch documents by category
do {
    let scienceDocuments = try await api.fetchDocumentsByCategory("과학탐구")
    print("Found \(scienceDocuments.count) science documents")
} catch {
    print("Error: \(error)")
}

// Fetch available categories
do {
    let categories = try await api.fetchAvailableCategories()
    print("Available categories: \(categories)")
} catch {
    print("Error: \(error)")
}
```

### SwiftUI Integration
```swift
class DocumentsViewModel: ObservableObject {
    @Published var documents: [Document] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = DasyCSATAPI()
    
    @MainActor
    func loadDocuments() async {
        isLoading = true
        errorMessage = nil
        
        do {
            documents = try await api.fetchAllDocuments()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    @MainActor
    func loadDocumentsByCategory(_ category: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            documents = try await api.fetchDocumentsByCategory(category)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
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

Always check the `success` field in your Swift code before processing the data.

## Network Configuration

### Info.plist Configuration
For iOS apps, you may need to add the following to your `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### Production Considerations
- Replace `localhost:3000` with your production server URL
- Implement proper error handling and retry logic
- Consider implementing caching for better performance
- Add authentication if required in the future

## Testing

You can test the API endpoints using curl:

```bash
# Get all documents
curl http://localhost:3000/documents

# Get documents by category
curl http://localhost:3000/documents/category/과학탐구

# Get available categories
curl http://localhost:3000/documents/categories/list
```

This documentation provides everything you need to integrate the Dasy CSAT API with your Swift iOS iPad application. The API is designed to be simple and RESTful, making it easy to work with in Swift using modern async/await patterns. 