import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  
  // Route to dynamic sitemap
  if (url.pathname === '/sitemap.xml') {
    const { data, error } = await fetch(`${url.origin}/api/sitemap`);
    
    if (error) {
      return new Response('Error generating sitemap', { status: 500 });
    }
    
    return new Response(data, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
  
  return new Response('Not found', { status: 404 });
});