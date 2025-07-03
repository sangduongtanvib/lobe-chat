import analyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import ReactComponentName from 'react-scan/react-component-name/webpack';

// Import WAF HTML rewriter plugin
const WAFHTMLRewriterPlugin = require('./src/utils/waf-html-rewriter-plugin');

const isProd = process.env.NODE_ENV === 'production';
const buildWithDocker = process.env.DOCKER === 'true';
const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';
const enableReactScan = !!process.env.REACT_SCAN_MONITOR_API_KEY;
const isUsePglite = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';
const disableWAF = process.env.DISABLE_WAF === 'true';

// if you need to proxy the api endpoint to remote server

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
const isStandaloneMode = buildWithDocker || isDesktop;

const standaloneConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '*': ['public/**/*', '.next/static/**/*'] },
};

const nextConfig: NextConfig = {
  ...(isStandaloneMode ? standaloneConfig : {}),
  basePath,
  compress: isProd,
  experimental: {
    optimizePackageImports: [
      'emoji-mart',
      '@emoji-mart/react',
      '@emoji-mart/data',
      '@icons-pack/react-simple-icons',
      '@lobehub/ui',
      'gpt-tokenizer',
    ],
    // oidc provider depend on constructor.name
    // but swc minification will remove the name
    // so we need to disable it
    // refs: https://github.com/lobehub/lobe-chat/pull/7430
    serverMinification: false,
    // Disable strict mode in production to avoid searchParams awaiting issues
    strictNextHead: false,

    webVitalsAttribution: ['CLS', 'LCP'],
  },
  // Trust proxy for SSL termination (Azure Application Gateway)
  ...(isProd && {
    poweredByHeader: false,
    trailingSlash: false,
  }),
  async headers() {
    return [
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/fonts/(.*).(woff|woff2|css)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/icons/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/images/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/videos/(.*).(mp4|webm|ogg|avi|mov|wmv|flv|mkv)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/screenshots/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/og/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon-32x32.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/apple-touch-icon.png',
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  reactStrictMode: true,
  redirects: async () => [
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap.xml',
    },
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap-0.xml',
    },
    {
      destination: '/manifest.webmanifest',
      permanent: true,
      source: '/manifest.json',
    },
    {
      destination: '/discover/assistant/:slug',
      has: [
        {
          key: 'agent',
          type: 'query',
          value: '(?<slug>.*)',
        },
      ],
      permanent: true,
      source: '/market',
    },
    {
      destination: '/discover/assistants',
      permanent: true,
      source: '/discover/assistant',
    },
    {
      destination: '/discover/models',
      permanent: true,
      source: '/discover/model',
    },
    {
      destination: '/discover/plugins',
      permanent: true,
      source: '/discover/plugin',
    },
    {
      destination: '/discover/providers',
      permanent: true,
      source: '/discover/provider',
    },
    {
      destination: '/settings/common',
      permanent: true,
      source: '/settings',
    },
    {
      destination: '/chat',
      permanent: true,
      source: '/welcome',
    },
    // TODO: 等 V2 做强制跳转吧
    // {
    //   destination: '/settings/provider/volcengine',
    //   permanent: true,
    //   source: '/settings/provider/doubao',
    // },
    // we need back /repos url in the further
    {
      destination: '/files',
      permanent: false,
      source: '/repos',
    },
  ],
  async rewrites() {
    const baseRewrites = [
      // Redirect CDN font requests to local fonts
      {
        destination: '/fonts/webfont-mono.css',
        source: '/api/fonts/webfont-mono',
      },
      {
        destination: '/fonts/harmony-sans/index.css',
        source: '/api/fonts/harmony-sans',
      },
      {
        destination: '/fonts/harmony-sans-sc/index.css',
        source: '/api/fonts/harmony-sans-sc',
      },
      {
        destination: '/fonts/katex/katex.min.css',
        source: '/api/fonts/katex',
      },
      // Redirect emoji requests
      {
        destination: '/emojis/:path*',
        source: '/api/emojis/:path*',
      },
    ];

    // If WAF is disabled, return only base rewrites
    if (disableWAF) {
      return baseRewrites;
    }

    // WAF-friendly rewrites (only when WAF is enabled)
    const wafRewrites = [
      // ===== WAF-FRIENDLY URL MAPPINGS =====
      // Core Next.js static files rewrites
      {
        destination: '/_next/static/chunks/:path*',
        source: '/static/js/:path*',
      },
      {
        destination: '/_next/static/css/:path*',
        source: '/static/css/:path*',
      },
      {
        destination: '/_next/static/media/:path*',
        source: '/static/media/:path*',
      },
      {
        destination: '/_next/static/:path*',
        source: '/nextjs-static/:path*',
      },

      // Safe chunk patterns for WAF
      {
        destination: '/_next/static/chunks/:path*',
        source: '/safe-chunks/:path*',
      },
      {
        destination: '/_next/static/chunks/:path*',
        source: '/js-chunks/:path*',
      },
      {
        destination: '/_next/static/chunks/:path*',
        source: '/waf-chunks/:path*',
      },

      // Handle app router dynamic routes with brackets
      {
        destination: '/_next/static/chunks/app/:path*',
        source: '/app-safe/:path*',
      },

      // Handle variant patterns (encoded brackets)
      {
        destination: '/_next/static/chunks/app/v/%5Bvariant%5D/:path*',
        source: '/app-chunks/variant/:path*',
      },

      // Handle auth dynamic routes
      {
        destination: '/api/auth/%5B...nextauth%5D/:path*',
        source: '/api/auth-safe/:path*',
      },

      // Handle file routes with brackets
      {
        destination: '/api/offline-fonts/%5B...slug%5D/:path*',
        source: '/api/fonts-safe/:path*',
      },

      // Handle login dynamic routes
      {
        destination: '/login/%5B%5B...login%5D%5D/:path*',
        source: '/login-safe/:path*',
      },

      // General WAF-safe patterns for any static file with special characters
      {
        destination: '/_next/static/:path*',
        source: '/waf-safe/:path*',
      },

      // Handle pages with parentheses in route groups
      {
        destination: '/backend/:path*',
        source: '/backend-safe/:path*',
      },

      // Handle TRPC routes with brackets
      {
        destination: '/trpc/lambda/%5Btrpc%5D/:path*',
        source: '/trpc-lambda-safe/:path*',
      },
      {
        destination: '/trpc/tools/%5Btrpc%5D/:path*',
        source: '/trpc-tools-safe/:path*',
      },

      // Handle any remaining encoded characters in URLs
      {
        destination: '/:path*',
        has: [
          {
            key: 'original',
            type: 'query',
          },
        ],
        source: '/decode/:path*',
      },
    ];

    return [...baseRewrites, ...wafRewrites];
  },
  // when external packages in dev mode with turbopack, this config will lead to bundle error
  serverExternalPackages: isProd ? ['@electric-sql/pglite'] : undefined,

  transpilePackages: ['pdfjs-dist', 'mermaid'],

  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    // Add WAF HTML rewriter plugin for both development and production (only if WAF is enabled)
    if (!disableWAF) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new WAFHTMLRewriterPlugin({
          development: !isProd,
          production: isProd,
        }),
      );
    }

    // 开启该插件会导致 pglite 的 fs bundler 被改表
    if (enableReactScan && !isUsePglite) {
      config.plugins.push(ReactComponentName({}));
    }

    // to fix shikiji compile error
    // refs: https://github.com/antfu/shikiji/issues/23
    config.module.rules.push({
      resolve: {
        fullySpecified: false,
      },
      test: /\.m?js$/,
      type: 'javascript/auto',
    });

    // https://github.com/pinojs/pino/issues/688#issuecomment-637763276
    config.externals.push('pino-pretty');

    config.resolve.alias.canvas = false;

    // to ignore epub2 compile error
    // refs: https://github.com/lobehub/lobe-chat/discussions/6769
    config.resolve.fallback = {
      ...config.resolve.fallback,
      zipfile: false,
    };
    return config;
  },
};

const noWrapper = (config: NextConfig) => config;

const withBundleAnalyzer = process.env.ANALYZE === 'true' ? analyzer() : noWrapper;

const withPWA =
  isProd && !isDesktop
    ? withSerwistInit({
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        register: false,
        swDest: 'public/sw.js',
        swSrc: 'src/app/sw.ts', // 10MB limit for files to cache
      })
    : noWrapper;

const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
const withSentry =
  isProd && hasSentry
    ? (c: NextConfig) =>
        withSentryConfig(
          c,
          {
            org: process.env.SENTRY_ORG,

            project: process.env.SENTRY_PROJECT,
            // For all available options, see:
            // https://github.com/getsentry/sentry-webpack-plugin#options
            // Suppresses source map uploading logs during build
            silent: true,
          },
          {
            // Enables automatic instrumentation of Vercel Cron Monitors.
            // See the following for more information:
            // https://docs.sentry.io/product/crons/
            // https://vercel.com/docs/cron-jobs
            automaticVercelMonitors: true,

            // Automatically tree-shake Sentry logger statements to reduce bundle size
            disableLogger: true,

            // Hides source maps from generated client bundles
            hideSourceMaps: true,

            // Transpiles SDK to be compatible with IE11 (increases bundle size)
            transpileClientSDK: true,

            // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers. (increases server load)
            // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
            // side errors will fail.
            tunnelRoute: '/monitoring',

            // For all available options, see:
            // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
            // Upload a larger set of source maps for prettier stack traces (increases build time)
            widenClientFileUpload: true,
          },
        )
    : noWrapper;

export default withBundleAnalyzer(withPWA(withSentry(nextConfig) as NextConfig));
