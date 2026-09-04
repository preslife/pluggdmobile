import { supabase } from '../../lib/supabase';

export type ConnectCardProfileDraft = {
  slug: string;
  displayName: string;
  artistName: string;
  primaryRole: string;
  roles: string;
  bio: string;
  location: string;
  genre: string;
  websiteUrl: string;
  publicEmail: string;
  businessEmail: string;
  businessPhone: string;
  bookingUrl: string;
  serviceNotes: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  soundcloud: string;
  portfolioLinks: string;
};

export type ConnectCardServiceDraft = {
  id: string | null;
  serviceName: string;
  description: string;
  startingPrice: string;
  currency: string;
  turnaround: string;
  available: boolean;
  sortOrder: number;
};

export type ConnectCardEditorWorkspace = {
  userId: string;
  publicProfile: {
    username: string | null;
    fullName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    websiteUrl: string | null;
  } | null;
  profile: ConnectCardProfileDraft;
  profileExists: boolean;
  services: ConnectCardServiceDraft[];
};

const RESERVED_SLUGS = new Set([
  'admin', 'auth', 'studio', 'connect', 'split', 'wallet', 'api', 'market',
  'marketplace', 'dashboard', 'settings', 'help', 'live', 'events', 'community', 'directory',
]);

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function sanitiseConnectSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function validateSlug(value: string) {
  const slug = sanitiseConnectSlug(value);
  if (!slug) throw new Error('Choose a Connect Card address.');
  if (slug.length < 3) throw new Error('Use at least 3 characters for your Card address.');
  if (slug.length > 40) throw new Error('Use 40 characters or fewer for your Card address.');
  if (value.trim().toLowerCase() !== slug || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new Error('Use lowercase letters, numbers and hyphens only for your Card address.');
  }
  if (RESERVED_SLUGS.has(slug)) throw new Error('This Card address is reserved by PLUGGD.');
  return slug;
}

function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
    return parsed.toString();
  } catch {
    throw new Error(`Check this link before saving: ${trimmed}`);
  }
}

function validateEmail(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error(`Check the ${label} email before saving.`);
  return trimmed;
}

function parsePortfolioLinks(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, ...rawUrl] = line.split('|');
      const urlValue = rawUrl.length > 0 ? rawUrl.join('|').trim() : rawLabel.trim();
      const url = normaliseUrl(urlValue);
      if (!url) throw new Error('Every portfolio line needs a link.');
      return { label: rawUrl.length > 0 ? rawLabel.trim() || 'Portfolio' : 'Portfolio', url };
    });
}

function formatPortfolioLinks(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const label = stringValue((item as any).label).trim() || 'Portfolio';
      const url = stringValue((item as any).url).trim();
      return url ? [`${label} | ${url}`] : [];
    })
    .join('\n');
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('Sign in with a creator account to manage Connect Card.');
  return data.user.id;
}

function profileDraft(row: any, publicProfile: any, userId: string): ConnectCardProfileDraft {
  const publicSlug = sanitiseConnectSlug(stringValue(publicProfile?.username));
  const seedSlug = publicSlug.length >= 3 && !RESERVED_SLUGS.has(publicSlug)
    ? publicSlug
    : `creator-${userId.slice(0, 6)}`;
  const socials = row?.socials && typeof row.socials === 'object' && !Array.isArray(row.socials) ? row.socials : {};
  return {
    slug: stringValue(row?.slug) || seedSlug,
    displayName: stringValue(row?.display_name) || stringValue(publicProfile?.full_name),
    artistName: stringValue(row?.artist_name),
    primaryRole: stringValue(row?.primary_role),
    roles: Array.isArray(row?.roles) ? row.roles.filter((value: unknown) => typeof value === 'string').join(', ') : '',
    bio: stringValue(row?.bio) || stringValue(publicProfile?.bio),
    location: stringValue(row?.location),
    genre: stringValue(row?.genre),
    websiteUrl: stringValue(row?.website_url) || stringValue(publicProfile?.website_url),
    publicEmail: stringValue(row?.email_public),
    businessEmail: stringValue(row?.email_business),
    businessPhone: stringValue(row?.phone_business),
    bookingUrl: stringValue(row?.booking_url),
    serviceNotes: stringValue(row?.service_notes),
    instagram: stringValue(socials.instagram),
    tiktok: stringValue(socials.tiktok),
    youtube: stringValue(socials.youtube),
    soundcloud: stringValue(socials.soundcloud),
    portfolioLinks: formatPortfolioLinks(row?.portfolio_links),
  };
}

function serviceDraft(row: any): ConnectCardServiceDraft {
  return {
    id: stringValue(row?.id) || null,
    serviceName: stringValue(row?.service_name),
    description: stringValue(row?.description),
    startingPrice: row?.starting_price == null ? '' : String(row.starting_price),
    currency: stringValue(row?.currency) || 'GBP',
    turnaround: stringValue(row?.turnaround),
    available: row?.available !== false,
    sortOrder: Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : 0,
  };
}

export function createEmptyConnectService(sortOrder = 0): ConnectCardServiceDraft {
  return { id: null, serviceName: '', description: '', startingPrice: '', currency: 'GBP', turnaround: '', available: true, sortOrder };
}

export async function loadConnectCardEditorWorkspace(): Promise<ConnectCardEditorWorkspace> {
  const userId = await requireUserId();
  const [publicResult, profileResult, servicesResult] = await Promise.all([
    (supabase as any).from('profiles').select('username,full_name,bio,avatar_url,cover_image_url,website_url').eq('user_id', userId).maybeSingle(),
    (supabase as any).from('connect_profiles').select('*').eq('user_id', userId).maybeSingle(),
    (supabase as any).from('connect_services').select('id,user_id,service_name,description,starting_price,currency,turnaround,available,sort_order').eq('user_id', userId).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
  ]);
  if (publicResult.error) throw publicResult.error;
  if (profileResult.error) throw profileResult.error;
  if (servicesResult.error) throw servicesResult.error;
  const publicRow = publicResult.data as any | null;
  return {
    userId,
    publicProfile: publicRow ? {
      username: publicRow.username || null,
      fullName: publicRow.full_name || null,
      bio: publicRow.bio || null,
      avatarUrl: publicRow.avatar_url || null,
      coverImageUrl: publicRow.cover_image_url || null,
      websiteUrl: publicRow.website_url || null,
    } : null,
    profile: profileDraft(profileResult.data, publicRow, userId),
    profileExists: Boolean(profileResult.data?.id),
    services: (servicesResult.data || []).map(serviceDraft),
  };
}

export async function saveConnectCardProfile(draft: ConnectCardProfileDraft) {
  const userId = await requireUserId();
  const slug = validateSlug(draft.slug);
  const { data: available, error: availabilityError } = await (supabase as any).rpc('check_connect_slug_available', {
    p_slug: slug,
    p_current_user_id: userId,
  });
  if (availabilityError) throw availabilityError;
  if (!available) throw new Error('That Connect Card address is already taken.');

  const socials = Object.fromEntries(Object.entries({
    instagram: normaliseUrl(draft.instagram),
    tiktok: normaliseUrl(draft.tiktok),
    youtube: normaliseUrl(draft.youtube),
    soundcloud: normaliseUrl(draft.soundcloud),
  }).filter(([, value]) => Boolean(value)));
  const payload = {
    user_id: userId,
    slug,
    display_name: nullable(draft.displayName),
    artist_name: nullable(draft.artistName),
    primary_role: nullable(draft.primaryRole),
    roles: draft.roles.split(',').map((role) => role.trim()).filter(Boolean),
    bio: nullable(draft.bio),
    location: nullable(draft.location),
    genre: nullable(draft.genre),
    website_url: normaliseUrl(draft.websiteUrl),
    email_public: validateEmail(draft.publicEmail, 'public'),
    email_business: validateEmail(draft.businessEmail, 'business'),
    phone_business: nullable(draft.businessPhone),
    booking_url: normaliseUrl(draft.bookingUrl),
    service_notes: nullable(draft.serviceNotes),
    socials,
    portfolio_links: parsePortfolioLinks(draft.portfolioLinks),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any)
    .from('connect_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  if (data?.user_id !== userId) throw new Error('Connect Card ownership could not be confirmed.');
  return profileDraft(data, null, userId);
}

export async function saveConnectCardService(draft: ConnectCardServiceDraft) {
  const userId = await requireUserId();
  const serviceName = draft.serviceName.trim();
  if (!serviceName) throw new Error('Give this service a name.');
  const rawPrice = draft.startingPrice.trim();
  const price = rawPrice ? Number(rawPrice) : null;
  if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error('Starting price must be zero or more.');
  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency such as GBP.');
  const payload = {
    ...(draft.id ? { id: draft.id } : {}),
    user_id: userId,
    service_name: serviceName,
    description: nullable(draft.description),
    starting_price: price,
    currency,
    turnaround: nullable(draft.turnaround),
    available: draft.available,
    sort_order: draft.sortOrder,
    updated_at: new Date().toISOString(),
  };
  const query = draft.id
    ? (supabase as any).from('connect_services').update(payload).eq('id', draft.id).eq('user_id', userId)
    : (supabase as any).from('connect_services').insert(payload);
  const { data, error } = await query.select('id,user_id,service_name,description,starting_price,currency,turnaround,available,sort_order').single();
  if (error) throw error;
  if (data?.user_id !== userId) throw new Error('Service ownership could not be confirmed.');
  return serviceDraft(data);
}

export async function removeConnectCardService(serviceId: string) {
  const userId = await requireUserId();
  const { data, error } = await (supabase as any)
    .from('connect_services')
    .delete()
    .eq('id', serviceId)
    .eq('user_id', userId)
    .select('id,user_id')
    .single();
  if (error) throw error;
  if (data?.user_id !== userId) throw new Error('Service removal could not be confirmed.');
}
