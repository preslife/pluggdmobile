import { supabase } from '../../lib/supabase';

export type PluggdTvVideo = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  creatorName: string;
  isFeatured: boolean;
  createdAt: string | null;
};

async function optionalRows(query: PromiseLike<{ data: any[] | null; error: any }>) {
  const result = await query;
  return result.error ? [] : result.data || [];
}

export async function loadPluggdTvFeed(limit = 30): Promise<PluggdTvVideo[]> {
  const db = supabase as any;
  const [creatorVideos, editorialVideos] = await Promise.all([
    optionalRows(
      db
        .from('creator_videos')
        .select('id,user_id,title,description,thumbnail_url,is_featured,created_at')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
    optionalRows(
      db
        .from('videos')
        .select('id,artist_id,title,description,thumbnail_url,is_featured,created_at')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
  ]);

  const creatorIds = [...new Set(creatorVideos.map((video) => video.user_id).filter(Boolean))];
  const artistIds = [...new Set(editorialVideos.map((video) => video.artist_id).filter(Boolean))];
  const [profiles, artists] = await Promise.all([
    creatorIds.length
      ? optionalRows(db.from('public_profiles').select('user_id,full_name,username').in('user_id', creatorIds))
      : Promise.resolve([]),
    artistIds.length
      ? optionalRows(db.from('artists').select('id,name').in('id', artistIds))
      : Promise.resolve([]),
  ]);
  const profileNames = new Map(profiles.map((profile) => [String(profile.user_id), profile.full_name || profile.username || 'PLUGGD creator']));
  const artistNames = new Map(artists.map((artist) => [String(artist.id), artist.name || 'PLUGGD artist']));

  return [
    ...creatorVideos.map((video) => ({
      id: String(video.id),
      title: String(video.title || 'Untitled video'),
      description: typeof video.description === 'string' ? video.description : null,
      thumbnailUrl: typeof video.thumbnail_url === 'string' ? video.thumbnail_url : null,
      creatorName: profileNames.get(String(video.user_id)) || 'PLUGGD creator',
      isFeatured: Boolean(video.is_featured),
      createdAt: typeof video.created_at === 'string' ? video.created_at : null,
    })),
    ...editorialVideos.map((video) => ({
      id: String(video.id),
      title: String(video.title || 'Untitled video'),
      description: typeof video.description === 'string' ? video.description : null,
      thumbnailUrl: typeof video.thumbnail_url === 'string' ? video.thumbnail_url : null,
      creatorName: artistNames.get(String(video.artist_id)) || 'PLUGGD TV',
      isFeatured: Boolean(video.is_featured),
      createdAt: typeof video.created_at === 'string' ? video.created_at : null,
    })),
  ]
    .sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) return left.isFeatured ? -1 : 1;
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    })
    .slice(0, limit);
}
