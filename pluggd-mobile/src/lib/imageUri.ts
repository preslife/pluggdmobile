const PLUGGD_WEB_ORIGIN = 'https://www.pluggd.fm';

/**
 * Content shared with pluggd.fm can contain site-relative artwork paths.
 * Browsers resolve those automatically; React Native does not. Resolve them
 * here so every native surface uses the real cover rather than treating a
 * valid website asset as a failed image.
 */
export function resolvedImageUri(uri: string): string | null {
  const value = uri?.trim();
  if (!value) return null;
  if (value.startsWith('/')) return `${PLUGGD_WEB_ORIGIN}${value}`;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(value)) return value;
  return null;
}
