/**
 * WAF Service Worker for intercepting chunk requests
 * This runs independently of the main thread
 */

const WAF_SW_VERSION = '1.0.0';
const WAF_DEBUG = true;

console.log('WAF SW: Initializing service worker version', WAF_SW_VERSION);

// Install event
self.addEventListener('install', (event) => {
  console.log('WAF SW: Installing');
  self.skipWaiting(); // Force immediate activation
});

// Activate event
self.addEventListener('activate', (_event) => {
  console.log('WAF SW: Activating');
  _event.waitUntil(self.clients.claim()); // Take control immediately
});

// Message event for manual skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('WAF SW: Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Check if this is a Next.js chunk with problematic characters for WAF
  if (
    url.pathname.includes('/_next/static/') &&
    (url.pathname.includes('%5B') ||
      url.pathname.includes('%5D') ||
      url.pathname.includes('%40') ||
      url.pathname.includes('(') ||
      url.pathname.includes(')') ||
      url.pathname.includes('$') ||
      url.pathname.includes('#') ||
      url.pathname.includes('+') ||
      url.pathname.includes('&') ||
      url.pathname.includes('~') ||
      url.pathname.includes('?') ||
      url.pathname.includes('=') ||
      url.pathname.includes('|') ||
      url.pathname.includes('\\') ||
      url.pathname.includes('"') ||
      url.pathname.includes("'") ||
      url.pathname.includes('<') ||
      url.pathname.includes('>') ||
      url.pathname.includes('/v/%5Bvariant%5D'))
  ) {
    if (WAF_DEBUG) {
      console.log('WAF SW: Intercepting chunk request:', url.pathname);
    }

    let wafPath;

    // Handle App Router variant chunks
    if (url.pathname.includes('/app/v/%5Bvariant%5D/')) {
      const appChunkPath = url.pathname.replace('/_next/static/chunks/app/v/%5Bvariant%5D/', '');
      wafPath = '/safe-chunks/app-variant-' + appChunkPath;
    } else if (url.pathname.includes('/_next/static/chunks/')) {
      // Handle regular chunks with comprehensive pattern mapping
      const chunkPath = url.pathname.replace('/_next/static/chunks/', '');
      const wafChunkPath = chunkPath
        .replaceAll('%5B', '_OB_')
        .replaceAll('%5D', '_CB_')
        .replaceAll('%40', '_AT_')
        .replaceAll('(', '_OP_')
        .replaceAll(')', '_CP_')
        .replaceAll('%', '_PCT_')
        .replaceAll('$', '_DLR_')
        .replaceAll('#', '_HSH_')
        .replaceAll('+', '_PLU_')
        .replaceAll('&', '_AMP_')
        .replaceAll('~', '_TLD_')
        .replaceAll('?', '_QST_')
        .replaceAll('=', '_EQL_')
        .replaceAll(' ', '_SPC_')
        .replaceAll('|', '_PIP_')
        .replaceAll('\\', '_BSL_')
        .replaceAll('"', '_QUO_')
        .replaceAll('\'', '_SQU_')
        .replaceAll('<', '_LT_')
        .replaceAll('>', '_GT_');

      wafPath = '/safe-chunks/' + wafChunkPath;
    } else if (url.pathname.includes('/_next/static/css/')) {
      // Handle CSS files
      const cssPath = url.pathname.replace('/_next/static/css/', '');
      const wafCssPath = cssPath
        .replaceAll('%5B', '_OB_')
        .replaceAll('%5D', '_CB_')
        .replaceAll('%40', '_AT_')
        .replaceAll('(', '_OP_')
        .replaceAll(')', '_CP_')
        .replaceAll('%', '_PCT_')
        .replaceAll('$', '_DLR_')
        .replaceAll('#', '_HSH_')
        .replaceAll('+', '_PLU_')
        .replaceAll('&', '_AMP_')
        .replaceAll('~', '_TLD_')
        .replaceAll('?', '_QST_')
        .replaceAll('=', '_EQL_')
        .replaceAll(' ', '_SPC_')
        .replaceAll('|', '_PIP_')
        .replaceAll('\\', '_BSL_')
        .replaceAll('"', '_QUO_')
        .replaceAll('\'', '_SQU_')
        .replaceAll('<', '_LT_')
        .replaceAll('>', '_GT_');

      wafPath = '/static/css/' + wafCssPath;
    } else {
      // Handle other static files
      const staticPath = url.pathname.replace('/_next/static/', '');
      const wafStaticPath = staticPath
        .replaceAll('%5B', '_OB_')
        .replaceAll('%5D', '_CB_')
        .replaceAll('%40', '_AT_')
        .replaceAll('(', '_OP_')
        .replaceAll(')', '_CP_')
        .replaceAll('%', '_PCT_')
        .replaceAll('$', '_DLR_')
        .replaceAll('#', '_HSH_')
        .replaceAll('+', '_PLU_')
        .replaceAll('&', '_AMP_')
        .replaceAll('~', '_TLD_')
        .replaceAll('?', '_QST_')
        .replaceAll('=', '_EQL_')
        .replaceAll(' ', '_SPC_')
        .replaceAll('|', '_PIP_')
        .replaceAll('\\', '_BSL_')
        .replaceAll('"', '_QUO_')
        .replaceAll('\'', '_SQU_')
        .replaceAll('<', '_LT_')
        .replaceAll('>', '_GT_');

      wafPath = '/waf-safe/' + wafStaticPath;
    }

    // Create WAF-friendly URL by directly rewriting the path
    const wafUrl = new URL(url);
    wafUrl.pathname = wafPath;

    if (WAF_DEBUG) {
      console.log('WAF SW: Rewriting to WAF-safe path:', url.pathname, '->', wafUrl.pathname);
    }

    // Create new request with WAF-friendly URL
    const newRequest = new Request(wafUrl.toString(), {
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      headers: request.headers,
      method: request.method,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
    });

    // Enhanced error handling for SSL issues
    event.respondWith(
      fetch(newRequest).catch((error) => {
        console.warn('WAF SW: Fetch error, falling back to original request:', error);
        // If WAF-friendly request fails (e.g., due to SSL), try original request
        return fetch(request).catch((originalError) => {
          console.error('WAF SW: Both WAF and original requests failed:', originalError);
          // Return a proper response instead of throwing
          return new Response('Resource unavailable', {
            headers: { 'Content-Type': 'text/plain' },
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      }),
    );
    return;
  }

  // For all other requests, proceed normally with SSL error handling
  event.respondWith(
    fetch(request).catch((error) => {
      console.warn('WAF SW: General fetch error:', error);
      // Return a proper error response instead of letting it fail
      return new Response('Network error', {
        headers: { 'Content-Type': 'text/plain' },
        status: 503,
        statusText: 'Service Unavailable',
      });
    }),
  );
});

console.log('WAF SW: Service worker registered successfully');
