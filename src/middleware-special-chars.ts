// src/middleware.ts - Middleware để encode special characters trong response
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import debug from 'debug';
import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';
import urlJoin from 'url-join';

import { authEnv } from '@/config/auth';
import { LOBE_LOCALE_COOKIE } from '@/const/locale';
import { LOBE_THEME_APPEARANCE } from '@/const/theme';
import { appEnv } from '@/envs/app';
import NextAuthEdge from '@/libs/next-auth/edge';
import { Locales } from '@/locales/resources';
import { parseBrowserLanguage } from '@/utils/locale';
import { parseDefaultThemeFromCountry } from '@/utils/server/geo';
import { RouteVariants } from '@/utils/server/routeVariants';

import { OAUTH_AUTHORIZED } from './const/auth';
import { oidcEnv } from './envs/oidc';

// Create debug logger instances
const logDefault = debug('middleware:default');
const logNextAuth = debug('middleware:next-auth');
const logClerk = debug('middleware:clerk');
const logSpecialChars = debug('middleware:special-chars'); // 🆕

// OIDC session pre-sync constant
const OIDC_SESSION_HEADER = 'x-oidc-session-sync';



// Character encoding map  
const CHAR_ENCODE_MAP = {
  '[': 'vo',
  ']': 'vc', 
  '(': 'to',
  ')': 'tc',
  '@': 'ac'
} as const;

// Character decoding map (reverse)
const CHAR_DECODE_MAP = {
  'vo': '[',
  'vc': ']',
  'to': '(',
  'tc': ')',
  'ac': '@'
} as const;

/**
 * Encode special characters in text
 */
function encodeSpecialChars(text: string): string {
  let encodedText = text;
  for (const [char, replacement] of Object.entries(CHAR_ENCODE_MAP)) {
    encodedText = encodedText.replaceAll(char, replacement);
  }
  return encodedText;
}

/**
 * Decode special characters back to original
 */
function decodeSpecialChars(text: string): string {
  let decodedText = text;
  for (const [encoded, char] of Object.entries(CHAR_DECODE_MAP)) {
    decodedText = decodedText.replaceAll(encoded, char);
  }
  return decodedText;
}

/**
 * Handle special characters encoding/decoding for static files
 */
const handleSpecialCharsRewrite = (request: NextRequest): NextResponse | null => {
  const url = request.nextUrl.clone();
  
  // Only handle static files
  if (!url.pathname.startsWith('/_next/static/')) {
    return null;
  }
  
  // Check if URL contains encoded special characters (from client)
  const hasEncodedChars = Object.keys(CHAR_DECODE_MAP).some(encoded => 
    url.pathname.includes(encoded)
  );
  
  if (hasEncodedChars) {
    // Decode for server request
    const decodedPath = decodeSpecialChars(url.pathname);
    
    logSpecialChars('🔄 Decoding static file: %s → %s', url.pathname, decodedPath);
    
    url.pathname = decodedPath;
    const response = NextResponse.rewrite(url);
    
    // Add debug headers
    response.headers.set('X-Special-Chars-Decoded', 'true');
    response.headers.set('X-Original-Path', request.nextUrl.pathname);
    response.headers.set('X-Decoded-Path', decodedPath);
    
    return response;
  }
  
  return null;
};

/**
 * Transform response content to encode special characters
 */
async function transformResponseContent(response: NextResponse, request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = response.headers.get('content-type') || '';
    
    // Only modify text responses (HTML, JSON, JS)
    if (!contentType.includes('text/') && 
        !contentType.includes('application/json') && 
        !contentType.includes('application/javascript')) {
      return response;
    }
    
    // Read response body
    const originalText = await response.text();
    
    // Check if content has special characters in static file paths
    const hasSpecialChars = Object.keys(CHAR_ENCODE_MAP).some(char => 
      originalText.includes(`/_next/static/`) && originalText.includes(char)
    );
    
    if (!hasSpecialChars) {
      // No special chars to encode, return original
      return new NextResponse(originalText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    
    // Encode special characters in static file paths only
    let modifiedText = originalText;
    
    // Use regex to find and encode static file paths
    modifiedText = modifiedText.replace(
      /(["'])(.*?\/_next\/static\/[^"']*)(["'])/g,
      (match, quote1, path, quote2) => {
        const encodedPath = encodeSpecialChars(path);
        if (encodedPath !== path) {
          logSpecialChars('✨ Encoding in response: %s → %s', path, encodedPath);
        }
        return quote1 + encodedPath + quote2;
      }
    );
    
    // Also handle unquoted paths in JSON
    modifiedText = modifiedText.replace(
      /(\/_next\/static\/[^\s,"'\[\]{}]+)/g,
      (match, path) => {
        const encodedPath = encodeSpecialChars(path);
        if (encodedPath !== path) {
          logSpecialChars('✨ Encoding JSON path: %s → %s', path, encodedPath);
        }
        return encodedPath;
      }
    );
    
    // Create new response with modified content
    const newResponse = new NextResponse(modifiedText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // Add debug header if content was modified
    if (modifiedText !== originalText) {
      newResponse.headers.set('X-Special-Chars-Encoded', 'true');
      logSpecialChars('📝 Response content encoded for: %s', request.url);
    }
    
    return newResponse;
    
  } catch (error) {
    console.error('❌ Error transforming response:', error);
    return response;
  }
}

export const config = {
  matcher: [
    // include any files in the api or trpc folders that might have an extension
    '/(api|trpc|webapi)(.*)',
    // include the /
    '/',
    '/discover',
    '/discover(.*)',
    '/chat',
    '/chat(.*)',
    '/changelog(.*)',
    '/settings(.*)',
    '/image',
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
    // 🆕 Include static files for special chars handling
    '/_next/static/:path*',
    // ↓ cloud ↓
  ],
};

const backendApiEndpoints = ['/api', '/trpc', '/webapi', '/oidc'];

const defaultMiddleware = async (request: NextRequest) => {
  const url = new URL(request.url);
  logDefault('Processing request: %s %s', request.method, request.url);

  // 🆕 CHECK SPECIAL CHARS REWRITE FIRST
  const specialCharsResponse = handleSpecialCharsRewrite(request);
  if (specialCharsResponse) {
    logDefault('Request handled by special chars rewrite');
    return specialCharsResponse;
  }

  // skip all api requests
  if (backendApiEndpoints.some((path) => url.pathname.startsWith(path))) {
    logDefault('Skipping API request: %s', url.pathname);
    return NextResponse.next();
  }

  // Check if this is a request that might return content with static file references
  const shouldTransformResponse = !url.pathname.startsWith('/_next/static/') && 
    !url.pathname.startsWith('/api/') &&
    !url.pathname.includes('favicon');

  if (shouldTransformResponse) {
    logSpecialChars('Will transform response for: %s', url.pathname);
  }

  // 1. Read user preferences from cookies
  const theme =
    request.cookies.get(LOBE_THEME_APPEARANCE)?.value || parseDefaultThemeFromCountry(request);

  // locale handling
  const explicitlyLocale = (url.searchParams.get('hl') || undefined) as Locales | undefined;
  const browserLanguage = parseBrowserLanguage(request.headers);

  const locale =
    explicitlyLocale ||
    ((request.cookies.get(LOBE_LOCALE_COOKIE)?.value || browserLanguage) as Locales);

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

  // if app is in docker, rewrite to self container
  if (appEnv.MIDDLEWARE_REWRITE_THROUGH_LOCAL) {
    logDefault('Local container rewrite enabled');
    url.protocol = 'http';
    url.host = '127.0.0.1';
    url.port = process.env.PORT || '3210';
  }

  const nextPathname = `/${route}` + (url.pathname === '/' ? '' : url.pathname);
  url.pathname = nextPathname;

  const response = NextResponse.rewrite(url, { status: 200 });

  // 🆕 Transform response if needed (async operation)
  if (shouldTransformResponse) {
    return transformResponseContent(response, request);
  }

  return response;
};

// ... (keep other middleware functions unchanged)
const isPublicRoute = createRouteMatcher([
  '/api/auth(.*)',
  '/api/webhooks(.*)',
  '/webapi(.*)',
  '/trpc(.*)',
  '/next-auth/(.*)',
  '/login',
  '/signup',
  '/oidc/handoff',
  '/oidc/token',
]);

const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
  '/files(.*)',
  '/onboard(.*)',
  '/oauth(.*)',
]);

const nextAuthMiddleware = NextAuthEdge.auth(async (req) => {
  logNextAuth('NextAuth middleware processing request: %s %s', req.method, req.url);

  // Handle special chars first
  const specialCharsResponse = handleSpecialCharsRewrite(req);
  if (specialCharsResponse) {
    return specialCharsResponse;
  }

  const response = await defaultMiddleware(req);

  const isProtected = appEnv.ENABLE_AUTH_PROTECTION ? !isPublicRoute(req) : isProtectedRoute(req);
  const session = req.auth;
  const isLoggedIn = !!session?.expires;

  response.headers.delete(OAUTH_AUTHORIZED);
  if (isLoggedIn) {
    response.headers.set(OAUTH_AUTHORIZED, 'true');
    if (oidcEnv.ENABLE_OIDC && session?.user?.id) {
      response.headers.set(OIDC_SESSION_HEADER, session.user.id);
    }
  } else if (isProtected) {
    const nextLoginUrl = new URL('/next-auth/signin', req.nextUrl.origin);
    nextLoginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
    return Response.redirect(nextLoginUrl);
  }

  return response;
});

const clerkAuthMiddleware = clerkMiddleware(
  async (auth, req) => {
    logClerk('Clerk middleware processing request');

    const specialCharsResponse = handleSpecialCharsRewrite(req);
    if (specialCharsResponse) {
      return specialCharsResponse;
    }

    const isProtected = appEnv.ENABLE_AUTH_PROTECTION ? !isPublicRoute(req) : isProtectedRoute(req);

    if (isProtected) {
      await auth.protect();
    }

    const response = await defaultMiddleware(req);
    const data = await auth();

    if (oidcEnv.ENABLE_OIDC && data.userId) {
      response.headers.set(OIDC_SESSION_HEADER, data.userId);
    }

    return response;
  },
  {
    clockSkewInMs: 60 * 60 * 1000,
    signInUrl: '/login',
    signUpUrl: '/signup',
  },
);

logDefault('Middleware configuration: %O', {
  enableAuthProtection: appEnv.ENABLE_AUTH_PROTECTION,
  enableClerk: authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH,
  enableNextAuth: authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH,
  enableOIDC: oidcEnv.ENABLE_OIDC,
  specialCharsEncoding: true, // 🆕
});

export default authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH
  ? clerkAuthMiddleware
  : authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH
    ? nextAuthMiddleware
    : defaultMiddleware;