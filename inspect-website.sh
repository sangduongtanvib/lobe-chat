#!/bin/bash

# Detailed website inspection for login functionality

WEBSITE_URL=${1:-"https://s2dchat.io.vn"}

echo "🔍 Detailed inspection of $WEBSITE_URL..."

# Check main page content
echo "📄 Checking main page content..."
main_page=$(curl -s "$WEBSITE_URL")

if [ -z "$main_page" ]; then
    echo "❌ No content received from main page"
    exit 1
fi

echo "📏 Page content length: $(echo "$main_page" | wc -c) characters"

# Check for login-related content
echo ""
echo "🔍 Looking for login-related elements..."

# Check for login forms
if echo "$main_page" | grep -i -q "login\|sign.*in\|email\|password"; then
    echo "✅ Found login-related keywords"
else
    echo "❌ No obvious login keywords found"
fi

# Check for redirect patterns
if echo "$main_page" | grep -i -q "redirect\|window\.location\|href="; then
    echo "✅ Found redirect patterns - may redirect to login"
else
    echo "❌ No redirect patterns found"
fi

# Check for authentication-related meta tags or scripts
echo ""
echo "🔍 Checking for authentication patterns..."
if echo "$main_page" | grep -i -q "auth\|nextauth\|session\|token"; then
    echo "✅ Found authentication-related content"
    echo "🔍 Authentication patterns found:"
    echo "$main_page" | grep -i -o "auth[^\"']*\|nextauth[^\"']*\|session[^\"']*" | head -5
else
    echo "❌ No authentication patterns found"
fi

# Check for React/Next.js app structure
echo ""
echo "🔍 Checking app structure..."
if echo "$main_page" | grep -q "__NEXT_DATA__\|_app\|_document"; then
    echo "✅ Next.js app detected"
else
    echo "❌ Not a typical Next.js app structure"
fi

# Check for loading states or client-side rendering
if echo "$main_page" | grep -i -q "loading\|spinner\|skeleton"; then
    echo "✅ Found loading indicators - may be client-side rendered"
else
    echo "❌ No loading indicators found"
fi

# Check response headers for more info
echo ""
echo "🔍 Checking response headers..."
headers=$(curl -s -I "$WEBSITE_URL")
echo "📋 Response headers:"
echo "$headers" | grep -E "HTTP/|Content-Type|Location|Set-Cookie|Cache-Control" | head -10

# Check for specific paths
echo ""
echo "🔍 Testing specific authentication paths..."

auth_paths=(
    "/login"
    "/signin" 
    "/auth/signin"
    "/api/auth/signin"
    "/next-auth/signin"
)

for path in "${auth_paths[@]}"; do
    echo "Testing: ${WEBSITE_URL}${path}"
    status=$(curl -s -o /dev/null -w "%{http_code}" "${WEBSITE_URL}${path}")
    if [ "$status" = "200" ]; then
        echo "  ✅ $status - Page exists"
        content=$(curl -s "${WEBSITE_URL}${path}")
        if echo "$content" | grep -i -q "login\|sign.*in\|email\|password"; then
            echo "  🎯 Found login form!"
        fi
    elif [ "$status" = "302" ] || [ "$status" = "301" ]; then
        echo "  🔄 $status - Redirects (may redirect to correct login page)"
    else
        echo "  ❌ $status - Not accessible"
    fi
done

# Save main page content for manual inspection
echo ""
echo "💾 Saving main page content to /tmp/main_page.html for manual inspection..."
echo "$main_page" > /tmp/main_page.html
echo "📁 You can open /tmp/main_page.html in a browser to see the raw content"

echo ""
echo "💡 Manual testing suggestions:"
echo "1. Open $WEBSITE_URL in an incognito browser window"
echo "2. Check if there's a client-side redirect happening"
echo "3. Check browser console for any JavaScript errors"
echo "4. Try accessing $WEBSITE_URL/login directly"
echo "5. Look for authentication provider buttons (Google, GitHub, etc.)"
