/**
 * Offline Font Fallback Configuration
 * This component provides fallback fonts when external CDN is not accessible
 */

import React, { memo } from 'react';

export interface OfflineFontFallbackProps {
  children: React.ReactNode;
}

const OfflineFontFallback = memo<OfflineFontFallbackProps>(({ children }) => {
  return (
    <>
      <style jsx global>{`
        /* Fallback fonts for offline mode */
        @font-face {
          font-family: 'HackFallback';
          src: local('Monaco'), 
               local('Menlo'), 
               local('Ubuntu Mono'), 
               local('Consolas'), 
               local('Courier New'), 
               monospace;
          font-display: swap;
        }
        
        /* Override Hack font with fallback when needed */
        .lobe-theme {
          --font-mono: 'Hack', 'HackFallback', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace !important;
        }
        
        /* Specific selectors for code elements */
        code,
        pre,
        .font-mono,
        [style*="font-family: monospace"],
        [style*="font-family:monospace"] {
          font-family: var(--font-mono) !important;
        }
      `}</style>
      {children}
    </>
  );
});

OfflineFontFallback.displayName = 'OfflineFontFallback';

export default OfflineFontFallback;
