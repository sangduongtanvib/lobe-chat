#!/usr/bin/env node

/**
 * Server launcher with SSL certificate fix
 * This script ensures NODE_TLS_REJECT_UNAUTHORIZED is set before starting the server
 */

// Force set SSL configuration before any imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Also set other Node.js SSL options
process.env.NODE_OPTIONS =
  process.env.NODE_OPTIONS || '--dns-result-order=ipv4first --use-openssl-ca';

console.log('🔧 SSL Configuration Override:');
console.log(`   NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);
console.log(`   NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);

// Override global HTTPS agent settings before any modules are loaded
const https = require('node:https');

const originalGlobalAgent = https.globalAgent;

// Create a new global agent with SSL verification disabled
https.globalAgent = new https.Agent({
  checkServerIdentity: () => undefined,
  rejectUnauthorized: false, // Completely disable server identity check
});

console.log('🔒 HTTPS Global Agent configured to bypass SSL verification');

// Override the default HTTPS Agent constructor
const OriginalAgent = https.Agent;
https.Agent = function (options = {}) {
  // Force disable SSL verification for all new agents
  const modifiedOptions = {
    ...options,
    checkServerIdentity: () => undefined,
    rejectUnauthorized: false,
  };

  return new OriginalAgent(modifiedOptions);
};

// Also override fetch SSL settings if available
if (global.fetch) {
  const originalFetch = global.fetch;
  global.fetch = function (url, options = {}) {
    if (typeof url === 'string' && url.startsWith('https://')) {
      const modifiedOptions = {
        ...options,
        agent: new https.Agent({
          checkServerIdentity: () => undefined,
          rejectUnauthorized: false,
        }),
      };
      return originalFetch(url, modifiedOptions);
    }
    return originalFetch(url, options);
  };
}

console.log('🚀 Starting LobeChat server with SSL bypass...');

// Now start the actual server
try {
  require('./startServer.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
