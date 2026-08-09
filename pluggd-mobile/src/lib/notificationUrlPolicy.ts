const SAFE_NOTIFICATION_ROUTE_ROOTS = new Set([
  'beat',
  'community',
  'events',
  'inbox',
  'live',
  'market',
  'membership',
  'mixes',
  'notifications',
  'post',
  'product',
  'release',
  'soundboards',
  'story',
  'tickets',
]);

function routeRoot(parsed: URL) {
  if (parsed.protocol === 'pluggd:') {
    return (parsed.hostname || parsed.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  }

  return (parsed.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
}

function containsDotPathSegment(value: string) {
  const withoutQueryOrFragment = value.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(withoutQueryOrFragment)
      .split('/')
      .some((segment) => segment === '.' || segment === '..');
  } catch {
    return true;
  }
}

/** Match only first-party app routes; notification data is untrusted input. */
export function matchesAllowedNotificationUrl(value: unknown, allowedWebHosts: ReadonlySet<string>) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  if (containsDotPathSegment(value)) return false;

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.port) return false;

    if (parsed.protocol === 'pluggd:') {
      return SAFE_NOTIFICATION_ROUTE_ROOTS.has(routeRoot(parsed));
    }

    if (parsed.protocol !== 'https:') return false;
    return (
      allowedWebHosts.has(parsed.hostname.toLowerCase()) &&
      SAFE_NOTIFICATION_ROUTE_ROOTS.has(routeRoot(parsed))
    );
  } catch {
    return false;
  }
}
