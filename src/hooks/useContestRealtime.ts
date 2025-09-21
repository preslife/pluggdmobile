
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Handlers = {
  onSubmissionInsert?: (row: any) => void;
  onSubmissionUpdate?: (row: any) => void;
  onVoteInsert?: (row: any) => void;
};

/**
 * Subscribes to realtime changes for a specific contest:
 * - contest_submissions: INSERT, UPDATE
 * - contest_votes: INSERT
 *
 * Keeps things lightweight by delegating how to handle each event to the parent via handlers.
 */
export const useContestRealtime = (contestId?: string, handlers: Handlers = {}) => {
  useEffect(() => {
    if (!contestId) return;

    const channel = supabase
      .channel(`contest-realtime-${contestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contest_submissions' },
        (payload) => {
          const row = payload.new as any;
          if (row?.contest_id === contestId) {
            handlers.onSubmissionInsert?.(row);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contest_submissions' },
        (payload) => {
          const row = payload.new as any;
          if (row?.contest_id === contestId) {
            handlers.onSubmissionUpdate?.(row);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contest_votes' },
        (payload) => {
          const row = payload.new as any;
          if (row?.contest_id === contestId) {
            handlers.onVoteInsert?.(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contestId]);
};
