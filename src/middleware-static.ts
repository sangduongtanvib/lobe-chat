import debug from 'debug';
import { NextRequest, NextResponse } from 'next/server';

const logStatic = debug('lobe-middleware:static');

export const config = {
  matcher: ['/_next/static/chunks/:path*', '/static/chunks/:path*'],
};

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Kiểm tra URL có chứa các ký tự đặc biệt
  const hasEncodedChars = url.pathname.match(/(%5b|%5d|%28|%29|%40)/i);

  // Nếu URL chứa ký tự đặc biệt, chuyển đổi nó
  if (hasEncodedChars) {
    logStatic('Processing static asset: %s', url.pathname);

    // Giải pháp triệt để: Thay đổi toàn bộ cấu trúc URL của static assets
    // để không còn chứa ký tự đặc biệt
    let newPathname = url.pathname;

    // 1. Xóa bỏ dấu ngoặc vuông và nội dung trong đó
    newPathname = newPathname.replaceAll('/app/v/%5Bvariant%5D/', '/app/variant/');

    // 2. Xử lý các dấu ngoặc đơn
    newPathname = newPathname
      .replaceAll('(%28', '(')
      .replaceAll('%29)', ')')
      .replaceAll('%28', '')
      .replaceAll('%29', '');

    // 3. Xử lý các dấu @ và các ký tự đặc biệt khác
    newPathname = newPathname
      .replaceAll('%40', 'at-')
      .replaceAll('/chat/(workspace)', '/chat/workspace')
      .replaceAll('/main/chat', '/main-chat');

    // 4. Tối ưu hóa định dạng đường dẫn tổng thể
    newPathname = newPathname.replaceAll('/app/v/variant/(main)', '/app/variant/main');

    logStatic('Rewriting static URL: %s -> %s', url.pathname, newPathname);

    url.pathname = newPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
