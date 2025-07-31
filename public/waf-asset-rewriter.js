/**
 * Advanced WAF Asset Rewriter
 * Intercepts all asset loading including webpack dynamic imports
 */
(function() {
  'use strict';

  // WAF URL mapping - same as server
  const WAF_URL_MAPPING = {
    '%5B': '_ob_',   // [
    '%5D': '_cb_',   // ]
    '%40': '_at_',   // @
    '%28': '_op_',   // (
    '%29': '_cp_',   // )
    '%2B': '_plus_', // +
    '%26': '_amp_',  // &
    '%3D': '_eq_',   // =
    // Raw characters
    '[': '_ob_',
    ']': '_cb_',
    '@': '_at_',
    '(': '_op_',
    ')': '_cp_',
  };

  /**
   * Transform URL to be WAF-safe
   */
  function transformUrlForWAF(url) {
    if (!url || !url.includes('/_next/static/')) {
      return url;
    }

    let transformedUrl = url;
    for (const [unsafe, safe] of Object.entries(WAF_URL_MAPPING)) {
      transformedUrl = transformedUrl.replaceAll(unsafe, safe);
    }
    
    if (transformedUrl !== url) {
      console.log(`🛡️ WAF Asset Transform: ${url} -> ${transformedUrl}`);
    }
    
    return transformedUrl;
  }

  // 1. Intercept webpack chunk loading
  if (typeof window !== 'undefined' && window.__webpack_require__) {
    const originalLoad = window.__webpack_require__.l;
    if (originalLoad) {
      window.__webpack_require__.l = function(url, done, key, chunkId) {
        const transformedUrl = transformUrlForWAF(url);
        return originalLoad.call(this, transformedUrl, done, key, chunkId);
      };
    }

    // Intercept webpack public path
    const originalP = window.__webpack_require__.p;
    Object.defineProperty(window.__webpack_require__, 'p', {
      get() {
        return originalP;
      },
      set(value) {
        // Don't change the public path, let our interceptors handle it
      }
    });
  }

  // 2. Intercept dynamic script loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      let _src = '';
      Object.defineProperty(element, 'src', {
        get() {
          return _src;
        },
        set(value) {
          _src = transformUrlForWAF(value);
          element.setAttribute('src', _src);
        }
      });
    }
    
    return element;
  };

  // 3. Intercept link elements (CSS, preload, etc.)
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if ((name === 'src' || name === 'href') && typeof value === 'string') {
      value = transformUrlForWAF(value);
    }
    return originalSetAttribute.call(this, name, value);
  };

  // 4. Intercept webpack jsonp loading (for Next.js chunks)
  if (typeof window !== 'undefined') {
    // Wait for webpack to be available
    let attempts = 0;
    const checkWebpack = () => {
      if (window.__webpack_require__ && window.__webpack_require__.e) {
        const originalE = window.__webpack_require__.e;
        window.__webpack_require__.e = function(chunkId) {
          // Intercept chunk loading
          const result = originalE.call(this, chunkId);
          if (result && result.then) {
            return result.catch(error => {
              // If chunk fails to load, it might be due to WAF blocking
              console.warn(`🛡️ WAF: Chunk ${chunkId} failed to load:`, error);
              throw error;
            });
          }
          return result;
        };
        console.log('🛡️ WAF Asset Rewriter: Webpack chunk loading intercepted');
      } else if (attempts < 50) {
        attempts++;
        setTimeout(checkWebpack, 100);
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkWebpack);
    } else {
      checkWebpack();
    }
  }

  // 5. Intercept fetch for CSS and other assets
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = transformUrlForWAF(input);
    } else if (input && input.url) {
      input.url = transformUrlForWAF(input.url);
    }
    return originalFetch.call(this, input, init);
  };

  console.log('🛡️ WAF Asset Rewriter initialized');
})(); 