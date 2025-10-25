import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
}

const SITE_URL = process.env.SITEMAP_BASE_URL || process.env.SITE_URL || 'https://pluggd.fm';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_PATH = process.argv[2] || path.resolve('public', 'sitemap.xml');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[sitemap] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const toAbsoluteUrl = (pathname: string) => new URL(pathname, SITE_URL).toString();

const toXmlDate = (input?: string | null) => {
  if (!input) return undefined;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const buildEntry = (entry: SitemapEntry) => {
  const lines = [
    '  <url>',
    `    <loc>${entry.loc}</loc>`,
  ];

  if (entry.lastmod) {
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  }

  if (entry.changefreq) {
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  }

  if (typeof entry.priority === 'number') {
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
  }

  lines.push('  </url>');
  return lines.join('\n');
};

async function fetchReleases(client: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await client
    .from('releases')
    .select('id, updated_at, status, smartlink_slug')
    .in('status', ['live', 'approved'])
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((release) => ({
    loc: toAbsoluteUrl(release.smartlink_slug ? `/release/${release.smartlink_slug}` : `/release/${release.id}`),
    lastmod: toXmlDate(release.updated_at),
    changefreq: 'weekly',
    priority: 0.8,
  }));
}

async function fetchBeats(client: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await client
    .from('beats')
    .select('id, updated_at, is_published')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((beat) => ({
    loc: toAbsoluteUrl(`/beat/${beat.id}`),
    lastmod: toXmlDate(beat.updated_at),
    changefreq: 'weekly',
    priority: 0.7,
  }));
}

async function fetchProfiles(client: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await client
    .from('profiles')
    .select('username, updated_at')
    .not('username', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data ?? [])
    .filter((profile) => Boolean(profile.username))
    .map((profile) => ({
      loc: toAbsoluteUrl(`/profile/${profile.username}`),
      lastmod: toXmlDate(profile.updated_at),
      changefreq: 'weekly',
      priority: 0.6,
    }));
}

async function fetchLabels(client: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await client
    .from('labels')
    .select('slug, updated_at, is_published')
    .eq('is_published', true)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? [])
    .filter((label) => Boolean(label.slug))
    .map((label) => ({
      loc: toAbsoluteUrl(`/label/${label.slug}`),
      lastmod: toXmlDate(label.updated_at),
      changefreq: 'weekly',
      priority: 0.6,
    }));
}

async function fetchStoreProducts(client: SupabaseClient): Promise<SitemapEntry[]> {
  const { data, error } = await client
    .from('store_products')
    .select('id, updated_at, product_type, status')
    .in('status', ['active', 'published'])
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((product) => ({
    loc: toAbsoluteUrl(`/store/product/${product.id}`),
    lastmod: toXmlDate(product.updated_at),
    changefreq: 'weekly',
    priority: product.product_type === 'physical' ? 0.6 : 0.5,
  }));
}

async function buildEntries(client: SupabaseClient): Promise<SitemapEntry[]> {
  const staticEntries: SitemapEntry[] = [
    { loc: toAbsoluteUrl('/'), priority: 1.0, changefreq: 'daily' },
    { loc: toAbsoluteUrl('/store'), priority: 0.9, changefreq: 'daily' },
    { loc: toAbsoluteUrl('/library'), priority: 0.9, changefreq: 'weekly' },
    { loc: toAbsoluteUrl('/releases'), priority: 0.8, changefreq: 'weekly' },
    { loc: toAbsoluteUrl('/beats'), priority: 0.8, changefreq: 'weekly' },
    { loc: toAbsoluteUrl('/community'), priority: 0.6, changefreq: 'weekly' },
    { loc: toAbsoluteUrl('/help'), priority: 0.5, changefreq: 'monthly' },
  ];

  const [releases, beats, profiles, labels, storeProducts] = await Promise.all([
    fetchReleases(client),
    fetchBeats(client),
    fetchProfiles(client),
    fetchLabels(client),
    fetchStoreProducts(client),
  ]);

  return [...staticEntries, ...releases, ...beats, ...profiles, ...labels, ...storeProducts];
}

async function writeSitemap(entries: SitemapEntry[]) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(buildEntry),
    '</urlset>',
  ].join('\n');

  const outDir = path.dirname(OUTPUT_PATH);
  await mkdir(outDir, { recursive: true });
  await writeFile(OUTPUT_PATH, xml, 'utf8');

  console.log(`Generated sitemap with ${entries.length} entries at ${OUTPUT_PATH}`);
}

(async () => {
  try {
    const entries = await buildEntries(supabase);
    await writeSitemap(entries);
  } catch (error) {
    console.error('[sitemap] generation failed', error);
    process.exit(1);
  }
})();
