# Swift Frontend Implementation Prompt for Document Filtering

## Overview
We've implemented new document filtering API endpoints that allow users to select multiple values for each filter field. Your iPad app needs to be updated to support these new features.

## New API Endpoints

### 1. Get Available Filter Values
**Endpoint:** `GET /documents/filters/available`
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
**Query Parameters:**
- `grade_levels` (optional): Comma-separated list (e.g., "고2,고3")
- `categories` (optional): Comma-separated list (e.g., "수능,모의고사")
- `exam_years` (optional): Comma-separated list (e.g., "2024,2023")
- `exam_months` (optional): Comma-separated list (e.g., "11,10")

**Example Request:**
```
GET /documents/filtered?grade_levels=고3&categories=수능,모의고사&exam_years=2024&exam_months=11,10
```

## Required Swift Implementation

### 1. Data Models
```swift
struct DocumentFilters {
    var gradeLevels: [String] = []
    var categories: [String] = []
    var examYears: [Int] = []
    var examMonths: [Int] = []
}

struct AvailableFilters {
    let gradeLevels: [String]
    let categories: [String]
    let examYears: [Int]
    let examMonths: [Int]
}

struct FilterResponse {
    let success: Bool
    let data: AvailableFilters
}
```

### 2. API Service Methods
```swift
class DocumentService {
    // Fetch available filter options
    func fetchAvailableFilters() async throws -> AvailableFilters {
        let url = URL(string: "\(baseURL)/documents/filters/available")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(FilterResponse.self, from: data)
        return response.data
    }
    
    // Fetch filtered documents
    func fetchFilteredDocuments(filters: DocumentFilters) async throws -> [Document] {
        var components = URLComponents(string: "\(baseURL)/documents/filtered")!
        var queryItems: [URLQueryItem] = []
        
        if !filters.gradeLevels.isEmpty {
            queryItems.append(URLQueryItem(name: "grade_levels", value: filters.gradeLevels.joined(separator: ",")))
        }
        
        if !filters.categories.isEmpty {
            queryItems.append(URLQueryItem(name: "categories", value: filters.categories.joined(separator: ",")))
        }
        
        if !filters.examYears.isEmpty {
            queryItems.append(URLQueryItem(name: "exam_years", value: filters.examYears.map(String.init).joined(separator: ",")))
        }
        
        if !filters.examMonths.isEmpty {
            queryItems.append(URLQueryItem(name: "exam_months", value: filters.examMonths.map(String.init).joined(separator: ",")))
        }
        
        components.queryItems = queryItems
        
        let (data, _) = try await URLSession.shared.data(from: components.url!)
        let response = try JSONDecoder().decode(DocumentResponse.self, from: data)
        return response.data
    }
}
```

### 3. UI Components

#### Filter Selection View
```swift
struct FilterSelectionView: View {
    @State private var availableFilters: AvailableFilters?
    @State private var selectedFilters = DocumentFilters()
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            Form {
                // Grade Level Section
                Section("Grade Level") {
                    if let gradeLevels = availableFilters?.gradeLevels {
                        ForEach(gradeLevels, id: \.self) { level in
                            Toggle(level, isOn: Binding(
                                get: { selectedFilters.gradeLevels.contains(level) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedFilters.gradeLevels.append(level)
                                    } else {
                                        selectedFilters.gradeLevels.removeAll { $0 == level }
                                    }
                                }
                            ))
                        }
                    }
                }
                
                // Category Section
                Section("Category") {
                    if let categories = availableFilters?.categories {
                        ForEach(categories, id: \.self) { category in
                            Toggle(category, isOn: Binding(
                                get: { selectedFilters.categories.contains(category) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedFilters.categories.append(category)
                                    } else {
                                        selectedFilters.categories.removeAll { $0 == category }
                                    }
                                }
                            ))
                        }
                    }
                }
                
                // Exam Year Section
                Section("Exam Year") {
                    if let years = availableFilters?.examYears {
                        ForEach(years, id: \.self) { year in
                            Toggle("\(year)", isOn: Binding(
                                get: { selectedFilters.examYears.contains(year) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedFilters.examYears.append(year)
                                    } else {
                                        selectedFilters.examYears.removeAll { $0 == year }
                                    }
                                }
                            ))
                        }
                    }
                }
                
                // Exam Month Section
                Section("Exam Month") {
                    if let months = availableFilters?.examMonths {
                        ForEach(months, id: \.self) { month in
                            Toggle("\(month)", isOn: Binding(
                                get: { selectedFilters.examMonths.contains(month) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedFilters.examMonths.append(month)
                                    } else {
                                        selectedFilters.examMonths.removeAll { $0 == month }
                                    }
                                }
                            ))
                        }
                    }
                }
            }
            .navigationTitle("Filters")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        applyFilters()
                    }
                    .disabled(isLoading)
                }
            }
        }
        .task {
            await loadAvailableFilters()
        }
    }
    
    private func loadAvailableFilters() async {
        isLoading = true
        do {
            availableFilters = try await DocumentService().fetchAvailableFilters()
        } catch {
            // Handle error
            print("Error loading filters: \(error)")
        }
        isLoading = false
    }
    
    private func applyFilters() {
        // Implement filter application logic
        // This should trigger a callback or use @Binding to update parent view
    }
}
```

#### Document List View with Filters
```swift
struct DocumentListView: View {
    @State private var documents: [Document] = []
    @State private var isLoading = false
    @State private var showingFilters = false
    @State private var currentFilters = DocumentFilters()
    
    var body: some View {
        NavigationView {
            List(documents, id: \.id) { document in
                DocumentRowView(document: document)
            }
            .navigationTitle("Documents")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Filters") {
                        showingFilters = true
                    }
                }
            }
            .sheet(isPresented: $showingFilters) {
                FilterSelectionView(selectedFilters: $currentFilters)
            }
        }
        .task {
            await loadDocuments()
        }
        .onChange(of: currentFilters) { _ in
            Task {
                await loadDocuments()
            }
        }
    }
    
    private func loadDocuments() async {
        isLoading = true
        do {
            documents = try await DocumentService().fetchFilteredDocuments(filters: currentFilters)
        } catch {
            // Handle error
            print("Error loading documents: \(error)")
        }
        isLoading = false
    }
}
```

### 4. Key Implementation Requirements

1. **Multiple Selection**: Use toggles or checkboxes for each filter option
2. **Real-time Updates**: Apply filters immediately when user makes selections
3. **Loading States**: Show loading indicators during API calls
4. **Error Handling**: Handle network errors and invalid responses
5. **State Management**: Properly manage filter state across views
6. **iPad Optimization**: Use appropriate layouts for iPad screen sizes

### 5. Filter Logic
- **AND Logic**: All selected filters are combined with AND logic
- **Multiple Values**: Users can select multiple values within each filter category
- **Empty Filters**: If no values are selected for a filter, it doesn't restrict results
- **Case Sensitivity**: Filter values must match exactly (case-sensitive)

### 6. Example Usage Scenarios
1. User selects "고3" and "수능" → Shows only 고3 수능 documents
2. User selects years "2024" and "2023" → Shows documents from both years
3. User selects months "11" and "10" → Shows documents from November and October
4. User selects "고3", "수능", "2024", "11" → Shows only 고3 수능 documents from November 2024

### 7. Testing Checklist
- [ ] Load available filter options on app start
- [ ] Display all filter options in UI
- [ ] Allow multiple selection for each filter category
- [ ] Apply filters and fetch filtered results
- [ ] Handle empty filter selections
- [ ] Handle network errors gracefully
- [ ] Test with various filter combinations
- [ ] Ensure iPad UI is responsive and user-friendly

## Integration Notes
- Update your existing document fetching logic to use the new filtered endpoint
- Replace single-value filters with multiple-value selection
- Ensure backward compatibility with existing document display logic
- Test thoroughly with your existing document data 