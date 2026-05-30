import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('src/features/parity/webAssets.ts', root), 'utf8');

const requiredAssets = [
  'assets/web-parity/home/homepage-hero.jpeg',
  'assets/web-parity/home/homepage-explore-ecosystem.png',
  'assets/web-parity/home/homepage-support-section.png',
  'assets/web-parity/discover/paper-panel-card.png',
  'assets/web-parity/discover/paper-panel-wide.png',
  'assets/web-parity/live/pluggd-live-hero.png',
  'assets/web-parity/events/pluggd-events.png',
  'assets/web-parity/discover/pluggd-mixes.png',
  'assets/web-parity/market/beat-store-hero.png',
  'assets/web-parity/home/intimate-crowd-hero.png',
  'assets/web-parity/home/brick-room-show.png',
  'assets/web-parity/home/intimate-vocalist.png',
  'assets/web-parity/home/warm-listening-room.png',
  'assets/web-parity/home/bedroom-studio.png',
  'assets/web-parity/newhome-phone/IMG_9444.jpg',
  'assets/web-parity/newhome-phone/IMG_9445.jpg',
  'assets/web-parity/newhome-phone/IMG_9447.jpg',
];

for (const asset of requiredAssets) {
  assert.ok(existsSync(new URL(asset, root)), `${asset} must exist`);
  assert.match(source, new RegExp(asset.replace('assets/', '../../../assets/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${asset} must be registered in webAssets.ts`);
}

for (const token of ['WEB_PARITY_ASSETS', 'WEB_PARITY_ASSET_GROUPS', 'homeHero', 'discoverPaperWide', 'marketBeatStore']) {
  assert.match(source, new RegExp(token), `webAssets.ts must expose ${token}`);
}

console.log('mobile web asset contract verified');
