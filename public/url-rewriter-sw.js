// Service Worker để rewrite URL có ký tự đặc biệt
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Chỉ xử lý request đến chunk files có ký tự đặc biệt
  if (url.includes('/_next/static/chunks/app/') && 
      (url.includes('%5B') || url.includes('%40') || url.includes('%28'))) {
    
    console.log('🔄 Original URL:', url);
    
    // Decode URL để chuyển từ %5B thành [, %40 thành @
    const decodedUrl = decodeURIComponent(url);
    console.log('✅ Decoded URL:', decodedUrl);
    
    // Tạo request mới với URL đã decode
    const newRequest = new Request(decodedUrl, {
      method: event.request.method,
      headers: event.request.headers,
      body: event.request.body,
      mode: event.request.mode,
      credentials: event.request.credentials,
      cache: event.request.cache,
      redirect: event.request.redirect,
      referrer: event.request.referrer,
      integrity: event.request.integrity
    });
    
    // Respond với request đã được rewrite
    event.respondWith(fetch(newRequest));
  }
  // Cho phép tất cả request khác đi qua bình thường
}); 