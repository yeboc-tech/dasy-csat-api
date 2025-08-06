# iPad Connectivity Setup Guide

## ✅ Changes Made

### 1. NestJS Server Configuration (`src/main.ts`)
- **Binding**: Changed from `localhost` to `0.0.0.0` to allow network access
- **Port**: Set to `3001` (configurable via `PORT` environment variable)
- **CORS**: Already properly configured for cross-origin requests

### 2. Package.json Scripts
- Added `start:ipad` script: `PORT=3001 nest start --watch`
- Use this script for iPad development: `npm run start:ipad`

## 🚀 How to Start the Server

```bash
# For iPad development
npm run start:ipad

# Or manually with environment variable
PORT=3001 npm run start:dev
```

## 📱 iPad Swift Configuration

### Base URL Configuration
```swift
#if DEBUG
let baseURL = "http://192.168.35.82:3001"
#else
let baseURL = "https://your-production-domain.com"
#endif
```

### Available API Endpoints
- `GET /` - Health check
- `GET /documents` - Get all documents
- `GET /documents/categories/list` - Get available categories
- `GET /documents/subjects/list` - Get available subjects
- `GET /documents/debug/categories` - Debug categories
- `GET /documents/category/:category` - Get documents by category
- `GET /documents/subject/:subject` - Get documents by subject
- `GET /documents/:id` - Get document by ID

### Example Swift API Call
```swift
let url = URL(string: "\(baseURL)/documents")!
var request = URLRequest(url: url)
request.httpMethod = "GET"

URLSession.shared.dataTask(with: request) { data, response, error in
    if let data = data {
        // Handle response data
        print("Response: \(String(data: data, encoding: .utf8) ?? "")")
    }
}.resume()
```

## 🔧 Network Requirements

### ✅ Checklist
- [ ] **iPad and MacBook on same Wi-Fi network**
- [ ] **Mac firewall allows port 3001** (or temporarily disabled)
- [ ] **Server running on port 3001**
- [ ] **iPad app uses `http://192.168.35.82:3001`**

### Firewall Settings (macOS)
1. **System Settings** → **Network** → **Firewall**
2. **Options** → **Allow incoming connections** for your app
3. **Or temporarily disable firewall** for development

## 🧪 Testing Connectivity

### From Mac Terminal
```bash
# Test local access
curl http://localhost:3001

# Test network access
curl http://192.168.35.82:3001

# Test API endpoints
curl http://192.168.35.82:3001/documents
```

### From iPad Browser
1. Open Safari on iPad
2. Navigate to: `http://192.168.35.82:3001`
3. Should see "Hello World!" response

## 🔒 Security Notes

### Development Only
- CORS is set to `origin: true` (allows all origins)
- Using HTTP (not HTTPS)
- Binding to `0.0.0.0` (accessible from network)

### Production Considerations
- Restrict CORS to specific domains
- Use HTTPS
- Bind to `localhost` only
- Implement proper authentication

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

### iPad Can't Connect
1. **Check IP address**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. **Test from Mac**: `curl http://192.168.35.82:3001`
3. **Check firewall**: System Settings → Network → Firewall
4. **Verify same network**: Both devices on same Wi-Fi

### CORS Issues
- Server already configured with `origin: true`
- If issues persist, check iPad app's request headers

## 📝 Environment Variables

Create a `.env` file (if not exists):
```env
PORT=3001
```

## 🎯 Next Steps

1. **Test from iPad**: Open Safari and visit `http://192.168.35.82:3001`
2. **Update Swift app**: Replace `localhost` with `192.168.35.82:3001`
3. **Test API calls**: Verify all endpoints work from iPad
4. **Implement error handling**: Add network error handling in Swift app 