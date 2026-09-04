import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const service = read('src/features/editorial/thePlugArticleService.ts');
const route = read('app/plug/[id].tsx');
const savedKinds = read('src/features/culture/mobileTypes.ts');

assert.match(service, /html_content,editor_document/, 'article DTO must load both canonical and legacy-editor document sources');
for (const field of ['author_name', 'published_at', 'editorial_category', 'read_time_minutes', 'metadata', 'the_plug_publications', 'the_plug_publication_categories']) {
  assert.ok(service.includes(field), `article DTO must retain ${field}`);
}
const standaloneBranch = service.indexOf('storedHtml && /<!doctype|<html\\b|<head\\b|<style\\b/i.test(storedHtml)');
const legacyBranch = service.indexOf("node?.type === 'legacy_html'");
assert.ok(standaloneBranch >= 0 && legacyBranch > standaloneBranch, 'complete stored documents must win before the legacy editor fallback');
assert.match(service, /metadata\?\.edition[\s\S]*metadata\?\.issue[\s\S]*nestedArticle\?\.edition/, 'edition metadata must be preserved when available');
assert.match(service, /if \(error\) throw new Error/, 'network/query failures must remain distinguishable from an unpublished article');
assert.match(service, /safeHttpUrl[\s\S]*parsed\.protocol === 'https:' \|\| parsed\.protocol === 'http:'/, 'article base URLs must be HTTP(S)-restricted');
assert.match(service, /<base href=/, 'relative document assets must receive a safe base URL');
assert.match(service, /prefers-reduced-motion/, 'complete documents must respect Reduce Motion');

assert.match(route, /post\?\.completeHtml/, 'the reader must select the complete document rather than a stripped excerpt');
assert.match(route, /prepareThePlugArticleHtml\(post\.completeHtml, post\.baseUrl\)/, 'the complete document must be prepared with its safe base URL');
assert.match(route, /javaScriptEnabled=\{false\}/, 'arbitrary article JavaScript must remain disabled');
assert.match(route, /allowFileAccess=\{false\}/, 'article documents must not read local files');
assert.match(route, /allowUniversalAccessFromFileURLs=\{false\}/, 'article documents must not gain universal file access');
assert.match(route, /onShouldStartLoadWithRequest[\s\S]*openExternalLink/, 'external article navigation must be intercepted');
assert.match(route, /Alert\.alert\('Open external link\?'/, 'external navigation must ask before leaving PLUGGD');
assert.match(route, /Share\.share/, 'complete articles must expose the native share sheet');
assert.match(route, /toggleSavedContent\('blog_post'/, 'complete articles must use the canonical saved-content service');
assert.match(savedKinds, /\| 'blog_post'/, 'native saved-content types must recognise the backend article kind');
assert.match(route, /story\.isLoading[\s\S]*story\.isError[\s\S]*renderError[\s\S]*Story unavailable/, 'loading, query failure, renderer failure and unavailable states must remain distinct');
assert.match(route, /width: 44[\s\S]*height: 44/, 'reader chrome must preserve 44pt controls');

console.log('PLUGGD mobile complete THE PLUG reader contract verified');
