/**
 * Hook to register offline font service worker
 */

import { useEffect } from 'react';

export const useOfflineFontServiceWorker = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register if we're in offline mode (CDN_USE_GLOBAL is false)
      const isOfflineMode = process.env.NEXT_PUBLIC_CDN_USE_GLOBAL !== '1';
      
      if (isOfflineMode) {
        navigator.serviceWorker
          .register('/sw-offline-fonts.js')
          .then((registration) => {
            console.log('✅ Offline font service worker registered:', registration);
            
            // If there's a waiting service worker, activate it immediately
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('🔄 New offline font service worker available');
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn('⚠️ Failed to register offline font service worker:', error);
          });
      }
    }
  }, []);
};
