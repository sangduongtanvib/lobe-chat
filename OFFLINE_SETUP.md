# 🔒 Complete Offline Mode Setup for Lobe Chat

Hướng dẫn này giúp bạn chạy Lobe Chat hoàn toàn offline, không cần kết nối internet cho fonts, CSS và assets.

## 🎯 Các lớp bảo vệ offline đã được triển khai

### 1. **Next.js Middleware Interception**
- File: `src/middleware.ts`
- Chặn và redirect requests đến `registry.npmmirror.com`
- Hoạt động ở server-side level

### 2. **Next.js Rewrites** 
- File: `next.config.ts`
- Cấu hình URL rewrites cho font requests
- Cache headers cho static assets

### 3. **Service Worker Interception**
- File: `public/sw-offline-fonts.js`
- Chặn tất cả network requests ở browser level
- Tự động redirect CDN requests về local files

### 4. **Fetch/XHR Proxy Override**
- File: `src/utils/fontProxy.ts`
- Override global `fetch()` và `XMLHttpRequest`
- Chặn requests từ JavaScript packages

### 5. **API Routes Fallback**
- File: `src/app/api/offline-fonts/[...slug]/route.ts`
- Backup API để serve fonts khi cần

### 6. **Custom Font Configuration**
- Environment variables để force offline mode
- Component overrides cho font loading

## 🚀 Cách sử dụng

### 1. Chạy script setup:
```bash
./scripts/setup-offline-fonts.sh
```

### 2. Hoặc setup thủ công:
```bash
# Tạo thư mục fonts
mkdir -p public/fonts/{harmony-sans,harmony-sans-sc,katex} public/emojis

# Tải fonts và CSS
curl -L "https://registry.npmmirror.com/@lobehub/webfont-mono/latest/files/css/index.css" -o public/fonts/webfont-mono.css

# Cấu hình offline
echo "CDN_USE_GLOBAL=0" >> .env.local
echo "NEXT_PUBLIC_CDN_USE_GLOBAL=0" >> .env.local
echo "CUSTOM_FONT_URL=/fonts/offline-fonts.css" >> .env.local
```

### 3. Chạy ứng dụng:
```bash
npm run dev
```

## 🔍 Kiểm tra offline mode

### Network Tab trong DevTools:
- ✅ Không có requests đến `registry.npmmirror.com`
- ✅ Tất cả fonts load từ `/fonts/`
- ✅ Emojis load từ `/emojis/`

### Console Logs:
```
✅ Font proxy setup completed
✅ XHR proxy setup completed  
✅ Offline font service worker registered
🔄 Font Proxy: Redirecting [CDN_URL] to [LOCAL_URL]
```

## 🛠️ Troubleshooting

### Vẫn có requests ra ngoài:
1. Kiểm tra `.env.local` có `NEXT_PUBLIC_CDN_USE_GLOBAL=0`
2. Clear browser cache và reload
3. Kiểm tra Service Worker trong DevTools > Application

### Fonts không hiển thị:
1. Kiểm tra files exist trong `public/fonts/`
2. Kiểm tra Network tab xem có 404 errors
3. Verify CSS paths đã được fix đúng

### Service Worker không hoạt động:
1. Chỉ hoạt động trên HTTPS hoặc localhost
2. Kiểm tra DevTools > Application > Service Workers
3. Unregister và register lại nếu cần

## 📁 Cấu trúc files

```
public/
├── fonts/
│   ├── offline-fonts.css      # Bundle tất cả fonts
│   ├── webfont-mono.css       # Hack monospace
│   ├── Hack_*.woff*           # Font files
│   ├── harmony-sans/
│   ├── harmony-sans-sc/
│   └── katex/
├── emojis/
│   └── *.webp                 # Animated emojis
└── sw-offline-fonts.js        # Service worker

src/
├── middleware.ts              # Server-side interception
├── utils/fontProxy.ts         # Client-side overrides
├── hooks/useOfflineFontServiceWorker.ts
└── app/api/offline-fonts/     # Fallback API
```

## ⚙️ Environment Variables

```bash
# Required for offline mode
CDN_USE_GLOBAL=0                    # Server-side CDN disable
NEXT_PUBLIC_CDN_USE_GLOBAL=0        # Client-side CDN disable
CUSTOM_FONT_URL=/fonts/offline-fonts.css
CUSTOM_FONT_FAMILY=HarmonyOS Sans
```

## 🔐 Security Notes

- Tất cả fonts được serve từ same-origin
- CORS headers được cấu hình cho cross-origin requests nếu cần
- Service Worker chỉ intercept requests đến known CDNs
- Không override requests đến APIs quan trọng

Với setup này, Lobe Chat sẽ hoạt động hoàn toàn offline mà không cần internet! 🎉
