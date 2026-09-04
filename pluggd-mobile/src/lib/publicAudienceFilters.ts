const NON_PUBLIC_TEST_PROFILE_NAMES = new Set([
  ['apple', 'app', 'review'].join(' '),
  ['app', 'review'].join(' '),
  'apple reviewer',
  ['pluggd', 'app', 'review'].join(' '),
  'pluggd reviewer',
  'test account',
]);

const GENERIC_PROFILE_NAMES = new Set([
  'pluggd creator',
  'pluggd producer',
  'pluggd user',
  'community member',
  'user',
]);

export function isNonPublicTestProfileName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(
    normalized
    && (
      NON_PUBLIC_TEST_PROFILE_NAMES.has(normalized)
      || normalized.includes('app review')
      || normalized.includes('delete test')
    )
  );
}

export function isPublicProfileName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(
    normalized
    && !GENERIC_PROFILE_NAMES.has(normalized)
    && !isNonPublicTestProfileName(normalized),
  );
}

export function isPresentablePublicUsername(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^@/, '').toLowerCase();
  if (!normalized || !isPublicProfileName(normalized)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) return false;
  return !/^(?:admin|user|creator|profile|member|account|test|review)[-_][0-9a-f]{6,}$/i.test(normalized);
}
