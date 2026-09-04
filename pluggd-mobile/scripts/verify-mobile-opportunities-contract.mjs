import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

for (const route of ['app/opportunities/index.tsx', 'app/opportunities/[id].tsx']) {
  assert.ok(exists(route), `${route} must exist as a native Expo route`);
  assert.match(read(route), /Stack\.Screen options=\{\{ headerShown: false \}\}/, `${route} must use the native full-screen Opportunities experience`);
}

const service = read('src/features/opportunities/opportunityService.ts');
const screens = read('src/features/opportunities/OpportunityScreens.tsx');
const events = read('src/features/editorial/EventsBoardScreen.tsx');
const promoterArtwork = 'assets/opportunities/early-career-promoter-hero.png';
const creatorHero = 'assets/opportunities/opportunities-creator-hero.webp';

assert.match(service, /from\('opportunities'\)[\s\S]*\.in\('status', OPEN_OPPORTUNITY_STATUSES\)/, 'inventory and detail must use only real open Opportunities rows');
assert.match(service, /\.eq\('verification_status', 'verified'\)/, 'native Opportunities must expose only verified listings');
assert.match(service, /fetchPublishedOpportunity[\s\S]*\.eq\('slug', identifier\)[\s\S]*UUID_PATTERN/, 'detail must resolve real records by slug or UUID');
assert.match(service, /from\('opportunity_requirements'\)/, 'published matching and eligibility must use opportunity requirements');
assert.match(service, /from\('user_opportunity_facts'\)/, 'matching must include the existing private fact contract');
for (const table of ['user_opportunities', 'opportunity_application_items', 'user_opportunity_items']) {
  assert.match(service, new RegExp(`from\\('${table}'\\)`), `${table} must back its native Opportunity state`);
}
assert.match(service, /evaluateOpportunityMatch[\s\S]*algorithmVersion: '1\.0\.0'/, 'automatic matching must use the deterministic versioned engine');
assert.match(service, /score[\s\S]*confidence[\s\S]*missingFacts/, 'matching must expose score, confidence and missing facts');
assert.doesNotMatch(service + screens, /Math\.random|openai|anthropic|seedOpportun|mockOpportun/i, 'native Opportunities must not use random, AI-ranked, seed or mock results');

assert.match(screens, /fetchPublishedOpportunities\(\)/, 'the list must load the real published inventory');
assert.match(screens, /evaluateOpportunityMatch\(opportunity[\s\S]*profileSnapshot\.data/, 'signed-in matches must calculate automatically from the real profile snapshot');
assert.match(screens, /match\.score[\s\S]*match\.confidence[\s\S]*match\.reasons/, 'detail must visibly explain score, confidence and reasons');
assert.match(screens, /match\.missingFacts/, 'detail must surface missing facts instead of inventing certainty');
assert.match(screens, /getOpportunityArtwork\(opportunity\)|getOpportunityArtwork\(record\)/, 'list and detail must share real artwork selection');
assert.ok(exists(promoterArtwork), 'the approved Early Career Promoter campaign artwork must be bundled for reliable native rendering');
assert.ok(exists(creatorHero), 'the approved neutral creator hero must be bundled for detail records without artwork');
assert.match(service, /EARLY_CAREER_PROMOTER_ARTWORK = require\('\.\.\/\.\.\/\.\.\/assets\/opportunities\/early-career-promoter-hero\.png'\)/, 'the Early Career Promoter record must use the bundled approved artwork rather than a web-only URI');
assert.match(service, /OPPORTUNITIES_CREATOR_HERO = require\('\.\.\/\.\.\/\.\.\/assets\/opportunities\/opportunities-creator-hero\.webp'\)/, 'detail fallback art must use the exact approved bundled creator image');
assert.doesNotMatch(service, /EARLY_CAREER_PROMOTER_ARTWORK[^\n]+as number/, 'bundled Expo assets must not be assumed to have a numeric runtime module shape');
assert.match(screens, /normaliseLocalArtworkSource[\s\S]*'default' in artwork[\s\S]*Image\.resolveAssetSource/, 'the shared artwork path must normalise both direct and module-wrapped Expo asset sources');
assert.doesNotMatch(screens, /localhost|127\.0\.0\.1/, 'bundled Opportunity artwork must not depend on a development server URL');
assert.match(screens, /featuredImage: \{ width: '100%', height: '100%' \}[\s\S]*heroArtwork: \{ width: '100%', height: '100%' \}/, 'bundled list and detail artwork must occupy their reserved media regions in normal layout');
assert.doesNotMatch(screens, /\[Opportunities\]\[local-artwork-(?:source|error)\]/, 'temporary local artwork diagnostics must be removed before source verification');
assert.match(screens, /featuredMedia: \{ height: 188[\s\S]*featuredBody: \{ minHeight: 166, padding: 14/, 'the lead card must reserve separate artwork and in-flow copy regions');
assert.doesNotMatch(screens, /featuredBody: \{ position: 'absolute'/, 'lead card copy must not use the overlapping absolute layout');
assert.match(screens, /heroArtworkShell: \{ height: 156/, 'detail artwork must be compact enough to keep matching context near the first screen');
assert.match(service, /getOpportunityIdentityCandidates[\s\S]*organiser_logo_url[\s\S]*favicon\.ico/, 'source identity must use real organiser logos and official-domain fallbacks');
assert.doesNotMatch(screens, /organiser_name\?\.trim\(\)\?\.charAt|organiser_name[^\n]+charAt/, 'organiser identity must not fall back to a letter tile');
assert.match(screens, /new Set\(opportunities\.map\(\(item\) => item\.opportunity_type\)/, 'category filters must derive from the real data model');
assert.match(screens, /OpportunityFiltersModal[\s\S]*Creator role[\s\S]*Genre[\s\S]*Career stage[\s\S]*Location[\s\S]*Deadline[\s\S]*Your match[\s\S]*Sort/, 'the full-screen discovery surface must expose only model-backed filters');
assert.match(
  screens,
  /<EdPressable[\s\S]*?accessible[\s\S]*?accessibilityRole="button"[\s\S]*?accessibilityLabel="Open opportunity filters"[\s\S]*?accessibilityHint="Opens category, creator, location, deadline and match filters"[\s\S]*?accessibilityState=\{\{ expanded: filtersOpen \}\}[\s\S]*?hitSlop=\{8\}[\s\S]*?setFiltersOpen\(true\)/,
  'the visible Opportunities filter control must expose one tappable, descriptive accessibility target',
);
assert.match(screens, /filterButton: \{ width: 48, minHeight: 48/, 'the Opportunities filter control must retain an adequate compact-phone hit target');
assert.match(screens, /disabled=\{!userSignedIn\}/, 'private match and saved filters must remain unavailable while signed out');
assert.match(screens, /const matchedCount = \[\.\.\.matches\.values\(\)\]\.filter\(\(match\) => match\.state !== 'low_match'\)\.length/, 'the signed-in summary must include honest needs-information matches shown by the personalised list');
assert.match(screens, /matchSummaryPending[\s\S]*matchSummaryUnavailable[\s\S]*\? '—' : String\(matchedCount\)/, 'the signed-in summary must not render a false zero while matching is loading or unavailable');
assert.match(screens, /statusMutation\.mutate\('preparing'\)[\s\S]*statusMutation\.mutate\('ready'\)[\s\S]*statusMutation\.mutate\('applied'\)/, 'preparing, ready and applied states must be real backend mutations');
assert.match(screens, /accessible accessibilityRole="button" accessibilityLabel=\{saved \? `Remove \$\{record\.title\} from saved opportunities` : `Save \$\{record\.title\} for later`\}[\s\S]*accessibilityState=\{\{ busy: saveMutation\.isPending, disabled: saveMutation\.isPending \}\}[\s\S]*saveMutation\.mutate\(\)/, 'the visible save control must expose one explicit accessible backend action');
assert.match(screens, /accessible accessibilityRole="button" accessibilityLabel=\{workspaceActionLabel\}[\s\S]*accessibilityHint="Starts or opens your private PLUGGD application workspace"[\s\S]*accessibilityState=\{\{ busy: prepareMutation\.isPending, disabled: prepareMutation\.isPending \}\}[\s\S]*onPress=\{openWorkspace\}/, 'the sticky preparation control must expose one explicit accessible backend action');
assert.match(screens, /setUserOpportunityItem/, 'application checklist completion must persist through the existing backend contract');
assert.match(screens, /MissingFactsPanel[\s\S]*saveOpportunityFact[\s\S]*Remember for future matches/, 'opportunity-specific missing facts must persist through the private fact contract');
assert.match(screens, /safeOpportunityExternalUrl[\s\S]*Linking\.openURL/, 'official external actions must be restricted to safe HTTP(S) URLs');
assert.match(screens, /router\.canGoBack\(\)[\s\S]*router\.replace\('\/opportunities'/, 'cold Opportunity deep links must have a safe internal exit');
assert.match(screens, /No direct application link is published/, 'missing application destinations must be stated honestly');
assert.match(screens, /stickyActions[\s\S]*bottom: bottomInset[\s\S]*Apply now[\s\S]*workspaceActionLabel/, 'detail must keep compact working apply and preparation actions above the approved global chrome');
assert.match(screens, /Sign in[\s\S]*redirect=/, 'signed-out private actions must route through authentication and return to the opportunity');
assert.doesNotMatch(screens, /Opportunity Drop|Explore the drop|opportunity drop/i, 'Opportunities must never be described as music drops');

assert.match(events, /router\.push\('\/opportunities'/, 'Events must link internally to native Opportunities');
assert.match(events, /Find your next opportunity/, 'Events must use a clear creator-facing Opportunities call to action');
assert.doesNotMatch(events, /opportunities will appear here/i, 'the old Open Opportunities placeholder must be removed');

console.log('PLUGGD native Opportunities contract verified');
