# WAF-Friendly Next.js Chunks Solution

## Vấn đề

Next.js tự động tạo ra các URL chunks chứa các ký tự đặc biệt như:

- `%5B` và `%5D` (URL encoded của `[` và `]`)
- `%40` (URL encoded của `@`)
- `()` (dấu ngoặc đơn)

Ví dụ: `_next/static/chunks/src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_bcf54ade._.js`

Các ký tự này thường bị WAF (Web Application Firewall) chặn vì được coi là có khả năng gây hại.

## Giải pháp

### 1. URL Rewrites trong `next.config.ts`

Thêm các rewrites để map các URL WAF-friendly về URL gốc:

```javascript
async rewrites() {
  return [
    // WAF-friendly static chunks
    {
      destination: '/_next/static/chunks/:path*',
      source: '/static/js/:path*',
    },
    {
      destination: '/_next/static/chunks/:path*',
      source: '/nextjs-chunks/:path*',
    },
    // Xử lý pattern cụ thể cho app variants
    {
      destination: '/_next/static/chunks/src_app_v_%5B:variant%5D_\\(main\\)_chat_\\(workspace\\)_%40:conversation_default_tsx_:hash._.js',
      source: '/safe-chunks/app-variant-:variant-conversation-:conversation-:hash.js',
    },
    {
      destination: '/_next/static/chunks/:path*',
      source: '/js-chunks/:path*',
    },
    {
      destination: '/_next/static/chunks/:path*',
      source: '/waf-safe/:path*',
    },
  ];
}
```

### 2. Middleware xử lý request

File `src/middleware.ts` xử lý các request đến WAF-friendly URLs và rewrite về URL gốc.

### 3. Client-side URL Interceptor

Component `WAFChunkInterceptor` inject script để intercept các request từ client và chuyển đổi URLs có ký tự đặc biệt thành WAF-friendly URLs.

### 4. Utility Functions

File `src/utils/waf-chunk-handler.ts` và `src/utils/waf-safe-chunks.ts` chứa các hàm tiện ích để xử lý URL conversion.

## Cách hoạt động

1. **Client Request**: Browser cần load chunk `src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_hash._.js`

2. **URL Transformation**: Client-side script tự động chuyển đổi thành `/safe-chunks/app-variant-variant-conversation-conversation-hash.js`

3. **Middleware Processing**: Middleware nhận request và rewrite về URL gốc

4. **Next.js Serving**: Next.js serve file gốc thông qua rewrite rules

## Các pattern được hỗ trợ

- `%5B` → `_OB_` (Open Bracket)
- `%5D` → `_CB_` (Close Bracket)
- `%40` → `_AT_` (At symbol)
- `(` → `_OP_` (Open Paren)
- `)` → `_CP_` (Close Paren)
- `%` → `_PCT_` (Percent)

## Testing

Để test giải pháp:

1. Deploy ứng dụng với WAF được cấu hình để chặn các ký tự đặc biệt
2. Navigate đến các route chứa dynamic segments
3. Kiểm tra Network tab để thấy URLs được transform
4. Verify rằng chunks được load thành công

## Compatibility

- ✅ Next.js 13+ với App Router
- ✅ Static và Dynamic chunks
- ✅ Client-side navigation
- ✅ Server-side rendering
- ✅ Middleware Edge Runtime
