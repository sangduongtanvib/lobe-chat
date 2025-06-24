#!/bin/bash

# Test script for WAF-friendly URL functionality
# Run this after building to verify the solution works

echo "🧪 Testing WAF-friendly URL functionality..."

BASE_URL="http://localhost:3010"
BUILD_DIR=".next"
PUBLIC_STATIC_DIR="public/static/js"

# Check if build exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ No build found. Please run 'npm run build' first."
    exit 1
fi

# Check if WAF-friendly files were created
if [ ! -d "$PUBLIC_STATIC_DIR" ]; then
    echo "❌ WAF-friendly static directory not found: $PUBLIC_STATIC_DIR"
    exit 1
fi

echo "✅ Build directory found"
echo "✅ WAF-friendly static directory found"

# Count WAF-friendly files
waf_file_count=$(find "$PUBLIC_STATIC_DIR" -name "*.js" | wc -l)
echo "📊 WAF-friendly JS files created: $waf_file_count"

# Check for problematic filenames in original chunks
problematic_count=$(find "$BUILD_DIR/static/chunks" -name "*%5B*" -o -name "*%5D*" -o -name "*%40*" -o -name "*(*" -o -name "*)*" 2>/dev/null | wc -l)
echo "📊 Problematic chunk files found: $problematic_count"

# Test chunk mappings API (if server is running)
echo ""
echo "🌐 Testing API endpoints..."

if curl -s "$BASE_URL/api/chunk-mappings" > /dev/null 2>&1; then
    echo "✅ Chunk mappings API accessible"
    
    # Get a sample mapping
    sample_mapping=$(curl -s "$BASE_URL/api/chunk-mappings" | jq -r 'keys[0]' 2>/dev/null)
    if [ "$sample_mapping" != "null" ] && [ "$sample_mapping" != "" ]; then
        echo "✅ Chunk mappings contain data"
        echo "📝 Sample WAF-friendly filename: $sample_mapping"
        
        # Test the WAF-friendly URL
        echo "🔗 Testing WAF-friendly URL access..."
        if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/js/$sample_mapping" | grep -q "200"; then
            echo "✅ WAF-friendly URL accessible"
        else
            echo "❌ WAF-friendly URL not accessible"
        fi
    else
        echo "⚠️  Chunk mappings appear empty"
    fi
else
    echo "⚠️  Cannot test API - server not running"
    echo "💡 Run 'npm run dev' or 'npm start' to test API endpoints"
fi

# Test static file serving (without server)
echo ""
echo "📁 Testing static file structure..."

if [ -f "$PUBLIC_STATIC_DIR/chunk-mappings.json" ]; then
    echo "✅ Chunk mappings file exists"
    
    # Validate JSON
    if jq empty "$PUBLIC_STATIC_DIR/chunk-mappings.json" 2>/dev/null; then
        echo "✅ Chunk mappings JSON is valid"
        
        mapping_count=$(jq 'keys | length' "$PUBLIC_STATIC_DIR/chunk-mappings.json")
        echo "📊 Total chunk mappings: $mapping_count"
    else
        echo "❌ Chunk mappings JSON is invalid"
    fi
else
    echo "❌ Chunk mappings file not found"
fi

# Check for backup files
backup_count=$(find "$BUILD_DIR" -name "*.backup" | wc -l)
if [ $backup_count -gt 0 ]; then
    echo "✅ Backup files created: $backup_count"
else
    echo "⚠️  No backup files found"
fi

echo ""
echo "🎯 Test Summary:"
echo "   WAF-friendly files: $waf_file_count"
echo "   Problematic chunks: $problematic_count"
echo "   Backup files: $backup_count"

if [ $waf_file_count -gt 0 ] && [ $problematic_count -gt 0 ]; then
    echo "✅ WAF-friendly solution appears to be working!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Start your server: npm run dev or npm start"
    echo "   2. Test URLs in browser: http://localhost:3000/static/js/[filename]"
    echo "   3. Check WAF logs to confirm requests are not blocked"
    echo "   4. Monitor /api/chunk-mappings for runtime mappings"
else
    echo "❌ WAF-friendly solution may not be working correctly"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check if apply-waf-patches.sh ran successfully"
    echo "   2. Verify problematic chunks exist in build"
    echo "   3. Check script permissions and dependencies"
fi
