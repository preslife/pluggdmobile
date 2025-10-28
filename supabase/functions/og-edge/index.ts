import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OgEntityType = "release" | "beat" | "profile";

interface OgPayload {
  title: string;
  description: string;
  image?: string | null;
  url: string;
  type: OgEntityType;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const toAbsolute = (pathname: string) => {
  const site = Deno.env.get("SITE_URL") ?? "https://pluggd.fm";
  return new URL(pathname, site).toString();
};

const truncate = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length - 1)}…` : value;

async function fetchRelease(id: string): Promise<OgPayload | null> {
  const { data, error } = await supabase
    .from('releases')
    .select('id, title, artist, description, cover_art_url, smartlink_slug')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: truncate(`${data.title} — ${data.artist}`, 120),
    description: truncate(data.description ?? 'Stream or download the latest release on Pluggd.', 180),
    image: data.cover_art_url,
    url: toAbsolute(`/release/${data.smartlink_slug ?? data.id}`),
    type: 'release',
  };
}

async function fetchProfileName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return data.full_name || data.username || null;
}

async function fetchBeat(id: string): Promise<OgPayload | null> {
  const { data, error } = await supabase
    .from('beats')
    .select('id, title, description, image_url, user_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const artistName = data.user_id ? await fetchProfileName(data.user_id) : null;

  return {
    title: truncate(`${data.title}${artistName ? ` — ${artistName}` : ''}`, 120),
    description: truncate(data.description ?? 'License exclusive and non-exclusive beats on Pluggd.', 180),
    image: data.image_url,
    url: toAbsolute(`/beat/${data.id}`),
    type: 'beat',
  };
}

async function fetchProfile(identifier: string): Promise<OgPayload | null> {
  const baseSelect = () => supabase
    .from('profiles')
    .select('user_id, username, full_name, bio, avatar_url');

  let { data, error } = await baseSelect()
    .eq('username', identifier)
    .maybeSingle();

  if ((error || !data) && identifier.length === 36) {
    const fallback = await baseSelect()
      .eq('user_id', identifier)
      .maybeSingle();
    data = fallback.data ?? null;
    error = fallback.error ?? null;
  }

  if (error || !data) return null;

  const displayName = data.full_name || data.username || 'Pluggd Creator';

  return {
    title: truncate(displayName, 120),
    description: truncate(data.bio ?? 'Discover new releases, beats, and membership perks.', 180),
    image: data.avatar_url,
    url: toAbsolute(`/profile/${data.username ?? data.user_id}`),
    type: 'profile',
  };
}

async function resolvePayload(entity: OgEntityType, identifier: string): Promise<OgPayload | null> {
  switch (entity) {
    case 'release':
      return fetchRelease(identifier);
    case 'beat':
      return fetchBeat(identifier);
    case 'profile':
      return fetchProfile(identifier);
    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const entity = (requestUrl.searchParams.get('entity') as OgEntityType) ?? 'release';
    const identifier = requestUrl.searchParams.get('id') ?? requestUrl.searchParams.get('slug');

    if (!identifier) {
      return new Response(JSON.stringify({ error: 'Missing id or slug parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await resolvePayload(entity, identifier);

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Entity not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = requestUrl.origin;
    const params = new URLSearchParams({
      title: payload.title,
      description: payload.description,
      type: payload.type,
      url: payload.url,
    });

    if (payload.image) {
      params.set('image', payload.image);
    }

    const generateResponse = await fetch(`${origin}/generate-og-image?${params.toString()}`);

    if (!generateResponse.ok) {
      const text = await generateResponse.text();
      throw new Error(`generate-og-image failed: ${text}`);
    }

    const headers = new Headers(generateResponse.headers);
    const responseHeaders = new Headers({ ...corsHeaders });
    responseHeaders.set('Cache-Control', 'public, max-age=86400');
    responseHeaders.set('Content-Type', headers.get('Content-Type') ?? 'image/png');

    return new Response(generateResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[og-edge] error', error);
    return new Response(JSON.stringify({ error: 'Failed to generate OG image' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
