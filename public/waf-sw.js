/**
 * DISABLED WAF Service Worker
 * This service worker is disabled to prevent SSL certificate issues
 */

console.log('WAF Service Worker: DISABLED for SSL compatibility');

// Install event - do nothing
self.addEventListener('install', () => {
  console.log('WAF SW: Install event - WAF functionality disabled');
  self.skipWaiting();
});

// Activate event - do nothing
self.addEventListener('activate', () => {
  console.log('WAF SW: Activate event - WAF functionality disabled');
  self.clients.claim();
});

// Fetch event - pass through without modification
self.addEventListener('fetch', (event) => {
  // Pass all requests through without modification
  event.respondWith(fetch(event.request));
});

console.log('WAF SW: Service worker registered but all WAF functionality disabled'); 