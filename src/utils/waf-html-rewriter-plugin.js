/**
 * WAF HTML Rewriter Plugin for Webpack
 * Rewrites chunk URLs in generated HTML to use WAF-friendly paths
 */

class WAFHTMLRewriterPlugin {
  constructor(options = {}) {
    this.options = {
      development: process.env.NODE_ENV === 'development',
      production: process.env.NODE_ENV === 'production',
      ...options,
    };

    // Define comprehensive URL mapping patterns
    this.urlMappings = [
      // Next.js chunks with brackets
      {
        pattern: /_next\/static\/chunks\/([^"]*%5B[^"]*)/g,
        replacement: (match, path) => `/static/js/${this.encodeSafePath(path)}`,
      },
      // App router chunks
      {
        pattern: /_next\/static\/chunks\/app\/([^"]*)/g,
        replacement: (match, path) => `/app-safe/${this.encodeSafePath(path)}`,
      },
      // Auth routes
      {
        pattern: /\/api\/auth\/%5B\.{3}nextauth%5D/g,
        replacement: '/api/auth-safe',
      },
      // File routes
      {
        pattern: /\/api\/offline-fonts\/%5B\.\.\.slug%5D/g,
        replacement: '/api/fonts-safe',
      },
      // Login routes
      {
        pattern: /\/login\/%5B%5B\.\.\.login%5D%5D/g,
        replacement: '/login-safe',
      },
      // TRPC routes
      {
        pattern: /\/trpc\/lambda\/%5Btrpc%5D/g,
        replacement: '/trpc-lambda-safe',
      },
      {
        pattern: /\/trpc\/tools\/%5Btrpc%5D/g,
        replacement: '/trpc-tools-safe',
      },
      // Backend route groups
      {
        pattern: /\/\(backend\)/g,
        replacement: '/backend-safe',
      },
      // General Next.js static files
      {
        pattern: /_next\/static\/([^"]*)/g,
        replacement: (match, path) => `/nextjs-static/${this.encodeSafePath(path)}`,
      },
    ];
  }

  encodeSafePath(path) {
    return path
      .replaceAll('%5B', '_OB_')
      .replaceAll('%5D', '_CB_')
      .replaceAll('%40', '_AT_')
      .replaceAll('%28', '_OP_')
      .replaceAll('%29', '_CP_')
      .replaceAll('%2F', '_SL_')
      .replaceAll('%3A', '_CO_')
      .replaceAll('%3F', '_QM_')
      .replaceAll('%26', '_AM_')
      .replaceAll('%3D', '_EQ_')
      .replaceAll('%2B', '_PL_')
      .replaceAll('%23', '_HS_');
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('WAFHTMLRewriterPlugin', (compilation) => {
      // Hook into HTML processing
      if (compilation.hooks.processAssets) {
        compilation.hooks.processAssets.tap(
          {
            name: 'WAFHTMLRewriterPlugin',
            stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
          },
          (assets) => {
            // Process HTML files
            Object.keys(assets).forEach((filename) => {
              if (filename.endsWith('.html')) {
                const asset = assets[filename];
                let source = asset.source();

                if (typeof source === 'string') {
                  const originalSource = source;

                  // Apply all URL mappings
                  this.urlMappings.forEach(({ pattern, replacement }) => {
                    if (typeof replacement === 'function') {
                      source = source.replace(pattern, replacement);
                    } else {
                      source = source.replaceAll(pattern, replacement);
                    }
                  });

                  // Additional processing for script tags
                  source = source.replaceAll(
                    /src="([^"]*\/_next\/static\/[^"]*)"([^>]*>)/g,
                    (match, url, rest) => {
                      const wafUrl = this.convertToWafSafeUrl(url);

                      if (this.options.development || this.options.production) {
                        console.log('WAF Plugin: Rewriting HTML script src:', url, '->', wafUrl);
                      }

                      return `src="${wafUrl}"${rest}`;
                    },
                  );

                  // Process link tags for CSS and preload
                  source = source.replaceAll(
                    /href="([^"]*\/_next\/static\/[^"]*)"([^>]*>)/g,
                    (match, url, rest) => {
                      const wafUrl = this.convertToWafSafeUrl(url);

                      if (this.options.development || this.options.production) {
                        console.log('WAF Plugin: Rewriting HTML link href:', url, '->', wafUrl);
                      }

                      return `href="${wafUrl}"${rest}`;
                    },
                  );

                  // Update the asset if changes were made
                  if (source !== originalSource) {
                    assets[filename] = {
                      size: () => source.length,
                      source: () => source,
                    };
                  }
                }
              }
            });
          },
        );
      }
    });
  }

  convertToWafSafeUrl(url) {
    // Check if URL contains problematic characters
    if (url.includes('%5B') || url.includes('%5D') || url.includes('(') || url.includes(')')) {
      // Apply mapping based on URL pattern
      if (url.includes('/_next/static/chunks/')) {
        return url.replace('/_next/static/chunks/', '/static/js/');
      } else if (url.includes('/_next/static/css/')) {
        return url.replace('/_next/static/css/', '/static/css/');
      } else if (url.includes('/_next/static/')) {
        return url.replace('/_next/static/', '/nextjs-static/');
      }
    }

    return this.encodeSafePath(url);
  }
}

module.exports = WAFHTMLRewriterPlugin;
