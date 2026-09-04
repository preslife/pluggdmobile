import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';

export type StudioVideoAsset = {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
};

export type StudioVideoRecord = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  viewCount: number;
  createdAt: string | null;
};

export type StudioVideoWorkspace = {
  videos: StudioVideoRecord[];
  publicProfileRoute: string;
};

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in again to manage your videos.');
  return data.user;
}

function extensionFor(asset: StudioVideoAsset, fallback: string) {
  const extension = asset.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || fallback;
}

function normaliseYouTubeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a complete YouTube URL beginning with https://.');
  }
  if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) {
    throw new Error('Only HTTPS YouTube watch, Shorts or youtu.be links are supported here.');
  }
  return url.toString();
}

async function fileSize(asset: StudioVideoAsset) {
  if (asset.size && asset.size > 0) return Math.round(asset.size);
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists || typeof info.size !== 'number' || info.size <= 0) throw new Error(`PLUGGD could not read ${asset.name}. Choose it again.`);
  return Math.round(info.size);
}

function mapRecord(row: any): StudioVideoRecord {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    youtubeUrl: typeof row.youtube_url === 'string' ? row.youtube_url : null,
    videoUrl: typeof row.video_url === 'string' ? row.video_url : null,
    thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    isFeatured: Boolean(row.is_featured),
    isPublished: Boolean(row.is_published),
    viewCount: Number(row.view_count || 0),
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

export async function loadStudioVideoWorkspace(): Promise<StudioVideoWorkspace> {
  const user = await currentUser();
  const db = supabase as any;
  const [videos, profile] = await Promise.all([
    db.from('creator_videos').select('id,title,description,youtube_url,video_url,thumbnail_url,is_featured,is_published,view_count,created_at').eq('user_id', user.id).order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
    db.from('profiles').select('username').eq('user_id', user.id).maybeSingle(),
  ]);
  if (videos.error) throw videos.error;
  if (profile.error) throw profile.error;
  const username = typeof profile.data?.username === 'string' ? profile.data.username.trim() : '';
  return { videos: (videos.data || []).map(mapRecord), publicProfileRoute: username ? `/creator/${username}` : `/user/${user.id}` };
}

export async function createStudioVideoDraft(input: { title: string; description: string; youtubeUrl: string; isFeatured: boolean; video: StudioVideoAsset | null; thumbnail: StudioVideoAsset | null }) {
  const user = await currentUser();
  const title = input.title.trim();
  if (!title) throw new Error('Add a title before saving the video draft.');
  const youtubeUrl = normaliseYouTubeUrl(input.youtubeUrl);
  if (!youtubeUrl && !input.video) throw new Error('Choose a video file or add a supported YouTube URL.');
  const db = supabase as any;
  const createdPaths: string[] = [];
  let videoUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let createdId: string | null = null;
  try {
    if (input.video) {
      await fileSize(input.video);
      const path = `${user.id}/videos/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(input.video, 'mp4')}`;
      await uploadFileToSupabaseStorage({ bucket: 'videos', path, uri: input.video.uri, contentType: input.video.mimeType || 'video/mp4' });
      createdPaths.push(path);
      videoUrl = supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
    }
    if (input.thumbnail) {
      await fileSize(input.thumbnail);
      const path = `${user.id}/thumbnails/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(input.thumbnail, 'jpg')}`;
      await uploadFileToSupabaseStorage({ bucket: 'videos', path, uri: input.thumbnail.uri, contentType: input.thumbnail.mimeType || 'image/jpeg' });
      createdPaths.push(path);
      thumbnailUrl = supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
    }
    const result = await db.from('creator_videos').insert({ user_id: user.id, title, description: input.description.trim() || null, youtube_url: youtubeUrl, video_url: videoUrl, thumbnail_url: thumbnailUrl, is_featured: input.isFeatured, is_published: false }).select('id').single();
    if (result.error || !result.data?.id) throw result.error || new Error('The video draft was not created.');
    createdId = String(result.data.id);
    return createdId;
  } catch (error) {
    if (createdId) await db.from('creator_videos').delete().eq('id', createdId).eq('user_id', user.id);
    if (createdPaths.length) await supabase.storage.from('videos').remove(createdPaths);
    throw error;
  }
}

export async function saveStudioVideo(record: StudioVideoRecord, input: { title: string; description: string; youtubeUrl: string; isFeatured: boolean }) {
  const user = await currentUser();
  const title = input.title.trim();
  if (!title) throw new Error('Add a title before saving.');
  const youtubeUrl = normaliseYouTubeUrl(input.youtubeUrl);
  if (!youtubeUrl && !record.videoUrl) throw new Error('Keep an uploaded video or add a supported YouTube URL.');
  const result = await (supabase as any).from('creator_videos').update({ title, description: input.description.trim() || null, youtube_url: youtubeUrl, is_featured: input.isFeatured }).eq('id', record.id).eq('user_id', user.id).select('id').single();
  if (result.error) throw result.error;
}

export async function setStudioVideoPublished(record: StudioVideoRecord, published: boolean) {
  const user = await currentUser();
  if (published && !record.videoUrl && !record.youtubeUrl) throw new Error('Add playable video media before publishing.');
  const result = await (supabase as any).from('creator_videos').update({ is_published: published }).eq('id', record.id).eq('user_id', user.id).select('id').single();
  if (result.error) throw result.error;
}

export async function duplicateStudioVideoDraft(record: StudioVideoRecord) {
  const user = await currentUser();
  const result = await (supabase as any).from('creator_videos').insert({ user_id: user.id, title: `Copy of ${record.title}`, description: record.description || null, youtube_url: record.youtubeUrl, video_url: record.videoUrl, thumbnail_url: record.thumbnailUrl, is_featured: false, is_published: false }).select('id').single();
  if (result.error || !result.data?.id) throw result.error || new Error('The private copy was not created.');
  return String(result.data.id);
}

export async function replaceStudioVideoAsset(record: StudioVideoRecord, kind: 'video' | 'thumbnail', asset: StudioVideoAsset) {
  const user = await currentUser();
  await fileSize(asset);
  const folder = kind === 'video' ? 'videos' : 'thumbnails';
  const fallback = kind === 'video' ? 'mp4' : 'jpg';
  const path = `${user.id}/${folder}/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(asset, fallback)}`;
  await uploadFileToSupabaseStorage({ bucket: 'videos', path, uri: asset.uri, contentType: asset.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg') });
  const url = supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
  const payload = kind === 'video' ? { video_url: url, is_published: false } : { thumbnail_url: url };
  const result = await (supabase as any).from('creator_videos').update(payload).eq('id', record.id).eq('user_id', user.id).select('id').single();
  if (result.error) {
    await supabase.storage.from('videos').remove([path]);
    throw result.error;
  }
}
