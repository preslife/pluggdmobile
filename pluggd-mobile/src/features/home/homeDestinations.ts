export type HomeDestination =
  | { kind: 'release'; id: string }
  | { kind: 'beat'; id: string }
  | { kind: 'mix'; id: string }
  | { kind: 'scene'; sceneKind: 'city' | 'genre'; value: string; label?: string }
  | { kind: 'article'; id: string }
  | { kind: 'opportunity'; id: string }
  | { kind: 'creator'; username: string }
  | { kind: 'backstage'; id: string }
  | { kind: 'soundboard'; id: string }
  | { kind: 'store_product'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'carnival' }
  | { kind: 'live_room'; id: string }
  | { kind: 'creator_tool'; tool: 'pluggd_dj' | 'beatplug' | 'studio' };

export type HomeDestinationAction =
  | { kind: 'route'; route: string }
  | { kind: 'creator_gate'; route: string; signedOutRoute: '/auth/login' };

function clean(value: string) {
  return value.trim();
}

export function resolveHomeDestination(destination: HomeDestination): HomeDestinationAction | null {
  switch (destination.kind) {
    case 'release':
      return clean(destination.id) ? { kind: 'route', route: `/release/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'beat':
      return clean(destination.id) ? { kind: 'route', route: `/beat/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'mix':
      return clean(destination.id) ? { kind: 'route', route: `/mixes/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'scene': {
      const value = clean(destination.value);
      const label = clean(destination.label || destination.value);
      if (!value) return null;
      return {
        kind: 'route',
        route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(value)}&sceneKind=${destination.sceneKind}`,
      };
    }
    case 'article':
      return clean(destination.id) ? { kind: 'route', route: `/plug/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'opportunity':
      return clean(destination.id) ? { kind: 'route', route: `/opportunities/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'creator':
      return clean(destination.username) ? { kind: 'route', route: `/creator/${encodeURIComponent(clean(destination.username))}` } : null;
    case 'backstage':
      return clean(destination.id) ? { kind: 'route', route: `/backstage/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'soundboard':
      return clean(destination.id) ? { kind: 'route', route: `/soundboards/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'store_product':
      return clean(destination.id) ? { kind: 'route', route: `/product/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'event':
      return clean(destination.id) ? { kind: 'route', route: `/events/${encodeURIComponent(clean(destination.id))}` } : null;
    case 'carnival':
      return { kind: 'route', route: '/hubs/notting-hill-carnival-2026' };
    case 'live_room':
      return clean(destination.id) ? { kind: 'route', route: `/live/session?roomId=${encodeURIComponent(clean(destination.id))}` } : null;
    case 'creator_tool': {
      const route = destination.tool === 'pluggd_dj'
        ? '/dj'
        : destination.tool === 'beatplug'
          ? '/market/beats'
          : '/studio';
      return { kind: 'creator_gate', route, signedOutRoute: '/auth/login' };
    }
  }
}
