import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const uploadScreen = read('app/creator/upload.tsx');
const uploadService = read('src/features/studio/creatorUploadService.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(uploadScreen.includes('createCreatorStudioDraft'), 'Creator Upload must call the authenticated Studio draft service');
assert(uploadScreen.includes('Create Studio draft'), 'Final review must expose the private Studio draft action');
assert(uploadScreen.includes('Save on this device'), 'Local device save must remain a separate explicit action');
assert(uploadScreen.includes('It does not publish, schedule or submit'), 'Review must not claim that a draft is published');
assert(uploadScreen.includes("pathname: '/studio/catalog'"), 'Confirmed draft creation must return to the owner catalogue workspace');

for (const field of [
  'Featured / additional artists',
  'Additional release tracks',
  'Producers',
  'Songwriters',
  'Composers',
  'Executive producer',
  'Mixing engineer',
  'Mastering engineer',
  'Recording engineer',
  'Release format',
  'RELEASE DATE',
  'Stems and tagged preview',
  'Exclusive Rights',
  'Draft visibility',
  'Allow downloads when published',
]) {
  assert(uploadScreen.includes(field), `Creator Upload must expose the parity field: ${field}`);
}
assert(uploadScreen.includes('DateTimePicker'), 'Release dates must use a native date selector rather than typed date text');
assert(uploadScreen.includes("'application/zip'"), 'Beat stems must accept a real archive as well as audio');

for (const copy of [
  'AI use declaration',
  'Choose the highest level of AI use anywhere on this release. You can still save an unfinished draft.',
  'No AI used',
  'AI-assisted',
  'AI-generated elements',
  'What did AI generate?',
  'Lyrics',
  'Composition or melody',
  'Vocals',
  'Instrumental performance',
  'Other audio or production',
  'Part of the audio',
  'All of the audio',
  'Human artist identity',
  'AI persona',
  'I own or control the rights needed to distribute every AI-generated element.',
  'This release does not imitate or clone another person’s voice, likeness or identity without permission.',
]) {
  assert(uploadScreen.includes(copy), `Native Release form must preserve web AI disclosure copy: ${copy}`);
}
assert(uploadScreen.includes("draft.kind === 'release'"), 'AI disclosure must remain Release-only');
assert(uploadScreen.includes('releaseAiErrors(draft).length === 0'), 'Release readiness must use the conditional web AI validation');
assert(uploadScreen.includes('previewMode = __DEV__'), 'Form preview must be development-only');
assert(uploadScreen.includes('FORM PREVIEW · NO ACCOUNT DATA'), 'Form preview must visibly disclose that it contains no account data');
assert(uploadScreen.includes('if (previewMode) return;'), 'Development preview must block local save and media picker mutations');

for (const bucket of ["bucket: 'release-artwork'", "bucket: 'audio-files'"]) {
  assert(uploadService.includes(bucket), `Creator upload must use ${bucket}`);
}
for (const table of ["from('audio_files')", "from('releases')", "from('tracks')", "from('beats')", "from('mixes')"]) {
  assert(uploadService.includes(table), `Creator upload must support canonical ${table}`);
}

assert(uploadService.includes("processing_status: 'pending'"), 'Audio records must begin in a truthful pending state');
assert(uploadService.includes("functions.invoke('process-audio-upload'"), 'Audio processing must start explicitly');
assert(uploadService.includes("status: 'draft'"), 'Release and mix creation must remain drafts');
assert(uploadService.includes('visibility: draft.visibility'), 'Mix creation must preserve the selected access setting');
assert(uploadService.includes("status: 'draft'"), 'Mix creation must remain an unpublished draft regardless of its eventual access setting');
assert(uploadService.includes('is_published: false'), 'Beat drafts must remain unpublished');
assert(uploadService.includes('playable_on_pluggd: false'), 'Draft release tracks must remain non-public');
assert(uploadService.includes("if (draft.kind === 'release')"), 'Authenticated service must validate AI disclosure only for Release');
assert(uploadService.includes('releaseAiDisclosureErrors(draft)'), 'Authenticated Release creation must reject incomplete AI disclosure');
assert(uploadService.includes('ai_disclosure: buildReleaseAiDisclosure(draft)'), 'Release must persist the web-compatible AI disclosure in distribution settings');
for (const key of [
  'classification:',
  'generated_elements:',
  'audio_scope:',
  'artist_identity:',
  'rights_confirmed:',
  'no_impersonation_confirmed:',
]) {
  assert(uploadService.includes(key), `Release AI disclosure must preserve web metadata key ${key}`);
}
assert(!uploadService.includes('ai_declaration:'), 'Native must not invent a parallel AI declaration contract');
assert(uploadService.includes('await rollback(rows, objects, draft.kind)'), 'Partial failures must invoke compensating rollback');
assert(uploadService.includes('featured_artists: cleanFeaturedArtists'), 'Release drafts must persist repeatable additional artists');
assert(uploadService.includes('const trackRows = releaseTracks.map'), 'Release drafts must persist every titled audio track');
assert(uploadService.includes('license_prices: Object.fromEntries'), 'Beat drafts must persist the enabled web licence matrix');
assert(uploadService.includes('stems_url: supplementaryUrls.stemsUrl'), 'Beat drafts must persist stems');
assert(uploadService.includes('mood_tags: draft.moods'), 'Mix drafts must persist their owner metadata');
assert(uploadService.includes("storage.from(object.bucket).remove([object.path])"), 'Rollback must remove only newly uploaded objects');
assert(!uploadService.includes('service_role'), 'The native client must never contain a service-role credential');

console.log('PASS mobile creator upload contract');
