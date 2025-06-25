# Azure Storage Integration - Quick Setup Guide

## 🚀 Switch to Azure Storage

### Step 1: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Switch to Azure Storage
STORAGE_PROVIDER=azure

# Azure Storage Account Information
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_NAME=your_container_name

# Alternative: Use Connection String (recommended)
AZURE_BLOB_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your_account;AccountKey=your_key;EndpointSuffix=core.windows.net"
AZURE_BLOB_CONTAINER_NAME=your_container_name
```

### Step 2: Quick Test

Create a test script to verify connection:

```javascript
const { BlobServiceClient } = require('@azure/storage-blob');

async function testConnection() {
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_BLOB_CONNECTION_STRING);
  const containers = client.listContainers();

  for await (const container of containers) {
    console.log(`Container: ${container.name}`);
  }
}

testConnection();
```

### Bước 3: Khởi động ứng dụng

```bash
# Development mode
npm run dev

# Hoặc production build
npm run build
npm start
```

## 🔧 Sử dụng script chuyển đổi tự động

Chúng tôi đã tạo script để chuyển đổi nhanh từ S3 sang Azure:

```bash
# Chạy script chuyển đổi
chmod +x switch-to-azure-storage.sh
./switch-to-azure-storage.sh
```

Script sẽ:

- Backup file .env hiện tại
- Tạo file .env mới với cấu hình Azure Storage
- Hướng dẫn bạn điền thông tin Azure Storage

## 🌐 Cấu hình Azure Storage Account

### Tạo Storage Account mới

1. Truy cập Azure Portal
2. Tạo Storage Account mới
3. Lấy thông tin:
   - **Account Name**: Tên storage account
   - **Access Key**: Vào Access Keys → Key1 → Key
   - **Container Name**: Tạo container cho files (ví dụ: `lobe-chat-files`)

### Cấu hình CORS (quan trọng)

Trong Azure Portal → Storage Account → Settings → CORS:

```
Allowed origins: *
Allowed methods: GET,PUT,POST,DELETE,HEAD,OPTIONS
Allowed headers: *
Exposed headers: *
Max age: 86400
```

## 🔍 Test tính năng

### 1. Test upload file

- Vào trang Files của LobeChat
- Upload một file bất kỳ
- Kiểm tra file xuất hiện trong Azure Storage Container

### 2. Test download file

- Click vào file đã upload
- Verify file được download chính xác

### 3. Test delete file

- Xóa file trong LobeChat
- Kiểm tra file đã bị xóa khỏi Azure Storage

## 🐛 Troubleshooting

### Lỗi "BlobNotFound" hoặc "ContainerNotFound"

- Kiểm tra Container Name có đúng không
- Verify container đã được tạo trong Azure Storage

### Lỗi "Authorization failed"

- Kiểm tra Account Key có đúng không
- Verify Account Name có đúng không

### Lỗi CORS

- Cấu hình CORS như hướng dẫn ở trên
- Hoặc thêm domain cụ thể thay vì `*`

### Lỗi "Cannot read properties of undefined"

- Restart ứng dụng sau khi thay đổi biến môi trường
- Verify tất cả biến môi trường đã được set

## 📝 Logs và Debugging

Bật debug logs bằng cách thêm:

```bash
DEBUG=azure-storage:*
```

Hoặc kiểm tra console trong Developer Tools của browser để xem lỗi chi tiết.

## ↩️ Quay lại S3/MinIO

Nếu muốn quay lại S3/MinIO:

```bash
# Thay đổi trong .env
STORAGE_PROVIDER=s3

# Hoặc bỏ comment dòng này nếu đã comment
# STORAGE_PROVIDER=s3
```

Restart ứng dụng và hệ thống sẽ tự động chuyển về S3/MinIO.
