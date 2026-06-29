import AsyncStorage from '@react-native-async-storage/async-storage';
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

export type StudioRole = Exclude<EcosystemRole, 'fan'>;

export type StudioModuleStatus = 'native' | 'limited' | 'web_only';

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
  | 'venues'
  | 'soundboards'
  | 'videos'
  | 'analytics_engagement'
  | 'analytics_audience'
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
};

type BeatRow = {
  id: string;
  title?: string | null;
  producer_name?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

type MixRow = {
  id: string;
  slug?: string | null;
  title?: string | null;
  cover_url?: string | null;
  created_at?: string | null;
  published_at?: string | null;
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

const STUDIO_ENABLED_MODULES_STORAGE_PREFIX = 'pluggd:studio-enabled-modules';

export const STUDIO_MODULES: StudioModuleDefinition[] = [
  {
    id: 'upload_release',
    title: 'Upload Release',
    shortTitle: 'Release',
    icon: 'cloud-upload',
    section: 'create',
    status: 'web_only',
    defaultRoles: ['artist'],
    description: 'Prepare release drafts, tracks, artwork, credits, and rights context.',
    addsToStudio: 'Adds release planning to Studio.',
    unavailableReason: 'Use desktop Studio for release upload, distribution, tax, and rights submission.',
  },
  {
    id: 'upload_beat',
    title: 'Upload Beat',
    shortTitle: 'Beat',
    icon: 'cloud-upload',
    section: 'create',
    status: 'web_only',
    defaultRoles: ['producer'],
    description: 'Prepare beat audio, artwork, previews, and license tiers.',
    addsToStudio: 'Adds beat planning to Studio.',
    unavailableReason: 'Use desktop Studio for beat license setup and checkout.',
  },
  {
    id: 'upload_mix',
    title: 'Upload Mix',
    shortTitle: 'Mix',
    icon: 'cloud-upload',
    section: 'create',
    status: 'web_only',
    defaultRoles: ['dj'],
    description: 'Prepare DJ mixes, artwork, tracklist context, and publishing state.',
    addsToStudio: 'Adds mix planning to Studio.',
    unavailableReason: 'Use desktop Studio for mix upload and advanced audio management.',
  },
  {
    id: 'releases',
    title: 'Releases',
    route: '/releases',
    icon: 'library-music',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['artist'],
    optionalRoles: allExcept('artist'),
    recommendedRoles: ['artist', 'manager'],
    description: 'Review release marketplace visibility and owned catalog presence.',
    addsToStudio: 'Adds release overview. Use desktop Studio for builder, distribution, exports, and rights.',
  },
  {
    id: 'beats',
    title: 'Beat Store',
    shortTitle: 'Beats',
    route: '/market/beats',
    icon: 'headset',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['producer'],
    optionalRoles: allExcept('producer'),
    recommendedRoles: ['producer', 'artist'],
    description: 'Review beat inventory and buyer-facing previews.',
    addsToStudio: 'Adds beat-market visibility. Use desktop Studio for license purchasing.',
  },
  {
    id: 'mixes',
    title: 'Mixes',
    route: '/mixes',
    icon: 'album',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['dj'],
    optionalRoles: allExcept('dj'),
    recommendedRoles: ['dj', 'curator'],
    description: 'Review mix catalog, public pages, and listening surfaces.',
    addsToStudio: 'Adds mix visibility. Use desktop Studio for upload and advanced edits.',
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
    icon: 'location-on',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['promoter', 'venue'],
    optionalRoles: ['dj', 'manager'],
    recommendedRoles: ['venue', 'promoter'],
    description: 'Manage venue context, booking details, and event operations.',
    addsToStudio: 'Adds venue planning to Studio.',
    unavailableReason: 'Use desktop Studio for venue management.',
  },
  {
    id: 'soundboards',
    title: 'Soundboards',
    route: '/soundboards',
    icon: 'view-list',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['artist', 'producer', 'dj', 'curator'],
    optionalRoles: allExcept('artist', 'producer', 'dj', 'curator'),
    recommendedRoles: ['artist', 'producer', 'dj', 'curator'],
    description: 'Review soundboards, references, ideas, and community feedback.',
    addsToStudio: 'Adds soundboard browsing. Full creation lives in desktop Studio.',
  },
  {
    id: 'videos',
    title: 'Videos',
    icon: 'videocam',
    section: 'catalog',
    status: 'limited',
    defaultRoles: ['curator'],
    optionalRoles: allExcept('curator'),
    recommendedRoles: ['curator'],
    description: 'Review editorial and creator video surfaces.',
    addsToStudio: 'Adds video visibility. Use desktop Studio for video upload tools.',
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
    id: 'financials',
    title: 'Financials',
    route: '/wallet',
    icon: 'account-balance-wallet',
    section: 'money',
    status: 'limited',
    defaultRoles: ['artist', 'producer', 'promoter', 'venue', 'service_provider', 'manager'],
    optionalRoles: ['dj', 'curator'],
    recommendedRoles: ['artist', 'producer', 'promoter', 'venue', 'manager'],
    description: 'Open wallet and credit context.',
    addsToStudio: 'Adds wallet access. Use desktop Studio for payouts, tax, statements, and exports.',
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
    icon: 'handshake',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['curator', 'service_provider', 'manager'],
    optionalRoles: ['artist', 'producer', 'dj', 'promoter', 'venue'],
    recommendedRoles: ['service_provider', 'manager', 'curator'],
    description: 'Manage opportunities, applications, rooms, and project pipelines.',
    addsToStudio: 'Adds collaboration planning to Studio.',
    unavailableReason: 'Use desktop Studio for collaboration workflows.',
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: 'contacts',
    section: 'operations',
    status: 'web_only',
    defaultRoles: ['promoter', 'venue', 'service_provider', 'manager'],
    optionalRoles: ['artist', 'producer', 'dj', 'curator'],
    recommendedRoles: ['promoter', 'venue', 'service_provider', 'manager'],
    description: 'Manage contacts, supporters, campaigns, and business relationships.',
    addsToStudio: 'Adds CRM planning to Studio.',
    unavailableReason: 'Use desktop Studio for CRM.',
  },
  {
    id: 'store',
    title: 'Store',
    route: '/market/store',
    icon: 'shopping-bag',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Review store and merch-facing market surfaces.',
    addsToStudio: 'Adds store visibility. Use desktop Studio for inventory, orders, and fulfillment.',
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
    route: '/profile',
    icon: 'storefront',
    section: 'commerce',
    status: 'limited',
    defaultRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ALL_STUDIO_ROLES,
    description: 'Review profile and public-page readiness.',
    addsToStudio: 'Adds public identity access. Use desktop Studio for theme building.',
  },
  {
    id: 'memberships',
    title: 'Memberships',
    route: '/membership',
    icon: 'workspace-premium',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Review membership surfaces where available.',
    addsToStudio: 'Adds membership visibility. Use desktop Studio for tiers and subscriber tools.',
  },
  {
    id: 'crowdfunding',
    title: 'Crowdfunding',
    icon: 'campaign',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Launch campaign pages with rewards, supporters, and funding status.',
    addsToStudio: 'Adds crowdfunding planning to Studio.',
    unavailableReason: 'Use desktop Studio for campaign creation and checkout.',
  },
  {
    id: 'courses',
    title: 'Courses',
    icon: 'school',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer', 'service_provider'],
    description: 'Build educational products with lessons and learner access.',
    addsToStudio: 'Adds course planning to Studio.',
    unavailableReason: 'Use desktop Studio for course building.',
  },
  {
    id: 'sound_packs',
    title: 'Sound Packs',
    route: '/sample-packs',
    icon: 'inventory-2',
    section: 'catalog',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer'],
    description: 'Review sample packs and producer-facing catalog visibility.',
    addsToStudio: 'Adds sound-pack visibility. Use desktop Studio for pack upload and pricing.',
  },
  {
    id: 'merch',
    title: 'Merchandise',
    route: '/market/store',
    icon: 'card-giftcard',
    section: 'commerce',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'dj'],
    description: 'Review merchandise and store product visibility.',
    addsToStudio: 'Adds merch visibility. Use desktop Studio for fulfillment and inventory.',
  },
  {
    id: 'bundles',
    title: 'Bundles',
    icon: 'shopping-basket',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Bundle music, merch, samples, and services into offers.',
    addsToStudio: 'Adds bundle planning to Studio.',
    unavailableReason: 'Use desktop Studio for bundle creation.',
  },
  {
    id: 'collectibles',
    title: 'Collectibles',
    icon: 'collections-bookmark',
    section: 'commerce',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer'],
    description: 'Manage limited digital collectibles, inventory, and readiness.',
    addsToStudio: 'Adds collectible planning to Studio.',
    unavailableReason: 'Use desktop Studio for collectible inventory and checkout.',
  },
  {
    id: 'licenses',
    title: 'Licenses',
    icon: 'verified-user',
    section: 'money',
    status: 'web_only',
    defaultRoles: ['producer'],
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['producer'],
    description: 'Manage license templates and rights terms for catalog sales.',
    addsToStudio: 'Adds license planning to Studio.',
    unavailableReason: 'Use desktop Studio for license templates and purchasing setup.',
  },
  {
    id: 'splits',
    title: 'Split Engine',
    icon: 'account-tree',
    section: 'money',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'manager'],
    description: 'Create split sheets, payout shares, and collaborator rights records.',
    addsToStudio: 'Adds split planning to Studio.',
    unavailableReason: 'Use desktop Studio for split sheets and legal details.',
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
    icon: 'extension',
    section: 'connect',
    status: 'web_only',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'producer', 'dj'],
    description: 'Connect external accounts and integrations for Studio workflows.',
    addsToStudio: 'Adds connected-account planning to Studio.',
    unavailableReason: 'Use desktop Studio for connected-account setup.',
  },
  {
    id: 'shows',
    title: 'Shows Manager',
    route: '/creator/events',
    icon: 'calendar-month',
    section: 'operations',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['artist', 'dj', 'manager'],
    description: 'Manage creator shows, tour dates, and public show context.',
    addsToStudio: 'Adds event and show visibility. Use desktop Studio for full show widgets.',
  },
  {
    id: 'partnerships',
    title: 'Market',
    route: '/market',
    icon: 'store',
    section: 'operations',
    status: 'limited',
    optionalRoles: ALL_STUDIO_ROLES,
    recommendedRoles: ['manager', 'service_provider'],
    description: 'Review marketplace and partnership opportunities.',
    addsToStudio: 'Adds market access. Use desktop Studio for partnership deal operations.',
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
    addsToStudio: 'Adds account settings. Use desktop Studio for defaults and legal documents.',
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

function storageKey(userId: string | null | undefined) {
  return `${STUDIO_ENABLED_MODULES_STORAGE_PREFIX}:${userId || 'anonymous'}`;
}

function isStudioModuleId(value: unknown): value is StudioModuleId {
  return typeof value === 'string' && STUDIO_MODULE_MAP.has(value as StudioModuleId);
}

function normalizeModuleIds(moduleIds: readonly unknown[]): StudioModuleId[] {
  return Array.from(new Set(moduleIds.filter(isStudioModuleId)));
}

async function readEnabledStudioModules(userId: string | null | undefined): Promise<StudioModuleId[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeModuleIds(parsed) : [];
  } catch {
    return [];
  }
}

export async function writeEnabledStudioModules(userId: string | null | undefined, moduleIds: readonly StudioModuleId[]) {
  const normalized = normalizeModuleIds(moduleIds);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
}

export async function setStudioModulePlugged(userId: string | null | undefined, moduleId: StudioModuleId, plugged: boolean) {
  const current = await readEnabledStudioModules(userId);
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
    return {
      ...module,
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
    route: `/release/${item.id}`,
    imageUrl: item.cover_art_url,
    createdAt: item.created_at,
    kind: 'release',
  }));
  const beats = input.beats.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled beat',
    subtitle: item.producer_name || 'Beat',
    route: `/beat/${item.id}`,
    imageUrl: item.image_url,
    createdAt: item.created_at,
    kind: 'beat',
  }));
  const mixes = input.mixes.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled mix',
    subtitle: 'Mix',
    route: `/mixes/${item.slug || item.id}`,
    imageUrl: item.cover_url,
    createdAt: item.published_at || item.created_at,
    kind: 'mix',
  }));
  const soundboards = input.soundboards.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled soundboard',
    subtitle: item.item_count ? `${formatCompact(item.item_count)} items` : 'Soundboard',
    route: `/soundboards/${item.slug || item.id}`,
    imageUrl: item.cover_image_url,
    createdAt: item.last_activity_at || item.created_at,
    kind: 'soundboard',
  }));
  const events = input.events.map<StudioCatalogItem>((item) => ({
    id: item.id,
    title: item.title || 'Untitled event',
    subtitle: [compactDate(item.starts_at), item.location].filter(Boolean).join(' · ') || 'Event',
    route: `/events/${item.id}`,
    imageUrl: item.cover_image_url,
    createdAt: item.starts_at || item.created_at,
    kind: 'event',
  }));

  return [...releases, ...beats, ...mixes, ...soundboards, ...events]
    .sort((a, b) => latestDate(b.createdAt) - latestDate(a.createdAt))
    .slice(0, 12);
}

function emptyStats(): StudioStats {
  return {
    catalogCount: 0,
    releaseCount: 0,
    beatCount: 0,
    mixCount: 0,
    soundboardCount: 0,
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

export async function loadStudioData(): Promise<StudioData> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const enabledModuleIds = await readEnabledStudioModules(null);
    const modules = buildModuleStates('artist', enabledModuleIds);
    return {
      signedIn: false,
      userId: null,
      creatorAccess: false,
      profile: null,
      roles: ['fan'],
      primaryRole: 'artist',
      enabledModuleIds,
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

  const [profile, roleRows, enabledModuleIds] = await Promise.all([
    safeMaybe<ProfileRow>(
      (supabase as any)
        .from('profiles')
        .select('id,user_id,display_name,full_name,username,avatar_url,cover_image_url,bio,custom_url,website_url,instagram_url,twitter_url,youtube_url,tiktok_url,soundcloud_url,spotify_url,embed_settings,user_type,profile_type,is_creator,is_label,onboarding_progress,city')
        .eq('user_id', userId)
        .maybeSingle(),
    ),
    safeList<ProfileRoleRow>((supabase as any).from('profile_roles').select('role,is_primary').eq('user_id', userId)),
    readEnabledStudioModules(userId),
  ]);

  const roles = resolveProfileRoles(profile, roleRows);
  const primaryRole = resolvePrimaryRole(roles);
  const creatorAccess = hasCreatorAccess(roles);
  const modules = buildModuleStates(primaryRole, enabledModuleIds);

  const [releases, beats, mixes, soundboards, events, lives, followers, connectProfiles] = await Promise.all([
    safeList<ReleaseRow>((supabase as any).from('releases').select('id,title,artist,cover_art_url,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<BeatRow>((supabase as any).from('beats').select('id,title,producer_name,image_url,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<MixRow>((supabase as any).from('mixes').select('id,slug,title,cover_url,published_at,created_at').eq('creator_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<SoundboardRow>((supabase as any).from('soundboards').select('id,slug,title,cover_image_url,item_count,last_activity_at,created_at').eq('creator_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<EventRow>((supabase as any).from('events').select('id,title,cover_image_url,starts_at,location,created_at').eq('created_by', userId).order('starts_at', { ascending: false }).limit(20)),
    safeList<{ id: string }>((supabase as any).from('session_rooms').select('id').eq('creator_id', userId).limit(100)),
    safeList<{ id: string }>((supabase as any).from('user_follows').select('id').eq('following_id', userId).limit(1000)),
    safeList<StudioConnectProfile>((supabase as any).from('connect_profiles').select('id,slug,display_name,headline,avatar_url,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)),
  ]);

  const catalogItems = mapCatalogItems({ releases, beats, mixes, soundboards, events });
  const connectProfile = connectProfiles[0] ?? null;
  const catalogCount = releases.length + beats.length + mixes.length + soundboards.length;
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
