/**
 * Next.js 15 compatibility utilities for searchParams handling
 * Addresses the issue where searchParams needs to be awaited before accessing properties
 */

// Override JSON.stringify to handle Promise-based searchParams
const originalStringify = JSON.stringify;

// Only apply in production to avoid development serialization issues
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  (JSON as any).stringify = function (value: any, replacer?: any, space?: any) {
    // Handle objects that might contain searchParams Promise
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const filteredValue = { ...value };

      // Remove potentially problematic searchParams if it's a Promise
      if (filteredValue.searchParams && typeof filteredValue.searchParams?.then === 'function') {
        delete filteredValue.searchParams;
      }

      // Remove _debugInfo if it exists
      if (filteredValue._debugInfo) {
        delete filteredValue._debugInfo;
      }

      return originalStringify.call(this, filteredValue, replacer, space);
    }

    return originalStringify.call(this, value, replacer, space);
  };
}

export {};
