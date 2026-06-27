import { supabase } from '../../lib/supabase';
import {
  formatCompact,
  formatDate,
  formatGBP,
  loadFeedBundle,
  priceForRelease,
  type BeatItem,
  type EventItem,
  type MixItem,
  type SocialPostItem,
  type ReleaseItem,
  type SamplePackItem,
  type SoundboardItem,
} from '../../lib/mobileContent';
import { getCurrentUserId, safeList, safeMaybe } from '../culture/mobileServices';

export type ParityCard = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  route?: string | null;
  imageUrl?: string | null;
  metric?: string | null;
  kind: string;
};

export type ParitySection = {
  id: string;
  title: string;
  subtitle?: string;
  emptyText?: string;
  items: ParityCard[];
};

export type ParityAction = {
  id: string;
  label: string;
  route?: string;
  unavailableReason?: string;
};

export type ParityPayload = {
  title: string;
  kicker: string;
  summary: string;
  hero?: ParityCard | null;
  sections: ParitySection[];
  actions?: ParityAction[];
};

type HubRow = {
  id: string;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  hero_image_url?: string | null;
  avatar_url?: string | null;
  member_count?: number | null;
  visibility?: string | null;
  status?: string | null;
  hub_type?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type MapSignalRow = {
  id: string;
  title?: string | null;
  message?: string | null;
  signal_type?: string | null;
  city?: string | null;
  country?: string | null;
  strength?: number | null;
  like_count?: number | null;
  view_count?: number | null;
  is_promoted?: boolean | null;
  created_at?: string | null;
};

type StoreProductRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  price_cents?: number | null;
  price?: number | null;
  kind?: string | null;
  product_type?: string | null;
  slug?: string | null;
};

type ConnectProfileRow = {
  id: string;
  user_id?: string | null;
  slug?: string | null;
  display_name?: string | null;
  headline?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  location?: string | null;
  public_email?: string | null;
  public_phone?: string | null;
  website_url?: string | null;
  updated_at?: string | null;
};

type StudioStats = {
  catalogCount: number;
  liveCount: number;
  eventCount: number;
  audienceCount: number;
};

type LiveRoomRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  description?: string | null;
  category?: string | null;
  viewer_count?: number | null;
  agora_live_started_at?: string | null;
  scheduled_for?: string | null;
  thumbnail_url?: string | null;
  creator_avatar_url?: string | null;
};

type CommunityFeatureRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  text?: string | null;
  description?: string | null;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  cover_url?: string | null;
  featured_image_url?: string | null;
  image_url?: string | null;
  slug?: string | null;
  status?: string | null;
  ends_at?: string | null;
  end_date?: string | null;
  is_published?: boolean | null;
  created_at?: string | null;
};

function compactPrice(value?: number | null, cents = false) {
  if (value == null) return null;
  return formatGBP(value, { cents });
}

function routeForSoundboard(item: SoundboardItem) {
  return `/soundboards/${item.slug || item.id}`;
}

function releaseCard(item: ReleaseItem): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Untitled release',
    subtitle: item.artist || item.genre || 'PLUGGD release',
    eyebrow: 'Release',
    route: `/release/${item.id}`,
    imageUrl: item.cover_art_url,
    metric: compactPrice(priceForRelease(item)),
    kind: 'release',
  };
}

function beatCard(item: BeatItem): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Untitled beat',
    subtitle: [item.producer_name, item.bpm ? `${item.bpm} BPM` : null, item.key].filter(Boolean).join(' · ') || 'Producer drop',
    eyebrow: 'Beat',
    route: `/beat/${item.id}`,
    imageUrl: item.image_url,
    metric: compactPrice(item.price),
    kind: 'beat',
  };
}

function samplePackCard(item: SamplePackItem): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Untitled sample pack',
    subtitle: [item.genre, item.sample_count ? `${formatCompact(item.sample_count)} samples` : null].filter(Boolean).join(' · ') || 'Sample pack',
    eyebrow: 'Samples',
    route: `/sample-pack/${item.id}`,
    imageUrl: item.cover_art_url,
    metric: compactPrice(item.price),
    kind: 'sample_pack',
  };
}

function mixCard(item: MixItem): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Untitled mix',
    subtitle: [item.city, item.genre_tags?.[0], item.event_name].filter(Boolean).join(' · ') || 'DJ mix',
    eyebrow: 'Mix',
    route: `/mixes/${item.slug || item.id}`,
    imageUrl: item.cover_url,
    metric: item.play_count ? `${formatCompact(item.play_count)} plays` : null,
    kind: 'mix',
  };
}

function eventCard(item: EventItem): ParityCard {
  const liveLinked = Boolean(item.stream_url || item.playback_url);
  return {
    id: item.id,
    title: item.title || 'Untitled event',
    subtitle: [formatDate(item.starts_at), item.location, liveLinked ? 'Live-linked' : null].filter(Boolean).join(' · ') || 'Event',
    eyebrow: liveLinked ? 'Live-linked event' : 'Event',
    route: `/events/${item.id}`,
    imageUrl: item.cover_image_url,
    metric: item.price_cents
      ? formatGBP(item.price_cents, { cents: true })
      : item.rsvp_count
        ? `${formatCompact(item.rsvp_count)} RSVPs`
        : 'RSVP',
    kind: 'event',
  };
}

function soundboardCard(item: SoundboardItem): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Untitled soundboard',
    subtitle: item.description || `${formatCompact(item.item_count)} items`,
    eyebrow: 'Soundboard',
    route: routeForSoundboard(item),
    imageUrl: item.cover_image_url,
    metric: item.follower_count ? `${formatCompact(item.follower_count)} followers` : null,
    kind: 'soundboard',
  };
}

function liveRoomCard(item: LiveRoomRow): ParityCard {
  return {
    id: item.id,
    title: item.title || 'Live room',
    subtitle: item.description || item.category || (item.status === 'live' ? 'Live now' : 'Scheduled live room'),
    eyebrow: item.status === 'live' ? 'Live now' : 'Live',
    route: `/live/session?roomId=${item.id}`,
    imageUrl: item.thumbnail_url || item.creator_avatar_url,
    metric: item.viewer_count ? `${formatCompact(item.viewer_count)} tuned in` : item.status || null,
    kind: 'live',
  };
}

function socialPostCard(item: SocialPostItem): ParityCard {
  const imageUrl = Array.isArray(item.images) ? item.images[0] : item.media_paths?.[0];
  return {
    id: item.id,
    title: item.title || item.content || item.body || 'Community post',
    subtitle: item.body || item.content || item.post_type || 'Community signal',
    eyebrow: item.post_type ? item.post_type.replace(/_/g, ' ') : 'Post',
    route: `/post/${item.id}`,
    imageUrl,
    metric: item.comments_count ? `${formatCompact(item.comments_count)} comments` : item.likes_count ? `${formatCompact(item.likes_count)} likes` : null,
    kind: 'post',
  };
}

function profileCard(profile: { id?: string | null; user_id?: string | null; username?: string | null; full_name?: string | null; display_name?: string | null; avatar_url?: string | null; primary_genre?: string | null; city?: string | null; profile_type?: string | null; user_type?: string | null; is_verified?: boolean | null }): ParityCard {
  return {
    id: profile.user_id || profile.id || profile.username || profile.full_name || 'profile',
    title: profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator',
    subtitle: profile.primary_genre || profile.city || profile.profile_type || profile.user_type || 'Creator',
    eyebrow: profile.is_verified ? 'Verified creator' : 'Creator',
    route: profile.username ? `/creator/${profile.username}` : profile.user_id ? `/user/${profile.user_id}` : '/search',
    imageUrl: profile.avatar_url,
    kind: 'profile',
  };
}

function hubCard(item: HubRow): ParityCard {
  const title = item.title || item.name || 'PLUGGD hub';
  return {
    id: item.id,
    title,
    subtitle: item.description || item.subtitle || item.hub_type || item.visibility || 'Culture hub',
    eyebrow: item.status === 'draft' ? 'Draft hub' : 'Hub',
    route: `/hubs/${item.slug || item.id}`,
    imageUrl: item.cover_image_url || item.hero_image_url || item.avatar_url,
    metric: item.member_count ? `${formatCompact(item.member_count)} members` : null,
    kind: 'hub',
  };
}

function storeCard(item: StoreProductRow): ParityCard {
  const price = item.price_cents != null ? formatGBP(item.price_cents, { cents: true }) : compactPrice(item.price);
  return {
    id: item.id,
    title: item.title || item.name || 'Store item',
    subtitle: item.description || item.kind || item.product_type || 'PLUGGD store',
    eyebrow: item.product_type || item.kind || 'Store',
    route: `/product/${item.id}`,
    imageUrl: item.image_url || item.cover_image_url,
    metric: price,
    kind: 'store',
  };
}

function staticCard(
  id: string,
  title: string,
  subtitle: string,
  eyebrow: string,
  route?: string | null,
  metric?: string | null,
): ParityCard {
  return {
    id,
    title,
    subtitle,
    eyebrow,
    route,
    metric,
    kind: 'static',
  };
}

function cityFromLocation(location?: string | null) {
  return location?.split(',').map((part) => part.trim()).filter(Boolean)[0] || null;
}

function mapSignalCard(item: MapSignalRow): ParityCard {
  return {
    id: item.id,
    title: item.title || item.message || 'Map Signal',
    subtitle: [item.city, item.country, item.signal_type].filter(Boolean).join(' · ') || 'PLUGGD Maps',
    eyebrow: item.is_promoted ? 'Promoted Signal' : 'Signal',
    route: '/maps',
    metric: item.like_count ? `${formatCompact(item.like_count)} likes` : item.view_count ? `${formatCompact(item.view_count)} views` : null,
    kind: 'map_signal',
  };
}

function communityFeatureCard(item: CommunityFeatureRow, kind: string, route: string | null = null): ParityCard {
  const title = item.title || item.name || item.text || `${kind} on PLUGGD`;
  return {
    id: item.id,
    title,
    subtitle: item.description || item.excerpt || item.content || item.status || kind,
    eyebrow: kind,
    route,
    imageUrl: item.cover_image_url || item.cover_url || item.featured_image_url || item.image_url,
    metric: item.ends_at || item.end_date ? `Ends ${formatDate(item.ends_at || item.end_date || '')}` : null,
    kind: kind.toLowerCase().replace(/\s+/g, '_'),
  };
}

async function loadStoreProducts(limit = 12) {
  const [storeProducts, creatorMerchandise] = await Promise.all([
    safeList<StoreProductRow>(
      (supabase as any)
        .from('store_products')
        .select('id,title,description,image_url,price,product_type')
        .limit(limit),
    ),
    safeList<StoreProductRow>(
      (supabase as any)
        .from('creator_merchandise')
        .select('id,title,description,image_url,price,product_type,status')
        .limit(limit),
    ),
  ]);

  return [...storeProducts, ...creatorMerchandise].slice(0, limit);
}

export async function loadDiscoverParity(): Promise<ParityPayload> {
  const [bundle, trendingTags, liveRooms] = await Promise.all([
    loadFeedBundle(14),
    safeList<{ tag?: string | null; hashtag?: string | null; post_count?: number | null }>(
      (supabase as any)
        .from('social_trending_hashtags')
        .select('tag,post_count')
        .limit(8),
    ),
    safeList<LiveRoomRow>(
      (supabase as any)
        .from('session_rooms')
        .select('id,title,status,description,agora_live_started_at,created_at,host_id,is_public')
        .in('status', ['live', 'idle', 'scheduled'])
        .limit(8),
    ),
  ]);
  const mixed = [
    ...bundle.releases.map(releaseCard),
    ...bundle.beats.map(beatCard),
    ...bundle.mixes.map(mixCard),
    ...bundle.events.map(eventCard),
    ...bundle.soundboards.map(soundboardCard),
    ...liveRooms.map(liveRoomCard),
  ].slice(0, 14);

  return {
    title: "Find what's moving now",
    kicker: 'Discover',
    summary: 'Search new drops, BeatPlug picks, creators, events, soundboards, mixes, and live moments moving through PLUGGD.',
    hero: mixed[0] || null,
    actions: [
      { id: 'search', label: 'Search', route: '/search' },
      { id: 'live', label: 'Live rooms', route: '/live' },
    ],
    sections: [
      { id: 'moving-now', title: 'Featured now', subtitle: 'Fresh drops, BeatPlug picks, mixes, events, live rooms, and soundboards.', items: mixed, emptyText: 'Fresh picks will appear here soon.' },
      { id: 'music', title: 'Music', subtitle: 'New and notable releases from the live mobile feed.', items: bundle.releases.map(releaseCard), emptyText: 'No releases are available yet.' },
      { id: 'beatplug', title: 'BeatPlug', subtitle: 'Producer-ready beats and license previews.', items: bundle.beats.map(beatCard), emptyText: 'No published beats are available yet.' },
      { id: 'mixes', title: 'Mixes', subtitle: 'DJ culture, radio cuts, and event-linked audio.', items: bundle.mixes.map(mixCard), emptyText: 'No mixes are available yet.' },
      { id: 'live', title: 'Events / Live', items: [...bundle.events.map(eventCard), ...liveRooms.map(liveRoomCard)], emptyText: 'No event or live room signals are active.' },
      { id: 'trending-scenes', title: 'Trending scenes', items: trendingTags.map((tag) => {
        const value = (tag.tag || tag.hashtag || '').replace(/^#/, '');
        return {
          id: value || 'hashtag',
          title: `#${value || 'pluggd'}`,
          subtitle: 'Community thread',
          eyebrow: 'Hashtag',
          route: `/hashtag/${encodeURIComponent(value || 'pluggd')}`,
          metric: tag.post_count ? `${formatCompact(tag.post_count)} posts` : null,
          kind: 'hashtag',
        };
      }), emptyText: 'Trending scenes are not available yet.' },
      { id: 'creators', title: 'Creators', items: bundle.profiles.slice(0, 10).map(profileCard), emptyText: 'Creators will appear here when profiles are public.' },
      { id: 'soundboards', title: 'Soundboards worth opening', items: bundle.soundboards.map(soundboardCard), emptyText: 'No soundboards are available yet.' },
      { id: 'community-pulse', title: 'Community pulse', items: bundle.posts.filter((post) => !post.is_deleted).slice(0, 8).map(socialPostCard), emptyText: 'Community signals will appear here soon.' },
    ],
  };
}

export async function loadCommunityParity(): Promise<ParityPayload> {
  const [bundle, hubs, contests, campaigns, blogPosts, prompts] = await Promise.all([
    loadFeedBundle(18),
    safeList<HubRow>(
      (supabase as any)
        .from('hubs')
        .select('id,slug,title,subtitle,description,hero_image_url,status,hub_type,created_by,created_at,updated_at')
        .eq('status', 'published')
        .limit(12),
    ),
    safeList<CommunityFeatureRow>(
      (supabase as any)
        .from('contests')
        .select('id,title,description,cover_image_url,status,end_date,created_at')
        .limit(8),
    ),
    Promise.resolve([] as CommunityFeatureRow[]),
    safeList<CommunityFeatureRow>(
      (supabase as any)
        .from('blog_posts')
        .select('id,title,excerpt,content,featured_image_url,is_published,created_at')
        .eq('is_published', true)
        .limit(8),
    ),
    Promise.resolve([] as CommunityFeatureRow[]),
  ]);
  const posts = bundle.posts.filter((post) => !post.is_deleted).map(socialPostCard);
  const storyPosts = bundle.posts
    .filter((post) => !post.is_deleted && ((Array.isArray(post.images) && post.images.length > 0) || Boolean(post.video)))
    .map(socialPostCard);

  return {
    title: 'Community',
    kicker: 'Culture hub',
    summary: 'Follow the conversations, moments, rooms, boards, events, and creators shaping the PLUGGD scene.',
    hero: posts[0] || hubs.map(hubCard)[0] || bundle.profiles.map(profileCard)[0] || null,
    actions: [
      { id: 'post', label: 'Create post', route: '/create-post' },
      { id: 'directory', label: 'Directory', route: '/search' },
    ],
    sections: [
      { id: 'stories', title: 'Stories and moments', subtitle: 'Photos, clips, and updates from the scene.', items: storyPosts, emptyText: 'Stories will appear here soon.' },
      { id: 'prompt', title: 'Community prompt', items: prompts.map((prompt) => communityFeatureCard(prompt, 'Prompt', '/create-post')), emptyText: 'No community prompt is active yet.' },
      { id: 'feed', title: 'Feed', subtitle: 'Fresh posts and culture signals from PLUGGD.', items: posts, emptyText: 'Community posts will appear here soon.' },
      { id: 'hubs', title: 'Boards and hubs', subtitle: 'Public spaces around scenes, events, and creators.', items: hubs.map(hubCard), emptyText: 'No public hubs are available yet.' },
      { id: 'events', title: 'Live now and nearby events', items: bundle.events.map(eventCard), emptyText: 'No community events are published.' },
      { id: 'contests', title: 'Contests', items: contests.map((contest) => communityFeatureCard(contest, 'Contest', `/contests/${contest.id}`)), emptyText: 'No active contests are available.' },
      { id: 'crowdfund', title: 'Crowdfund', items: campaigns.map((campaign) => communityFeatureCard(campaign, 'Crowdfund', null)), emptyText: 'Campaigns will appear here when they are live.' },
      { id: 'the-plug', title: 'From THE PLUG', items: blogPosts.map((post) => communityFeatureCard(post, 'THE PLUG', null)), emptyText: 'Editorial stories will appear here soon.' },
      { id: 'radio', title: 'Community radio', items: bundle.mixes.slice(0, 6).map((mix) => ({ ...mixCard(mix), eyebrow: 'Community radio' })), emptyText: 'Community radio will appear when published mixes are available.' },
      { id: 'creators', title: 'Who to follow', items: bundle.profiles.map(profileCard), emptyText: 'Creators will appear when public profiles are available.' },
      { id: 'soundboards', title: 'Community soundboards', items: bundle.soundboards.map(soundboardCard), emptyText: 'No public soundboards are active.' },
    ],
  };
}

export async function loadMarketParity(section?: string | string[] | null): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(18);
  const storeProducts = await loadStoreProducts(12);

  return {
    title: 'Creator economy market',
    kicker: 'BeatPlug marketplace',
    summary: 'Buy, license, collect, and book across the creator economy, starting with BeatPlug.',
    hero: bundle.beats[0] ? beatCard(bundle.beats[0]) : bundle.samplePacks[0] ? samplePackCard(bundle.samplePacks[0]) : null,
    actions: [
      { id: 'beatplug', label: 'Open BeatPlug', route: '/market/beatplug' },
      { id: 'releases', label: 'Browse releases', route: '/releases' },
    ],
    sections: [
      { id: 'beatplug', title: 'BeatPlug flagship', subtitle: 'Preview beats and review license options from producers.', items: bundle.beats.map(beatCard), emptyText: 'No published beats are available.' },
      { id: 'browse-market', title: 'Browse market', subtitle: 'The main market areas in the same order as the web hub.', items: [
        staticCard('browse-releases', 'Releases', 'Albums, singles, mixtapes, and creator drops.', 'Market', '/releases'),
        staticCard('browse-samples', 'Sample Packs', 'Loops, drums, stems, and producer packs.', 'Market', '/sample-packs'),
        staticCard('browse-merch', 'Merch', 'Approved creator merchandise and physical drops.', 'Market', '/market/merch'),
        staticCard('browse-services', 'Services', 'Creator services will appear when enabled.', 'Coming soon', null),
        staticCard('browse-licenses', 'Licenses', 'Review beat license previews before opening a beat.', 'Market', '/market/licenses'),
        staticCard('browse-offers', 'Creator Offers', 'Creator offers will appear when published.', 'Coming soon', null),
      ] },
      { id: 'releases', title: 'Releases', items: bundle.releases.map(releaseCard), emptyText: 'No releases are available.' },
      { id: 'samples', title: 'Sample packs', items: bundle.samplePacks.map(samplePackCard), emptyText: 'No sample packs are available.' },
      { id: 'merch', title: 'Merch', items: storeProducts.map(storeCard), emptyText: 'Creator merch will appear when approved products exist.' },
      { id: 'licenses', title: 'Licenses', items: bundle.beats.slice(0, 8).map((item) => ({ ...beatCard(item), eyebrow: 'License preview' })), emptyText: 'Beat licensing previews will appear when published beats exist.' },
      { id: 'offers', title: 'Creator Offers', items: [], emptyText: 'Creator offers will appear here soon.' },
      { id: 'trust', title: 'Market trust', items: [
        staticCard('off-app-safe', 'Off-app safe licensing', 'Keep beat licensing clear without introducing Apple credit wallet routes.', 'Policy'),
        staticCard('creator-safe', 'Creator-owned storefronts', 'Product details stay tied to creator catalog and approved store data.', 'Trust'),
        staticCard('studio-ready', 'Studio tools', 'Upload and manage catalog from Studio when creator access is available.', 'Studio', '/studio'),
      ] },
    ],
  };
}

export async function loadReleasesParity(): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(24);
  const releases = bundle.releases.map(releaseCard);
  return {
    title: 'Releases',
    kicker: 'Drop marketplace',
    summary: 'New, notable, trending, and community-backed PLUGGD releases.',
    hero: releases[0] || null,
    sections: [
      { id: 'featured', title: 'Featured drop', items: releases.slice(0, 1), emptyText: 'No featured release is available.' },
      { id: 'new', title: 'New and notable', items: releases.slice(0, 12), emptyText: 'No releases are available.' },
      { id: 'community', title: 'Community-backed drops', items: releases.slice(4, 16), emptyText: 'Community-backed release signals are not available yet.' },
    ],
  };
}

export async function loadMixesParity(): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(24);
  const mixes = bundle.mixes.map(mixCard);
  return {
    title: 'Mixes',
    kicker: 'DJ culture',
    summary: 'Published mixes, live recordings, and event-linked audio from PLUGGD DJs.',
    hero: mixes[0] || null,
    sections: [
      { id: 'latest', title: 'Latest mixes', items: mixes, emptyText: 'No published mixes are available.' },
    ],
  };
}

export async function loadSoundboardsParity(): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(24);
  const soundboards = bundle.soundboards.map(soundboardCard);
  return {
    title: 'Soundboards',
    kicker: 'Living boards',
    summary: 'Audio, notes, images, polls, links, and community context from public PLUGGD soundboards.',
    hero: soundboards[0] || null,
    sections: [
      { id: 'active', title: 'Active soundboards', items: soundboards, emptyText: 'No public soundboards are available.' },
    ],
  };
}

export async function loadSamplePacksParity(): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(24);
  const packs = bundle.samplePacks.map(samplePackCard);
  return {
    title: 'Sample packs',
    kicker: 'Producer tools',
    summary: 'Browse producer sample packs, save favourites, and open available pack details.',
    hero: packs[0] || null,
    sections: [
      { id: 'packs', title: 'Available packs', items: packs, emptyText: 'No sample packs are available.' },
    ],
  };
}

export async function loadEventsParity(): Promise<ParityPayload> {
  const bundle = await loadFeedBundle(30);
  const nowIso = new Date().toISOString();
  const events = await safeList<EventItem>(
    (supabase as any)
      .from('events')
      .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(30),
  );
  const cityCounts = new Map<string, number>();
  for (const event of events) {
    const city = cityFromLocation(event.location);
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const hotCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => staticCard(`city-${city}`, city, `${formatCompact(count)} upcoming event${count === 1 ? '' : 's'}`, 'Hot city', '/events'));

  return {
    title: 'Events',
    kicker: 'Ticket culture',
    summary: 'Upcoming PLUGGD events, live-linked nights, RSVP context, tickets, and Community discussion entry points.',
    hero: events[0] ? eventCard(events[0]) : null,
    actions: [
      { id: 'browse', label: 'Browse', route: '/events' },
      { id: 'map', label: 'Map', route: '/maps' },
      { id: 'discussion', label: 'Discussion', route: '/community' },
    ],
    sections: [
      { id: 'upcoming', title: 'Upcoming', subtitle: 'Date, location, RSVP, ticket, and live-linked event rows.', items: events.map(eventCard), emptyText: 'No upcoming events are published.' },
      { id: 'flavour', title: 'Flavour chips', subtitle: 'Quick ways into the live event board.', items: [
        staticCard('all-events', 'All events', 'Browse the mobile event list.', 'Filter', '/events'),
        staticCard('tonight', 'Tonight', 'Find near-term live-linked nights.', 'Filter', '/events'),
        staticCard('afrobeats', 'Afrobeats', 'Scene-led events and parties.', 'Filter', '/events'),
        staticCard('producer-nights', 'Producer nights', 'Sessions, beat battles, and studio events.', 'Filter', '/events'),
        staticCard('community', 'Community', 'Events with active discussion signals.', 'Filter', '/community'),
      ] },
      { id: 'hot-cities', title: 'Hot cities', items: hotCities, emptyText: 'City filters will appear when events have locations.' },
      { id: 'event-board', title: 'Event board', items: bundle.events.map(eventCard), emptyText: 'No event signals are available.' },
      { id: 'spotlight', title: 'Spotlight', items: events.slice(0, 4).map(eventCard), emptyText: 'Event spotlights will appear when events are published.' },
      { id: 'opportunities', title: 'Opportunities', items: [
        staticCard('promoters', 'Promoter tools', 'Promoter and venue opportunities will appear when enabled.', 'Coming soon'),
        staticCard('live-linked', 'Live-linked events', 'Use live sessions and Community posts around published events.', 'Live', '/live'),
        staticCard('my-tickets', 'My tickets', 'Open saved tickets and RSVPs.', 'Tickets', '/tickets'),
      ] },
    ],
  };
}

export async function loadHubsParity(slug?: string | string[] | null): Promise<ParityPayload> {
  const targetSlug = Array.isArray(slug) ? slug[0] : slug;
  const hubs = await safeList<HubRow>(
    (supabase as any)
      .from('hubs')
      .select('id,slug,title,subtitle,description,hero_image_url,status,hub_type,created_by,created_at,updated_at')
      .eq('status', 'published')
      .limit(24),
  );
  const selected = targetSlug ? hubs.find((hub) => hub.slug === targetSlug || hub.id === targetSlug) : null;
  const cards = hubs.map(hubCard);

  return {
    title: selected?.title || selected?.name || (targetSlug ? 'Hub' : 'Hubs'),
    kicker: selected ? 'Culture hub' : 'Public hubs',
    summary: selected?.description || 'Browse public hubs for scenes, events, partners, creators, and active community threads.',
    hero: selected ? hubCard(selected) : cards[0] || null,
    sections: [
      { id: 'hubs', title: selected ? 'More hubs' : 'Browse hubs', items: selected ? cards.filter((card) => card.id !== selected.id) : cards, emptyText: 'No public hubs are available.' },
    ],
    actions: selected ? [{ id: 'backstage', label: 'Open Community', route: `/backstage/${selected.slug || selected.id}` }] : undefined,
  };
}

export async function loadMapSignalsParity(): Promise<ParityPayload> {
  const signals = await safeList<MapSignalRow>(
    (supabase as any)
      .from('map_signals')
      .select('id,title,message,signal_type,city,country,strength,like_count,view_count,is_promoted,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  );
  const cards = signals.map(mapSignalCard);
  return {
    title: 'Maps',
    kicker: 'PLUGGD Signals',
    summary: 'See the latest Map Signals from PLUGGD cities and scenes.',
    hero: cards[0] || null,
    sections: [
      { id: 'signals', title: 'Latest signals', items: cards, emptyText: 'No Map Signals are available.' },
    ],
  };
}

export async function loadHashtagParity(tag?: string | string[] | null): Promise<ParityPayload> {
  const value = (Array.isArray(tag) ? tag[0] : tag || '').replace(/^#/, '');
  const posts = await safeList<any>(
    (supabase as any)
      .from('social_posts')
      .select('id,title,content,post_type,images,video,audio,likes_count,comments_count,created_at')
      .ilike('content', `%#${value}%`)
      .order('created_at', { ascending: false })
      .limit(30),
  );

  return {
    title: `#${value || 'pluggd'}`,
    kicker: 'Hashtag feed',
    summary: 'Posts, clips, and conversations using this hashtag.',
    hero: posts[0] ? {
      id: posts[0].id,
      title: posts[0].title || posts[0].content || `#${value}`,
      subtitle: posts[0].post_type || 'Post',
      eyebrow: 'Post',
      route: `/post/${posts[0].id}`,
      imageUrl: Array.isArray(posts[0].images) ? posts[0].images[0] : null,
      metric: posts[0].comments_count ? `${formatCompact(posts[0].comments_count)} comments` : null,
      kind: 'post',
    } : null,
    sections: [
      { id: 'posts', title: 'Posts', items: posts.map((post) => ({
        id: post.id,
        title: post.title || post.content || `#${value}`,
        subtitle: post.post_type || 'Post',
        eyebrow: 'Post',
        route: `/post/${post.id}`,
        imageUrl: Array.isArray(post.images) ? post.images[0] : null,
        metric: post.likes_count ? `${formatCompact(post.likes_count)} likes` : null,
        kind: 'post',
      })), emptyText: 'No posts are using this hashtag yet.' },
    ],
  };
}

export async function loadConnectCardParity(slug?: string | string[] | null): Promise<ParityPayload> {
  const targetSlug = Array.isArray(slug) ? slug[0] : slug;
  const profile = targetSlug
    ? await safeMaybe<ConnectProfileRow>(
        (supabase as any)
          .from('connect_profiles')
          .select('id,user_id,slug,display_name,headline,avatar_url,cover_image_url,location,public_email,public_phone,website_url,updated_at')
          .eq('slug', targetSlug)
          .maybeSingle(),
      )
    : null;

  return {
    title: profile?.display_name || 'Connect Card',
    kicker: 'Public card',
    summary: profile?.headline || 'Public profile, contact details, links, and collaboration context.',
    hero: profile ? {
      id: profile.id,
      title: profile.display_name || 'Connect Card',
      subtitle: [profile.headline, profile.location].filter(Boolean).join(' · ') || 'PLUGGD contact',
      eyebrow: 'Connect',
      imageUrl: profile.avatar_url || profile.cover_image_url,
      kind: 'connect',
    } : null,
    sections: [
      { id: 'public', title: 'Public details', items: profile ? [
        {
          id: 'contact',
          title: profile.public_email || profile.website_url || 'Public contact',
          subtitle: profile.public_phone || 'Private contact details are shared by invitation only.',
          eyebrow: 'Contact',
          kind: 'connect_detail',
        },
      ] : [], emptyText: 'This Connect Card is unavailable or private.' },
    ],
  };
}

async function loadStudioStats(userId: string): Promise<StudioStats> {
  const [releases, beats, mixes, events, lives, followers] = await Promise.all([
    safeList<{ id: string }>((supabase as any).from('releases').select('id').eq('user_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('beats').select('id').eq('user_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('mixes').select('id').eq('creator_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('events').select('id').eq('created_by', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('session_rooms').select('id').eq('creator_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('user_follows').select('id').eq('following_id', userId).limit(1000)),
  ]);

  return {
    catalogCount: releases.length + beats.length + mixes.length,
    eventCount: events.length,
    liveCount: lives.length,
    audienceCount: followers.length,
  };
}

export async function loadStudioParity(): Promise<ParityPayload> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      title: 'Studio',
      kicker: 'Creator workspace',
      summary: 'Sign in with a creator account to open Studio.',
      sections: [],
      actions: [{ id: 'login', label: 'Sign in', route: '/auth/login' }],
    };
  }

  const stats = await loadStudioStats(userId);
  return {
    title: 'Studio',
    kicker: 'Creator command',
    summary: 'Track creator health, apps, action shortcuts, analytics, identity, and next steps from mobile.',
    hero: {
      id: 'health',
      title: stats.catalogCount > 0 ? 'Studio is active' : 'Set up your Studio',
      subtitle: `${formatCompact(stats.catalogCount)} catalog items · ${formatCompact(stats.audienceCount)} audience`,
      eyebrow: 'Creator Command',
      metric: stats.liveCount ? `${formatCompact(stats.liveCount)} live rooms` : 'Ready',
      kind: 'studio',
    },
    actions: [
      { id: 'apps', label: 'Apps', route: '/studio/apps' },
      { id: 'go-live', label: 'Go Live', route: '/live/create' },
      { id: 'events', label: 'Events', route: '/creator/events' },
    ],
    sections: [
      {
        id: 'kpis',
        title: 'Studio Pulse',
        items: [
          { id: 'catalog', title: formatCompact(stats.catalogCount), subtitle: 'Catalog items', eyebrow: 'Launch', route: '/releases', kind: 'studio_kpi' },
          { id: 'events', title: formatCompact(stats.eventCount), subtitle: 'Events', eyebrow: 'Collect', route: '/creator/events', kind: 'studio_kpi' },
          { id: 'audience', title: formatCompact(stats.audienceCount), subtitle: 'Audience', eyebrow: 'Grow', route: '/studio/analytics', kind: 'studio_kpi' },
        ],
      },
    ],
  };
}
