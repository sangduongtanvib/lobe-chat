# LobeChat Azure Container Deployment Guide

Hướng dẫn deploy LobeChat trên Azure Container Apps mà không cần chạy `setup.sh`.

## Tổng quan

Script `setup.sh` thực hiện những tác vụ sau:

1. Tạo file `.env` với cấu hình an toàn
2. Tạo các secret keys
3. Cấu hình host/domain và ports
4. Khởi tạo database
5. Cấu hình API keys

## Giải pháp cho Azure Container Apps

### Option 1: Sử dụng Azure Container Apps với init script

1. **Build container image:**

```bash
# Trong thư mục docker-compose-self
docker build -f Dockerfile.azure -t your-registry/lobechat:latest .
docker push your-registry/lobechat:latest
```

2. **Deploy với Azure CLI:**

```bash
# Tạo resource group
az group create --name lobechat-rg --location eastus

# Tạo container app environment
az containerapp env create \
  --name lobechat-env \
  --resource-group lobechat-rg \
  --location eastus

# Deploy container app
az containerapp create \
  --name lobechat \
  --resource-group lobechat-rg \
  --environment lobechat-env \
  --image your-registry/lobechat:latest \
  --target-port 3210 \
  --ingress external \
  --secrets \
  azure-api-key="your-azure-api-key" \
  azure-endpoint="https://your-resource.openai.azure.com/" \
  --env-vars \
  AZURE_API_KEY=secretref:azure-api-key \
  AZURE_ENDPOINT=secretref:azure-endpoint \
  AZURE_CONTAINER_URL="https://lobechat.eastus.azurecontainerapps.io"
```

### Option 2: Sử dụng pre-configured .env file

1. **Tạo file .env trước:**

```bash
# Copy và chỉnh sửa .env.azure
cp .env.azure .env

# Cấu hình các biến môi trường cần thiết
sed -i "s#\${AZURE_API_KEY}#your-actual-api-key#" .env
sed -i "s#\${AZURE_ENDPOINT}#https://your-resource.openai.azure.com/#" .env
```

2. **Build image với .env có sẵn:**

```dockerfile
FROM alpine:latest
# ... other instructions
COPY .env .env
CMD ["docker-compose", "up", "-d"]
```

### Option 3: Sử dụng Azure Database và Storage riêng biệt

Thay vì chạy PostgreSQL và MinIO trong container, sử dụng Azure services:

1. **Azure Database for PostgreSQL**
2. **Azure Blob Storage** (thay cho MinIO)

Cập nhật `.env`:

```bash
# PostgreSQL
POSTGRES_HOST=your-postgres.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_USER=your-username@your-postgres
POSTGRES_PASSWORD=your-password

# Azure Blob Storage
S3_ENDPOINT=https://yourstorageaccount.blob.core.windows.net
S3_ACCESS_KEY_ID=your-storage-account
S3_SECRET_ACCESS_KEY=your-storage-key
```

## Các biến môi trường cần thiết

Cấu hình các biến sau trong Azure Container Apps:

### Bắt buộc:

- `AZURE_API_KEY`: API key từ Azure OpenAI
- `AZURE_ENDPOINT`: Endpoint của Azure OpenAI resource
- `AZURE_CONTAINER_URL`: URL của container app

### Tùy chọn (sẽ được tự động tạo nếu không có):

- `POSTGRES_PASSWORD`: Mật khẩu PostgreSQL
- `MINIO_ROOT_PASSWORD`: Mật khẩu MinIO
- `AUTH_CASDOOR_ID`: Casdoor client ID
- `AUTH_CASDOOR_SECRET`: Casdoor client secret

## Hướng dẫn từng bước

### Bước 1: Chuẩn bị

```bash
# Clone repository
git clone https://github.com/lobehub/lobe-chat.git
cd lobe-chat/docker-compose-self

# Chạy script init cho Azure
./azure-init.sh
```

### Bước 2: Build và push image

```bash
# Build image
docker build -f Dockerfile.azure -t lobechat:azure .

# Tag và push lên registry
docker tag lobechat:azure your-registry.azurecr.io/lobechat:latest
docker push your-registry.azurecr.io/lobechat:latest
```

### Bước 3: Deploy trên Azure

```bash
# Sử dụng Azure CLI hoặc Azure Portal
az containerapp create \
  --name lobechat \
  --resource-group your-rg \
  --environment your-env \
  --image your-registry.azurecr.io/lobechat:latest \
  --target-port 3210 \
  --ingress external \
  --env-vars AZURE_API_KEY="your-key" AZURE_ENDPOINT="your-endpoint"
```

## Lưu ý quan trọng

1. **Persistence**: Cần cấu hình volume mounts cho `/app/data` và `/app/s3_data`
2. **Networking**: Đảm bảo các ports 3210, 8000, 9000, 9001, 5432 có thể truy cập được
3. **Security**: Lưu trữ API keys và passwords trong Azure Key Vault
4. **Monitoring**: Cấu hình Application Insights để monitor

## Troubleshooting

### Database connection issues:

```bash
# Check PostgreSQL connection
docker exec -it lobe-postgres psql -U postgres -d lobechat
```

### MinIO issues:

```bash
# Check MinIO console
curl http://localhost:9001
```

### Authentication issues:

```bash
# Check Casdoor configuration
curl http://localhost:8000/.well-known/openid_configuration
```

## Kết luận

Với các giải pháp trên, bạn có thể deploy LobeChat trên Azure Container Apps mà không cần chạy script `setup.sh` tương tác. Chọn option phù hợp với kiến trúc và yêu cầu của bạn.
