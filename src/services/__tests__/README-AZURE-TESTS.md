# Azure Storage Upload Tests

Đây là bộ test suite để kiểm tra chức năng upload file thông qua Azure Blob Storage, bao gồm việc sửa lỗi "document is not defined" trong Edge Runtime.

## 📁 Cấu trúc Test Files

### 1. **Unit Tests - Upload Service**

```
src/services/__tests__/upload.azure.test.ts
```

- Test chức năng upload service với Azure Storage
- Kiểm tra routing giữa edge và lambda client
- Test xử lý lỗi và progress tracking
- Verify Base64 và JSON upload

### 2. **Unit Tests - Edge Router**

```
src/server/routers/edge/__tests__/upload.test.ts
```

- Test edge router từ chối Azure storage
- Kiểm tra error message rõ ràng
- Test S3 hoạt động bình thường trong edge
- Verify authentication và validation

### 3. **Unit Tests - Lambda Router**

```
src/server/routers/lambda/__tests__/upload.test.ts
```

- Test lambda router hỗ trợ Azure storage
- Kiểm tra Azure SAS URL generation
- Test các loại blob khác nhau
- Verify Node.js runtime compatibility

### 4. **Integration Tests**

```
src/services/__tests__/upload.integration.test.ts
```

- Test end-to-end flow từ client đến server
- Kiểm tra routing logic hoàn chỉnh
- Test các scenario thực tế
- Verify fix cho "document is not defined"

## 🚀 Cách chạy tests

### Chạy tất cả upload tests:

```bash
npm test upload
```

### Chạy test Azure specific:

```bash
npm test upload.azure
```

### Chạy test integration:

```bash
npm test upload.integration
```

### Chạy test với coverage:

```bash
npm test -- --coverage upload
```

### Chạy test trong watch mode:

```bash
npm test -- --watch upload
```

## 🔧 Test Scenarios

### ✅ Đã Test

#### **Client-side Routing**

- ✅ Azure uploads → Lambda client
- ✅ S3 uploads → Edge client
- ✅ Environment variable detection
- ✅ Error handling khi routing

#### **Azure Storage Functionality**

- ✅ SAS URL generation
- ✅ Different blob types (image, video, document)
- ✅ Large file uploads với progress
- ✅ Authentication và authorization
- ✅ Container access permissions

#### **Error Scenarios**

- ✅ Network connectivity issues
- ✅ SAS token expiration
- ✅ Container access denied
- ✅ Invalid credentials
- ✅ Malformed requests

#### **Runtime Compatibility**

- ✅ Edge Runtime từ chối Azure
- ✅ Lambda Runtime hỗ trợ Azure
- ✅ No "document is not defined" error
- ✅ Concurrent request handling

## 🐛 Lỗi đã được sửa

### **"document is not defined" Error**

**Nguyên nhân:**

```typescript
// Edge Runtime không có browser globals
document.createElement(...);  // ❌ ReferenceError
```

**Giải pháp:**

```typescript
// Client routing logic
const client =
  fileEnv.STORAGE_PROVIDER === 'azure'
    ? lambdaClient // Node.js runtime ✅
    : edgeClient; // Edge runtime ✅
```

**Kết quả:**

- Azure Storage SDK chạy trong Node.js environment ✅
- Edge Runtime chỉ xử lý S3 ✅
- Không còn "document is not defined" error ✅

## 📊 Test Coverage

### Expected Coverage:

- **upload.ts**: 95%+ line coverage
- **edge/upload.ts**: 100% line coverage
- **lambda/upload.ts**: 100% line coverage
- **Integration scenarios**: 90%+ coverage

### Key Metrics:

- ✅ All Azure routing paths
- ✅ All error handling paths
- ✅ Authentication flows
- ✅ Progress tracking
- ✅ Different file types

## 🛠️ Mock Configuration

### Environment Mocks:

```typescript
vi.mock('@/config/file', () => ({
  fileEnv: {
    STORAGE_PROVIDER: 'azure', // or 's3'
    NEXT_PUBLIC_S3_FILE_PATH: 'files',
  },
}));
```

### Client Mocks:

```typescript
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: { upload: { createS3PreSignedUrl: { mutate: vi.fn() } } },
  edgeClient: { upload: { createS3PreSignedUrl: { mutate: vi.fn() } } },
}));
```

### XMLHttpRequest Mock:

```typescript
global.XMLHttpRequest = vi.fn(() => mockXHR);
```

## 🚨 Test Assertions

### Critical Assertions:

```typescript
// Verify correct client routing
expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
expect(edgeClient.upload.createS3PreSignedUrl.mutate).not.toHaveBeenCalled();

// Verify Azure URL format
expect(result).toContain('.blob.core.windows.net');
expect(result).toContain('sv='); // SAS version
expect(result).toContain('sig='); // Signature

// Verify no runtime errors
await expect(uploadFunction()).resolves.toBeDefined();
```

## 📚 Tài liệu tham khảo

- [Azure Blob Storage SAS](https://docs.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Next.js Edge Runtime](https://nextjs.org/docs/api-reference/edge-runtime)
- [Vitest Testing Framework](https://vitest.dev/)
- [tRPC Testing](https://trpc.io/docs/server/testing)

---

**Lưu ý:** Các test này đảm bảo rằng Azure Storage uploads hoạt động chính xác và không gặp lỗi "document is not defined" trong production environment.
