#!/bin/bash

# Development WAF URL Checker
# Run this while development server is running to test URLs

echo "🔍 Checking for %5Bvariant%5D URLs in localhost:3010..."

# Wait for the server to be ready
echo "Waiting for server to be ready..."
while ! curl -s http://localhost:3010 >/dev/null; do
    sleep 1
done

echo "✅ Server is ready. Fetching page..."

# Get the main page and check for problematic URLs
curl -s http://localhost:3010 | grep -o '_next/static/chunks/[^"]*' | grep '%5B' > /tmp/waf_urls.txt

if [ -s /tmp/waf_urls.txt ]; then
    echo "❌ Found problematic URLs:"
    cat /tmp/waf_urls.txt
    echo ""
    echo "📊 Total problematic URLs found: $(wc -l < /tmp/waf_urls.txt)"
else
    echo "✅ No problematic %5Bvariant%5D URLs found!"
fi

# Also check browser console for WAF logs
echo ""
echo "💡 Next steps:"
echo "1. Open http://localhost:3010 in browser"
echo "2. Open browser DevTools (F12)"
echo "3. Check Console for 'WAF:' log messages"
echo "4. Look for URL rewriting logs"

rm -f /tmp/waf_urls.txt
