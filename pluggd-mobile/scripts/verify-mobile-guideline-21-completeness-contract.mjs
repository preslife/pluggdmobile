#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const playlist = read('app/playlists/[id].tsx');
const articleRoute = read('app/plug/[id].tsx');
const articleService = read('src/features/editorial/thePlugArticleService.ts');
const parityServices = read('src/features/parity/appWideParityServices.ts');

assert.match(playlist, /const hasPlayableTracks = playableTracks\.length > 0/, 'playlist availability must come from its playable queue');
assert.match(playlist, /disabled=\{!hasPlayableTracks\}/, 'a playlist with no playable audio must disable its primary Play action');
assert.match(playlist, /accessibilityState=\{\{ disabled: !hasPlayableTracks \}\}/, 'disabled playlist playback must be exposed to assistive technology');

assert.match(articleService, /function articleBody\(value: unknown\)[\s\S]*?replace\(\/<\[\^>\]\+>\/g, ' '\)[\s\S]*?return readable \? source : null;/, 'article completeness must reject markup with no readable body');
assert.match(articleService, /const content = articleBody\(row\.content\);[\s\S]*?if \(!content && !articleBody\(html\)\) return null;/, 'published rows without a readable article document or body must be excluded');
assert.match(articleRoute, /const body = plainText\(post\?\.content\)/, 'the reader must not substitute an excerpt for missing article content');
assert.doesNotMatch(articleRoute, /being prepared|bodyUnavailable/, 'the public reader must not expose temporary editorial copy');
assert.match(articleRoute, /Story unavailable[\s\S]*?no longer published/, 'excluded stories must fail with a truthful unavailable state');

for (const unfinishedCard of ['browse-services', 'browse-offers', "staticCard('promoters'", 'Creator Offers', 'Coming soon']) {
  const escaped = unfinishedCard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.doesNotMatch(parityServices, new RegExp(escaped), `${unfinishedCard} must not be reachable from generic parity payloads`);
}

console.log('mobile Guideline 2.1 completeness contract verified');
