#!/usr/bin/env node

/**
 * SSL Configuration Fix Script
 * This script helps diagnose and fix SSL certificate issues in Next.js applications
 */

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

console.log('🔍 SSL Configuration Diagnostics');
console.log('=================================');

// Check current NODE_TLS_REJECT_UNAUTHORIZED setting
console.log('1. Checking NODE_TLS_REJECT_UNAUTHORIZED...');
console.log(`   Current value: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'undefined'}`);

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.log('   ✅ NODE_TLS_REJECT_UNAUTHORIZED is set to 0 (SSL verification disabled)');
} else {
  console.log('   ⚠️  NODE_TLS_REJECT_UNAUTHORIZED is not set to 0');
  console.log('   💡 To disable SSL verification, set: NODE_TLS_REJECT_UNAUTHORIZED=0');
}

// Test SSL connection to the problematic domain
console.log('\n2. Testing SSL connection to domain...');
const testDomain = process.argv[2] || 'nonprod-vibgpt.vib';
const testUrl = `https://${testDomain}`;

console.log(`   Testing: ${testUrl}`);

// Override global agent settings
const originalAgent = https.globalAgent;
https.globalAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
});

const req = https.request(
  testUrl,
  {
    agent: new https.Agent({
      rejectUnauthorized: false, // Force disable for testing
    }),
    method: 'HEAD',
    timeout: 10_000,
  },
  (res) => {
    console.log(`   ✅ SSL connection successful (Status: ${res.statusCode})`);
    console.log(`   Certificate info:`);
    console.log(`   - Subject: ${res.socket.getPeerCertificate().subject?.CN || 'N/A'}`);
    console.log(`   - Issuer: ${res.socket.getPeerCertificate().issuer?.CN || 'N/A'}`);
    console.log(`   - Valid from: ${res.socket.getPeerCertificate().valid_from || 'N/A'}`);
    console.log(`   - Valid to: ${res.socket.getPeerCertificate().valid_to || 'N/A'}`);
  },
);

req.on('error', (err) => {
  console.log(`   ❌ SSL connection failed: ${err.message}`);
  console.log(`   Error code: ${err.code}`);

  if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.log('\n💡 SSL Certificate Solutions:');
    console.log('   1. Set NODE_TLS_REJECT_UNAUTHORIZED=0 in your environment');
    console.log('   2. Add to your .env file:');
    console.log('      NODE_TLS_REJECT_UNAUTHORIZED=0');
    console.log('   3. For Docker, add to docker-compose.yml:');
    console.log('      environment:');
    console.log('        - NODE_TLS_REJECT_UNAUTHORIZED=0');
    console.log('   4. For production, consider using proper SSL certificates');
  }
});

req.setTimeout(10_000, () => {
  console.log('   ⏱️  Connection timeout');
  req.destroy();
});

req.end();

// Restore original agent
setTimeout(() => {
  https.globalAgent = originalAgent;
}, 15_000);

// Check Next.js configuration
console.log('\n3. Checking Next.js configuration...');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  console.log('   ✅ next.config.ts found');
  const configContent = fs.readFileSync(nextConfigPath, 'utf8');

  if (configContent.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
    console.log('   ✅ SSL handling found in next.config.ts');
  } else {
    console.log('   ⚠️  No SSL handling found in next.config.ts');
  }
} else {
  console.log('   ❌ next.config.ts not found');
}

// Generate .env template
console.log('\n4. Generating environment configuration...');
const envContent = `# SSL Configuration for development/testing
NODE_TLS_REJECT_UNAUTHORIZED=0

# Next.js Configuration
NODE_ENV=development
HOSTNAME=0.0.0.0
PORT=3210

# Add your other environment variables here
`;

const envPath = path.join(process.cwd(), '.env.ssl-fix');
fs.writeFileSync(envPath, envContent);
console.log(`   ✅ SSL configuration template saved to: ${envPath}`);
console.log('   📝 Copy the contents to your .env file');

console.log('\n🎯 Summary and Next Steps:');
console.log('=============================');
console.log('1. Ensure NODE_TLS_REJECT_UNAUTHORIZED=0 is set in your environment');
console.log('2. Restart your Next.js application after setting the environment variable');
console.log(
  '3. For Docker deployments, ensure the environment variable is passed to the container',
);
console.log('4. Consider using proper SSL certificates in production environments');
console.log('\n🔧 Quick fix command:');
console.log('   NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev');
console.log('   or');
console.log('   NODE_TLS_REJECT_UNAUTHORIZED=0 npm run start');

process.exit(0);
