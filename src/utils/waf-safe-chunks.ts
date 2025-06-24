/**
 * WAF-friendly URL utilities for Next.js static files
 * Converts Next.js static URLs with special characters to WAF-safe URLs
 */

/**
 * Converts a Next.js static file URL with special characters to a WAF-friendly URL
 */
export function makeWAFFriendlyStaticUrl(originalUrl: string): string {
  // If it's not a Next.js static URL, return as is
  if (!originalUrl.includes('/_next/static/')) {
    return originalUrl;
  }

  // Extract the static file path
  const staticPath = originalUrl.split('/_next/static/')[1];

  // Determine the type of static file and appropriate WAF-friendly prefix
  let wafPrefix = '/waf-safe/';
  let processPath = staticPath;

  if (staticPath.startsWith('chunks/')) {
    const chunkPath = staticPath.replace('chunks/', '');

    // Handle specific patterns that commonly trigger WAF
    if (
      chunkPath.includes('src_app_v_%5B') &&
      chunkPath.includes('%5D_(main)_chat_(workspace)_%40')
    ) {
      // Convert src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_hash._.js
      // to safe-chunks/app-variant-variant-conversation-conversation-hash.js
      const pattern =
        /src_app_v_%5B([^%]+)%5D_\(main\)_chat_\(workspace\)_%40([^_]+)_default_tsx_([^.]+)\._.js$/;
      const match = chunkPath.match(pattern);

      if (match) {
        const [, variant, conversation, hash] = match;
        return originalUrl.replace(
          `/_next/static/chunks/${chunkPath}`,
          `/safe-chunks/app-variant-${variant}-conversation-${conversation}-${hash}.js`,
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

  // General WAF-friendly replacements for static files
  const safeStaticPath = processPath
    .replaceAll('%5B', '_OB_') // [ -> _OB_ (Open Bracket)
    .replaceAll('%5D', '_CB_') // ] -> _CB_ (Close Bracket)
    .replaceAll('%40', '_AT_') // @ -> _AT_
    .replaceAll('(', '_OP_') // ( -> _OP_ (Open Paren)
    .replaceAll(')', '_CP_') // ) -> _CP_ (Close Paren)
    .replaceAll('%', '_PCT_'); // % -> _PCT_ (Percent)

  return originalUrl.replace(`/_next/static/${staticPath}`, `${wafPrefix}${safeStaticPath}`);
}

/**
 * Client-side script to intercept and rewrite static file URLs
 * This should be injected into the HTML to handle dynamic file loading
 */
export const wafStaticInterceptorScript = `
  (function() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    console.debug('WAF: Initializing static file interceptor');
    
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
      if (typeof resource === 'string' && resource.includes('/_next/static/')) {
        const wafFriendlyUrl = makeWAFFriendlyStaticUrl(resource);
        if (wafFriendlyUrl !== resource) {
          console.debug('WAF: Rewriting static URL:', resource, '->', wafFriendlyUrl);
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
            console.debug('WAF: Rewriting XHR static URL:', url, '->', wafFriendlyUrl);
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
              console.debug('WAF: Rewriting element URL:', value, '->', wafFriendlyUrl);
              value = wafFriendlyUrl;
            }
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };

    // Helper function to convert URLs (duplicated here for inline script)
    function makeWAFFriendlyStaticUrl(originalUrl) {
      if (!originalUrl.includes('/_next/static/')) {
        return originalUrl;
      }

      const staticPath = originalUrl.split('/_next/static/')[1];
      let wafPrefix = '/waf-safe/';
      let processPath = staticPath;
      
      if (staticPath.startsWith('chunks/')) {
        const chunkPath = staticPath.replace('chunks/', '');
        
        if (chunkPath.includes('src_app_v_%5B') && chunkPath.includes('%5D_(main)_chat_(workspace)_%40')) {
          const pattern = /src_app_v_%5B([^%]+)%5D_\\(main\\)_chat_\\(workspace\\)_%40([^_]+)_default_tsx_([^.]+)\\._.js$/;
          const match = chunkPath.match(pattern);
          
          if (match) {
            const [, variant, conversation, hash] = match;
            return originalUrl.replace(
              \`/_next/static/chunks/\${chunkPath}\`,
              \`/safe-chunks/app-variant-\${variant}-conversation-\${conversation}-\${hash}.js\`
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
      
      return originalUrl.replace(
        \`/_next/static/\${staticPath}\`,
        \`\${wafPrefix}\${safeStaticPath}\`
      );
    }
    
    console.debug('WAF: Static file interceptor initialized');
  })();
`;
