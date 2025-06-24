# WAF-Friendly Next.js Solution

Giải pháp hoàn chỉnh để xử lý vấn đề WAF chặn Next.js chunks chứa ký tự đặc biệt.

## Vấn đề gốc

URL Next.js chunks chứa ký tự đặc biệt bị WAF chặn:

```
/_next/static/chunks/src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_bcf54ade._.js
```

## Giải pháp triển khai

### 1. **URL Rewrites** (`next.config.ts`)

```typescript
async rewrites() {
  return [
    {
      destination: '/_next/static/chunks/:path*',
      source: '/static/js/:path*',
    },
    // ... other rewrites
  ];
}
```

### 2. **Middleware Processing** (`src/middleware.ts`)

- Xử lý WAF-friendly URLs trong real-time
- Serve files từ public directory hoặc rewrite to original chunks
- Tích hợp với existing auth middleware

### 3. **Post-build Script** (`scripts/apply-waf-patches.sh`)

- Tự động tạo WAF-friendly copies của problematic chunks
- Cập nhật HTML references
- Tạo mapping files

### 4. **Runtime Handlers** (`src/utils/waf-chunk-handler.ts`)

- Utility functions để serve WAF-friendly files
- Mapping logic between original và WAF-friendly names
- Error handling và fallbacks

### 5. **API Endpoint** (`src/app/api/chunk-mappings/route.ts`)

- REST API để access chunk mappings
- JSON response với mapping data
- Caching headers

## Character Mapping

| Original | WAF-Friendly | Mô tả             |
| -------- | ------------ | ----------------- |
| `%5B`    | `_OB_`       | Open Bracket `[`  |
| `%5D`    | `_CB_`       | Close Bracket `]` |
| `%40`    | `_AT_`       | At symbol `@`     |
| `(`      | `_OP_`       | Open Parenthesis  |
| `)`      | `_CP_`       | Close Parenthesis |

## Cách sử dụng

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Testing

```bash
./scripts/test-waf-solution.sh
```

## Files được tạo

```
public/
  static/
    js/                     # WAF-friendly chunk copies
      [waf-friendly-names].js
    chunk-mappings.json     # Runtime mapping file

.next/
  **/*.backup              # Backup của modified files
```

## URLs

### Original (bị WAF chặn)

```
/_next/static/chunks/src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_bcf54ade._.js
```

### WAF-Friendly (không bị chặn)

```
/static/js/src_app_v__OB_variant_CB___OP_main_CP__chat__OP_workspace_CP___AT_conversation_default_tsx_bcf54ade._.js
```

## Kiểm tra hoạt động

1. **Build thành công**: Không có webpack conflicts
2. **Files được tạo**: `public/static/js/` chứa WAF-friendly copies
3. **Mappings**: `/api/chunk-mappings` trả về valid JSON
4. **URLs accessible**: WAF-friendly URLs serve correct content
5. **No 404s**: Original functionality vẫn hoạt động

## Troubleshooting

### Build Errors

- Revert webpack config về default
- WAF handling được thực hiện post-build

### Missing Files

- Kiểm tra `apply-waf-patches.sh` execution
- Verify script permissions
- Check for problematic chunks in build

### WAF vẫn chặn

- Review WAF configuration
- Test với curl để isolate issue
- Xem xét additional character replacements

## Integration với existing system

- ✅ Compatible với existing auth middleware
- ✅ Không thay đổi Next.js routing logic
- ✅ Backward compatible với existing URLs
- ✅ No performance impact on non-problematic chunks
- ✅ Automatic build integration

## Monitoring

Monitor những metrics này:

- Build script success rate
- 404 errors for `/static/js/*` paths
- WAF block logs cho Next.js requests
- API endpoint availability
- Chunk mapping accuracy

## Security

- WAF-friendly URLs không thay đổi file content
- Original security measures vẫn có hiệu lực
- Additional public files cần monitor disk usage
- Consider cleanup strategy cho old chunks

---

**Tác giả**: GitHub Copilot\
**Ngày**: June 24, 2025\
**Version**: 1.0.0
