/**
 * Unregister Service Worker Script
 * Run this to clean up existing service workers that cause 500 errors
 */

(function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      console.log('Found', registrations.length, 'service worker registrations');
      
      registrations.forEach(function(registration) {
        console.log('Unregistering service worker:', registration.scope);
        registration.unregister().then(function(success) {
          if (success) {
            console.log('✅ Service worker unregistered successfully:', registration.scope);
          } else {
            console.warn('❌ Failed to unregister service worker:', registration.scope);
          }
        });
      });
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
          console.log('Found', cacheNames.length, 'caches to clear');
          return Promise.all(
            cacheNames.map(function(cacheName) {
              console.log('Clearing cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        }).then(function() {
          console.log('✅ All caches cleared');
          // Reload page after cleanup
          setTimeout(function() {
            window.location.reload(true);
          }, 1000);
        });
      }
    });
  } else {
    console.log('Service Workers not supported');
  }
})(); 