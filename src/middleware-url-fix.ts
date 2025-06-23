import { NextRequest, NextResponse } from 'next/server';

export function urlEncodingMiddleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Handle URL encoded special characters in chunks and static files
  if (
    url.pathname.includes('%5B') ||
    url.pathname.includes('%5D') ||
    url.pathname.includes('%40')
  ) {
    // Decode the URL to handle encoded brackets and @ symbols
    const decodedPath = decodeURIComponent(url.pathname);

    // Check if this is a Next.js chunk or static file request
    if (
      decodedPath.includes('/_next/static/') ||
      decodedPath.includes('/chunks/') ||
      decodedPath.includes('.js') ||
      decodedPath.includes('.css')
    ) {
      url.pathname = decodedPath;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// Helper function to normalize URLs with special characters
export function normalizeStaticUrl(pathname: string): string {
  // Handle common Next.js App Router patterns
  const patterns = [
    { pattern: /%5B([^%5D]+)%5D/g, replacement: '[$1]' }, // [dynamic]
    { pattern: /%40([^/]+)/g, replacement: '@$1' }, // @parallel
    { pattern: /\(([^)]+)\)/g, replacement: '($1)' }, // (groups)
  ];

  let normalized = pathname;
  patterns.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized;
}
