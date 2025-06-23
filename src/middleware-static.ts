import debug from 'debug';
import { NextRequest, NextResponse } from 'next/server';

const logStatic = debug('lobe-middleware:static');

export const config = {
  matcher: ['/_next/static/chunks/:path*'],
};

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Kiểm tra URL có chứa các ký tự đặc biệt
  if (/(%5b|%5d|%28|%29)/i.test(url.pathname)) {
    logStatic('Processing static asset with encoded brackets: %s', url.pathname);

    // Thay thế tất cả các pattern đặc biệt trong URL
    let newPathname = url.pathname
      // Dynamic routes
      .replaceAll('%5Bvariant%5D', 'variant')
      .replaceAll('%5Bvariants%5D', 'variants')
      .replaceAll('%5Bprovider%5D', 'provider')
      .replaceAll('%5Bslug%5D', 'slug')
      .replaceAll('%5Bid%5D', 'id')
      .replaceAll('%5Bimage%5D', 'image')
      .replaceAll('%5B...slugs%5D', 'slugs')
      .replaceAll('%5Buid%5D', 'uid')
      // Parentheses
      .replaceAll('%28', 'open-')
      .replaceAll('%29', '-close')
      // Periods
      .replaceAll('%2E', 'dot');

    logStatic('Rewriting URL to: %s', newPathname);

    url.pathname = newPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
