# Azure Blob Storage - Image Preview vs Auto Download Issue

## 🔍 Vấn đề

Khi bạn có một đường link image thông thường và mở trên trình duyệt, nó sẽ **preview trực tiếp**. Nhưng với Azure Blob Storage URL, file thường bị **tự động download** thay vì preview.

## 🔬 Nguyên nhân

Vấn đề này xuất phát từ **HTTP Response Headers** mà server trả về:

### 1. Content-Disposition Header

```http
# Preview trong browser
Content-Disposition: inline

# Tự động download
Content-Disposition: attachment
Content-Disposition: attachment; filename="image.jpg"
```

### 2. Content-Type Header

```http
# Trình duyệt biết cách hiển thị
Content-Type: image/jpeg
Content-Type: image/png
Content-Type: application/pdf

# Trình duyệt download
Content-Type: application/octet-stream
```

## 🛠️ Giải pháp đã implement

### 1. Cập nhật Azure Storage Upload

File: `src/server/modules/AzureStorage/index.ts`

```typescript
public async uploadBuffer(path: string, buffer: Buffer, contentType?: string) {
  const options: any = {};
  if (contentType) {
    options.blobHTTPHeaders = {
      blobContentType: contentType,
      // ✅ Set Content-Disposition dựa trên loại file
      blobContentDisposition: this.getContentDisposition(contentType, path)
    };
  }
  return blockBlobClient.upload(buffer, buffer.length, options);
}

private getContentDisposition(contentType?: string, path?: string): string {
  const previewableTypes = [
    'image/',           // ✅ Images preview
    'application/pdf',  // ✅ PDFs preview
    'text/',           // ✅ Text files preview
    'video/',          // ✅ Videos preview
    'audio/'           // ✅ Audio files preview
  ];

  const shouldPreview = previewableTypes.some(type => contentType.startsWith(type));

  if (shouldPreview) {
    return 'inline';  // 👀 Preview trong browser
  }

  return `attachment; filename="${filename}"`; // 💾 Download file
}
```

### 2. Cập nhật SAS URL Generation

```typescript
public async createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string> {
  // ✅ Set response headers để đảm bảo preview đúng
  const responseHeaders: any = {};

  if (shouldPreview) {
    responseHeaders['content-disposition'] = 'inline';
  }
  responseHeaders['content-type'] = contentType;

  const sasUrl = await blobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + expiresIn * 1000),
    permissions,
    contentResponseHeaders: responseHeaders  // 🔧 Key fix
  });

  return sasUrl;
}
```

### 3. OpenAI Helpers Enhancement

File: `src/libs/model-runtime/utils/openaiHelpers.ts`

```typescript
// ✅ Detect Azure Blob URLs
const isAzureBlobUrl = (url: string): boolean => {
  return url.includes('.blob.core.windows.net');
};

// ✅ Special handling for Azure URLs
export const convertMessageContent = async (content) => {
  if (content.type === 'image_url') {
    if (isAzureBlobUrl(content.image_url.url)) {
      // Special Azure blob handling
      const optimizedUrl = optimizeAzureBlobUrl(content.image_url.url);
      // ...
    }
  }
};
```

## 🧪 Testing

Sử dụng script test để kiểm tra URL headers:

```bash
# Test một URL cụ thể
node test-azure-url-preview.js "https://your-storage.blob.core.windows.net/container/image.jpg"

# Test multiple URLs
node test-azure-url-preview.js
```

Script sẽ hiển thị:

- HTTP Headers của URL
- Predicted browser behavior (preview vs download)
- Lý do tại sao

## 📋 So sánh: Normal URL vs Azure Blob

| Aspect              | Normal Image URL | Azure Blob (Before Fix)    | Azure Blob (After Fix) |
| ------------------- | ---------------- | -------------------------- | ---------------------- |
| Content-Type        | `image/jpeg`     | `application/octet-stream` | `image/jpeg` ✅        |
| Content-Disposition | Usually none     | `attachment`               | `inline` ✅            |
| Browser Behavior    | Preview          | Download ❌                | Preview ✅             |

## 🔧 Manual Configuration

Nếu cần cấu hình manual trong Azure Portal:

### 1. Azure Storage Account Settings

1. Azure Portal → Storage Account
2. Settings → Configuration
3. Allow Blob public access: Enabled

### 2. Container Settings

1. Go to Container
2. Change Access Level nếu cần
3. Upload files sẽ có đúng headers

### 3. CORS Configuration

```json
{
  "CorsRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposedHeaders": ["*"],
      "MaxAgeInSeconds": 86400
    }
  ]
}
```

## 🚀 Deploy Changes

Sau khi implement các changes:

```bash
# Rebuild application
npm run build

# Restart container nếu dùng Docker
docker-compose restart

# Test upload file mới
# File sẽ được preview đúng cách thay vì download
```

## 🔍 Troubleshooting

### Vẫn bị download sau khi fix

1. **Cache**: Clear browser cache
2. **Old files**: Files cũ vẫn có headers cũ, upload file mới để test
3. **SAS URL**: Đảm bảo đang dùng SAS URL có `contentResponseHeaders`

### Headers không đúng

```bash
# Check headers manually
curl -I "https://your-blob-url"

# Should see:
# Content-Type: image/jpeg
# Content-Disposition: inline
```

## 📚 Tài liệu tham khảo

- [MDN - Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)
- [Azure Blob Storage - Set Blob Properties](https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-properties)
- [Browser download vs preview behavior](https://stackoverflow.com/questions/1012437/how-to-force-a-web-browser-not-to-cache-images)
