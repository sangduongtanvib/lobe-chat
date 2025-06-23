#!/usr/bin/env node

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

// Test URLs with special characters from LobeChat
const testUrls = [
  // Original problematic URLs
  'chunks/app/v/%5Bvariant%5D/(main)/chat/(workspace)/%40portal/default-77c0472c53fb0417.js',
  'static/chunks/app/v/%5Bvariant%5D/(main)/chat/%40session/default-8be4c0c1f536afa7.js',
  'static/chunks/app/v/%5Bvariant%5D/(main)/layout-9d4326fc740eb4a7.js',

  // Decoded versions (what should work)
  'chunks/app/v/[variant]/(main)/chat/(workspace)/@portal/default-77c0472c53fb0417.js',
  'static/chunks/app/v/[variant]/(main)/chat/@session/default-8be4c0c1f536afa7.js',
  'static/chunks/app/v/[variant]/(main)/layout-9d4326fc740eb4a7.js',

  // Next.js static files
  '_next/static/chunks/app/v/%5Bvariant%5D/(main)/layout.js',
  '_next/static/chunks/app/v/[variant]/(main)/layout.js',
];

const normalizeStaticUrl = (pathname) => {
  const patterns = [
    { pattern: /%5B([^%5D]+)%5D/g, replacement: '[$1]' }, // [dynamic]
    { pattern: /%40([^/]+)/g, replacement: '@$1' }, // @parallel
    { pattern: /\(([^)]+)\)/g, replacement: '($1)' }, // (groups)
  ];

  let normalized = pathname;
  patterns.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized;
};

const testUrlEncoding = (baseUrl) => {
  console.log(`🧪 Testing URL encoding for: ${baseUrl}`);
  console.log('='.repeat(60));

  testUrls.forEach((testPath, index) => {
    const fullUrl = new URL(testPath, baseUrl);
    const normalized = normalizeStaticUrl(testPath);

    console.log(`\n${index + 1}. Testing: ${testPath}`);
    console.log(`   Full URL: ${fullUrl.href}`);
    console.log(`   Normalized: ${normalized}`);
    console.log(`   Encoded parts:`);
    console.log(`     %5B = [ (bracket open)`);
    console.log(`     %5D = ] (bracket close)`);
    console.log(`     %40 = @ (at symbol)`);

    // Test if URL is accessible
    const client = fullUrl.protocol === 'https:' ? https : http;

    const request = client.request(fullUrl, { method: 'HEAD' }, (res) => {
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode === 200) {
        console.log(`   ✅ URL accessible`);
      } else if (res.statusCode === 404) {
        console.log(`   ⚠️  URL not found - may need normalization`);
      } else {
        console.log(`   ❌ Error: ${res.statusCode}`);
      }
    });

    request.on('error', (err) => {
      console.log(`   ❌ Network error: ${err.message}`);
    });

    request.setTimeout(5000, () => {
      console.log(`   ⏱️  Request timeout`);
      request.destroy();
    });

    request.end();
  });
};

// Main execution
const baseUrl = process.argv[2] || 'http://localhost:3210';

console.log('🚀 LobeChat URL Encoding Test Tool');
console.log(`📍 Testing against: ${baseUrl}`);
console.log('');

// Test the URL normalization function
console.log('🔧 Testing URL normalization function:');
testUrls.slice(0, 3).forEach((url) => {
  const normalized = normalizeStaticUrl(url);
  console.log(`   ${url}`);
  console.log(`   → ${normalized}`);
  console.log('');
});

console.log('🌐 Testing URL accessibility:');
testUrlEncoding(baseUrl);

// Usage instructions
console.log('\n📋 Usage:');
console.log('   node scripts/test-url-encoding.js [BASE_URL]');
console.log('   node scripts/test-url-encoding.js http://localhost:3210');
console.log('   node scripts/test-url-encoding.js https://your-domain.com');
console.log('\n💡 If you see 404 errors, apply the middleware fixes from this script.');
