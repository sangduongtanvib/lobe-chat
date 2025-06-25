# Hướng dẫn chuyển đổi LobeChat từ S3/MinIO sang Azure Storage

## Tổng quan

LobeChat hiện đã hỗ trợ sử dụng Azure Blob Storage thay thế cho S3/MinIO để lưu trữ file. Hướng dẫn này sẽ giúp bạn chuyển đổi từ S3 sang Azure Storage.

## Tại sao chuyển sang Azure Storage?

- **Tích hợp tốt hơn**: Nếu bạn đang sử dụng Azure ecosystem
- **Chi phí**: Azure Storage có thể rẻ hơn tùy vào use case
- **Hiệu năng**: Có thể tốt hơn nếu application và storage cùng region
- **Quản lý**: Centralized management trong Azure portal

## Chuẩn bị

### 1. Tạo Azure Storage Account

1. Đăng nhập [Azure Portal](https://portal.azure.com)
2. Tạo Storage Account mới:
   - **Resource Group**: Chọn hoặc tạo mới
   - **Storage Account Name**: Tên unique (ví dụ: `lobechatstore123`)
   - **Region**: Chọn region gần nhất
   - **Performance**: Standard
   - **Redundancy**: LRS (Local-redundant storage) cho dev, GRS cho production

### 2. Tạo Container

1. Vào Storage Account vừa tạo
2. Chọn **Containers** trong menu bên trái
3. Tạo container mới:
   - **Name**: `lobe` (hoặc tên khác)
   - **Public access level**: Private (recommended)

### 3. Lấy Access Key

1. Trong Storage Account, chọn **Access keys**
2. Copy **Storage account name** và **Key1**

## Cấu hình LobeChat

### Phương pháp 1: Sử dụng script tự động

```bash
cd /path/to/lobe-chat
./switch-to-azure-storage.sh
```

Script sẽ tự động:

- Backup file .env hiện tại
- Prompt nhập thông tin Azure Storage
- Cập nhật cấu hình
- Vô hiệu hóa cấu hình S3/MinIO

### Phương pháp 2: Cấu hình thủ công

#### Bước 1: Cập nhật biến môi trường

Trong file `.env`, thêm/cập nhật:

```bash
# Storage provider selection - choose 's3' or 'azure'
STORAGE_PROVIDER=azure

# Azure Storage configuration
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=lobe
```

#### Bước 2: Vô hiệu hóa S3 (tùy chọn)

Comment out hoặc remove các cấu hình S3/MinIO:

```bash
# MinIO S3 configuration (disabled)
#MINIO_ROOT_USER=admin
#MINIO_ROOT_PASSWORD=YOUR_MINIO_PASSWORD
#S3_PUBLIC_DOMAIN=http://localhost:9000
#S3_ENDPOINT=http://localhost:9000
#MINIO_LOBE_BUCKET=lobe
```

## Triển khai

### 1. Restart LobeChat

```bash
docker-compose down
docker-compose up -d
```

### 2. Kiểm tra logs

```bash
docker-compose logs lobe-chat
```

Logs sẽ hiển thị storage provider đang được sử dụng.

## Kiểm tra hoạt động

1. **Upload file**: Thử upload hình ảnh hoặc document trong chat
2. **View file**: Kiểm tra file có hiển thị được không
3. **Azure Portal**: Check trong Storage Account > Container xem có file được tạo

## Migration dữ liệu (nếu cần)

Nếu bạn có data hiện tại trong S3/MinIO muốn chuyển sang Azure:

### Sử dụng AzCopy

```bash
# Install AzCopy
# https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10

# Copy từ S3 sang Azure (cần configure S3 credentials)
azcopy copy 'https://s3.amazonaws.com/your-bucket/*' 'https://yourstorageaccount.blob.core.windows.net/lobe' --recursive
```

### Sử dụng Azure Storage Explorer

1. Download [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/)
2. Connect tới both S3 và Azure Storage
3. Copy files manually

## Troubleshooting

### 1. Container không tồn tại

**Error**: Container not found

**Solution**: Tạo container trong Azure Portal với tên đúng

### 2. Access denied

**Error**: Authentication failed

**Solution**:

- Kiểm tra Account Name và Key
- Đảm bảo key có quyền trên container

### 3. Upload fail

**Error**: Upload failed

**Solution**:

- Check network connectivity tới Azure
- Verify container permissions
- Check Azure Storage firewall rules

### 4. File không hiển thị

**Possible causes**:

- SAS URL generation failed
- Container access level
- CORS settings (nếu cần)

## CORS Configuration (nếu cần)

Nếu bạn cần access files từ browser, configure CORS:

1. Azure Portal > Storage Account > Resource sharing (CORS)
2. Add rule:
   - **Allowed origins**: Your domain hoặc `*` for all
   - **Allowed methods**: GET, PUT, POST
   - **Allowed headers**: `*`

## Rollback

Để quay lại S3/MinIO:

```bash
# Restore từ backup
cp .env.backup.YYYYMMDD_HHMMSS .env

# Hoặc manual change
STORAGE_PROVIDER=s3

# Restart
docker-compose down && docker-compose up -d
```

## Security Best Practices

1. **Account Key**: Không commit vào git, sử dụng secret management
2. **Container Access**: Set private access level
3. **Network**: Sử dụng Azure Private Endpoints nếu cần
4. **Monitoring**: Enable Azure Storage logging

## Performance Optimization

1. **Region**: Đặt storage cùng region với application
2. **Tier**: Sử dụng Hot tier cho frequently accessed files
3. **CDN**: Cân nhắc Azure CDN cho static assets

## Cost Optimization

1. **Lifecycle Management**: Auto-delete old files
2. **Storage Tier**: Move old files to Cool/Archive tiers
3. **Monitoring**: Set up cost alerts

## Support

Nếu gặp vấn đề:

1. Check logs: `docker-compose logs lobe-chat`
2. Verify Azure Storage configuration
3. Test connectivity: `telnet yourstorageaccount.blob.core.windows.net 443`
4. Submit issue trên GitHub repository
