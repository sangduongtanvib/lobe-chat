'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('🔧 Registering WAF Service Worker...');
      
      // Register WAF Service Worker first (higher priority)
      navigator.serviceWorker.register('/sw-waf-interceptor.js', {
        scope: '/',
        updateViaCache: 'none'
      })
        .then((registration) => {
          console.log('✅ WAF Service Worker registered successfully:', {
            scope: registration.scope,
            updateViaCache: registration.updateViaCache,
            active: registration.active?.scriptURL
          });
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('📨 SW Message:', event.data);
          });
          
          // Wait for WAF service worker to be active before registering PWA
          return registration.active || registration.waiting || registration.installing;
        })
        .then((serviceWorker) => {
          if (serviceWorker) {
            console.log('🔧 WAF Service Worker active, now registering PWA Service Worker...');
            // Register PWA Service Worker with different scope to avoid conflicts
            return navigator.serviceWorker.register('/sw.js', {
              scope: '/pwa/',
              updateViaCache: 'imports'
            });
          }
        })
        .then((pwaRegistration) => {
          if (pwaRegistration) {
            console.log('✅ PWA Service Worker registered successfully:', pwaRegistration);
          }
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
          console.warn('🔄 Attempting minimal WAF registration...');
          
          // Minimal fallback: just the essential WAF interceptor
          navigator.serviceWorker.register('/sw-waf-interceptor.js', {
            scope: '/_next/'
          })
            .then((registration) => {
              console.log('✅ Minimal WAF Service Worker registered:', registration);
            })
            .catch((fallbackError) => {
              console.error('❌ All Service Worker registrations failed:', fallbackError);
            });
        });
      
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed - reloading page');
        window.location.reload();
      });
      
      // Debug: Log current service worker status
      navigator.serviceWorker.ready.then((registration) => {
        console.log('🛡️ Service Workers ready:', {
          active: registration.active?.scriptURL,
          waiting: registration.waiting?.scriptURL,
          installing: registration.installing?.scriptURL,
          scope: registration.scope
        });
      });
    }
  }, []);

  return null;
}