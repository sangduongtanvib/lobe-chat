#!/bin/bash

# Script to setup offline fonts for Lobe Chat
# This script downloads necessary fonts and sets up local configuration

set -e

echo "🔧 Setting up offline fonts for Lobe Chat..."

# Create fonts directory structure
FONTS_DIR="./public/fonts"
EMOJI_DIR="./public/emojis"
mkdir -p "$FONTS_DIR"/{harmony-sans,harmony-sans-sc,katex}
mkdir -p "$EMOJI_DIR"

# Download functions
download_file() {
    local url="$1"
    local output="$2"
    
    if [ -f "$output" ]; then
        echo "✅ $(basename "$output") already exists, skipping..."
        return 0
    fi
    
    echo "📥 Downloading $(basename "$output")..."
    if curl -L "$url" -o "$output" --fail --silent; then
        echo "✅ Downloaded $(basename "$output")"
        return 0
    else
        echo "❌ Failed to download $(basename "$output")"
        return 1
    fi
}

# Download Hack Mono fonts
echo "📦 Downloading Hack Mono fonts..."
BASE_URL="https://registry.npmmirror.com/@lobehub/webfont-mono/latest/files"
download_file "$BASE_URL/css/index.css" "$FONTS_DIR/webfont-mono.css"
download_file "$BASE_URL/fonts/Hack_Regular.woff2" "$FONTS_DIR/Hack_Regular.woff2"
download_file "$BASE_URL/fonts/Hack_Regular.woff" "$FONTS_DIR/Hack_Regular.woff"
download_file "$BASE_URL/fonts/Hack_Bold.woff2" "$FONTS_DIR/Hack_Bold.woff2"
download_file "$BASE_URL/fonts/Hack_Bold.woff" "$FONTS_DIR/Hack_Bold.woff"

# Download HarmonyOS Sans fonts
echo "📦 Downloading HarmonyOS Sans fonts..."
HARMONY_URL="https://registry.npmmirror.com/@lobehub/webfont-harmony-sans/latest/files"
download_file "$HARMONY_URL/css/index.css" "$FONTS_DIR/harmony-sans/index.css"
download_file "$HARMONY_URL/fonts/HarmonyOS_Sans_Regular.woff2" "$FONTS_DIR/harmony-sans/HarmonyOS_Sans_Regular.woff2"
download_file "$HARMONY_URL/fonts/HarmonyOS_Sans_Regular.woff" "$FONTS_DIR/harmony-sans/HarmonyOS_Sans_Regular.woff"
download_file "$HARMONY_URL/fonts/HarmonyOS_Sans_Bold.woff2" "$FONTS_DIR/harmony-sans/HarmonyOS_Sans_Bold.woff2"

# Download HarmonyOS Sans SC fonts
echo "📦 Downloading HarmonyOS Sans SC fonts..."
HARMONY_SC_URL="https://registry.npmmirror.com/@lobehub/webfont-harmony-sans-sc/latest/files"
download_file "$HARMONY_SC_URL/css/index.css" "$FONTS_DIR/harmony-sans-sc/index.css"
download_file "$HARMONY_SC_URL/fonts/HarmonyOS_Sans_SC_Regular.woff2" "$FONTS_DIR/harmony-sans-sc/HarmonyOS_Sans_SC_Regular.woff2"

# Download KaTeX CSS
echo "📦 Downloading KaTeX CSS..."
download_file "https://registry.npmmirror.com/katex/latest/files/dist/katex.min.css" "$FONTS_DIR/katex/katex.min.css"

# Download emojis
echo "📦 Downloading animated emojis..."
download_file "https://registry.npmmirror.com/@lobehub/fluent-emoji-anim-1/1.0.0/files/assets/1f44b.webp" "$EMOJI_DIR/1f44b.webp"

# Fix CSS paths
echo "🔧 Fixing CSS paths..."
[ -f "$FONTS_DIR/webfont-mono.css" ] && sed -i.bak 's|../fonts/|./|g' "$FONTS_DIR/webfont-mono.css" && rm -f "$FONTS_DIR/webfont-mono.css.bak"
[ -f "$FONTS_DIR/harmony-sans/index.css" ] && sed -i.bak 's|../fonts/|./|g' "$FONTS_DIR/harmony-sans/index.css" && rm -f "$FONTS_DIR/harmony-sans/index.css.bak"
[ -f "$FONTS_DIR/harmony-sans-sc/index.css" ] && sed -i.bak 's|../fonts/|./|g' "$FONTS_DIR/harmony-sans-sc/index.css" && rm -f "$FONTS_DIR/harmony-sans-sc/index.css.bak"

# Create offline fonts bundle
cat > "$FONTS_DIR/offline-fonts.css" << 'EOF'
@charset "UTF-8";

/**
 * Offline Fonts Bundle for Lobe Chat
 */

/* Import Hack Monospace Font */
@import url('./webfont-mono.css');

/* Import HarmonyOS Sans Font */
@import url('./harmony-sans/index.css');

/* Import HarmonyOS Sans SC Font */
@import url('./harmony-sans-sc/index.css');

/* Import KaTeX CSS */
@import url('./katex/katex.min.css');

/* Font fallbacks */
:root {
  --font-mono: 'Hack', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
  --font-sans: 'HarmonyOS Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-sans-sc: 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
EOF

# Update .env.local
ENV_LOCAL=".env.local"
echo "📝 Creating/updating $ENV_LOCAL..."

# Remove existing font configuration
if [ -f "$ENV_LOCAL" ]; then
    grep -v "CUSTOM_FONT_URL\|CUSTOM_FONT_FAMILY\|CDN_USE_GLOBAL" "$ENV_LOCAL" > temp_env || touch temp_env
    mv temp_env "$ENV_LOCAL"
fi

# Add offline font configuration
cat >> "$ENV_LOCAL" << EOF

# Offline font configuration
CUSTOM_FONT_URL=/fonts/offline-fonts.css
CUSTOM_FONT_FAMILY=HarmonyOS Sans
CDN_USE_GLOBAL=0
NEXT_PUBLIC_CDN_USE_GLOBAL=0
EOF

echo "✅ Offline fonts setup completed!"
echo ""
echo "📋 Downloaded fonts:"
echo "   • Hack (monospace)"
echo "   • HarmonyOS Sans"
echo "   • HarmonyOS Sans SC"
echo "   • KaTeX CSS"
echo "   • Animated emojis (1f44b)"
