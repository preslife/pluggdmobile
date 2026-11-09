import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { mixAccessSession, type MixAccessScope } from '../playback/mixAccessSession';

type Actor = { actorId: string; scope: MixAccessScope; mixId: string; assertCurrent?: () => void };
export type NativeMixRevisionInput = Actor & {
  create?: boolean; expectedUpdatedAt?: string | null; details: Record<string, unknown>;
  tracklist?: Record<string, unknown>[] | null; sourceMixId?: string | null; sourceUpdatedAt?: string | null;
};
type Payload = {
  p_mix_id: string; p_expected_updated_at: string | null; p_create: boolean; p_details: Record<string, unknown>;
  p_tracklist: Record<string, unknown>[] | null; p_source_mix_id: string | null; p_source_updated_at: string | null;
};
type Pending = { version: 1; actorId: string; requestId: string; payload: Payload };
export type NativeMixRevisionResult = {
  id: string; updatedAt: string; status: 'draft' | 'published' | 'archived'; visibility: 'public' | 'unlisted' | 'private';
  current: boolean; recoveryPending: boolean;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = new Set(['title','description','audio_url','cover_url','duration_seconds','recording_type','event_name','city',
  'bpm_min','bpm_max','genre_tags','mood_tags','allow_download','status','visibility']);
const timestamp = (value: unknown): value is string => typeof value === 'string' && value.length < 64 && Number.isFinite(Date.parse(value));
function canonical(value: unknown): string {
  const sort = (entry: any): any => Array.isArray(entry) ? entry.map(sort) : entry && typeof entry === 'object'
    ? Object.fromEntries(Object.keys(entry).sort().filter(key => entry[key] !== undefined).map(key => [key,sort(entry[key])])) : entry;
  return JSON.stringify(sort(value));
}

export class NativeMixRevisionError extends Error {
  constructor(public readonly reason: 'unavailable' | 'changed' | 'conflict' | 'invalid' | 'permission' | 'pending' | 'noPending' = 'unavailable') {
    super(reason === 'changed' ? 'Your account or Mix changed. Reopen it before continuing.'
      : reason === 'conflict' ? 'This Mix has changed since you opened it. Review the latest version before saving.'
        : reason === 'invalid' ? 'Check this Mix’s details and tracklist before saving again.'
          : reason === 'permission' ? 'This Mix is no longer available in your Creator Studio. Reopen your catalogue.'
        : reason === 'pending' ? 'This Mix has an unfinished save. Recover that save before making more changes.'
          : reason === 'noPending' ? 'There is no unfinished save for this Mix.'
            : 'Your save could not be confirmed. Your recovery copy is kept. Try again.');
  }
}

/** One actor/target-bound pending operation survives network loss and restarts.
 * A different edited form cannot silently replace an uncertain request. The
 * recovery action replays exactly that request; no fresh create ID is invented.
 */
export class NativeMixRevisionClient {
  private readonly active = new Set<string>();
  constructor(private readonly deps = {
    storage: AsyncStorage, session: mixAccessSession, randomUUID,
    invoke: (payload: Payload & { p_request_id: string }) => (supabase as any).rpc('save_mix_owner_revision',payload) as PromiseLike<{data:unknown;error:unknown}>,
  }) {}

  private context(actor: Actor) {
    const check = () => {
      if (!UUID.test(actor.actorId) || !UUID.test(actor.mixId) || actor.scope.actor !== actor.actorId || !this.deps.session.current(actor.scope)) {
        throw new NativeMixRevisionError('changed');
      }
      try { actor.assertCurrent?.(); } catch { throw new NativeMixRevisionError('changed'); }
    };
    check();
    return { check, key: `pluggd:mix-revision:v1:${actor.actorId}:${actor.mixId}` };
  }

  private validate(payload: Payload, mixId: string) {
    if (!payload || payload.p_mix_id !== mixId || typeof payload.p_create !== 'boolean'
      || !payload.p_details || typeof payload.p_details !== 'object' || Array.isArray(payload.p_details)
      || Object.keys(payload.p_details).some(key => !FIELDS.has(key))
      || (payload.p_create ? payload.p_expected_updated_at !== null : !timestamp(payload.p_expected_updated_at))
      || (payload.p_tracklist !== null && (!Array.isArray(payload.p_tracklist) || payload.p_tracklist.length > 500))
      || (payload.p_source_mix_id !== null && (!UUID.test(payload.p_source_mix_id) || !payload.p_create || !timestamp(payload.p_source_updated_at)))
      || (payload.p_source_mix_id === null && payload.p_source_updated_at !== null)
      || canonical(payload).length > 1_048_576) throw new NativeMixRevisionError();
    // Capabilities/signed grants never become durable mutation receipts. Raw
    // catalogue storage references are permitted; delivery URLs are not.
    for (const key of ['audio_url','cover_url']) {
      const value=payload.p_details[key];
      if (typeof value === 'string' && (/\/storage\/v1\/object\/sign\//i.test(value) || /[?&#](token|access_token)=/i.test(value))) {
        throw new NativeMixRevisionError();
      }
    }
  }

  private async pending(actor: Actor, key: string, check: () => void): Promise<Pending | null> {
    const stored=await this.deps.storage.getItem(key); check();
    if (!stored) return null;
    const pending=JSON.parse(stored) as Pending;
    if (pending?.version !== 1 || pending.actorId !== actor.actorId || !UUID.test(pending.requestId)) throw new NativeMixRevisionError();
    this.validate(pending.payload,actor.mixId);
    return pending;
  }

  async hasPending(actor: Actor): Promise<boolean> {
    const {key,check}=this.context(actor);
    try { return (await this.pending(actor,key,check)) !== null; }
    catch(error) { if(error instanceof NativeMixRevisionError) throw error; throw new NativeMixRevisionError(); }
  }

  save(input: NativeMixRevisionInput): Promise<NativeMixRevisionResult> {
    const payload: Payload={p_mix_id:input.mixId,p_expected_updated_at:input.expectedUpdatedAt ?? null,p_create:input.create === true,
      p_details:input.details,p_tracklist:input.tracklist ?? null,p_source_mix_id:input.sourceMixId ?? null,p_source_updated_at:input.sourceUpdatedAt ?? null};
    return this.run(input,payload);
  }

  resume(actor: Actor): Promise<NativeMixRevisionResult> { return this.run(actor); }

  private async run(actor: Actor, payload?: Payload): Promise<NativeMixRevisionResult> {
    const {key,check:contextCheck}=this.context(actor);
    let expired=false;
    const check=()=>{contextCheck();if(expired) throw new NativeMixRevisionError();};
    if(this.active.has(key)) throw new NativeMixRevisionError('pending');
    this.active.add(key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if(payload) { payload=JSON.parse(canonical(payload)) as Payload; this.validate(payload,actor.mixId); }
      const stored=await this.pending(actor,key,check);
      let pending=stored;
      if(payload) {
        // Copy caller data before the first network write; a changing form must
        // never mutate the exact request held in memory for a retry.
        if(pending && canonical(pending.payload)!==canonical(payload)) throw new NativeMixRevisionError('pending');
        if(!pending) {
          const id=this.deps.randomUUID(); if(!UUID.test(id)) throw new NativeMixRevisionError();
          pending={version:1,actorId:actor.actorId,requestId:id,payload};
          await this.deps.storage.setItem(key,JSON.stringify(pending)); check();
        }
      }
      if(!pending) throw new NativeMixRevisionError('noPending');
      const operation={...pending.payload,p_request_id:pending.requestId};
      let response: {data:unknown;error:unknown};
      const work=(async()=>{
        let result=await this.deps.invoke(operation); check();
        // Parent-first revision writes and old direct child writers can deadlock.
        // PostgreSQL aborts the transaction; replay the SAME receipt once.
        if((result.error as {code?:string})?.code==='40P01') { result=await this.deps.invoke(operation); check(); }
        return result;
      })();
      response=await Promise.race([work,new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>{expired=true;reject(new NativeMixRevisionError());},15_000);
      })]);
      // The network outcome is now known. A slow local cleanup must not turn
      // a confirmed save into a timeout after deleting its recovery receipt.
      if(timer!==undefined) {clearTimeout(timer);timer=undefined;}
      check();
      if(response.error) {
        const code=(response.error as {code?:string}).code;
        // These database errors confirm a rolled-back transaction. Clear only
        // its request receipt so the still-retained form can be reviewed/fixed.
        // Transport/unknown results keep the exact pending request instead.
        const failure=code==='40001'||code==='23505' ? 'conflict'
          : ['22023','22P02','23503','23514'].includes(code??'') ? 'invalid' : code==='42501' ? 'permission' : null;
        if(failure) {
          await this.deps.storage.removeItem(key); check();
          throw new NativeMixRevisionError(failure);
        }
        throw new NativeMixRevisionError();
      }
      const result=response.data as Record<string,any> | null;
      if(!result || result.id!==actor.mixId || !timestamp(result.updated_at) || typeof result.current!=='boolean'
        || !['draft','published','archived'].includes(result.status) || !['public','unlisted','private'].includes(result.visibility)) {
        throw new NativeMixRevisionError();
      }
      let recoveryPending=false;
      try { await this.deps.storage.removeItem(key); } catch { recoveryPending=true; }
      check();
      return {id:result.id,updatedAt:result.updated_at,status:result.status,visibility:result.visibility,current:result.current,recoveryPending};
    } catch(error) {
      if(error instanceof NativeMixRevisionError) throw error;
      throw new NativeMixRevisionError();
    } finally { if(timer!==undefined) clearTimeout(timer); this.active.delete(key); }
  }
}

export const nativeMixRevision = new NativeMixRevisionClient();
