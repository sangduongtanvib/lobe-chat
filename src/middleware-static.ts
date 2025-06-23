import debug from 'debug';
import { NextRequest, NextResponse } from 'next/server';

const logStatic = debug('lobe-middleware:static');

export const config = {
  matcher: [
    '/_next/static/chunks/:path*',
    '/static/chunks/:path*', // Đảm bảo bắt cả đường dẫn static
  ],
};

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Danh sách các pattern cần xử lý dựa trên báo cáo
  const patterns = [
    '%5Bvariant%5D/(main)/chat/(workspace)/%40portal',
    '%5Bvariant%5D/(main)/chat/%40session',
    '%5Bvariant%5D/(main)/layout',
    '%5Bvariant%5D/(main)/error',
    '%5Bvariant%5D/(main)/chat/not-found',
    '%5Bvariant%5D/(main)/chat/(workspace)/%40topic',
    '%5Bvariant%5D/(main)/chat/layout',
    '%5Bvariant%5D/(main)/chat/error',
    '%5Bvariant%5D/(main)/chat/(workspace)/layout',
    '%5Bvariant%5D/(main)/chat/(workspace)/%40conversation',
    '%5Bvariant%5D/(main)/chat/(workspace)/page',
    '%5Bvariant%5D/(main)/not-found',
  ];

  // Kiểm tra URL có chứa các ký tự đặc biệt hoặc pattern đã biết
  const hasEncodedChars = url.pathname.match(/(%5b|%5d|%28|%29|%40)/i);
  const matchesKnownPattern = patterns.some((pattern) => url.pathname.includes(pattern));

  if (hasEncodedChars || matchesKnownPattern) {
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
      // Special characters
      .replaceAll('%40', 'at-')
      .replaceAll('%2E', 'dot');

    logStatic('Rewriting URL to: %s', newPathname);

    url.pathname = newPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
