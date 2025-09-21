export interface UnifiedCatalogItem {
  id: string;
  title: string;
  artist: string;
  type: 'beat' | 'release' | 'sample_pack';
  price: number;
  imageUrl?: string;
  audioUrl?: string;
  downloadUrl?: string;
  genre?: string;
  bpm?: number;
  tags?: string[];
  isFeatured?: boolean;
  isPublished?: boolean;
  createdAt: string;
  userId: string;
  // Type-specific fields
  payWhatYouWant?: boolean;
  minimumPrice?: number;
  description?: string;
  trackCount?: number;
  sampleCount?: number;
}

export interface Beat {
  id: string;
  title?: string;
  producer_name?: string;
  genre?: string;
  price?: number;
  image_url?: string;
  audio_url?: string;
  bpm?: number;
  tags?: string[];
  is_featured?: boolean;
  is_published?: boolean;
  created_at: string;
  user_id: string;
}

export interface Release {
  id: string;
  title?: string;
  artist?: string;
  genre?: string;
  price?: number;
  download_price?: number;
  cover_art_url?: string;
  audio_url?: string;
  download_url?: string;
  pay_what_you_want?: boolean;
  minimum_price?: number;
  description?: string;
  is_featured?: boolean;
  created_at: string;
  user_id: string;
}

export interface SamplePack {
  id: string;
  title?: string;
  producer_name?: string;
  genre?: string;
  price?: number;
  cover_art_url?: string;
  sample_count?: number;
  bpm?: number;
  tags?: string[];
  is_featured?: boolean;
  created_at: string;
  user_id: string;
}

export function normalizeBeat(beat: Beat): UnifiedCatalogItem {
  return {
    id: beat.id,
    title: beat.title || 'Untitled Beat',
    artist: beat.producer_name || 'Unknown Producer',
    type: 'beat',
    price: beat.price || 0,
    imageUrl: beat.image_url,
    audioUrl: beat.audio_url,
    genre: beat.genre,
    bpm: beat.bpm,
    tags: beat.tags || [],
    isFeatured: beat.is_featured || false,
    isPublished: beat.is_published || false,
    createdAt: beat.created_at,
    userId: beat.user_id,
  };
}

export function normalizeRelease(release: Release): UnifiedCatalogItem {
  return {
    id: release.id,
    title: release.title || 'Untitled Release',
    artist: release.artist || 'Unknown Artist',
    type: 'release',
    price: release.download_price || release.price || 0,
    imageUrl: release.cover_art_url,
    audioUrl: release.audio_url,
    downloadUrl: release.download_url,
    genre: release.genre,
    payWhatYouWant: release.pay_what_you_want || false,
    minimumPrice: release.minimum_price,
    description: release.description,
    isFeatured: release.is_featured || false,
    isPublished: true, // Releases don't have published status
    createdAt: release.created_at,
    userId: release.user_id,
  };
}

export function normalizeSamplePack(samplePack: SamplePack): UnifiedCatalogItem {
  return {
    id: samplePack.id,
    title: samplePack.title || 'Untitled Sample Pack',
    artist: samplePack.producer_name || 'Unknown Producer',
    type: 'sample_pack',
    price: samplePack.price || 0,
    imageUrl: samplePack.cover_art_url,
    genre: samplePack.genre,
    bpm: samplePack.bpm,
    tags: samplePack.tags || [],
    sampleCount: samplePack.sample_count,
    isFeatured: samplePack.is_featured || false,
    isPublished: true, // Sample packs don't have published status
    createdAt: samplePack.created_at,
    userId: samplePack.user_id,
  };
}

export function normalizeToUnifiedCatalog(
  beats: Beat[] = [],
  releases: Release[] = [],
  samplePacks: SamplePack[] = []
): UnifiedCatalogItem[] {
  const normalizedBeats = beats.map(normalizeBeat);
  const normalizedReleases = releases.map(normalizeRelease);
  const normalizedSamplePacks = samplePacks.map(normalizeSamplePack);

  return [...normalizedBeats, ...normalizedReleases, ...normalizedSamplePacks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}