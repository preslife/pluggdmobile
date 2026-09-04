export type ThePlugNavigationDecision =
  | { kind: 'reader' }
  | { kind: 'native'; route: string }
  | { kind: 'external'; url: string }
  | { kind: 'blocked' };

const INTERNAL_HOSTS = new Set(['pluggd.fm', 'www.pluggd.fm']);

export function classifyThePlugNavigation(rawUrl: string): ThePlugNavigationDecision {
  if (rawUrl.startsWith('about:blank') || rawUrl.startsWith('data:text/html')) return { kind: 'reader' };
  let url: URL;
  try {
    url = new URL(rawUrl, 'https://pluggd.fm/');
  } catch {
    return { kind: 'blocked' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'blocked' };
  if (!INTERNAL_HOSTS.has(url.hostname.toLocaleLowerCase('en-GB'))) return { kind: 'external', url: url.toString() };

  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/discover/the-plug' || path === '/the-plug' || path === '/plug') return { kind: 'native', route: '/plug' };
  const article = path.match(/^\/(?:discover\/the-plug|the-plug|plug|articles)\/([^/]+)$/i);
  if (article?.[1]) return { kind: 'native', route: `/plug/${decodeURIComponent(article[1])}` };
  if (path === '/discover/releases' || path === '/releases') return { kind: 'native', route: '/releases' };
  if (path === '/discover/mixes' || path === '/mixes') return { kind: 'native', route: '/mixes' };
  if (path === '/opportunities') return { kind: 'native', route: '/opportunities' };
  if (path === '/soundboards') return { kind: 'native', route: '/soundboards' };
  if (path === '/hubs/notting-hill-carnival-2026') return { kind: 'native', route: '/hubs/notting-hill-carnival-2026' };

  // Other PLUGGD pages stay inside the hardened article WebView. They never
  // jump unexpectedly to Safari; unsupported scripts remain disabled.
  return { kind: 'reader' };
}
