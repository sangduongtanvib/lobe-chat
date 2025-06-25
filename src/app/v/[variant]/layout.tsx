import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeAppearance } from 'antd-style';
import { ResolvingViewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ReactNode } from 'react';
import { isRtlLang } from 'rtl-detect';

import Analytics from '@/components/Analytics';
import WAFChunkInterceptor from '@/components/WAFChunkInterceptor';
import { DEFAULT_LANG } from '@/const/locale';
import { isDesktop } from '@/const/version';
import PWAInstall from '@/features/PWAInstall';
import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';
import { Locales } from '@/locales/resources';
import { DynamicLayoutProps } from '@/types/next';
import '@/utils/next15-compat';
import { RouteVariants } from '@/utils/server/routeVariants';

const inVercel = process.env.VERCEL === '1';

interface RootLayoutProps extends DynamicLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

const RootLayout = async ({ children, params, modal }: RootLayoutProps) => {
  const { variant } = await params;

  const { locale, isMobile, theme, primaryColor, neutralColor } =
    RouteVariants.deserializeVariants(variant);

  const direction = isRtlLang(locale) ? 'rtl' : 'ltr';

  return (
    <html dir={direction} lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize WAF interceptors immediately (before any chunks load)
              (function() {
                if (typeof window === 'undefined') return;
                
                console.debug('WAF: Early initialization of interceptors');
                
                // Helper function to convert URLs - defined early
                function makeWAFFriendlyStaticUrl(originalUrl) {
                  if (!originalUrl.includes('/_next/static/')) {
                    return originalUrl;
                  }

                  const staticPath = originalUrl.split('/_next/static/')[1];
                  let wafPrefix = '/waf-safe/';
                  let processPath = staticPath;
                  
                  if (staticPath.startsWith('chunks/')) {
                    const chunkPath = staticPath.replace('chunks/', '');
                    
                    // Handle specific variant patterns that commonly trigger WAF
                    if (chunkPath.includes('src_app_v_%5B') && chunkPath.includes('%5D')) {
                      const variantPattern = /src_app_v_%5B([^%]+)%5D(.*)_([^.]+)\\._.js$/;
                      const match = chunkPath.match(variantPattern);
                      
                      if (match) {
                        const [, variant, restPath, hash] = match;
                        const cleanRestPath = restPath
                          .replace(/^\\_/, '')
                          .replaceAll('_', '-')
                          .replaceAll('(', '-')
                          .replaceAll(')', '-')
                          .replaceAll('%40', '-at-');
                        
                        return originalUrl.replace(
                          \`/_next/static/chunks/\${chunkPath}\`,
                          \`/safe-chunks/app-variant-\${variant}\${cleanRestPath}-\${hash}.js\`
                        );
                      }
                    }
                    
                    wafPrefix = '/static/js/';
                    processPath = chunkPath;
                  } else if (staticPath.startsWith('css/')) {
                    wafPrefix = '/static/css/';
                    processPath = staticPath.replace('css/', '');
                  } else if (staticPath.startsWith('media/')) {
                    wafPrefix = '/static/media/';
                    processPath = staticPath.replace('media/', '');
                  }
                  
                  const safeStaticPath = processPath
                    .replaceAll('%5B', '_OB_')
                    .replaceAll('%5D', '_CB_')
                    .replaceAll('%40', '_AT_')
                    .replaceAll('(', '_OP_')
                    .replaceAll(')', '_CP_')
                    .replaceAll('%', '_PCT_');
                  
                  return originalUrl.replace(
                    \`/_next/static/\${staticPath}\`,
                    \`\${wafPrefix}\${safeStaticPath}\`
                  );
                }
                
                // Immediately intercept fetch
                const originalFetch = window.fetch;
                window.fetch = function(resource, init) {
                  if (typeof resource === 'string' && resource.includes('/_next/static/')) {
                    const wafFriendlyUrl = makeWAFFriendlyStaticUrl(resource);
                    if (wafFriendlyUrl !== resource) {
                      console.log('WAF: Early fetch rewrite:', resource, '->', wafFriendlyUrl);
                      resource = wafFriendlyUrl;
                    }
                  }
                  return originalFetch.call(this, resource, init);
                };

                // Immediately intercept XMLHttpRequest
                const OriginalXHR = window.XMLHttpRequest;
                window.XMLHttpRequest = function() {
                  const xhr = new OriginalXHR();
                  const originalOpen = xhr.open;
                  
                  xhr.open = function(method, url, ...args) {
                    if (typeof url === 'string' && url.includes('/_next/static/')) {
                      const wafFriendlyUrl = makeWAFFriendlyStaticUrl(url);
                      if (wafFriendlyUrl !== url) {
                        console.log('WAF: Early XHR rewrite:', url, '->', wafFriendlyUrl);
                        url = wafFriendlyUrl;
                      }
                    }
                    return originalOpen.call(this, method, url, ...args);
                  };
                  
                  return xhr;
                };

                // Immediately intercept createElement
                const originalCreateElement = document.createElement;
                document.createElement = function(tagName) {
                  const element = originalCreateElement.call(this, tagName);
                  
                  if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function(name, value) {
                      if ((name === 'src' || name === 'href') && typeof value === 'string' && value.includes('/_next/static/')) {
                        const wafFriendlyUrl = makeWAFFriendlyStaticUrl(value);
                        if (wafFriendlyUrl !== value) {
                          console.log('WAF: Early element rewrite:', value, '->', wafFriendlyUrl);
                          value = wafFriendlyUrl;
                        }
                      }
                      return originalSetAttribute.call(this, name, value);
                    };
                  }
                  
                  return element;
                };

                // Immediately intercept appendChild
                const originalAppendChild = Element.prototype.appendChild;
                Element.prototype.appendChild = function(child) {
                  if (child.tagName === 'SCRIPT' && child.src && child.src.includes('/_next/static/chunks/')) {
                    const originalSrc = child.src;
                    const wafFriendlyUrl = makeWAFFriendlyStaticUrl(originalSrc);
                    if (wafFriendlyUrl !== originalSrc) {
                      console.log('WAF: Early appendChild rewrite:', originalSrc, '->', wafFriendlyUrl);
                      child.src = wafFriendlyUrl;
                    }
                  }
                  return originalAppendChild.call(this, child);
                };
                
                console.debug('WAF: Early interceptors initialized');
                
                // Mark that early interceptors are initialized
                window.__WAF_EARLY_INTERCEPTORS_INITIALIZED__ = true;
              })();
              
              // Register WAF Service Worker immediately (don't wait for load)
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/waf-sw.js')
                  .then(function(registration) {
                    console.log('WAF SW: Registration successful', registration.scope);
                    // Force immediate activation
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                  })
                  .catch(function(error) {
                    console.log('WAF SW: Registration failed', error);
                  });
              }
            `,
          }}
        />
        <WAFChunkInterceptor />
      </head>
      <body>
        <NuqsAdapter>
          <GlobalProvider
            appearance={theme}
            isMobile={isMobile}
            locale={locale}
            neutralColor={neutralColor}
            primaryColor={primaryColor}
          >
            <AuthProvider>
              {children}
              {!isMobile && modal}
            </AuthProvider>
            <PWAInstall />
          </GlobalProvider>
        </NuqsAdapter>
        <Analytics />
        {inVercel && <SpeedInsights />}
      </body>
    </html>
  );
};

export default RootLayout;

export { generateMetadata } from './metadata';

export const generateViewport = async (props: DynamicLayoutProps): ResolvingViewport => {
  const isMobile = await RouteVariants.getIsMobile(props);

  const dynamicScale = isMobile ? { maximumScale: 1, userScalable: false } : {};

  return {
    ...dynamicScale,
    initialScale: 1,
    minimumScale: 1,
    themeColor: [
      { color: '#f8f8f8', media: '(prefers-color-scheme: light)' },
      { color: '#000', media: '(prefers-color-scheme: dark)' },
    ],
    viewportFit: 'cover',
    width: 'device-width',
  };
};

export const generateStaticParams = () => {
  const themes: ThemeAppearance[] = ['dark', 'light'];
  const mobileOptions = isDesktop ? [false] : [true, false];
  // only static for serveral page, other go to dynamtic
  const staticLocales: Locales[] = [DEFAULT_LANG];

  const variants: { variant: string }[] = [];

  for (const locale of staticLocales) {
    for (const theme of themes) {
      for (const isMobile of mobileOptions) {
        variants.push({
          variant: RouteVariants.serializeVariants({ isMobile, locale, theme }),
        });
      }
    }
  }

  return variants;
};
