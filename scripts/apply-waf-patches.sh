#!/bin/bash

# Script to create WAF        # Check if filename contains problematic characters
        if echo "$filename" | grep -q -E '%5B|%5D|%40|\(|\)'; then
            waf_name=$(waf_friendly_name "$filename")
            
            # For macOS compatibility, use a simpler approach
            echo "🔗 Creating mapping: $waf_name"
            
            # Copy file to public/static/js with WAF-friendly name
            cp "$file" "$PUBLIC_STATIC_DIR/js/$waf_name"
        fisymlinks and update references for Next.js chunks
# Run this after `next build` to make chunk URLs accessible via WAF-friendly paths

echo "🔧 Creating WAF-friendly URL mappings for Next.js build..."

BUILD_DIR=".next"
STATIC_CHUNKS_DIR="$BUILD_DIR/static/chunks"
PUBLIC_STATIC_DIR="public/static"

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build directory not found. Please run 'next build' first."
    exit 1
fi

# Create public/static/js directory for WAF-friendly URLs
mkdir -p "$PUBLIC_STATIC_DIR/js"

# Function to create WAF-friendly filename
waf_friendly_name() {
    local filename="$1"
    echo "$filename" | sed 's/%5B/_OB_/g; s/%5D/_CB_/g; s/%40/_AT_/g; s/(/_OP_/g; s/)/_CP_/g'
}

# Function to create mapping files for problematic chunks
create_mappings() {
    if [ ! -d "$STATIC_CHUNKS_DIR" ]; then
        echo "⚠️  Static chunks directory not found, skipping chunk mapping."
        return
    fi
    
    find "$STATIC_CHUNKS_DIR" -name "*.js" | while read -r file; do
        filename=$(basename "$file")
        
        # Check if filename contains problematic characters
        if echo "$filename" | grep -q -E '%5B|%5D|%40|\(|\)'; then
            waf_name=$(waf_friendly_name "$filename")
            relative_path=$(realpath --relative-to="$PUBLIC_STATIC_DIR/js" "$file")
            
            echo "� Creating mapping: $waf_name -> $relative_path"
            
            # Create symlink in public/static/js
            ln -sf "$relative_path" "$PUBLIC_STATIC_DIR/js/$waf_name"
        fi
    done
}

# Function to update HTML files with WAF-friendly script tags
update_html_references() {
    find "$BUILD_DIR" -name "*.html" | while read -r html_file; do
        if grep -q '_next/static/chunks/.*%5B\|_next/static/chunks/.*%5D\|_next/static/chunks/.*%40\|_next/static/chunks/.*(.*)\|_next/static/chunks/.*@' "$html_file"; then
            echo "🔄 Updating HTML references in: $(basename "$html_file")"
            
            # Create backup
            cp "$html_file" "$html_file.backup"
            
            # Update script src attributes to use WAF-friendly URLs
            sed -i '' -E '
                s|src="/_next/static/chunks/([^"]*%5B[^"]*)"| src="/static/js/\1"|g
                s|src="/_next/static/chunks/([^"]*%5D[^"]*)"| src="/static/js/\1"|g
                s|src="/_next/static/chunks/([^"]*%40[^"]*)"| src="/static/js/\1"|g
                s|src="/_next/static/chunks/([^"]*\([^"]*)"| src="/static/js/\1"|g
                s|src="/_next/static/chunks/([^"]*\)[^"]*)"| src="/static/js/\1"|g
            ' "$html_file"
            
            # Apply WAF-friendly naming to the URLs we just changed
            sed -i '' '
                s|/static/js/\([^"]*\)%5B\([^"]*\)|/static/js/\1_OB_\2|g
                s|/static/js/\([^"]*\)%5D\([^"]*\)|/static/js/\1_CB_\2|g
                s|/static/js/\([^"]*\)%40\([^"]*\)|/static/js/\1_AT_\2|g
                s|/static/js/\([^"]*\)(\([^"]*\)|/static/js/\1_OP_\2|g
                s|/static/js/\([^"]*\))\([^"]*\)|/static/js/\1_CP_\2|g
            ' "$html_file"
        fi
    done
}

# Function to create a mapping file for runtime reference
create_mapping_json() {
    echo "📝 Creating chunk mapping file..."
    
    mapping_file="$PUBLIC_STATIC_DIR/chunk-mappings.json"
    echo "{" > "$mapping_file"
    
    if [ -d "$STATIC_CHUNKS_DIR" ]; then
        find "$STATIC_CHUNKS_DIR" -name "*.js" | while read -r file; do
            filename=$(basename "$file")
            
            if echo "$filename" | grep -q -E '%5B|%5D|%40|\(|\)'; then
                waf_name=$(waf_friendly_name "$filename")
                echo "  \"$waf_name\": \"/_next/static/chunks/$filename\"," >> "$mapping_file"
            fi
        done
    fi
    
    # Remove trailing comma and close JSON
    sed -i '' '$ s/,$//' "$mapping_file"
    echo "}" >> "$mapping_file"
}

# Apply all transformations
echo "🔄 Creating chunk mappings..."
create_mappings

echo "🔄 Updating HTML references..."
update_html_references

echo "🔄 Creating mapping JSON..."
create_mapping_json

echo "✅ WAF-friendly URL mappings created successfully!"
echo "💡 Original HTML files are backed up with .backup extension"
echo "📁 WAF-friendly chunk URLs available at /static/js/*"
echo "📋 Chunk mappings available at /static/js/chunk-mappings.json"
