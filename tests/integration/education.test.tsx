import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithLocale } from "../utils/renderWithLocale";

const buildSupabaseChain = () => {
  const response = { data: [], error: null };
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(async () => response),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    single: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(async () => ({ data: null, error: null })),
    delete: vi.fn(async () => ({ error: null })),
    then: (resolve: any) => resolve(response),
    catch: () => chain,
    finally(cb?: () => void) {
      cb?.();
      return chain;
    },
  };
  return chain;
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    subscription: null,
    usage: {},
    checkCourseLimit: vi.fn().mockResolvedValue(true),
    getTierLimits: vi.fn(() => ({ courses: 10 })),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => buildSupabaseChain(),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: () => <div data-testid="progress" />,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />, 
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: any) => <input type="checkbox" {...props} />, 
}));

vi.mock("@/components/LoadingSkeleton", () => ({
  LoadingSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/EnhancedCourseCard", () => ({
  EnhancedCourseCard: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/EnhancedCourseViewer", () => ({
  EnhancedCourseViewer: () => <div data-testid="course-viewer" />,
}));

vi.mock("@/components/EnhancedAdminCourseManager", () => ({
  EnhancedAdminCourseManager: () => <div data-testid="admin-manager" />,
}));

vi.mock("@/components/CourseUpgradeModal", () => ({
  CourseUpgradeModal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/hooks/usePageMetadata", () => ({
  usePageMetadata: vi.fn(),
}));

vi.mock("@/utils/certificates", () => ({
  generateCourseCertificatePdf: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  BookOpen: () => <span />, 
  Clock: () => <span />, 
  Award: () => <span />, 
  TrendingUp: () => <span />, 
  Users: () => <span />, 
  Settings: () => <span />, 
  Crown: () => <span />, 
  Download: () => <span />, 
  ChevronRight: () => <span />,
}));

import Education from "@/pages/Education";

describe("Education page localisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders english strings", async () => {
    renderWithLocale(<Education />, { locale: "en-GB" });

    expect(await screen.findByText("My Learning Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Active Courses")).toBeInTheDocument();
  });

  it("renders spanish strings", async () => {
    renderWithLocale(<Education />, { locale: "es-ES" });

    expect(await screen.findByText("Mi panel de aprendizaje")).toBeInTheDocument();
    expect(await screen.findByText("Cursos activos")).toBeInTheDocument();
  });
});
