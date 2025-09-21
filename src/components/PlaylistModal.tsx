import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePlaylist } from '@/hooks/usePlaylist';
import { 
  Plus, 
  Search, 
  Music, 
  Users, 
  Globe, 
  Lock, 
  Eye,
  X,
  Check
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  artwork?: string | null;
  duration?: number;
  releaseId?: string;
  userId?: string;
  type?: 'beat' | 'release';
}

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  track
}) => {
  const { toast } = useToast();
  const {
    playlists,
    collaborativePlaylists,
    loading,
    createPlaylist,
    addToPlaylist,
    fetchPlaylists,
    fetchCollaborativePlaylists
  } = usePlaylist();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('my-playlists');

  // Create new playlist form state
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    visibility: 'private' as 'public' | 'unlisted' | 'private',
    collaborative: false
  });
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      fetchCollaborativePlaylists();
    }
  }, [isOpen, fetchPlaylists, fetchCollaborativePlaylists]);

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCollaborativePlaylists = collaborativePlaylists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTag = () => {
    if (currentTag.trim() && newPlaylist.tags.length < 3 && !newPlaylist.tags.includes(currentTag.trim())) {
      setNewPlaylist(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewPlaylist(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleCreatePlaylist = async () => {
    try {
      const playlist = await createPlaylist(newPlaylist);
      
      // Add track to the newly created playlist
      await addToPlaylist(playlist.id, {
        trackId: track.id,
        trackType: track.type || 'beat'
      });

      toast({
        title: "Success!",
        description: `"${track.title}" added to "${playlist.name}"`
      });

      // Reset form
      setNewPlaylist({
        name: '',
        description: '',
        tags: [],
        visibility: 'private',
        collaborative: false
      });
      setActiveTab('my-playlists');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive"
      });
    }
  };

  const handleAddToExistingPlaylist = async (playlistId: string) => {
    try {
      await addToPlaylist(playlistId, {
        trackId: track.id,
        trackType: track.type || 'beat'
      });

      const playlist = playlists.find(p => p.id === playlistId);
      toast({
        title: "Added to playlist!",
        description: `"${track.title}" added to "${playlist?.name}"`
      });

      setSelectedPlaylists(prev => new Set([...prev, playlistId]));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add track to playlist",
        variant: "destructive"
      });
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'unlisted':
        return <Eye className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-semibold">
            Add to playlist
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-6">
            <TabsTrigger value="my-playlists" className="text-xs">
              My playlists
            </TabsTrigger>
            <TabsTrigger value="collaborative" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              Collaborative
            </TabsTrigger>
            <TabsTrigger value="create-new" className="text-xs">
              Create new
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-playlists" className="mt-4 px-6 pb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search playlists"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Playlists */}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading playlists...</p>
                  </div>
                ) : filteredPlaylists.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No playlists found</p>
                  </div>
                ) : (
                  filteredPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddToExistingPlaylist(playlist.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          {playlist.cover_art_url ? (
                            <img 
                              src={playlist.cover_art_url} 
                              alt={playlist.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Music className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{playlist.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getVisibilityIcon(playlist.visibility)}
                            <span className="text-xs text-muted-foreground">
                              {playlist.track_count || 0} tracks
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedPlaylists.has(playlist.id) && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="collaborative" className="mt-4 px-6 pb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search collaborative playlists"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Collaborative Playlists */}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading playlists...</p>
                  </div>
                ) : filteredCollaborativePlaylists.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No collaborative playlists</p>
                  </div>
                ) : (
                  filteredCollaborativePlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddToExistingPlaylist(playlist.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          {playlist.cover_art_url ? (
                            <img 
                              src={playlist.cover_art_url} 
                              alt={playlist.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{playlist.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {playlist.track_count || 0} tracks
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedPlaylists.has(playlist.id) && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create-new" className="mt-4 px-6 pb-6 space-y-4">
            <ScrollArea className="h-80">
              <div className="space-y-4 pr-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter playlist name"
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newPlaylist.name.length}/50 characters
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tags (up to 3)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a tag"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      disabled={newPlaylist.tags.length >= 3}
                      maxLength={20}
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!currentTag.trim() || newPlaylist.tags.length >= 3}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {newPlaylist.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newPlaylist.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe your playlist"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                    maxLength={200}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newPlaylist.description.length}/200 characters
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Visibility
                  </label>
                  <Select
                    value={newPlaylist.visibility}
                    onValueChange={(value: 'public' | 'unlisted' | 'private') => 
                      setNewPlaylist(prev => ({ ...prev, visibility: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Private - Only you can see
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Unlisted - Anyone with link
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Public - Everyone can see
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Collaborative */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="collaborative"
                    checked={newPlaylist.collaborative}
                    onChange={(e) => setNewPlaylist(prev => ({ 
                      ...prev, 
                      collaborative: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <label htmlFor="collaborative" className="text-sm">
                    Allow others to add tracks
                  </label>
                </div>
              </div>
            </ScrollArea>

            <Button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylist.name.trim() || loading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create & Add Track
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};