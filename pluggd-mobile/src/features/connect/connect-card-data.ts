import { supabase } from '../../lib/supabase';

export type ConnectCardViewType = 'public' | 'business' | 'rates' | 'collab' | 'contract';
export type ConnectCardStatus = 'ok' | 'locked' | 'disabled' | 'not_found';

export type ConnectService = {
  id?: string;
  service_name: string;
  description?: string | null;
  starting_price?: number | string | null;
  currency?: string | null;
  turnaround?: string | null;
  available?: boolean | null;
};

export type ConnectCardFields = Record<string, unknown> & {
  display_name?: string | null;
  artist_name?: string | null;
  legal_name?: string | null;
  primary_role?: string | null;
  roles?: string[] | null;
  bio?: string | null;
  location?: string | null;
  genre?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  website_url?: string | null;
  email_public?: string | null;
  email_business?: string | null;
  phone_business?: string | null;
  socials?: Record<string, string | null | undefined> | null;
  booking_url?: string | null;
  portfolio_links?: Array<{ label?: string; title?: string; url?: string }> | null;
  service_notes?: string | null;
  services?: ConnectService[] | null;
  pluggd_profile_url?: string | null;
  contact_email?: string | null;
  pro_name?: string | null;
  ipi_cae_number?: string | null;
  publisher_name?: string | null;
  publisher_ipi?: string | null;
  publishing_admin?: string | null;
  default_split_role?: string | null;
  contract_email?: string | null;
  contract_contact_name?: string | null;
  contract_phone?: string | null;
  contract_contact_role?: string | null;
  label_contact?: string | null;
  company_name?: string | null;
  company_number?: string | null;
  nationality?: string | null;
  country_of_residence?: string | null;
};

export type ConnectCardPayload = {
  status: ConnectCardStatus;
  viewType: ConnectCardViewType;
  access?: 'public' | 'token' | 'owner';
  enabled?: boolean;
  requiresToken?: boolean;
  profile?: {
    slug?: string | null;
    display_name?: string | null;
    artist_name?: string | null;
    primary_role?: string | null;
    roles?: string[] | null;
    profile_image_url?: string | null;
    cover_image_url?: string | null;
    is_verified?: boolean | null;
    pluggd_profile_url?: string | null;
  } | null;
  fields?: ConnectCardFields | null;
};

export const CONNECT_CARD_VIEW_LABELS: Record<ConnectCardViewType, string> = {
  public: 'Connect',
  business: 'Work With Me',
  rates: 'Rates',
  collab: 'Collaborator',
  contract: 'Legal Share',
};

const normalizeViewType = (value: unknown, fallback: ConnectCardViewType): ConnectCardViewType => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'rate') return 'rates';
  if (normalized === 'collaborator') return 'collab';
  return ['public', 'business', 'rates', 'collab', 'contract'].includes(normalized)
    ? normalized as ConnectCardViewType
    : fallback;
};

const normalizePayload = (value: unknown, viewType: ConnectCardViewType): ConnectCardPayload => {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const status = typeof record.status === 'string' ? record.status : '';
  return {
    status: ['ok', 'locked', 'disabled', 'not_found'].includes(status)
      ? status as ConnectCardStatus
      : 'not_found',
    viewType: normalizeViewType(record.viewType, viewType),
    access: record.access === 'token' || record.access === 'owner' ? record.access : 'public',
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    requiresToken: typeof record.requiresToken === 'boolean' ? record.requiresToken : undefined,
    profile: record.profile && typeof record.profile === 'object'
      ? record.profile as ConnectCardPayload['profile']
      : null,
    fields: record.fields && typeof record.fields === 'object'
      ? record.fields as ConnectCardFields
      : null,
  };
};

export async function loadConnectCard(
  slug: string,
  viewType: ConnectCardViewType,
  token?: string | null,
): Promise<ConnectCardPayload> {
  const { data, error } = await (supabase as any).rpc('get_connect_card', {
    p_slug: slug,
    p_view_type: viewType,
    p_token: token ?? null,
  });
  if (error) throw error;
  return normalizePayload(data, viewType);
}

export async function loadConnectCardByUserId(
  userId: string,
  viewType: ConnectCardViewType,
  token?: string | null,
): Promise<ConnectCardPayload> {
  const { data, error } = await (supabase as any).rpc('get_connect_card_by_user_id', {
    p_user_id: userId,
    p_view_type: viewType,
    p_token: token ?? null,
  });
  if (error) throw error;
  return normalizePayload(data, viewType);
}

export function createConnectCardPreview(viewType: ConnectCardViewType): ConnectCardPayload {
  const shared: ConnectCardFields = {
    display_name: 'Ari Vale',
    artist_name: 'Ari Vale',
    primary_role: 'Artist & producer',
    roles: ['Artist', 'Producer', 'Songwriter'],
    bio: 'Alternative R&B shaped between late-night London sessions and warm analogue soul.',
    location: 'London, UK',
    genre: 'Alternative R&B',
    profile_image_url: null,
    cover_image_url: null,
    website_url: 'https://pluggd.fm/arivale',
    email_public: 'hello@arivale.com',
    email_business: 'bookings@arivale.com',
    phone_business: '+44 20 7946 0921',
    booking_url: 'https://pluggd.fm/arivale',
    pluggd_profile_url: 'https://pluggd.fm/arivale',
    socials: {
      instagram: '@arivale',
      tiktok: '@arivale',
      youtube: 'https://youtube.com/@arivale',
    },
    service_notes: 'Final scope and delivery are confirmed before booking.',
    services: [
      { id: 'production', service_name: 'Custom production', description: 'Original production, mixed and tagged', starting_price: 350, currency: 'GBP', turnaround: '7–10 days' },
      { id: 'writing', service_name: 'Songwriting / topline', description: 'Melody, lyrics and vocal direction', starting_price: 220, currency: 'GBP', turnaround: '5–7 days' },
      { id: 'feature', service_name: 'Artist feature', description: 'Recorded feature with one revision', starting_price: 500, currency: 'GBP', turnaround: 'By arrangement' },
    ],
    legal_name: 'Ariana Vale',
    pro_name: 'PRS for Music',
    ipi_cae_number: '00928471635',
    publisher_name: 'Vale Songs',
    publishing_admin: 'Self-administered',
    default_split_role: 'Writer / producer',
    contact_email: 'collab@arivale.com',
    contract_email: 'legal@arivale.com',
    contract_contact_name: 'Maya Reed',
    contract_contact_role: 'Business manager',
    company_name: 'Vale Music Ltd',
    company_number: '14920381',
    nationality: 'British',
    country_of_residence: 'United Kingdom',
  };

  return {
    status: 'ok',
    viewType,
    access: viewType === 'collab' || viewType === 'contract' ? 'token' : 'public',
    enabled: true,
    requiresToken: viewType === 'collab' || viewType === 'contract',
    profile: {
      slug: 'arivale',
      display_name: 'Ari Vale',
      artist_name: 'Ari Vale',
      primary_role: 'Artist & producer',
      roles: ['Artist', 'Producer', 'Songwriter'],
      is_verified: true,
      pluggd_profile_url: 'https://pluggd.fm/arivale',
    },
    fields: shared,
  };
}
