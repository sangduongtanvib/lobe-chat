/**
 * Offline Emoji Service
 * Provides mapping for offline emoji resources
 */

// Emoji mapping for offline usage
export const OFFLINE_EMOJI_MAP = {
  // Waving hand
  '👋': '/emojis/1f44b.webp',
  '1f44b': '/emojis/1f44b.webp',
  
  // Add more emojis as needed
  // Note: Only 1f44b.webp is successfully downloaded
} as const;

/**
 * Get offline emoji URL
 * @param emojiCode - Unicode emoji code (e.g., '1f44b') or emoji character
 * @returns Local emoji URL or null if not available offline
 */
export function getOfflineEmojiUrl(emojiCode: string): string | null {
  return OFFLINE_EMOJI_MAP[emojiCode as keyof typeof OFFLINE_EMOJI_MAP] || null;
}

/**
 * Check if emoji is available offline
 * @param emojiCode - Unicode emoji code or emoji character
 * @returns true if emoji is available offline
 */
export function isEmojiAvailableOffline(emojiCode: string): boolean {
  return emojiCode in OFFLINE_EMOJI_MAP;
}

/**
 * Get fallback emoji for offline mode
 * @param emojiCode - Original emoji code
 * @returns Available offline emoji or default
 */
export function getOfflineEmojiFallback(emojiCode: string): string {
  // If specific emoji is available, use it
  const offlineUrl = getOfflineEmojiUrl(emojiCode);
  if (offlineUrl) {
    return offlineUrl;
  }
  
  // Fallback to waving hand if available
  if (isEmojiAvailableOffline('1f44b')) {
    return OFFLINE_EMOJI_MAP['1f44b'];
  }
  
  // Ultimate fallback to text emoji
  return '👋';
}
