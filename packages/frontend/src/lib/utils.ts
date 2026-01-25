/**
 * Check if a string is an image URL (http/https or local path)
 */
export const isImageUrl = (url?: string | null): boolean =>
  !!(url && (url.startsWith('http') || url.startsWith('/')))
