#!/bin/bash

# Test and Debug Docker Compose Offline with SSL Fixes
# Usage: ./test-offline-ssl.sh

set -e

COMPOSE_FILE="docker-compose-offline.yml"
SERVICE_NAME="lobe-chat"

echo "🔧 Testing Docker Compose Offline with SSL Fixes"
echo "================================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in current directory"
    echo "Please make sure you're in the docker-compose-self directory with .env file"
    exit 1
fi

echo "✅ .env file found"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found"
    exit 1
fi

echo "✅ $COMPOSE_FILE found"

# Stop existing containers
echo ""
echo "🧹 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# Start services
echo ""
echo "🚀 Starting services with SSL fixes..."
docker-compose -f "$COMPOSE_FILE" up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo ""
echo "📊 Service status:"
docker-compose -f "$COMPOSE_FILE" ps

# Check lobe service logs
echo ""
echo "📋 Lobe service logs (last 30 lines):"
docker-compose -f "$COMPOSE_FILE" logs --tail 30 "$SERVICE_NAME"

# Check environment variables
echo ""
echo "🔧 Environment variables in lobe container:"
docker-compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" env | grep -E "(DOCKER|MIDDLEWARE|NODE_TLS|SSL)" | sort

# Test connectivity
echo ""
echo "🌐 Testing connectivity..."

# Get LOBE_PORT from .env or use default
LOBE_PORT=$(grep "LOBE_PORT=" .env | cut -d'=' -f2 || echo "3210")

echo "Testing main page on port $LOBE_PORT..."
if curl -I "http://localhost:$LOBE_PORT" 2>/dev/null | head -1; then
    echo "✅ Main page accessible"
else
    echo "❌ Main page not accessible"
fi

echo ""
echo "Testing WAF-friendly URL rewrite..."
if curl -I "http://localhost:$LOBE_PORT/static/js/test.js" 2>/dev/null | head -1; then
    echo "✅ WAF rewrite working"
else
    echo "❌ WAF rewrite failed"
fi

# Check for SSL errors in logs
echo ""
echo "🔍 Checking for SSL errors in logs..."
SSL_ERRORS=$(docker-compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME" | grep -i "ssl\|tls\|certificate\|rewrite" | tail -10)

if [ -n "$SSL_ERRORS" ]; then
    echo "⚠️  SSL-related logs found:"
    echo "$SSL_ERRORS"
else
    echo "✅ No SSL errors found in recent logs"
fi

# Health check
echo ""
echo "🏥 Health check:"
if docker-compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" curl -f "http://localhost:$LOBE_PORT/api/health" 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

echo ""
echo "✅ Test completed!"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f $SERVICE_NAME"
echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  Restart lobe: docker-compose -f $COMPOSE_FILE restart $SERVICE_NAME"
echo "  Access app: http://localhost:$LOBE_PORT"
echo ""
echo "If you still see SSL errors, check:"
echo "  1. DOCKER=true is set in environment"
echo "  2. MIDDLEWARE_REWRITE_THROUGH_LOCAL=0 is set"
echo "  3. Container has proper SSL certificates"
echo "  4. Network connectivity between services" 