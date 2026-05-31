# Mobile Community Feed Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic native Community parity surface with a real feed-first native Community experience that matches the mobile web social product.

**Architecture:** Keep the current web-parity shell and commerce checkpoint intact. Build a dedicated native Community feed feature on top of existing mobile social primitives (`loadMobileSocialFeed`, `MobileSocialPostCard`, `MobileStoriesRail`, `createSocialPost`, post detail, board routes), and reserve generic parity cards for secondary Community tabs such as Explore, Boards, and hub cards.

**Tech Stack:** Expo Router, React Native, TypeScript, React Query, Supabase, existing mobile social services, existing premium dark design tokens, read-only web reference from `/Users/apple/PLUGGD_NEW`.

---

## Locked Checkpoint Constraints

- [ ] Do not change the global visible dock: `Home / Discover / Community / Events / Market`.
- [ ] Do not add `Create`, `Profile`, `Explore`, `Stage`, `Live`, `Backstage`, `MyPLUGGD`, `Wallet`, or `Search` as visible dock tabs.
- [ ] Keep Create as the role-aware floating action sheet.
- [ ] Keep Profile/account access through the avatar account sheet.
- [ ] Keep `/live` as a real route/deep link, not a dock tab.
- [ ] Keep `/stage` as Discover compatibility.
- [ ] Keep `/my-pluggd` as compatibility/account routing only.
- [ ] Do not touch Bundle ID `com.pluggd.mobile`.
- [ ] Do not touch StoreKit credit SKUs:
  - `pluggd_credits_starter`
  - `pluggd_credits_popular`
  - `pluggd_credits_value`
  - `pluggd_credits_premium`
  - `pluggd_credits_ultimate`
- [ ] Do not touch subscription SKUs:
  - `pluggd_tier_299`
  - `pluggd_tier_499`
  - `pluggd_tier_999`
  - `pluggd_tier_1999`
  - `pluggd_tier_4999`
- [ ] Do not change Apple/IAP lockfile, receipt validation, App Store Server Notification handling, wallet ledger strategy, or payment strategy.
- [ ] Do not add Supabase migrations unless a specific table/function is proven required and approved separately.
- [ ] Do not ship public copy containing internal implementation language such as "backend contract", "unsupported payment", "native translation", "App Review", "Apple-backed", "web-only", "contract", "backend", or "unsupported".

## Source Of Truth

### Read-Only Web Reference

- `/Users/apple/PLUGGD_NEW/src/pages/community/CommunityPage.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/SocialFeed.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/CreateSocialPost.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/SocialPostCard.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/StoriesRail.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/WhoToFollow.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/community/CommunityBottomDock.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/social/FeedAttachmentCard.tsx`
- `/Users/apple/PLUGGD_NEW/src/lib/socialFeedShare.ts`
- `/Users/apple/PLUGGD_NEW/src/hooks/useSocialFeed.tsx`

### Existing Native Pieces To Reuse

- `app/(tabs)/community.tsx`
- `app/community.tsx`
- `app/create-post.tsx`
- `app/post/[id].tsx`
- `app/hashtag/[tag].tsx`
- `app/community/boards/[slug].tsx`
- `src/features/culture/mobileSocial.ts`
- `src/features/culture/mobileServices.ts`
- `src/features/culture/MobileSocialPostCard.tsx`
- `src/features/culture/MobileStoriesRail.tsx`
- `src/features/parity/AppWideParityScreens.tsx`
- `src/features/parity/appWideParityServices.ts`
- `components/AppChrome.tsx`
- `components/CreateActionSheet.tsx`
- `components/PluggdDock.tsx`
- `components/MobileHeader.tsx`

## Current Problem

The current Community tab target is:

```tsx
import { CommunityParityScreen } from '../../src/features/parity/AppWideParityScreens';

export default function CommunityTabRoute() {
  return <CommunityParityScreen />;
}
```

That passes shallow route/parity checks, but it is not the mobile web Community product. It creates a generic card/section page. The mobile web Community is feed-first and includes:

- Stories/Moments rail.
- Create post composer.
- Feed filters and modes.
- Social feed list.
- Like/comment/repost/bookmark/share/report actions.
- Comments and post detail route behavior.
- Hashtag navigation.
- Who to follow.
- Interstitial feed modules.
- Boards, communities, and explore tabs.
- Community-specific internal navigation.

The new checkpoint name should be `mobile-community-feed-parity`.

## File Structure

Create a focused feature folder:

- Create: `src/features/community-feed/communityFeedTypes.ts`
  - Owns native Community tab keys, feed filters, interstitial kinds, composer attachment types, and view models.
- Create: `src/features/community-feed/communityFeedService.ts`
  - Aggregates existing social, stories, boards, live, events, creator, and parity loaders into one Community feed bundle.
- Create: `src/features/community-feed/MobileFeedAttachmentCard.tsx`
  - Native equivalent of the web feed attachment card for release/beat/mix/event attachments.
- Create: `src/features/community-feed/CommunityComposer.tsx`
  - Compact signed-in composer and signed-out prompt; routes to `app/create-post.tsx` with attachment/destination params.
- Create: `src/features/community-feed/CommunityFeedInterstitials.tsx`
  - Community Prompt, Live Now, Who To Follow, Trending Boards, Nearby Events, Community Radio modules.
- Create: `src/features/community-feed/CommunityInternalSwitcher.tsx`
  - Feed / Communities / Boards / Explore internal community controls, styled like an in-feed community dock.
- Create: `src/features/community-feed/CommunityFeedScreen.tsx`
  - Main screen replacing `CommunityParityScreen` for Community routes.
- Create: `scripts/verify-mobile-community-feed-contract.mjs`
  - Contract requiring the feed-first implementation.

Modify existing files:

- Modify: `app/(tabs)/community.tsx`
  - Render `CommunityFeedScreen`.
- Modify: `app/community.tsx`
  - Render `CommunityFeedScreen`.
- Modify: `app/hashtag/[tag].tsx`
  - Render social hashtag feed or route into `CommunityFeedScreen` with hashtag focus, not generic parity.
- Modify: `app/create-post.tsx`
  - Render attachment preview and submit attachment `linkPreview` when release/beat/mix/event params exist.
- Modify: `app/release/[id].tsx`
  - Post/share button opens composer with attached release card.
- Modify: `app/beat/[id].tsx`
  - Post/share button opens composer with attached beat card and does not route licensing to wallet.
- Modify: `app/mixes/[id].tsx`
  - Post/share button opens composer with attached mix card.
- Modify: `app/post/[id].tsx`
  - Keep post detail, comments, poll, like/bookmark/repost behavior; add report path and signed-out interaction gates.
- Modify: `src/features/culture/MobileSocialPostCard.tsx`
  - Add report action and ensure hashtag route targets `/hashtag/[tag]` or `/community?hashtag=tag`.
- Modify: `src/features/culture/mobileSocial.ts`
  - Add optional `reportSocialPost` and any missing filter inputs without replacing current loaders.
- Modify: `src/features/culture/mobileServices.ts`
  - Add attachment preview resolver helpers only if they fit existing service boundaries.
- Modify: `scripts/verify-mobile-navigation-contract.mjs`
  - Stop accepting `CommunityParityScreen` as the Community tab implementation.
- Modify: `scripts/verify-mobile-premium-finish-contract.mjs`
  - Stop requiring `CommunityParityScreen` as a primary premium surface.
- Modify: `scripts/verify-mobile-social-web-parity-contract.mjs`
  - Require the real native Community feed implementation.
- Modify: `scripts/verify-mobile-finish.mjs`
  - No manual change needed if the new script matches `verify-mobile-*.mjs`; confirm it is picked up.

## Native Community Target Structure

The screen must render this product order:

```text
Community
1. Header/intro kept compact, not a dashboard hero.
2. Internal switcher: Feed / Communities / Boards / Explore.
3. Feed tab:
   - Stories/Moments rail.
   - Compact composer or signed-out post prompt.
   - For You/social feed logic from current social tables/RPCs.
   - Feed filters: All, Threads, Media, Reposts, Activity.
   - Social feed list.
   - Interstitial modules inside the feed, not separate page rails.
   - First interstitial module appears immediately after the composer.
   - Additional modules appear after the first post and later feed positions.
   - CommunityBottomDock-style quick movement for Stories/Moments, Create Post, Map/Nearby where backed, and Boards/Discussions.
4. Communities tab:
   - Joined and discoverable creator/community cards.
5. Boards tab:
   - Trending/featured boards and board entry points.
6. Explore tab:
   - Secondary parity cards for prompts, live, events, radio, creators, and hubs.
```

The Community tab is product-complete only when the first visible experience is a social feed with stories, composer, filters, posts, and actions. It is not complete if it is only a generic card directory.

## Completeness Requirements From Review

This plan must cover every missing product item called out in the Community review:

- [ ] Replace `CommunityParityScreen` as the primary Community tab target.
- [ ] Recreate the web feed-first model, not a generic directory/hub surface.
- [ ] Preserve the separation where Home is the front door/editorial surface and Community owns dense social participation.
- [ ] Use a real For You/social feed loader path rather than only generic card mappers.
- [ ] Include Stories/Moments with creator avatars, empty state, view story/moment route, and signed-in add-moment path when backed.
- [ ] Include a compact create-post composer, caption entry route, submit flow, auth gate, and post-created navigation.
- [ ] Include web-equivalent feed filters, mapping `All Feed` to `All` and `Community Activity` to `Activity`.
- [ ] Include social post cards with comments, likes, bookmarks, reposts, quote posts, polls, media posts, post detail route behavior, hashtag navigation, sharing, and reporting.
- [ ] Include pull-to-refresh and query invalidation; add Supabase realtime only if an existing safe realtime channel is already backed and does not introduce noisy failures.
- [ ] Include Who To Follow and mobile feed interstitial modules inside the feed, including modules directly after the composer and after the first post.
- [ ] Include CommunityBottomDock-style internal mobile controls for feed movement: Feed, Stories/Moments, Map/Nearby where backed, Create Post, Boards/Discussions, plus the required Feed / Communities / Boards / Explore switcher.
- [ ] Include content-share attachment flows for release, beat, gallery, mix, and any backed detail route; if an attachment type is not backed, route to the composer with an honest customer-facing unavailable state.
- [ ] Update contracts so `CommunityParityScreen` can no longer satisfy Community parity.
- [ ] Compare visually against mobile web Community before claiming parity.

---

## Task 1: Lock The Failing Community Feed Contract

**Files:**

- Create: `scripts/verify-mobile-community-feed-contract.mjs`
- Modify: `scripts/verify-mobile-navigation-contract.mjs`
- Modify: `scripts/verify-mobile-premium-finish-contract.mjs`
- Modify: `scripts/verify-mobile-social-web-parity-contract.mjs`

- [ ] **Step 1: Add a contract that fails on the current implementation**

Create `scripts/verify-mobile-community-feed-contract.mjs` with assertions for the real feed surface:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tabRoute = read('app/(tabs)/community.tsx');
const topRoute = read('app/community.tsx');
const screen = read('src/features/community-feed/CommunityFeedScreen.tsx');
const service = read('src/features/community-feed/communityFeedService.ts');
const composer = read('src/features/community-feed/CommunityComposer.tsx');
const interstitials = read('src/features/community-feed/CommunityFeedInterstitials.tsx');
const switcher = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');
const socialService = read('src/features/culture/mobileSocial.ts');
const createPost = read('app/create-post.tsx');
const hashtagRoute = read('app/hashtag/[tag].tsx');

assert.match(tabRoute, /CommunityFeedScreen/, 'Community tab must render CommunityFeedScreen');
assert.match(topRoute, /CommunityFeedScreen/, 'Top-level /community must render CommunityFeedScreen');
assert.doesNotMatch(tabRoute + topRoute, /CommunityParityScreen/, 'Community primary route must not render generic CommunityParityScreen');

for (const token of [
  'MobileStoriesRail',
  'CommunityComposer',
  'CommunityInternalSwitcher',
  'MobileSocialPostCard',
  'RefreshControl',
  'FlatList',
  'loadCommunityFeedBundle',
  'FEED_FILTERS',
  'All',
  'Threads',
  'Media',
  'Reposts',
  'Activity',
]) {
  assert.match(screen, new RegExp(escapeRegExp(token)), `CommunityFeedScreen must include ${token}`);
}

for (const token of [
  'Community Prompt',
  'Live Now',
  'Who To Follow',
  'Trending Boards',
  'Nearby Events',
  'Community Radio',
]) {
  assert.match(interstitials, new RegExp(escapeRegExp(token)), `Community feed interstitials must include ${token}`);
}

for (const token of ['Feed', 'Communities', 'Boards', 'Explore']) {
  assert.match(switcher, new RegExp(escapeRegExp(token)), `Community internal switcher must include ${token}`);
}

for (const token of [
  'loadMobileSocialFeed',
  'loadMobileStories',
  'loadCommunityBoards',
  'loadCommunityParity',
  'social_posts',
  'social_post_destinations',
]) {
  assert.match(service + socialService, new RegExp(escapeRegExp(token)), `Community feed data must use ${token}`);
}

for (const token of [
  'toggleSocialLike',
  'toggleSocialBookmark',
  'toggleSocialRepost',
  'voteMobilePoll',
  'reportSocialPost',
  'Share.share',
  '/post/',
  '/hashtag/',
]) {
  assert.match(socialCard + socialService, new RegExp(escapeRegExp(token)), `Social post card/service must support ${token}`);
}

for (const token of [
  'Start a post',
  'Sign in to post',
  '/auth/login',
  '/create-post',
]) {
  assert.match(composer, new RegExp(escapeRegExp(token)), `Community composer must include ${token}`);
}

for (const token of [
  'attachmentType',
  'releaseId',
  'beatId',
  'galleryId',
  'mixId',
  'linkPreview',
  'MobileFeedAttachmentCard',
]) {
  assert.match(createPost, new RegExp(escapeRegExp(token)), `Create post route must support attached content via ${token}`);
}

assert.match(hashtagRoute, /loadMobileSocialFeed|CommunityFeedScreen/, 'Hashtag route must use the social feed implementation');

assert.doesNotMatch(
  screen + composer + interstitials + switcher + socialCard + createPost,
  /backend contract|unsupported payment|native translation|App Review|Apple-backed|web-only|current backend|mobile backend|\bcontract\b|\bbackend\b/i,
  'Community feed public UI must not expose internal implementation copy',
);

console.log('mobile community feed contract verified');
```

- [ ] **Step 2: Update navigation contract**

In `scripts/verify-mobile-navigation-contract.mjs`, replace:

```js
assert.match(tabCommunitySource, /CommunityParityScreen/, 'Community tab must render the web-source Community parity screen');
```

with:

```js
assert.match(tabCommunitySource, /CommunityFeedScreen/, 'Community tab must render the feed-first Community screen');
assert.doesNotMatch(tabCommunitySource, /CommunityParityScreen/, 'Community tab must not render the generic parity screen');
```

- [ ] **Step 3: Update premium finish contract**

In `scripts/verify-mobile-premium-finish-contract.mjs`, remove `CommunityParityScreen` from the loop requiring generic parity exports:

```js
for (const exportName of ['DiscoverParityScreen', 'EventsParityScreen', 'MarketParityScreen']) {
  assert.match(parityScreens, new RegExp(`export function ${exportName}`), `${exportName} must remain a premium web-parity surface`);
}
```

Add:

```js
const communityFeed = read('src/features/community-feed/CommunityFeedScreen.tsx');
assert.match(communityFeed, /MobileSocialPostCard[\s\S]*MobileStoriesRail[\s\S]*CommunityComposer/, 'Community must use the feed-first premium social surface');
```

- [ ] **Step 4: Update social web parity contract**

In `scripts/verify-mobile-social-web-parity-contract.mjs`, replace the two assertions that require `CommunityParityScreen` in `app/community.tsx` and `app/(tabs)/community.tsx` with:

```js
assert.match(communityRoute, /CommunityFeedScreen/, 'top-level Community route must render the feed-first Community surface');
assert.match(communityTabRoute, /CommunityFeedScreen/, 'tab Community route must render the feed-first Community surface');
assert.doesNotMatch(communityRoute + communityTabRoute, /CommunityParityScreen/, 'Community primary routes must not render generic parity screens');
```

- [ ] **Step 5: Run the new contract and confirm it fails before implementation**

Run:

```bash
node scripts/verify-mobile-community-feed-contract.mjs
```

Expected before implementation:

```text
CommunityFeedScreen.tsx ENOENT
```

- [ ] **Step 6: Commit the failing contract**

```bash
git add scripts/verify-mobile-community-feed-contract.mjs scripts/verify-mobile-navigation-contract.mjs scripts/verify-mobile-premium-finish-contract.mjs scripts/verify-mobile-social-web-parity-contract.mjs
git commit -m "test: require native community feed parity"
```

## Task 2: Define Community Feed Types

**Files:**

- Create: `src/features/community-feed/communityFeedTypes.ts`

- [ ] **Step 1: Add typed tabs, filters, interstitials, and attachments**

Create `src/features/community-feed/communityFeedTypes.ts`:

```ts
import type { MobileSocialPost, BackstageBoard } from '../culture/mobileTypes';
import type { ParityCard } from '../parity/appWideParityServices';

export type CommunityTabKey = 'feed' | 'communities' | 'boards' | 'explore';

export type CommunityFeedFilterKey = 'all' | 'threads' | 'media' | 'reposts' | 'activity';

export type CommunityFeedFilter = {
  key: CommunityFeedFilterKey;
  label: string;
  description: string;
};

export type CommunityInterstitialKind =
  | 'prompt'
  | 'live_now'
  | 'who_to_follow'
  | 'trending_boards'
  | 'nearby_events'
  | 'community_radio';

export type CommunityInterstitial = {
  id: string;
  kind: CommunityInterstitialKind;
  title: string;
  subtitle: string;
  route?: string | null;
  items?: ParityCard[];
};

export type CommunityFeedBundle = {
  posts: MobileSocialPost[];
  boards: BackstageBoard[];
  communities: ParityCard[];
  exploreCards: ParityCard[];
  liveNow: ParityCard[];
  nearbyEvents: ParityCard[];
  whoToFollow: ParityCard[];
  radio: ParityCard[];
  prompt: CommunityInterstitial;
};

export type MobileFeedAttachmentType = 'release' | 'beat' | 'gallery' | 'mix' | 'event';

export type MobileFeedAttachment = {
  type: MobileFeedAttachmentType;
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
};

export const COMMUNITY_TABS: Array<{ key: CommunityTabKey; label: string; icon: string }> = [
  { key: 'feed', label: 'Feed', icon: 'dynamic-feed' },
  { key: 'communities', label: 'Communities', icon: 'groups' },
  { key: 'boards', label: 'Boards', icon: 'forum' },
  { key: 'explore', label: 'Explore', icon: 'explore' },
];

export const FEED_FILTERS: CommunityFeedFilter[] = [
  { key: 'all', label: 'All', description: 'Every community post' },
  { key: 'threads', label: 'Threads', description: 'Discussions and questions' },
  { key: 'media', label: 'Media', description: 'Posts with images, video or audio' },
  { key: 'reposts', label: 'Reposts', description: 'Shared posts and quotes' },
  { key: 'activity', label: 'Activity', description: 'Community updates and destinations' },
];
```

- [ ] **Step 2: Run TypeScript for this isolated addition**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no TypeScript errors from communityFeedTypes.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/features/community-feed/communityFeedTypes.ts
git commit -m "feat: add community feed type contracts"
```

## Task 3: Build Community Feed Data Service

**Files:**

- Create: `src/features/community-feed/communityFeedService.ts`
- Modify: `src/features/culture/mobileSocial.ts`

- [ ] **Step 1: Add filter helper**

Create `src/features/community-feed/communityFeedService.ts` with:

```ts
import { loadMobileSocialFeed, loadCommunityBoards } from '../culture/mobileSocial';
import { loadCommunityParity, type ParityCard } from '../parity/appWideParityServices';
import type {
  CommunityFeedBundle,
  CommunityFeedFilterKey,
  CommunityInterstitial,
} from './communityFeedTypes';
import type { MobileSocialPost } from '../culture/mobileTypes';

function hasMedia(post: MobileSocialPost) {
  return Boolean(post.images?.length || post.video || post.audio || post.gif || post.link_preview);
}

function isThread(post: MobileSocialPost) {
  return ['discussion', 'question', 'beat_feedback', 'track_feedback', 'collab_request'].includes(post.post_type);
}

function hasActivity(post: MobileSocialPost) {
  return post.destinations.some((destination) => destination.destination_type !== 'global_feed');
}

export function filterCommunityPosts(posts: MobileSocialPost[], filter: CommunityFeedFilterKey) {
  if (filter === 'threads') return posts.filter(isThread);
  if (filter === 'media') return posts.filter(hasMedia);
  if (filter === 'reposts') return posts.filter((post) => post.is_repost || post.is_quote);
  if (filter === 'activity') return posts.filter(hasActivity);
  return posts;
}
```

- [ ] **Step 2: Add bundle loader using existing loaders**

Append:

```ts
function bySection(payload: Awaited<ReturnType<typeof loadCommunityParity>>, sectionId: string) {
  return payload.sections.find((section) => section.id === sectionId)?.items ?? [];
}

function firstItems(payload: Awaited<ReturnType<typeof loadCommunityParity>>, labels: string[]) {
  const matches: ParityCard[] = [];
  for (const label of labels) {
    const normalized = label.toLowerCase();
    for (const section of payload.sections) {
      if (section.title.toLowerCase().includes(normalized) || section.id.toLowerCase().includes(normalized)) {
        matches.push(...section.items);
      }
    }
  }
  return matches;
}

export async function loadCommunityFeedBundle(): Promise<CommunityFeedBundle> {
  const [posts, boards, parity] = await Promise.all([
    loadMobileSocialFeed({ mode: 'for-you', limit: 30 }),
    loadCommunityBoards(),
    loadCommunityParity(),
  ]);

  const liveNow = firstItems(parity, ['live']);
  const nearbyEvents = firstItems(parity, ['event']);
  const whoToFollow = firstItems(parity, ['follow', 'creator']);
  const radio = firstItems(parity, ['radio', 'soundboard']);
  const communities = firstItems(parity, ['communities', 'hubs']);
  const exploreCards = parity.sections.flatMap((section) => section.items).slice(0, 24);

  const prompt: CommunityInterstitial = {
    id: 'community-prompt',
    kind: 'prompt',
    title: 'What are you listening to?',
    subtitle: 'Post a thought, drop a thread, or share a release into the community feed.',
    route: '/create-post',
  };

  return {
    posts,
    boards,
    communities,
    exploreCards,
    liveNow,
    nearbyEvents,
    whoToFollow,
    radio,
    prompt,
  };
}
```

- [ ] **Step 3: Add optional report service**

In `src/features/culture/mobileSocial.ts`, add:

```ts
export async function reportSocialPost(postId: string, reason = 'reported_from_mobile') {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to report posts.' };

  const rpcResult = await (supabase as any).rpc('report_social_post', {
    p_post_id: postId,
    p_reason: reason,
  });
  if (!rpcResult.error) return { success: true };

  const insertResult = await (supabase as any)
    .from('social_reports')
    .insert({
      post_id: postId,
      reporter_id: userId,
      reason,
      status: 'open',
    });

  if (!insertResult.error || isDuplicateError(insertResult.error)) return { success: true };
  return { success: false, error: 'Report could not be sent right now.' };
}
```

- [ ] **Step 4: Verify service compiles**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no TypeScript errors from communityFeedService.ts or mobileSocial.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/features/community-feed/communityFeedService.ts src/features/culture/mobileSocial.ts
git commit -m "feat: add community feed data service"
```

## Task 4: Add Native Feed Attachment Card

**Files:**

- Create: `src/features/community-feed/MobileFeedAttachmentCard.tsx`
- Modify: `src/features/culture/mobileServices.ts`

- [ ] **Step 1: Create the native attachment card**

Create `src/features/community-feed/MobileFeedAttachmentCard.tsx`:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { MobileFeedAttachment } from './communityFeedTypes';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function MobileFeedAttachmentCard({ attachment, compact = false }: { attachment: MobileFeedAttachment; compact?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${attachment.title}`}
      style={[styles.card, compact && styles.compact]}
      onPress={() => router.push(attachment.route as any)}
    >
      {attachment.imageUrl ? <PluggdImage uri={attachment.imageUrl} style={styles.image} resizeMode="cover" /> : null}
      <View style={styles.copy}>
        <Text style={styles.label}>{attachment.type}</Text>
        <Text style={styles.title} numberOfLines={2}>{attachment.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{attachment.subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 12,
  },
  compact: {
    padding: 10,
    borderRadius: 14,
  },
  image: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#1F1F2E',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
});
```

- [ ] **Step 2: Add attachment preview builder**

In `src/features/culture/mobileServices.ts`, add a resolver that reads only current backed tables. Gallery support must be guarded: if the native app does not have a backed gallery table/route yet, do not make a noisy failed request; return `null` and show the customer-facing unavailable state in the composer.

```ts
export async function resolveMobileFeedAttachment(input: {
  attachmentType?: string | null;
  releaseId?: string | null;
  beatId?: string | null;
  galleryId?: string | null;
  mixId?: string | null;
  eventId?: string | null;
}) {
  if (input.attachmentType === 'release' && input.releaseId) {
    const release = await safeMaybe<any>((supabase as any).from('releases').select('id,title,artist,cover_art_url').eq('id', input.releaseId).maybeSingle());
    if (!release) return null;
    return {
      type: 'release' as const,
      id: release.id,
      title: release.title || 'Release',
      subtitle: release.artist || 'PLUGGD release',
      imageUrl: release.cover_art_url || null,
      route: `/release/${release.id}`,
    };
  }

  if (input.attachmentType === 'beat' && input.beatId) {
    const beat = await safeMaybe<any>((supabase as any).from('beats').select('id,title,producer_name,image_url').eq('id', input.beatId).maybeSingle());
    if (!beat) return null;
    return {
      type: 'beat' as const,
      id: beat.id,
      title: beat.title || 'Beat',
      subtitle: beat.producer_name || 'Producer beat',
      imageUrl: beat.image_url || null,
      route: `/beat/${beat.id}`,
    };
  }

  if (input.attachmentType === 'gallery' && input.galleryId) {
    const gallery = await safeMaybe<any>((supabase as any).from('galleries').select('id,slug,title,cover_url,creator_name').eq('id', input.galleryId).maybeSingle());
    if (!gallery) return null;
    return {
      type: 'gallery' as const,
      id: gallery.id,
      title: gallery.title || 'Gallery',
      subtitle: gallery.creator_name || 'PLUGGD gallery',
      imageUrl: gallery.cover_url || null,
      route: `/gallery/${gallery.slug || gallery.id}`,
    };
  }

  if (input.attachmentType === 'mix' && input.mixId) {
    const mix = await safeMaybe<any>((supabase as any).from('mixes').select('id,slug,title,cover_url,city').eq('id', input.mixId).maybeSingle());
    if (!mix) return null;
    return {
      type: 'mix' as const,
      id: mix.id,
      title: mix.title || 'Mix',
      subtitle: mix.city || 'PLUGGD mix',
      imageUrl: mix.cover_url || null,
      route: `/mixes/${mix.slug || mix.id}`,
    };
  }

  if (input.attachmentType === 'event' && input.eventId) {
    const event = await safeMaybe<any>((supabase as any).from('events').select('id,title,cover_image_url,location,starts_at').eq('id', input.eventId).maybeSingle());
    if (!event) return null;
    return {
      type: 'event' as const,
      id: event.id,
      title: event.title || 'Event',
      subtitle: [event.location, event.starts_at ? new Date(event.starts_at).toLocaleDateString() : null].filter(Boolean).join(' · ') || 'PLUGGD event',
      imageUrl: event.cover_image_url || null,
      route: `/events/${event.id}`,
    };
  }

  return null;
}

export function buildMobileFeedAttachmentLinkPreview(attachment: {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
}) {
  return {
    type: attachment.type,
    id: attachment.id,
    title: attachment.title,
    description: attachment.subtitle,
    image: attachment.imageUrl || null,
    url: attachment.route,
  };
}
```

- [ ] **Step 3: Verify**

Run:

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/community-feed/MobileFeedAttachmentCard.tsx src/features/culture/mobileServices.ts
git commit -m "feat: add mobile feed attachment previews"
```

## Task 5: Build Community Composer

**Files:**

- Create: `src/features/community-feed/CommunityComposer.tsx`
- Modify: `app/create-post.tsx`

- [ ] **Step 1: Create compact composer**

Create `src/features/community-feed/CommunityComposer.tsx`:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function CommunityComposer() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
        <View style={styles.copy}>
          <Text style={styles.title}>Join the conversation</Text>
          <Text style={styles.subtitle}>Sign in to post, reply, repost, save, or share into the community.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign in to post" style={styles.button} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start a post"
      style={styles.card}
      onPress={() => router.push('/create-post' as any)}
    >
      <View style={styles.avatar}><Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() || 'P'}</Text></View>
      <View style={styles.copy}>
        <Text style={styles.title}>Start a post</Text>
        <Text style={styles.subtitle}>Share a thought, release, beat, photo, poll, or thread.</Text>
      </View>
      <View style={styles.iconButton}>
        <MaterialIcons name="add" size={24} color={COLORS.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  button: { minHeight: 36, borderRadius: 18, backgroundColor: COLORS.orange, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#08080C', fontSize: 12, fontWeight: '900' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 2: Add attachment preview to create-post route**

In `app/create-post.tsx`, import:

```ts
import { MobileFeedAttachmentCard } from '../src/features/community-feed/MobileFeedAttachmentCard';
import { buildMobileFeedAttachmentLinkPreview, resolveMobileFeedAttachment } from '../src/features/culture/mobileServices';
import type { MobileFeedAttachment } from '../src/features/community-feed/communityFeedTypes';
```

Add params:

```ts
attachmentType?: string;
```

Add state and query:

```ts
const [attachment, setAttachment] = useState<MobileFeedAttachment | null>(null);

useEffect(() => {
  let active = true;
  void resolveMobileFeedAttachment({
    attachmentType: params.attachmentType,
    releaseId: params.releaseId,
    beatId: params.beatId,
    galleryId: params.galleryId,
    mixId: params.mixId,
    eventId: params.eventId,
  }).then((next) => {
    if (active) setAttachment(next);
  });
  return () => {
    active = false;
  };
}, [params.attachmentType, params.releaseId, params.beatId, params.galleryId, params.mixId, params.eventId]);
```

Render inside the composer card, above media buttons:

```tsx
{attachment ? <MobileFeedAttachmentCard attachment={attachment} /> : null}
```

Pass `linkPreview` into `createSocialPost`:

```ts
linkPreview: attachment ? buildMobileFeedAttachmentLinkPreview(attachment) : null,
```

After `createSocialPost` succeeds, navigate to the created post route when the inserted post ID is available. If the existing create function does not return the ID, route back to `/community?tab=feed` and invalidate community feed queries so the new post appears after refresh. Do not leave users stranded on a submitted composer.

- [ ] **Step 3: Verify signed-out composer prompt is customer-facing**

Run:

```bash
node scripts/verify-mobile-public-copy-contract.mjs
```

Expected:

```text
mobile public copy contract verified
```

- [ ] **Step 4: Commit**

```bash
git add src/features/community-feed/CommunityComposer.tsx app/create-post.tsx
git commit -m "feat: add community composer and attachment preview"
```

## Task 6: Build Community Internal Switcher

**Files:**

- Create: `src/features/community-feed/CommunityInternalSwitcher.tsx`

- [ ] **Step 1: Add Feed / Communities / Boards / Explore control**

Create:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { COMMUNITY_TABS, type CommunityTabKey } from './communityFeedTypes';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function CommunityInternalSwitcher({
  value,
  onChange,
}: {
  value: CommunityTabKey;
  onChange: (next: CommunityTabKey) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {COMMUNITY_TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.label} community tab`}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(tab.key)}
          >
            <MaterialIcons name={tab.icon as any} size={18} color={active ? '#08080C' : COLORS.muted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  labelActive: {
    color: '#08080C',
  },
});
```

- [ ] **Step 2: Add CommunityBottomDock-style quick controls**

The internal Community controls must also reflect the web mobile `CommunityBottomDock` behavior. Add compact quick actions, either in this switcher or directly below it, for:

- Feed.
- Stories/Moments.
- Map/Nearby where backed by data.
- Create Post.
- Boards/Discussions.

Do not fake a map. If map/nearby data is not backed, show the Nearby Events interstitial or omit the map quick action until it is backed. This internal Community movement is separate from the global dock and must not add or alter global dock tabs.

- [ ] **Step 3: Commit**

```bash
git add src/features/community-feed/CommunityInternalSwitcher.tsx
git commit -m "feat: add community internal switcher"
```

## Task 7: Build Feed Interstitial Modules

**Files:**

- Create: `src/features/community-feed/CommunityFeedInterstitials.tsx`

- [ ] **Step 1: Add interstitial components**

Create `src/features/community-feed/CommunityFeedInterstitials.tsx`:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { CommunityFeedBundle, CommunityInterstitialKind } from './communityFeedTypes';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

type Props = {
  kind: CommunityInterstitialKind;
  bundle: CommunityFeedBundle;
};

function titleFor(kind: CommunityInterstitialKind) {
  if (kind === 'prompt') return 'Community Prompt';
  if (kind === 'live_now') return 'Live Now';
  if (kind === 'who_to_follow') return 'Who To Follow';
  if (kind === 'trending_boards') return 'Trending Boards';
  if (kind === 'nearby_events') return 'Nearby Events';
  return 'Community Radio';
}

function itemsFor(kind: CommunityInterstitialKind, bundle: CommunityFeedBundle) {
  if (kind === 'live_now') return bundle.liveNow;
  if (kind === 'who_to_follow') return bundle.whoToFollow;
  if (kind === 'trending_boards') return bundle.boards.map((board) => ({
    id: board.id,
    title: board.name,
    subtitle: board.description || board.category || 'Board',
    eyebrow: 'Board',
    route: board.route,
    imageUrl: null,
    metric: board.joined ? 'Joined' : null,
    kind: 'board',
  }));
  if (kind === 'nearby_events') return bundle.nearbyEvents;
  if (kind === 'community_radio') return bundle.radio;
  return [bundle.prompt as any];
}

export function CommunityFeedInterstitial({ kind, bundle }: Props) {
  const router = useRouter();
  const items = itemsFor(kind, bundle).slice(0, 8);
  if (kind !== 'prompt' && items.length === 0) return null;

  if (kind === 'prompt') {
    return (
      <Pressable style={styles.prompt} onPress={() => router.push('/create-post' as any)}>
        <MaterialIcons name="campaign" size={22} color={COLORS.orange} />
        <View style={styles.promptCopy}>
          <Text style={styles.title}>Community Prompt</Text>
          <Text style={styles.subtitle}>{bundle.prompt.subtitle}</Text>
        </View>
        <MaterialIcons name="add" size={22} color={COLORS.white} />
      </Pressable>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{titleFor(kind)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <Pressable
            key={`${kind}-${item.id}`}
            style={styles.card}
            onPress={() => {
              if (item.route) router.push(item.route as any);
            }}
          >
            {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.image} resizeMode="cover" /> : <View style={styles.imageFallback}><MaterialIcons name="graphic-eq" size={22} color={COLORS.orange} /></View>}
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.34)',
    backgroundColor: 'rgba(255,90,0,0.10)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptCopy: { flex: 1, minWidth: 0 },
  section: { gap: 10 },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '900', marginHorizontal: 16 },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  rail: { paddingHorizontal: 16, gap: 10 },
  card: { width: 172, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 18, padding: 10, gap: 8 },
  image: { width: '100%', height: 94, borderRadius: 14, backgroundColor: '#1F1F2E' },
  imageFallback: { width: '100%', height: 94, borderRadius: 14, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  cardSubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 15, fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/features/community-feed/CommunityFeedInterstitials.tsx
git commit -m "feat: add community feed interstitial modules"
```

## Task 8: Build CommunityFeedScreen

**Files:**

- Create: `src/features/community-feed/CommunityFeedScreen.tsx`

- [ ] **Step 1: Implement feed-first screen**

Create `src/features/community-feed/CommunityFeedScreen.tsx`:

```tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { CommunityComposer } from './CommunityComposer';
import { CommunityFeedInterstitial } from './CommunityFeedInterstitials';
import { CommunityInternalSwitcher } from './CommunityInternalSwitcher';
import { FEED_FILTERS, type CommunityTabKey, type CommunityFeedFilterKey } from './communityFeedTypes';
import { filterCommunityPosts, loadCommunityFeedBundle } from './communityFeedService';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; hashtag?: string }>();
  const [tab, setTab] = useState<CommunityTabKey>((params.tab as CommunityTabKey) || 'feed');
  const [filter, setFilter] = useState<CommunityFeedFilterKey>((params.filter as CommunityFeedFilterKey) || 'all');

  const query = useQuery({
    queryKey: ['community-feed', 'bundle'],
    queryFn: loadCommunityFeedBundle,
    staleTime: 1000 * 30,
  });

  const posts = useMemo(() => filterCommunityPosts(query.data?.posts ?? [], filter), [query.data?.posts, filter]);

  const header = (
    <View style={{ paddingTop: Math.max(insets.top + 12, 54), paddingBottom: 12 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Community</Text>
          <Text style={styles.heading}>Feed</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search community" style={styles.headerButton} onPress={() => router.push('/search' as any)}>
          <MaterialIcons name="search" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      <CommunityInternalSwitcher value={tab} onChange={setTab} />

      {tab === 'feed' ? (
        <>
          <MobileStoriesRail title="Stories" compact />
          <CommunityComposer />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FEED_FILTERS.map((item) => {
              const active = item.key === filter;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label} feed filter`}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(item.key)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
        {header}
        <View style={styles.center}><ActivityIndicator color={COLORS.orange} /></View>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Community could not load</Text>
          <Text style={styles.emptyBody}>Pull to refresh or try again in a moment.</Text>
          <Pressable style={styles.retry} onPress={() => void query.refetch()}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      </View>
    );
  }

  const bundle = query.data;

  if (tab !== 'feed') {
    const items =
      tab === 'boards'
        ? (bundle?.boards ?? []).map((board) => ({ id: board.id, title: board.name, subtitle: board.description || board.category || 'Board', route: board.route }))
        : tab === 'communities'
          ? (bundle?.communities ?? [])
          : (bundle?.exploreCards ?? []);

    return (
      <View style={styles.screen}>
        <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
          refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
          renderItem={({ item }) => (
            <Pressable style={styles.rowCard} onPress={() => item.route && router.push(item.route as any)}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyBody}>Check Feed for the latest community activity.</Text></View>}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140, gap: 14 }}
        refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item, index }) => (
          <>
            {index === 0 && bundle ? <CommunityFeedInterstitial kind="prompt" bundle={bundle} /> : null}
            {index === 1 && bundle ? <CommunityFeedInterstitial kind="live_now" bundle={bundle} /> : null}
            {index === 2 && bundle ? <CommunityFeedInterstitial kind="who_to_follow" bundle={bundle} /> : null}
            {index === 4 && bundle ? <CommunityFeedInterstitial kind="trending_boards" bundle={bundle} /> : null}
            {index === 6 && bundle ? <CommunityFeedInterstitial kind="nearby_events" bundle={bundle} /> : null}
            {index === 8 && bundle ? <CommunityFeedInterstitial kind="community_radio" bundle={bundle} /> : null}
            <MobileSocialPostCard post={item} onMutated={() => void query.refetch()} />
          </>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Start the first conversation or try another feed filter.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: COLORS.orange, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  heading: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 2 },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  filters: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filterPill: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterPillActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: COLORS.canvas },
  center: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  retry: { marginTop: 8, height: 42, borderRadius: 21, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: COLORS.canvas, fontSize: 13, fontWeight: '900' },
  rowCard: { marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, gap: 5 },
  rowTitle: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  rowSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify story/moment behavior**

The Stories/Moments rail must cover the mobile web behavior:

- Creator avatars are visible.
- Empty state is customer-facing when there are no stories.
- Story/moment items open the existing story/moment viewer route when available.
- Signed-in users get an add-moment path only if the current native story creation flow is backed.
- Signed-out users are prompted to sign in before adding a moment.

- [ ] **Step 3: Confirm interstitial placement**

The feed must not render modules only as separate page rails. Confirm:

- A Community Prompt or equivalent module appears directly after the composer before the first post when data/state allows.
- Live Now or Who To Follow appears after the first post.
- Trending Boards, Nearby Events, and Community Radio are interleaved later in the feed.
- Empty interstitials are skipped quietly when their data is unavailable.

- [ ] **Step 4: Run TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/community-feed/CommunityFeedScreen.tsx
git commit -m "feat: build native community feed screen"
```

## Task 9: Replace Community Route Targets

**Files:**

- Modify: `app/(tabs)/community.tsx`
- Modify: `app/community.tsx`

- [ ] **Step 1: Replace tab route**

Set `app/(tabs)/community.tsx` to:

```tsx
import { CommunityFeedScreen } from '../../src/features/community-feed/CommunityFeedScreen';

export default function CommunityTabRoute() {
  return <CommunityFeedScreen />;
}
```

- [ ] **Step 2: Replace top-level route**

Set `app/community.tsx` to:

```tsx
import { CommunityFeedScreen } from '../src/features/community-feed/CommunityFeedScreen';

export default function CommunityRoute() {
  return <CommunityFeedScreen />;
}
```

- [ ] **Step 3: Run contracts**

```bash
node scripts/verify-mobile-navigation-contract.mjs
node scripts/verify-mobile-community-feed-contract.mjs
node scripts/verify-mobile-social-web-parity-contract.mjs
```

Expected:

```text
mobile navigation contract verified
mobile community feed contract verified
mobile social/community web parity contract verified
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/community.tsx app/community.tsx
git commit -m "feat: route community to feed screen"
```

## Task 10: Add Post Report Action And Hashtag Route Support

**Files:**

- Modify: `src/features/culture/MobileSocialPostCard.tsx`
- Modify: `app/post/[id].tsx`
- Modify: `app/hashtag/[tag].tsx`

- [ ] **Step 1: Route hashtags to hashtag route**

In `MobileSocialPostCard.tsx`, change:

```ts
function routeForTag(tag: string) {
  return { pathname: '/search', params: { q: `#${tag}` } };
}
```

to:

```ts
function routeForTag(tag: string) {
  return `/hashtag/${encodeURIComponent(tag.replace(/^#/, ''))}`;
}
```

- [ ] **Step 2: Add report action**

Import:

```ts
import { reportSocialPost } from './mobileSocial';
```

Add an action button after Share:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Report post"
  style={styles.action}
  onPress={async () => {
    selectionHaptic();
    const result = await reportSocialPost(actionPostId(post));
    Alert.alert(result.success ? 'Report sent' : 'Report unavailable', result.success ? 'Thanks. We will review this post.' : result.error || 'Please try again later.');
  }}
>
  <MaterialIcons name="flag" size={19} color={COLORS.muted} />
</Pressable>
```

- [ ] **Step 3: Replace hashtag route**

Set `app/hashtag/[tag].tsx` to render a real social feed:

```tsx
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';
import { loadMobileSocialFeed } from '../../src/features/culture/mobileSocial';

const COLORS = { canvas: '#08080C', surface: '#12121A', border: '#262637', orange: '#FF5A00', white: '#FFFFFF', muted: '#8E8E9F' };

export default function HashtagRoute() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const insets = useSafeAreaInsets();
  const cleanTag = String(tag || '').replace(/^#/, '').toLowerCase();
  const query = useQuery({
    queryKey: ['community-feed', 'hashtag', cleanTag],
    queryFn: () => loadMobileSocialFeed({ hashtag: cleanTag, mode: 'trending', limit: 40 }),
    enabled: cleanTag.length > 0,
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 20, 58), paddingBottom: insets.bottom + 120, gap: 12 }}
        refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.kicker}>Hashtag</Text><Text style={styles.heading}>#{cleanTag}</Text></View>}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator color={COLORS.orange} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Posts with this hashtag will appear here.</Text></View>}
        renderItem={({ item }) => <MobileSocialPostCard post={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  kicker: { color: COLORS.orange, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  heading: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 2 },
  empty: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
```

- [ ] **Step 4: Keep post detail actions aligned**

In `app/post/[id].tsx`, ensure detail actions invalidate:

```ts
void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
```

Add signed-out guard for comments by checking `useAuth().user` before `commentMutation.mutate()`. Customer-facing alert:

```ts
Alert.alert('Sign in to reply', 'Log in to join the conversation.');
```

- [ ] **Step 5: Verify**

```bash
node scripts/verify-mobile-community-feed-contract.mjs
node scripts/verify-mobile-public-copy-contract.mjs
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/features/culture/MobileSocialPostCard.tsx app/post/[id].tsx app/hashtag/[tag].tsx
git commit -m "feat: add community post report and hashtag feed routes"
```

## Task 11: Wire Content Share/Post Buttons

**Files:**

- Modify: `app/release/[id].tsx`
- Modify: `app/beat/[id].tsx`
- Modify if present: `app/gallery/[id].tsx`
- Modify if present: `app/galleries/[id].tsx`
- Modify: `app/mixes/[id].tsx`
- Modify if present: `app/videos/[id].tsx`
- Modify if present: `app/soundboards/[id].tsx`

- [ ] **Step 1: Release detail post button**

Find the release "Post" or share-to-feed action. It must route to:

```ts
router.push({
  pathname: '/create-post',
  params: {
    attachmentType: 'release',
    releaseId: String(release.id),
    type: 'post',
  },
} as any);
```

- [ ] **Step 2: Beat detail post button**

Find the beat "Post" or share-to-feed action. It must route to:

```ts
router.push({
  pathname: '/create-post',
  params: {
    attachmentType: 'beat',
    beatId: String(beat.id),
    type: 'beat_feedback',
  },
} as any);
```

Do not route beat licensing to `/wallet`.

- [ ] **Step 3: Gallery detail post button**

Find the gallery "Post" or share-to-feed action when a native gallery detail route exists. It must route to:

```ts
router.push({
  pathname: '/create-post',
  params: {
    attachmentType: 'gallery',
    galleryId: String(gallery.id),
    type: 'post',
  },
} as any);
```

If gallery attachment resolution is not backed yet, still route to the composer with params and show an honest customer-facing unavailable state. Do not hide the fact that the post was not attached behind a silent failure.

- [ ] **Step 4: Mix detail post button**

Find the mix "Post" or share-to-feed action. It must route to:

```ts
router.push({
  pathname: '/create-post',
  params: {
    attachmentType: 'mix',
    mixId: String(mix.id),
    type: 'post',
  },
} as any);
```

- [ ] **Step 5: Add missing customer-facing unavailable state**

If a detail route cannot load the content ID, the button should be disabled with copy:

```text
Share after this loads
```

Do not use internal copy such as "backend", "contract", or "unsupported".

- [ ] **Step 6: Verify**

```bash
rg -n "attachmentType: 'release'|attachmentType: 'beat'|attachmentType: 'gallery'|attachmentType: 'mix'" app src
node scripts/verify-mobile-community-feed-contract.mjs
node scripts/verify-mobile-public-copy-contract.mjs
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/release/[id].tsx app/beat/[id].tsx app/gallery/[id].tsx app/galleries/[id].tsx app/mixes/[id].tsx app/videos/[id].tsx app/soundboards/[id].tsx
git commit -m "feat: wire content sharing into community composer"
```

Only include files that changed in the commit command.

## Task 12: Preserve Secondary Community Surfaces

**Files:**

- Modify: `src/features/community-feed/CommunityFeedScreen.tsx`
- Keep: `src/features/parity/AppWideParityScreens.tsx`
- Keep: `src/features/parity/appWideParityServices.ts`
- Keep: `app/community/boards/[slug].tsx`
- Keep: `app/backstage/[id].tsx`

- [ ] **Step 1: Ensure generic parity helpers are secondary only**

Community feed tab must not render `CommunityParityScreen`. Secondary `Explore` inside `CommunityFeedScreen` may use:

```ts
loadCommunityParity()
```

for cards and rails.

- [ ] **Step 2: Boards tab uses real board route cards**

The `Boards` internal tab must route cards to:

```text
/community/boards/[slug]
```

and the existing board detail route must keep `MobileSocialPostCard`.

- [ ] **Step 3: Communities tab uses community/hub cards**

The `Communities` tab may use `bundle.communities`; cards route to `/backstage/[id]` only for public community/hub detail compatibility. Do not show "Backstage" as a primary label.

- [ ] **Step 4: Explore tab uses secondary modules**

Explore may show:

- Community Prompt.
- Live Now.
- Who To Follow.
- Trending Boards.
- Nearby Events.
- Community Radio.
- Creator/community highlights.

It must not become the first view before Feed.

- [ ] **Step 5: Verify**

```bash
node scripts/verify-mobile-community-feed-contract.mjs
node scripts/verify-mobile-social-web-parity-contract.mjs
```

- [ ] **Step 6: Commit**

```bash
git add src/features/community-feed/CommunityFeedScreen.tsx
git commit -m "feat: preserve secondary community explore surfaces"
```

## Task 13: Update Visual QA Scripts And Screenshots

**Files:**

- Modify or create: `scripts/verify-mobile-community-feed-contract.mjs`
- Optional create: `scripts/qa-community-feed-screenshots.mjs` if the repo already uses Playwright/simulator screenshot helpers in this branch.
- Output only: `artifacts/screenshots/community-feed-parity-2026-05-30/`

- [ ] **Step 1: Run contract checks**

```bash
node scripts/verify-mobile-community-feed-contract.mjs
node scripts/verify-mobile-navigation-contract.mjs
node scripts/verify-mobile-social-web-parity-contract.mjs
node scripts/verify-mobile-public-copy-contract.mjs
```

Expected:

```text
mobile community feed contract verified
mobile navigation contract verified
mobile social/community web parity contract verified
mobile public copy contract verified
```

- [ ] **Step 2: Run full local checks**

```bash
npm run verify:mobile
npx tsc --noEmit
npx expo-doctor
```

Expected:

```text
mobile finish verification passed
```

Expo Doctor should remain passing.

- [ ] **Step 3: Run simulator visual pass**

Use the running simulator or launch a clean simulator:

```bash
npx expo run:ios --device "iPhone 17 Pro Max" --no-bundler
```

Inspect:

- Native Community visually matches the mobile web Community product shape, not just a loaded card page.
- Community initial load shows Feed first.
- Stories rail is visible near top.
- Composer or signed-out prompt is visible before feed posts.
- Filters show All, Threads, Media, Reposts, Activity.
- At least one `MobileSocialPostCard` renders when data exists.
- Feed interstitial modules appear between posts, not only as page-end rails.
- A feed module appears after the composer and another after the first post.
- CommunityBottomDock-style internal movement is present without changing the global dock.
- Internal switcher shows Feed, Communities, Boards, Explore.
- No visible Stage, Backstage, MyPLUGGD, Create dock tab, or Profile dock tab.
- Create floating button does not cover feed actions.
- Global dock remains Home / Discover / Community / Events / Market.

- [ ] **Step 4: Smaller iPhone QA**

Run on a smaller simulator such as iPhone Air if available:

```bash
npx expo run:ios --device "iPhone Air" --no-bundler
```

Inspect:

- Dock labels are not cramped.
- Composer and filters do not overlap.
- Create floating action does not cover the selected Community tab.
- Post actions fit within the card width.
- Long post names and hashtags wrap cleanly.

- [ ] **Step 5: Record QA notes**

Create or update a QA doc:

```text
docs/MOBILE_COMMUNITY_FEED_PARITY_QA_2026-05-30.md
```

Include:

- Commit hash tested.
- Simulator devices.
- Signed-out Community results.
- Signed-in Community results.
- Feed filter results.
- Composer/share flow results.
- Post action results.
- Hashtag route result.
- Public-copy scan result.
- Remaining external checks.

- [ ] **Step 6: Commit QA documentation only**

```bash
git add docs/MOBILE_COMMUNITY_FEED_PARITY_QA_2026-05-30.md
git commit -m "docs: record community feed parity QA"
```

Do not commit generated screenshots unless the user explicitly requests them.

## Task 14: Final Regression Guard

**Files:**

- Verify only unless a contract needs a wording correction.

- [ ] **Step 1: Confirm unchanged global shell**

Run:

```bash
node scripts/verify-mobile-navigation-contract.mjs
```

The dock must still be:

```text
Home / Discover / Community / Events / Market
```

- [ ] **Step 2: Confirm unchanged commerce**

Run:

```bash
node scripts/verify-ios-apple-lockfile-contract.mjs
node scripts/verify-mobile-commerce-contract.mjs
node scripts/verify-mobile-wallet-context-contract.mjs
```

Expected:

```text
Apple/IAP contracts remain verified
```

- [ ] **Step 3: Confirm public copy**

Run:

```bash
node scripts/verify-mobile-public-copy-contract.mjs
```

Expected:

```text
mobile public copy contract verified
```

- [ ] **Step 4: Confirm Community feed contract**

Run:

```bash
node scripts/verify-mobile-community-feed-contract.mjs
```

Expected:

```text
mobile community feed contract verified
```

- [ ] **Step 5: Full verification**

Run:

```bash
npm run verify:mobile
```

Expected:

```text
mobile finish verification passed
```

- [ ] **Step 6: Final commit**

```bash
git status --short
git add app src scripts docs
git commit -m "feat: add native community feed parity"
```

Before committing, review `git status --short` and do not stage:

- `artifacts/screenshots/`
- `artifacts/qa/`
- `.env*`
- Apple keys
- App Store Connect private keys
- Supabase service-role keys
- Stripe secret keys
- `node_modules`
- `Pods`
- build output
- provisioning profiles
- certificates

## Acceptance Checklist

- [ ] `app/(tabs)/community.tsx` renders `CommunityFeedScreen`.
- [ ] `app/community.tsx` renders `CommunityFeedScreen`.
- [ ] `CommunityParityScreen` is not the primary Community tab target.
- [ ] Community Feed appears before Events/Market polish work.
- [ ] Stories/Moments rail is visible at top of Community Feed.
- [ ] Stories/Moments rail shows creator avatars.
- [ ] Story/moment items can open the current viewer route when backed.
- [ ] Stories/Moments empty state is customer-facing.
- [ ] Signed-in add-moment path appears only when backed.
- [ ] Signed-in users see a compact post composer.
- [ ] Signed-out users see a sign-in prompt for composing and interactions.
- [ ] Composer submit flow navigates to the created post or back to refreshed Community feed.
- [ ] Feed filters exist: All, Threads, Media, Reposts, Activity.
- [ ] Feed uses For You/social feed logic, not only generic card mappers.
- [ ] Social feed uses real posts from current social tables/RPCs.
- [ ] Social post cards include like, comment, repost, bookmark, share, report.
- [ ] Quote posts remain visible and actionable.
- [ ] Poll posts remain voteable.
- [ ] Media posts render images/video/audio/link previews honestly.
- [ ] Post detail route works.
- [ ] Comments load and can be added by signed-in users.
- [ ] Hashtag route works from tapped hashtags.
- [ ] Pull-to-refresh works.
- [ ] Feed query invalidation works after post, comment, like, bookmark, repost, poll vote, and report actions.
- [ ] Realtime feed updates are used only if already safely backed; otherwise the product uses refresh/refetch honestly.
- [ ] Loading, empty, and error states are customer-facing and honest.
- [ ] Interstitial modules appear inside feed flow:
  - Community Prompt
  - Live Now
  - Who To Follow
  - Trending Boards
  - Nearby Events
  - Community Radio when data exists
- [ ] The first interstitial appears after the composer and another appears after the first post.
- [ ] Internal Community switcher exists:
  - Feed
  - Communities
  - Boards
  - Explore
- [ ] CommunityBottomDock-style quick controls exist for Stories/Moments, Create Post, and Boards/Discussions.
- [ ] Map/Nearby quick control appears only when backed; no fake map is shown.
- [ ] Generic parity helpers are limited to secondary Community Explore/Boards/Hub cards.
- [ ] Release detail can open composer with attached release card.
- [ ] Beat detail can open composer with attached beat card.
- [ ] Beat licensing still does not route to wallet.
- [ ] Gallery detail can open composer with attached gallery card when backed, or shows an honest unavailable state.
- [ ] Mix detail can open composer with attached mix card.
- [ ] Composer posts attachment as `linkPreview`.
- [ ] No public internal implementation copy appears.
- [ ] Home remains front door/editorial, not dense social feed.
- [ ] Discover remains search/discovery, not dense social feed.
- [ ] Events remains first-class event surface.
- [ ] Market remains App Review-safe commerce/market surface.
- [ ] Global dock remains Home / Discover / Community / Events / Market.
- [ ] Create remains floating action sheet.
- [ ] Account remains avatar sheet.
- [ ] `/live` remains route/deep link and not dock tab.
- [ ] Apple/IAP/payment architecture remains untouched.

## External Checks Not Covered By This Plan

These remain outside this code checkpoint:

- Apple sandbox IAP purchases for all five credit packs.
- Apple subscription sandbox purchase and restore.
- TestFlight install.
- Real-device QA.
- App Store Connect IAP metadata/status.
- Privacy labels.
- Final App Review metadata and submission notes.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-mobile-community-feed-parity.md`.

Recommended execution:

1. Subagent-Driven: one worker for contracts, one for services, one for UI components, one for routes/share flows, one for QA docs.
2. Inline Execution: execute tasks in order with a checkpoint commit after each task group.

Do not start broader Events/Market/Profile polish until this Community feed parity checkpoint is passing.
