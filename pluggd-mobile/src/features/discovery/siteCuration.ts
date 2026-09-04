import { RELEASE_LIST_SELECT, type BeatItem, type FeedBundle, type MixItem, type ReleaseItem, type SoundboardItem } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { isPublicActiveEvent, PUBLIC_EVENT_SELECT, type PublicEventItem } from '../events/eventDiscoveryData';
import { resolveThePlugArtwork } from '../editorial/thePlugArticleService';
import { buildDiscoveryItems, type DiscoveryItem } from './discoveryModel';

export type SiteCurationPlacement =
  | 'homepage_hero'
  | 'homepage_editorial'
  | 'hero_rotation'
  | 'what_moving_now'
  | 'discover_for_you'
  | 'seasonal_spotlight'
  | 'featured_event'
  | 'homepage_event';

export type SiteCurationContentType = 'event' | 'release' | 'beat' | 'mix' | 'soundboard' | 'article' | 'promo';

type SiteCurationRow = {
  id: string;
  placement: SiteCurationPlacement;
  content_type: SiteCurationContentType;
  content_id: string | null;
  display_order: number;
  headline_override: string | null;
  subtitle_override: string | null;
  image_url_override: string | null;
  mobile_image_url_override: string | null;
  cta_label: string | null;
  promo_href: string | null;
};

type SiteTickerRow = {
  id: string;
  item_kind: 'content' | 'promo';
  content_type: SiteCurationContentType | null;
  content_id: string | null;
  label_override: string | null;
  promo_href: string | null;
  display_order: number;
};

export type CuratedArticle = {
  id: string;
  title: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  tags: string[] | null;
  created_at: string | null;
  published_at: string | null;
};

export type CuratedPublicItem = {
  curationId: string;
  placement: SiteCurationPlacement;
  contentType: SiteCurationContentType;
  contentId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  route: string;
  ctaLabel: string | null;
  displayOrder: number;
  discoveryItem?: DiscoveryItem;
  article?: CuratedArticle;
  event?: PublicEventItem;
};

export type CuratedTickerItem = {
  id: string;
  label: string;
  route: string;
  contentType: SiteCurationContentType | 'promo';
};

function webAssetUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return `https://www.pluggd.fm${trimmed}`;
  return trimmed;
}

function isSafeInternalRoute(value?: string | null) {
  const route = value?.trim();
  return Boolean(route && route.startsWith('/') && !route.startsWith('//'));
}

async function loadRows(placement: SiteCurationPlacement, limit: number) {
  const { data, error } = await (supabase as any).rpc('get_discover_featured_items', {
    p_placement: placement,
    p_limit: Math.max(1, Math.min(limit, 60)),
  });
  if (error) throw error;
  return ((data ?? []) as SiteCurationRow[])
    .filter((row) => row.placement === placement)
    .sort((a, b) => a.display_order - b.display_order);
}

type ContentReference = Pick<SiteCurationRow, 'content_type' | 'content_id'>;

function idsFor(rows: ContentReference[], type: SiteCurationContentType) {
  return Array.from(new Set(rows.filter((row) => row.content_type === type && row.content_id).map((row) => row.content_id as string)));
}

async function dataOrEmpty(query: PromiseLike<{ data: unknown; error: { message?: string } | null }>) {
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []) as any[];
}

async function hydratePublicReferences(rows: ContentReference[]) {
  const releaseIds = idsFor(rows, 'release');
  const beatIds = idsFor(rows, 'beat');
  const mixIds = idsFor(rows, 'mix');
  const soundboardIds = idsFor(rows, 'soundboard');
  const eventIds = idsFor(rows, 'event');
  const articleIds = idsFor(rows, 'article');
  const db = supabase as any;

  const [releases, beats, mixes, soundboards, events, articles] = await Promise.all([
    releaseIds.length
      ? dataOrEmpty(db.from('releases').select(RELEASE_LIST_SELECT).in('id', releaseIds).eq('approved', true).eq('status', 'live').eq('catalogue_mode', 'pluggd').eq('visibility_status', 'visible'))
      : Promise.resolve([]),
    beatIds.length
      ? dataOrEmpty(db.from('beats').select('id,user_id,owner_id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at').in('id', beatIds).eq('is_published', true))
      : Promise.resolve([]),
    mixIds.length
      ? dataOrEmpty(db.from('mixes').select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at').in('id', mixIds).eq('status', 'published').eq('visibility', 'public'))
      : Promise.resolve([]),
    soundboardIds.length
      ? dataOrEmpty(db.from('soundboards').select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at').in('id', soundboardIds).eq('is_published', true).eq('visibility', 'public'))
      : Promise.resolve([]),
    eventIds.length
      ? dataOrEmpty(db.from('events').select(PUBLIC_EVENT_SELECT).in('id', eventIds).eq('discoverable', true))
      : Promise.resolve([]),
    articleIds.length
      ? dataOrEmpty(db.from('blog_posts').select('id,title,dek,excerpt,featured_image_url,tags,created_at,published_at,metadata,editor_document,html_content,content,content_blocks').in('id', articleIds).eq('is_published', true).eq('is_global_editorial', true).eq('global_feature_status', 'approved').eq('workflow_status', 'published').eq('moderation_status', 'active'))
      : Promise.resolve([]),
  ]);

  const bundle: FeedBundle = {
    releases: releases as ReleaseItem[],
    beats: beats as BeatItem[],
    mixes: mixes as MixItem[],
    soundboards: soundboards as SoundboardItem[],
    events: [],
    samplePacks: [],
    profiles: [],
    posts: [],
    mapPlugs: [],
  };

  return {
    discoveryByKey: new Map(buildDiscoveryItems(bundle).map((item) => [item.id, item])),
    articleById: new Map((articles as Array<CuratedArticle & { dek?: string | null }>).map((article) => [article.id, article])),
    eventById: new Map((events as PublicEventItem[]).filter((event) => isPublicActiveEvent(event)).map((event) => [event.id, event])),
  };
}

/** Hydrates the exact active admin placement rows instead of reselecting recent content heuristically. */
export async function loadCuratedPublicItems(
  placement: SiteCurationPlacement,
  limit = 24,
): Promise<CuratedPublicItem[]> {
  const rows = await loadRows(placement, limit);
  if (!rows.length) return [];
  const { discoveryByKey, articleById, eventById } = await hydratePublicReferences(rows);

  return rows.flatMap((row): CuratedPublicItem[] => {
    const overrideImage = webAssetUrl(row.mobile_image_url_override || row.image_url_override);
    const overrideTitle = row.headline_override?.trim() || null;
    const overrideSubtitle = row.subtitle_override?.trim() || null;

    if (row.content_type === 'promo') {
      if (!overrideTitle || !overrideImage || !isSafeInternalRoute(row.promo_href)) return [];
      return [{
        curationId: row.id,
        placement,
        contentType: 'promo',
        contentId: null,
        title: overrideTitle,
        subtitle: overrideSubtitle,
        imageUrl: overrideImage,
        route: row.promo_href!.trim(),
        ctaLabel: row.cta_label,
        displayOrder: row.display_order,
      }];
    }

    if (row.content_type === 'article' && row.content_id) {
      const source = articleById.get(row.content_id);
      if (!source) return [];
      const article: CuratedArticle = {
        id: source.id,
        title: overrideTitle || source.title,
        excerpt: overrideSubtitle || source.dek || source.excerpt,
        featured_image_url: overrideImage || resolveThePlugArtwork(source as Record<string, unknown>),
        tags: source.tags,
        created_at: source.created_at,
        published_at: source.published_at,
      };
      return [{
        curationId: row.id,
        placement,
        contentType: 'article',
        contentId: source.id,
        title: article.title || 'THE PLUG story',
        subtitle: article.excerpt,
        imageUrl: article.featured_image_url,
        route: `/plug/${source.id}`,
        ctaLabel: row.cta_label,
        displayOrder: row.display_order,
        article,
      }];
    }

    if (row.content_type === 'event' && row.content_id) {
      const source = eventById.get(row.content_id);
      if (!source) return [];
      const event: PublicEventItem = {
        ...source,
        title: overrideTitle || source.title,
        description: overrideSubtitle || source.description,
        cover_image_url: overrideImage || source.cover_image_url,
      };
      return [{
        curationId: row.id,
        placement,
        contentType: 'event',
        contentId: source.id,
        title: event.title || 'PLUGGD event',
        subtitle: event.description,
        imageUrl: event.cover_image_url,
        route: `/events/${source.id}`,
        ctaLabel: row.cta_label,
        displayOrder: row.display_order,
        event,
      }];
    }

    if (row.content_id) {
      const discovery = discoveryByKey.get(`${row.content_type}:${row.content_id}`);
      if (!discovery) return [];
      const discoveryItem: DiscoveryItem = {
        ...discovery,
        title: overrideTitle || discovery.title,
        description: overrideSubtitle || discovery.description,
        artwork: overrideImage || discovery.artwork,
        isEditorialPick: true,
        track: discovery.track ? {
          ...discovery.track,
          title: overrideTitle || discovery.track.title,
          artwork: overrideImage || discovery.track.artwork,
        } : null,
      };
      return [{
        curationId: row.id,
        placement,
        contentType: row.content_type,
        contentId: row.content_id,
        title: discoveryItem.title,
        subtitle: discoveryItem.description || null,
        imageUrl: discoveryItem.artwork,
        route: discoveryItem.destinationRoute,
        ctaLabel: row.cta_label,
        displayOrder: row.display_order,
        discoveryItem,
      }];
    }

    return [];
  });
}

/** Resolves the scheduled admin ticker through the same public-only content authority as feature rows. */
export async function loadCuratedTickerItems(limit = 24): Promise<CuratedTickerItem[]> {
  const { data, error } = await (supabase as any).rpc('get_discover_ticker_items', {
    p_limit: Math.max(1, Math.min(limit, 60)),
  });
  if (error) throw error;

  const rows = ((data ?? []) as SiteTickerRow[])
    .filter((row) => {
      if (row.item_kind === 'promo') {
        return Boolean(row.label_override?.trim() && isSafeInternalRoute(row.promo_href));
      }
      return Boolean(
        row.item_kind === 'content'
        && row.content_id
        && row.content_type
        && row.content_type !== 'promo',
      );
    })
    .sort((a, b) => a.display_order - b.display_order);
  if (!rows.length) return [];

  const contentRows = rows.filter((row): row is SiteTickerRow & { content_type: Exclude<SiteCurationContentType, 'promo'>; content_id: string } => (
    row.item_kind === 'content' && Boolean(row.content_type && row.content_id && row.content_type !== 'promo')
  ));
  const { discoveryByKey, articleById, eventById } = await hydratePublicReferences(contentRows);

  return rows.flatMap((row): CuratedTickerItem[] => {
    if (row.item_kind === 'promo') {
      return [{
        id: row.id,
        label: row.label_override!.trim(),
        route: row.promo_href!.trim(),
        contentType: 'promo',
      }];
    }
    if (!row.content_type || !row.content_id || row.content_type === 'promo') return [];

    const discovery = discoveryByKey.get(`${row.content_type}:${row.content_id}`);
    const article = row.content_type === 'article' ? articleById.get(row.content_id) : null;
    const event = row.content_type === 'event' ? eventById.get(row.content_id) : null;
    const title = row.label_override?.trim() || discovery?.title || article?.title?.trim() || event?.title?.trim();
    const route = discovery?.destinationRoute
      || (article ? `/plug/${article.id}` : null)
      || (event ? `/events/${event.id}` : null);
    if (!title || !route) return [];
    return [{ id: row.id, label: title, route, contentType: row.content_type }];
  });
}
