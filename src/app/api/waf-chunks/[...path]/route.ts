import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * API route to serve WAF-friendly static chunks
 * Route: /api/waf-chunks/[...path]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const filename = pathSegments.join('/');

    let originalFilename;
    let staticPath;

    // Handle app router variant chunks
    if (filename.startsWith('app-variant-')) {
      const appChunkName = filename.replace('app-variant-', '');
      originalFilename = appChunkName;
      staticPath = path.join(
        process.cwd(),
        '.next',
        'static',
        'chunks',
        'app',
        'v',
        '%5Bvariant%5D',
        originalFilename,
      );
    } else {
      // Convert WAF-friendly filename back to original
      originalFilename = filename
        .replaceAll('_OB_', '%5B')
        .replaceAll('_CB_', '%5D')
        .replaceAll('_AT_', '%40')
        .replaceAll('_OP_', '(')
        .replaceAll('_CP_', ')')
        .replaceAll('_PCT_', '%');

      staticPath = path.join(process.cwd(), '.next', 'static', 'chunks', originalFilename);
    }

    console.log('WAF API: Serving chunk:', filename, '->', originalFilename);

    if (fs.existsSync(staticPath)) {
      const fileContent = fs.readFileSync(staticPath);

      return new NextResponse(fileContent, {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': 'application/javascript',
        },
      });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('WAF API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
