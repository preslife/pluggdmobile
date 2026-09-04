import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const release = read('app/release/[id].tsx');
const releases = read('src/features/editorial/ListeningFloorScreen.tsx');
const mixes = read('src/features/editorial/MixesWorldScreen.tsx');
const mixDetail = read('app/mixes/[id].tsx');
const event = read('app/events/[id].tsx');
const events = read('src/features/editorial/EventsBoardScreen.tsx');
const soundboard = read('app/soundboards/[id].tsx');

// Release page: streaming/listening is the primary product action. Credits and
// hosted checkout are described only as download/file access. Playlist writes
// use the existing service, and artist navigation is sourced from release
// credits/claimed profiles rather than the uploader account.
assert.match(release, /Listen now/);
assert.match(release, /import \{ releasePlayableUrl \} from '\.\.\/\.\.\/src\/lib\/mobileContent'/);
assert.match(release, /playableUrl: releasePlayableUrl\(track\)/);
assert.match(release, /if \(playableTracks\.length > 0\) return playableTracks/);
assert.match(release, /const releaseUrl = releasePlayableUrl\(release\)/);
assert.match(
  release,
  /const isCurrentlyPlaying = Boolean\([\s\S]*?currentTrack\?\.sourceType === 'release' \|\| currentTrack\?\.type === 'release'[\s\S]*?currentTrack\?\.releaseId === release\.id \|\| currentTrack\?\.id === release\.id[\s\S]*?\)/,
  'Release playback controls may toggle only a release-typed track belonging to this release',
);
assert.match(
  release,
  /async function handlePlayAll\(\)[\s\S]*?setStartingPlayback\(true\)[\s\S]*?const active = await playQueue\(queue, 0\)[\s\S]*?activeIsRequestedRelease[\s\S]*?if \(!activeIsRequestedRelease \|\| !active\) \{[\s\S]*?setPlaybackError\([\s\S]*?return;[\s\S]*?\}[\s\S]*?router\.push\(\{[\s\S]*?pathname: '\/player'/,
  'Release Listen must await and verify its replacing queue, keep failures on detail, then open the full player only for the requested release',
);
assert.match(release, /sourceType: 'release' as const/, 'Release queue tracks must carry explicit source identity');
assert.match(release, /if \(isCurrentlyPlaying\) void togglePlayPause\(\);[\s\S]*?else void handlePlayAll\(\);/, 'Release controls may toggle only the verified active release and must otherwise start the replacing queue');
assert.match(release, /accessibilityState=\{\{ busy: startingPlayback, disabled: trackList\.length === 0 \|\| startingPlayback \}\}/, 'Release Listen must prevent a second action while its queue replacement is starting');
assert.match(release, /startingPlayback \? `Starting \$\{release\.title\}…`/, 'Release Listen must identify the requested title while replacement is starting');
assert.match(release, /\$\{requestedTitle\} did not start\. \$\{activeTitle\} is still playing\. Try again\./, 'Release queue mismatch must remain visible, name the unchanged playback, and offer an actionable retry');
assert.match(release, /accessibilityRole="alert"[\s\S]*?accessibilityLabel=\{`Retry playing \$\{release\.title\}`\}/, 'Release playback errors must be announced and expose a labelled Retry action');
assert.doesNotMatch(release, /Diagnostic:v3|diagnostic-v3/, 'Temporary Release playback diagnostics must not remain in product source');
assert.doesNotMatch(release, /playableUrl: isOwned \?/);
assert.doesNotMatch(release, /const releaseUrl = isOwned \?/);
assert.match(release, /addReleaseToPlaylist/);
assert.match(release, /loadMobilePlaylists/);
assert.match(release, /release_artists/);
assert.match(release, /claimed_profile_id/);
assert.match(release, /creditedArtist\?\.profileRoute/);
assert.doesNotMatch(release, /onPress=\{\(\) => release\.user_id && router\.push\(`\/user\//);
assert.match(release, /Unlock download/);
assert.match(release, /Buy download/);
assert.match(release, /const canUnlock = !isOwned && creditsNeeded > 0/);
assert.match(release, /!isOwned && canUnlock/);
assert.match(release, /isOwned \? 'Your purchased files are unlocked\.'/);
assert.match(release, /creditsExpanded/);
assert.match(release, /Linking\.openURL/);

// The Releases hero shows a truthful real progress rail and keeps the mobile
// transport within flexible bounds; it must never fabricate waveform data.
assert.match(releases, /deckProgressTrack/);
assert.match(releases, /playedRatio/);
assert.doesNotMatch(releases, /Math\.sin/);
assert.match(releases, /deckTransportLeft: \{[^}]*flexShrink: 1/);
assert.match(
  releases,
  /deckSupport: \{[\s\S]*?borderRadius: 7,[\s\S]*?paddingHorizontal: 18,[\s\S]*?paddingVertical: 12,/,
  'Listening Floor release CTA must match the web listening-floor button geometry',
);
assert.doesNotMatch(
  releases,
  /deckSupport:\s*\{\s*minHeight:\s*50,\s*borderRadius:\s*999,/,
  'Listening Floor release CTA must not use an oversized full pill',
);
assert.match(
  releases,
  /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?minimumFontScale=\{0\.82\}/,
  'Listening Floor release CTA text must stay contained at compact widths',
);

// Mix cards expose both a direct real play action and a navigable room. The
// current web-authoritative hero keeps a real Browse latest jump, while fake
// BPM labels and route-to-self actions remain forbidden.
assert.match(mixes, /accessibilityLabel=\{`Play \$\{mix\.title/);
assert.match(mixes, /playback\.playTrack/);
assert.match(mixes, /New & notable mixes/);
assert.doesNotMatch(mixes, /BPM TBC/);
assert.match(mixes, /accessibilityLabel="Browse latest"[\s\S]*?onPress=\{onBrowseLatest\}/);
assert.match(mixes, /latestSectionY[\s\S]*?scrollTo\(\{ y: Math\.max\(0, latestSectionY - 96\), animated: true \}\)/);
assert.doesNotMatch(mixes, /<Text style=\{styles\.djProfileText\}>Profile<\/Text>/);
assert.match(mixDetail, /UUID_PATTERN\.test\(lookup\) \? mixQuery\.eq\('id', lookup\) : mixQuery\.eq\('slug', lookup\)/);
assert.doesNotMatch(mixDetail, /\.or\(`id\.eq\.\$\{id\},slug\.eq\.\$\{id\}`\)/);
assert.match(mixDetail, /\.eq\('mix_id', nextMix\.id\)/);
assert.match(mixDetail, /toTrack\(mix, 'mix'\)/);
assert.match(mixDetail, /const \[startingPlayback, setStartingPlayback\] = useState\(false\)/, 'Mix detail must expose local immediate playback feedback');
assert.match(mixDetail, /const playMix = async \(openFullPlayer = false\)[\s\S]*?setStartingPlayback\(true\)[\s\S]*?await playTrack\(track\)[\s\S]*?finally[\s\S]*?setStartingPlayback\(false\)/, 'Listening Room playback must await the existing player while Starting feedback is visible');
assert.match(mixDetail, /accessibilityState=\{\{ busy: startingPlayback, disabled: !mix\.audio_url \|\| startingPlayback \}\}/, 'Mix detail Play must be disabled and announce busy while playback starts');
assert.match(mixDetail, /startingPlayback[\s\S]*?<ActivityIndicator color="#1b1005"/, 'Listening Room deck must show immediate Starting feedback without changing the shared player');
assert.match(mixDetail, /MIX_STARTING_FEEDBACK_MS = 350[\s\S]*?remainingFeedback > 0[\s\S]*?setTimeout\(resolve, remainingFeedback\)/, 'Mix Starting feedback must remain visible long enough to render without delaying playback itself');
assert.match(mixDetail, /activeIsRequestedMix[\s\S]*?if \(openFullPlayer\)[\s\S]*?router\.push\(\{[\s\S]*?pathname: '\/player'/, 'Mix detail must verify the requested mix before any optional full-player handoff');
assert.match(mixDetail, /catch \{[\s\S]*?tap Play mix to try again[\s\S]*?Alert\.alert\('Mix unavailable'/, 'Mix playback failures must never remain silent');
assert.match(mixDetail, /<Text accessibilityRole="alert" style=\{styles\.playbackError\}>/, 'Mix playback failures must remain visible and actionable after the alert closes');
assert.match(mixDetail, /DIRECT DRIVE · PLG-01/, 'Portrait Listening Room must retain the accepted direct-drive deck identity');
assert.match(mixDetail, /Animated\.loop\(/, 'Portrait Listening Room must animate the real record deck while audio plays');
assert.match(mixDetail, /tonearmPosition[\s\S]*?tonearmTurn/, 'Portrait Listening Room must translate playback state into the tonearm position');
assert.match(mixDetail, /tonearm:\s*\{[\s\S]*?transformOrigin: '29px 22px'[\s\S]*?tonearmPivot:\s*\{[\s\S]*?left: 10[\s\S]*?top: 3[\s\S]*?width: 38[\s\S]*?height: 38[\s\S]*?tonearmRod:\s*\{[\s\S]*?left: 17[\s\S]*?top: 22[\s\S]*?width: 24[\s\S]*?transformOrigin: '12px 0px'/, 'Portrait Listening Room tonearm rod and animated origin must share the exact centre of the circular pivot base');
assert.doesNotMatch(mixDetail, /tonearmHead:\s*\{[^}]*marginLeft/, 'Portrait Listening Room cartridge must remain centred on the tonearm rod instead of being offset from its base');
assert.match(mixDetail, /renderDeckSignal\('L'\)[\s\S]*?renderDeckSignal\('R'\)/, 'Portrait Listening Room must render both labelled deck signal meters');
assert.match(mixDetail, /colors=\{\['#4caf50', '#4caf50', '#e4ed2d', '#ff4437'\]\}/, 'Deck meters must copy the current web green-yellow-red VU gradient');
assert.match(mixDetail, /vuFillIdle:\s*\{ width: '18%' \}/, 'Paused deck meters must retain the current web visible idle level');
assert.match(mixDetail, /vuFillPlayingLeft:\s*\{ width: '82%' \}/, 'Left playing meter must retain the current web target level');
assert.match(mixDetail, /vuFillPlayingRight:\s*\{ width: '68%' \}/, 'Right playing meter must retain the current web target level');
assert.match(mixDetail, /roomPlaying && \{ opacity: pulseOpacity, transform: \[\{ scaleX: pulseScale \}\] \}/, 'VU pulse may animate only while real playback is active');
assert.doesNotMatch(mixDetail, /vuSegments|vuSegment|activeSegments|playedRatio \* 92/, 'Rejected grey segments and progress-clamped deck dashes must not return');
assert.match(mixDetail, /from\('mix_comments'\)[\s\S]*?from\('mix_track_id_requests'\)/, 'Portrait Listening Room must load real timestamped comments and Track ID requests');
assert.match(mixDetail, /const requestTrackId = async \(\)/, 'Portrait Listening Room must retain the real Request ID action');
assert.match(mixDetail, /const postRoomComment = async \(\)/, 'Portrait Listening Room must retain real timestamped comment posting');

// Event cards and detail preserve separate real detail and ticket paths, show
// the real promoter route near the purchase action, and open real linked live
// URLs when supplied.
assert.match(events, /router\.push\(`\/events\/\$\{event\.id\}`/);
assert.match(events, /openExternalEventTickets/);
assert.match(event, /PRESENTED BY/);
assert.match(event, /culture\.data!\.promoter!\.route/);
assert.match(event, /ExternalTicketAccess event=\{event\}/);
assert.match(event, /Linking\.openURL/);

// Soundboard editor drags directly on the selected canvas card; there is no
// labelled no-op Drag tool. Pre-metadata audio progress is a loading label,
// not an adjustable range with zero bounds that VoiceOver reports as NaN.
assert.doesNotMatch(soundboard, /label="Drag"/);
assert.match(soundboard, /focusedDuration > 0 \?/);
assert.match(soundboard, /accessibilityLabel="Audio duration loading"/);

console.log('mobile product pages contract verified');
