#!/bin/bash

# Apply SSL Fix to docker-compose-offline.yml
# Usage: ./apply-ssl-fix.sh

set -e

COMPOSE_FILE="docker-compose-offline.yml"
BACKUP_FILE="docker-compose-offline.yml.backup"

echo "🔧 Applying SSL Fix to $COMPOSE_FILE"
echo "====================================="

# Check if file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found"
    exit 1
fi

# Create backup
echo "📦 Creating backup: $BACKUP_FILE"
cp "$COMPOSE_FILE" "$BACKUP_FILE"

echo "✅ Backup created"

# Check if SSL fix is already applied
if grep -q "DOCKER=true" "$COMPOSE_FILE" && grep -q "MIDDLEWARE_REWRITE_THROUGH_LOCAL=0" "$COMPOSE_FILE"; then
    echo "✅ SSL fix already applied to $COMPOSE_FILE"
    echo "Environment variables found:"
    grep -A 10 -B 2 "DOCKER=true" "$COMPOSE_FILE" | grep -E "(DOCKER|MIDDLEWARE|NODE_TLS|SSL)"
    exit 0
fi

echo "🔧 Applying SSL fix..."

# Create temporary file
TEMP_FILE=$(mktemp)

# Process the file and add SSL environment variables
awk '
BEGIN { in_lobe_service = 0; in_environment = 0; ssl_vars_added = 0 }
{
    # Check if we are in the lobe service
    if ($0 ~ /^  lobe:/) {
        in_lobe_service = 1
        print $0
        next
    }
    
    # Check if we are in environment section
    if (in_lobe_service && $0 ~ /^    environment:/) {
        in_environment = 1
        print $0
        # Add SSL environment variables right after environment:
        print "      # Docker environment flags - Fix SSL issues"
        print "      - '\''DOCKER=true'\''"
        print "      - '\''MIDDLEWARE_REWRITE_THROUGH_LOCAL=0'\''"
        print "      "
        print "      # SSL Configuration - Backup fix"
        print "      - '\''NODE_TLS_REJECT_UNAUTHORIZED=0'\''"
        print "      - '\''NODE_TLS_CIPHER_SUITE=ALL'\''"
        print "      - '\''NODE_TLS_SECURE_OPTIONS=0'\''"
        print "      - '\''SSL_CERT_DIR=/etc/ssl/certs/ca-certificates.crt'\''"
        print "      "
        print "      # Application configuration"
        ssl_vars_added = 1
        next
    }
    
    # Check if we are out of environment section
    if (in_environment && $0 ~ /^[^ ]/ && $0 !~ /^    -/) {
        in_environment = 0
    }
    
    # Check if we are out of lobe service
    if (in_lobe_service && $0 ~ /^[^ ]/ && $0 !~ /^  /) {
        in_lobe_service = 0
    }
    
    # Add health check after restart: always
    if (in_lobe_service && $0 ~ /^    restart: always/) {
        print $0
        print "    # Health check for the lobe service"
        print "    healthcheck:"
        print "      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:\${LOBE_PORT}/api/health\"]"
        print "      interval: 30s"
        print "      timeout: 10s"
        print "      retries: 3"
        print "      start_period: 40s"
        next
    }
    
    print $0
}
' "$COMPOSE_FILE" > "$TEMP_FILE"

# Replace original file
mv "$TEMP_FILE" "$COMPOSE_FILE"

echo "✅ SSL fix applied successfully!"

# Verify the changes
echo ""
echo "🔍 Verifying changes..."
if grep -q "DOCKER=true" "$COMPOSE_FILE" && grep -q "MIDDLEWARE_REWRITE_THROUGH_LOCAL=0" "$COMPOSE_FILE"; then
    echo "✅ SSL environment variables added:"
    grep -A 15 -B 2 "DOCKER=true" "$COMPOSE_FILE" | grep -E "(DOCKER|MIDDLEWARE|NODE_TLS|SSL|healthcheck)"
else
    echo "❌ SSL fix not applied correctly"
    echo "Restoring from backup..."
    cp "$BACKUP_FILE" "$COMPOSE_FILE"
    exit 1
fi

echo ""
echo "📋 Summary of changes:"
echo "  ✅ Added DOCKER=true"
echo "  ✅ Added MIDDLEWARE_REWRITE_THROUGH_LOCAL=0"
echo "  ✅ Added SSL configuration variables"
echo "  ✅ Added health check"
echo "  ✅ Backup created: $BACKUP_FILE"

echo ""
echo "🚀 Next steps:"
echo "  1. Test the configuration: ./test-offline-ssl.sh"
echo "  2. Start services: docker-compose -f $COMPOSE_FILE up -d"
echo "  3. Check logs: docker-compose -f $COMPOSE_FILE logs -f lobe-chat"
echo ""
echo "📖 For more information, see: OFFLINE_SSL_FIX_README.md" 