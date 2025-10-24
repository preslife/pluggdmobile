import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithLocale } from '@/lib/i18n/test-utils';
import Education from '@/pages/Education';
import type { LocaleCode } from '@/lib/locales';

const supabaseTableData: Record<string, any[]> = {};

const createBuilder = (table: string) => {
  const result = { data: supabaseTableData[table] ?? [], error: null };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
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
    rpc: vi.fn(() => Promise.resolve({ data: true, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: null,
    usage: {},
    checkCourseLimit: vi.fn(() => Promise.resolve(true)),
    getTierLimits: vi.fn(() => ({ courses: 10 })),
  }),
}));

vi.mock('@/hooks/usePageMetadata', () => ({
  usePageMetadata: () => undefined,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/EnhancedCourseCard', () => ({
  EnhancedCourseCard: () => <div data-testid="course-card" />,
}));

vi.mock('@/components/EnhancedCourseViewer', () => ({
  EnhancedCourseViewer: () => <div data-testid="course-viewer" />,
  default: () => <div data-testid="course-viewer" />,
}));

vi.mock('@/components/EnhancedAdminCourseManager', () => ({
  EnhancedAdminCourseManager: () => <div data-testid="admin-manager" />,
}));

vi.mock('@/components/CourseUpgradeModal', () => ({
  CourseUpgradeModal: () => null,
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading" />,
}));

vi.mock('@/utils/certificates', () => ({
  generateCourseCertificatePdf: vi.fn(),
}));

describe('Education page i18n integration', () => {
  beforeEach(() => {
    supabaseTableData.courses = [];
    supabaseTableData.course_pricing = [];
    supabaseTableData.course_certificates = [];
    supabaseTableData.user_course_progress = [
      {
        course_id: 'course-1',
        completion_percentage: 100,
        courses: { duration_hours: 12 },
      },
    ];
  });

  const renderEducation = async (locale: LocaleCode) => {
    const view = await renderWithLocale(<Education />, { locale });
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    return view;
  };

  it('renders English hero copy', async () => {
    await renderEducation('en-GB');

    expect(
      await screen.findByRole('heading', { name: 'My Learning Dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
  });

  it('renders Spanish hero copy', async () => {
    await renderEducation('es-ES');

    expect(
      await screen.findByRole('heading', { name: 'Mi panel de aprendizaje' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panel de administración' })).toBeInTheDocument();
  });
});
