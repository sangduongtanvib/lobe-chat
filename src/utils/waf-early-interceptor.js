/**
 * Early WAF Script - Injected before Next.js initializes
 * This script runs as early as possible to intercept all chunk loading
 */

// Global flag to enable debug logging in development
window.WAF_DEBUG = process.env.NODE_ENV === 'development';

// Early override of dynamic import for Next.js chunks
if (typeof window !== 'undefined') {
  console.log('WAF: Early interceptor initializing...');

  // Store original methods before any libraries override them
  const _originalFetch = window.fetch;
  const _originalImport = window.import || (() => {});

  // Override fetch immediately
  window.fetch = function (resource, init) {
    if (
      typeof resource === 'string' &&
      resource.includes('/_next/static/chunks/') &&
      resource.includes('%5B')
    ) {
      const wafUrl = resource
        .replace('/_next/static/chunks/', '/static/js/')
        .replaceAll('%5B', '_OB_')
        .replaceAll('%5D', '_CB_')
        .replaceAll('%40', '_AT_')
        .replaceAll('(', '_OP_')
        .replaceAll(')', '_CP_');

      if (window.WAF_DEBUG) {
        console.log('WAF Early: Fetch rewrite:', resource, '->', wafUrl);
      }

      return _originalFetch.call(this, wafUrl, init);
    }
    return _originalFetch.call(this, resource, init);
  };

  // Override dynamic import if available
  if (window.import) {
    window.import = function (specifier) {
      if (
        typeof specifier === 'string' &&
        specifier.includes('/_next/static/chunks/') &&
        specifier.includes('%5B')
      ) {
        const wafUrl = specifier
          .replace('/_next/static/chunks/', '/static/js/')
          .replaceAll('%5B', '_OB_')
          .replaceAll('%5D', '_CB_')
          .replaceAll('%40', '_AT_')
          .replaceAll('(', '_OP_')
          .replaceAll(')', '_CP_');

        if (window.WAF_DEBUG) {
          console.log('WAF Early: Import rewrite:', specifier, '->', wafUrl);
        }

        return _originalImport.call(this, wafUrl);
      }
      return _originalImport.call(this, specifier);
    };
  }

  console.log('WAF: Early interceptor ready');
}
