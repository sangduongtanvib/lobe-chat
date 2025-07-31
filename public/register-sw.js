/**
 * Register Service Worker for WAF URL Transformation
 */
(function() {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw-waf-interceptor.js', {
          scope: '/'
        });
        
        console.log('🛡️ WAF Service Worker registered successfully:', registration.scope);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('🛡️ WAF Service Worker is ready');
        
        // Force refresh if this is the first registration
        if (!navigator.serviceWorker.controller) {
          console.log('🔄 First SW registration, will reload page...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        
      } catch (error) {
        console.error('🛡️ WAF Service Worker registration failed:', error);
      }
    });
  } else {
    console.warn('🛡️ Service Workers are not supported in this browser');
  }
})(); 