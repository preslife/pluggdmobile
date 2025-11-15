import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalPlayer, type Track as PlayerTrack } from '@/components/GlobalPlayer/GlobalPlayer';
import { useToast } from '@/hooks/use-toast';
import { useShare } from '@/hooks/useShare';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerOptionsMenu } from '@/components/audio/PlayerOptionsMenu';
import {
  Play,
  Pause,
  Share2,
  ListPlus,
  Users,
  Music4,
  ArrowUp,
  ArrowDown,
  Trash2
} from 'lucide-react';

interface PlaylistOwnerProfile {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface PlaylistCollaborator {
  userId: string;
  role: string | null;
  acceptedAt: string | null;
  profile: PlaylistOwnerProfile | null;
}

interface PlaylistDetails {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  coverArtUrl: string | null;
  tags: string[];
  collaborative: boolean;
  visibility: 'public' | 'unlisted' | 'private';
  shareCode: string | null;
  ownerId: string;
  owner: PlaylistOwnerProfile | null;
  followerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistTrack {
  itemId: string;
  position: number;
  type: 'beat' | 'release';
  trackId: string;
  title: string;
  artist: string;
  artwork?: string | null;
  audioUrl?: string | null;
  userId?: string | null;
  releaseId?: string;
  addedAt: string;
}

const getDisplayName = (profile?: PlaylistOwnerProfile | null) => {
  if (!profile) return 'Unknown Artist';
  return profile.full_name || profile.username || 'Unknown Artist';
};

const buildPlayerTrack = (track: PlaylistTrack): PlayerTrack | null => {
  if (!track.audioUrl) {
    return null;
  }

  return {
    id: track.trackId,
    title: track.title,
    artist: track.artist,
    src: track.audioUrl,
    artwork: track.artwork ?? undefined,
    type: track.type,
    releaseId: track.type === 'release' ? track.releaseId : undefined,
    userId: track.userId ?? undefined
  };
};

const PlaylistPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { state: playerState, actions: playerActions } = useGlobalPlayer();
  const { toast } = useToast();
  const { nativeShare } = useShare();

  const shareCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    return token ? token.trim() : null;
  }, [location.search]);

  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const playlistTitle = playlist?.name ? `${playlist.name} — Pluggd Playlist` : 'Playlist — Pluggd';
  const playlistDescription = playlist?.description
    ? playlist.description.slice(0, 160)
    : 'Listen to curated playlists from creators on Pluggd.';

  usePageMetadata({
    title: playlistTitle,
    description: playlistDescription,
    path: slug ? `/playlist/${slug}` : '/playlist',
    image: playlist?.coverArtUrl ?? undefined,
  });

  const playlistId = playlist?.id ?? null;

  const canEdit = useMemo(() => {
    if (!playlist || !user) return false;
    if (playlist.ownerId === user.id) return true;
    if (!playlist.collaborative) return false;
    return collaborators.some((collaborator) => collaborator.userId === user.id);
  }, [playlist, user, collaborators]);

  const fetchFollowState = useCallback(async (playlistId: string) => {
    if (!playlistId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await supabase
        .from<any>('playlist_follows')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', playlistId);

      setPlaylist((prev) => (prev ? { ...prev, followerCount: count ?? prev.followerCount } : prev));

      if (user?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await supabase
          .from<any>('playlist_follows')
          .select('id')
          .eq('playlist_id', playlistId)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsFollowing(Boolean(data));
      }
    } catch (followError) {
      console.warn('Unable to fetch follow state for playlist', followError);
    }
  }, [user?.id]);

  const fetchPlaylistDetails = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const { data: playlistData, error: playlistError } = await supabase
        .rpc('get_playlist_for_public', { p_slug: slug, p_share_code: shareCode ?? null })
        .maybeSingle();

      if (playlistError) throw playlistError;
      if (!playlistData) {
        setError(
          shareCode
            ? 'This unlisted link is invalid or has expired.'
            : 'Playlist not found or unavailable.'
        );
        setLoading(false);
        return;
      }

      const playlistRowId = playlistData.playlist_id;
      const resolvedSlug =
        (playlistData as { slug?: string | null }).slug ?? slug ?? null;
      const resolvedShareCode =
        shareCode ?? (playlistData as { share_code?: string | null }).share_code ?? null;

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .eq('user_id', playlistData.owner_id)
        .maybeSingle();

      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('id, position, beat_id, release_id, added_at')
        .eq('playlist_id', playlistRowId)
        .order('position', { ascending: true })
        .order('added_at', { ascending: true });

      if (itemsError) throw itemsError;

      const beatIds = (itemsData ?? [])
        .map((item) => item.beat_id)
        .filter((beatId): beatId is string => Boolean(beatId));
      const releaseIds = (itemsData ?? [])
        .map((item) => item.release_id)
        .filter((releaseId): releaseId is string => Boolean(releaseId));

      const [beatsRes, releasesRes] = await Promise.all([
        beatIds.length
          ? supabase
              .from('beats')
              .select('id, title, audio_url, image_url, user_id, uploaded_by_admin, producer_name')
              .in('id', beatIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        releaseIds.length
          ? supabase
              .from('releases')
              .select('id, title, artist, cover_art_url, preview_url, user_id')
              .in('id', releaseIds)
          : Promise.resolve({ data: [] as any[], error: null })
      ]);

      if (beatsRes.error) throw beatsRes.error;
      if (releasesRes.error) throw releasesRes.error;

      const beatProfilesIds = Array.from(
        new Set((beatsRes.data ?? []).map((beat) => beat.user_id).filter((userId): userId is string => Boolean(userId)))
      );
      const releaseProfilesIds = Array.from(
        new Set(
          (releasesRes.data ?? [])
            .map((release) => release.user_id)
            .filter((userId): userId is string => Boolean(userId))
        )
      );

      const [beatProfilesRes, releaseProfilesRes] = await Promise.all([
        beatProfilesIds.length
          ? supabase
              .from('profiles')
              .select('user_id, username, full_name, avatar_url')
              .in('user_id', beatProfilesIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        releaseProfilesIds.length
          ? supabase
              .from('profiles')
              .select('user_id, username, full_name, avatar_url')
              .in('user_id', releaseProfilesIds)
          : Promise.resolve({ data: [] as any[], error: null })
      ]);

      if (beatProfilesRes.error) throw beatProfilesRes.error;
      if (releaseProfilesRes.error) throw releaseProfilesRes.error;

      const beatProfileMap = new Map<string, PlaylistOwnerProfile>();
      (beatProfilesRes.data ?? []).forEach((profile) => {
        beatProfileMap.set(profile.user_id, profile);
      });

      const releaseProfileMap = new Map<string, PlaylistOwnerProfile>();
      (releaseProfilesRes.data ?? []).forEach((profile) => {
        releaseProfileMap.set(profile.user_id, profile);
      });

      const beatMap = new Map<string, any>();
      (beatsRes.data ?? []).forEach((beat) => {
        beatMap.set(beat.id, {
          ...beat,
          profile: beatProfileMap.get(beat.user_id)
        });
      });

      const releaseMap = new Map<string, any>();
      (releasesRes.data ?? []).forEach((release) => {
        releaseMap.set(release.id, {
          ...release,
          profile: release.user_id ? releaseProfileMap.get(release.user_id) ?? null : null
        });
      });

      const orderedTracks: PlaylistTrack[] = (itemsData ?? [])
        .map((item, index) => {
          if (item.beat_id) {
            const beat = beatMap.get(item.beat_id);
            if (!beat) return null;
            const artistName = beat.uploaded_by_admin
              ? beat.producer_name || 'PLUGGD®'
              : getDisplayName(beat.profile);
            return {
              itemId: item.id,
              position: item.position ?? index + 1,
              type: 'beat',
              trackId: beat.id,
              title: beat.title,
              artist: artistName,
              artwork: beat.image_url,
              audioUrl: beat.audio_url,
              userId: beat.user_id,
              addedAt: item.added_at
            } satisfies PlaylistTrack;
          }

          if (item.release_id) {
            const release = releaseMap.get(item.release_id);
            if (!release) return null;
            const artistName = release.artist || getDisplayName(release.profile);
            return {
              itemId: item.id,
              position: item.position ?? index + 1,
              type: 'release',
              trackId: release.id,
              title: release.title,
              artist: artistName,
              artwork: release.cover_art_url,
              audioUrl: release.preview_url,
              userId: release.user_id,
              releaseId: release.id,
              addedAt: item.added_at
            } satisfies PlaylistTrack;
          }

          return null;
        })
        .filter((track): track is PlaylistTrack => Boolean(track));

      setPlaylist({
        id: playlistRowId,
        slug: resolvedSlug,
        name: playlistData.name,
        description: playlistData.description,
        coverArtUrl: playlistData.cover_art_url,
        tags: playlistData.tags ?? [],
        collaborative: Boolean(playlistData.collaborative),
        visibility: (playlistData.visibility as PlaylistDetails['visibility']) || 'private',
        shareCode: resolvedShareCode,
        ownerId: playlistData.owner_id,
        owner: ownerProfile ?? null,
        followerCount: 0,
        createdAt: playlistData.created_at,
        updatedAt: playlistData.updated_at
      });
      setTracks(orderedTracks);

      const { data: collaboratorRows, error: collaboratorError } = await supabase
        .from('playlist_collaborators')
        .select('user_id, role, accepted_at')
        .eq('playlist_id', playlistRowId);

      if (!collaboratorError && collaboratorRows?.length) {
        const collaboratorProfileIds = collaboratorRows
          .map((row) => row.user_id)
          .filter((userId): userId is string => Boolean(userId));

        const { data: collaboratorProfiles, error: collaboratorProfilesError } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', collaboratorProfileIds);

        if (collaboratorProfilesError) throw collaboratorProfilesError;

        const collaboratorProfileMap = new Map<string, PlaylistOwnerProfile>();
        (collaboratorProfiles ?? []).forEach((profile) => {
          collaboratorProfileMap.set(profile.user_id, profile);
        });

        setCollaborators(
          collaboratorRows.map((row) => ({
            userId: row.user_id,
            role: row.role,
            acceptedAt: row.accepted_at,
            profile: collaboratorProfileMap.get(row.user_id) ?? null
          }))
        );
      } else {
        setCollaborators([]);
      }

      await fetchFollowState(playlistRowId);
    } catch (fetchError: any) {
      console.error('Failed to load playlist', fetchError);
      setError('Unable to load playlist. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [fetchFollowState, shareCode, slug]);

  useEffect(() => {
    fetchPlaylistDetails();
  }, [fetchPlaylistDetails]);

  const handleFollowToggle = async () => {
    if (!playlistId) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      if (isFollowing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: unfollowError } = await supabase
          .from<any>('playlist_follows')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('user_id', user.id);

        if (unfollowError) throw unfollowError;

        setIsFollowing(false);
        setPlaylist((prev) => (prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev));
        toast({ title: 'Playlist unfollowed', description: 'You will no longer see updates for this playlist.' });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: followError } = await supabase
          .from<any>('playlist_follows')
          .insert({ playlist_id: playlistId, user_id: user.id });

        if (followError) throw followError;

        setIsFollowing(true);
        setPlaylist((prev) => (prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev));
        toast({ title: 'Playlist followed', description: 'Playlist added to your library.' });
      }
    } catch (followError) {
      console.error('Failed to toggle follow state', followError);
      toast({
        title: 'Unable to update follow state',
        description: 'Please try again in a moment.',
        variant: 'destructive'
      });
      await fetchFollowState(playlistId);
    }
  };

  const handleShare = () => {
    if (!playlist) return;

    const slugOrId = playlist.slug ?? slug ?? playlist.id;
    let tokenQuery = '';

    if (playlist.visibility === 'unlisted') {
      const token = shareCode ?? playlist.shareCode;
      if (!token) {
        toast({
          title: 'Missing access token',
          description: 'Open the Studio share dialog to copy the unlisted link.',
          variant: 'destructive'
        });
        return;
      }
      tokenQuery = `?token=${token}`;
    }

    const shareUrl = `${window.location.origin}/playlist/${slugOrId}${tokenQuery}`;
    nativeShare({
      title: playlist.name,
      url: shareUrl,
      text: `Listen to ${playlist.name} on PLUGGD®`
    });
  };

  const handlePlayTrack = (track: PlaylistTrack) => {
    const playerTrack = buildPlayerTrack(track);
    if (!playerTrack) {
      toast({
        title: 'Track unavailable',
        description: 'This track is missing an audio preview and cannot be played yet.',
        variant: 'destructive'
      });
      return;
    }

    const queue = tracks
      .map((playlistTrack) => buildPlayerTrack(playlistTrack))
      .filter((queueTrack): queueTrack is PlayerTrack => Boolean(queueTrack));

    const queueIndex = queue.findIndex((queueTrack) => queueTrack.id === playerTrack.id);

    playerActions.play(playerTrack, queue, queueIndex >= 0 ? queueIndex : undefined);
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    handlePlayTrack(tracks[0]);
  };

  const handleAddToQueue = (track: PlaylistTrack) => {
    const playerTrack = buildPlayerTrack(track);
    if (!playerTrack) {
      toast({
        title: 'Track unavailable',
        description: 'This track cannot be added to the queue because it is missing audio.',
        variant: 'destructive'
      });
      return;
    }

    playerActions.addToQueue(playerTrack);
    toast({ title: 'Added to queue', description: `${track.title} will play after the current track.` });
  };

  const handleRemoveTrack = async (itemId: string) => {
    if (!playlistId || !canEdit) return;

    try {
      const { error: removeError } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId)
        .eq('playlist_id', playlistId);

      if (removeError) throw removeError;

      toast({ title: 'Track removed', description: 'The track has been removed from the playlist.' });
      await fetchPlaylistDetails();
    } catch (removeError) {
      console.error('Failed to remove track', removeError);
      toast({
        title: 'Unable to remove track',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const handleMoveTrack = async (itemId: string, direction: 'up' | 'down') => {
    if (isReordering || !playlistId || !canEdit) return;

    const currentIndex = tracks.findIndex((track) => track.itemId === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    const reordered = [...tracks];
    const [movedTrack] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedTrack);
    const updatedOrder = reordered.map((track, index) => ({ ...track, position: index + 1 }));

    setTracks(updatedOrder);
    setIsReordering(true);

    try {
      await Promise.all(
        updatedOrder.map((track, index) =>
          supabase
            .from('playlist_items')
            .update({ position: index + 1 })
            .eq('id', track.itemId)
        )
      );

      await supabase
        .from('playlists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      toast({ title: 'Playlist updated', description: 'Track order saved.' });
    } catch (reorderError) {
      console.error('Failed to reorder playlist', reorderError);
      toast({
        title: 'Unable to reorder tracks',
        description: 'We could not save the new order. Try again shortly.',
        variant: 'destructive'
      });
      await fetchPlaylistDetails();
    } finally {
      setIsReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="pt-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-start gap-6">
              <Skeleton className="w-40 h-40 rounded-xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="pt-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <Music4 className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-3xl font-bold">Playlist unavailable</h1>
            <p className="text-muted-foreground">{error || 'We could not find the playlist you were looking for.'}</p>
            <Button asChild>
              <Link to="/marketplace">Explore music</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentTrack = (track: PlaylistTrack) => playerState.currentTrack?.id === track.trackId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="pt-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10 pb-16">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="relative w-full md:w-48 aspect-square rounded-xl overflow-hidden bg-muted shadow-lg">
              {playlist.coverArtUrl ? (
                <img src={playlist.coverArtUrl} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Music4 className="w-12 h-12 mb-2" />
                  <span>No artwork</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{playlist.visibility === 'public' ? 'Public' : playlist.visibility === 'unlisted' ? 'Unlisted' : 'Private'}</Badge>
                {playlist.collaborative && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Collaborative
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{playlist.name}</h1>

              {playlist.description && (
                <p className="text-muted-foreground text-lg max-w-2xl">{playlist.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={playlist.owner?.avatar_url ?? undefined} alt={getDisplayName(playlist.owner)} />
                    <AvatarFallback>{getDisplayName(playlist.owner).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <span className="text-foreground block">{getDisplayName(playlist.owner)}</span>
                    <span className="text-xs">Curator</span>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-6 hidden md:block" />
                <span className="flex items-center gap-1">
                  <Music4 className="w-4 h-4" /> {tracks.length} tracks
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {playlist.followerCount} followers
                </span>
              </div>

              {playlist.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {playlist.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                <Button size="lg" onClick={handlePlayAll} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Play
                </Button>
                <Button size="lg" variant="outline" onClick={handleFollowToggle} className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button size="lg" variant="ghost" onClick={handleShare} className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </div>
          </div>

          {collaborators.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide mb-3">
                  Collaborators
                </h2>
                <div className="flex flex-wrap gap-4">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.userId} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={collaborator.profile?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {getDisplayName(collaborator.profile).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getDisplayName(collaborator.profile)}</div>
                        <div className="text-xs text-muted-foreground">
                          {collaborator.role ? collaborator.role.replace('_', ' ') : 'Collaborator'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 flex items-center text-xs uppercase tracking-wide text-muted-foreground border-b">
                <div className="w-12">#</div>
                <div className="flex-1">Track</div>
                <div className="w-32 hidden sm:block">Artist</div>
                <div className="w-24 text-right pr-2">Actions</div>
              </div>

              {tracks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-3">
                  <Music4 className="w-10 h-10 mx-auto" />
                  <p>This playlist is currently empty.</p>
                  {canEdit && (
                    <p className="text-sm">
                      Add tracks from the marketplace or your library to start building this playlist.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {tracks.map((track, index) => {
                    const playerTrack = buildPlayerTrack(track);
                    const isPlaying = isCurrentTrack(track) && playerState.isPlaying;
                    return (
                      <div
                        key={track.itemId}
                        className="group flex items-center px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 text-muted-foreground">
                          {isPlaying ? <Pause className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {track.artwork ? (
                              <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Music4 className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{track.title}</div>
                            <div className="text-xs text-muted-foreground sm:hidden truncate">{track.artist}</div>
                          </div>
                        </div>
                        <div className="w-32 hidden sm:block text-muted-foreground truncate">{track.artist}</div>
                        <div className="w-24 flex justify-end gap-1 items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePlayTrack(track)}
                            disabled={!playerTrack}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleAddToQueue(track)}
                            disabled={!playerTrack}
                          >
                            <ListPlus className="w-4 h-4" />
                          </Button>
                          <PlayerOptionsMenu
                            track={{
                              id: track.trackId,
                              title: track.title,
                              artist: track.artist,
                              src: playerTrack?.src || '',
                              artwork: track.artwork,
                              type: track.type,
                              releaseId: track.releaseId,
                              userId: track.userId || undefined
                            }}
                          />
                          {canEdit && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoveTrack(track.itemId, 'up')}
                                disabled={index === 0 || isReordering}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoveTrack(track.itemId, 'down')}
                                disabled={index === tracks.length - 1 || isReordering}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveTrack(track.itemId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlaylistPage;
