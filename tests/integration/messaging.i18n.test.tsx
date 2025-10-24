import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithLocale } from '@/lib/i18n/test-utils';
import InboxPage from '@/pages/Inbox';
import type { LocaleCode } from '@/lib/locales';

const supabaseTableData: Record<string, any[]> = {};

const createBuilder = (table: string) => {
  const result = { data: supabaseTableData[table] ?? [], error: null };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (onFulfilled: any, onRejected?: any) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(result).catch(onRejected),
    finally: (onFinally: any) => Promise.resolve(result).finally(onFinally),
  };
  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => createBuilder(table),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/seo', () => ({
  setMeta: vi.fn(),
}));

describe('Messaging page i18n integration', () => {
  beforeEach(() => {
    supabaseTableData.unified_inbox = [
      {
        id: 'message-1',
        provider: 'discord',
        message_id: 'abc',
        author_name: 'Sample Author',
        author_handle: '@sample',
        snippet: 'Hello world',
        permalink: null,
        thread_id: null,
        is_read: false,
        is_starred: false,
        created_at: '2024-01-15T12:00:00Z',
        user_id: 'user-1',
      },
    ];
  });

  const renderInbox = (locale: LocaleCode) => renderWithLocale(<InboxPage />, { locale });

  it('renders translated messaging UI in English', async () => {
    await renderInbox('en-GB');

    expect(await screen.findByText('Unified Inbox')).toBeInTheDocument();
    expect(screen.getByText('Manage conversations from your connected channels in one place.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByText('All providers')).toBeInTheDocument();
  });

  it('renders translated messaging UI in Spanish', async () => {
    await renderInbox('es-ES');

    expect(await screen.findByText('Bandeja unificada')).toBeInTheDocument();
    expect(screen.getByText('Gestiona conversaciones de tus canales conectados en un solo lugar.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar')).toBeInTheDocument();
    expect(screen.getByText('Todos los proveedores')).toBeInTheDocument();
  });
});
