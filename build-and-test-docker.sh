#!/bin/bash

# Build and Test Docker with SSL Fix
# Usage: ./build-and-test-docker.sh [tag]

set -e

TAG=${1:-"lobe-chat:ssl-fixed"}
CONTAINER_NAME="lobe-chat-test"

echo "🔧 Building Docker image with SSL fixes..."
echo "=========================================="

# Build the image
echo "📦 Building image: $TAG"
docker build -f Dockerfile.database -t "$TAG" .

echo ""
echo "🧹 Cleaning up existing containers..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo ""
echo "🚀 Starting container with SSL fixes..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 3210:3210 \
  -e DOCKER=true \
  -e NODE_ENV=production \
  -e MIDDLEWARE_REWRITE_THROUGH_LOCAL=0 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e ACCESS_CODE=test123 \
  -e APP_URL=http://localhost:3210 \
  "$TAG"

echo ""
echo "⏳ Waiting for container to start..."
sleep 10

echo ""
echo "🔍 Checking container status..."
docker ps | grep "$CONTAINER_NAME"

echo ""
echo "📊 Container logs (last 20 lines):"
docker logs --tail 20 "$CONTAINER_NAME"

echo ""
echo "🌐 Testing application..."
echo "Testing main page..."
curl -I http://localhost:3210 2>/dev/null || echo "Failed to connect to main page"

echo ""
echo "Testing WAF-friendly URL rewrite..."
curl -I http://localhost:3210/static/js/test.js 2>/dev/null || echo "Failed to test WAF rewrite"

echo ""
echo "🔧 Environment variables in container:"
docker exec "$CONTAINER_NAME" env | grep -E "(DOCKER|MIDDLEWARE|NODE_TLS|SSL)" | sort

echo ""
echo "📝 SSL Configuration check:"
docker exec "$CONTAINER_NAME" sh -c "
echo 'NODE_TLS_REJECT_UNAUTHORIZED: '\$NODE_TLS_REJECT_UNAUTHORIZED
echo 'MIDDLEWARE_REWRITE_THROUGH_LOCAL: '\$MIDDLEWARE_REWRITE_THROUGH_LOCAL
echo 'DOCKER: '\$DOCKER
echo 'NODE_ENV: '\$NODE_ENV
"

echo ""
echo "✅ Test completed!"
echo ""
echo "To stop the container:"
echo "docker stop $CONTAINER_NAME"
echo ""
echo "To view logs:"
echo "docker logs -f $CONTAINER_NAME"
echo ""
echo "To access the application:"
echo "http://localhost:3210" 