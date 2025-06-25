#!/bin/bash

# Script to find URLs with special characters in server data directory

SERVER_DATA_DIR="data_form_server/next"

if [ ! -d "$SERVER_DATA_DIR" ]; then
    echo "❌ Directory $SERVER_DATA_DIR not found"
    exit 1
fi

echo "🔍 Scanning $SERVER_DATA_DIR for URLs with special characters..."
echo ""

# Function to check a file for problematic URLs
check_file() {
    local file="$1"
    local found_issues=false
    
    # Skip binary files and very large files
    if ! file "$file" | grep -q "text\|JSON\|ASCII"; then
        return
    fi
    
    # Check for URLs with brackets, parentheses, and percent encoding
    if grep -l -E '%5B|%5D|\[.*\]|\(.*\)|%[0-9A-Fa-f]{2}' "$file" >/dev/null 2>&1; then
        echo "📁 File: $file"
        
        # Find URLs with %5B or %5D (encoded brackets)
        if grep -E '%5B|%5D' "$file" >/dev/null 2>&1; then
            echo "  🚨 Found encoded brackets (%5B/%5D):"
            grep -o -E '[^"'\''[:space:]]*%5[BD][^"'\''[:space:]]*' "$file" | head -5 | sed 's/^/    /'
            found_issues=true
        fi
        
        # Find URLs with literal brackets
        if grep -E '\[.*\]' "$file" >/dev/null 2>&1; then
            echo "  ⚠️  Found literal brackets:"
            grep -o -E '[^"'\''[:space:]]*\[[^"'\''[:space:]]*\][^"'\''[:space:]]*' "$file" | head -5 | sed 's/^/    /'
            found_issues=true
        fi
        
        # Find URLs with parentheses
        if grep -E '\(.*\)' "$file" >/dev/null 2>&1; then
            echo "  ⚠️  Found parentheses:"
            grep -o -E '[^"'\''[:space:]]*\([^"'\''[:space:]]*\)[^"'\''[:space:]]*' "$file" | head -5 | sed 's/^/    /'
            found_issues=true
        fi
        
        # Find other percent-encoded characters
        if grep -E '%[0-9A-Fa-f]{2}' "$file" | grep -v -E '%5B|%5D' >/dev/null 2>&1; then
            echo "  ℹ️  Found other percent-encoded characters:"
            grep -o -E '[^"'\''[:space:]]*%[0-9A-Fa-f]{2}[^"'\''[:space:]]*' "$file" | grep -v -E '%5B|%5D' | head -5 | sed 's/^/    /'
        fi
        
        if [ "$found_issues" = true ]; then
            echo ""
        fi
    fi
}

# Count total issues
total_files_with_issues=0
total_bracket_issues=0

# Find and check all relevant files
echo "🔍 Checking manifest files..."
find "$SERVER_DATA_DIR" -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.manifest" | while read -r file; do
    if check_file "$file"; then
        ((total_files_with_issues++))
    fi
done

# Check specific important files
echo "🔍 Checking critical build files..."
critical_files=(
    "$SERVER_DATA_DIR/build-manifest.json"
    "$SERVER_DATA_DIR/app-build-manifest.json" 
    "$SERVER_DATA_DIR/routes-manifest.json"
    "$SERVER_DATA_DIR/app-path-routes-manifest.json"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "📋 Checking critical file: $(basename "$file")"
        check_file "$file"
    else
        echo "⚠️  Critical file not found: $(basename "$file")"
    fi
done

# Check static directory structure
echo ""
echo "🔍 Checking static directory structure..."
if [ -d "$SERVER_DATA_DIR/static" ]; then
    echo "📁 Static directory contents:"
    find "$SERVER_DATA_DIR/static" -type f -name "*.js" | head -10 | while read -r file; do
        filename=$(basename "$file")
        if echo "$filename" | grep -E '%5B|%5D|\[|\]|\(|\)' >/dev/null; then
            echo "  🚨 Problematic filename: $filename"
        else
            echo "  ✅ Clean filename: $filename"
        fi
    done
fi

echo ""
echo "📊 Summary:"
echo "- Scanned directory: $SERVER_DATA_DIR"
echo "- Check completed"
echo ""
echo "💡 If issues found, consider:"
echo "1. Re-running build with WAF fixes applied"
echo "2. Checking if chunks were properly renamed"
echo "3. Verifying WAF middleware is working correctly"
