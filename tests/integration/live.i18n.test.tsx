import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithLocale } from '@/lib/i18n/test-utils';
import LiveIndex from '@/pages/live/Index';
import type { LocaleCode } from '@/lib/locales';

const scheduleItem = {
  id: 'session-1',
  type: 'session' as const,
  title: 'Producer Session',
  status: 'live' as const,
  scheduledFor: '2024-01-15T11:30:00Z',
  endsAt: '2024-01-15T13:00:00Z',
  actionHref: '/live/sessions/session-1',
};

vi.mock('@/hooks/useSessionRooms', () => ({
  useSessionRooms: () => ({ rooms: [], loading: false }),
}));

vi.mock('@/hooks/useLiveSchedule', () => ({
  useLiveSchedule: () => ({
    schedule: [scheduleItem],
    loading: false,
  }),
}));

vi.mock('@/hooks/useNow', () => ({
  __esModule: true,
  default: () => new Date('2024-01-15T12:00:00Z'),
}));

vi.mock('@/components/LiveCTA', () => ({
  __esModule: true,
  default: () => <div data-testid="live-cta" />,
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading" />,
}));

describe('Live page i18n integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLive = (locale: LocaleCode) => renderWithLocale(<LiveIndex />, { locale });

  it('renders translated hero and schedule in English', async () => {
    await renderLive('en-GB');

    expect(await screen.findByRole('heading', { name: 'Live Battles, Showcases, and Creator Streams' })).toBeInTheDocument();
    expect(screen.getByText('Join a Session')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming Schedule' })).toBeInTheDocument();

    const expectedDate = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(scheduleItem.scheduledFor));

    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('renders translated hero and schedule in Spanish', async () => {
    await renderLive('es-ES');

    expect(await screen.findByRole('heading', { name: 'Batallas en vivo, showcases y transmisiones de creadores' })).toBeInTheDocument();
    expect(screen.getByText('Unirse a una sesión')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Próximos eventos' })).toBeInTheDocument();

    const expectedDate = new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(scheduleItem.scheduledFor));

    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });
});
