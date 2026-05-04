export const PLUGGD_ORANGE = '#FF5200';

export type EcosystemRole =
  | 'artist'
  | 'producer'
  | 'dj'
  | 'promoter'
  | 'venue'
  | 'curator'
  | 'service_provider'
  | 'manager'
  | 'fan';

export type NavProfile = {
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  user_type?: string | null;
  profile_type?: string | null;
  is_creator?: boolean | null;
  is_label?: boolean | null;
  onboarding_progress?: unknown;
};

export type ProfileRoleRow = {
  role?: string | null;
  is_primary?: boolean | null;
};

export type CreateActionKey =
  | 'release'
  | 'beat'
  | 'mix'
  | 'soundboard'
  | 'event'
  | 'live'
  | 'studio';

export type CreateAction = {
  key: CreateActionKey;
  label: string;
  route: string;
};

const ROLE_SET = new Set<EcosystemRole>([
  'artist',
  'producer',
  'dj',
  'promoter',
  'venue',
  'curator',
  'service_provider',
  'manager',
  'fan',
]);

const CREATOR_ROLES = new Set<EcosystemRole>([
  'artist',
  'producer',
  'dj',
  'promoter',
  'venue',
  'curator',
  'service_provider',
  'manager',
]);

export function normalizeRole(value?: string | null): EcosystemRole | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_');
  if (normalized === 'creator') return 'artist';
  if (normalized === 'industry') return 'promoter';
  return ROLE_SET.has(normalized as EcosystemRole) ? (normalized as EcosystemRole) : null;
}

function onboardingRoles(profile?: NavProfile | null): EcosystemRole[] {
  const progress = profile?.onboarding_progress;
  if (!progress || typeof progress !== 'object') return [];
  const selected = (progress as Record<string, unknown>).selected_roles;
  if (!Array.isArray(selected)) return [];
  return selected.map((role) => normalizeRole(String(role))).filter(Boolean) as EcosystemRole[];
}

export function resolveProfileRoles(
  profile?: NavProfile | null,
  roleRows: ProfileRoleRow[] = [],
): EcosystemRole[] {
  const roles = [
    normalizeRole(profile?.profile_type),
    normalizeRole(profile?.user_type),
    ...onboardingRoles(profile),
    ...roleRows.map((row) => normalizeRole(row.role)),
  ].filter(Boolean) as EcosystemRole[];

  if (profile?.is_creator && roles.length === 0) roles.push('artist');
  if (profile?.is_label) roles.push('manager');
  if (roles.length === 0) roles.push('fan');

  return Array.from(new Set(roles));
}

export function hasCreatorAccess(roles: EcosystemRole[] = []) {
  return roles.some((role) => CREATOR_ROLES.has(role));
}

export function getCreateActions(roles: EcosystemRole[] = []): CreateAction[] {
  if (!hasCreatorAccess(roles)) return [];

  const roleSet = new Set(roles);
  const add = (actions: CreateAction[], action: CreateAction) => {
    if (!actions.some((item) => item.key === action.key)) actions.push(action);
  };

  const actions: CreateAction[] = [];
  const canRelease = roleSet.has('artist') || roleSet.has('curator') || roleSet.has('manager');
  const canBeat = roleSet.has('producer') || roleSet.has('service_provider') || roleSet.has('manager');
  const canMix = roleSet.has('dj') || roleSet.has('curator') || roleSet.has('artist');
  const canEvent = roleSet.has('promoter') || roleSet.has('venue') || roleSet.has('dj') || roleSet.has('manager');

  if (canRelease) add(actions, { key: 'release', label: 'Upload Release', route: '/creator/upload?action=release' });
  if (canBeat) add(actions, { key: 'beat', label: 'Upload Beat', route: '/creator/upload?action=beat' });
  if (canMix) add(actions, { key: 'mix', label: 'Upload Mix', route: '/creator/upload?action=mix' });
  if (canRelease || canMix || roleSet.has('curator')) {
    add(actions, { key: 'soundboard', label: 'Create Soundboard', route: '/soundboards' });
  }
  if (canEvent) add(actions, { key: 'event', label: 'Create Event', route: '/creator/events' });
  add(actions, { key: 'live', label: 'Start Live', route: '/live/create' });
  add(actions, { key: 'studio', label: 'Go to Studio', route: '/creator/dashboard' });

  return actions;
}
