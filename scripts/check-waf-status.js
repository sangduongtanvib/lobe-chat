#!/usr/bin/env node

// Script to check WAF and SSL status
console.log('======= WAF & SSL STATUS CHECK =======');

// Check environment variables
const envVars = {
  DISABLE_WAF: process.env.DISABLE_WAF,
  DOCKER: process.env.DOCKER,
  HTTPS: process.env.HTTPS,
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
  NODE_ENV: process.env.NODE_ENV,
  NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
  SSL_CERT: process.env.SSL_CERT,
  SSL_KEY: process.env.SSL_KEY,
};

console.log('\n--- Environment Variables ---');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}: ${value || 'undefined'}`);
});

// Check SSL/TLS configuration
console.log('\n--- SSL/TLS Configuration ---');
const isProd = process.env.NODE_ENV === 'production';
const disableWAF = process.env.DISABLE_WAF === 'true';
const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';

console.log(`Production mode: ${isProd}`);
console.log(`WAF enabled: ${!disableWAF}`);
console.log(`TLS reject unauthorized: ${rejectUnauthorized}`);

// Check if running in Docker
console.log('\n--- Docker Environment ---');
const fs = require('node:fs');

const isDocker = fs.existsSync('/.dockerenv');
console.log(`Running in Docker: ${isDocker}`);

// Check certificates
console.log('\n--- SSL Certificates ---');
const certPaths = [
  '/etc/ssl/certs/',
  '/app/certs/',
  './certs/',
  '/usr/local/share/ca-certificates/',
];

certPaths.forEach((path) => {
  try {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path);
      console.log(`${path}: ${files.length} files found`);
      const certFiles = files.filter(
        (f) => f.includes('cert') || f.includes('crt') || f.includes('pem'),
      );
      if (certFiles.length > 0) {
        console.log(`  Certificate files: ${certFiles.join(', ')}`);
      }
    } else {
      console.log(`${path}: not found`);
    }
  } catch (err) {
    console.log(`${path}: error accessing (${err.message})`);
  }
});

// Check network configuration
console.log('\n--- Network Configuration ---');
const os = require('node:os');

const interfaces = os.networkInterfaces();
Object.keys(interfaces).forEach((name) => {
  const iface = interfaces[name];
  const addresses = iface.filter((i) => i.family === 'IPv4' && !i.internal);
  if (addresses.length > 0) {
    console.log(`${name}: ${addresses[0].address}`);
  }
});

console.log('\n=======================================');

// Exit with status code based on WAF status
process.exit(disableWAF ? 0 : 1);
