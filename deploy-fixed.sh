#!/bin/bash

# Lobe Chat Deployment Script with PGVector support
set -e

echo "🚀 Starting Lobe Chat deployment..."

# Environment variables check
echo "🔍 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    exit 1
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker buildx build --memory=4g --memory-swap=4g --platform=linux/amd64 -f Dockerfile.database -t lobe-chat-database:latest .

# Check if the image was built successfully
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
else
    echo "❌ Docker image build failed!"
    exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker-compose -f docker-compose.fixed.yml down

# Start the new container
echo "🚀 Starting new container..."
docker-compose -f docker-compose.fixed.yml up -d

# Check container status
echo "📊 Checking container status..."
sleep 10
docker-compose -f docker-compose.fixed.yml ps

# Check logs
echo "📋 Checking container logs..."
docker-compose -f docker-compose.fixed.yml logs --tail=50

echo "🎉 Deployment completed!"
echo "📍 Application should be available at: http://localhost:3210"
echo ""
echo "If you see PGVector errors, run this SQL command on your Azure PostgreSQL:"
echo "CREATE EXTENSION IF NOT EXISTS vector;" 