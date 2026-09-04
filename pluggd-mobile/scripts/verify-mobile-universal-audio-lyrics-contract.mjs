import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const provider = read('src/context/PlaybackProvider.tsx');
const player = read('app/player.tsx');
const service = read('src/features/playback/publicPlaybackService.ts');
const release = read('app/release/[id].tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const glassMiniPlayer = read('components/liquid-glass/GlassMiniPlayer.tsx');

assert.match(provider, /trackId\?: string/, 'queue metadata must retain the canonical release-track identity');
assert.match(provider, /skipToQueueIndex/, 'the player must support selecting a track from a multi-track queue');
assert.match(provider, /resolvePlaybackDuration\(progress\.duration, currentTrack\?\.duration\)/, 'long-form playback must fall back to real catalogue duration while native duration is loading');
assert.match(miniPlayer, /progress\.duration > 0[\s\S]*progress\.position \/ progress\.duration[\s\S]*: 0/, 'mini-player progress must use live position and never a fake frozen percentage');
assert.match(miniPlayer, /progressLabel[\s\S]*formatDuration\(progress\.position\)/, 'long mixes must expose visibly changing elapsed time');
assert.match(glassMiniPlayer, /accessibilityRole="progressbar"[\s\S]*accessibilityValue=\{\{[\s\S]*progressPercent/, 'mini-player progress must expose its live state accessibly');
assert.match(release, /trackId: t\.id/, 'release queues must carry the selected release-track identity');
assert.match(release, /tracks\.length === 1 \? release\.lyrics/, 'legacy release lyrics may only follow a known single-track queue');

assert.match(service, /rpc\('get_public_playback_metadata'/, 'tracks, beats and mixes must consume the public-safe playback RPC');
assert.match(service, /p_catalog_type: identity\.type[\s\S]*p_catalog_id: identity\.id/, 'playback metadata must be scoped to the active catalogue item');
assert.match(service, /published_track_lyrics[\s\S]*\.eq\('track_id', trackId\)/, 'published lyrics must be keyed to the active track, not the parent release');
assert.match(service, /start_ms[\s\S]*startMs[\s\S]*end_ms[\s\S]*endMs/, 'timed-line parsing must accept the canonical millisecond fields');
assert.match(service, /\.sort\(\(a: TimedLyricLine, b: TimedLyricLine\) => a\.startMs - b\.startMs\)/, 'timed lines must be normalised in playback order');

assert.match(player, /public-playback-metadata[\s\S]*playbackSource\?\.type[\s\S]*playbackSource\?\.id/, 'waveform metadata must refresh when the selected queue track changes');
assert.match(player, /compactWaveform\(playbackMetadataQuery\.data\?\.waveformData\)/, 'the player must render processed canonical waveform peaks');
assert.match(player, /accessibilityLabel="Playback waveform"/, 'processed peaks must remain a seekable waveform');
assert.match(player, /waveformBars\.length > 0[\s\S]*styles\.progressWrap/, 'the player must retain a seekable progress fallback while waveform data is unavailable');
assert.match(player, /published-track-lyrics[\s\S]*currentTrack\?\.trackId/, 'lyrics retrieval must refresh by selected track identity');
assert.match(player, /activeLyricIndex[\s\S]*progress\.position \* 1000/, 'timed lyrics must follow live playback position');
assert.match(player, /lyricsLineActive/, 'the current timed line must receive a distinct highlighted state');
assert.match(player, /Previous lyric line[\s\S]*Next lyric line/, 'timed lyrics must expose manual line navigation');
assert.match(player, /seekTo\(line\.startMs \/ 1000\)/, 'selecting a timed lyric must seek playback to that line');
assert.match(player, /isReduceMotionEnabled[\s\S]*animated: !reduceMotion/, 'waveform and lyric motion must respect Reduce Motion');
assert.match(player, /skipToQueueIndex\(index\)/, 'multi-track queue rows must select the exact track');
assert.match(player, /toggleSavedContent\('release'/, 'streaming player work must preserve existing library actions');
assert.doesNotMatch(service, /download_url|purchase|checkout/, 'public playback metadata must not merge streaming with download or purchase grants');

console.log('PLUGGD mobile universal waveform and timed-lyrics contract verified');
