import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.SITEMAP_BASE_URL || process.env.SITE_URL || 'https://pluggd.fm';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_PATH = process.argv[2] || path.resolve('public', 'sitemap.xml');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[sitemap] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

function buildUrl(loc: string, priority = '0.7', changefreq = 'weekly') {
  return `  <url>\n    <loc>${new URL(loc, SITE_URL).toString()}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const [releasesRes, beatsRes, profilesRes, labelsRes] = await Promise.all([
    supabase
      .from('releases')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('beats')
      .select('id, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('profiles')
      .select('username, updated_at')
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('labels')
      .select('slug, updated_at')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(200)
  ]);

  if (releasesRes.error) throw releasesRes.error;
  if (beatsRes.error) throw beatsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (labelsRes.error) throw labelsRes.error;

  const staticPaths = [
    buildUrl('/', '1.0', 'daily'),
    buildUrl('/store', '0.9', 'daily'),
    buildUrl('/library', '0.9', 'weekly'),
    buildUrl('/search', '0.9', 'weekly'),
    buildUrl('/releases', '0.8', 'weekly'),
    buildUrl('/beats', '0.8', 'weekly'),
    buildUrl('/community', '0.6', 'weekly'),
    buildUrl('/help', '0.5', 'monthly')
  ];

  const releasePaths = (releasesRes.data || []).map((release) =>
    buildUrl(`/release/${release.id}`, '0.8', 'weekly')
  );

  const beatPaths = (beatsRes.data || []).map((beat) =>
    buildUrl(`/beat/${beat.id}`, '0.7', 'weekly')
  );

  const profilePaths = (profilesRes.data || []).map((profile) =>
    buildUrl(`/profile/${profile.username}`, '0.6', 'weekly')
  );

  const labelPaths = (labelsRes.data || []).map((label) =>
    buildUrl(`/label/${label.slug}`, '0.6', 'weekly')
  );

  const urls = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticPaths,
    ...releasePaths,
    ...beatPaths,
    ...profilePaths,
    ...labelPaths,
    '</urlset>'
  ].join('\n');

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, urls, 'utf8');
  console.log(`[sitemap] Generated ${OUTPUT_PATH} with ${releasePaths.length + beatPaths.length + profilePaths.length + labelPaths.length + staticPaths.length} entries.`);
}

main().catch((error) => {
  console.error('[sitemap] Failed to generate sitemap', error);
  process.exit(1);
});
