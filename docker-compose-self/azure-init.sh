#!/bin/bash

# Azure Container Initialization Script
# This script replaces the interactive setup.sh for Azure deployment

set -e

echo "🚀 Initializing VIBChat for Azure Container deployment..."

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate random hex
generate_hex() {
    openssl rand -hex $1
}

# Create .env file from template
if [ ! -f .env ]; then
    echo "📝 Creating .env configuration file..."
    cp .env.azure .env
    
    # Generate secure passwords if not provided by environment
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(generate_password)
        sed -i "s/\${POSTGRES_PASSWORD:-\$(openssl rand -base64 32)}/$POSTGRES_PASSWORD/" .env
    fi
    
    if [ -z "$MINIO_ROOT_PASSWORD" ]; then
        MINIO_ROOT_PASSWORD=$(generate_password)
        sed -i "s/\${MINIO_ROOT_PASSWORD:-\$(openssl rand -base64 32)}/$MINIO_ROOT_PASSWORD/" .env
    fi
    
    if [ -z "$AUTH_CASDOOR_ID" ]; then
        AUTH_CASDOOR_ID=$(generate_hex 12)
        sed -i "s/\${AUTH_CASDOOR_ID:-\$(openssl rand -hex 12)}/$AUTH_CASDOOR_ID/" .env
    fi
    
    if [ -z "$AUTH_CASDOOR_SECRET" ]; then
        AUTH_CASDOOR_SECRET=$(generate_hex 16)
        sed -i "s/\${AUTH_CASDOOR_SECRET:-\$(openssl rand -hex 16)}/$AUTH_CASDOOR_SECRET/" .env
    fi
    
    echo "✅ .env file created successfully"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi

# Update URLs based on Azure Container environment
if [ -n "$AZURE_CONTAINER_URL" ]; then
    echo "🔧 Configuring URLs for Azure Container..."
    sed -i "s#APP_URL=.*#APP_URL=$AZURE_CONTAINER_URL#" .env
    sed -i "s#AUTH_URL=.*#AUTH_URL=$AZURE_CONTAINER_URL/api/auth#" .env
    sed -i "s#NEXTAUTH_URL=.*#NEXTAUTH_URL=$AZURE_CONTAINER_URL#" .env
    sed -i "s#AUTH_CASDOOR_ISSUER=.*#AUTH_CASDOOR_ISSUER=$AZURE_CONTAINER_URL:8000#" .env
    sed -i "s#S3_PUBLIC_DOMAIN=.*#S3_PUBLIC_DOMAIN=$AZURE_CONTAINER_URL:9000#" .env
    sed -i "s#S3_ENDPOINT=.*#S3_ENDPOINT=$AZURE_CONTAINER_URL:9000#" .env
    sed -i "s#origin=.*#origin=$AZURE_CONTAINER_URL:8000#" .env
fi

# Initialize empty init_data.json if it doesn't exist or is populated
if [ ! -f init_data.json ] || [ "$(cat init_data.json | wc -c)" -gt 10 ]; then
    echo "🗃️  Preparing database initialization..."
    # Create a minimal init_data.json to prevent issues
    echo '{}' > init_data.json
fi

echo "✅ Azure Container initialization completed!"
echo "📋 Configuration summary:"
echo "   - Database: lobechat"
echo "   - MinIO Bucket: lobe"
echo "   - Ports: 3210 (app), 8000 (auth), 9000 (s3), 9001 (s3-console), 5432 (db)"

# Display environment variables that need to be set in Azure
echo ""
echo "🔑 Required Azure Container Environment Variables:"
echo "   AZURE_API_KEY=your_azure_api_key"
echo "   AZURE_ENDPOINT=https://your-resource.openai.azure.com/"
echo "   AZURE_CONTAINER_URL=https://your-container-app.azurecontainerapps.io"
echo "   POSTGRES_PASSWORD=your_secure_password (optional - auto-generated)"
echo "   MINIO_ROOT_PASSWORD=your_secure_password (optional - auto-generated)"

echo ""
echo "🚀 Ready to start with: docker compose -f docker-compose.yml up -d"
