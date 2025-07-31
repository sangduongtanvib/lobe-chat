/**
 * WAF URL Interceptor
 * Tự động chuyển đổi URLs có ký tự đặc biệt thành format an toàn với WAF
 */
(function() {
  'use strict';

  // Mapping rules - phải giống với proxy server
  const WAF_URL_MAPPING = {
    '%5B': '_ob_',   // [
    '%5D': '_cb_',   // ]
    '%40': '_at_',   // @
    '%28': '_op_',   // (
    '%29': '_cp_',   // )
    '%2B': '_plus_', // +
    '%26': '_amp_',  // &
    '%3D': '_eq_',   // =
    // Raw characters (unencoded)
    '[': '_ob_',     // [
    ']': '_cb_',     // ]
    '@': '_at_',     // @
    '(': '_op_',     // (
    ')': '_cp_',     // )
  };

  /**
   * Chuyển đổi URL có ký tự đặc biệt thành format an toàn với WAF
   */
  function encodeForWAF(url) {
    let safeUrl = url;
    
    // Chỉ áp dụng cho Next.js static chunks
    if (!url.includes('/_next/static/')) {
      return url;
    }
    
    for (const [encoded, safe] of Object.entries(WAF_URL_MAPPING)) {
      safeUrl = safeUrl.replaceAll(encoded, safe);
    }
    
    console.log(`🔄 WAF URL Transform: ${url} -> ${safeUrl}`);
    return safeUrl;
  }

  /**
   * Override XMLHttpRequest để intercept requests
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const transformedUrl = encodeForWAF(url);
    return originalXHROpen.call(this, method, transformedUrl, ...args);
  };

  /**
   * Override fetch để intercept requests
   */
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = encodeForWAF(input);
    } else if (input instanceof Request) {
      const transformedUrl = encodeForWAF(input.url);
      input = new Request(transformedUrl, input);
    }
    return originalFetch.call(this, input, init);
  };

  /**
   * Override dynamic import để intercept module loading
   */
  if (window.__webpack_require__) {
    const originalRequire = window.__webpack_require__;
    window.__webpack_require__ = function(moduleId) {
      // Transform chunk URLs nếu cần
      if (typeof moduleId === 'string' && moduleId.includes('_next/static/')) {
        moduleId = encodeForWAF(moduleId);
      }
      return originalRequire.call(this, moduleId);
    };
  }

  /**
   * Intercept script loading
   */
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          value = encodeForWAF(value);
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };

  console.log('🛡️ WAF URL Interceptor initialized');
})(); 