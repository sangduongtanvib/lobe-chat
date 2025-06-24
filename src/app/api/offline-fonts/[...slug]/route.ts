/**
 * API route to serve offline fonts
 * This provides an additional layer to serve local fonts when CDN is not accessible
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug.join('/');
    let filePath: string;

    // Map font requests to local files
    switch (slug) {
      case 'webfont-mono.css': {
        filePath = path.join(process.cwd(), 'public/fonts/webfont-mono.css');
        break;
      }
      case 'harmony-sans.css': {
        filePath = path.join(process.cwd(), 'public/fonts/harmony-sans/index.css');
        break;
      }
      case 'harmony-sans-sc.css': {
        filePath = path.join(process.cwd(), 'public/fonts/harmony-sans-sc/index.css');
        break;
      }
      case 'katex.css': {
        filePath = path.join(process.cwd(), 'public/fonts/katex/katex.min.css');
        break;
      }
      default: {
        return NextResponse.json({ error: 'Font not found' }, { status: 404 });
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Font file not found' }, { status: 404 });
    }

    // Read and serve the file
    const fileContent = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(fileContent, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'text/css',
      },
    });
  } catch (error) {
    console.error('Error serving offline font:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
