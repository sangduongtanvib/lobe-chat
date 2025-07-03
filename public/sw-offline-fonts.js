/**
 * Service Worker for Offline Font and Asset Interception
 * This service worker intercepts all requests to external CDNs and redirects them to local resources
 */

const CACHE_NAME = 'lobe-offline-fonts-v1';

// CDN to local mapping
const CDN_REDIRECTS = {
  // Font mappings
  'registry.npmmirror.com/@lobehub/webfont-mono/latest/files/css/index.css': '/fonts/webfont-mono.css',
  'registry.npmmirror.com/@lobehub/webfont-harmony-sans/latest/files/css/index.css': '/fonts/harmony-sans/index.css', 
  'registry.npmmirror.com/@lobehub/webfont-harmony-sans-sc/latest/files/css/index.css': '/fonts/harmony-sans-sc/index.css',
  'registry.npmmirror.com/katex/latest/files/dist/katex.min.css': '/fonts/katex/katex.min.css',
  
  // Font files
  'registry.npmmirror.com/@lobehub/webfont-mono/latest/files/fonts/': '/fonts/',
  'registry.npmmirror.com/@lobehub/webfont-harmony-sans/latest/files/fonts/': '/fonts/harmony-sans/',
  'registry.npmmirror.com/@lobehub/webfont-harmony-sans-sc/latest/files/fonts/': '/fonts/harmony-sans-sc/',
  
  // Emoji mappings
  'registry.npmmirror.com/@lobehub/fluent-emoji-anim-1/1.0.0/files/assets/': '/emojis/',
};

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing offline font interceptor');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Offline font interceptor activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if this is a request to a CDN we want to intercept
  const urlPath = `${url.hostname}${url.pathname}`;
  
  // Find matching redirect rule
  let localPath = null;
  for (const [cdnPattern, localRoute] of Object.entries(CDN_REDIRECTS)) {
    if (urlPath.includes(cdnPattern) || urlPath.startsWith(cdnPattern)) {
      if (cdnPattern.endsWith('/')) {
        // Handle directory mapping (like fonts/)
        const fileName = url.pathname.split('/').pop();
        localPath = localRoute + fileName;
      } else {
        // Handle exact file mapping
        localPath = localRoute;
      }
      break;
    }
  }
  
  if (localPath) {
    console.log(`🔄 Service Worker: Redirecting ${event.request.url} to ${localPath}`);
    
    // Create new request to local resource
    const localUrl = new URL(localPath, self.location.origin);
    const localRequest = new Request(localUrl, {
      method: event.request.method,
      headers: event.request.headers,
      mode: 'cors',
      credentials: 'omit',
    });
    
    event.respondWith(
      fetch(localRequest).catch((error) => {
        console.warn(`⚠️ Service Worker: Failed to fetch local resource ${localPath}:`, error);
        // Fallback to original request if local resource fails
        return fetch(event.request);
      })
    );
  }
  // For all other requests, let them pass through normally
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
