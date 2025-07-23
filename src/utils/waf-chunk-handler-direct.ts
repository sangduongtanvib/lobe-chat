import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

function getContentType(filename: string): string {
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.css')) return 'text/css';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  if (filename.endsWith('.woff')) return 'font/woff';
  if (filename.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

/**
 * Direct WAF-friendly static file handler for Docker environments
 * Serves files directly without internal rewrites to avoid SSL issues
 */
export function handleWAFFriendlyChunksDirect(request: NextRequest): NextResponse | null {
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

  console.log('WAF Direct Handler: Processing request for', url.pathname);

  // Extract the filename
  const requestedFile = url.pathname.replace(matchedPath.path, '');

  // Convert WAF-friendly back to original filename
  let originalFilename = requestedFile;
  
  if (
    requestedFile.includes('_OB_') ||
    requestedFile.includes('_CB_') ||
    requestedFile.includes('_AT_') ||
    requestedFile.includes('_OP_') ||
    requestedFile.includes('_CP_') ||
    requestedFile.includes('_PCT_')
  ) {
    originalFilename = requestedFile
      .replaceAll('_OB_', '%5B')
      .replaceAll('_CB_', '%5D')
      .replaceAll('_AT_', '%40')
      .replaceAll('_OP_', '(')
      .replaceAll('_CP_', ')')
      .replaceAll('_PCT_', '%');
  }

  // Handle safe-chunks specific pattern
  if (matchedPath.path === '/safe-chunks/' && requestedFile.includes('app-variant-')) {
    const safePattern = /app-variant-([^-]+)-conversation-([^-]+)-([^.]+)\.js$/;
    const match = requestedFile.match(safePattern);

    if (match) {
      const [, variant, conversation, hash] = match;
      originalFilename = `src_app_v_%5B${variant}%5D_(main)_chat_(workspace)_%40${conversation}_default_tsx_${hash}._.js`;
    }
  }

  // Try to serve file directly from filesystem
  try {
    const filePath = path.join(process.cwd(), '.next', 'static', matchedPath.target.replace('/_next/static/', ''), originalFilename);
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      const contentType = getContentType(originalFilename);
      
      console.log('WAF Direct Handler: Serving file directly', filePath);
      
      return new NextResponse(fileContent, {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': contentType,
          'X-Original-URL': url.pathname,
          'X-Served-File': originalFilename,
          'X-WAF-Handler': 'direct'
        },
        status: 200
      });
    } else {
      console.log('WAF Direct Handler: File not found', filePath);
    }
  } catch (error) {
    console.error('WAF Direct Handler: Error serving file:', error);
  }

  // Fallback: use redirect instead of rewrite
  const fallbackUrl = new URL(request.url);
  fallbackUrl.pathname = `${matchedPath.target}${originalFilename}`;
  
  console.log('WAF Direct Handler: Fallback redirect', url.pathname, '->', fallbackUrl.pathname);
  
  return NextResponse.redirect(fallbackUrl, 302);
} 