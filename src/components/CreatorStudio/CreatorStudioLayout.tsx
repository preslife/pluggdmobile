import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BarChart3,
  Package,
  Plug,
  Radio,
  GraduationCap,
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  UserCheck,
  Store,
  CreditCard,
  Settings,
  Handshake,
  Home,
  Music,
  HeadphonesIcon,
  ShoppingBag,
  Zap,
  Calendar,
  FileText,
  Gift,
  MessageCircle,
  Workflow,
  PieChart,
  UserPlus,
  Globe,
  Receipt,
  Shield,
  Lightbulb,
  ChevronDown,
  Building,
  User,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLabelMemberships } from "@/hooks/useLabelMemberships";
import { StudioContext } from "@/contexts/StudioContext";
import type { LabelMembership } from "@/hooks/useLabelMemberships";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreatorStudioLayoutProps {
  children: React.ReactNode;
}

type StudioMode = "personal" | "label";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/studio",
    icon: Home,
  },
  {
    title: "Catalog",
    icon: Package,
    items: [
      {
        title: "Releases",
        url: "/studio/catalog?tab=releases",
        icon: Music,
      },
      {
        title: "Beats",
        url: "/studio/catalog?tab=beats",
        icon: HeadphonesIcon,
      },
      {
        title: "Sound Packs",
        url: "/studio/catalog?tab=sound-packs",
        icon: Package,
      },
      {
        title: "Bundles",
        url: "/studio/catalog?tab=bundles",
        icon: ShoppingBag,
      },
      {
        title: "Merchandise",
        url: "/studio/catalog?tab=merch",
        icon: Gift,
      },
      {
        title: "Collectibles",
        url: "/studio/catalog?tab=collectibles",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Plug-ins/Channels",
    icon: Plug,
    items: [
      {
        title: "Connect",
        url: "/studio/plugins/connect",
        icon: Zap,
      },
      {
        title: "Composer",
        url: "/studio/plugins/composer",
        icon: Music,
      },
      {
        title: "Scheduler",
        url: "/studio/plugins/scheduler",
        icon: Calendar,
      },
      {
        title: "Inbox",
        url: "/studio/plugins/inbox",
        icon: MessageCircle,
      },
      {
        title: "Analytics",
        url: "/studio/plugins/analytics",
        icon: BarChart3,
      },
      {
        title: "Smart Links",
        url: "/studio/plugins/smart-links",
        icon: Globe,
      },
    ],
  },
  {
    title: "Live",
    icon: Radio,
    items: [
      {
        title: "Sessions",
        url: "/studio/live/sessions",
        icon: Radio,
      },
      {
        title: "Tickets",
        url: "/studio/live/tickets",
        icon: FileText,
      },
      {
        title: "Recordings",
        url: "/studio/live/recordings",
        icon: HeadphonesIcon,
      },
    ],
  },
  {
    title: "Courses",
    icon: GraduationCap,
    items: [
      {
        title: "Builder",
        url: "/studio/courses/builder",
        icon: Workflow,
      },
      {
        title: "Pricing",
        url: "/studio/courses/pricing",
        icon: DollarSign,
      },
      {
        title: "Enrollments",
        url: "/studio/courses/enrollments",
        icon: UserPlus,
      },
    ],
  },
  {
    title: "Memberships",
    icon: Crown,
    items: [
      {
        title: "Tiers",
        url: "/studio/memberships/tiers",
        icon: Crown,
      },
      {
        title: "Perks",
        url: "/studio/memberships/perks",
        icon: Gift,
      },
      {
        title: "Posts",
        url: "/studio/memberships/posts",
        icon: FileText,
      },
      {
        title: "Discord Sync",
        url: "/studio/memberships/discord",
        icon: MessageCircle,
      },
    ],
  },
  {
    title: "Crowdfunding",
    icon: DollarSign,
    items: [
      {
        title: "Campaigns",
        url: "/studio/crowdfunding/campaigns",
        icon: DollarSign,
      },
      {
        title: "Rewards",
        url: "/studio/crowdfunding/rewards",
        icon: Gift,
      },
      {
        title: "Updates",
        url: "/studio/crowdfunding/updates",
        icon: FileText,
      },
      {
        title: "Risk",
        url: "/studio/crowdfunding/risk",
        icon: Shield,
      },
    ],
  },
  {
    title: "Collaborations",
    icon: Users,
    items: [
      {
        title: "Projects",
        url: "/studio/collaborations/projects",
        icon: Workflow,
      },
      {
        title: "Applicants",
        url: "/studio/collaborations/applicants",
        icon: UserPlus,
      },
      {
        title: "Messages",
        url: "/studio/collaborations/messages",
        icon: MessageCircle,
      },
      {
        title: "Milestones/Escrow",
        url: "/studio/collaborations/milestones",
        icon: Shield,
      },
    ],
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    items: [
      {
        title: "Sales",
        url: "/studio/analytics/sales",
        icon: DollarSign,
      },
      {
        title: "Plays",
        url: "/studio/analytics/plays",
        icon: BarChart3,
      },
      {
        title: "Funnels",
        url: "/studio/analytics/funnels",
        icon: Workflow,
      },
      {
        title: "Sources/UTM",
        url: "/studio/analytics/sources",
        icon: Globe,
      },
      {
        title: "Post ROI",
        url: "/studio/analytics/post-roi",
        icon: PieChart,
      },
    ],
  },
  {
    title: "CRM & Audience",
    icon: UserCheck,
    items: [
      {
        title: "Customers",
        url: "/studio/crm/customers",
        icon: Users,
      },
      {
        title: "Followers",
        url: "/studio/crm/followers",
        icon: UserPlus,
      },
      {
        title: "Members",
        url: "/studio/crm/members",
        icon: Crown,
      },
      {
        title: "Segments",
        url: "/studio/crm/segments",
        icon: PieChart,
      },
      {
        title: "Exports",
        url: "/studio/crm/exports",
        icon: FileText,
      },
    ],
  },
  {
    title: "Storefront & Profile",
    icon: Store,
    items: [
      {
        title: "Theme",
        url: "/studio/storefront/theme",
        icon: Lightbulb,
      },
      {
        title: "Featured",
        url: "/studio/storefront/featured",
        icon: Crown,
      },
      {
        title: "Navigation",
        url: "/studio/storefront/navigation",
        icon: Globe,
      },
      {
        title: "Domain",
        url: "/studio/storefront/domain",
        icon: Globe,
      },
    ],
  },
  {
    title: "Financials",
    icon: CreditCard,
    items: [
      {
        title: "Orders",
        url: "/studio/financials/orders",
        icon: Receipt,
      },
      {
        title: "Refunds",
        url: "/studio/financials/refunds",
        icon: Receipt,
      },
      {
        title: "Payouts/Statements",
        url: "/studio/financials/payouts",
        icon: CreditCard,
      },
      {
        title: "Splits",
        url: "/studio/financials/splits",
        icon: PieChart,
      },
      {
        title: "Tax/KYC",
        url: "/studio/financials/tax",
        icon: Shield,
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      {
        title: "Account",
        url: "/studio/settings/account",
        icon: UserCheck,
      },
      {
        title: "Team",
        url: "/studio/settings/team",
        icon: Users,
      },
      {
        title: "Notifications",
        url: "/studio/settings/notifications",
        icon: MessageCircle,
      },
      {
        title: "Integrations",
        url: "/studio/settings/integrations",
        icon: Plug,
      },
      {
        title: "Defaults",
        url: "/studio/settings/defaults",
        icon: Settings,
      },
      {
        title: "Distribution",
        url: "/studio/settings/distribution",
        icon: Globe,
      },
      {
        title: "Legal Vault",
        url: "/studio/settings/legal",
        icon: Shield,
      },
    ],
  },
  {
    title: "Partnerships & Mentorship",
    icon: Handshake,
    items: [
      {
        title: "Brand Campaigns",
        url: "/studio/partnerships/brands",
        icon: Handshake,
      },
      {
        title: "1:1 Mentorship",
        url: "/studio/partnerships/mentorship",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Label Studio",
    url: "/studio/label",
    icon: Building,
  },
];

export const CreatorStudioLayout: React.FC<CreatorStudioLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Catalog", "Analytics"])); // Default open sections
  const { memberships, loading: labelsLoading, refresh } = useLabelMemberships();

  const getInitialContext = useCallback((): { mode: StudioMode; labelId: string | null } => {
    if (typeof window === "undefined") {
      return { mode: "personal", labelId: null };
    }
    const stored = window.localStorage.getItem("studio:context");
    if (stored && stored.startsWith("label:")) {
      const [, value] = stored.split(":");
      return { mode: "label", labelId: value || null };
    }
    return { mode: "personal", labelId: null };
  }, []);

  const initialContext = useMemo(() => getInitialContext(), [getInitialContext]);
  const [mode, setModeInternal] = useState<StudioMode>(initialContext.mode);
  const [activeLabelId, setActiveLabelIdInternal] = useState<string | null>(initialContext.labelId);

  const activeLabel: LabelMembership | null = useMemo(() => {
    if (!activeLabelId) return null;
    return memberships.find((membership) => membership.id === activeLabelId) ?? null;
  }, [memberships, activeLabelId]);

  useEffect(() => {
    if (labelsLoading) return;
    if (mode === "label") {
      if (!activeLabel) {
        if (memberships.length > 0) {
          setActiveLabelIdInternal(memberships[0].id);
        } else {
          setModeInternal("personal");
          setActiveLabelIdInternal(null);
        }
      }
    } else if (mode === "personal" && !memberships.length) {
      setActiveLabelIdInternal(null);
    }
  }, [mode, activeLabel, memberships, labelsLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode === "label" && activeLabel) {
      window.localStorage.setItem("studio:context", `label:${activeLabel.id}`);
    } else {
      window.localStorage.setItem("studio:context", "personal");
    }
  }, [mode, activeLabel?.id]);

  const handleSetMode = useCallback((nextMode: StudioMode) => {
    setModeInternal(nextMode);
  }, []);

  const handleSetActiveLabelId = useCallback((labelId: string | null) => {
    setActiveLabelIdInternal(labelId);
    if (labelId) {
      setModeInternal("label");
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      activeLabel: mode === "label" ? activeLabel : null,
      memberships,
      labelsLoading,
      setMode: handleSetMode,
      setActiveLabelId: handleSetActiveLabelId,
      refreshLabels: refresh,
    }),
    [mode, activeLabel, memberships, labelsLoading, handleSetMode, handleSetActiveLabelId, refresh]
  );

  const workspaceSwitcher = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 max-w-xs">
          {mode === "label" && activeLabel ? (
            <>
              <Building className="h-4 w-4" />
              <span className="truncate">
                {activeLabel.name || activeLabel.slug || "Label workspace"}
              </span>
              <Badge variant="secondary" className="text-xs capitalize">
                {activeLabel.role || "member"}
              </Badge>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Personal workspace</span>
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleSetMode("personal")}> 
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal workspace
            </span>
            {mode === "personal" && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Labels</DropdownMenuLabel>
        {labelsLoading ? (
          <DropdownMenuItem disabled>Loading labels…</DropdownMenuItem>
        ) : memberships.length === 0 ? (
          <DropdownMenuItem disabled>No labels yet</DropdownMenuItem>
        ) : (
          memberships.map((membership) => (
            <DropdownMenuItem
              key={membership.id}
              onSelect={() => handleSetActiveLabelId(membership.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2 truncate">
                  <Building className="h-4 w-4" />
                  <span className="truncate">
                    {membership.name || membership.slug || "Label"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {membership.role || "member"}
                  </Badge>
                  {mode === "label" && activeLabel?.id === membership.id && (
                    <Check className="h-4 w-4" />
                  )}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/studio/label") }>
          <Building className="h-4 w-4 mr-2" />
          Open Label Studio
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/studio/label?create=1")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Label
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const isActive = (url: string) => {
    if (url === "/studio") {
      return location.pathname === "/studio" || location.pathname === "/studio/" || location.pathname === "/creator/dashboard";
    }
    return location.pathname.startsWith(url);
  };

  const hasActiveChild = (items?: Array<{ url: string }>) => {
    if (!items) return false;
    return items.some(item => isActive(item.url));
  };

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  return (
    <StudioContext.Provider value={contextValue}>
      <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Music className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Creator Studio</h2>
                <p className="text-xs text-muted-foreground">Professional Dashboard</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    if (item.items && item.items.length > 0) {
                      const isOpen = openSections.has(item.title);
                      const hasActive = hasActiveChild(item.items);
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Collapsible open={isOpen} onOpenChange={() => toggleSection(item.title)}>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                isActive={hasActive}
                                className="w-full justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </div>
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform",
                                  isOpen && "rotate-180"
                                )} />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isActive(subItem.url)}
                                    >
                                      <button
                                        onClick={() => navigate(subItem.url)}
                                        className="w-full text-left"
                                      >
                                        <subItem.icon className="h-3 w-3" />
                                        <span>{subItem.title}</span>
                                      </button>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </Collapsible>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.url ? isActive(item.url) : false}
                        >
                          <button
                            onClick={() => item.url && navigate(item.url)}
                            className="w-full justify-start"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="p-2">
              <div className="text-xs text-muted-foreground text-center">
                Creator Studio v2.0
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            {workspaceSwitcher}
            <ThemeToggle />
          </header>
          
          <main className="flex-1 p-6 creator-studio-scope">

            {children}
          </main>
        </SidebarInset>
      </div>
      </SidebarProvider>
    </StudioContext.Provider>
  );
};
