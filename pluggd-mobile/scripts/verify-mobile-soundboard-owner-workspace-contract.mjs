import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const creator = read('app/studio/soundboards/new.tsx');
const owner = read('app/soundboards/[id].tsx');
const catalog = read('src/features/studio/StudioScreens.tsx');
const canvas = read('src/features/soundboards/NativeSoundboardCanvas.tsx');

assert.match(catalog, /soundboards[\s\S]*createRoute: '\/studio\/soundboards\/new'/, 'Studio Soundboards must open the native creator route');
assert.match(catalog, /const canCreate = true/, 'Soundboard catalog must expose its New action');

assert.match(creator, /<CreatorAccessGate>/, 'Soundboard creation must stay behind creator access');
assert.match(creator, /rpc\('create_soundboard'/, 'Soundboard creation must use the existing authenticated RPC');
assert.match(creator, /p_is_published: false/, 'new Soundboards must always begin unpublished');
assert.match(creator, /p_visibility: visibility/, 'creator-selected access must be stored explicitly');
assert.match(creator, /pickFirstAudio[\s\S]*getDocumentAsync\(\{ type: 'audio\/\*'/, 'Soundboard creation must let the creator choose a real first audio file');
assert.match(creator, /from\('audio_files'\)[\s\S]*p_first_audio_file_id: audioFileId[\s\S]*p_first_audio_title: firstAudio \? firstAudioTitle\.trim\(\) : null/, 'Soundboard creation must persist the real first audio record through the canonical RPC');
assert.match(creator, /functions\.invoke\('process-audio-upload'/, 'Soundboard first audio must enter the established processing pipeline');
assert.match(creator, /native_template[\s\S]*canvas_theme/, 'templates must persist real canvas appearance metadata');
assert.match(creator, /from\('soundboards'\)[\s\S]*\.delete\(\)[\s\S]*\.eq\('creator_id', auth\.user\.id\)/, 'partial creation failures must compensate only the authenticated owner board');
assert.match(creator, /storage\.from\('release-artwork'\)\.remove\(\[coverPath\]\)/, 'partial creation failures must remove only newly uploaded artwork');
assert.doesNotMatch(creator, /fake|placeholder card|demo item/i, 'templates must never seed fake public canvas items');

assert.match(owner, /visibility,is_published[\s\S]*allow_downloads/, 'owner workspace must load publication and access state');
assert.match(owner, /saveBoardSettings[\s\S]*from\('soundboards'\)[\s\S]*\.eq\('creator_id', user\.id\)/, 'owner settings must use creator-scoped persistence');
assert.match(owner, /Publish board[\s\S]*Allow comments[\s\S]*Allow downloads/, 'owner settings must expose genuine publication and interaction controls');
assert.match(owner, /View public presentation[\s\S]*open-in-new/, 'public viewing must be a separate explicit owner action');
assert.doesNotMatch(owner, />Preview<|Desktop Tools/, 'owner workspace must not present legacy Preview or Desktop Tools labels');

assert.match(canvas, /readCanvasTheme/, 'native canvas must read real stored theme metadata');
assert.match(canvas, /theme\.background[\s\S]*theme\.accent[\s\S]*theme\.paper/, 'stored background, accent and paper colours must affect the real canvas');

console.log('PASS mobile Soundboard owner workspace contract');
