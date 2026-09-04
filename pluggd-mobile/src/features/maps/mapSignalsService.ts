import { supabase } from '../../lib/supabase';

export type MapSignal = {
  id: string;
  authorUserId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  latitude: number;
  longitude: number;
  precision: string;
  precisionRadiusMetres: number | null;
  createdAt: string;
  expiresAt: string | null;
  sceneMarker: boolean;
  promoted: boolean;
  promotionLabel: string | null;
  tuneInCount: number;
  recentTuneInCount: number;
  commentCount: number;
  mediaCount: number;
  likeCount: number;
  viewCount: number;
  moodTags: string[];
  activityTags: string[];
  links: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
  tunedIn: boolean;
  liked: boolean;
};

export type MapBounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom?: number | null;
};

export type CreateMapSignalInput = {
  body: string;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  latitude: number;
  longitude: number;
  activityTags: string[];
  moodTags: string[];
  precision: 'approximate' | 'city';
};

function clean(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function tags(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}

function objects(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function toSignal(row: Record<string, unknown>): MapSignal | null {
  const latitude = Number(row.public_latitude);
  const longitude = Number(row.public_longitude);
  if (!clean(row.id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    id: clean(row.id)!,
    authorUserId: clean(row.author_user_id),
    authorName: clean(row.author_name) || 'PLUGGD member',
    authorAvatarUrl: clean(row.author_avatar_url),
    body: clean(row.body),
    city: clean(row.city),
    country: clean(row.country),
    locationLabel: clean(row.location_label),
    latitude,
    longitude,
    precision: clean(row.public_location_precision) || 'approximate',
    precisionRadiusMetres: row.public_precision_radius_meters == null ? null : count(row.public_precision_radius_meters),
    createdAt: clean(row.created_at) || new Date(0).toISOString(),
    expiresAt: clean(row.expires_at),
    sceneMarker: row.is_scene_marker === true,
    promoted: row.is_promoted === true,
    promotionLabel: clean(row.promotion_label),
    tuneInCount: count(row.tune_in_count),
    recentTuneInCount: count(row.recent_tune_in_count),
    commentCount: count(row.comment_count),
    mediaCount: count(row.media_count),
    likeCount: count(row.like_count),
    viewCount: count(row.view_count),
    moodTags: tags(row.mood_tags),
    activityTags: tags(row.activity_tags),
    links: objects(row.links),
    media: objects(row.media),
    tunedIn: row.has_tuned_in === true,
    liked: row.has_liked === true,
  };
}

export async function loadMapSignals(input: {
  bounds?: MapBounds;
  activityTags?: string[];
  moodTags?: string[];
} = {}): Promise<MapSignal[]> {
  const bounds = input.bounds ?? { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90, zoom: null };
  const { data, error } = await (supabase as any).rpc('get_public_map_signals', {
    p_min_lng: bounds.minLng,
    p_min_lat: bounds.minLat,
    p_max_lng: bounds.maxLng,
    p_max_lat: bounds.maxLat,
    p_zoom: bounds.zoom ?? null,
    p_limit: 500,
    p_cursor: null,
    p_hub_id: null,
    p_time_window_hours: 168,
    p_activity_tags: input.activityTags?.length ? input.activityTags : null,
    p_mood_tags: input.moodTags?.length ? input.moodTags : null,
  });
  if (error) throw new Error(error.message || 'Map signals could not load.');
  return (Array.isArray(data) ? data : []).flatMap((row: Record<string, unknown>) => {
    const signal = toSignal(row);
    return signal ? [signal] : [];
  });
}

export async function tuneInMapSignal(signalId: string) {
  const { data, error } = await (supabase as any).rpc('tune_in_map_signal', { p_signal_id: signalId });
  if (error) throw new Error(error.message || 'Tune In could not be updated.');
  const row = Array.isArray(data) ? data[0] : data;
  return { tunedIn: Boolean(row?.tuned_in), count: count(row?.tune_in_count) };
}

export async function toggleMapSignalLike(signalId: string) {
  const { data, error } = await (supabase as any).rpc('toggle_map_signal_like', { p_signal_id: signalId });
  if (error) throw new Error(error.message || 'Like could not be updated.');
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: Boolean(row?.liked), count: count(row?.like_count) };
}

export async function createAndPublishMapSignal(input: CreateMapSignalInput) {
  const { data: created, error: createError } = await (supabase as any).rpc('create_map_signal', {
    p_body: input.body,
    p_city: input.city || null,
    p_country: input.country || null,
    p_location_label: input.locationLabel || null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_activity_tags: input.activityTags,
    p_mood_tags: input.moodTags,
    p_links: [],
    p_location_precision: input.precision,
  });
  if (createError) throw new Error(createError.message || 'Signal could not be created.');
  const createdRow = Array.isArray(created) ? created[0] : created;
  const signalId = clean(createdRow?.id);
  if (!signalId) throw new Error('Signal creation was not confirmed.');

  const { data: published, error: publishError } = await (supabase as any).rpc('publish_map_signal', { p_signal_id: signalId });
  if (publishError) throw new Error(`Your signal was saved as a draft but could not be published. ${publishError.message || ''}`.trim());
  return { id: clean((Array.isArray(published) ? published[0] : published)?.id) || signalId };
}
