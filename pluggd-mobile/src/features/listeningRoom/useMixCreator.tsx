import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { pluggdFonts } from '../../design/typography';
import { toggleProfileFollow } from '../culture/mobileServices';
import { mixAccessSession, type MixAccessScope } from '../playback/mixAccessSession';
import { useMixSessionIdentity } from '../playback/useNativeMixDetail';
import { coverImageUrl } from './deckBridge';
import { withMixSocialLock } from './mixSocialService';

type Creator = { name: string; avatarUrl: string | null; route: string; following: boolean };
/** Public creator metadata only. Private mix identities never enter this cache. */
export function useMixCreator(mixId: string | undefined, ownerId: string | undefined, publicMix: boolean, active: () => boolean) {
  const identity = useMixSessionIdentity(); const client = useQueryClient(); const router = useRouter();
  const key = ['mix-creator', identity.key, mixId, ownerId] as const;
  const enabled = Boolean(identity.ready && publicMix && mixId && ownerId);
  let captured: MixAccessScope | null = null;
  try { captured = mixAccessSession.scope(); } catch { /* Await auth hydration. */ }
  const scope = captured;
  const query = useQuery<Creator>({ queryKey: key, enabled, staleTime: 0, gcTime: 0, retry: 1,
    queryFn: async () => {
      if (!scope || !mixId || !ownerId || !publicMix) throw Error('Creator unavailable');
      mixAccessSession.assertCurrent(scope);
      const verified = await (supabase as any).from('mixes').select('owner_user_id').eq('id',mixId).eq('status','published').eq('visibility','public').maybeSingle();
      mixAccessSession.assertCurrent(scope);
      if (verified.error || verified.data?.owner_user_id !== ownerId) throw Error('Creator unavailable');
      const [profile, follow] = await Promise.all([
        (supabase as any).from('profiles').select('user_id,full_name,username,avatar_url').eq('user_id',ownerId).maybeSingle(),
        scope.actor ? (supabase as any).from('user_follows').select('id').eq('follower_id',scope.actor).eq('following_id',ownerId).maybeSingle() : Promise.resolve({data:null,error:null}),
      ]);
      mixAccessSession.assertCurrent(scope);
      const name = profile.data?.full_name?.trim() || profile.data?.username?.trim();
      if (profile.error || follow.error || !name) throw Error('Creator unavailable');
      const username = profile.data.username?.trim();
      return { name, avatarUrl: coverImageUrl(profile.data.avatar_url), route: username ? `/creator/${encodeURIComponent(username)}` : `/user/${encodeURIComponent(ownerId)}`, following: Boolean(follow.data) };
    },
  });
  const follow = useMutation({ mutationKey: ['mix-creator-follow',identity.key,ownerId],
    onMutate: async (actor: MixAccessScope) => { await client.cancelQueries({queryKey:key,exact:true}); mixAccessSession.assertCurrent(actor); },
    mutationFn: async (actor: MixAccessScope) => {
      if (!ownerId || !actor.actor || !publicMix || !active()) throw Error('Creator unavailable');
      const result = await toggleProfileFollow(ownerId,()=>mixAccessSession.assertCurrent(actor),actor.actor);
      mixAccessSession.assertCurrent(actor);
      if (!result.success) throw Error('Your follow choice could not be saved.');
      return result.saved;
    },
    onSuccess: async (following,actor) => {
      await client.cancelQueries({queryKey:key,exact:true});
      if (mixAccessSession.current(actor)) client.setQueryData<Creator>(key,old=>old?{...old,following:Boolean(following)}:old);
    },
    onError: (_error,actor) => { if (mixAccessSession.current(actor) && active()) Alert.alert('Follow unavailable','Your choice could not be saved. Please try again.'); },
    onSettled: (_data,_error,actor) => { if (mixAccessSession.current(actor)) void client.invalidateQueries({queryKey:key,exact:true}); },
  });
  const buttonStyle = {minHeight:44,paddingHorizontal:14,borderRadius:22,borderWidth:1,borderColor:'rgba(240,238,227,0.3)',alignItems:'center' as const,justifyContent:'center' as const};
  const labelStyle = {fontFamily:pluggdFonts.satoshiBold,fontSize:13,color:'#f0eee3'};
  const followSlot = !enabled ? null : query.isPending ? <ActivityIndicator accessibilityLabel="Loading creator" color="#d7e769"/> : query.isError ?
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Retry creator details" onPress={()=>void query.refetch()} style={buttonStyle}><Text style={labelStyle}>Creator could not load · Try again</Text></Pressable> : scope?.actor===ownerId ? null :
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={query.data?.following?'Unfollow creator':'Follow creator'} accessibilityState={{selected:Boolean(query.data?.following),disabled:follow.isPending,busy:follow.isPending}} disabled={follow.isPending}
      onPress={()=>{
        if (!active() || !scope) return;
        if (!scope.actor) {router.push('/auth/login');return;}
        void withMixSocialLock(`creator-follow:${identity.key}:${ownerId}`,()=>follow.mutateAsync(scope)).catch(()=>undefined);
      }} style={[buttonStyle,follow.isPending&&{opacity:0.5}]}><Text style={labelStyle}>{follow.isPending?'Saving…':query.data?.following?'Following':'Follow'}</Text></Pressable>;
  const data = query.data;
  return { creator: publicMix && data ? {name:data.name,avatarUrl:data.avatarUrl,onPress:()=>{if(active())router.push(data.route as any);}} : undefined, followSlot };
}
