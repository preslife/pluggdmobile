import { supabase } from '@/integrations/supabase/client';

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
}

class TrackAccessControlService {
  /**
   * Check if user has access to stream full track
   */
  async hasFullAccess(trackId: string, trackType: 'beat' | 'release' | 'pack'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { data, error } = await supabase
        .from('track_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .eq('track_type', trackType)
        .or('expires_at.is.null,expires_at.gt.now()')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error checking track access:', error);
        return false;
      }

      return !!data && ['owned', 'licensed', 'membership'].includes(data.access_type);
    } catch (error) {
      console.error('Error in hasFullAccess:', error);
      return false;
    }
  }

  /**
   * Get track access information
   */
  async getTrackAccess(trackId: string, trackType: 'beat' | 'release' | 'pack'): Promise<TrackAccess | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data, error } = await supabase
        .from('track_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .eq('track_type', trackType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting track access:', error);
        return null;
      }

      return data;
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

    const hasAccess = await this.hasFullAccess(track.id, track.type);
    const access = await this.getTrackAccess(track.id, track.type);
    
    return {
      ...track,
      streamable: hasAccess,
      owned: access?.access_type === 'owned',
      preview_duration: this.getPreviewDuration(track.type, track.duration)
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