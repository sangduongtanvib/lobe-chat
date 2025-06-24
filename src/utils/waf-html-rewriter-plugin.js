/**
 * WAF HTML Rewriter Plugin for Webpack
 * Rewrites chunk URLs in generated HTML to use WAF-friendly paths
 */

class WAFHTMLRewriterPlugin {
  constructor(options = {}) {
    this.options = {
      development: process.env.NODE_ENV === 'development',
      ...options,
    };
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
                  // Replace problematic chunk URLs in script tags
                  source = source.replaceAll(
                    /src="([^"]*\/_next\/static\/chunks\/[^"]*%5B[^"]*)"([^>]*>)/g,
                    (match, url, rest) => {
                      const wafUrl = url
                        .replace('/_next/static/chunks/', '/static/js/')
                        .replaceAll('%5B', '_OB_')
                        .replaceAll('%5D', '_CB_')
                        .replaceAll('%40', '_AT_')
                        .replaceAll('(', '_OP_')
                        .replaceAll(')', '_CP_');

                      if (this.options.development) {
                        console.log('WAF Plugin: Rewriting HTML script src:', url, '->', wafUrl);
                      }

                      return `src="${wafUrl}"${rest}`;
                    },
                  );

                  // Update the asset
                  assets[filename] = {
                    size: () => source.length,
                    source: () => source,
                  };
                }
              }
            });
          },
        );
      }
    });
  }
}

module.exports = WAFHTMLRewriterPlugin;
