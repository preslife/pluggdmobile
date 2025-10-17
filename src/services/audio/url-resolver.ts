import { supabase } from '@/integrations/supabase/client';

type AudioQuality = 'auto' | 'high' | 'medium' | 'low';

function extractBucketAndPathFromStorageUrl(url: string): { bucket: string | null; path: string | null; mode: 'sign' | 'public' | null } {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/'); // ['', 'storage', 'v1', 'object', 'sign'|'public', '<bucket>', '<...path segments>']
    const idx = parts.findIndex(p => p === 'object');
    if (idx === -1) return { bucket: null, path: null, mode: null };
    const mode = (parts[idx + 1] as 'sign' | 'public');
    const bucket = parts[idx + 2];
    const path = parts.slice(idx + 3).join('/');
    return { bucket, path, mode };
  } catch {
    return { bucket: null, path: null, mode: null };
  }
}

function extractBucketAndPathFromString(input: string): { bucket: string | null; path: string | null } {
  // Accept forms like 'audio-files/uid/file.wav' or just 'uid/file.wav' (assume audio-files if ambiguous)
  const trimmed = input.replace(/^\/+/, '');
  if (trimmed.startsWith('audio-files/')) {
    return { bucket: 'audio-files', path: trimmed.replace(/^audio-files\//, '') };
  }
  if (trimmed.startsWith('release-audio/')) {
    return { bucket: 'release-audio', path: trimmed.replace(/^release-audio\//, '') };
  }
  if (trimmed.startsWith('battle-audio/')) {
    return { bucket: 'battle-audio', path: trimmed.replace(/^battle-audio\//, '') };
  }
  // Fallback: treat as audio-files path if it looks like a UUID folder
  if (/^[0-9a-fA-F-]{36}\//.test(trimmed)) {
    return { bucket: 'audio-files', path: trimmed };
  }
  return { bucket: null, path: null };
}

const applyQualityParam = (url: string, quality?: AudioQuality): string => {
  if (!quality || quality === 'auto') {
    return url;
  }

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('quality', quality);
    return urlObj.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}quality=${encodeURIComponent(quality)}`;
  }
};

interface ResolveOptions {
  quality?: AudioQuality;
}

export async function resolvePlayableUrl(originalSrc: string, options: ResolveOptions = {}): Promise<string> {
  if (!originalSrc) return originalSrc;

  // Check if it's a Supabase storage URL (signed or public)
  const isSupabaseStorageUrl = originalSrc.includes('/storage/v1/object/');

  if (!isSupabaseStorageUrl) {
    // Truly external URLs (CDNs, etc.) - return as-is
    return originalSrc;
  }

  // Handle full URLs (most common case)
  if (/^https?:\/\//i.test(originalSrc)) {
    const info = extractBucketAndPathFromStorageUrl(originalSrc);

    if (info.bucket === 'audio-files' && info.path) {
      // Always refresh signed URLs for private audio-files bucket
      try {
        const { data, error } = await supabase.storage
          .from('audio-files')
          .createSignedUrl(info.path, 60 * 60);

        if (!error && data?.signedUrl) {
          return applyQualityParam(data.signedUrl, options.quality);
        }

        console.warn('Failed to refresh signed URL:', error, 'for path:', info.path);
        return applyQualityParam(originalSrc, options.quality); // Fallback to original

      } catch (err) {
        console.error('Error refreshing signed URL:', err, 'for path:', info.path);
        return applyQualityParam(originalSrc, options.quality); // Fallback to original
      }
    }

    // Public buckets or other patterns - return as-is
    return applyQualityParam(originalSrc, options.quality);
  }

  // Handle path-only formats (legacy support)
  const guessed = extractBucketAndPathFromString(originalSrc);
  if (guessed.bucket === 'audio-files' && guessed.path) {
    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(guessed.path, 60 * 60);

      if (!error && data?.signedUrl) {
        return applyQualityParam(data.signedUrl, options.quality);
      }

      console.warn('Failed to refresh signed URL from path:', error, 'for path:', guessed.path);
      return applyQualityParam(originalSrc, options.quality);

    } catch (err) {
      console.error('Error refreshing signed URL from path:', err, 'for path:', guessed.path);
      return applyQualityParam(originalSrc, options.quality);
    }
  }

  if ((guessed.bucket === 'release-audio' || guessed.bucket === 'battle-audio') && guessed.path) {
    const { data } = supabase.storage.from(guessed.bucket).getPublicUrl(guessed.path);
    const targetUrl = data.publicUrl || originalSrc;
    return applyQualityParam(targetUrl, options.quality);
  }

  return applyQualityParam(originalSrc, options.quality);
}

