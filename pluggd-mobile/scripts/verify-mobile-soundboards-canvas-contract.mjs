import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const index = read('src/features/editorial/SoundboardsIndexScreen.tsx');
const detail = read('app/soundboards/[id].tsx');
const canvas = read('src/features/soundboards/NativeSoundboardCanvas.tsx');
const layout = read('src/features/soundboards/nativeSoundboardLayout.ts');

assert.match(index, /from\('soundboard_items'\)[\s\S]*\.in\('soundboard_id', boardIds\)/, 'the index must load real items for its board canvases');
assert.doesNotMatch(index + detail, /soundboards[^\n]*total_plays|select\([^\n]*total_plays/, 'Soundboards must not query the nonexistent soundboards.total_plays column');
assert.match(index, /<NativeSoundboardCanvas[\s\S]*mode="preview"/, 'every index result must lead with the shared real canvas preview');
assert.match(index, /canvasPreviewWrap[\s\S]*canvasCardMeta/, 'the canvas must precede compact board metadata');
assert.doesNotMatch(index, /FlatList[\s\S]*numColumns=\{2\}/, 'the index must not regress to a generic two-column card stack');

assert.match(detail, /TOTAL PLAYS[\s\S]*FOLLOWERS/, 'public detail must keep only compact plays and follower metrics');
assert.match(detail, />Like<[\s\S]*>Comment<[\s\S]*>Share</, 'public detail must expose Like, Comment and Share');
assert.match(detail, /<NativeSoundboardCanvas[\s\S]*mode=\{editorMode && isOwner \? 'editor' : 'public'\}/, 'detail must put the real canvas immediately after compact identity and actions');
assert.doesNotMatch(detail, /Update log|Fan activity|Version history|Board discussion/, 'public detail must not restore legacy activity or discussion stacks');
assert.match(detail, /presentationStyle="fullScreen"[\s\S]*focusItem\?\.item_type === 'image'[\s\S]*FocusVideo[\s\S]*audioFocus[\s\S]*textFocus/, 'real image, video, audio and text items must open full-screen focus views');
assert.match(detail, /resolveSoundboardPlaybackUrl[\s\S]*logSoundboardItemPlay[\s\S]*playTrack/, 'audio focus must use the existing signed playback path');
assert.match(detail, /accessibilityRole="adjustable"[\s\S]*onAccessibilityAction[\s\S]*onPress=\{\(event\)[\s\S]*seekTo/, 'the full audio player must expose working tap and accessibility seek controls');
assert.match(detail, /Number\.isFinite\(rawFocusedDuration\)[\s\S]*Number\.isFinite\(rawFocusedPosition\)/, 'audio progress accessibility values must stay finite while signed media metadata is loading');
assert.match(detail, /addSoundboardComment\(board\.id, commentText\)/, 'comments must use the existing submit path');
assert.match(detail, /visible=\{commentsOpen\}[\s\S]*presentationStyle="pageSheet"/, 'comments must open in a compact native sheet');

assert.match(detail, /commitCanvasLayout[\s\S]*from\('soundboard_items'\)[\s\S]*\.update\(\{ metadata \}\)[\s\S]*\.eq\('creator_id', user\.id\)/, 'owner canvas edits must preserve creator-scoped metadata persistence');
assert.match(detail, /insertSoundboardItem[\s\S]*item_type: payload\.itemType[\s\S]*metadata/, 'owner insert tools must create real Soundboard items with saved canvas layout');
assert.match(detail, /pickAndAddMedia\('image'\)[\s\S]*pickAndAddMedia\('audio'\)[\s\S]*pickAndAddMedia\('video'\)/, 'image, audio and video authoring actions must be working tools, not placeholders');
assert.match(detail, /setComposerOpen\(true\)[\s\S]*Add to canvas/, 'note authoring must use a real composer and insert action');

assert.match(layout, /metadata\.canvas/, 'native layout must read the saved web canvas contract');
assert.match(layout, /writeNativeCanvasLayout/, 'native owner edits must write the same saved canvas contract');
assert.match(layout, /Math\.abs\(entry\.centerY - center\) <= rowTolerance/, 'mobile topology rows must be derived from source centre-Y bands');
assert.doesNotMatch(layout, /material.*overlap|fixed.*lane|editorial.*lane/i, 'source overlap must not collapse vertical rows into fixed editorial lanes');
assert.match(layout, /COLUMN_GAP = 12[\s\S]*ROW_GAP = 12/, 'mobile topology must pack neighbouring rows with bounded deliberate gaps');
assert.match(layout, /transformPoint[\s\S]*nearest[\s\S]*target\.layout/, 'doodles must stay anchored to the nearest real saved item after projection');

assert.match(canvas, /position: 'absolute'/, 'Soundboard cards must be projected on a canvas rather than rendered as a list');
assert.match(canvas, /readNativeDoodles/, 'the native canvas must render real saved doodles');
for (const sourceField of ['item.media_url', 'item.content_text', 'item.waveform_data']) {
  assert.ok(canvas.includes(sourceField), `the canvas must render real ${sourceField} data`);
}
assert.match(canvas, /A flat rail communicates audio without pretending we have waveform data/, 'missing waveform data must not be replaced with fabricated peaks');
assert.match(canvas, /PanResponder[\s\S]*onCommitLayout/, 'owner editor mode must retain movable canvas cards');
assert.doesNotMatch(index + detail + canvas + layout, /mockSoundboard|fake collaborator|public templates/i, 'native Soundboards must not fabricate canvas content, collaborators or templates');

console.log('PLUGGD native Soundboards canvas contract verified');
