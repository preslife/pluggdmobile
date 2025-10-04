import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { GlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    signOut: async () => undefined,
  }),
}));

vi.mock('@/hooks/useDomain', () => ({
  useDomain: () => ({
    isLiveDomain: false,
    isHubDomain: true,
    isLocalhost: true,
    isLiveRoute: false,
    redirectToProperDomain: () => undefined,
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const createQuery = () => ({
    select: () => createQuery(),
    eq: () => createQuery(),
    maybeSingle: async () => ({ data: null, error: null }),
  });

  return {
    supabase: {
      from: () => createQuery(),
    },
  };
});

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/AdvancedSearch', () => ({
  AdvancedSearch: () => <div data-testid="advanced-search" />,
}));

vi.mock('@/components/MessagingCenter', () => ({
  MessagingCenter: () => <div data-testid="messaging-center" />,
}));

vi.mock('@/components/CartSidebar', () => ({
  CartSidebar: () => <div data-testid="cart-sidebar" />,
}));

vi.mock('@/components/HeaderWalletBalance', () => ({
  HeaderWalletBalance: () => <div data-testid="header-wallet-balance" />,
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button" data-testid="theme-toggle" />,
}));

vi.mock('@/assets/pluggdt.png', () => ({
  default: 'logo.png',
}));

vi.mock('@/services/analytics/player-analytics', () => ({
  playerAnalytics: {
    startSession: () => undefined,
    cleanup: () => undefined,
    trackPlayEvent: () => Promise.resolve(),
    trackPlayProgress: () => Promise.resolve(),
  },
}));

vi.mock('@/services/audio/track-access-control', () => ({
  trackAccessControl: {
    enhanceTrackWithAccess: async (track: unknown) => track,
    getMaxPlaybackTime: () => undefined,
  },
}));

vi.mock('@/services/audio/url-resolver', () => ({
  resolvePlayableUrl: async (src: string) => src,
}));

vi.mock('@/components/GlobalPlayer/MicroPlayer', () => ({
  MicroPlayer: () => <div data-testid="micro-player" />,
}));

vi.mock('@/components/GlobalPlayer/ExpandedPlayer', () => ({
  ExpandedPlayer: () => <div data-testid="expanded-player" />,
}));

describe('masthead spacing integration', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--masthead-h');
    if (!document.getElementById('test-masthead-styles')) {
      const style = document.createElement('style');
      style.id = 'test-masthead-styles';
      style.textContent = '.pt-masthead{padding-top:var(--masthead-h);}';
      document.head.appendChild(style);
    }
  });

  it('updates masthead height CSS variable and applies padding', async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect(this: Element) {
        return {
          width: 0,
          height: this.tagName === 'NAV' ? 64 : 0,
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    const { getByTestId } = render(
      <MemoryRouter>
        <DomainAwareNavigation />
        <GlobalPlayer>
          <div data-testid="content" className="pt-masthead">
            Content
          </div>
        </GlobalPlayer>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--masthead-h')).toBe('64px');
    });

    await waitFor(() => {
      const paddingTop = window.getComputedStyle(getByTestId('content')).paddingTop;
      expect(['64px', 'var(--masthead-h)']).toContain(paddingTop);
    });

    rectSpy.mockRestore();
  });
});
