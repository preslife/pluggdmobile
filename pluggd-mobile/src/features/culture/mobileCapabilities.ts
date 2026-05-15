export type CapabilityState = 'available' | 'read-only' | 'unavailable';

export type MobileCapabilityMap = {
  schemaSource: 'live-rest-verified' | 'static-types-only';
  checkedAt: string;
  backstage: {
    creatorCommunities: CapabilityState;
    communityMemberships: CapabilityState;
    publicHubs: CapabilityState;
    hubThreads: CapabilityState;
    communityEvents: CapabilityState;
    communityRooms: CapabilityState;
    communityChallenges: CapabilityState;
  };
  events: {
    eventRsvps: CapabilityState;
    eventComments: CapabilityState;
    eventTickets: CapabilityState;
    ticketOrders: CapabilityState;
    dynamicQr: CapabilityState;
    nativeTicketCheckout: CapabilityState;
  };
  social: {
    socialPosts: CapabilityState;
    comments: CapabilityState;
    likes: CapabilityState;
    reposts: CapabilityState;
  };
  library: {
    beatFavorites: CapabilityState;
    genericSavedContent: CapabilityState;
    releasePurchases: CapabilityState;
    samplePackPurchases: CapabilityState;
  };
  wallet: {
    ledger: CapabilityState;
    creditSpendFunction: CapabilityState;
    iapCredits: CapabilityState;
  };
  live: {
    sessionRooms: CapabilityState;
    liveSessions: CapabilityState;
    agoraTokens: CapabilityState;
    reminders: CapabilityState;
  };
  notifications: {
    listRecent: CapabilityState;
    markRead: CapabilityState;
    pushTokens: CapabilityState;
  };
};

export const MOBILE_CAPABILITIES: MobileCapabilityMap = {
  schemaSource: 'live-rest-verified',
  checkedAt: '2026-05-15',
  backstage: {
    creatorCommunities: 'available',
    communityMemberships: 'available',
    publicHubs: 'read-only',
    hubThreads: 'read-only',
    communityEvents: 'available',
    communityRooms: 'available',
    communityChallenges: 'available',
  },
  events: {
    eventRsvps: 'available',
    eventComments: 'available',
    eventTickets: 'read-only',
    ticketOrders: 'read-only',
    dynamicQr: 'available',
    nativeTicketCheckout: 'unavailable',
  },
  social: {
    socialPosts: 'read-only',
    comments: 'available',
    likes: 'available',
    reposts: 'unavailable',
  },
  library: {
    beatFavorites: 'available',
    genericSavedContent: 'available',
    releasePurchases: 'read-only',
    samplePackPurchases: 'read-only',
  },
  wallet: {
    ledger: 'read-only',
    creditSpendFunction: 'available',
    iapCredits: 'available',
  },
  live: {
    sessionRooms: 'available',
    liveSessions: 'read-only',
    agoraTokens: 'available',
    reminders: 'available',
  },
  notifications: {
    listRecent: 'available',
    markRead: 'available',
    pushTokens: 'available',
  },
};

export function isCapabilityAvailable(state: CapabilityState) {
  return state === 'available';
}
