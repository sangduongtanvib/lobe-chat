#!/bin/bash

# Azure Container Apps Deployment Script for Lobe Chat
# Yêu cầu: Azure CLI đã được cài đặt và đăng nhập

set -e

# Configuration variables
RESOURCE_GROUP="lobe-chat-rg"
LOCATION="East Asia"
ACR_NAME="lobechatacr$(date +%s)"
CONTAINER_APP_NAME="lobe-chat-app"
CONTAINER_ENV_NAME="lobe-chat-env"
IMAGE_NAME="lobe-chat-database"
IMAGE_TAG="latest"

echo "🚀 Bắt đầu deployment Lobe Chat lên Azure Container Apps"

# 1. Tạo Resource Group
echo "📦 Tạo Resource Group..."
az group create \
  --name $RESOURCE_GROUP \
  --location "$LOCATION"

# 2. Tạo Azure Container Registry
echo "🏗️ Tạo Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# 3. Lấy thông tin đăng nhập ACR
echo "🔑 Lấy thông tin đăng nhập ACR..."
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query passwords[0].value --output tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"

# 4. Tag và push image lên ACR
echo "📤 Tag và push Docker image lên ACR..."
docker tag $IMAGE_NAME:$IMAGE_TAG $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG
docker login $ACR_LOGIN_SERVER --username $ACR_USERNAME --password $ACR_PASSWORD
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG

# 5. Tạo Container Apps Environment
echo "🌍 Tạo Container Apps Environment..."
az containerapp env create \
  --name $CONTAINER_ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION"

# 6. Tạo PostgreSQL Database trên Azure
echo "🗄️ Tạo Azure Database for PostgreSQL..."
POSTGRES_SERVER_NAME="lobe-chat-db-$(date +%s)"
POSTGRES_ADMIN_USER="lobechatadmin"
POSTGRES_ADMIN_PASSWORD="LobeChat$(date +%s)!"

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER_NAME \
  --location "$LOCATION" \
  --admin-user $POSTGRES_ADMIN_USER \
  --admin-password $POSTGRES_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Tạo database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER_NAME \
  --database-name lobechat

# 7. Deploy Container App
echo "🚀 Deploy Container App..."
DATABASE_URL="postgresql://$POSTGRES_ADMIN_USER:$POSTGRES_ADMIN_PASSWORD@$POSTGRES_SERVER_NAME.postgres.database.azure.com:5432/lobechat?sslmode=require"

az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV_NAME \
  --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3210 \
  --ingress external \
  --cpu 1.0 \
  --memory 2Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3210 \
    DATABASE_DRIVER=node \
    DATABASE_URL="$DATABASE_URL" \
    KEY_VAULTS_SECRET="$(openssl rand -base64 32)" \
    NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# 8. Lấy thông tin endpoint
echo "✅ Deployment hoàn thành!"
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)

echo ""
echo "🎉 Thông tin deployment:"
echo "   🌐 App URL: https://$APP_URL"
echo "   🗄️ Database Server: $POSTGRES_SERVER_NAME.postgres.database.azure.com"
echo "   👤 Database User: $POSTGRES_ADMIN_USER"
echo "   🔐 Database Password: $POSTGRES_ADMIN_PASSWORD"
echo "   📦 Container Registry: $ACR_LOGIN_SERVER"
echo ""
echo "⚠️ Lưu ý: Hãy cập nhật các environment variables sau trong Azure Portal:"
echo "   - OPENAI_API_KEY (nếu sử dụng OpenAI)"
echo "   - CLERK_SECRET_KEY (nếu sử dụng Clerk Auth)"
echo "   - Các API keys khác tùy theo nhu cầu"
echo ""
echo "🔗 Để cập nhật environment variables:"
echo "   az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --set-env-vars KEY=VALUE"
