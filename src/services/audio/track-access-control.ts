import { supabase } from '@/integrations/supabase/client';
import { fetchLibraryItems } from '@/services/library';

export interface TrackAccess {
  id?: string;
  user_id: string;
  track_id: string;
  track_type: 'beat' | 'release' | 'pack';
  access_type: 'owned' | 'licensed' | 'preview_only' | 'membership';
  expires_at?: string;
  granted_at?: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  artwork?: string;
  duration?: number;
  type?: 'beat' | 'release' | 'pack';
  streamable?: boolean;
  owned?: boolean;
  preview_duration?: number;
  releaseId?: string;
  userId?: string;
  price?: number;
  currency?: string;
  purchaseUrl?: string;
  isLocked?: boolean;
  requiresPurchase?: boolean;
}

class TrackAccessControlService {
  private libraryCache: {
    userId: string;
    fetchedAt: number;
    ownedReleases: Set<string>;
    ownedBeats: Set<string>;
    ownedPacks: Set<string>;
  } | null = null;

  private static LIBRARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Error fetching current user:', error);
        return null;
      }

      return user?.id ?? null;
    } catch (error) {
      console.error('Error in getCurrentUserId:', error);
      return null;
    }
  }

  private async ensureLibraryOwnership(userId: string) {
    const now = Date.now();
    if (
      this.libraryCache &&
      this.libraryCache.userId === userId &&
      now - this.libraryCache.fetchedAt < TrackAccessControlService.LIBRARY_CACHE_TTL
    ) {
      return this.libraryCache;
    }

    try {
      const { items } = await fetchLibraryItems(userId);

      const ownedReleases = new Set<string>();
      const ownedBeats = new Set<string>();
      const ownedPacks = new Set<string>();

      for (const item of items) {
        switch (item.type) {
          case 'release':
            if (item.productId) ownedReleases.add(item.productId);
            break;
          case 'beat':
            if (item.productId) ownedBeats.add(item.productId);
            break;
          case 'sample_pack':
            if (item.productId) ownedPacks.add(item.productId);
            break;
          default:
            break;
        }
      }

      this.libraryCache = {
        userId,
        fetchedAt: now,
        ownedReleases,
        ownedBeats,
        ownedPacks
      };

      return this.libraryCache;
    } catch (error) {
      console.error('Error ensuring library ownership cache:', error);
      return null;
    }
  }

  private async fetchTrackAccessRecord(
    userId: string,
    trackId: string,
    trackType: 'beat' | 'release' | 'pack'
  ) {
    const { data, error } = await supabase
      .from('track_access')
      .select('*')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .eq('track_type', trackType)
      .or('expires_at.is.null,expires_at.gt.now()')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data as TrackAccess | null;
  }

  private buildPurchaseUrl(track: Track): string | undefined {
    if (track.purchaseUrl) return track.purchaseUrl;

    switch (track.type) {
      case 'release':
        return track.releaseId ? `/release/${track.releaseId}` : `/release/${track.id}`;
      case 'beat':
        return `/beats/${track.id}`;
      case 'pack':
        return `/sample-pack-store`;
      default:
        return undefined;
    }
  }

  private isOwnedInLibrary(libraryCache: NonNullable<TrackAccessControlService['libraryCache']>, track: Track) {
    const idsToCheck = new Set<string>();
    if (track.id) idsToCheck.add(track.id);
    if (track.releaseId) idsToCheck.add(track.releaseId);

    switch (track.type) {
      case 'release':
        return Array.from(idsToCheck).some(id => libraryCache.ownedReleases.has(id));
      case 'beat':
        return Array.from(idsToCheck).some(id => libraryCache.ownedBeats.has(id));
      case 'pack':
        return Array.from(idsToCheck).some(id => libraryCache.ownedPacks.has(id));
      default:
        return false;
    }
  }

  /**
   * Check if user has access to stream full track
   */
  async hasFullAccess(trackId: string, trackType: 'beat' | 'release' | 'pack', userId?: string): Promise<boolean> {
    try {
      const resolvedUserId = userId ?? await this.getCurrentUserId();

      if (!resolvedUserId) return false;

      const data = await this.fetchTrackAccessRecord(resolvedUserId, trackId, trackType);

      if (!data) {
        return false;
      }

      return ['owned', 'licensed', 'membership'].includes(data.access_type);
    } catch (error) {
      if ((error as { code?: string }).code && (error as { code?: string }).code !== 'PGRST116') {
        console.error('Error checking track access:', error);
    }

      console.error('Error in hasFullAccess:', error);
      return false;
    }
  }

  /**
   * Get track access information
   */
  async getTrackAccess(trackId: string, trackType: 'beat' | 'release' | 'pack', userId?: string): Promise<TrackAccess | null> {
    try {
      const resolvedUserId = userId ?? await this.getCurrentUserId();

      if (!resolvedUserId) return null;

      const { data, error } = await supabase
        .from('track_access')
        .select('*')
        .eq('user_id', resolvedUserId)
        .eq('track_id', trackId)
        .eq('track_type', trackType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting track access:', error);
        return null;
      }

      return data as TrackAccess | null;
    } catch (error) {
      console.error('Error in getTrackAccess:', error);
      return null;
    }
  }

  /**
   * Grant track access to user
   */
  async grantAccess(
    userId: string,
    trackId: string,
    trackType: 'beat' | 'release' | 'pack',
    accessType: 'owned' | 'licensed' | 'preview_only' | 'membership',
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const accessData: TrackAccess = {
        user_id: userId,
        track_id: trackId,
        track_type: trackType,
        access_type: accessType,
        expires_at: expiresAt,
        granted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('track_access')
        .upsert([accessData], {
          onConflict: 'user_id,track_id,track_type'
        });

      if (error) {
        console.error('Error granting access:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in grantAccess:', error);
      return false;
    }
  }

  /**
   * Revoke track access from user
   */
  async revokeAccess(userId: string, trackId: string, trackType: 'beat' | 'release' | 'pack'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('track_access')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .eq('track_type', trackType);

      if (error) {
        console.error('Error revoking access:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in revokeAccess:', error);
      return false;
    }
  }

  /**
   * Get preview duration for a track (30-60 seconds based on type)
   */
  getPreviewDuration(trackType: 'beat' | 'release' | 'pack', totalDuration?: number): number {
    const defaultPreviews = {
      beat: 30, // 30 seconds for beats
      release: 60, // 60 seconds for releases
      pack: 30 // 30 seconds for packs
    };

    const previewDuration = defaultPreviews[trackType];
    
    // Don't exceed 25% of total duration if known
    if (totalDuration && totalDuration > 0) {
      return Math.min(previewDuration, Math.floor(totalDuration * 0.25));
    }

    return previewDuration;
  }

  /**
   * Enhance track with access control information
   */
  async enhanceTrackWithAccess(track: Track): Promise<Track> {
    if (!track.type) {
      // Default to 'release' if no type specified
      track.type = 'release';
    }

    const userId = await this.getCurrentUserId();
    let owned = false;
    let hasAccess = false;

    if (userId) {
      const libraryCache = await this.ensureLibraryOwnership(userId);
      const ownedViaLibrary = libraryCache ? this.isOwnedInLibrary(libraryCache, track) : false;

      if (ownedViaLibrary) {
        owned = true;
        hasAccess = true;
      } else {
        const access = await this.getTrackAccess(track.id, track.type, userId);
        if (access) {
          owned = access.access_type === 'owned';
          hasAccess = ['owned', 'licensed', 'membership'].includes(access.access_type);
        } else {
          hasAccess = false;
        }
      }
    }

    const previewDuration = this.getPreviewDuration(track.type, track.duration);
    const isLocked = !hasAccess;
    const requiresPurchase = isLocked && !owned;

    return {
      ...track,
      streamable: hasAccess,
      owned,
      preview_duration: previewDuration,
      purchaseUrl: this.buildPurchaseUrl(track),
      isLocked,
      requiresPurchase
    };
  }

  /**
   * Enhance multiple tracks with access control information
   */
  async enhanceTracksWithAccess(tracks: Track[]): Promise<Track[]> {
    return Promise.all(tracks.map(track => this.enhanceTrackWithAccess(track)));
  }

  /**
   * Get user's owned tracks
   */
  async getUserOwnedTracks(limit: number = 100): Promise<TrackAccess[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('track_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('access_type', 'owned')
        .order('granted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting owned tracks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserOwnedTracks:', error);
      return [];
    }
  }

  /**
   * Get user's licensed tracks
   */
  async getUserLicensedTracks(limit: number = 100): Promise<TrackAccess[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('track_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('access_type', 'licensed')
        .order('granted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting licensed tracks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserLicensedTracks:', error);
      return [];
    }
  }

  /**
   * Check if track should be limited by preview duration
   */
  shouldLimitPlayback(track: Track): boolean {
    return !track.streamable;
  }

  /**
   * Get maximum allowed playback time for a track
   */
  getMaxPlaybackTime(track: Track): number | null {
    if (track.streamable) return null; // No limit for full access
    
    return track.preview_duration || this.getPreviewDuration(
      track.type || 'release', 
      track.duration
    );
  }
}

export const trackAccessControl = new TrackAccessControlService();