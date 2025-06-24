'use client';

import Script from 'next/script';

/**
 * WAF Static File Interceptor Component
 * Injects client-side script to handle WAF-friendly static file URL rewriting
 */
export default function WAFChunkInterceptor() {
  const wafScript = `
    (function() {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      console.debug('WAF: Initializing static file interceptor');
      
      // Enhanced chunk monitoring for development mode
      const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      if (isDev) {
        console.debug('WAF: Development mode detected, enabling enhanced monitoring');
      }
      
      // Intercept fetch requests
      const originalFetch = window.fetch;
      window.fetch = function(resource, init) {
        if (typeof resource === 'string' && resource.includes('/_next/static/')) {
          const wafFriendlyUrl = makeWAFFriendlyStaticUrl(resource);
          if (wafFriendlyUrl !== resource) {
            console.log('WAF: Rewriting fetch URL:', resource, '->', wafFriendlyUrl);
            resource = wafFriendlyUrl;
          }
        }
        return originalFetch.call(this, resource, init);
      };

      // Intercept XMLHttpRequest for older browsers or libraries
      const OriginalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open;
        
        xhr.open = function(method, url, ...args) {
          if (typeof url === 'string' && url.includes('/_next/static/')) {
            const wafFriendlyUrl = makeWAFFriendlyStaticUrl(url);
            if (wafFriendlyUrl !== url) {
              console.log('WAF: Rewriting XHR URL:', url, '->', wafFriendlyUrl);
              url = wafFriendlyUrl;
            }
          }
          return originalOpen.call(this, method, url, ...args);
        };
        
        return xhr;
      };

      // Intercept dynamic imports and script/link tag creation
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if ((name === 'src' || name === 'href') && typeof value === 'string' && value.includes('/_next/static/')) {
              const wafFriendlyUrl = makeWAFFriendlyStaticUrl(value);
              if (wafFriendlyUrl !== value) {
                console.log('WAF: Rewriting element URL:', value, '->', wafFriendlyUrl);
                value = wafFriendlyUrl;
              }
            }
            return originalSetAttribute.call(this, name, value);
          };
        }
        
        return element;
      };

      // Monitor and intercept script loading for chunks
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src && child.src.includes('/_next/static/chunks/')) {
          const originalSrc = child.src;
          const wafFriendlyUrl = makeWAFFriendlyStaticUrl(originalSrc);
          if (wafFriendlyUrl !== originalSrc) {
            console.log('WAF: Rewriting appended script src:', originalSrc, '->', wafFriendlyUrl);
            child.src = wafFriendlyUrl;
          }
        }
        return originalAppendChild.call(this, child);
      };

      // Helper function to convert URLs
      function makeWAFFriendlyStaticUrl(originalUrl) {
        if (!originalUrl.includes('/_next/static/')) {
          return originalUrl;
        }

        // Log for debugging in development
        if (isDev && originalUrl.includes('%5B')) {
          console.log('WAF: Processing URL with encoded brackets:', originalUrl);
        }

        const staticPath = originalUrl.split('/_next/static/')[1];
        let wafPrefix = '/waf-safe/';
        let processPath = staticPath;
        
        if (staticPath.startsWith('chunks/')) {
          const chunkPath = staticPath.replace('chunks/', '');
          
          // Handle specific variant patterns that commonly trigger WAF
          if (chunkPath.includes('src_app_v_%5B') && chunkPath.includes('%5D')) {
            // More flexible pattern matching for variant chunks
            const variantPattern = /src_app_v_%5B([^%]+)%5D(.*)_([^.]+)\\._.js$/;
            const match = chunkPath.match(variantPattern);
            
            if (match) {
              const [, variant, restPath, hash] = match;
              // Create a clean, WAF-friendly filename
              const cleanRestPath = restPath
                .replace(/^\\_/, '')
                .replaceAll('_', '-')
                .replaceAll('(', '-')
                .replaceAll(')', '-')
                .replaceAll('%40', '-at-');
              
              return originalUrl.replace(
                \`/_next/static/chunks/\${chunkPath}\`,
                \`/safe-chunks/app-variant-\${variant}\${cleanRestPath}-\${hash}.js\`
              );
            }
          }
          
          wafPrefix = '/static/js/';
          processPath = chunkPath;
        } else if (staticPath.startsWith('css/')) {
          wafPrefix = '/static/css/';
          processPath = staticPath.replace('css/', '');
        } else if (staticPath.startsWith('media/')) {
          wafPrefix = '/static/media/';
          processPath = staticPath.replace('media/', '');
        }
        
        const safeStaticPath = processPath
          .replaceAll('%5B', '_OB_')
          .replaceAll('%5D', '_CB_')
          .replaceAll('%40', '_AT_')
          .replaceAll('(', '_OP_')
          .replaceAll(')', '_CP_')
          .replaceAll('%', '_PCT_');
        
        const finalUrl = originalUrl.replace(
          \`/_next/static/\${staticPath}\`,
          \`\${wafPrefix}\${safeStaticPath}\`
        );
        
        if (isDev && finalUrl !== originalUrl) {
          console.log('WAF: Final URL transformation:', originalUrl, '->', finalUrl);
        }
        
        return finalUrl;
      }
      
      console.debug('WAF: Static file interceptor initialized');
    })();
  `;

  return (
    <Script
      dangerouslySetInnerHTML={{ __html: wafScript }}
      id="waf-chunk-interceptor"
      strategy="afterInteractive"
    />
  );
}
