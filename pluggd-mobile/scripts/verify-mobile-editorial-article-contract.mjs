import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/plug/[id].tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/features/editorial/thePlugArticleService.ts', import.meta.url), 'utf8');
const navigation = readFileSync(new URL('../src/features/editorial/thePlugNavigation.ts', import.meta.url), 'utf8');

assert.match(service, /content,html_content,editor_document,featured_image_url/, 'article query must load HTML-authored stories');
assert.match(route, /source=\{\{ html: prepareThePlugArticleHtml\(post\.completeHtml, post\.baseUrl\), baseUrl: post\.baseUrl \}\}/, 'HTML-authored stories must retain their published responsive layout');
assert.match(service, /\.lede-sidebar,\.lede-divider\{display:none!important\}/, 'desktop article sidebars must not lead the iPhone reading flow');
assert.match(route, /javaScriptEnabled=\{false\}/, 'uploaded editorial HTML must not execute JavaScript');
assert.match(route, /onShouldStartLoadWithRequest/, 'article links must be handled outside the embedded reader');
assert.match(navigation, /kind: 'external'/, 'true external article links must be classified separately from native PLUGGD routes');

console.log('mobile editorial article contract verified');
