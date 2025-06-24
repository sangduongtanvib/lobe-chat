# WAF-Friendly URL Solution for Next.js

## Problem

WAF (Web Application Firewall) systems often block URLs containing certain characters that are common in Next.js chunk filenames:

- `%5B` and `%5D` (URL-encoded `[` and `]` from dynamic routes)
- `%40` (URL-encoded `@` from parallel routes)
- `(` and `)` (from route groups)

Example problematic URL:

```
/_next/static/chunks/src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_bcf54ade._.js
```

## Solution Overview

Our solution provides multiple layers of WAF-friendly URL handling:

### 1. URL Rewrites (next.config.ts)

- Maps clean URLs `/static/js/*` to original `/_next/static/chunks/*`
- Allows clients to request WAF-friendly URLs

### 2. Middleware Processing

- Handles WAF-friendly URL translation in real-time
- Serves files directly when available in public directory
- Falls back to rewriting to original chunk paths

### 3. Post-Build Processing

- Script automatically creates WAF-friendly copies of problematic chunks
- Updates HTML references to use clean URLs
- Creates mapping files for runtime reference

### 4. Runtime Handlers

- API endpoint for chunk mappings
- Utility functions for file serving
- Fallback mechanisms for missing files

## WAF-Friendly Character Mapping

| Original | WAF-Friendly | Description   |
| -------- | ------------ | ------------- |
| `%5B`    | `_OB_`       | Open Bracket  |
| `%5D`    | `_CB_`       | Close Bracket |
| `%40`    | `_AT_`       | At symbol     |
| `(`      | `_OP_`       | Open Paren    |
| `)`      | `_CP_`       | Close Paren   |

## Example Transformation

**Original URL:**

```
/_next/static/chunks/src_app_v_%5Bvariant%5D_(main)_chat_(workspace)_%40conversation_default_tsx_bcf54ade._.js
```

**WAF-Friendly URL:**

```
/static/js/src_app_v__OB_variant_CB___OP_main_CP__chat__OP_workspace_CP___AT_conversation_default_tsx_bcf54ade._.js
```

## Implementation Files

### Core Files

- `next.config.ts` - URL rewrites configuration
- `src/middleware.ts` - Runtime URL handling
- `scripts/apply-waf-patches.sh` - Post-build processing
- `src/utils/waf-chunk-handler.ts` - File serving utilities

### API Routes

- `src/app/api/chunk-mappings/route.ts` - Chunk mapping endpoint

### Build Integration

- `package.json` - Automated script integration
- `public/static/js/` - WAF-friendly file copies
- `public/static/chunk-mappings.json` - Runtime mapping file

## Usage

### Development

```bash
npm run dev
```

WAF-friendly URLs work automatically via middleware.

### Production Build

```bash
npm run build
```

The build process automatically:

1. Builds the Next.js application
2. Runs post-build WAF patches
3. Creates WAF-friendly file copies
4. Updates HTML references

### Manual Testing

You can test WAF-friendly URLs directly:

```bash
curl http://localhost:3000/static/js/[waf-friendly-filename].js
```

## Nginx Configuration (Optional)

If using nginx as a reverse proxy, you can add these rules:

```nginx
# Handle WAF-friendly chunk requests
location ~* ^/static/js/(.+)\.js$ {
    try_files /static/js/$1.js /_next/static/chunks/$1.js =404;
}
```

## Troubleshooting

### Build Issues

If you encounter chunk naming conflicts:

1. The webpack configuration has been reverted to default
2. WAF-friendly handling is done post-build via scripts
3. No changes to Next.js chunk generation logic

### Missing Files

If WAF-friendly URLs return 404:

1. Check that `scripts/apply-waf-patches.sh` ran successfully
2. Verify files exist in `public/static/js/`
3. Check chunk mappings at `/api/chunk-mappings`

### WAF Still Blocking

If URLs are still blocked:

1. Verify your WAF configuration
2. Test with curl to isolate the issue
3. Check server logs for specific blocked patterns
4. Consider additional character replacements if needed

## Monitoring

Monitor these metrics:

- 404 errors for `/static/js/*` paths
- WAF block logs for Next.js chunk requests
- Build script execution success
- Chunk mapping API availability

## Security Considerations

- WAF-friendly URLs don't change the actual file content
- Original security measures remain in place
- Additional public files created in `public/static/js/`
- Consider cleanup of old chunk files during deployment
