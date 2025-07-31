/**
 * Service Worker for WAF URL Transformation
 * Intercepts ALL network requests and transforms URLs with special characters
 */

// WAF URL mapping - MUST MATCH MIDDLEWARE EXACTLY
// Using same mapping as middleware for consistency
const WAF_URL_MAPPING = {
  '%40': '_at_', // @ -> _at_ (matches middleware)
  '%5B': '_ob_', // [ -> _ob_ (matches middleware)
  '%5D': '_cb_', // ] -> _cb_ (matches middleware)  
  '%28': '_op_', // ( -> _op_ (matches middleware)
  '%29': '_cp_', // ) -> _cp_ (matches middleware)
  // Raw characters (unencoded) - same as middleware
  '@': '_at_',   // Direct @ -> _at_
  '[': '_ob_',   // Direct [ -> _ob_
  ']': '_cb_',   // Direct ] -> _cb_
  '(': '_op_',   // Direct ( -> _op_  
  ')': '_cp_'    // Direct ) -> _cp_
};

/**
 * Determine if URL should be transformed
 */
function shouldTransformUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Only transform requests to same origin
    if (urlObj.origin !== location.origin) {
      return false;
    }
    
    // Transform these paths:
    return (
      urlObj.pathname.startsWith('/_next/static/') ||       // NextJS static assets
      urlObj.pathname.startsWith('/_next/image/') ||        // NextJS optimized images
      urlObj.pathname.startsWith('/api/') ||                // API routes
      urlObj.pathname.startsWith('/webapi/') ||             // Web API routes
      urlObj.pathname.startsWith('/trpc/') ||               // TRPC routes
      urlObj.pathname.startsWith('/images/') ||             // Static images
      urlObj.pathname.startsWith('/icons/') ||              // Static icons
      urlObj.pathname.startsWith('/videos/') ||             // Static videos
      urlObj.pathname.startsWith('/fonts/') ||              // Font files
      urlObj.pathname.match(/\.(js|css|json|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)(\?.*)?$/) // File extensions
    );
  } catch (e) {
    return false;
  }
}

/**
 * Transform URL to be WAF-safe
 */
function transformUrlForWAF(url) {
  if (!shouldTransformUrl(url)) {
    return url;
  }
  
  let transformedUrl = url;
  
  // Apply all transformations
  for (const [unsafe, safe] of Object.entries(WAF_URL_MAPPING)) {
    transformedUrl = transformedUrl.replaceAll(unsafe, safe);
  }
  
  if (transformedUrl !== url) {
    console.log(`🔄 SW Transform: ${url} -> ${transformedUrl}`);
  }
  
  return transformedUrl;
}

/**
 * Service Worker Install Event
 */
self.addEventListener('install', (event) => {
  console.log('🛡️ WAF Service Worker installed');
  self.skipWaiting(); // Force activate immediately
});

/**
 * Service Worker Activate Event
 */
self.addEventListener('activate', (event) => {
  console.log('🛡️ WAF Service Worker activated');
  event.waitUntil(self.clients.claim()); // Take control immediately
});

/**
 * Intercept Fetch Requests
 */
self.addEventListener('fetch', (event) => {
  const originalUrl = event.request.url;
  const transformedUrl = transformUrlForWAF(originalUrl);
  
  // If URL was transformed, create new request
  if (transformedUrl !== originalUrl) {
    console.log(`🌐 SW Intercepting request: ${event.request.method} ${originalUrl}`);
    console.log(`🔄 SW Transforming to: ${transformedUrl}`);
    
    // Create new request with proper options
    let requestOptions = {
      method: event.request.method,
      headers: event.request.headers,
      mode: event.request.mode === 'navigate' ? 'same-origin' : event.request.mode,
      credentials: event.request.credentials,
      cache: event.request.cache,
      redirect: event.request.redirect,
      referrer: event.request.referrer,
    };
    
    // Only include body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(event.request.method.toUpperCase())) {
      requestOptions.body = event.request.body;
    }
    
    const newRequest = new Request(transformedUrl, requestOptions);
    
    event.respondWith(
      fetch(newRequest)
        .then(response => {
          console.log(`✅ SW Request successful: ${response.status} ${transformedUrl}`);
          return response;
        })
        .catch(error => {
          console.error(`❌ SW Request failed for transformed URL: ${transformedUrl}`, error);
          console.warn(`🔄 SW Fallback: Trying original URL: ${originalUrl}`);
          // Fallback to original request if transformed request fails
          return fetch(event.request).catch(fallbackError => {
            console.error(`❌ SW Fallback also failed: ${originalUrl}`, fallbackError);
            throw fallbackError;
          });
        })
    );
  } else {
    // For non-transformed requests, still log if they're to same origin
    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.origin === location.origin) {
        console.log(`➡️ SW Passthrough: ${event.request.method} ${originalUrl}`);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
}); 