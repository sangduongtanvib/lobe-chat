import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import debug from 'debug';
import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

import { authEnv } from '@/config/auth';
import { LOBE_LOCALE_COOKIE } from '@/const/locale';
import { LOBE_THEME_APPEARANCE } from '@/const/theme';
import NextAuthEdge from '@/libs/next-auth/edge';
import { Locales } from '@/locales/resources';
import { parseBrowserLanguage } from '@/utils/locale';
import { parseDefaultThemeFromCountry } from '@/utils/server/geo';
import { RouteVariants } from '@/utils/server/routeVariants';

import { OAUTH_AUTHORIZED } from './const/auth';
import { oidcEnv } from './envs/oidc';

// Create debug logger instances
const logDefault = debug('lobe-middleware:default');
const logNextAuth = debug('lobe-middleware:next-auth');
const logClerk = debug('lobe-middleware:clerk');

// OIDC session pre-sync constant
const OIDC_SESSION_HEADER = 'x-oidc-session-sync';

export const config = {
  matcher: [
    // include any files in the api or trpc folders that might have an extension
    '/(api|trpc|webapi)(.*)',
    // WAF-friendly static file paths (handled by Next.js rewrites + symlinks)  
    '/chunks/(.*)',
    '/styles/(.*)',
    '/media/(.*)',
    // include the /
    '/',
    '/discover',
    '/discover(.*)',
    '/chat',
    '/chat(.*)',
    '/changelog(.*)',
    '/settings(.*)',
    '/files',
    '/files(.*)',
    '/repos(.*)',
    '/profile(.*)',
    '/me',
    '/me(.*)',

    '/login(.*)',
    '/signup(.*)',
    '/next-auth/(.*)',
    '/oauth(.*)',
    '/oidc(.*)',
    // ↓ cloud ↓
  ],
};

// Check if request should skip middleware processing
const shouldSkipMiddleware = (request: NextRequest): boolean => {
  const url = new URL(request.url);
  
  // Skip variant routes to prevent double rewriting
  if (url.pathname.startsWith('/v/') && url.pathname.includes('__')) {
    return true;
  }

  // Skip API endpoints
  const backendApiEndpoints = ['/api', '/trpc', '/webapi', '/oidc'];
  if (backendApiEndpoints.some((path) => url.pathname.startsWith(path))) {
    return true;
  }

  // Skip auth routes
  if (
    url.pathname.startsWith('/next-auth') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/signup')
  ) {
    return true;
  }

  return false;
};

const defaultMiddleware = (request: NextRequest) => {
  const url = new URL(request.url);
  logDefault('Processing request: %s %s', request.method, request.url);

  // Check if we should skip middleware
  if (shouldSkipMiddleware(request)) {
    logDefault('Skipping middleware for: %s', url.pathname);
    return NextResponse.next();
  }

  // Intercept CDN font requests and redirect to local fonts
  if (url.hostname === 'registry.npmmirror.com') {
    const pathname = url.pathname;
    const newUrl = new URL(url);

    // Redirect webfont-mono requests
    if (pathname.includes('@lobehub/webfont-mono') && pathname.endsWith('/css/index.css')) {
      newUrl.hostname = request.headers.get('host') || 'localhost';
      newUrl.pathname = '/fonts/webfont-mono.css';
      newUrl.port = '';
      return NextResponse.redirect(newUrl);
    }

    // Redirect harmony-sans requests
    if (pathname.includes('@lobehub/webfont-harmony-sans') && pathname.endsWith('/css/index.css')) {
      newUrl.hostname = request.headers.get('host') || 'localhost';
      if (pathname.includes('harmony-sans-sc')) {
        newUrl.pathname = '/fonts/harmony-sans-sc/index.css';
      } else {
        newUrl.pathname = '/fonts/harmony-sans/index.css';
      }
      newUrl.port = '';
      return NextResponse.redirect(newUrl);
    }

    // Redirect KaTeX requests
    if (pathname.includes('katex') && pathname.endsWith('/katex.min.css')) {
      newUrl.hostname = request.headers.get('host') || 'localhost';
      newUrl.pathname = '/fonts/katex/katex.min.css';
      newUrl.port = '';
      return NextResponse.redirect(newUrl);
    }

    // Redirect emoji requests
    if (pathname.includes('@lobehub/fluent-emoji-anim') && pathname.includes('/assets/')) {
      const emojiFile = pathname.split('/assets/')[1];
      newUrl.hostname = request.headers.get('host') || 'localhost';
      newUrl.pathname = `/emojis/${emojiFile}`;
      newUrl.port = '';
      return NextResponse.redirect(newUrl);
    }
  }

  // 1. Read user preferences from cookies
  const theme =
    request.cookies.get(LOBE_THEME_APPEARANCE)?.value || parseDefaultThemeFromCountry(request);

  // if it's a new user, there's no cookie
  // So we need to use the fallback language parsed by accept-language
  const browserLanguage = parseBrowserLanguage(request.headers);
  const locale = (request.cookies.get(LOBE_LOCALE_COOKIE)?.value || browserLanguage) as Locales;

  const ua = request.headers.get('user-agent');

  const device = new UAParser(ua || '').getDevice();

  logDefault('User preferences: %O', {
    browserLanguage,
    deviceType: device.type,
    hasCookies: {
      locale: !!request.cookies.get(LOBE_LOCALE_COOKIE)?.value,
      theme: !!request.cookies.get(LOBE_THEME_APPEARANCE)?.value,
    },
    locale,
    theme,
  });

  // 2. Create normalized preference values
  const route = RouteVariants.serializeVariants({
    isMobile: device.type === 'mobile',
    locale,
    theme,
  });

  logDefault('Serialized route variant: %s', route);

  // refs: https://github.com/lobehub/lobe-chat/pull/5866
  // new handle segment rewrite: /v/${route}${originalPathname}
  // / -> /v/en-US__0__dark
  // /discover -> /v/en-US__0__dark/discover
  const nextPathname = `/v/${route}` + (url.pathname === '/' ? '' : url.pathname);

  logDefault('URL rewrite: %O', {
    nextPathname: nextPathname,
    originalPathname: url.pathname,
  });

  // Simple rewrite without complex logic
  url.pathname = nextPathname;
  return NextResponse.rewrite(url);
};

// Thay đổi isProtectedRoute để bảo vệ tất cả các routes, không chỉ các routes được liệt kê
const isProtectedRoute = createRouteMatcher([
  '/',
  '/discover(.*)',
  '/chat(.*)',
  '/settings(.*)',
  '/files(.*)',
  '/onboard(.*)',
  '/oauth(.*)',
  '/changelog(.*)',
  '/profile(.*)',
  '/me(.*)',
  // ↓ cloud ↓
]);

// Initialize an Edge compatible NextAuth middleware
const nextAuthMiddleware = NextAuthEdge.auth((req) => {
  logNextAuth('NextAuth middleware processing request: %s %s', req.method, req.url);

  const response = defaultMiddleware(req);

  const isProtected = isProtectedRoute(req);
  logNextAuth('Route protection status: %s, %s', req.url, isProtected ? 'protected' : 'public');

  // Just check if session exists
  const session = req.auth;

  // Check if next-auth throws errors
  // refs: https://github.com/lobehub/lobe-chat/pull/1323
  const isLoggedIn = !!session?.expires;

  logNextAuth('NextAuth session status: %O', {
    expires: session?.expires,
    isLoggedIn,
    userId: session?.user?.id,
  });

  // Remove & amend OAuth authorized header
  response.headers.delete(OAUTH_AUTHORIZED);
  if (isLoggedIn) {
    logNextAuth('Setting auth header: %s = %s', OAUTH_AUTHORIZED, 'true');
    response.headers.set(OAUTH_AUTHORIZED, 'true');

    // If OIDC is enabled and user is logged in, add OIDC session pre-sync header
    if (oidcEnv.ENABLE_OIDC && session?.user?.id) {
      logNextAuth('OIDC session pre-sync: Setting %s = %s', OIDC_SESSION_HEADER, session.user.id);
      response.headers.set(OIDC_SESSION_HEADER, session.user.id);
    }
  } else {
    // If not logged in, redirect to sign-in page for all routes except login pages
    if (
      isProtected &&
      !req.nextUrl.pathname.startsWith('/login') &&
      !req.nextUrl.pathname.startsWith('/next-auth/signin')
    ) {
      logNextAuth('User not logged in, redirecting to sign-in page');
      const nextLoginUrl = new URL('/next-auth/signin', req.nextUrl.origin);
      nextLoginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return Response.redirect(nextLoginUrl);
    }
    logNextAuth('Request a free route or login page, allowing visit without auth header');
  }

  return response;
});

// Clerk middleware
const clerkMiddlewareHandler = clerkMiddleware((auth, req) => {
  logClerk('Clerk middleware processing request: %s %s', req.method, req.url);

  const response = defaultMiddleware(req);

  const isProtected = isProtectedRoute(req);
  logClerk('Route protection status: %s, %s', req.url, isProtected ? 'protected' : 'public');

  // Remove & amend OAuth authorized header
  response.headers.delete(OAUTH_AUTHORIZED);

  // Check if user is authenticated with Clerk
  if (auth && Object.keys(auth).length > 0) {
    logClerk('Setting auth header: %s = %s', OAUTH_AUTHORIZED, 'true');
    response.headers.set(OAUTH_AUTHORIZED, 'true');
  } else {
    // If not logged in, redirect to sign-in page for all routes except login pages
    if (
      isProtected &&
      !req.nextUrl.pathname.startsWith('/login') &&
      !req.nextUrl.pathname.startsWith('/signup')
    ) {
      logClerk('User not logged in, redirecting to sign-in page');
      return Response.redirect(new URL('/login', req.nextUrl.origin));
    }
    logClerk('Request a free route or login page, allowing visit without auth header');
  }

  return response;
});

// Export the appropriate middleware based on auth configuration
export default authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH
  ? clerkMiddlewareHandler
  : authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH
  ? nextAuthMiddleware
  : defaultMiddleware;
