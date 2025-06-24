import { NextRequest, NextResponse } from 'next/server';

/**
 * WAF-friendly static file handler for middleware (Edge Runtime)
 * This component handles serving WAF-friendly static URLs by mapping them back to original paths
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

  // Extract the filename
  const requestedFile = url.pathname.replace(matchedPath.path, '');

  // Check if this is a WAF-friendly filename being requested (client-side interceptor working)
  if (
    requestedFile.includes('_OB_') ||
    requestedFile.includes('_CB_') ||
    requestedFile.includes('_AT_') ||
    requestedFile.includes('_OP_') ||
    requestedFile.includes('_CP_') ||
    requestedFile.includes('_PCT_')
  ) {
    // Convert WAF-friendly back to original filename
    const originalFilename = requestedFile
      .replaceAll('_OB_', '%5B')
      .replaceAll('_CB_', '%5D')
      .replaceAll('_AT_', '%40')
      .replaceAll('_OP_', '(')
      .replaceAll('_CP_', ')')
      .replaceAll('_PCT_', '%');

    // Rewrite to the original static path
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = `${matchedPath.target}${originalFilename}`;

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

      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // Check if this is a WAF-friendly filename (contains our replacement patterns) - duplicate handling removed
  // This is now handled above for all WAF-friendly patterns

  // For other paths, just map directly to the target
  const rewriteUrl = new URL(request.url);
  rewriteUrl.pathname = `${matchedPath.target}${requestedFile}`;

  return NextResponse.rewrite(rewriteUrl);
}
