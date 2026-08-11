import fs from 'node:fs';

const source = fs.readFileSync('src/features/discovery/MusicDiscoveryDiscover.tsx', 'utf8');

function mustContain(value, message) {
  if (!source.includes(value)) throw new Error(message);
}

mustContain("worldLink: { flexBasis: '47.5%', flexGrow: 1, maxWidth: '48.8%'", 'Discover world gateways must use a narrow-phone-safe two-column basis.');
mustContain("worldLinkWide: { flexBasis: '100%', maxWidth: '100%'", 'THE PLUG gateway must retain its full-width treatment.');
mustContain("radarCard: { flexBasis: '47.5%', flexGrow: 1, maxWidth: '48.8%'", 'Release Radar must use the same narrow-phone-safe two-column basis.');

for (const { contentWidth, gap } of [
  { contentWidth: 320, gap: 8 },
  { contentWidth: 320, gap: 10 },
]) {
  const pairBasis = contentWidth * 0.475 * 2 + gap;
  if (pairBasis > contentWidth) {
    throw new Error(`Two-card grid overflows a ${contentWidth}dp content width with a ${gap}dp gap.`);
  }
}

console.log('mobile Discover narrow-phone grid contract verified');
