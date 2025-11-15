import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  collaborative: boolean;
  cover_art_url?: string;
  track_count?: number;
  duration?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  slug?: string | null;
  share_code?: string | null;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  collaborative: boolean;
}

export interface AddToPlaylistData {
  trackId: string;
  trackType: 'beat' | 'release';
}

export const usePlaylist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [collaborativePlaylists, setCollaborativePlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_items(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const playlistsWithCount = data?.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        tags: playlist.tags || [],
        visibility: playlist.visibility as 'public' | 'unlisted' | 'private',
        collaborative: playlist.collaborative || false,
        cover_art_url: playlist.cover_art_url || '',
        track_count: playlist.playlist_items?.[0]?.count || 0,
        slug: playlist.slug,
        share_code: playlist.share_code,
        user_id: playlist.user_id,
        created_at: playlist.created_at,
        updated_at: playlist.updated_at
      })) || [];

      setPlaylists(playlistsWithCount);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast({
        title: "Error",
        description: "Failed to load playlists",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchCollaborativePlaylists = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_items(count),
          playlist_collaborators!inner(*)
        `)
        .eq('playlist_collaborators.user_id', user.id)
        .neq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const collaborativeWithCount = data?.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        tags: playlist.tags || [],
        visibility: playlist.visibility as 'public' | 'unlisted' | 'private',
        collaborative: playlist.collaborative || false,
        cover_art_url: playlist.cover_art_url || '',
        track_count: playlist.playlist_items?.[0]?.count || 0,
        slug: playlist.slug,
        share_code: playlist.share_code,
        user_id: playlist.user_id,
        created_at: playlist.created_at,
        updated_at: playlist.updated_at
      })) || [];

      setCollaborativePlaylists(collaborativeWithCount);
    } catch (error) {
      console.error('Error fetching collaborative playlists:', error);
    }
  }, [user]);

  const createPlaylist = useCallback(async (playlistData: CreatePlaylistData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert([
          {
            name: playlistData.name,
            description: playlistData.description,
            tags: playlistData.tags,
            visibility: playlistData.visibility,
            collaborative: playlistData.collaborative,
            user_id: user.id,
            is_public: playlistData.visibility === 'public'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add to collaborative table if needed
      if (playlistData.collaborative) {
        await supabase
          .from('playlist_collaborators')
          .insert([
            {
              playlist_id: data.id,
              user_id: user.id,
              role: 'owner'
            }
          ]);
      }

      // Refresh playlists
      fetchPlaylists();

      return data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }, [user, fetchPlaylists]);

  const addToPlaylist = useCallback(async (playlistId: string, trackData: AddToPlaylistData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Get current playlist items count for position
      const { count } = await supabase
        .from('playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', playlistId);

      const insertData: any = {
        playlist_id: playlistId,
        position: (count || 0) + 1
      };

      // Add the appropriate ID based on track type
      if (trackData.trackType === 'beat') {
        insertData.beat_id = trackData.trackId;
      } else {
        insertData.release_id = trackData.trackId;
      }

      const { error } = await supabase
        .from('playlist_items')
        .insert([insertData]);

      if (error) throw error;

      // Update playlist updated_at timestamp
      await supabase
        .from('playlists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      // Refresh playlists to update track counts
      fetchPlaylists();
      fetchCollaborativePlaylists();

    } catch (error) {
      console.error('Error adding to playlist:', error);
      throw error;
    }
  }, [user, fetchPlaylists, fetchCollaborativePlaylists]);

  const removeFromPlaylist = useCallback(async (playlistId: string, itemId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId)
        .eq('playlist_id', playlistId);

      if (error) throw error;

      // Update playlist updated_at timestamp
      await supabase
        .from('playlists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      // Refresh playlists
      fetchPlaylists();
      fetchCollaborativePlaylists();

    } catch (error) {
      console.error('Error removing from playlist:', error);
      throw error;
    }
  }, [user, fetchPlaylists, fetchCollaborativePlaylists]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh playlists
      fetchPlaylists();

      toast({
        title: "Success",
        description: "Playlist deleted successfully"
      });

    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: "Error",
        description: "Failed to delete playlist",
        variant: "destructive"
      });
    }
  }, [user, fetchPlaylists, toast]);

  const updatePlaylist = useCallback(async (playlistId: string, updates: Partial<CreatePlaylistData>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          ...updates,
          is_public: updates.visibility === 'public',
          updated_at: new Date().toISOString()
        })
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh playlists
      fetchPlaylists();

      toast({
        title: "Success",
        description: "Playlist updated successfully"
      });

    } catch (error) {
      console.error('Error updating playlist:', error);
      toast({
        title: "Error",
        description: "Failed to update playlist",
        variant: "destructive"
      });
    }
  }, [user, fetchPlaylists, toast]);

  return {
    playlists,
    collaborativePlaylists,
    loading,
    fetchPlaylists,
    fetchCollaborativePlaylists,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    updatePlaylist
  };
};
