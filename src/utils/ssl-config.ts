/**
 * SSL Configuration Helper for Docker environments
 * Handles self-signed certificates and SSL verification issues
 */

export interface SSLConfig {
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized: boolean;
  secureProtocol?: string;
}

/**
 * Get SSL configuration based on environment
 */
export function getSSLConfig(): SSLConfig {
  const isDocker = process.env.DOCKER === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const tlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

  // In Docker or when explicitly disabled, allow self-signed certificates
  if (isDocker || tlsRejectUnauthorized === '0') {
    return {
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method',
    };
  }

  // In production, use strict SSL
  if (isProduction) {
    return {
      rejectUnauthorized: true,
      secureProtocol: 'TLSv1_2_method',
    };
  }

  // Default configuration
  return {
    rejectUnauthorized: tlsRejectUnauthorized !== '0',
    secureProtocol: 'TLSv1_2_method',
  };
}

/**
 * Create HTTPS agent with proper SSL configuration
 */
export function createHTTPSAgent() {
  const https = require('node:https');
  const sslConfig = getSSLConfig();

  return new https.Agent({
    ca: sslConfig.ca,
    cert: sslConfig.cert,
    key: sslConfig.key,
    rejectUnauthorized: sslConfig.rejectUnauthorized,
    secureProtocol: sslConfig.secureProtocol,
  });
}

/**
 * Log SSL configuration for debugging
 */
export function logSSLConfig() {
  const config = getSSLConfig();
  console.log('SSL Configuration:', {
    docker: process.env.DOCKER,
    environment: process.env.NODE_ENV,
    rejectUnauthorized: config.rejectUnauthorized,
    secureProtocol: config.secureProtocol,
    tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
  });
} 