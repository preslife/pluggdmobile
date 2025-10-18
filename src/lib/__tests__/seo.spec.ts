import { describe, it, expect, beforeEach } from 'vitest';
import { setMeta } from '../seo';
import { buildEntityOgImageUrl } from '../og';

const resetDom = () => {
  document.head.innerHTML = '';
  document.title = '';
  window.history.replaceState({}, '', '/initial');
};

describe('seo integration', () => {
  beforeEach(() => {
    resetDom();
  });

  it('sets open graph tags with provided image url', () => {
    const ogUrl = 'https://cdn.example.com/og/test.png';

    setMeta('Test Release', 'A description for testing', '/release/test', ogUrl);

    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    const canonical = document.querySelector('link[rel="canonical"]');

    expect(document.title).toBe('Test Release');
    expect(ogImage?.getAttribute('content')).toBe(ogUrl);
    expect(twitterImage?.getAttribute('content')).toBe(ogUrl);
    const origin = window.location.origin;
    expect(ogUrlMeta?.getAttribute('content')).toBe(`${origin}/release/test`);
    expect(canonical?.getAttribute('href')).toBe(`${origin}/release/test`);
  });

  it('builds entity OG URLs with canonical resource references', () => {
    const url = buildEntityOgImageUrl('release', 'abc123', {
      resourceUrl: 'https://pluggd.fm/release/abc123',
    });

    expect(url).toContain('/og-entity/release/abc123');
    expect(url).toContain('apikey=');
    expect(url).toContain('url=https%3A%2F%2Fpluggd.fm%2Frelease%2Fabc123');
  });
});
