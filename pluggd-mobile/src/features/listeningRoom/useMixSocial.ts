import { useMutation, useQuery, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { mixAccessSession, type MixAccessScope } from '../playback/mixAccessSession';
import { useMixSessionIdentity } from '../playback/useNativeMixDetail';
import { supabase } from '../../lib/supabase';
import { createMixSocialService, withMixSocialLock, type MixSocialState } from './mixSocialService';

const service = createMixSocialService(supabase as any, scope => mixAccessSession.assertCurrent(scope));
export function useMixSocial(mixId: string | null | undefined, publicMix: boolean) {
  const identity = useMixSessionIdentity();
  const client = useQueryClient();
  const key = ['mix-social', identity.key, mixId ?? 'none'] as const;
  const mutationKey = ['mix-social-change', identity.key, mixId ?? 'none'] as const;
  const pending = useIsMutating({ mutationKey }) > 0;
  let scope: MixAccessScope | null = null;
  try { scope = mixAccessSession.scope(); } catch { /* Auth hydration is pending. */ }
  const captured = scope;
  const query = useQuery<MixSocialState>({
    queryKey: key, enabled: Boolean(identity.ready && publicMix && mixId && captured?.actor && !pending), staleTime: 30_000, gcTime: 0,
    queryFn: async () => {
      if (!captured?.actor || !mixId || !publicMix) throw new Error('Sign in to Like or Save this mix.');
      return service.read(captured, mixId);
    },
  });
  const change = useMutation({
    mutationKey,
    onMutate: async ({ scope: actorScope }: { kind: 'like' | 'save'; scope: MixAccessScope }) => {
      await client.cancelQueries({ queryKey: key, exact: true });
      mixAccessSession.assertCurrent(actorScope);
    },
    mutationFn: async ({ kind, scope: actorScope }: { kind: 'like' | 'save'; scope: MixAccessScope }) => {
      mixAccessSession.assertCurrent(actorScope);
      const before = client.getQueryData<MixSocialState>(key);
      if (!publicMix || !mixId || !before) throw new Error('Your choices could not load. Please try again.');
      return service.change(actorScope, mixId, kind, kind === 'like' ? !before.liked : !before.saved);
    },
    onSuccess: async (value, variables) => {
      // Also retire any manual retry that began while the write was in flight.
      await client.cancelQueries({ queryKey: key, exact: true });
      if (!mixAccessSession.current(variables.scope)) return;
      client.setQueryData(key, value);
      void client.invalidateQueries({ queryKey: ['culture', 'library'] });
    },
    onError: async (_error, variables) => {
      if (mixAccessSession.current(variables.scope)) {
        await client.cancelQueries({ queryKey: key, exact: true });
        if (!mixAccessSession.current(variables.scope)) return;
        void client.invalidateQueries({ queryKey: ['culture', 'library'] });
        // A canonical delete may have succeeded before legacy removal failed. Show actual state.
        if (publicMix && mixId) {
          try { await client.fetchQuery({ queryKey: key, queryFn: () => service.read(variables.scope, mixId), staleTime: 0 }); }
          catch { /* The visible query error and action error both retain retry. */ }
        }
      }
    },
  });
  const toggle = (kind: 'like' | 'save') => {
    if (!publicMix || !mixId) return Promise.reject(new Error('This action is only available for public mixes.'));
    if (!captured?.actor) return Promise.reject(new Error('Sign in to Like or Save this mix.'));
    try { mixAccessSession.assertCurrent(captured); } catch (error) { return Promise.reject(error); }
    return withMixSocialLock(`${identity.key}:${mixId}`, () => change.mutateAsync({ kind, scope: captured }));
  };
  return { ...query.data, signedIn: Boolean(captured?.actor), ready: identity.ready && (!captured?.actor || Boolean(query.data)), loading: !identity.ready || Boolean(captured?.actor && publicMix && mixId && query.isPending),
    error: query.error ? 'Your Like and Save choices could not load.' : null,
    busy: pending, retry: query.refetch,
    toggleLike: () => toggle('like'), toggleSave: () => toggle('save') };
}
