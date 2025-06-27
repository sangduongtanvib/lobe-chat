import { NextRequest, NextResponse } from 'next/server';

/**
 * WAF-friendly static file handler for middleware (Edge Runtime)
 * This component handles serving WAF-friendly static URLs by mapping them back to original paths
 * Fixed: Added better error handling for self-signed certificate issues
 */
export function handleWAFFriendlyChunks(request: NextRequest): NextResponse | null {
  const url = new URL(request.url);

  // Handle multiple WAF-friendly paths - comprehensive coverage
  const wafFriendlyPaths = [
    { path: '/static/js/', target: '/_next/static/chunks/' },
    { path: '/static/css/', target: '/_next/static/css/' },
    { path: '/static/media/', target: '/_next/static/media/' },
    { path: '/nextjs-static/', target: '/_next/static/' },
    { path: '/nextjs-chunks/', target: '/_next/static/chunks/' },
    { path: '/js-chunks/', target: '/_next/static/chunks/' },
    { path: '/safe-chunks/', target: '/_next/static/chunks/' },
    { path: '/waf-safe/', target: '/_next/static/' },
  ];

  const matchedPath = wafFriendlyPaths.find(({ path }) => url.pathname.startsWith(path));
  if (!matchedPath) {
    return null;
  }

  //console.log('WAF Handler: Processing request for', url.pathname);

  // Extract the filename
  const requestedFile = url.pathname.replace(matchedPath.path, '');

  // Check if this is a WAF-friendly filename being requested (client-side interceptor working)
  if (
    requestedFile.includes('_OB_') ||
    requestedFile.includes('_CB_') ||
    requestedFile.includes('_AT_') ||
    requestedFile.includes('_OP_') ||
    requestedFile.includes('_CP_') ||
    requestedFile.includes('_PCT_') ||
    requestedFile.includes('_DLR_') ||
    requestedFile.includes('_HSH_') ||
    requestedFile.includes('_PLU_') ||
    requestedFile.includes('_AMP_') ||
    requestedFile.includes('_TLD_') ||
    requestedFile.includes('_QST_') ||
    requestedFile.includes('_EQL_') ||
    requestedFile.includes('_SPC_') ||
    requestedFile.includes('_PIP_') ||
    requestedFile.includes('_BSL_') ||
    requestedFile.includes('_QUO_') ||
    requestedFile.includes('_SQU_') ||
    requestedFile.includes('_LT_') ||
    requestedFile.includes('_GT_')
  ) {
    // Convert WAF-friendly back to original filename using comprehensive mapping
    const originalFilename = requestedFile
      .replaceAll('_OB_', '%5B')
      .replaceAll('_CB_', '%5D')
      .replaceAll('_AT_', '%40')
      .replaceAll('_OP_', '(')
      .replaceAll('_CP_', ')')
      .replaceAll('_PCT_', '%')
      .replaceAll('_DLR_', '$')
      .replaceAll('_HSH_', '#')
      .replaceAll('_PLU_', '+')
      .replaceAll('_AMP_', '&')
      .replaceAll('_TLD_', '~')
      .replaceAll('_QST_', '?')
      .replaceAll('_EQL_', '=')
      .replaceAll('_SPC_', ' ')
      .replaceAll('_PIP_', '|')
      .replaceAll('_BSL_', '\\')
      .replaceAll('_QUO_', '"')
      .replaceAll('_SQU_', "'")
      .replaceAll('_LT_', '<')
      .replaceAll('_GT_', '>');

    // Rewrite to the original static path (already properly encoded)
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = `${matchedPath.target}${originalFilename}`;

    //console.log('WAF Handler: Rewriting WAF-safe chunk', url.pathname, '->', rewriteUrl.pathname);
    return NextResponse.rewrite(rewriteUrl);
  }

  // Handle safe-chunks specific pattern for app variant conversation files
  if (matchedPath.path === '/safe-chunks/' && requestedFile.includes('app-variant-')) {
    // Convert safe-chunks/app-variant-{variant}-conversation-{conversation}-{hash}.js
    // to original filename pattern by extracting and reconstructing
    const safePattern = /app-variant-([^-]+)-conversation-([^-]+)-([^.]+)\.js$/;
    const match = requestedFile.match(safePattern);

    if (match) {
      const [, variant, conversation, hash] = match;
      // Reconstruct the original filename pattern
      const originalFilename = `src_app_v_%5B${variant}%5D_(main)_chat_(workspace)_%40${conversation}_default_tsx_${hash}._.js`;

      const rewriteUrl = new URL(request.url);
      rewriteUrl.pathname = `/_next/static/chunks/${originalFilename}`;

      //console.log(
      //'WAF Handler: Rewriting app variant chunk',
      //url.pathname,
      //'->',
      //rewriteUrl.pathname,
      //);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // Handle complex app variant patterns (like app/v/[Variant]/(main)/files/(content)/@menu/default-{hash}/js)
  if (matchedPath.path === '/static/js/' && requestedFile.startsWith('app/v/')) {
    // Pattern: app/v/%5BVariant%5D/(main)/files/(content)/@menu/default-{hash}/js
    // Note: case-insensitive matching for variant names
    const complexPattern =
      /^app\/v\/(%5b[^%]+%5d)\/\(main\)\/([^/]+)\/\(([^)]+)\)\/@([^/]+)\/([^/]+)-([^/]+)\/js$/i;
    const match = requestedFile.match(complexPattern);

    if (match) {
      const [, variantEncoded, section, contentType, menuType, prefix, hash] = match;
      // Convert %5BVariant%5D back to %5Bvariant%5D (lowercase) to match actual chunks
      const variant = variantEncoded.replace('%5B', '').replace('%5D', '').toLowerCase();

      // Reconstruct the original Next.js chunk filename with proper path structure
      // Pattern: app/v/%5B{variant}%5D/(main)/{section}/({contentType})/%40{menuType}/{prefix}-{hash}.js
      const originalFilename = `app/v/%5B${variant}%5D/(main)/${section}/(${contentType})/%40${menuType}/${prefix}-${hash}.js`;

      const rewriteUrl = new URL(request.url);
      rewriteUrl.pathname = `/_next/static/chunks/${originalFilename}`;

      //console.log(
      //'WAF Handler: Rewriting complex app variant pattern',
      //url.pathname,
      //'->',
      //rewriteUrl.pathname,
      //);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // Check if this is a WAF-friendly filename (contains our replacement patterns) - duplicate handling removed
  // This is now handled above for all WAF-friendly patterns

  // For other paths, just map directly to the target
  const rewriteUrl = new URL(request.url);
  rewriteUrl.pathname = `${matchedPath.target}${requestedFile}`;

  //console.log('WAF Handler: Direct mapping', url.pathname, '->', rewriteUrl.pathname);
  return NextResponse.rewrite(rewriteUrl);
}
