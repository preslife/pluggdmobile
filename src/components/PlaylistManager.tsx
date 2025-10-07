import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylist } from '@/hooks/usePlaylist';
import { Plus, Music, Play, Trash2, Edit2, Share, Lock, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

type Playlist = {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  track_count: number;
  duration: number;
  cover_art_url?: string;
  created_at: string;
  updated_at: string;
};

type PlaylistTrack = {
  id: string;
  release_id: string;
  position: number;
  added_at: string;
  release?: {
    title: string;
    artist: string;
    cover_art_url?: string;
    preview_url?: string;
    genre: string;
  };
};

const PlaylistManager = () => {
  const { user } = useAuth();
  const {
    playlists,
    loading,
    fetchPlaylists,
    deletePlaylist,
    createPlaylist,
    updatePlaylist
  } = usePlaylist();
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'unlisted' | 'private',
    tags: [] as string[],
    collaborative: false
  });

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user, fetchPlaylists]);

  const fetchPlaylistTracks = async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select(`
          id,
          release_id,
          position,
          added_at,
          releases:release_id (id, title, artist, genre, cover_art_url, preview_url)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;

      const tracks: PlaylistTrack[] = (data ?? []).map((item) => ({
        id: item.id,
        release_id: item.release_id,
        position: item.position ?? 0,
        added_at: item.added_at,
        release: item.releases
          ? {
              title: item.releases.title,
              artist: item.releases.artist,
              genre: item.releases.genre,
              cover_art_url: item.releases.cover_art_url ?? undefined,
              preview_url: item.releases.preview_url ?? undefined,
            }
          : undefined,
      }));

      setPlaylistTracks(tracks);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setPlaylistTracks([]);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!user) return;

    try {
      await createPlaylist(newPlaylist);
      setNewPlaylist({ 
        name: '', 
        description: '', 
        visibility: 'private',
        tags: [],
        collaborative: false 
      });
      setShowCreateModal(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylist(playlistId);
  };

  const sharePlaylist = (playlist: any) => {
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: playlist.name,
        text: playlist.description || 'Check out this playlist',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      // Toast notification would be shown by the hook
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">Please sign in to manage your playlists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            My Playlists
          </h2>
          <p className="text-muted-foreground">Create and manage your music collections</p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Playlist Name</label>
                  <Input
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist({...newPlaylist, name: e.target.value})}
                    placeholder="Enter playlist name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist({...newPlaylist, description: e.target.value})}
                    placeholder="Describe your playlist"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPlaylist.visibility === 'public'}
                    onChange={(e) => setNewPlaylist({
                      ...newPlaylist, 
                      visibility: e.target.checked ? 'public' : 'private'
                    })}
                  />
                  <label className="text-sm">Make playlist public</label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreatePlaylist} className="flex-1">Create Playlist</Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.map((playlist) => (
          <Card key={playlist.id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {playlist.name}
                    {playlist.visibility === 'public' ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {playlist.track_count} tracks • {formatDuration(playlist.duration)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => sharePlaylist(playlist)}>
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeletePlaylist(playlist.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Playlist Cover */}
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                {playlist.cover_art_url ? (
                  <img 
                    src={playlist.cover_art_url} 
                    alt={playlist.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Music className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {playlist.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {playlist.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={playlist.visibility === 'public' ? "default" : "secondary"}>
                  {playlist.visibility === 'public' ? "Public" : "Private"}
                </Badge>
                <Badge variant="outline">
                  {playlist.track_count} tracks
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedPlaylist(playlist);
                    fetchPlaylistTracks(playlist.id);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Playlist Details */}
      {selectedPlaylist && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>{selectedPlaylist.name} - Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            {playlistTracks.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tracks in this playlist yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlistTracks.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="text-sm font-medium w-8">{track.position}</div>
                    <div className="w-12 h-12 bg-muted rounded flex-shrink-0">
                      {track.release?.cover_art_url ? (
                        <img 
                          src={track.release.cover_art_url} 
                          alt={track.release.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{track.release?.title}</p>
                      <p className="text-sm text-muted-foreground">{track.release?.artist}</p>
                    </div>
                    <Badge variant="outline">{track.release?.genre}</Badge>
                    <Button variant="ghost" size="sm">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {playlists.length === 0 && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No playlists yet</h3>
          <p className="text-muted-foreground">Create your first playlist to organize your favorite tracks.</p>
        </div>
      )}
    </div>
  );
};

export default PlaylistManager;
