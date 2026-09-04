import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase';

type StorageUploadInput = {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string | null;
  upsert?: boolean;
};

function storageObjectUrl(bucket: string, path: string) {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) throw new Error('Supabase URL is not configured.');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
}

/**
 * Uploads native files without materialising the entire payload in JavaScript.
 * Supabase's browser Blob path remains the web fallback; Android and iOS use
 * the native file-system uploader so large audio/video files stay off the JS
 * heap.
 */
export async function uploadFileToSupabaseStorage(input: StorageUploadInput) {
  if (Platform.OS === 'web') {
    const response = await fetch(input.uri);
    if (!response.ok) throw new Error(`Could not read selected media (${response.status}).`);
    const blob = await response.blob();
    const { error } = await supabase.storage.from(input.bucket).upload(input.path, blob, {
      contentType: input.contentType || 'application/octet-stream',
      upsert: Boolean(input.upsert),
    });
    if (error) throw error;
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in again before uploading media.');

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('Supabase client key is not configured.');

  const result = await FileSystem.uploadAsync(storageObjectUrl(input.bucket, input.path), input.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${session.access_token}`,
      'content-type': input.contentType || 'application/octet-stream',
      'x-upsert': input.upsert ? 'true' : 'false',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    let serverMessage = '';
    try {
      const body = JSON.parse(result.body) as { message?: unknown; error?: unknown };
      serverMessage = String(body.message ?? body.error ?? '').trim();
    } catch {
      serverMessage = '';
    }
    throw new Error(serverMessage || `Media upload failed (${result.status}).`);
  }
}
