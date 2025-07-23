#!/bin/bash

# Debug SSL Issues in Docker Container
# Usage: ./debug-ssl.sh [container_name]

CONTAINER_NAME=${1:-"lobe-chat"}

echo "🔍 Debugging SSL Issues in Docker Container: $CONTAINER_NAME"
echo "=================================================="

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    exit 1
fi

echo "📋 Container Status:"
docker ps | grep "$CONTAINER_NAME"

echo ""
echo "🔧 Environment Variables:"
docker exec "$CONTAINER_NAME" env | grep -E "(NODE_TLS|SSL|DOCKER|NODE_ENV)" | sort

echo ""
echo "📄 SSL Configuration:"
docker exec "$CONTAINER_NAME" sh -c "
echo 'NODE_TLS_REJECT_UNAUTHORIZED: '\$NODE_TLS_REJECT_UNAUTHORIZED
echo 'SSL_CERT_DIR: '\$SSL_CERT_DIR
echo 'NODE_TLS_CIPHER_SUITE: '\$NODE_TLS_CIPHER_SUITE
echo 'NODE_TLS_SECURE_OPTIONS: '\$NODE_TLS_SECURE_OPTIONS
"

echo ""
echo "📁 SSL Certificates:"
docker exec "$CONTAINER_NAME" ls -la /etc/ssl/certs/ | head -10

echo ""
echo "📊 Recent Logs (last 50 lines):"
docker logs --tail 50 "$CONTAINER_NAME" | grep -E "(SSL|TLS|certificate|error|WAF|rewrite)" || echo "No SSL-related logs found"

echo ""
echo "🌐 Network Connectivity Test:"
docker exec "$CONTAINER_NAME" sh -c "
echo 'Testing localhost connectivity...'
curl -I http://localhost:3210 2>/dev/null || echo 'Failed to connect to localhost:3210'
"

echo ""
echo "🔍 WAF Handler Test:"
docker exec "$CONTAINER_NAME" sh -c "
echo 'Testing WAF-friendly URL rewrite...'
curl -I http://localhost:3210/static/js/test.js 2>/dev/null || echo 'Failed to test WAF rewrite'
"

echo ""
echo "📝 SSL Certificate Validation:"
docker exec "$CONTAINER_NAME" sh -c "
if command -v openssl >/dev/null 2>&1; then
    echo 'OpenSSL version:'
    openssl version
    echo ''
    echo 'Available ciphers:'
    openssl ciphers | head -5
else
    echo 'OpenSSL not available in container'
fi
"

echo ""
echo "🔧 Recommended Fixes:"
echo "1. Set NODE_TLS_REJECT_UNAUTHORIZED=0 in environment"
echo "2. Ensure SSL_CERT_DIR points to valid certificate directory"
echo "3. Check if container has proper SSL certificates mounted"
echo "4. Verify middleware rewrite configuration"
echo "5. Check for self-signed certificate issues"

echo ""
echo "✅ Debug complete!" 