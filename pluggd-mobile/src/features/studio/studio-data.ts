import { supabase } from '../../lib/supabase';
import { formatCompact } from '../../lib/mobileContent';
import {
  hasCreatorAccess,
  resolveProfileRoles,
  type EcosystemRole,
  type NavProfile,
  type ProfileRoleRow,
} from '../../lib/mobileNavigation';
import { getCurrentUserId, safeList, safeMaybe } from '../culture/mobileServices';
import {
  cacheStudioModulePreferences,
  loadServerStudioModulePreferences,
  readLocalStudioModulePreferences,
  saveServerStudioModulePreferences,
} from './studioModulePreferences';

export type StudioRole = Exclude<EcosystemRole, 'fan'>;

export type StudioModuleStatus = 'native' | 'limited' | 'web_only';
export type StudioModulePresentationMode = 'native' | 'embedded';

export type StudioModuleSection =
  | 'create'
  | 'catalog'
  | 'growth'
  | 'connect'
  | 'money'
  | 'operations'
  | 'commerce'
  | 'account';

export type StudioModuleId =
  | 'upload_release'
  | 'upload_beat'
  | 'upload_mix'
  | 'releases'
  | 'beats'
  | 'mixes'
  | 'events'
  | 'event_applications'
  | 'opportunities'
  | 'venues'
  | 'soundboards'
  | 'the_plug'
  | 'videos'
  | 'analytics_engagement'
  | 'analytics_audience'
  | 'analytics_revenue'
  | 'embeds'
  | 'financials'
  | 'live'
  | 'collaborations'
  | 'crm'
  | 'store'
  | 'my_pluggd'
  | 'storefront'
  | 'memberships'
  | 'crowdfunding'
  | 'courses'
  | 'sound_packs'
  | 'merch'
  | 'bundles'
  | 'collectibles'
  | 'licenses'
  | 'splits'
  | 'connect_card'
  | 'plugins'
  | 'shows'
  | 'partnerships'
  | 'studio_apps'
  | 'settings';

export type StudioModuleDefinition = {
  id: StudioModuleId;
  title: string;
  shortTitle?: string;
  route?: string;
  studioPath?: string;
  presentationMode?: StudioModulePresentationMode;
  publicPreviewRoute?: string;
  icon: string;
  section: StudioModuleSection;
  status: StudioModuleStatus;
  defaultRoles?: StudioRole[];
  optionalRoles?: StudioRole[];
  recommendedRoles?: StudioRole[];
  alwaysVisible?: boolean;
  description: string;
  addsToStudio: string;
  unavailableReason?: string;
};

export type StudioModuleState = StudioModuleDefinition & {
  presentationMode: StudioModulePresentationMode;
  plugged: boolean;
  defaultForRole: boolean;
  recommendedForRole: boolean;
};

export type StudioCatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  kind: 'release' | 'beat' | 'mix' | 'soundboard' | 'event';
  managementFacts?: Array<{ label: string; value: string }>;
};

export type StudioConnectProfile = {
  id: string;
  slug?: string | null;
  display_name?: string | null;
  headline?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
};

export type StudioSetupTask = {
  id: string;
  title: string;
  detail: string;
  complete: boolean;
  route: string;
};

export type StudioAction = {
  id: string;
  title: string;
  detail: string;
  route?: string;
  icon: string;
  status: StudioModuleStatus;
  unavailableReason?: string;
};

export type StudioStats = {
  catalogCount: number;
  releaseCount: number;
  beatCount: number;
  mixCount: number;
  soundboardCount: number;
  videoCount: number;
  eventCount: number;
  liveCount: number;
  audienceCount: number;
  connectCardCount: number;
  healthPercent: number;
  completedTasks: number;
  totalTasks: number;
};

export type StudioData = {
  signedIn: boolean;
  userId: string | null;
  creatorAccess: boolean;
  profile: NavProfile | null;
  roles: EcosystemRole[];
  primaryRole: StudioRole;
  enabledModuleIds: StudioModuleId[];
  modulePreferencesSynced: boolean;
  modulePreferencesError: string | null;
  modules: StudioModuleState[];
  stats: StudioStats;
  catalogItems: StudioCatalogItem[];
  connectProfile: StudioConnectProfile | null;
  setupTasks: StudioSetupTask[];
  nextMove: StudioAction;
  nativeActions: StudioAction[];
  webOnlyActions: StudioAction[];
};

type ProfileRow = NavProfile & {
  id?: string | null;
  city?: string | null;
};

type ReleaseRow = {
  id: string;
  title?: string | null;
  artist?: string | null;
  cover_art_url?: string | null;
  created_at?: string | null;
  release_date?: string | null;
  release_type?: string | null;
  genre?: string | null;
  status?: string | null;
  approval_status?: string | null;
  distribution_status?: string | null;
  approved?: boolean | null;
  total_plays?: number | null;
};

type BeatRow = {
  id: string;
  title?: string | null;
  producer_name?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  genre?: string | null;
  bpm?: number | null;
  key?: string | null;
  price?: number | null;
  is_published?: boolean | null;
  moderation_status?: string | null;
};

type MixRow = {
  id: string;
  slug?: string | null;
  title?: string | null;
  cover_url?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  city?: string | null;
  recording_type?: string | null;
  duration_seconds?: number | null;
  play_count?: number | null;
  status?: string | null;
  visibility?: string | null;
};

type SoundboardRow = {
  id: string;
  slug?: string | null;
  title?: string | null;
  cover_image_url?: string | null;
  item_count?: number | null;
  created_at?: string | null;
  last_activity_at?: string | null;
};

type EventRow = {
  id: string;
  title?: string | null;
  cover_image_url?: string | null;
  starts_at?: string | null;
  location?: string | null;
  created_at?: string | null;
};

const ALL_STUDIO_ROLES: StudioRole[] = [
  'artist',
  'producer',
  'dj',
  'promoter',
  'venue',
  'curator',
  'service_provider',
  'manager',
];

const allExcept = (...roles: StudioRole[]) => ALL_STUDIO_ROLES.filter((role) => !roles.includes(role));

export const STUDIO_MODULES: StudioModuleDefinition[] = [
  {
    id: 'upload_release',
    title: 'Upload Release',
    shortTitle: 'Release',
    route: '/creator/upload?type=release',
    icon: 'cloud-upload',
    section: 'create',
    status: 'limited',
    defaultRoles: ['artist'],
    description: 'Prepare release drafts, tracks, artwork, credits, and rights context.',
    addsToStudio: 'Create a complete release draft. Advanced distribution review opens inside Studio.',
  },
  {
    id: 'upload_beat',
    title: 'Upload Beat',
    shortTitle: 'Beat',
    route: '/creator/upload?type=beat',
    icon: 'cloud-upload',
    section: 'create',
    status: 'limited',
    defaultRoles: ['producer'],
    description: 'Prepare beat audio, artwork, previews, and license tiers.',
    addsToStudio: 'Create a complete beat draft. Advanced licence publishing opens inside Studio.',
  },
  {
    id: 'upload_mix',
    title: 'Upload Mix',
    shortTitle: 'Mix',
    route: '/creator/upload?type=mix',
    icon: 'cloud-upload',
    section: 'create',
    status: 'limited',
    defaultRoles: ['dj'],
    description: 'Prepare DJ mixes, artwork, tracklist context, and publishing state.',
    addsToStudio: 'Create a complete mix draft. Advanced publishing opens inside Studio.',
  },
  {
    id: 'releases',
    title: 'Releases',
    route: '/studio/catalog?tab=releases',
    icon: 'library-music',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['artist'],
    optionalRoles: allExcept('artist'),
    recommendedRoles: ['artist', 'manager'],
    description: 'Manage your owned releases, catalogue status, artwork, and next release draft.',
    addsToStudio: 'Adds release management to Studio.',
  },
  {
    id: 'beats',
    title: 'Beat Store',
    shortTitle: 'Beats',
    route: '/studio/catalog?tab=beats',
    icon: 'headset',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['producer'],
    optionalRoles: allExcept('producer'),
    recommendedRoles: ['producer', 'artist'],
    description: 'Manage your beat inventory and prepare the next beat upload.',
    addsToStudio: 'Adds beat management to Studio.',
  },
  {
    id: 'mixes',
    title: 'Mixes',
    route: '/studio/catalog?tab=mixes',
    icon: 'album',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['dj'],
    optionalRoles: allExcept('dj'),
    recommendedRoles: ['dj', 'curator'],
    description: 'Manage your mixes, tracklist context, publishing state, and next upload.',
    addsToStudio: 'Adds mix management to Studio.',
  },
  {
    id: 'events',
    title: 'Events',
    route: '/creator/events',
    icon: 'event',
    section: 'operations',
    status: 'native',
    defaultRoles: ['dj', 'promoter', 'venue'],
    optionalRoles: ['artist', 'producer', 'curator', 'service_provider', 'manager'],
    recommendedRoles: ['dj', 'promoter', 'venue'],
    description: 'Create and manage creator events with real event rows.',
    addsToStudio: 'Adds creator events to Studio.',
  },
  {
    id: 'venues',
    title: 'Venues',
    studioPath: '/studio/events?tab=venues',
    presentationMode: 'embedded',
    icon: 'location-on',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['promoter', 'venue'],
    optionalRoles: ['dj', 'manager'],
    recommendedRoles: ['venue', 'promoter'],
    description: 'Manage venue context, booking details, and event operations.',
    addsToStudio: 'Adds venue planning to Studio.',
    unavailableReason: 'Open the full venue workspace securely inside Studio.',
  },
  {
    id: 'event_applications',
    title: 'Event Applications',
    studioPath: '/studio/events?tab=applications',
    presentationMode: 'embedded',
    icon: 'assignment-turned-in',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['promoter', 'venue'],
    optionalRoles: ['artist', 'producer', 'dj', 'curator', 'service_provider', 'manager'],
    recommendedRoles: ['promoter', 'venue'],
    description: 'Review, shortlist, and manage applications to creator events.',
    addsToStudio: 'Adds the complete event-applications workspace to Studio.',
    unavailableReason: 'Open the full applications workspace securely inside Studio.',
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    studioPath: '/studio/opportunities',
    presentationMode: 'embedded',
    icon: 'work',
    section: 'operations',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['promoter', 'venue', 'curator', 'manager'],
    description: 'Create and manage creator opportunities, criteria, and applications.',
    addsToStudio: 'Adds the owner Opportunities workspace to Studio.',
    unavailableReason: 'Open the full Opportunities workspace securely inside Studio.',
  },
  {
    id: 'soundboards',
    title: 'Soundboards',
    route: '/studio/catalog?tab=soundboards',
    icon: 'view-list',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['artist', 'producer', 'dj', 'curator'],
    optionalRoles: allExcept('artist', 'producer', 'dj', 'curator'),
    recommendedRoles: ['artist', 'producer', 'dj', 'curator'],
    description: 'Manage your soundboards, canvas ideas, references, and community feedback.',
    addsToStudio: 'Adds soundboard management to Studio.',
  },
  {
    id: 'videos',
    title: 'Videos',
    route: '/studio/videos',
    studioPath: '/studio/videos',
    presentationMode: 'native',
    icon: 'videocam',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['curator'],
    optionalRoles: allExcept('curator'),
    recommendedRoles: ['curator'],
    description: 'Upload and manage creator videos; open advanced editing and distribution in Studio.',
    addsToStudio: 'Adds video publishing controls and the advanced video workspace.',
  },
  {
    id: 'the_plug',
    title: 'THE PLUG',
    studioPath: '/studio/the-plug',
    presentationMode: 'embedded',
    icon: 'article',
    section: 'catalog',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['curator', 'manager'],
    description: 'Manage complete editorial articles, editions, artwork, and publishing state.',
    addsToStudio: 'Adds the editorial publishing workspace to Studio.',
    unavailableReason: 'Open the full editorial workspace securely inside Studio.',
  },
  {
    id: 'analytics_engagement',
    title: 'Analytics',
    route: '/studio/analytics',
    icon: 'insights',
    section: 'growth',
    status: 'native',
    defaultRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ALL_STUDIO_ROLES,
    description: 'Track catalog, audience, live, event, and setup signals in Studio.',
    addsToStudio: 'Adds the analytics overview.',
  },
  {
    id: 'analytics_audience',
    title: 'Audience',
    route: '/studio/analytics',
    icon: 'groups',
    section: 'growth',
    status: 'native',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'dj', 'promoter', 'venue', 'curator', 'manager'],
    description: 'Track follower and audience movement available to mobile.',
    addsToStudio: 'Adds audience signals.',
  },
  {
    id: 'analytics_revenue',
    title: 'Revenue Analytics',
    studioPath: '/studio/analytics/revenue',
    presentationMode: 'embedded',
    icon: 'paid',
    section: 'growth',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'promoter', 'venue', 'manager'],
    description: 'Inspect detailed revenue, attribution, exports, and performance trends.',
    addsToStudio: 'Adds advanced revenue analytics to Studio.',
    unavailableReason: 'Open advanced revenue analytics securely inside Studio.',
  },
  {
    id: 'embeds',
    title: 'Embeds',
    studioPath: '/studio/embeds',
    presentationMode: 'embedded',
    icon: 'code',
    section: 'growth',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'dj', 'curator'],
    description: 'Configure embeddable players, cards, and campaign surfaces.',
    addsToStudio: 'Adds the full embed builder to Studio.',
    unavailableReason: 'Open the full embed builder securely inside Studio.',
  },
  {
    id: 'financials',
    title: 'Financials',
    route: '/studio/financials',
    studioPath: '/studio/financials',
    presentationMode: 'native',
    icon: 'account-balance-wallet',
    section: 'money',
    status: 'limited',
    defaultRoles: ['artist', 'producer', 'promoter', 'venue', 'service_provider', 'manager'],
    optionalRoles: ['dj', 'curator'],
    recommendedRoles: ['artist', 'producer', 'promoter', 'venue', 'manager'],
    description: 'Review Wallet balance, recent activity and payout lifecycle in one place.',
    addsToStudio: 'Adds a financial overview with secure tax and statement tools.',
    unavailableReason: 'Use the financial summary or open the full Financials workspace securely in Studio.',
  },
  {
    id: 'live',
    title: 'Live',
    route: '/live/create',
    icon: 'radio',
    section: 'connect',
    status: 'native',
    defaultRoles: ['dj', 'promoter', 'venue'],
    optionalRoles: ['artist', 'producer', 'curator', 'service_provider', 'manager'],
    recommendedRoles: ['dj', 'artist', 'promoter'],
    description: 'Start live rooms and enter live creation.',
    addsToStudio: 'Adds live creation and room entry.',
  },
  {
    id: 'collaborations',
    title: 'Collaborations',
    studioPath: '/studio/collaborations/gigs',
    presentationMode: 'embedded',
    icon: 'handshake',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['curator', 'service_provider', 'manager'],
    optionalRoles: ['artist', 'producer', 'dj', 'promoter', 'venue'],
    recommendedRoles: ['service_provider', 'manager', 'curator'],
    description: 'Manage opportunities, applications, rooms, and project pipelines.',
    addsToStudio: 'Adds collaboration planning to Studio.',
    unavailableReason: 'Open the full collaboration workspace securely inside Studio.',
  },
  {
    id: 'crm',
    title: 'CRM',
    studioPath: '/studio/crm/contacts',
    presentationMode: 'embedded',
    icon: 'contacts',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['promoter', 'venue', 'service_provider', 'manager'],
    optionalRoles: ['artist', 'producer', 'dj', 'curator'],
    recommendedRoles: ['promoter', 'venue', 'service_provider', 'manager'],
    description: 'Manage contacts, supporters, campaigns, and business relationships.',
    addsToStudio: 'Adds CRM planning to Studio.',
    unavailableReason: 'Open the full CRM workspace securely inside Studio.',
  },
  {
    id: 'store',
    title: 'Store',
    route: '/studio/commerce?tab=store',
    studioPath: '/studio/store',
    presentationMode: 'native',
    icon: 'shopping-bag',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Review owner products, publication state and frequent Store actions in one place.',
    addsToStudio: 'Adds Store summaries with secure inventory and fulfilment tools.',
    unavailableReason: 'Use owner summaries or open the full Store workspace securely in Studio.',
  },
  {
    id: 'my_pluggd',
    title: 'My PLUGGD',
    route: '/studio/my-pluggd',
    icon: 'auto-awesome',
    section: 'account',
    status: 'native',
    alwaysVisible: true,
    description: 'Set up your public identity, page, Connect Card, embeds, and Studio settings.',
    addsToStudio: 'Keeps My PLUGGD setup available in Studio.',
  },
  {
    id: 'storefront',
    title: 'Public Page',
    studioPath: '/studio/storefront/themes',
    presentationMode: 'embedded',
    icon: 'storefront',
    section: 'commerce',
    status: 'web_only',
    defaultRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ALL_STUDIO_ROLES,
    description: 'Build the theme, structure, and presentation of your public creator page.',
    addsToStudio: 'Adds the complete public-page builder.',
    unavailableReason: 'Open the full page builder securely inside Studio.',
  },
  {
    id: 'memberships',
    title: 'Memberships',
    route: '/studio/commerce?tab=memberships',
    studioPath: '/studio/memberships/plans',
    presentationMode: 'native',
    icon: 'workspace-premium',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Review tiers, members, billing status and availability.',
    addsToStudio: 'Adds Membership summaries with secure tier building.',
    unavailableReason: 'Use owner summaries or open the tier builder securely in Studio.',
  },
  {
    id: 'crowdfunding',
    title: 'Crowdfunding',
    studioPath: '/studio/crowdfunding/campaigns',
    presentationMode: 'embedded',
    icon: 'campaign',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Launch campaign pages with rewards, supporters, and funding status.',
    addsToStudio: 'Adds crowdfunding planning to Studio.',
    unavailableReason: 'Open the full campaign workspace securely inside Studio.',
  },
  {
    id: 'courses',
    title: 'Courses',
    studioPath: '/studio/courses/builder',
    presentationMode: 'embedded',
    icon: 'school',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer', 'service_provider'],
    description: 'Build educational products with lessons and learner access.',
    addsToStudio: 'Adds course planning to Studio.',
    unavailableReason: 'Open the full course builder securely inside Studio.',
  },
  {
    id: 'sound_packs',
    title: 'Sound Packs',
    route: '/studio/commerce?tab=packs',
    studioPath: '/studio/catalog?tab=sound-packs',
    presentationMode: 'native',
    icon: 'inventory-2',
    section: 'catalog',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer'],
    description: 'Review owned packs, approval, availability, downloads and pricing in one place.',
    addsToStudio: 'Adds pack summaries with secure asset and licence management.',
    unavailableReason: 'Use owner summaries or open the full Pack workspace securely in Studio.',
  },
  {
    id: 'merch',
    title: 'Merchandise',
    route: '/studio/commerce?tab=store',
    studioPath: '/studio/catalog?tab=merch',
    presentationMode: 'native',
    icon: 'card-giftcard',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'dj'],
    description: 'Review merchandise publication, moderation, stock and sales in one place.',
    addsToStudio: 'Adds Merchandise summaries with secure inventory and fulfilment tools.',
    unavailableReason: 'Use owner summaries or open Merchandise securely in Studio.',
  },
  {
    id: 'bundles',
    title: 'Bundles',
    studioPath: '/studio/catalog?tab=bundles',
    presentationMode: 'embedded',
    icon: 'shopping-basket',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Bundle music, merch, samples, and services into offers.',
    addsToStudio: 'Adds bundle planning to Studio.',
    unavailableReason: 'Open the full bundle builder securely inside Studio.',
  },
  {
    id: 'collectibles',
    title: 'Collectibles',
    studioPath: '/studio/catalog?tab=collectibles',
    presentationMode: 'embedded',
    icon: 'collections-bookmark',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Manage limited digital collectibles, inventory, and readiness.',
    addsToStudio: 'Adds collectible planning to Studio.',
    unavailableReason: 'Open the full Collectibles workspace securely inside Studio.',
  },
  {
    id: 'licenses',
    title: 'Licenses',
    studioPath: '/studio/licenses',
    presentationMode: 'embedded',
    icon: 'verified-user',
    section: 'money',
    status: 'web_only',
    defaultRoles: ['producer'],
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer'],
    description: 'Manage license templates and rights terms for catalog sales.',
    addsToStudio: 'Adds license planning to Studio.',
    unavailableReason: 'Open the full licensing workspace securely inside Studio.',
  },
  {
    id: 'splits',
    title: 'Split Engine',
    route: '/studio/splits',
    icon: 'account-tree',
    section: 'money',
    status: 'native',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'manager'],
    description: 'Create split sheets, payout shares, and collaborator rights records.',
    addsToStudio: 'Adds split planning to Studio.',
    unavailableReason: 'Start and review secure split sheets from the mobile gateway.',
  },
  {
    id: 'connect_card',
    title: 'Connect Card',
    route: '/studio/connect-card',
    icon: 'badge',
    section: 'connect',
    status: 'native',
    defaultRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ALL_STUDIO_ROLES,
    description: 'Build a compact professional card for links, rates, services, and collaboration context.',
    addsToStudio: 'Adds Connect Card owner tools and public-card routing.',
  },
  {
    id: 'plugins',
    title: 'Connected Accounts',
    studioPath: '/studio/plugins/connect',
    presentationMode: 'embedded',
    icon: 'extension',
    section: 'connect',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'dj'],
    description: 'Connect external accounts and integrations for Studio workflows.',
    addsToStudio: 'Adds connected-account planning to Studio.',
    unavailableReason: 'Open the full connected-accounts workspace securely inside Studio.',
  },
  {
    id: 'shows',
    title: 'Shows Manager',
    studioPath: '/studio/shows',
    presentationMode: 'embedded',
    icon: 'calendar-month',
    section: 'operations',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'dj', 'manager'],
    description: 'Manage creator shows, tour dates, widgets, and public show context.',
    addsToStudio: 'Adds the complete Shows workspace.',
    unavailableReason: 'Open the full Shows workspace securely inside Studio.',
  },
  {
    id: 'partnerships',
    title: 'Market',
    studioPath: '/studio/partnerships/marketplace',
    presentationMode: 'embedded',
    icon: 'store',
    section: 'operations',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['manager', 'service_provider'],
    description: 'Manage partnership opportunities, proposals, and deal operations.',
    addsToStudio: 'Adds the complete partnership workspace.',
    unavailableReason: 'Open the full partnership workspace securely inside Studio.',
  },
  {
    id: 'studio_apps',
    title: 'Studio Apps',
    route: '/studio/apps',
    icon: 'apps',
    section: 'account',
    status: 'native',
    alwaysVisible: true,
    description: 'Plug additional Studio modules into your workspace as your workflow grows.',
    addsToStudio: 'Keeps Studio Apps available in Studio.',
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/settings/privacy',
    icon: 'settings',
    section: 'account',
    status: 'limited',
    alwaysVisible: true,
    description: 'Manage account privacy, profile basics, and data settings.',
    addsToStudio: 'Adds account privacy and settings. Advanced defaults open inside Studio.',
  },
];

const STUDIO_MODULE_MAP = new Map(STUDIO_MODULES.map((module) => [module.id, module]));

function isStudioRole(role: EcosystemRole): role is StudioRole {
  return role !== 'fan';
}

function resolvePrimaryRole(roles: EcosystemRole[]): StudioRole {
  return roles.find(isStudioRole) ?? 'artist';
}

function moduleHasRole(roles: StudioRole[] | undefined, role: StudioRole) {
  return Boolean(roles?.includes(role));
}

function isStudioModuleId(value: unknown): value is StudioModuleId {
  return typeof value === 'string' && STUDIO_MODULE_MAP.has(value as StudioModuleId);
}

function normalizeModuleIds(moduleIds: readonly unknown[]): StudioModuleId[] {
  return Array.from(new Set(moduleIds.filter(isStudioModuleId)));
}

const ALL_STUDIO_MODULE_IDS = STUDIO_MODULES.map((module) => module.id);

export function isAllowlistedStudioPath(value: string) {
  return value === '/studio' || value.startsWith('/studio/') || value.startsWith('/studio?');
}

export function buildEmbeddedStudioRoute(
  studioPath: string,
  title: string,
  returnTo = '/studio/apps',
) {
  if (!isAllowlistedStudioPath(studioPath)) {
    throw new Error(`Unsupported Studio destination: ${studioPath}`);
  }
  return `/studio/browser?targetPath=${encodeURIComponent(studioPath)}&title=${encodeURIComponent(title)}&returnTo=${encodeURIComponent(returnTo)}`;
}

async function loadEnabledStudioModules(userId: string | null | undefined) {
  if (!userId) {
    return {
      moduleIds: await readLocalStudioModulePreferences(userId, isStudioModuleId),
      synced: false,
      error: null,
    };
  }
  return loadServerStudioModulePreferences({
    userId,
    allModuleIds: ALL_STUDIO_MODULE_IDS,
    isValid: isStudioModuleId,
  });
}

export async function writeEnabledStudioModules(userId: string | null | undefined, moduleIds: readonly StudioModuleId[]) {
  const normalized = normalizeModuleIds(moduleIds);
  if (!userId) return cacheStudioModulePreferences(userId, normalized);
  return saveServerStudioModulePreferences({
    userId,
    moduleIds: normalized,
    allModuleIds: ALL_STUDIO_MODULE_IDS,
  });
}

export async function setStudioModulePlugged(userId: string | null | undefined, moduleId: StudioModuleId, plugged: boolean) {
  const current = (await loadEnabledStudioModules(userId)).moduleIds;
  const next = plugged
    ? Array.from(new Set([...current, moduleId]))
    : current.filter((id) => id !== moduleId);
  return writeEnabledStudioModules(userId, next);
}

function buildModuleStates(primaryRole: StudioRole, enabledModuleIds: StudioModuleId[]): StudioModuleState[] {
  const enabledSet = new Set(enabledModuleIds);
  return STUDIO_MODULES.map((module) => {
    const defaultForRole = Boolean(module.alwaysVisible || moduleHasRole(module.defaultRoles, primaryRole));
    const recommendedForRole = moduleHasRole(module.recommendedRoles, primaryRole);
    const presentationMode = module.presentationMode ?? (module.status === 'web_only' ? 'embedded' : 'native');
    const route = presentationMode === 'embedded' && module.studioPath
      ? buildEmbeddedStudioRoute(module.studioPath, module.title)
      : module.route;
    return {
      ...module,
      route,
      presentationMode,
      plugged: defaultForRole || enabledSet.has(module.id),
      defaultForRole,
      recommendedForRole,
    };
  });
}

function displayName(profile: NavProfile | null) {
  return profile?.display_name || profile?.full_name || profile?.username || 'creator';
}

function compactDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function latestDate(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function catalogLabel(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function catalogFacts(...facts: Array<{ label: string; value?: string | number | null | false }>) {
  return facts
    .filter((fact): fact is { label: string; value: string | number } => fact.value !== null && fact.value !== undefined && fact.value !== '' && fact.value !== false)
    .map((fact) => ({ label: fact.label, value: String(fact.value) }));
}

function buildSetupTasks(input: {
  profile: NavProfile | null;
  catalogCount: number;
  connectProfile: StudioConnectProfile | null;
  eventCount: number;
  liveCount: number;
  audienceCount: number;
}): StudioSetupTask[] {
  return [
    {
      id: 'identity',
      title: 'Profile',
      detail: input.profile?.username ? `@${input.profile.username}` : 'Add username and public profile fields',
      complete: Boolean(input.profile?.username && (input.profile?.display_name || input.profile?.full_name)),
      route: '/edit-profile',
    },
    {
      id: 'catalog',
      title: 'Catalog',
      detail: input.catalogCount > 0 ? `${formatCompact(input.catalogCount)} assets visible` : 'Plug in the catalog module for your role',
      complete: input.catalogCount > 0,
      route: '/studio/apps',
    },
    {
      id: 'connect-card',
      title: 'Connect Card',
      detail: input.connectProfile?.slug ? 'Public card route is ready' : 'Set up public business contact',
      complete: Boolean(input.connectProfile?.slug),
      route: '/studio/connect-card',
    },
    {
      id: 'programming',
      title: 'Programming',
      detail: input.eventCount || input.liveCount ? `${formatCompact(input.eventCount + input.liveCount)} events or live rooms` : 'Add events or start a live room',
      complete: input.eventCount > 0 || input.liveCount > 0,
      route: input.eventCount > 0 ? '/creator/events' : '/live/create',
    },
    {
      id: 'audience',
      title: 'Audience',
      detail: input.audienceCount > 0 ? `${formatCompact(input.audienceCount)} followers` : 'Audience signals will appear after fans follow or buy',
      complete: input.audienceCount > 0,
      route: '/studio/analytics',
    },
  ];
}

function buildNextMove(tasks: StudioSetupTask[], primaryRole: StudioRole): StudioAction {
  const firstOpen = tasks.find((task) => !task.complete);
  if (firstOpen) {
    return {
      id: firstOpen.id,
      title: firstOpen.title,
      detail: firstOpen.detail,
      route: firstOpen.route,
      icon: firstOpen.id === 'catalog' ? 'apps' : firstOpen.id === 'connect-card' ? 'badge' : 'arrow-upward',
      status: 'native',
    };
  }

  if (primaryRole === 'promoter' || primaryRole === 'venue' || primaryRole === 'dj') {
    return {
      id: 'events',
      title: 'Review upcoming events',
      detail: 'Keep programming, ticket context, and live moments current.',
      route: '/creator/events',
      icon: 'event',
      status: 'native',
    };
  }

  return {
    id: 'analytics',
    title: 'Read the audience signal',
    detail: 'Review catalog, audience, live, and setup movement.',
    route: '/studio/analytics',
    icon: 'insights',
    status: 'native',
  };
}

function buildNativeActions(modules: StudioModuleState[], primaryRole: StudioRole): StudioAction[] {
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const candidateIds: StudioModuleId[] = [
    'live',
    'events',
    'soundboards',
    'connect_card',
    'my_pluggd',
    primaryRole === 'producer' ? 'beats' : primaryRole === 'dj' ? 'mixes' : 'releases',
  ];

  return candidateIds
    .map((id) => moduleById.get(id))
    .filter((module): module is StudioModuleState => Boolean(module && module.route && module.status !== 'web_only'))
    .map((module) => ({
      id: module.id,
      title: module.shortTitle || module.title,
      detail: module.status === 'limited' ? module.addsToStudio : module.description,
      route: module.route,
      icon: module.icon,
      status: module.status,
    }));
}

function buildWebOnlyActions(modules: StudioModuleState[]): StudioAction[] {
  return modules
    .filter((module) => module.status === 'web_only')
    .filter((module) => module.plugged || module.recommendedForRole || module.id === 'licenses' || module.id === 'splits')
    .slice(0, 8)
    .map((module) => ({
      id: module.id,
      title: module.title,
      detail: module.unavailableReason || module.addsToStudio,
      route: module.route,
      icon: module.icon,
      status: 'web_only',
      unavailableReason: module.unavailableReason,
    }));
}

function mapCatalogItems(input: {
  releases: ReleaseRow[];
  beats: BeatRow[];
  mixes: MixRow[];
  soundboards: SoundboardRow[];
  events: EventRow[];
}): StudioCatalogItem[] {
  const releases = input.releases.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled release',
    subtitle: item.artist || 'Release',
    route: `/studio/catalog/release/${item.id}`,
    imageUrl: item.cover_art_url,
    createdAt: item.created_at,
    kind: 'release',
    managementFacts: catalogFacts(
      { label: 'Status', value: catalogLabel(item.status || item.approval_status || item.distribution_status) || (item.approved ? 'Approved' : 'Draft') },
      { label: 'Format', value: catalogLabel(item.release_type) },
      { label: 'Release date', value: compactDate(item.release_date) },
      { label: 'Genre', value: item.genre },
      { label: 'Plays', value: item.total_plays ? formatCompact(item.total_plays) : null },
      { label: 'Lyrics', value: 'Managed per track' },
    ),
  }));
  const beats = input.beats.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled beat',
    subtitle: item.producer_name || 'Beat',
    route: `/studio/catalog/beat/${item.id}`,
    imageUrl: item.image_url,
    createdAt: item.created_at,
    kind: 'beat',
    managementFacts: catalogFacts(
      { label: 'Status', value: item.is_published ? 'Published' : catalogLabel(item.moderation_status) || 'Draft' },
      { label: 'Genre', value: item.genre },
      { label: 'BPM', value: item.bpm },
      { label: 'Key', value: item.key },
      { label: 'Price', value: typeof item.price === 'number' ? `£${item.price.toFixed(2)}` : null },
    ),
  }));
  const mixes = input.mixes.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled mix',
    subtitle: 'Mix',
    route: `/studio/catalog/mix/${item.id}`,
    imageUrl: item.cover_url,
    createdAt: item.published_at || item.created_at,
    kind: 'mix',
    managementFacts: catalogFacts(
      { label: 'Status', value: catalogLabel(item.status) || (item.published_at ? 'Published' : 'Draft') },
      { label: 'Visibility', value: catalogLabel(item.visibility) },
      { label: 'Published', value: compactDate(item.published_at) },
      { label: 'Location', value: item.city },
      { label: 'Format', value: catalogLabel(item.recording_type) },
      { label: 'Plays', value: item.play_count ? formatCompact(item.play_count) : null },
    ),
  }));
  const soundboards = input.soundboards.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled soundboard',
    subtitle: item.item_count ? `${formatCompact(item.item_count)} items` : 'Soundboard',
    route: `/studio/soundboards/${item.slug || item.id}`,
    imageUrl: item.cover_image_url,
    createdAt: item.last_activity_at || item.created_at,
    kind: 'soundboard',
  }));
  const events = input.events.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled event',
    subtitle: [compactDate(item.starts_at), item.location].filter(Boolean).join(' · ') || 'Event',
    route: '/creator/events',
    imageUrl: item.cover_image_url,
    createdAt: item.starts_at || item.created_at,
    kind: 'event',
  }));

  return [...releases, ...beats, ...mixes, ...soundboards, ...events]
    .sort((a, b) => latestDate(b.createdAt) - latestDate(a.createdAt));
}

function emptyStats(): StudioStats {
  return {
    catalogCount: 0,
    releaseCount: 0,
    beatCount: 0,
    mixCount: 0,
    soundboardCount: 0,
    videoCount: 0,
    eventCount: 0,
    liveCount: 0,
    audienceCount: 0,
    connectCardCount: 0,
    healthPercent: 0,
    completedTasks: 0,
    totalTasks: 5,
  };
}

export function studioCreatorName(data: StudioData) {
  return displayName(data.profile);
}

/**
 * Simulator-only fixture used to visually QA authenticated Studio surfaces
 * without weakening the production creator-access gate.
 */
export function createStudioPreviewData(): StudioData {
  const profile: NavProfile = {
    display_name: 'Ari Vale',
    full_name: 'Ari Vale',
    username: 'arivale',
    bio: 'Electronic artist and producer.',
    avatar_url: null,
    cover_image_url: null,
    custom_url: 'arivale',
    website_url: 'https://pluggd.com',
    instagram_url: null,
    twitter_url: null,
    youtube_url: null,
    tiktok_url: null,
    soundcloud_url: null,
    spotify_url: null,
    embed_settings: null,
    user_type: 'creator',
    profile_type: 'artist',
    is_creator: true,
    is_label: false,
    onboarding_progress: 80,
  };
  const primaryRole: StudioRole = 'artist';
  const enabledModuleIds: StudioModuleId[] = ['events', 'soundboards', 'analytics_audience', 'memberships'];
  const modules = buildModuleStates(primaryRole, enabledModuleIds);
  const catalogItems: StudioCatalogItem[] = [
    { id: 'preview-release', title: 'Afterimage', subtitle: 'Release · 18 Jul', route: '/studio/catalog?tab=releases&item=preview-release', kind: 'release', createdAt: '2026-07-18T12:00:00Z' },
    { id: 'preview-mix', title: 'Night Signal 004', subtitle: 'Mix · 11 Jul', route: '/studio/catalog?tab=mixes&item=preview-mix', kind: 'mix', createdAt: '2026-07-11T12:00:00Z' },
    { id: 'preview-board', title: 'Warehouse Heat', subtitle: '12 items', route: '/studio/soundboards/preview-board', kind: 'soundboard', createdAt: '2026-06-21T12:00:00Z' },
    { id: 'preview-event', title: 'Signal Room: London', subtitle: '2 Aug · Dalston', route: '/creator/events', kind: 'event', createdAt: '2026-05-09T12:00:00Z' },
  ];
  const connectProfile: StudioConnectProfile = {
    id: 'preview-connect',
    slug: 'arivale',
    display_name: 'Ari Vale',
    headline: 'Artist · producer · London',
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };
  const setupTasks = buildSetupTasks({
    profile,
    catalogCount: 8,
    connectProfile,
    eventCount: 2,
    liveCount: 1,
    audienceCount: 1284,
  });
  const stats: StudioStats = {
    catalogCount: 8,
    releaseCount: 3,
    beatCount: 1,
    mixCount: 2,
    soundboardCount: 2,
    videoCount: 1,
    eventCount: 2,
    liveCount: 1,
    audienceCount: 1284,
    connectCardCount: 1,
    completedTasks: setupTasks.filter((task) => task.complete).length,
    totalTasks: setupTasks.length,
    healthPercent: 86,
  };

  return {
    signedIn: true,
    userId: 'studio-preview',
    creatorAccess: true,
    profile,
    roles: ['artist', 'producer'],
    primaryRole,
    enabledModuleIds,
    modulePreferencesSynced: true,
    modulePreferencesError: null,
    modules,
    stats,
    catalogItems,
    connectProfile,
    setupTasks,
    nextMove: buildNextMove(setupTasks, primaryRole),
    nativeActions: buildNativeActions(modules, primaryRole),
    webOnlyActions: buildWebOnlyActions(modules),
  };
}

export async function loadStudioData(): Promise<StudioData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const enabledModuleIds = await readLocalStudioModulePreferences(null, isStudioModuleId);
    const modules = buildModuleStates('artist', enabledModuleIds);
    return {
      signedIn: false,
      userId: null,
      creatorAccess: false,
      profile: null,
      roles: ['fan'],
      primaryRole: 'artist',
      enabledModuleIds,
      modulePreferencesSynced: false,
      modulePreferencesError: null,
      modules,
      stats: emptyStats(),
      catalogItems: [],
      connectProfile: null,
      setupTasks: buildSetupTasks({ profile: null, catalogCount: 0, connectProfile: null, eventCount: 0, liveCount: 0, audienceCount: 0 }),
      nextMove: {
        id: 'sign-in',
        title: 'Sign in',
        detail: 'Open a creator account to use Studio.',
        route: '/auth/login',
        icon: 'login',
        status: 'native',
      },
      nativeActions: [{ id: 'sign-in', title: 'Sign in', detail: 'Open your account.', route: '/auth/login', icon: 'login', status: 'native' }],
      webOnlyActions: [],
    };
  }

  const [profile, roleRows, modulePreferences] = await Promise.all([
    safeMaybe<ProfileRow>(
      (supabase as any)
        .from('profiles')
        .select('id,user_id,full_name,username,avatar_url,cover_image_url,bio,custom_url,website_url,instagram_url,twitter_url,youtube_url,tiktok_url,soundcloud_url,spotify_url,embed_settings,user_type,profile_type,is_creator,is_label,onboarding_progress,city')
        .eq('user_id', userId)
        .maybeSingle(),
    ),
    safeList<ProfileRoleRow>((supabase as any).from('profile_roles').select('role,is_primary').eq('user_id', userId)),
    loadEnabledStudioModules(userId),
  ]);

  const enabledModuleIds = modulePreferences.moduleIds;

  const roles = resolveProfileRoles(profile, roleRows);
  const primaryRole = resolvePrimaryRole(roles);
  const creatorAccess = hasCreatorAccess(roles);
  const modules = buildModuleStates(primaryRole, enabledModuleIds);

  const [releases, beats, mixes, soundboards, videos, events, lives, followers, connectProfiles] = await Promise.all([
    safeList<ReleaseRow>((supabase as any).from('releases').select('id,title,artist,cover_art_url,created_at,release_date,release_type,genre,status,approval_status,distribution_status,approved,total_plays').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<BeatRow>((supabase as any).from('beats').select('id,title,producer_name,image_url,created_at,genre,bpm,key,price,is_published,moderation_status').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<MixRow>((supabase as any).from('mixes').select('id,slug,title,cover_url,published_at,created_at,city,recording_type,duration_seconds,play_count,status,visibility').eq('owner_user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<SoundboardRow>((supabase as any).from('soundboards').select('id,slug,title,cover_image_url,item_count,last_activity_at,created_at').eq('creator_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<{ id: string }>((supabase as any).from('creator_videos').select('id').eq('user_id', userId).limit(100)),
    safeList<EventRow>((supabase as any).from('events').select('id,title,cover_image_url,starts_at,location,created_at').eq('created_by', userId).order('starts_at', { ascending: false }).limit(20)),
    safeList<{ id: string }>((supabase as any).from('session_rooms').select('id').eq('creator_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('user_follows').select('id').eq('following_id', userId).limit(1000)),
    safeList<StudioConnectProfile>((supabase as any).from('connect_profiles').select('id,slug,display_name,headline,avatar_url,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)),
  ]);

  const catalogItems = mapCatalogItems({ releases, beats, mixes, soundboards, events });
  const connectProfile = connectProfiles[0] ?? null;
  const catalogCount = releases.length + beats.length + mixes.length + soundboards.length + videos.length;
  const setupTasks = buildSetupTasks({
    profile,
    catalogCount,
    connectProfile,
    eventCount: events.length,
    liveCount: lives.length,
    audienceCount: followers.length,
  });
  const completedTasks = setupTasks.filter((task) => task.complete).length;
  const stats: StudioStats = {
    catalogCount,
    releaseCount: releases.length,
    beatCount: beats.length,
    mixCount: mixes.length,
    soundboardCount: soundboards.length,
    videoCount: videos.length,
    eventCount: events.length,
    liveCount: lives.length,
    audienceCount: followers.length,
    connectCardCount: connectProfiles.length,
    completedTasks,
    totalTasks: setupTasks.length,
    healthPercent: Math.round((completedTasks / Math.max(1, setupTasks.length)) * 100),
  };

  return {
    signedIn: true,
    userId,
    creatorAccess,
    profile,
    roles,
    primaryRole,
    enabledModuleIds,
    modulePreferencesSynced: modulePreferences.synced,
    modulePreferencesError: modulePreferences.error,
    modules,
    stats,
    catalogItems,
    connectProfile,
    setupTasks,
    nextMove: buildNextMove(setupTasks, primaryRole),
    nativeActions: buildNativeActions(modules, primaryRole),
    webOnlyActions: buildWebOnlyActions(modules),
  };
}
