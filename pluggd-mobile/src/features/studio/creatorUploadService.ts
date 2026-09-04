import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';

export type CreatorUploadKind = 'release' | 'beat' | 'mix';
export type CreatorReleaseAiUseDeclaration = '' | 'none' | 'assisted' | 'generated';
export type CreatorReleaseAiGeneratedElement = 'lyrics' | 'composition' | 'vocals' | 'instrumentals' | 'other_audio';
export type CreatorReleaseAiAudioScope = '' | 'part' | 'all';
export type CreatorReleaseAiArtistIdentity = '' | 'human' | 'ai_persona';

export type CreatorUploadAsset = {
  name: string;
  uri: string;
  size?: number | null;
  mimeType?: string | null;
};

export type CreatorReleaseTrackInput = {
  id: string;
  title: string;
  audio: CreatorUploadAsset | null;
};

export type CreatorBeatLicenseKey = 'basic_lease' | 'premium_lease' | 'unlimited_lease' | 'exclusive_rights';
export type CreatorBeatLicenseInput = {
  key: CreatorBeatLicenseKey;
  enabled: boolean;
  price: string;
};

export type CreatorUploadDraftInput = {
  kind: CreatorUploadKind;
  title: string;
  creator: string;
  genre: string;
  primaryGenre: string;
  subGenre: string;
  releaseType: string;
  releaseDate: string;
  language: string;
  label: string;
  featuredArtists: string[];
  producers: string[];
  songwriters: string[];
  composers: string[];
  executiveProducer: string;
  mixingEngineer: string;
  masteringEngineer: string;
  recordingEngineer: string;
  additionalTracks: CreatorReleaseTrackInput[];
  bpm: string;
  musicalKey: string;
  tags: string[];
  moods: string[];
  instruments: string[];
  beatLicenses: CreatorBeatLicenseInput[];
  exclusiveRightsAuthorized: boolean;
  recordingType: string;
  eventName: string;
  city: string;
  bpmMin: string;
  bpmMax: string;
  visibility: 'private' | 'unlisted' | 'public';
  allowDownloads: boolean;
  description: string;
  rightsOwner: string;
  tracklist: string;
  explicit: boolean;
  instrumental: boolean;
  owns100Percent: boolean;
  rightsConfirmed: boolean;
  aiUseDeclaration: CreatorReleaseAiUseDeclaration;
  aiGeneratedElements: CreatorReleaseAiGeneratedElement[];
  aiAudioScope: CreatorReleaseAiAudioScope;
  aiArtistIdentity: CreatorReleaseAiArtistIdentity;
  aiRightsConfirmed: boolean;
  aiNoImpersonationConfirmed: boolean;
  artwork: CreatorUploadAsset | null;
  audio: CreatorUploadAsset | null;
  stems: CreatorUploadAsset | null;
  taggedPreview: CreatorUploadAsset | null;
};

export type CreatorUploadStage = 'artwork' | 'audio' | 'draft' | 'processing';

export type CreatorUploadResult = {
  catalogId: string;
  trackId: string | null;
  audioFileId: string;
  processingStatus: 'processing';
};

type CreatedRows = {
  catalogId?: string;
  trackIds: string[];
  audioFileIds: string[];
};

type UploadedObject = { bucket: string; path: string };
const RELEASE_AI_AUDIO_ELEMENTS: CreatorReleaseAiGeneratedElement[] = ['vocals', 'instrumentals', 'other_audio'];

function cleanName(value: string, fallback: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-96);
  return cleaned || fallback;
}

function extensionFor(asset: CreatorUploadAsset, fallback: string) {
  const extension = asset.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || fallback;
}

function parseReleaseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return trimmed;
    throw new Error('Add a valid release date.');
  }
  const match = trimmed.match(/^(\d{1,2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{4})$/);
  if (!match) throw new Error('Use DD / MM / YYYY for the release date.');
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Add a valid release date.');
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function assetSize(asset: CreatorUploadAsset) {
  if (asset.size && asset.size > 0) return Math.round(asset.size);
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists || typeof info.size !== 'number' || info.size <= 0) {
    throw new Error(`PLUGGD could not read ${asset.name}. Choose the file again.`);
  }
  return Math.round(info.size);
}

async function rollback(rows: CreatedRows, objects: UploadedObject[], kind: CreatorUploadKind) {
  const db = supabase as any;
  if (rows.trackIds.length) await db.from('tracks').delete().in('id', rows.trackIds);
  if (rows.catalogId) {
    const table = kind === 'release' ? 'releases' : kind === 'beat' ? 'beats' : 'mixes';
    await db.from(table).delete().eq('id', rows.catalogId);
  }
  if (rows.audioFileIds.length) await db.from('audio_files').delete().in('id', rows.audioFileIds);
  for (const object of [...objects].reverse()) {
    await supabase.storage.from(object.bucket).remove([object.path]);
  }
}

function releaseAiDisclosureErrors(draft: CreatorUploadDraftInput) {
  if (!draft.aiUseDeclaration) return ['Choose how AI was used on this release'];
  if (draft.aiUseDeclaration !== 'generated') return [];

  const errors: string[] = [];
  const hasGeneratedAudio = draft.aiGeneratedElements.some((element) => RELEASE_AI_AUDIO_ELEMENTS.includes(element));
  if (draft.aiGeneratedElements.length === 0) errors.push('Select what AI generated');
  if (hasGeneratedAudio && !draft.aiAudioScope) errors.push('Choose how much of the audio was AI-generated');
  if (hasGeneratedAudio && draft.aiAudioScope === 'all' && !draft.aiArtistIdentity) {
    errors.push('Confirm whether the artist identity is human or an AI persona');
  }
  if (!draft.aiRightsConfirmed) errors.push('Confirm the rights to the AI-generated elements');
  if (!draft.aiNoImpersonationConfirmed) errors.push('Confirm the release does not use an unauthorised imitation');
  return errors;
}

function buildReleaseAiDisclosure(draft: CreatorUploadDraftInput) {
  if (!draft.aiUseDeclaration) return null;
  if (draft.aiUseDeclaration !== 'generated') {
    return {
      version: 1,
      classification: draft.aiUseDeclaration,
      generated_elements: [],
      audio_scope: null,
      artist_identity: null,
      rights_confirmed: false,
      no_impersonation_confirmed: false,
    } as const;
  }

  const hasGeneratedAudio = draft.aiGeneratedElements.some((element) => RELEASE_AI_AUDIO_ELEMENTS.includes(element));
  return {
    version: 1,
    classification: draft.aiUseDeclaration,
    generated_elements: draft.aiGeneratedElements,
    audio_scope: hasGeneratedAudio && draft.aiAudioScope ? draft.aiAudioScope : null,
    artist_identity: hasGeneratedAudio && draft.aiAudioScope === 'all' && draft.aiArtistIdentity
      ? draft.aiArtistIdentity
      : null,
    rights_confirmed: draft.aiRightsConfirmed,
    no_impersonation_confirmed: draft.aiNoImpersonationConfirmed,
  } as const;
}

function requireCompleteDraft(draft: CreatorUploadDraftInput): asserts draft is CreatorUploadDraftInput & {
  artwork: CreatorUploadAsset;
  audio: CreatorUploadAsset;
} {
  if (!draft.title.trim() || !draft.creator.trim() || !draft.genre.trim()) {
    throw new Error('Add the title, creator and genre before creating the Studio draft.');
  }
  if (!draft.artwork || !draft.audio) {
    throw new Error('Choose both artwork and audio before creating the Studio draft.');
  }
  if (!draft.rightsOwner.trim() || !draft.rightsConfirmed) {
    throw new Error('Add the rights owner and confirm you control the necessary rights.');
  }
  if (draft.kind === 'release') {
    const incompleteTrack = draft.additionalTracks.find((track) => !track.title.trim() || !track.audio);
    if (incompleteTrack) throw new Error('Add a title and audio file for every release track.');
    const aiErrors = releaseAiDisclosureErrors(draft);
    if (aiErrors.length > 0) throw new Error(`${aiErrors[0]}.`);
  }
  if (draft.kind === 'beat') {
    const enabledLicences = draft.beatLicenses.filter((license) => license.enabled);
    if (!enabledLicences.length) throw new Error('Enable at least one beat licence.');
    if (enabledLicences.some((license) => !Number.isFinite(Number(license.price)) || Number(license.price) < 0)) {
      throw new Error('Add a valid price for every enabled beat licence.');
    }
    const exclusive = enabledLicences.find((license) => license.key === 'exclusive_rights');
    if (exclusive && (!draft.stems || !draft.exclusiveRightsAuthorized)) {
      throw new Error('Exclusive Rights requires stems and your producer authorisation.');
    }
  }
}

export async function createCreatorStudioDraft(
  draft: CreatorUploadDraftInput,
  onStage?: (stage: CreatorUploadStage) => void,
): Promise<CreatorUploadResult> {
  requireCompleteDraft(draft);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Sign in again before creating a Studio draft.');

  const rows: CreatedRows = { trackIds: [], audioFileIds: [] };
  const objects: UploadedObject[] = [];
  const timestamp = Date.now();
  const uploadId = Crypto.randomUUID();
  const artworkPath = `${user.id}/${draft.kind}/${timestamp}-${uploadId}.${extensionFor(draft.artwork, 'jpg')}`;
  const audioPath = `${user.id}/${draft.kind}/${timestamp}-${uploadId}.${extensionFor(draft.audio, 'mp3')}`;

  try {
    onStage?.('artwork');
    await uploadFileToSupabaseStorage({
      bucket: 'release-artwork',
      path: artworkPath,
      uri: draft.artwork.uri,
      contentType: draft.artwork.mimeType || 'image/jpeg',
    });
    objects.push({ bucket: 'release-artwork', path: artworkPath });

    onStage?.('audio');
    const fileSize = await assetSize(draft.audio);
    await uploadFileToSupabaseStorage({
      bucket: 'audio-files',
      path: audioPath,
      uri: draft.audio.uri,
      contentType: draft.audio.mimeType || 'audio/mpeg',
    });
    objects.push({ bucket: 'audio-files', path: audioPath });

    const artworkUrl = supabase.storage.from('release-artwork').getPublicUrl(artworkPath).data.publicUrl;
    const streamUrl = supabase.storage.from('audio-files').getPublicUrl(audioPath).data.publicUrl;
    const db = supabase as any;
    const { data: audioFile, error: audioFileError } = await db
      .from('audio_files')
      .insert({
        user_id: user.id,
        file_name: cleanName(draft.audio.name, `${draft.kind}-audio`),
        file_size: fileSize,
        file_type: draft.audio.mimeType || 'audio/mpeg',
        storage_path: audioPath,
        stream_url: streamUrl,
        processing_status: 'pending',
        upload_session_id: uploadId,
      })
      .select('id')
      .single();
    if (audioFileError || !audioFile?.id) throw audioFileError || new Error('Audio record was not created.');
    rows.audioFileIds.push(String(audioFile.id));

    const supplementaryUrls: { stemsUrl: string | null; taggedUrl: string | null } = { stemsUrl: null, taggedUrl: null };
    for (const [key, asset] of [['stemsUrl', draft.stems], ['taggedUrl', draft.taggedPreview]] as const) {
      if (!asset) continue;
      const fallbackExtension = key === 'stemsUrl' ? 'zip' : 'mp3';
      const fallbackContentType = key === 'stemsUrl' ? 'application/zip' : 'audio/mpeg';
      const path = `${user.id}/${draft.kind}/${timestamp}-${Crypto.randomUUID()}.${extensionFor(asset, fallbackExtension)}`;
      await assetSize(asset);
      await uploadFileToSupabaseStorage({ bucket: 'audio-files', path, uri: asset.uri, contentType: asset.mimeType || fallbackContentType });
      objects.push({ bucket: 'audio-files', path });
      supplementaryUrls[key] = supabase.storage.from('audio-files').getPublicUrl(path).data.publicUrl;
    }

    onStage?.('draft');
    if (draft.kind === 'release') {
      const releaseDate = parseReleaseDate(draft.releaseDate);
      const cleanFeaturedArtists = draft.featuredArtists.map((value) => value.trim()).filter(Boolean);
      const cleanProducers = draft.producers.map((value) => value.trim()).filter(Boolean);
      const cleanSongwriters = draft.songwriters.map((value) => value.trim()).filter(Boolean);
      const cleanComposers = draft.composers.map((value) => value.trim()).filter(Boolean);
      const { data: release, error: releaseError } = await db
        .from('releases')
        .insert({
          title: draft.title.trim(),
          artist: draft.creator.trim(),
          description: draft.description.trim() || null,
          release_date: releaseDate,
          cover_art_url: artworkUrl,
          genre: (draft.primaryGenre || draft.genre).trim(),
          primary_genre: (draft.primaryGenre || draft.genre).trim(),
          sub_genre: draft.subGenre.trim() || null,
          release_type: draft.releaseType.trim() || 'Single',
          language: draft.language.trim() || 'English',
          label: draft.label.trim() || null,
          featured_artist: cleanFeaturedArtists[0] || null,
          featured_artists: cleanFeaturedArtists,
          producer: cleanProducers[0] || null,
          producers: cleanProducers,
          songwriter: cleanSongwriters[0] || null,
          songwriters: cleanSongwriters,
          composer: cleanComposers[0] || null,
          composers: cleanComposers,
          executive_producer: draft.executiveProducer.trim() || null,
          mixing_engineer: draft.mixingEngineer.trim() || null,
          mastering_engineer: draft.masteringEngineer.trim() || null,
          recording_engineer: draft.recordingEngineer.trim() || null,
          user_id: user.id,
          owner_type: 'profile',
          owner_id: user.id,
          approved: false,
          approval_status: 'pending',
          status: 'draft',
          visibility_status: 'staged',
          catalogue_mode: 'pluggd',
          rights_status: 'artist_authorized',
          distribution_rights_confirmed: true,
          explicit: draft.explicit,
          is_instrumental: draft.instrumental,
          owns_100_percent: draft.owns100Percent,
          distribution_settings: {
            rights_owner: draft.rightsOwner.trim(),
            native_upload: true,
            ai_disclosure: buildReleaseAiDisclosure(draft),
          },
        })
        .select('id')
        .single();
      if (releaseError || !release?.id) throw releaseError || new Error('Release draft was not created.');
      rows.catalogId = String(release.id);

      const releaseTracks: Array<{ title: string; asset: CreatorUploadAsset; url: string; audioFileId: string }> = [{ title: draft.title.trim(), asset: draft.audio, url: streamUrl, audioFileId: rows.audioFileIds[0] }];
      for (const extraTrack of draft.additionalTracks) {
        const asset = extraTrack.audio as CreatorUploadAsset;
        const extraId = Crypto.randomUUID();
        const extraPath = `${user.id}/release/${Date.now()}-${extraId}.${extensionFor(asset, 'mp3')}`;
        const extraSize = await assetSize(asset);
        await uploadFileToSupabaseStorage({ bucket: 'audio-files', path: extraPath, uri: asset.uri, contentType: asset.mimeType || 'audio/mpeg' });
        objects.push({ bucket: 'audio-files', path: extraPath });
        const extraUrl = supabase.storage.from('audio-files').getPublicUrl(extraPath).data.publicUrl;
        const extraAudioResult = await db.from('audio_files').insert({ user_id: user.id, file_name: cleanName(asset.name, 'release-audio'), file_size: extraSize, file_type: asset.mimeType || 'audio/mpeg', storage_path: extraPath, stream_url: extraUrl, processing_status: 'pending', upload_session_id: extraId }).select('id').single();
        if (extraAudioResult.error || !extraAudioResult.data?.id) throw extraAudioResult.error || new Error('A release audio record was not created.');
        const extraAudioFileId = String(extraAudioResult.data.id);
        rows.audioFileIds.push(extraAudioFileId);
        const extraProcessing = await supabase.functions.invoke('process-audio-upload', { body: { audioFileId: extraAudioFileId, filePath: extraPath, fileSize: extraSize, fileName: asset.name, fileType: asset.mimeType || 'audio/mpeg' } });
        if (extraProcessing.error) throw new Error(`A release track could not start processing: ${extraProcessing.error.message}`);
        releaseTracks.push({ title: extraTrack.title.trim(), asset, url: extraUrl, audioFileId: extraAudioFileId });
      }
      const trackRows = releaseTracks.map((track, index) => ({
        release_id: rows.catalogId,
        title: track.title,
        track_number: index + 1,
        audio_url: track.url,
        audio_file_id: track.audioFileId,
        playable_on_pluggd: false,
        audio_rights_status: 'artist_authorized',
        owner_type: 'profile',
        owner_id: user.id,
        explicit: draft.explicit,
        explicit_status: draft.explicit ? 'explicit' : 'clean',
        owns_100_percent: draft.owns100Percent,
        distribution_rights_confirmed: true,
        featured_artists: cleanFeaturedArtists,
        producer: cleanProducers[0] || null,
        producers: cleanProducers,
        songwriter: cleanSongwriters[0] || null,
        songwriters: cleanSongwriters,
        composer: cleanComposers[0] || null,
        composers: cleanComposers,
        additional_credits: { creator: draft.creator.trim(), rights_owner: draft.rightsOwner.trim(), notes: draft.description.trim() || null },
      }));
      const trackResult = await db.from('tracks').insert(trackRows).select('id');
      if (trackResult.error || !trackResult.data?.length) throw trackResult.error || new Error('Release tracks were not created.');
      rows.trackIds.push(...trackResult.data.map((track: any) => String(track.id)));
    } else if (draft.kind === 'beat') {
      const { data: beat, error: beatError } = await db
        .from('beats')
        .insert({
          user_id: user.id,
          owner_type: 'profile',
          owner_id: user.id,
          title: draft.title.trim(),
          producer_name: draft.creator.trim(),
          description: draft.description.trim() || null,
          genre: draft.genre.trim(),
          bpm: draft.bpm ? Number(draft.bpm) : null,
          key: draft.musicalKey.trim() || null,
          audio_url: streamUrl,
          audio_file_id: rows.audioFileIds[0],
          image_url: artworkUrl,
          stems_url: supplementaryUrls.stemsUrl,
          tagged_url: supplementaryUrls.taggedUrl,
          is_published: false,
          moderation_status: 'pending',
          tags: [...new Set([draft.genre.trim(), ...draft.tags.map((value) => value.trim()), draft.explicit ? 'explicit' : 'clean'].filter(Boolean))],
          moods: [...new Set(draft.moods.map((value) => value.trim()).filter(Boolean))],
          instruments: [...new Set(draft.instruments.map((value) => value.trim()).filter(Boolean))],
          available_licenses: draft.beatLicenses.filter((license) => license.enabled).map((license) => license.key),
          license_types: draft.beatLicenses.filter((license) => license.enabled).map((license) => license.key),
          license_prices: Object.fromEntries(draft.beatLicenses.filter((license) => license.enabled).map((license) => [license.key, Number(license.price)])),
          price: Number(draft.beatLicenses.find((license) => license.enabled)?.price || 0),
          stems_required: draft.beatLicenses.some((license) => license.enabled && license.key === 'exclusive_rights'),
        })
        .select('id')
        .single();
      if (beatError || !beat?.id) throw beatError || new Error('Beat draft was not created.');
      rows.catalogId = String(beat.id);
    } else {
      const { data: mix, error: mixError } = await db
        .from('mixes')
        .insert({
          owner_user_id: user.id,
          title: draft.title.trim(),
          description: [draft.description.trim(), draft.tracklist.trim()].filter(Boolean).join('\n\n') || null,
          cover_url: artworkUrl,
          audio_url: streamUrl,
          audio_file_id: rows.audioFileIds[0],
          visibility: draft.visibility,
          status: 'draft',
          genre_tags: [draft.genre.trim()],
          mood_tags: draft.moods.map((value) => value.trim()).filter(Boolean),
          recording_type: draft.recordingType.trim() || 'Studio mix',
          event_name: draft.eventName.trim() || null,
          city: draft.city.trim() || null,
          bpm_min: draft.bpmMin ? Number(draft.bpmMin) : null,
          bpm_max: draft.bpmMax ? Number(draft.bpmMax) : null,
          allow_download: draft.allowDownloads,
        })
        .select('id')
        .single();
      if (mixError || !mix?.id) throw mixError || new Error('Mix draft was not created.');
      rows.catalogId = String(mix.id);
    }

    onStage?.('processing');
    const { error: processingError } = await supabase.functions.invoke('process-audio-upload', { body: { audioFileId: rows.audioFileIds[0], filePath: audioPath, fileSize, fileName: draft.audio.name, fileType: draft.audio.mimeType || 'audio/mpeg' } });
    if (processingError) throw new Error(`Audio processing could not start: ${processingError.message}`);

    return {
      catalogId: rows.catalogId as string,
      trackId: rows.trackIds[0] || null,
      audioFileId: rows.audioFileIds[0],
      processingStatus: 'processing',
    };
  } catch (error) {
    await rollback(rows, objects, draft.kind);
    throw error;
  }
}
