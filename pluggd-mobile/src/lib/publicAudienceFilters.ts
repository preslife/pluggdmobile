const NON_PUBLIC_PROFILE_NAMES = new Set([
  ['apple', 'app', 'review'].join(' '),
  ['app', 'review'].join(' '),
  'apple reviewer',
  ['pluggd', 'app', 'review'].join(' '),
  'pluggd reviewer',
  'test account',
]);

export function isPublicProfileName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && !NON_PUBLIC_PROFILE_NAMES.has(normalized));
}
