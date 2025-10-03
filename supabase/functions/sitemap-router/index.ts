import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const FALLBACK_CACHE_SECONDS = 3600;

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname !== '/sitemap.xml') {
    return new Response('Not found', { status: 404 });
  }

  const upstream = Deno.env.get('SITEMAP_SOURCE_URL') || `${url.origin}/sitemap.xml`; // default to static asset

  try {
    const response = await fetch(upstream, {
      headers: {
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      console.error('[sitemap-router] Upstream responded with', response.status, response.statusText);
      return new Response('Error generating sitemap', { status: 502 });
    }

    const body = await response.text();
    return new Response(body, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': `public, max-age=${FALLBACK_CACHE_SECONDS}`
      }
    });
  } catch (error) {
    console.error('[sitemap-router] Failed to fetch upstream sitemap', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});
