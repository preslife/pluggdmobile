type UnknownRecord = Record<string, unknown>;

export type CreatorProfileLink = {
  key: string;
  label: string;
  platform: string;
  url: string;
};

export type CreatorProfilePresentationSource = {
  cover_image_url?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  genres?: unknown;
  primary_genre?: string | null;
  website_url?: string | null;
  presskit_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  soundcloud_url?: string | null;
  spotify_url?: string | null;
  social_links?: unknown;
  embed_settings?: unknown;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function nonEmptyText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function externalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.') ? candidate : null;
  } catch {
    return null;
  }
}

function socialUrl(platform: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return externalUrl(trimmed);
  const normalized = platform.toLowerCase();
  const handle = trimmed.replace(/^@+/, '');
  if (!handle || handle.includes(' ') || handle.includes('/')) return externalUrl(trimmed);
  if (normalized === 'instagram') return `https://www.instagram.com/${handle}`;
  if (normalized === 'twitter' || normalized === 'x') return `https://x.com/${handle}`;
  if (normalized === 'youtube') return `https://www.youtube.com/@${handle}`;
  if (normalized === 'tiktok') return `https://www.tiktok.com/@${handle}`;
  if (normalized === 'soundcloud') return `https://soundcloud.com/${handle}`;
  if (normalized === 'spotify' && /^[A-Za-z0-9]{22}$/.test(handle)) {
    return `https://open.spotify.com/artist/${handle}`;
  }
  return externalUrl(trimmed);
}

function storefrontSettings(embedSettings: unknown) {
  const root = asRecord(embedSettings);
  return asRecord(root?.storefront);
}

function hexLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) || [0, 0, 0];
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function normalizeCreatorAccentColor(value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.trim())) return null;
  const accent = value.trim();
  const darkSurface = '#0a0806';
  const brighter = Math.max(hexLuminance(accent), hexLuminance(darkSurface));
  const darker = Math.min(hexLuminance(accent), hexLuminance(darkSurface));
  return (brighter + 0.05) / (darker + 0.05) >= 3 ? accent : null;
}

export function resolveCreatorAccentColor(
  profile: CreatorProfilePresentationSource | null,
  publishedAccent?: string | null,
  fallback = '#ff6600',
) {
  const settings = asRecord(profile?.embed_settings);
  const storefront = storefrontSettings(profile?.embed_settings);
  const profileTheme = asRecord(settings?.profile_theme);
  const candidates = [
    publishedAccent,
    storefront?.accentColor,
    storefront?.accent_color,
    storefront?.primaryColor,
    storefront?.primary_color,
    profileTheme?.accentColor,
    profileTheme?.accent_color,
    fallback,
    '#ff6600',
  ];
  return candidates.map(normalizeCreatorAccentColor).find(Boolean) || '#ff6600';
}

export function creatorAccentHighlight(accent: string) {
  const normalized = normalizeCreatorAccentColor(accent) || '#ff6600';
  const mix = 0.26;
  const channels = normalized.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) || [255, 102, 0];
  return `#${channels
    .map((channel) => Math.round(channel + (255 - channel) * mix).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function resolveCreatorCoverUrl(profile: CreatorProfilePresentationSource | null) {
  if (!profile) return null;
  const settings = asRecord(profile.embed_settings);
  const storefront = storefrontSettings(profile.embed_settings);
  const profileTheme = asRecord(settings?.profile_theme);
  return nonEmptyText(profile.cover_image_url)
    || nonEmptyText(storefront?.bannerImage)
    || nonEmptyText(storefront?.banner_image)
    || nonEmptyText(profileTheme?.backgroundImage)
    || nonEmptyText(profileTheme?.background_image)
    || null;
}

export function creatorLocationLabel(profile: CreatorProfilePresentationSource | null) {
  if (!profile) return null;
  const explicit = nonEmptyText(profile.location);
  if (explicit) return explicit;
  const parts = [nonEmptyText(profile.city), nonEmptyText(profile.country)].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function creatorGenres(profile: CreatorProfilePresentationSource | null) {
  if (!profile) return [];
  const raw = Array.isArray(profile.genres) ? profile.genres : [];
  const values = [...raw, profile.primary_genre]
    .map(nonEmptyText)
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(values));
}

export function creatorProfileLinks(profile: CreatorProfilePresentationSource | null): CreatorProfileLink[] {
  if (!profile) return [];
  const entries: Array<{ label: string; platform: string; raw: string | null; social?: boolean }> = [
    { label: 'Website', platform: 'website', raw: nonEmptyText(profile.website_url) },
    { label: 'Press kit', platform: 'presskit', raw: nonEmptyText(profile.presskit_url) },
    { label: 'Instagram', platform: 'instagram', raw: nonEmptyText(profile.instagram_url), social: true },
    { label: 'X', platform: 'twitter', raw: nonEmptyText(profile.twitter_url), social: true },
    { label: 'YouTube', platform: 'youtube', raw: nonEmptyText(profile.youtube_url), social: true },
    { label: 'TikTok', platform: 'tiktok', raw: nonEmptyText(profile.tiktok_url), social: true },
    { label: 'SoundCloud', platform: 'soundcloud', raw: nonEmptyText(profile.soundcloud_url), social: true },
    { label: 'Spotify', platform: 'spotify', raw: nonEmptyText(profile.spotify_url), social: true },
  ];

  const socialLinks = asRecord(profile.social_links);
  if (socialLinks) {
    Object.entries(socialLinks).forEach(([platform, value]) => {
      const raw = nonEmptyText(value);
      if (!raw) return;
      const normalized = platform.toLowerCase() === 'x' ? 'twitter' : platform.toLowerCase();
      entries.push({
        label: normalized === 'twitter' ? 'X' : normalized === 'tiktok' ? 'TikTok' : normalized.charAt(0).toUpperCase() + normalized.slice(1),
        platform: normalized,
        raw,
        social: true,
      });
    });
  }

  const customLinks = storefrontSettings(profile.embed_settings)?.customLinks
    || storefrontSettings(profile.embed_settings)?.custom_links;
  if (Array.isArray(customLinks)) {
    customLinks.forEach((candidate) => {
      const row = asRecord(candidate);
      const label = nonEmptyText(row?.label);
      const raw = nonEmptyText(row?.url);
      if (label && raw) entries.push({ label, platform: 'link', raw });
    });
  }

  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    if (!entry.raw) return [];
    const url = entry.social ? socialUrl(entry.platform, entry.raw) : externalUrl(entry.raw);
    if (!url) return [];
    const key = `${entry.platform}:${url.toLowerCase().replace(/\/$/, '')}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, label: entry.label, platform: entry.platform, url }];
  });
}

export function formatCreatorMoney(amount?: number | null, currency = 'GBP', cents = false) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Free';
  const value = cents ? numeric / 100 : numeric;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: value >= 10 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(value >= 10 ? 0 : 2)}`;
  }
}
