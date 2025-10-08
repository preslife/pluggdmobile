import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type SessionRecording = {
  id: string;
  sessionId: string;
  hostId: string;
  title: string;
  playbackUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  createdAt: string;
  sessionTitle?: string | null;
  sessionDate?: string | null;
};

export type SessionRecordingPayload = {
  session_id: string;
  title: string;
  playback_url?: string | null;
  duration_seconds?: number | null;
  published_at?: string | null;
  recording_id?: string;
};

export const useSessionRecordings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecordings = useCallback(async () => {
    if (!user?.id) {
      setRecordings([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_recordings')
        .select(`
          id,
          session_id,
          host_id,
          title,
          playback_url,
          duration_seconds,
          published_at,
          created_at,
          session_rooms:session_id (
            title,
            created_at
          )
        `)
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((recording: any) => ({
        id: recording.id,
        sessionId: recording.session_id,
        hostId: recording.host_id,
        title: recording.title,
        playbackUrl: recording.playback_url ?? null,
        durationSeconds: recording.duration_seconds ?? null,
        publishedAt: recording.published_at ?? null,
        createdAt: recording.created_at,
        sessionTitle: recording.session_rooms?.title ?? null,
        sessionDate: recording.session_rooms?.created_at ?? null,
      }));

      setRecordings(formatted);
    } catch (error) {
      console.error('Error fetching session recordings:', error);
      toast({
        title: 'Unable to load recordings',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const invokeRecordingManager = useCallback(
    async (
      action: 'attach' | 'update' | 'delete',
      payload: SessionRecordingPayload | { recording_id: string }
    ) => {
      const { data, error } = await supabase.functions.invoke('session-recording-manager', {
        body: { action, payload },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    []
  );

  const attachRecording = useCallback(
    async (payload: SessionRecordingPayload) => {
      try {
        await invokeRecordingManager('attach', payload);
        toast({
          title: 'Recording attached',
          description: 'The session recording is now available to fans.',
        });
        await fetchRecordings();
        return true;
      } catch (error) {
        console.error('Error attaching recording:', error);
        toast({
          title: 'Attach recording failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchRecordings, invokeRecordingManager, toast]
  );

  const updateRecording = useCallback(
    async (payload: SessionRecordingPayload) => {
      try {
        await invokeRecordingManager('update', payload);
        toast({
          title: 'Recording updated',
          description: 'Changes to the recording details were saved.',
        });
        await fetchRecordings();
        return true;
      } catch (error) {
        console.error('Error updating recording:', error);
        toast({
          title: 'Update recording failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchRecordings, invokeRecordingManager, toast]
  );

  const deleteRecording = useCallback(
    async (recordingId: string) => {
      try {
        await invokeRecordingManager('delete', { recording_id: recordingId });
        toast({
          title: 'Recording removed',
          description: 'The recording has been detached from the session.',
        });
        await fetchRecordings();
        return true;
      } catch (error) {
        console.error('Error deleting recording:', error);
        toast({
          title: 'Delete recording failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchRecordings, invokeRecordingManager, toast]
  );

  return {
    recordings,
    loading,
    refetch: fetchRecordings,
    attachRecording,
    updateRecording,
    deleteRecording,
  };
};

export default useSessionRecordings;
