import { supabase } from '../../lib/supabase';
import { getCurrentUserId, safeMaybe } from '../culture/mobileServices';

type UnknownRecord = Record<string, unknown>;

export type ThePlugPublication = {
  name: string | null;
  slug: string | null;
  logoUrl: string | null;
  brandColor: string | null;
};

export type ThePlugArticleDetail = {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  dek: string | null;
  content: string | null;
  completeHtml: string | null;
  baseUrl: string;
  featuredImageUrl: string | null;
  tags: string[];
  createdAt: string | null;
  publishedAt: string | null;
  authorName: string | null;
  category: string | null;
  edition: string | null;
  readTimeMinutes: number | null;
  city: string | null;
  scene: string | null;
  genre: string | null;
  publication: ThePlugPublication | null;
  publicationCategory: string | null;
  saved: boolean;
};

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function publication(value: unknown): ThePlugPublication | null {
  const row = Array.isArray(value) ? record(value[0]) : record(value);
  if (!row) return null;
  return {
    name: text(row.name),
    slug: text(row.slug),
    logoUrl: text(row.logo_url),
    brandColor: text(row.brand_color),
  };
}

function publicationCategory(value: unknown) {
  const row = Array.isArray(value) ? record(value[0]) : record(value);
  return text(row?.name);
}

function completeHtml(row: UnknownRecord) {
  const storedHtml = text(row.html_content);
  if (storedHtml && /<!doctype|<html\b|<head\b|<style\b/i.test(storedHtml)) return storedHtml;

  const document = record(row.editor_document);
  const nodes = Array.isArray(document?.nodes) ? document.nodes : [];
  for (const value of nodes) {
    const node = record(value);
    const content = record(node?.content);
    if (node?.type === 'legacy_html') {
      const legacyHtml = text(content?.html);
      if (legacyHtml) return legacyHtml;
    }
  }

  if (storedHtml) return storedHtml;
  const legacyContent = text(row.content);
  return legacyContent && /<[a-z][\s\S]*>/i.test(legacyContent) ? legacyContent : null;
}

function articleBody(value: unknown) {
  const source = text(value);
  if (!source) return null;
  const readable = source
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return readable ? source : null;
}

function safeHttpUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate, 'https://pluggd.fm/');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function articleBaseUrl(row: UnknownRecord, html: string | null) {
  const metadata = record(row.metadata);
  const nestedArticle = record(metadata?.article);
  const existingBase = html?.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1];
  const candidates = [
    existingBase,
    metadata?.asset_base_url,
    metadata?.assetBaseUrl,
    metadata?.source_url,
    metadata?.sourceUrl,
    metadata?.original_url,
    nestedArticle?.source_url,
    nestedArticle?.url,
  ];
  for (const candidate of candidates) {
    const safe = safeHttpUrl(candidate);
    if (safe) return safe;
  }
  return 'https://pluggd.fm/';
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function htmlAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ? decodeHtmlAttribute(match[2].trim()) : null;
}

function imageFromHtml(html: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (htmlAttribute(tag, 'property') || htmlAttribute(tag, 'name'))?.toLowerCase();
    if (!key || !['og:image', 'twitter:image', 'twitter:image:src'].includes(key)) continue;
    const content = htmlAttribute(tag, 'content');
    if (content) return content;
  }
  const imageTag = html.match(/<img\b[^>]*>/i)?.[0];
  return imageTag ? htmlAttribute(imageTag, 'src') : null;
}

function contentBlockImage(value: unknown): unknown {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(record(value)?.blocks)
      ? record(value)?.blocks as unknown[]
      : [];
  for (const entry of values) {
    const block = record(entry);
    if (!block || text(block.type)?.toLowerCase() !== 'image') continue;
    const nested = record(block.content);
    const source = block.image_url || block.imageUrl || block.src || nested?.image_url || nested?.imageUrl || nested?.src;
    if (text(source)) return source;
  }
  return null;
}

/**
 * Matches the web THE PLUG artwork contract. Imported editorial packages can
 * keep their hero in metadata, editor nodes, content blocks or complete HTML;
 * `featured_image_url` alone is therefore not a reliable artwork signal.
 */
export function resolveThePlugArtwork(row: UnknownRecord) {
  const html = completeHtml(row);
  const baseUrl = articleBaseUrl(row, html);
  const resolve = (value: unknown) => {
    const source = text(value);
    if (!source) return null;
    if (/^(?:data:|blob:|file:|content:)/i.test(source)) return source;
    try {
      const parsed = new URL(source, baseUrl);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  };

  const explicit = resolve(row.featured_image_url);
  if (explicit) return explicit;

  const metadata = record(row.metadata);
  const nestedArticle = record(metadata?.article);
  const metadataArtwork = [
    metadata?.featured_image_url,
    metadata?.featuredImageUrl,
    metadata?.hero_image,
    metadata?.heroImage,
    metadata?.og_image,
    metadata?.ogImage,
    nestedArticle?.featured_image_url,
    nestedArticle?.hero_image,
  ].map(resolve).find((candidate): candidate is string => Boolean(candidate));
  if (metadataArtwork) return metadataArtwork;

  const document = record(row.editor_document);
  const nodes = Array.isArray(document?.nodes) ? document.nodes : [];
  for (const value of nodes) {
    const node = record(value);
    const content = record(node?.content);
    if (node?.type === 'image') {
      const source = resolve(content?.src || content?.image_url || content?.imageUrl);
      if (source) return source;
    }
    if (node?.type === 'legacy_html') {
      const legacyHtml = text(content?.html);
      const source = legacyHtml ? resolve(imageFromHtml(legacyHtml)) : null;
      if (source) return source;
    }
  }

  const blockArtwork = resolve(contentBlockImage(row.content_blocks));
  if (blockArtwork) return blockArtwork;
  const htmlArtwork = html ? resolve(imageFromHtml(html)) : null;
  if (htmlArtwork) return htmlArtwork;
  const legacyContent = text(row.content);
  return legacyContent && /<img\b/i.test(legacyContent) ? resolve(imageFromHtml(legacyContent)) : null;
}

function articleEdition(row: UnknownRecord) {
  const metadata = record(row.metadata);
  const nestedArticle = record(metadata?.article);
  return text(metadata?.edition)
    || text(metadata?.edition_label)
    || text(metadata?.issue)
    || text(nestedArticle?.edition)
    || text(nestedArticle?.issue);
}

export function prepareThePlugArticleHtml(html: string, baseUrl: string) {
  const escapedBase = baseUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const headAdditions = `${/<base\b/i.test(html) ? '' : `<base href="${escapedBase}">`}<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style id="pluggd-native-reader">html,body{max-width:100%;overflow-x:hidden}img,video,iframe{max-width:100%;height:auto}@media(max-width:760px){.lede-sidebar,.lede-divider{display:none!important}.lede-block{display:block!important}.lede-text{width:100%!important;max-width:none!important}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}</style>`;
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (head) => `${head}${headAdditions}`);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (root) => `${root}<head>${headAdditions}</head>`);
  return `<!doctype html><html><head>${headAdditions}</head><body>${html}</body></html>`;
}

export async function loadThePlugArticle(articleId: string): Promise<ThePlugArticleDetail | null> {
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .select('id,slug,title,excerpt,dek,content,html_content,editor_document,featured_image_url,tags,created_at,published_at,author_name,curator_name,editorial_category,read_time_minutes,city,scene,genre,metadata,the_plug_publications(name,slug,logo_url,brand_color),the_plug_publication_categories(name,slug)')
    .eq('id', articleId)
    .eq('is_published', true)
    .eq('workflow_status', 'published')
    .eq('moderation_status', 'active')
    .maybeSingle();
  if (error) throw new Error(error.message || 'This story could not load.');
  const row = record(data);
  if (!row) return null;
  const html = completeHtml(row);
  const content = articleBody(row.content);
  if (!content && !articleBody(html)) return null;

  const userId = await getCurrentUserId();
  const savedRow = userId
    ? await safeMaybe<UnknownRecord>(
      (supabase as any)
        .from('saved_content')
        .select('id')
        .eq('user_id', userId)
        .eq('content_type', 'blog_post')
        .eq('content_id', articleId)
        .maybeSingle(),
    )
    : null;
  const postPublication = publication(row.the_plug_publications);

  return {
    id: text(row.id) || articleId,
    slug: text(row.slug),
    title: text(row.title) || 'PLUGGD story',
    excerpt: text(row.excerpt),
    dek: text(row.dek),
    content,
    completeHtml: html,
    baseUrl: articleBaseUrl(row, html),
    featuredImageUrl: resolveThePlugArtwork(row),
    tags: Array.isArray(row.tags) ? row.tags.map(text).filter((tag): tag is string => Boolean(tag)) : [],
    createdAt: text(row.created_at),
    publishedAt: text(row.published_at),
    authorName: text(row.author_name) || text(row.curator_name),
    category: text(row.editorial_category),
    edition: articleEdition(row),
    readTimeMinutes: number(row.read_time_minutes),
    city: text(row.city),
    scene: text(row.scene),
    genre: text(row.genre),
    publication: postPublication,
    publicationCategory: publicationCategory(row.the_plug_publication_categories),
    saved: Boolean(savedRow?.id),
  };
}
