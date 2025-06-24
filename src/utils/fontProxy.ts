/**
 * Font URL Proxy - Override font loading from packages
 * This utility intercepts and redirects font URLs to local resources
 */

/// <reference lib="dom" />

// Original CDN URLs that packages might use
const CDN_FONT_URLS = {
  'https://registry.npmmirror.com/@lobehub/webfont-harmony-sans-sc/latest/files/css/index.css':
    '/fonts/harmony-sans-sc/index.css',
  'https://registry.npmmirror.com/@lobehub/webfont-harmony-sans/latest/files/css/index.css':
    '/fonts/harmony-sans/index.css',
  'https://registry.npmmirror.com/@lobehub/webfont-mono/latest/files/css/index.css':
    '/fonts/webfont-mono.css',
  'https://registry.npmmirror.com/katex/latest/files/dist/katex.min.css':
    '/fonts/katex/katex.min.css',
} as const;

/**
 * Override global fetch to intercept font requests
 */
export function setupFontProxy() {
  if (typeof window === 'undefined') return;

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch function
  window.fetch = async (input: string | URL | Request, init?: any): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : String(input);

    // Check if this is a font URL we want to redirect
    const localUrl = CDN_FONT_URLS[url as keyof typeof CDN_FONT_URLS];

    if (localUrl) {
      console.log(`🔄 Font Proxy: Redirecting ${url} to ${localUrl}`);

      // Create new request to local resource
      return originalFetch(localUrl, init);
    }

    // For font file requests (woff, woff2)
    if (
      url.includes('registry.npmmirror.com') &&
      (url.includes('.woff') || url.includes('.woff2'))
    ) {
      try {
        const urlObj = new URL(url);
        const fileName = urlObj.pathname.split('/').pop();

        // Determine font family from URL
        let localPath = '/fonts/';
        if (url.includes('harmony-sans-sc')) {
          localPath = '/fonts/harmony-sans-sc/';
        } else if (url.includes('harmony-sans')) {
          localPath = '/fonts/harmony-sans/';
        }

        const localFontUrl = localPath + fileName;
        console.log(`🔄 Font Proxy: Redirecting font file ${url} to ${localFontUrl}`);

        return originalFetch(localFontUrl, init);
      } catch (error) {
        console.warn('Font proxy error:', error);
      }
    }

    // For all other requests, use original fetch
    return originalFetch(input, init);
  };

  console.log('✅ Font proxy setup completed');
}

/**
 * Override XMLHttpRequest for libraries that don't use fetch
 */
export function setupXHRProxy() {
  if (typeof window === 'undefined') return;

  const originalXHROpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    let finalUrl = typeof url === 'string' ? url : url.href;

    // Check for font URL redirects
    const localUrl = CDN_FONT_URLS[finalUrl as keyof typeof CDN_FONT_URLS];
    if (localUrl) {
      console.log(`🔄 XHR Proxy: Redirecting ${finalUrl} to ${localUrl}`);
      finalUrl = localUrl;
    }

    // Handle font files
    if (
      finalUrl.includes('registry.npmmirror.com') &&
      (finalUrl.includes('.woff') || finalUrl.includes('.woff2'))
    ) {
      try {
        const urlObj = new URL(finalUrl);
        const fileName = urlObj.pathname.split('/').pop();

        let localPath = '/fonts/';
        if (finalUrl.includes('harmony-sans-sc')) {
          localPath = '/fonts/harmony-sans-sc/';
        } else if (finalUrl.includes('harmony-sans')) {
          localPath = '/fonts/harmony-sans/';
        }

        const localFontUrl = localPath + fileName;
        console.log(`🔄 XHR Proxy: Redirecting font file ${finalUrl} to ${localFontUrl}`);
        finalUrl = localFontUrl;
      } catch (error) {
        console.warn('XHR proxy error:', error);
      }
    }

    return originalXHROpen.call(this, method, finalUrl, async ?? true, username, password);
  };

  console.log('✅ XHR proxy setup completed');
}

/**
 * Initialize all font proxies
 */
export function initializeFontProxies() {
  setupFontProxy();
  setupXHRProxy();
}
