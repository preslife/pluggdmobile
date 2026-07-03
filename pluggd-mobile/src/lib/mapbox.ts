/**
 * Mobile port of the web app's `src/lib/mapbox.ts` geocoding layer. Mobile events
 * carry only a free-text `location` (no venue coordinates), so the Events map
 * (EVT-02) geocodes those strings into lat/lng exactly the way the web EventsMap
 * does — same Mapbox Geocoding API, same public token. Rendering is handled
 * separately by `@rnmapbox/maps`; this module is only about coordinates.
 *
 * Token: reuse the web `pk.…` public token via EXPO_PUBLIC_MAPBOX_TOKEN.
 */

export const MAPBOX_CONFIG = {
  TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '',
  GEOCODING_LIMIT: 1,
  GEOCODING_LANGUAGE: 'en',
} as const;

export type GeocodeResult = { lat: number; lng: number; city: string; country: string };
export type GeocodeOptions = { limit?: number; types?: string[] };

const DEFAULT_GEOCODE_TYPES = [
  'address',
  'poi',
  'postcode',
  'neighborhood',
  'locality',
  'place',
  'district',
  'region',
  'country',
] as const;

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type CacheEntry = GeocodeResult & { ts: number };

// In-memory cache for the session. Geocoding results are stable, so this keeps
// the map responsive without re-hitting the API as the user pans/refetches.
const cache = new Map<string, CacheEntry>();

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export function hasMapboxToken() {
  return Boolean(MAPBOX_CONFIG.TOKEN);
}

export async function geocodeLocation(
  location: string,
  options: GeocodeOptions = {},
): Promise<GeocodeResult | null> {
  const query = normalize(location);
  if (!query) return null;

  const cached = cache.get(query);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { lat: cached.lat, lng: cached.lng, city: cached.city, country: cached.country };
  }

  const token = MAPBOX_CONFIG.TOKEN;
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      access_token: token,
      limit: String(options.limit ?? MAPBOX_CONFIG.GEOCODING_LIMIT),
      types: (options.types && options.types.length > 0 ? options.types : DEFAULT_GEOCODE_TYPES).join(','),
      language: MAPBOX_CONFIG.GEOCODING_LANGUAGE,
      autocomplete: 'false',
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature || !Array.isArray(feature.center)) return null;

    const [lng, lat] = feature.center as [number, number];
    const city = feature.text || query;
    const countryContext = (feature.context || []).find(
      (item: { id?: unknown }) => typeof item?.id === 'string' && item.id.startsWith('country'),
    );
    const country = countryContext?.text || feature.place_name?.split(',').pop()?.trim() || '';

    const result: GeocodeResult = { lat, lng, city, country };
    cache.set(query, { ...result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}

export type MapPoint = { lat: number; lng: number };

/**
 * Build a Mapbox Static Images API URL — a real branded dark-v11 map with orange
 * pins, rendered as a plain <Image> so it works on web AND native with no native
 * module. This is the first-pass EVT-02 events map; an interactive @rnmapbox
 * MapView is the later upgrade. Returns null when there is no token or no points.
 */
export function staticMapUrl(
  points: MapPoint[],
  opts: { width?: number; height?: number; retina?: boolean } = {},
): string | null {
  const token = MAPBOX_CONFIG.TOKEN;
  const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).slice(0, 20);
  if (!token || !pts.length) return null;

  const width = Math.round(opts.width ?? 640);
  const height = Math.round(opts.height ?? 320);
  const retina = opts.retina === false ? '' : '@2x';
  const markers = pts
    .map((p) => `pin-s+ff5a00(${p.lng.toFixed(4)},${p.lat.toFixed(4)})`)
    .join(',');
  // Single point → center on it at a city zoom; multiple → let Mapbox auto-fit.
  const camera = pts.length === 1 ? `${pts[0].lng.toFixed(4)},${pts[0].lat.toFixed(4)},9` : 'auto';

  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markers}/${camera}/${width}x${height}${retina}?access_token=${token}&padding=48`;
}

export async function geocodeMany(
  locations: string[],
  concurrency = 4,
  options: GeocodeOptions = {},
): Promise<Map<string, GeocodeResult>> {
  const output = new Map<string, GeocodeResult>();
  const queue = [...new Set(locations.map((location) => location.trim()).filter(Boolean))];

  async function worker() {
    while (queue.length > 0) {
      const location = queue.shift();
      if (!location) break;
      const result = await geocodeLocation(location, options);
      if (result) output.set(location, result);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return output;
}
