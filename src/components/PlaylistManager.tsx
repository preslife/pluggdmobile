import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylist, type Playlist as PlaylistSummary } from '@/hooks/usePlaylist';
import { Plus, Music, Play, Trash2, Edit2, Share, Lock, Globe, GripVertical, ArrowUp, ArrowDown, UserPlus, Copy, ExternalLink, UserMinus, RefreshCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';

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

type PlaylistDetails = PlaylistSummary & {
  follower_count?: number | null;
  is_followable?: boolean | null;
  share_token?: string | null;
  is_public?: boolean | null;
  is_collaborative?: boolean | null;
  total_duration?: number | null;
  duration?: number | null;
};

type PlaylistCollaborator = {
  id: string;
  role: string;
  user_id: string;
  invited_at?: string | null;
  accepted_at?: string | null;
  profile?: {
    id?: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
};

type PlaylistInvite = {
  id: string;
  email: string;
  role: string;
  status?: string | null;
  created_at?: string | null;
  invited_by?: string | null;
};

type InviteRole = 'editor' | 'contributor' | 'viewer';

type SortableTrackRowProps = {
  track: PlaylistTrack;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
};

const SortableTrackRow: React.FC<SortableTrackRowProps> = ({
  track,
  index,
  total,
  onMoveUp,
  onMoveDown,
  disabled
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
    disabled
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-card/70 p-3 transition-shadow',
        isDragging && 'ring-2 ring-primary shadow-lg bg-background'
      )}
    >
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-8 text-center text-sm font-semibold">{index + 1}</div>
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
        {track.release?.cover_art_url ? (
          <img
            src={track.release.cover_art_url}
            alt={track.release.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Music className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.release?.title ?? 'Untitled track'}</p>
        <p className="truncate text-sm text-muted-foreground">
          {track.release?.artist ?? 'Unknown artist'}
        </p>
      </div>
      {track.release?.genre && (
        <Badge variant="outline" className="hidden whitespace-nowrap sm:inline-flex">
          {track.release.genre}
        </Badge>
      )}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={disabled || index === 0}
          aria-label="Move track up"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={disabled || index === total - 1}
          aria-label="Move track down"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Preview track">
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const PlaylistManager = () => {
  const { user } = useAuth();
  const {
    playlists,
    loading,
    fetchPlaylists,
    deletePlaylist,
    createPlaylist
  } = usePlaylist();
  const { toast } = useToast();
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetails | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PlaylistInvite[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<PlaylistDetails | null>(null);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: InviteRole }>({
    email: '',
    role: 'editor'
  });
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

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

  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
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

      const tracks: PlaylistTrack[] = (data ?? []).map((item, index) => ({
        id: item.id,
        release_id: item.release_id,
        position: item.position ?? index + 1,
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
      toast({
        title: 'Unable to load tracks',
        description: 'We ran into an issue fetching the playlist order. Please try again.',
        variant: 'destructive'
      });
      setPlaylistTracks([]);
    }
  }, [toast]);

  const fetchPlaylistDetails = useCallback(async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          tags,
          visibility,
          collaborative,
          is_public,
          is_collaborative,
          is_followable,
          follower_count,
          track_count,
          duration,
          total_duration,
          user_id,
          share_token
        `)
        .eq('id', playlistId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedPlaylist(prev => {
          const resolvedVisibility =
            (data.visibility as 'public' | 'unlisted' | 'private' | null) ??
            (data.is_public ? 'public' : 'private');

          const normalized: PlaylistDetails = {
            ...(prev ?? ({} as PlaylistDetails)),
            ...data,
            tags: (data.tags as string[] | null) ?? prev?.tags ?? [],
            visibility: resolvedVisibility,
            collaborative:
              typeof data.collaborative === 'boolean'
                ? data.collaborative
                : Boolean(data.is_collaborative ?? prev?.collaborative),
            follower_count: data.follower_count ?? prev?.follower_count ?? 0,
            is_followable: data.is_followable ?? prev?.is_followable ?? true,
            is_public:
              typeof data.is_public === 'boolean' ? data.is_public : resolvedVisibility === 'public',
            share_token: (data as any).share_token ?? prev?.share_token ?? null,
            track_count: data.track_count ?? prev?.track_count ?? playlistTracks.length,
            duration: data.duration ?? data.total_duration ?? prev?.duration ?? null,
            total_duration: data.total_duration ?? prev?.total_duration ?? null,
            user_id: data.user_id ?? prev?.user_id ?? user?.id ?? ''
          };

          return normalized;
        });
      }
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    }
  }, [playlistTracks.length, user?.id]);

  const fetchCollaborators = useCallback(async (playlistId: string) => {
    setCollaboratorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlist_collaborators')
        .select(`
          id,
          role,
          user_id,
          invited_at,
          accepted_at,
          profiles:user_id (id, username, full_name, avatar_url, email)
        `)
        .eq('playlist_id', playlistId)
        .order('invited_at', { ascending: true });

      if (error) throw error;

      const formatted: PlaylistCollaborator[] = (data ?? []).map((item: any) => ({
        id: item.id,
        role: item.role ?? 'editor',
        user_id: item.user_id,
        invited_at: item.invited_at,
        accepted_at: item.accepted_at,
        profile: item.profiles ?? null
      }));

      setCollaborators(formatted);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast({
        title: 'Unable to load collaborators',
        description: 'We could not load the latest collaborators list.',
        variant: 'destructive'
      });
      setCollaborators([]);
    } finally {
      setCollaboratorsLoading(false);
    }
  }, [toast]);

  const fetchInvites = useCallback(async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_invitations' as any)
        .select('id,email,role,status,created_at,invited_by')
        .eq('playlist_id', playlistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: PlaylistInvite[] = (data ?? []).map((invite: any) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role ?? 'editor',
        status: invite.status ?? 'pending',
        created_at: invite.created_at,
        invited_by: invite.invited_by ?? null
      }));

      setPendingInvites(formatted);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setPendingInvites([]);
    }
  }, []);

  const checkFollowStatus = useCallback(async (playlistId: string) => {
    if (!user) {
      setIsFollowing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlist_follows' as any)
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setIsFollowing(Boolean(data));
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  }, [user]);

  const persistTrackOrder = async (tracks: PlaylistTrack[]) => {
    if (!selectedPlaylist?.id) return;
    const playlistId = selectedPlaylist.id;

    setIsReordering(true);
    try {
      const updates = tracks.map((track, index) => ({
        id: track.id,
        position: index + 1
      }));

      if (updates.length > 0) {
        const { error } = await supabase
          .from('playlist_items')
          .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating playlist order:', error);
      toast({
        title: 'Unable to update order',
        description: 'We reset the track order to the last saved version.',
        variant: 'destructive'
      });
      await fetchPlaylistTracks(playlistId);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPlaylistTracks(current => {
      const oldIndex = current.findIndex(track => track.id === active.id);
      const newIndex = current.findIndex(track => track.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return current;

      const reordered = arrayMove(current, oldIndex, newIndex).map((track, index) => ({
        ...track,
        position: index + 1
      }));

      void persistTrackOrder(reordered);
      return reordered;
    });
  };

  const moveTrack = (trackId: string, direction: 'up' | 'down') => {
    setPlaylistTracks(current => {
      const index = current.findIndex(track => track.id === trackId);
      if (index === -1) return current;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= current.length) return current;

      const reordered = arrayMove(current, index, newIndex).map((track, idx) => ({
        ...track,
        position: idx + 1
      }));

      void persistTrackOrder(reordered);
      return reordered;
    });
  };

  const handleVisibilityChange = async (visibility: 'public' | 'unlisted' | 'private') => {
    if (!selectedPlaylist?.id || !isSelectedOwner) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          visibility,
          is_public: visibility === 'public'
        })
        .eq('id', selectedPlaylist.id);

      if (error) throw error;

      setSelectedPlaylist(prev =>
        prev
          ? {
              ...prev,
              visibility,
              is_public: visibility === 'public'
            }
          : prev
      );
      fetchPlaylists();
      toast({
        title: 'Visibility updated',
        description: `Playlist visibility set to ${visibility}.`
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: 'Unable to update visibility',
        description: 'Please try again in a moment.',
        variant: 'destructive'
      });
    }
  };

  const handleCollaborativeToggle = async (value: boolean) => {
    if (!selectedPlaylist?.id || !isSelectedOwner) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .update({ collaborative: value })
        .eq('id', selectedPlaylist.id);

      if (error) throw error;

      setSelectedPlaylist(prev => (prev ? { ...prev, collaborative: value } : prev));
      fetchPlaylists();
      toast({
        title: value ? 'Collaboration enabled' : 'Collaboration disabled',
        description: value
          ? 'Collaborators can now help manage this playlist.'
          : 'Only you can manage this playlist now.'
      });
    } catch (error) {
      console.error('Error updating collaborative setting:', error);
      toast({
        title: 'Unable to update collaboration',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const handleInviteCollaborator = async () => {
    if (!selectedPlaylist?.id || !isSelectedOwner) return;
    const email = inviteForm.email.trim();
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Enter an email address before sending an invite.'
      });
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const { error } = await supabase
        .from('playlist_invitations' as any)
        .insert({
          playlist_id: selectedPlaylist.id,
          email: email.toLowerCase(),
          role: inviteForm.role,
          invited_by: user?.id ?? null
        });

      if (error) throw error;

      toast({
        title: 'Invite sent',
        description: `${email} has been invited to collaborate.`
      });
      setInviteForm({ email: '', role: inviteForm.role });
      setInviteDialogOpen(false);
      fetchInvites(selectedPlaylist.id);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Unable to send invite',
        description: 'Double-check the email address and try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!selectedPlaylist?.id || !isSelectedOwner) return;

    try {
      const { error } = await supabase
        .from('playlist_invitations' as any)
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Invite revoked',
        description: 'The invitation has been cancelled.'
      });
      fetchInvites(selectedPlaylist.id);
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast({
        title: 'Unable to revoke invite',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const handleCollaboratorRoleChange = async (collaboratorId: string, role: string) => {
    if (!isSelectedOwner) return;
    try {
      const { error } = await supabase
        .from('playlist_collaborators')
        .update({ role })
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: 'Collaborator permissions have been updated.'
      });
      if (selectedPlaylist?.id) {
        fetchCollaborators(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error updating collaborator role:', error);
      toast({
        title: 'Unable to update role',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!isSelectedOwner) return;
    try {
      const { error } = await supabase
        .from('playlist_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: 'Collaborator removed',
        description: 'They no longer have access to manage this playlist.'
      });
      if (selectedPlaylist?.id) {
        fetchCollaborators(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: 'Unable to remove collaborator',
        description: 'Please try again in a moment.',
        variant: 'destructive'
      });
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !selectedPlaylist?.id || selectedPlaylist.user_id === user.id) return;
    const resolvedVisibility =
      selectedPlaylist.visibility ?? (selectedPlaylist.is_public ? 'public' : 'private');
    if (resolvedVisibility !== 'public' || selectedPlaylist.is_followable === false) {
      return;
    }

    setIsProcessingFollow(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('playlist_follows' as any)
          .delete()
          .eq('playlist_id', selectedPlaylist.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('playlist_follows' as any)
          .insert({ playlist_id: selectedPlaylist.id, user_id: user.id });

        if (error) throw error;
        setIsFollowing(true);
      }

      fetchPlaylistDetails(selectedPlaylist.id);
      fetchPlaylists();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Unable to update follow status',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingFollow(false);
    }
  };

  const openShareDialog = useCallback((playlist: PlaylistSummary | PlaylistDetails) => {
    setShareTarget(playlist as PlaylistDetails);
    setShareDialogOpen(true);
  }, []);

  const shareUrl = useMemo(() => {
    if (!shareTarget) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pluggd.club';
    return `${origin}/playlist/${shareTarget.id}`;
  }, [shareTarget]);

  const selectedPlaylistShareUrl = useMemo(() => {
    if (!selectedPlaylist?.id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pluggd.club';
    return `${origin}/playlist/${selectedPlaylist.id}`;
  }, [selectedPlaylist?.id]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: 'Clipboard unavailable',
        description: 'Copy the link manually instead.'
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Share link copied to your clipboard.' });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Unable to copy link',
        description: 'Try copying manually instead.',
        variant: 'destructive'
      });
    }
  }, [shareUrl, toast]);

  const handleCopySelectedShareLink = useCallback(async () => {
    if (!selectedPlaylistShareUrl) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: 'Clipboard unavailable',
        description: 'Copy the link manually instead.'
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedPlaylistShareUrl);
      toast({ title: 'Link copied', description: 'Share link copied to your clipboard.' });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Unable to copy link',
        description: 'Try copying manually instead.',
        variant: 'destructive'
      });
    }
  }, [selectedPlaylistShareUrl, toast]);

  const handleNativeShare = useCallback(async () => {
    if (!shareTarget || !shareUrl) return;
    if (typeof navigator === 'undefined' || !navigator.share) return;

    try {
      await navigator.share({
        title: shareTarget.name,
        text: shareTarget.description ?? 'Check out this playlist on Pluggd',
        url: shareUrl
      });
    } catch (error) {
      console.error('Error invoking native share:', error);
    }
  }, [shareTarget, shareUrl]);

  useEffect(() => {
    if (!selectedPlaylist?.id) return;
    const playlistId = selectedPlaylist.id;

    fetchPlaylistDetails(playlistId);
    fetchPlaylistTracks(playlistId);
    fetchCollaborators(playlistId);
    fetchInvites(playlistId);
    checkFollowStatus(playlistId);
  }, [
    checkFollowStatus,
    fetchCollaborators,
    fetchInvites,
    fetchPlaylistDetails,
    fetchPlaylistTracks,
    selectedPlaylist?.id
  ]);

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
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      setCollaborators([]);
      setPendingInvites([]);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
      return '0m';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const selectedVisibility = selectedPlaylist?.visibility ?? (selectedPlaylist?.is_public ? 'public' : 'private');
  const isSelectedOwner = selectedPlaylist ? selectedPlaylist.user_id === user?.id : false;
  const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canFollow = selectedVisibility === 'public' && selectedPlaylist?.is_followable !== false;

  useEffect(() => {
    if (!isSelectedOwner) {
      setInviteDialogOpen(false);
    }
  }, [isSelectedOwner]);

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
                  <Button variant="ghost" size="sm" onClick={() => openShareDialog(playlist)}>
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
                  {playlist.visibility === 'public'
                    ? 'Public'
                    : playlist.visibility === 'unlisted'
                      ? 'Unlisted'
                      : 'Private'}
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
                  onClick={() => setSelectedPlaylist(playlist)}
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
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  {selectedPlaylist.name}
                  {selectedVisibility === 'public' ? (
                    <Globe className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {(selectedPlaylist.track_count ?? playlistTracks.length) || 0} tracks •
                  {' '}
                  {formatDuration(
                    selectedPlaylist.duration ?? selectedPlaylist.total_duration ?? playlistTracks.length * 180
                  )}
                </p>
                {selectedPlaylist.description && (
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {selectedPlaylist.description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedVisibility !== 'private' && (
                  <Button variant="outline" size="sm" onClick={() => openShareDialog(selectedPlaylist)}>
                    <Share className="mr-2 h-4 w-4" /> Share
                  </Button>
                )}
                {canFollow && !isSelectedOwner && (
                  <Button
                    variant={isFollowing ? 'secondary' : 'default'}
                    size="sm"
                    onClick={handleFollowToggle}
                    disabled={isProcessingFollow}
                  >
                    {isProcessingFollow ? 'Updating…' : isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedPlaylist.id && fetchPlaylistTracks(selectedPlaylist.id)}
                  disabled={isReordering}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {(selectedPlaylist.follower_count ?? 0).toLocaleString()} follower
                {(selectedPlaylist.follower_count ?? 0) === 1 ? '' : 's'}
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
              <span>{collaborators.length} collaborator{collaborators.length === 1 ? '' : 's'}</span>
              {pendingInvites.length > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                  <span>{pendingInvites.length} pending invite{pendingInvites.length === 1 ? '' : 's'}</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-4">
                <div className="space-y-4 rounded-lg border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Visibility</p>
                      <p className="text-xs text-muted-foreground">
                        Choose who can see and follow this playlist.
                      </p>
                    </div>
                    <Select
                      value={selectedVisibility}
                      onValueChange={value => handleVisibilityChange(value as 'public' | 'unlisted' | 'private')}
                      disabled={!isSelectedOwner}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="unlisted">Unlisted</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedVisibility !== 'private' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Share link
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input value={selectedPlaylistShareUrl} readOnly className="font-mono text-xs" />
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={handleCopySelectedShareLink}>
                            <Copy className="mr-2 h-4 w-4" /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              selectedPlaylistShareUrl && window.open(selectedPlaylistShareUrl, '_blank')
                            }
                            disabled={!selectedPlaylistShareUrl}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-4">
                  <div>
                    <p className="text-sm font-semibold">Collaborative mode</p>
                    <p className="text-xs text-muted-foreground">
                      Allow invited collaborators to help manage the playlist.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(selectedPlaylist.collaborative)}
                    onCheckedChange={handleCollaborativeToggle}
                    disabled={!isSelectedOwner}
                  />
                </div>

                <div className="space-y-4 rounded-lg border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Collaborators</p>
                    {isSelectedOwner && (
                      <Button size="sm" variant="outline" onClick={() => setInviteDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Invite
                      </Button>
                    )}
                  </div>
                  {collaboratorsLoading ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, idx) => (
                        <div key={idx} className="h-12 animate-pulse rounded-md bg-muted" />
                      ))}
                    </div>
                  ) : collaborators.length > 0 ? (
                    <div className="space-y-2">
                      {collaborators.map(collaborator => (
                        <div
                          key={collaborator.id}
                          className="flex items-center justify-between gap-4 rounded-md border bg-background p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {collaborator.profile?.full_name ||
                                collaborator.profile?.username ||
                                'Collaborator'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {collaborator.role}
                              {collaborator.accepted_at ? ' • active' : ' • pending acceptance'}
                            </p>
                          </div>
                          {isSelectedOwner && collaborator.user_id !== user?.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={collaborator.role}
                                onValueChange={value => handleCollaboratorRoleChange(collaborator.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Owner</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="contributor">Contributor</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCollaborator(collaborator.id)}
                                aria-label="Remove collaborator"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="capitalize">
                              {collaborator.role}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No collaborators yet. Invite someone to get started.</p>
                  )}

                  {pendingInvites.length > 0 && (
                    <div className="space-y-2 border-t border-dashed pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pending invites
                      </p>
                      {pendingInvites.map(invite => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between gap-4 rounded-md border bg-background/80 p-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{invite.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {invite.role} • {invite.status ?? 'pending'}
                            </p>
                          </div>
                          {isSelectedOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-background/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Track order</p>
                      <p className="text-xs text-muted-foreground">
                        Drag tracks or use the arrows to set the perfect sequence.
                      </p>
                    </div>
                    {isReordering && <Badge variant="outline">Saving…</Badge>}
                  </div>
                  {playlistTracks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <Music className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      No tracks in this playlist yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={playlistTracks.map(track => track.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {playlistTracks.map((track, index) => (
                            <SortableTrackRow
                              key={track.id}
                              track={track}
                              index={index}
                              total={playlistTracks.length}
                              onMoveUp={() => moveTrack(track.id, 'up')}
                              onMoveDown={() => moveTrack(track.id, 'down')}
                              disabled={isReordering}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a collaborator</DialogTitle>
            <DialogDescription>
              Send an invitation for someone to help manage “{selectedPlaylist?.name}”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={event => setInviteForm({ ...inviteForm, email: event.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={inviteForm.role}
                onValueChange={value => setInviteForm({ ...inviteForm, role: value as InviteRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteCollaborator} disabled={!inviteForm.email || isSubmittingInvite}>
              {isSubmittingInvite ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shareDialogOpen}
        onOpenChange={open => {
          setShareDialogOpen(open);
          if (!open) {
            setShareTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share “{shareTarget?.name}”</DialogTitle>
            <DialogDescription>
              Copy or send the public link so collaborators and listeners can tune in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Playlist link</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input value={shareUrl} readOnly className="font-mono text-xs" />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyShareLink} disabled={!shareUrl}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                  {canUseNativeShare && (
                    <Button variant="outline" size="sm" onClick={handleNativeShare} disabled={!shareUrl}>
                      <Share className="mr-2 h-4 w-4" /> Share
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaylistManager;
