import { supabase } from '@/integrations/supabase/client';

export interface PlayEvent {
  id?: string;
  user_id?: string;
  track_id: string;
  track_type: 'beat' | 'release' | 'pack';
  play_type: 'full' | 'preview';
  duration_played?: number;
  completion_percentage?: number;
  source?: string;
  session_id?: string;
  device_type?: string;
  played_at?: string;
}

export interface StreamingSession {
  id?: string;
  user_id?: string;
  session_start?: string;
  session_end?: string;
  total_tracks_played?: number;
  total_duration?: number;
  unique_tracks?: number;
  device_info?: any;
  quality_settings?: any;
}

class PlayerAnalyticsService {
  private currentSession: StreamingSession | null = null;
  private sessionStartTime: number = 0;
  private sessionTracks: Set<string> = new Set();

  /**
   * Start a new streaming session
   */
  async startSession(deviceInfo?: any, qualitySettings?: any): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const sessionData: StreamingSession = {
        user_id: user?.id,
        session_start: new Date().toISOString(),
        total_tracks_played: 0,
        total_duration: 0,
        unique_tracks: 0,
        device_info: deviceInfo || this.getDeviceInfo(),
        quality_settings: qualitySettings
      };

      const { data, error } = await supabase
        .from('streaming_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        console.error('Failed to start session:', error);
        return null;
      }

      this.currentSession = data;
      this.sessionStartTime = Date.now();
      this.sessionTracks.clear();
      
      return data.id;
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  }

  /**
   * End the current streaming session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession?.id) return;

    try {
      const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      
      const { error } = await supabase
        .from('streaming_sessions')
        .update({
          session_end: new Date().toISOString(),
          total_duration: sessionDuration,
          unique_tracks: this.sessionTracks.size
        })
        .eq('id', this.currentSession.id);

      if (error) {
        console.error('Failed to end session:', error);
      }

      this.currentSession = null;
      this.sessionStartTime = 0;
      this.sessionTracks.clear();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Track a play event
   */
  async trackPlayEvent(event: PlayEvent): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Start session if not already started
      if (!this.currentSession) {
        await this.startSession();
      }

      const playEventData: PlayEvent = {
        ...event,
        user_id: user?.id,
        session_id: this.currentSession?.id,
        played_at: new Date().toISOString(),
        device_type: this.getDeviceType()
      };

      const { error } = await supabase
        .from('play_events')
        .insert([playEventData]);

      if (error) {
        console.error('Failed to track play event:', error);
        return;
      }

      // Update session stats
      if (this.currentSession?.id) {
        this.sessionTracks.add(event.track_id);
        
        await supabase
          .from('streaming_sessions')
          .update({
            total_tracks_played: (this.currentSession.total_tracks_played || 0) + 1,
            unique_tracks: this.sessionTracks.size
          })
          .eq('id', this.currentSession.id);
      }
    } catch (error) {
      console.error('Error tracking play event:', error);
    }
  }

  /**
   * Track play progress (called periodically during playback)
   */
  async trackPlayProgress(
    trackId: string,
    trackType: 'beat' | 'release' | 'pack',
    currentTime: number,
    duration: number,
    playType: 'full' | 'preview' = 'full'
  ): Promise<void> {
    const completionPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    await this.trackPlayEvent({
      track_id: trackId,
      track_type: trackType,
      play_type: playType,
      duration_played: Math.floor(currentTime),
      completion_percentage: Math.min(100, Math.max(0, completionPercentage)),
      source: window.location.pathname
    });
  }

  /**
   * Get popular tracks analytics
   */
  async getPopularTracks(timeframe: string = '30 days', limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('popular_tracks')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Failed to get popular tracks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting popular tracks:', error);
      return [];
    }
  }

  /**
   * Get user listening stats
   */
  async getUserListeningStats(userId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_listening_stats')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        console.error('Failed to get user stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|ios|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Cleanup - should be called when app unmounts
   */
  async cleanup(): Promise<void> {
    await this.endSession();
  }
}

export const playerAnalytics = new PlayerAnalyticsService();