import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { CollaborationProject } from '@/hooks/useCollaboration';
import EnhancedCollaborationsModule from '../EnhancedCollaborationsModule';

const mockState: {
  projects: CollaborationProject[];
  myProjects: CollaborationProject[];
  applications: any[];
} = {
  projects: [],
  myProjects: [],
  applications: []
};

const fetchProjectsMock = vi.fn();
const createProjectMock = vi.fn();
const applyToProjectMock = vi.fn();
const hasUserAppliedMock = vi.fn();
const updateProjectBudgetMock = vi.fn();
const getUserProjectsMock = vi.fn();
const getUserApplicationsMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}));

const toastMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock })
}));

vi.mock('@/hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    projects: mockState.projects,
    loading: false,
    error: null,
    fetchProjects: fetchProjectsMock,
    createProject: createProjectMock,
    applyToProject: applyToProjectMock,
    hasUserApplied: hasUserAppliedMock,
    getUserProjects: getUserProjectsMock,
    getUserApplications: getUserApplicationsMock,
    updateProjectBudget: updateProjectBudgetMock
  })
}));

const createProject = (overrides: Partial<CollaborationProject> = {}): CollaborationProject => ({
  id: 'project-base',
  user_id: 'user-1',
  title: 'Test Project',
  description: 'Project description',
  genre: 'hip-hop',
  skills_needed: [],
  budget_range: undefined,
  deadline: undefined,
  status: 'open',
  votes: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

beforeEach(() => {
  mockState.projects = [];
  mockState.myProjects = [];
  mockState.applications = [];

  fetchProjectsMock.mockReset();
  fetchProjectsMock.mockResolvedValue(undefined);
  createProjectMock.mockReset();
  applyToProjectMock.mockReset();
  hasUserAppliedMock.mockReset();
  updateProjectBudgetMock.mockReset();
  updateProjectBudgetMock.mockResolvedValue(true);
  getUserProjectsMock.mockReset();
  getUserApplicationsMock.mockReset();
  toastMock.mockReset();

  getUserProjectsMock.mockImplementation(async () => mockState.myProjects);
  getUserApplicationsMock.mockImplementation(async () => mockState.applications);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EnhancedCollaborationsModule - budget prompts', () => {
  test('renders a budget prompt when a posted project is missing a budget range', async () => {
    mockState.myProjects = [
      createProject({ id: 'project-1', budget_range: undefined })
    ];
    mockState.projects = [
      createProject({ id: 'project-2', budget_range: '£100-£250' })
    ];

    await act(async () => {
      render(<EnhancedCollaborationsModule />);
      await Promise.resolve();
    });

    await waitFor(() => expect(getUserProjectsMock).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /my projects/i }));

    const prompt = await screen.findByTestId('budget-prompt-project-1');
    expect(prompt).toBeInTheDocument();
  });

  test('does not render a budget prompt when a project already has a budget range', async () => {
    mockState.myProjects = [
      createProject({ id: 'project-1', budget_range: '£200-£400' })
    ];

    await act(async () => {
      render(<EnhancedCollaborationsModule />);
      await Promise.resolve();
    });

    await waitFor(() => expect(getUserProjectsMock).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /my projects/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('budget-prompt-project-1')).not.toBeInTheDocument();
    });
  });
});
