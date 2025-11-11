import { describe, expect, it } from 'vitest';
import { buildSitemapXml, buildEntry } from '../../scripts/generate-sitemap.ts';

describe('generate-sitemap utilities', () => {
  it('serialises individual entries with optional fields', () => {
    const entry = buildEntry({
      loc: 'https://pluggd.fm/live/sessions/alpha',
      changefreq: 'daily',
      priority: 0.7,
      lastmod: '2024-05-01T12:00:00.000Z',
    });

    expect(entry).toBe(
      '  <url>\n' +
        '    <loc>https://pluggd.fm/live/sessions/alpha</loc>\n' +
        '    <lastmod>2024-05-01T12:00:00.000Z</lastmod>\n' +
        '    <changefreq>daily</changefreq>\n' +
        '    <priority>0.7</priority>\n' +
        '  </url>'
    );
  });

  it('builds a sitemap xml document for multiple entity types', () => {
    const xml = buildSitemapXml([
      { loc: 'https://pluggd.fm/', changefreq: 'daily', priority: 1 },
      {
        loc: 'https://pluggd.fm/release/rl-1',
        lastmod: '2024-04-01T10:00:00.000Z',
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: 'https://pluggd.fm/beat/bt-99',
        lastmod: '2024-04-10T14:30:00.000Z',
        changefreq: 'weekly',
        priority: 0.7,
      },
      {
        loc: 'https://pluggd.fm/sample-pack-store/sp-42',
        lastmod: '2024-03-18T08:15:00.000Z',
        changefreq: 'weekly',
        priority: 0.6,
      },
      {
        loc: 'https://pluggd.fm/live/sessions/ls-7',
        lastmod: '2024-03-20T19:00:00.000Z',
        changefreq: 'daily',
        priority: 0.7,
      },
      { loc: 'https://pluggd.fm/profile/artist', changefreq: 'weekly', priority: 0.6 },
    ]);

    expect(xml).toMatchInlineSnapshot(`"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://pluggd.fm/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>https://pluggd.fm/release/rl-1</loc>\n    <lastmod>2024-04-01T10:00:00.000Z</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n  <url>\n    <loc>https://pluggd.fm/beat/bt-99</loc>\n    <lastmod>2024-04-10T14:30:00.000Z</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n  <url>\n    <loc>https://pluggd.fm/sample-pack-store/sp-42</loc>\n    <lastmod>2024-03-18T08:15:00.000Z</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n  <url>\n    <loc>https://pluggd.fm/live/sessions/ls-7</loc>\n    <lastmod>2024-03-20T19:00:00.000Z</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n  <url>\n    <loc>https://pluggd.fm/profile/artist</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>"`);
  });
});
