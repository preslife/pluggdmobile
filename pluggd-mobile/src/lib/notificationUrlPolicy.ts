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

  if (value.startsWith('/')) {
    if (value.startsWith('//')) return false;

    try {
      const parsed = new URL(value, 'https://pluggd.fm');
      return (
        parsed.origin === 'https://pluggd.fm' &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port &&
        SAFE_NOTIFICATION_ROUTE_ROOTS.has(routeRoot(parsed))
      );
    } catch {
      return false;
    }
  }

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

/** Convert any allowed first-party notification URL to an Expo Router path. */
export function notificationRoutePath(value: string) {
  const parsed = value.startsWith('/')
    ? new URL(value, 'https://pluggd.fm')
    : new URL(value);

  if (parsed.protocol === 'pluggd:') {
    const path = `/${parsed.hostname}${parsed.pathname}`.replace(/\/{2,}/g, '/');
    return `${path}${parsed.search}${parsed.hash}`;
  }

  return `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
}
