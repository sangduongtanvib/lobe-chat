#!/bin/bash

# Quick WAF test script
# Tests if WAF-friendly URLs work correctly

echo "🚀 Quick WAF Solution Test"
echo "=========================="

# Check basic requirements
if [ ! -d ".next" ]; then
    echo "❌ No build found. Run 'npm run build' first."
    exit 1
fi

# Check for problematic chunks
echo "🔍 Checking for problematic chunks..."
problematic_files=$(find .next/static/chunks -name "*%5B*" -o -name "*%5D*" -o -name "*%40*" -o -name "*(*" -o -name "*)*" 2>/dev/null)

if [ -z "$problematic_files" ]; then
    echo "✅ No problematic chunks found (good for this build)"
else
    echo "📝 Found problematic chunks:"
    echo "$problematic_files" | head -3
    echo "... (showing first 3)"
fi

# Check WAF-friendly directory
if [ -d "public/static/js" ]; then
    waf_count=$(find public/static/js -name "*.js" | wc -l)
    echo "✅ WAF-friendly directory exists with $waf_count files"
else
    echo "⚠️  WAF-friendly directory not created yet"
fi

# Check mappings file
if [ -f "public/static/chunk-mappings.json" ]; then
    echo "✅ Chunk mappings file exists"
    if command -v jq >/dev/null 2>&1; then
        mapping_count=$(jq 'keys | length' public/static/chunk-mappings.json 2>/dev/null || echo "0")
        echo "📊 Mappings count: $mapping_count"
    fi
else
    echo "⚠️  Chunk mappings file not found"
fi

echo ""
echo "💡 To complete setup:"
echo "   1. Run post-build script if not done: bash scripts/apply-waf-patches.sh"
echo "   2. Start server: npm run dev or npm start"
echo "   3. Test API: curl http://localhost:3000/api/chunk-mappings"
