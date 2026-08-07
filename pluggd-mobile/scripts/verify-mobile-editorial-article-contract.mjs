import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/plug/[id].tsx', import.meta.url), 'utf8');

assert.match(route, /content,html_content,featured_image_url/, 'article query must load HTML-authored stories');
assert.match(route, /source=\{\{ html: mobileReaderHtml\(post\.html_content\) \}\}/, 'HTML-authored stories must retain their published responsive layout');
assert.match(route, /\.lede-sidebar,[\s\S]*\.lede-divider \{ display: none !important; \}/, 'desktop article sidebars must not lead the iPhone reading flow');
assert.match(route, /javaScriptEnabled=\{false\}/, 'uploaded editorial HTML must not execute JavaScript');
assert.match(route, /onShouldStartLoadWithRequest/, 'article links must be handled outside the embedded reader');

console.log('mobile editorial article contract verified');
