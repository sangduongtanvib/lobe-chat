#!/bin/bash

# Production WAF URL Checker
# Check deployed website for WAF-related issues

WEBSITE_URL=${1:-"https://s2dchat.io.vn"}

echo "🔍 Checking for %5Bvariant%5D URLs in $WEBSITE_URL..."
echo "ℹ️  Note: This website requires authentication, so we can only check public pages"

# Define public pages to check
PUBLIC_PAGES=(
    ""                          # Home/redirect page
    "/next-auth/signin"         # Actual login page (NextAuth)
    "/next-auth/error"          # Auth error page
    "/login"                    # Custom login page (if exists)
    "/signup"                   # Signup page (if exists)
    "/api/auth/signin"          # API signin endpoint
    "/manifest.webmanifest"     # PWA manifest
    "/robots.txt"               # Robots file
)

echo "🔍 Checking multiple public pages for WAF issues..."

total_problematic=0
all_chunks_found=""

for page in "${PUBLIC_PAGES[@]}"; do
    full_url="${WEBSITE_URL}${page}"
    echo "📄 Checking: $full_url"
    
    # Check if the page is accessible
    if curl -s --head "$full_url" >/dev/null 2>&1; then
        echo "  ✅ Page accessible"
        
        # Get the page content and extract chunk URLs
        page_content=$(curl -s "$full_url" 2>/dev/null)
        if [ -n "$page_content" ]; then
            # Look for Next.js chunks in this page
            chunks=$(echo "$page_content" | grep -o '_next/static/chunks/[^"]*' | sort -u)
            if [ -n "$chunks" ]; then
                echo "  📦 Found $(echo "$chunks" | wc -l) chunk references"
                all_chunks_found="$all_chunks_found\n$chunks"
            else
                echo "  ℹ️  No chunk references found"
            fi
        else
            echo "  ⚠️  Empty response"
        fi
    else
        echo "  ❌ Page not accessible"
    fi
    echo ""
done

# Analyze all found chunks for problematic patterns
echo "🔍 Analyzing all found chunks..."
if [ -n "$all_chunks_found" ]; then
    echo -e "$all_chunks_found" | sort -u | grep '%5B' > /tmp/waf_urls.txt
else
    touch /tmp/waf_urls.txt
fi

if [ -s /tmp/waf_urls.txt ]; then
    echo "❌ Found problematic URLs:"
    cat /tmp/waf_urls.txt
    echo ""
    echo "📊 Total problematic URLs found: $(wc -l < /tmp/waf_urls.txt)"
else
    echo "✅ No problematic %5Bvariant%5D URLs found!"
fi

# Also check for any JavaScript errors by looking for common chunk patterns
echo ""
echo "🔍 Checking for other potential WAF-blocked patterns..."
if [ -n "$all_chunks_found" ]; then
    echo -e "$all_chunks_found" | sort -u | grep -E '\[|\]|\(|\)|%' > /tmp/all_problematic_urls.txt
else
    touch /tmp/all_problematic_urls.txt
fi

if [ -s /tmp/all_problematic_urls.txt ]; then
    echo "⚠️  Found URLs with potentially problematic characters:"
    cat /tmp/all_problematic_urls.txt
    echo ""
    echo "📊 Total potentially problematic URLs found: $(wc -l < /tmp/all_problematic_urls.txt)"
else
    echo "✅ No URLs with problematic characters found!"
fi

# Check for WAF-related headers or responses
echo ""
echo "🔍 Checking for WAF-related headers..."
headers=$(curl -s -I "$WEBSITE_URL")
if echo "$headers" | grep -i -E "cloudflare|waf|firewall|security" >/dev/null; then
    echo "🛡️  WAF/Security headers detected:"
    echo "$headers" | grep -i -E "cloudflare|waf|firewall|security|cf-ray"
else
    echo "ℹ️  No obvious WAF headers detected"
fi

echo ""
echo "💡 Next steps:"
echo "1. Open $WEBSITE_URL in browser"
echo "2. Login to access protected pages"
echo "3. Open browser DevTools (F12)"
echo "4. Check Console for JavaScript errors"
echo "5. Check Network tab for failed requests (look for 403/406 status codes)"
echo "6. Look for 'WAF:' log messages if implemented"
echo "7. Test navigation to different sections after login"
echo ""
echo "🔧 Additional testing after login:"
echo "   - Navigate to /chat, /settings, /discover pages"
echo "   - Check for any chunk loading failures"
echo "   - Monitor Network tab for blocked resources"

rm -f /tmp/waf_urls.txt /tmp/all_problematic_urls.txt
