import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';
import { mixAccessSession, type MixAccessScope } from '../playback/mixAccessSession';
import { nativeMixAccess } from '../playback/nativeMixAccess';

type Kind = 'audio' | 'cover';
type Visibility = 'public' | 'unlisted' | 'private';
type Asset = { uri: string; name: string; size?: number | null; mimeType?: string | null };
type Location = { bucket: string; path: string; public: boolean };
type Receipt = { version: 1; identity: string; bucket: string; path: string; size: number | null };
type Input = {
  actorId: string; scope: MixAccessScope; mixId: string; visibility: Visibility; kind: Kind;
  file?: Asset | null; existing?: string | null; sourceMixId?: string;
  assertCurrent?: () => void;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT = { audio: 150 * 1024 * 1024, cover: 10 * 1024 * 1024 };
const MIME: Record<Kind, Record<string, string>> = {
  audio: { mp3: 'audio/mpeg', mpeg: 'audio/mpeg', wav: 'audio/wav', wave: 'audio/wav', m4a: 'audio/mp4',
    aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm',
    opus: 'audio/opus', aif: 'audio/aiff', aiff: 'audio/aiff' },
  cover: { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' },
};
const BUCKETS = new Set(['audio-files', 'Mixes-audio', 'mixes-audio', 'mix-media', 'mix-covers', 'release-assets', 'release-artwork', 'artist-images']);

export class NativeMixMediaError extends Error {
  constructor(public readonly reason: 'unavailable' | 'changed' | 'fileRequired' | 'invalidFile' | 'tooLarge' = 'unavailable') {
    super(reason === 'changed' ? 'Your account or Mix changed. Reopen it before continuing.'
      : reason === 'fileRequired' ? 'Choose the original file again to prepare this Mix.'
        : reason === 'invalidFile' ? 'Choose a supported audio file or image.'
          : reason === 'tooLarge' ? 'Mix audio must be 150 MB or smaller; artwork must be 10 MB or smaller.'
            : 'Your Mix files could not be prepared. Your originals are kept. Try again.');
  }
}

function location(value: string, origin: string): Location | null {
  try {
    let reference = value;
    let publicRoute = false;
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      if (url.origin !== origin || url.username || url.password || url.hash) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(public|sign|authenticated)\/([^/]+)\/(.+)$/);
      if (!match) return null;
      publicRoute = match[1] === 'public';
      reference = `${match[2]}/${decodeURIComponent(match[3])}`;
    }
    const slash = reference.indexOf('/');
    const bucket = reference.slice(0, slash), path = reference.slice(slash + 1);
    if (slash < 1 || !BUCKETS.has(bucket) || !path || /[%?#\\\u0000-\u001f\u007f]/.test(path)
      || path.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return { bucket, path, public: publicRoute };
  } catch { return null; }
}

function fileType(name: string, kind: Kind) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME[kind][extension];
  if (!contentType) throw new NativeMixMediaError('invalidFile');
  return { extension, contentType };
}

async function bounded<T>(work: PromiseLike<T>, milliseconds = 8_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve(work), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new NativeMixMediaError()), milliseconds);
    })]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

/** Native I/O stays disk-backed. No signed grants or downloaded payloads are
 * persisted as recovery state. Only immutable destination receipts survive.
 */
export class NativeMixMediaPreparation {
  private readonly active = new Map<string, Promise<string | null>>();
  constructor(private readonly dependencies = {
    client: supabase, storage: AsyncStorage, files: FileSystem, upload: uploadFileToSupabaseStorage,
    access: nativeMixAccess, session: mixAccessSession, randomUUID: Crypto.randomUUID,
    hash: (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
    projectUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  }) {}

  async prepare(input: Input): Promise<string | null> {
    const check = () => {
      if (input.scope.actor !== input.actorId || !this.dependencies.session.current(input.scope)) throw new NativeMixMediaError('changed');
      input.assertCurrent?.();
    };
    try {
      check();
      if (!UUID.test(input.actorId) || !UUID.test(input.mixId) || !['audio', 'cover'].includes(input.kind)
        || !['private', 'unlisted', 'public'].includes(input.visibility)) throw new NativeMixMediaError();
      const origin = new URL(this.dependencies.projectUrl).origin;
      if (!origin.startsWith('https://')) throw new NativeMixMediaError();
      // A private path is never attempted against the older public-only server.
      const ready = await bounded(this.dependencies.client.functions.invoke('mix-access', { body: { action: 'capabilities' } }));
      check();
      if (ready.error || ready.data?.version !== 1 || ready.data.privateMixes !== true || ready.data.ownerWrites !== 1
        || ready.data.maxAudioBytes !== LIMIT.audio) {
        throw new NativeMixMediaError();
      }
      if (!input.file && !input.existing) {
        if (input.kind === 'audio') throw new NativeMixMediaError('fileRequired');
        return null;
      }
      const protectedTarget = input.kind === 'audio' || input.visibility !== 'public';
      const bucket = protectedTarget ? 'mix-media' : 'release-artwork';
      const source = input.existing ? location(input.existing, origin) : null;
      if (!input.file && input.existing && input.visibility === 'public'
        && (input.kind === 'audio' || source?.bucket !== 'mix-media') && (!source || source.bucket !== 'mix-media'
          || source.path.startsWith(`${input.actorId}/${input.mixId}/audio/`))) return input.existing;
      if (!input.file && !source) throw new NativeMixMediaError('fileRequired');
      const file = input.file;
      const type = fileType(file?.name ?? source!.path, input.kind);
      const inspectFile = async () => {
        if (!file || !file.uri.startsWith('file://')) throw new NativeMixMediaError('fileRequired');
        const info = await bounded(this.dependencies.files.getInfoAsync(file.uri, { md5: true })); check();
        if (!info.exists || info.isDirectory || !Number.isSafeInteger(info.size) || info.size <= 0 || !info.md5
          || !/^[0-9a-f]{32}$/i.test(info.md5)) throw new NativeMixMediaError('fileRequired');
        if (info.size > LIMIT[input.kind]) throw new NativeMixMediaError('tooLarge');
        return { size: info.size, md5: info.md5 };
      };
      const fileInfo = file ? await inspectFile() : null;
      const identity = await this.dependencies.hash(JSON.stringify([input.actorId, input.mixId, input.kind, bucket,
        file ? [file.uri, fileInfo!.size, fileInfo!.md5, type.extension] : [source!.bucket, source!.path]]));
      check();
      if (!/^[0-9a-f]{64}$/i.test(identity)) throw new NativeMixMediaError();
      const key = `pluggd:mix-media:v1:${input.actorId}:${input.mixId}:${identity}`;
      const existingWork = this.active.get(key);
      if (existingWork) { const result = await existingWork; check(); return result; }
      const run = async () => {
        const store = this.dependencies.storage;
        const storage = this.dependencies.client.storage;
        const prefix = `${input.actorId}/${input.mixId}/${input.kind}/`;
        let receipt: Receipt;
        const saved = await bounded(store.getItem(key)); check();
        if (saved) {
          const candidate = JSON.parse(saved) as Receipt;
          const filename = candidate?.path?.slice(prefix.length) ?? '';
          if (candidate?.version !== 1 || candidate.identity !== identity || candidate.bucket !== bucket
            || !candidate.path.startsWith(prefix) || !filename.endsWith(`.${type.extension}`)
            || !UUID.test(filename.slice(0, -(type.extension.length + 1)))
            || (candidate.size !== null && (!Number.isSafeInteger(candidate.size) || candidate.size <= 0 || candidate.size > LIMIT[input.kind]))
            || (fileInfo && candidate.size !== fileInfo.size)) throw new NativeMixMediaError();
          receipt = candidate;
        } else {
          const id = this.dependencies.randomUUID();
          if (!UUID.test(id)) throw new NativeMixMediaError();
          receipt = { version: 1, identity, bucket, path: `${prefix}${id}.${type.extension}`, size: fileInfo?.size ?? null };
          await bounded(store.setItem(key, JSON.stringify(receipt))); check();
        }
        const reference = () => bucket === 'mix-media' ? `mix-media/${receipt.path}`
          : `${origin}/storage/v1/object/public/${bucket}/${receipt.path}`;
        const sizeOf = (data: { name: string; size?: number; metadata?: Record<string, unknown> } | null) => {
          const size = data?.size ?? Number(data?.metadata?.size);
          if (typeof size === 'number' && size > LIMIT[input.kind]) throw new NativeMixMediaError('tooLarge');
          if (!data || !Number.isSafeInteger(size) || size <= 0) throw new NativeMixMediaError();
          return size;
        };
        const recover = async () => {
          const result = await bounded(storage.from(bucket).info(receipt.path)); check();
          if (result.error) {
            if (Number(result.error.statusCode ?? (result.error as { status?: number }).status) === 404) return false;
            throw new NativeMixMediaError();
          }
          const size = sizeOf(result.data);
          if (![receipt.path, receipt.path.split('/').pop()].includes(result.data!.name)
            || (receipt.size !== null && receipt.size !== size)) throw new NativeMixMediaError();
          return true;
        };
        // Reuse only a current parent-owned protected object. A duplicate must
        // copy it to its new parent even when the owner has not changed.
        if (!file && source?.bucket === 'mix-media' && source.path.startsWith(prefix) && protectedTarget) {
          const existing = await bounded(storage.from(source.bucket).info(source.path)); check();
          if (existing.error) throw new NativeMixMediaError('fileRequired');
          sizeOf(existing.data);
          return `mix-media/${source.path}`;
        }
        if (await recover()) return reference();
        const upload = async (asset: Asset) => {
          check();
          await this.dependencies.upload({ bucket, path: receipt.path, uri: asset.uri,
            contentType: type.contentType, upsert: false, foreground: true });
          check();
        };
        if (file) {
          const before = await inspectFile();
          if (before.md5 !== fileInfo!.md5 || before.size !== fileInfo!.size) throw new NativeMixMediaError('changed');
          // The picker URI can change during a native upload. Capture its bytes
          // into a task-owned disk snapshot first; a same-size source change
          // must not poison an immutable recovery target.
          const files = this.dependencies.files;
          if (!files.cacheDirectory) throw new NativeMixMediaError();
          const snapshotId = this.dependencies.randomUUID();
          if (!UUID.test(snapshotId)) throw new NativeMixMediaError();
          const snapshot = `${files.cacheDirectory}pluggd-mix-upload-${snapshotId}.${type.extension}`;
          let expired = false;
          const snapshotWork = (async () => {
            try {
              await files.copyAsync({ from: file.uri, to: snapshot }); check();
              if (expired) throw new NativeMixMediaError();
              const captured = await files.getInfoAsync(snapshot, { md5: true }); check();
              if (expired) throw new NativeMixMediaError();
              if (!captured.exists || captured.isDirectory || captured.size !== fileInfo!.size || captured.md5 !== fileInfo!.md5) {
                throw new NativeMixMediaError('changed');
              }
              // Await the native promise here so cleanup cannot race an upload
              // which outlives the caller's deadline.
              await this.dependencies.upload({ bucket, path: receipt.path, uri: snapshot,
                contentType: type.contentType, upsert: false, foreground: true }); check();
            } finally { await files.deleteAsync(snapshot, { idempotent: true }).catch(() => undefined); }
          })();
          try { await bounded(snapshotWork,180_000); }
          catch (error) { expired = true; check(); if (!await recover()) throw error; }
          const after = await inspectFile();
          if (after.md5 !== fileInfo!.md5 || after.size !== fileInfo!.size) throw new NativeMixMediaError('changed');
          if (!await recover()) throw new NativeMixMediaError();
          return reference();
        }
        const sourceInfo = await bounded(storage.from(source!.bucket).info(source!.path)); check();
        if (sourceInfo.error) {
          if (![403, 404].includes(Number(sourceInfo.error.statusCode ?? (sourceInfo.error as { status?: number }).status))) throw new NativeMixMediaError();
        } else receipt.size = sizeOf(sourceInfo.data);
        await bounded(store.setItem(key, JSON.stringify(receipt))); check();
        try { await bounded(storage.from(source!.bucket).copy(source!.path, receipt.path, { destinationBucket: bucket })); }
        catch { check(); /* An uncertain copy is resolved by immutable target readback. */ }
        check();
        if (await recover()) return reference();
        let grant: string;
        if (input.kind === 'audio') {
          const sourceId = input.sourceMixId ?? input.mixId;
          if (!UUID.test(sourceId)) throw new NativeMixMediaError();
          const owner = await bounded(this.dependencies.access.read(sourceId)); check();
          if (!owner.owner || owner.mix.owner_user_id !== input.actorId) throw new NativeMixMediaError();
          grant = (await bounded(this.dependencies.access.play(sourceId))).url;
        } else if (source!.public) grant = input.existing!;
        else {
          const signed = await bounded(storage.from(source!.bucket).createSignedUrl(source!.path, 300)); check();
          if (signed.error || !signed.data?.signedUrl) throw new NativeMixMediaError('fileRequired');
          grant = signed.data.signedUrl;
        }
        check();
        const authorized = location(grant, origin);
        if (!authorized || authorized.bucket !== source!.bucket || authorized.path !== source!.path) throw new NativeMixMediaError('changed');
        // Bound the caller, not the native upload's scratch-file lifetime. The
        // disk-copy task owns its file until the real native promise settles.
        await bounded(this.copyThroughDisk(grant, type.extension, input.kind, receipt.size, check, async asset => {
          if (receipt.size === null) {
            receipt.size = asset.size ?? null;
            await bounded(store.setItem(key, JSON.stringify(receipt))); check();
          }
          await upload(asset);
        }),180_000);
        if (!await recover()) throw new NativeMixMediaError();
        return reference();
      };
      const work = run(); this.active.set(key, work);
      try { const result = await work; check(); return result; } finally { this.active.delete(key); }
    } catch (error) {
      if (error instanceof NativeMixMediaError) throw error;
      // Provider errors may contain signed URLs, private names or local paths.
      throw new NativeMixMediaError();
    }
  }

  private async copyThroughDisk(grant: string, extension: string, kind: Kind, expectedSize: number | null,
    check: () => void, upload: (asset: Asset) => Promise<void>) {
    const files = this.dependencies.files;
    if (!files.cacheDirectory) throw new NativeMixMediaError();
    const id = this.dependencies.randomUUID();
    if (!UUID.test(id)) throw new NativeMixMediaError();
    const uri = `${files.cacheDirectory}pluggd-mix-copy-${id}.${extension}`;
    let rejected: NativeMixMediaError | undefined;
    let cancellation: Promise<boolean> | undefined;
    let rejectDownload: (error: NativeMixMediaError) => void = () => undefined;
    let finished = false;
    const interrupted = new Promise<never>((_, reject) => { rejectDownload = reject; });
    const cancel = (error: NativeMixMediaError) => {
      if (rejected) return;
      rejected = error;
      cancellation = bounded(task.cancelAsync()).then(() => true, () => false);
      rejectDownload(error);
    };
    const task = files.createDownloadResumable(grant, uri, { sessionType: files.FileSystemSessionType.FOREGROUND }, progress => {
      try { check(); } catch { cancel(new NativeMixMediaError('changed')); return; }
      if (progress.totalBytesWritten > LIMIT[kind] || progress.totalBytesExpectedToWrite > LIMIT[kind]) cancel(new NativeMixMediaError('tooLarge'));
    });
    const timer = setTimeout(() => cancel(new NativeMixMediaError()), 120_000);
    try {
      const result = await Promise.race([task.downloadAsync(), interrupted]); finished = true; clearTimeout(timer); check();
      if (rejected) throw rejected;
      if (result?.status !== 200 || result.uri !== uri) throw new NativeMixMediaError('fileRequired');
      const info = await bounded(files.getInfoAsync(uri)); check();
      if (!info.exists || info.isDirectory || !Number.isSafeInteger(info.size) || info.size <= 0) throw new NativeMixMediaError();
      if (info.size > LIMIT[kind]) throw new NativeMixMediaError('tooLarge');
      if (expectedSize !== null && info.size !== expectedSize) throw new NativeMixMediaError('changed');
      await upload({ uri, name: `asset.${extension}`, size: info.size }); check();
    } catch (error) {
      if (!finished && !cancellation) cancellation = bounded(task.cancelAsync()).then(() => true, () => false);
      throw error;
    } finally {
      clearTimeout(timer);
      const stopped = cancellation ? await cancellation : finished;
      // This unique scratch file is disposable; source and uploaded recovery
      // objects are never removed after a failed or uncertain operation.
      if (stopped) await files.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    }
  }
}

export const nativeMixMediaPreparation = new NativeMixMediaPreparation();
