import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';

export type OwnerCatalogKind = 'release' | 'beat' | 'mix';

export type OwnerCatalogAsset = {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
};

export type OwnerReleaseTrack = {
  id: string;
  title: string;
  trackNumber: number;
  duration: number | null;
  audioUrl: string | null;
  audioFileId: string | null;
  explicit: boolean | null;
  owns100Percent: boolean;
  rightsConfirmed: boolean;
};

export type OwnerCatalogRecord = {
  id: string;
  kind: OwnerCatalogKind;
  title: string;
  description: string;
  artworkUrl: string | null;
  publicRoute: string;
  status: string;
  moderationStatus: string | null;
  isPublic: boolean;
  raw: Record<string, any>;
  tracks: OwnerReleaseTrack[];
};

type CatalogSaveInput = {
  title: string;
  description: string;
  artist?: string;
  releaseDate?: string;
  releaseType?: string;
  genre?: string;
  subGenre?: string;
  language?: string;
  label?: string;
  explicit?: boolean;
  instrumental?: boolean;
  owns100Percent?: boolean;
  rightsConfirmed?: boolean;
  creditsPrice?: number | null;
  directSales?: boolean;
  producerName?: string;
  bpm?: number | null;
  musicalKey?: string;
  price?: number | null;
  tags?: string[];
  moods?: string[];
  instruments?: string[];
  availableLicenses?: string[];
  licensePrices?: Record<string, number>;
  stemsRequired?: boolean;
  visibility?: 'public' | 'private' | 'unlisted';
  allowDownload?: boolean;
  recordingType?: string;
  eventName?: string;
  city?: string;
  bpmMin?: number | null;
  bpmMax?: number | null;
};

function cleanList(values: string[] | undefined) {
  return [...new Set((values || []).map((value) => value.trim()).filter(Boolean))];
}

function cleanName(value: string, fallback: string) {
  const cleaned = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-96);
  return cleaned || fallback;
}

function extensionFor(asset: OwnerCatalogAsset, fallback: string) {
  const extension = asset.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || fallback;
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in again to manage your catalogue.');
  return data.user.id;
}

async function readableAssetSize(asset: OwnerCatalogAsset) {
  if (asset.size && asset.size > 0) return Math.round(asset.size);
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists || typeof info.size !== 'number' || info.size <= 0) {
    throw new Error(`PLUGGD could not read ${asset.name}. Choose the file again.`);
  }
  return Math.round(info.size);
}

function mapTrack(row: any): OwnerReleaseTrack {
  return {
    id: String(row.id),
    title: String(row.title || 'Untitled track'),
    trackNumber: Number(row.track_number || 1),
    duration: Number.isFinite(Number(row.duration)) ? Number(row.duration) : null,
    audioUrl: typeof row.audio_url === 'string' ? row.audio_url : null,
    audioFileId: typeof row.audio_file_id === 'string' ? row.audio_file_id : null,
    explicit: typeof row.explicit === 'boolean' ? row.explicit : null,
    owns100Percent: Boolean(row.owns_100_percent),
    rightsConfirmed: Boolean(row.distribution_rights_confirmed),
  };
}

export async function loadOwnerCatalogRecord(kind: OwnerCatalogKind, id: string): Promise<OwnerCatalogRecord> {
  const userId = await currentUserId();
  const db = supabase as any;
  const table = kind === 'release' ? 'releases' : kind === 'beat' ? 'beats' : 'mixes';
  const ownerColumn = kind === 'mix' ? 'owner_user_id' : 'user_id';
  const result = await db.from(table).select('*').eq('id', id).eq(ownerColumn, userId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.id) throw new Error('This item is not available in your Creator Studio.');
  const row = result.data as Record<string, any>;

  let tracks: OwnerReleaseTrack[] = [];
  if (kind === 'release') {
    let trackResult = await db.from('tracks').select('id,title,track_number,duration,audio_url,audio_file_id,explicit,owns_100_percent,distribution_rights_confirmed').eq('release_id', id).order('track_number');
    if (trackResult.error && /audio_file_id/i.test(String(trackResult.error.message || ''))) {
      trackResult = await db.from('tracks').select('id,title,track_number,duration,audio_url,explicit,owns_100_percent,distribution_rights_confirmed').eq('release_id', id).order('track_number');
    }
    if (trackResult.error) throw trackResult.error;
    tracks = (trackResult.data || []).map(mapTrack);
  }

  const status = kind === 'release' ? String(row.status || 'draft') : kind === 'beat' ? (row.is_published ? 'published' : 'draft') : String(row.status || 'draft');
  const publicRoute = kind === 'release' ? `/release/${id}` : kind === 'beat' ? `/beat/${id}` : `/mixes/${row.slug || id}`;
  const isPublic = kind === 'release'
    ? row.visibility_status === 'visible' && Boolean(row.approved || row.approval_status === 'approved') && ['live', 'approved', 'scheduled', 'published'].includes(String(row.status || '').toLowerCase())
    : kind === 'beat'
      ? Boolean(row.is_published)
      : row.status === 'published' && row.visibility === 'public';

  return {
    id,
    kind,
    title: String(row.title || ''),
    description: String(row.description || ''),
    artworkUrl: kind === 'release' ? row.cover_art_url || null : kind === 'beat' ? row.image_url || null : row.cover_url || null,
    publicRoute,
    status,
    moderationStatus: kind === 'release' ? String(row.approval_status || '') || null : kind === 'beat' ? String(row.moderation_status || '') || null : null,
    isPublic,
    raw: row,
    tracks,
  };
}

export async function saveOwnerCatalogRecord(record: OwnerCatalogRecord, input: CatalogSaveInput) {
  const userId = await currentUserId();
  const db = supabase as any;
  const title = input.title.trim();
  if (!title) throw new Error('Add a title before saving.');
  const description = input.description.trim() || null;

  if (record.kind === 'release') {
    const liveEdit = ['live', 'approved', 'scheduled'].includes(String(record.raw.status || '').toLowerCase());
    const payload: Record<string, any> = {
      title,
      description,
      artist: input.artist?.trim() || record.raw.artist || 'PLUGGD creator',
      release_date: input.releaseDate?.trim() || null,
      release_type: input.releaseType?.trim() || 'Single',
      genre: input.genre?.trim() || null,
      primary_genre: input.genre?.trim() || null,
      sub_genre: input.subGenre?.trim() || null,
      language: input.language?.trim() || 'English',
      label: input.label?.trim() || null,
      explicit: Boolean(input.explicit),
      is_instrumental: Boolean(input.instrumental),
      owns_100_percent: Boolean(input.owns100Percent),
      distribution_rights_confirmed: Boolean(input.rightsConfirmed),
      credits_price: input.creditsPrice == null ? null : Math.max(0, input.creditsPrice),
      enable_direct_sales: Boolean(input.directSales),
    };
    if (liveEdit) Object.assign(payload, { status: 'submitted', approved: false, approval_status: 'pending', visibility_status: 'staged' });
    const result = await db.from('releases').update(payload).eq('id', record.id).eq('user_id', userId).select('id').single();
    if (result.error) throw result.error;
    return;
  }

  if (record.kind === 'beat') {
    const wasPublic = Boolean(record.raw.is_published);
    const payload: Record<string, any> = {
      title,
      description,
      producer_name: input.producerName?.trim() || null,
      genre: input.genre?.trim() || null,
      bpm: input.bpm == null ? null : Math.max(1, Math.round(input.bpm)),
      key: input.musicalKey?.trim() || null,
      price: input.price == null ? 0 : Math.max(0, input.price),
      tags: cleanList(input.tags),
      moods: cleanList(input.moods),
      instruments: cleanList(input.instruments),
      available_licenses: cleanList(input.availableLicenses),
      license_prices: input.licensePrices || {},
      stems_required: Boolean(input.stemsRequired),
    };
    if (wasPublic) Object.assign(payload, { is_published: false, moderation_status: 'pending' });
    const result = await db.from('beats').update(payload).eq('id', record.id).eq('user_id', userId).select('id').single();
    if (result.error) throw result.error;
    return;
  }

  const payload = {
    title,
    description,
    genre_tags: cleanList(input.tags),
    mood_tags: cleanList(input.moods),
    visibility: input.visibility || 'private',
    allow_download: Boolean(input.allowDownload),
    recording_type: input.recordingType?.trim() || null,
    event_name: input.eventName?.trim() || null,
    city: input.city?.trim() || null,
    bpm_min: input.bpmMin == null ? null : Math.max(1, Math.round(input.bpmMin)),
    bpm_max: input.bpmMax == null ? null : Math.max(1, Math.round(input.bpmMax)),
  };
  const result = await db.from('mixes').update(payload).eq('id', record.id).eq('owner_user_id', userId).select('id').single();
  if (result.error) throw result.error;
}

export async function submitOwnerCatalogForReview(record: OwnerCatalogRecord) {
  const userId = await currentUserId();
  const db = supabase as any;
  if (record.kind === 'release') {
    if (!record.raw.distribution_rights_confirmed) throw new Error('Confirm distribution rights before submitting this release.');
    const result = await db.from('releases').update({ status: 'submitted', approved: false, approval_status: 'pending', visibility_status: 'staged' }).eq('id', record.id).eq('user_id', userId).select('id').single();
    if (result.error) throw result.error;
    return;
  }
  if (record.kind === 'beat') {
    if (record.raw.moderation_status === 'approved') {
      const result = await db.from('beats').update({ is_published: true }).eq('id', record.id).eq('user_id', userId).select('id').single();
      if (result.error) throw result.error;
      return;
    }
    const result = await db.from('beats').update({ is_published: false, moderation_status: 'under_review' }).eq('id', record.id).eq('user_id', userId).select('id').single();
    if (result.error) throw result.error;
    return;
  }
  const visibility = record.raw.visibility === 'private' ? 'unlisted' : record.raw.visibility;
  const result = await db.from('mixes').update({ status: 'published', visibility, published_at: new Date().toISOString() }).eq('id', record.id).eq('owner_user_id', userId).select('id').single();
  if (result.error) throw result.error;
}

export async function removeOwnerCatalogFromPublic(record: OwnerCatalogRecord) {
  const userId = await currentUserId();
  const db = supabase as any;
  const query = record.kind === 'release'
    ? db.from('releases').update({ status: 'hidden', visibility_status: 'hidden', approved: false }).eq('id', record.id).eq('user_id', userId)
    : record.kind === 'beat'
      ? db.from('beats').update({ is_published: false }).eq('id', record.id).eq('user_id', userId)
      : db.from('mixes').update({ status: 'archived', visibility: 'private', published_at: null }).eq('id', record.id).eq('owner_user_id', userId);
  const result = await query.select('id').single();
  if (result.error) throw result.error;
}

export async function restoreOwnerCatalogDraft(record: OwnerCatalogRecord) {
  const userId = await currentUserId();
  const db = supabase as any;
  const query = record.kind === 'release'
    ? db.from('releases').update({ status: 'draft', visibility_status: 'staged', approved: false, approval_status: 'pending' }).eq('id', record.id).eq('user_id', userId)
    : record.kind === 'beat'
      ? db.from('beats').update({ is_published: false, moderation_status: record.raw.moderation_status === 'hidden' ? 'pending' : record.raw.moderation_status }).eq('id', record.id).eq('user_id', userId)
      : db.from('mixes').update({ status: 'draft', visibility: 'private', published_at: null }).eq('id', record.id).eq('owner_user_id', userId);
  const result = await query.select('id').single();
  if (result.error) throw result.error;
}

const RELEASE_COPY_FIELDS = [
  'artist', 'description', 'release_date', 'cover_art_url', 'genre', 'release_type', 'explicit', 'is_instrumental',
  'credits_json', 'featured_artists', 'owns_100_percent', 'distribution_rights_confirmed', 'label', 'producer',
  'executive_producer', 'songwriter', 'composer', 'mixing_engineer', 'mastering_engineer', 'recording_engineer',
  'additional_credits', 'primary_genre', 'sub_genre', 'mood_tags', 'language', 'producers', 'songwriters',
  'composers', 'publisher_name', 'pro_affiliation', 'ipi_number', 'credits_price', 'enable_direct_sales',
] as const;

function pickFields(source: Record<string, any>, fields: readonly string[]) {
  return Object.fromEntries(fields.flatMap((field) => source[field] === undefined ? [] : [[field, source[field]]]));
}

export async function duplicateOwnerCatalogRecord(record: OwnerCatalogRecord) {
  const userId = await currentUserId();
  const db = supabase as any;
  if (record.kind === 'release') {
    const payload = {
      ...pickFields(record.raw, RELEASE_COPY_FIELDS),
      title: `Copy of ${record.title}`,
      user_id: userId,
      owner_type: 'profile',
      owner_id: userId,
      status: 'draft',
      approved: false,
      approval_status: 'pending',
      visibility_status: 'staged',
      catalogue_mode: 'pluggd',
      slug: null,
      scheduled_publish_date: null,
    };
    const releaseResult = await db.from('releases').insert(payload).select('id').single();
    if (releaseResult.error || !releaseResult.data?.id) throw releaseResult.error || new Error('Release copy was not created.');
    const newId = String(releaseResult.data.id);
    if (record.tracks.length) {
      const trackRows = record.tracks.map((track) => ({
        release_id: newId,
        title: track.title,
        track_number: track.trackNumber,
        audio_url: track.audioUrl,
        audio_file_id: track.audioFileId,
        duration: track.duration,
        explicit: track.explicit,
        explicit_status: track.explicit == null ? 'unknown' : track.explicit ? 'explicit' : 'clean',
        owns_100_percent: track.owns100Percent,
        distribution_rights_confirmed: track.rightsConfirmed,
        playable_on_pluggd: false,
        audio_rights_status: track.rightsConfirmed ? 'artist_authorized' : 'unlicensed',
        owner_type: 'profile',
        owner_id: userId,
      }));
      const trackResult = await db.from('tracks').insert(trackRows);
      if (trackResult.error) {
        await db.from('releases').delete().eq('id', newId).eq('user_id', userId);
        throw trackResult.error;
      }
    }
    return { id: newId, kind: record.kind };
  }

  if (record.kind === 'beat') {
    const payload = {
      ...pickFields(record.raw, ['description', 'genre', 'bpm', 'key', 'price', 'audio_url', 'audio_file_id', 'image_url', 'tags', 'moods', 'instruments', 'stems_url', 'tagged_url', 'license_types', 'producer_name', 'available_licenses', 'license_prices', 'stems_required']),
      user_id: userId,
      title: `Copy of ${record.title}`,
      is_published: false,
      moderation_status: 'pending',
      slug: null,
      is_featured: false,
    };
    const result = await db.from('beats').insert(payload).select('id').single();
    if (result.error || !result.data?.id) throw result.error || new Error('Beat copy was not created.');
    return { id: String(result.data.id), kind: record.kind };
  }

  const payload = {
    ...pickFields(record.raw, ['description', 'cover_url', 'audio_url', 'audio_file_id', 'duration_seconds', 'city', 'genre_tags', 'mood_tags', 'recording_type', 'event_name', 'bpm_min', 'bpm_max', 'allow_download']),
    owner_user_id: userId,
    title: `Copy of ${record.title}`,
    slug: null,
    status: 'draft',
    visibility: 'private',
    published_at: null,
  };
  const result = await db.from('mixes').insert(payload).select('id').single();
  if (result.error || !result.data?.id) throw result.error || new Error('Mix copy was not created.');
  return { id: String(result.data.id), kind: record.kind };
}

export async function replaceOwnerCatalogArtwork(record: OwnerCatalogRecord, asset: OwnerCatalogAsset) {
  const userId = await currentUserId();
  const path = `${userId}/${record.kind}/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(asset, 'jpg')}`;
  await uploadFileToSupabaseStorage({ bucket: 'release-artwork', path, uri: asset.uri, contentType: asset.mimeType || 'image/jpeg' });
  const url = supabase.storage.from('release-artwork').getPublicUrl(path).data.publicUrl;
  const db = supabase as any;
  const table = record.kind === 'release' ? 'releases' : record.kind === 'beat' ? 'beats' : 'mixes';
  const ownerColumn = record.kind === 'mix' ? 'owner_user_id' : 'user_id';
  const artworkColumn = record.kind === 'release' ? 'cover_art_url' : record.kind === 'beat' ? 'image_url' : 'cover_url';
  const result = await db.from(table).update({ [artworkColumn]: url }).eq('id', record.id).eq(ownerColumn, userId).select('id').single();
  if (result.error) {
    await supabase.storage.from('release-artwork').remove([path]);
    throw result.error;
  }
}

async function createReplacementAudio(asset: OwnerCatalogAsset, kind: OwnerCatalogKind) {
  const userId = await currentUserId();
  const uploadId = Crypto.randomUUID();
  const path = `${userId}/${kind}/${Date.now()}-${uploadId}.${extensionFor(asset, 'mp3')}`;
  const size = await readableAssetSize(asset);
  await uploadFileToSupabaseStorage({ bucket: 'audio-files', path, uri: asset.uri, contentType: asset.mimeType || 'audio/mpeg' });
  const streamUrl = supabase.storage.from('audio-files').getPublicUrl(path).data.publicUrl;
  const db = supabase as any;
  const result = await db.from('audio_files').insert({
    user_id: userId,
    file_name: cleanName(asset.name, `${kind}-audio`),
    file_size: size,
    file_type: asset.mimeType || 'audio/mpeg',
    storage_path: path,
    stream_url: streamUrl,
    processing_status: 'pending',
    upload_session_id: uploadId,
  }).select('id').single();
  if (result.error || !result.data?.id) {
    await supabase.storage.from('audio-files').remove([path]);
    throw result.error || new Error('Audio record was not created.');
  }
  return { id: String(result.data.id), path, size, streamUrl, userId };
}

export async function replaceOwnerCatalogAudio(record: OwnerCatalogRecord, asset: OwnerCatalogAsset, trackId?: string) {
  const replacement = await createReplacementAudio(asset, record.kind);
  const db = supabase as any;
  let previous: { audio_url?: string | null; audio_file_id?: string | null } | null = null;
  try {
    if (record.kind === 'release') {
      if (!trackId || !record.tracks.some((track) => track.id === trackId)) throw new Error('Choose an owned release track before replacing audio.');
      previous = await db.from('tracks').select('audio_url,audio_file_id').eq('id', trackId).eq('release_id', record.id).single().then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      });
      const update = await db.from('tracks').update({ audio_url: replacement.streamUrl, audio_file_id: replacement.id, playable_on_pluggd: false }).eq('id', trackId).eq('release_id', record.id).select('id').single();
      if (update.error) throw update.error;
    } else {
      const table = record.kind === 'beat' ? 'beats' : 'mixes';
      const ownerColumn = record.kind === 'mix' ? 'owner_user_id' : 'user_id';
      const current = await db.from(table).select('audio_url,audio_file_id').eq('id', record.id).eq(ownerColumn, replacement.userId).single();
      if (current.error) throw current.error;
      previous = current.data;
      const payload = record.kind === 'beat'
        ? { audio_url: replacement.streamUrl, audio_file_id: replacement.id, is_published: false, moderation_status: 'pending' }
        : { audio_url: replacement.streamUrl, audio_file_id: replacement.id, status: 'draft', visibility: 'private', published_at: null };
      const update = await db.from(table).update(payload).eq('id', record.id).eq(ownerColumn, replacement.userId).select('id').single();
      if (update.error) throw update.error;
    }

    const processing = await supabase.functions.invoke('process-audio-upload', { body: { audioFileId: replacement.id, filePath: replacement.path, fileSize: replacement.size, fileName: asset.name, fileType: asset.mimeType || 'audio/mpeg' } });
    if (processing.error) throw new Error(`Audio processing could not start: ${processing.error.message}`);
  } catch (error) {
    if (previous) {
      if (record.kind === 'release' && trackId) await db.from('tracks').update(previous).eq('id', trackId).eq('release_id', record.id);
      if (record.kind === 'beat') await db.from('beats').update(previous).eq('id', record.id).eq('user_id', replacement.userId);
      if (record.kind === 'mix') await db.from('mixes').update(previous).eq('id', record.id).eq('owner_user_id', replacement.userId);
    }
    await db.from('audio_files').delete().eq('id', replacement.id).eq('user_id', replacement.userId);
    await supabase.storage.from('audio-files').remove([replacement.path]);
    throw error;
  }
}

export async function addOwnedReleaseTrack(record: OwnerCatalogRecord, title: string, asset: OwnerCatalogAsset) {
  if (record.kind !== 'release') throw new Error('Tracks can only be added to a release.');
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('Name the track before adding its audio.');
  const userId = await currentUserId();
  const db = supabase as any;
  const owner = await db.from('releases').select('id').eq('id', record.id).eq('user_id', userId).maybeSingle();
  if (owner.error || !owner.data?.id) throw owner.error || new Error('Release ownership could not be confirmed.');
  const replacement = await createReplacementAudio(asset, 'release');
  let trackId: string | null = null;
  try {
    const result = await db.from('tracks').insert({
      release_id: record.id,
      title: cleanTitle,
      track_number: record.tracks.length + 1,
      audio_url: replacement.streamUrl,
      audio_file_id: replacement.id,
      owner_type: 'profile',
      owner_id: userId,
      playable_on_pluggd: false,
      audio_rights_status: 'unlicensed',
      explicit: null,
      explicit_status: 'unknown',
    }).select('id').single();
    if (result.error || !result.data?.id) throw result.error || new Error('Track row was not created.');
    trackId = String(result.data.id);
    const processing = await supabase.functions.invoke('process-audio-upload', { body: { audioFileId: replacement.id, filePath: replacement.path, fileSize: replacement.size, fileName: asset.name, fileType: asset.mimeType || 'audio/mpeg' } });
    if (processing.error) throw new Error(`Audio processing could not start: ${processing.error.message}`);
  } catch (error) {
    if (trackId) await db.from('tracks').delete().eq('id', trackId).eq('release_id', record.id);
    await db.from('audio_files').delete().eq('id', replacement.id).eq('user_id', userId);
    await supabase.storage.from('audio-files').remove([replacement.path]);
    throw error;
  }
}

export async function saveOwnedReleaseTrack(record: OwnerCatalogRecord, track: OwnerReleaseTrack) {
  if (record.kind !== 'release' || !record.tracks.some((candidate) => candidate.id === track.id)) throw new Error('Owned release track not found.');
  const userId = await currentUserId();
  const db = supabase as any;
  const owner = await db.from('releases').select('id').eq('id', record.id).eq('user_id', userId).maybeSingle();
  if (owner.error || !owner.data?.id) throw owner.error || new Error('Release ownership could not be confirmed.');
  const result = await db.from('tracks').update({
    title: track.title.trim(),
    explicit: track.explicit,
    explicit_status: track.explicit == null ? 'unknown' : track.explicit ? 'explicit' : 'clean',
    owns_100_percent: track.owns100Percent,
    distribution_rights_confirmed: track.rightsConfirmed,
    audio_rights_status: track.rightsConfirmed ? 'artist_authorized' : 'unlicensed',
    playable_on_pluggd: Boolean(track.audioUrl && track.rightsConfirmed),
  }).eq('id', track.id).eq('release_id', record.id).select('id').single();
  if (result.error) throw result.error;
}

export async function moveOwnedReleaseTrack(record: OwnerCatalogRecord, trackId: string, direction: -1 | 1) {
  if (record.kind !== 'release') throw new Error('Track ordering is available for releases.');
  const userId = await currentUserId();
  const db = supabase as any;
  const owner = await db.from('releases').select('id').eq('id', record.id).eq('user_id', userId).maybeSingle();
  if (owner.error || !owner.data?.id) throw owner.error || new Error('Release ownership could not be confirmed.');
  const ordered = [...record.tracks].sort((left, right) => left.trackNumber - right.trackNumber);
  const index = ordered.findIndex((track) => track.id === trackId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  try {
    for (let position = 0; position < ordered.length; position += 1) {
      const result = await db.from('tracks').update({ track_number: 1000 + position }).eq('id', ordered[position].id).eq('release_id', record.id);
      if (result.error) throw result.error;
    }
    for (let position = 0; position < ordered.length; position += 1) {
      const result = await db.from('tracks').update({ track_number: position + 1 }).eq('id', ordered[position].id).eq('release_id', record.id);
      if (result.error) throw result.error;
    }
  } catch (error) {
    for (const track of record.tracks) await db.from('tracks').update({ track_number: track.trackNumber }).eq('id', track.id).eq('release_id', record.id);
    throw error;
  }
}
