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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLabelMemberships } from "@/hooks/useLabelMemberships";
import { StudioContext } from "@/contexts/StudioContext";
import OnboardingProgressWidget from "@/components/OnboardingProgressWidget";
import CreatorWelcome from "@/components/CreatorWelcome";
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
import { useIntl, IntlShape } from "react-intl";

interface CreatorStudioLayoutProps {
  children: React.ReactNode;
}

type StudioMode = "personal" | "label";

const createNavigationItems = (intl: IntlShape, isAdmin: boolean) => {
  const items = [
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.dashboard', defaultMessage: 'Dashboard' }),
    url: '/studio',
    icon: Home,
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.catalog', defaultMessage: 'Catalog' }),
    icon: Package,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.releases', defaultMessage: 'Releases' }),
        url: '/studio/catalog?tab=releases',
        icon: Music,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.beats', defaultMessage: 'Beats' }),
        url: '/studio/catalog?tab=beats',
        icon: HeadphonesIcon,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.soundPacks', defaultMessage: 'Sound Packs' }),
        url: '/studio/catalog?tab=sound-packs',
        icon: Package,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.bundles', defaultMessage: 'Bundles' }),
        url: '/studio/catalog?tab=bundles',
        icon: ShoppingBag,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.merch', defaultMessage: 'Merchandise' }),
        url: '/studio/catalog?tab=merch',
        icon: Gift,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.catalog.collectibles', defaultMessage: 'Collectibles' }),
        url: '/studio/catalog?tab=collectibles',
        icon: TrendingUp,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.plugins', defaultMessage: 'Plug-ins/Channels' }),
    icon: Plug,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.connect', defaultMessage: 'Connect' }),
        url: '/studio/plugins/connect',
        icon: Zap,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.composer', defaultMessage: 'Composer' }),
        url: '/studio/plugins/composer',
        icon: Music,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.scheduler', defaultMessage: 'Scheduler' }),
        url: '/studio/plugins/scheduler',
        icon: Calendar,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.inbox', defaultMessage: 'Inbox' }),
        url: '/studio/plugins/inbox',
        icon: MessageCircle,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.analytics', defaultMessage: 'Analytics' }),
        url: '/studio/plugins/analytics',
        icon: BarChart3,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.plugins.smartLinks', defaultMessage: 'Smart Links' }),
        url: '/studio/plugins/smart-links',
        icon: Globe,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.live', defaultMessage: 'Live' }),
    icon: Radio,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.live.sessions', defaultMessage: 'Sessions' }),
        url: '/studio/live/sessions',
        icon: Radio,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.live.tickets', defaultMessage: 'Tickets' }),
        url: '/studio/live/tickets',
        icon: FileText,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.live.recordings', defaultMessage: 'Recordings' }),
        url: '/studio/live/recordings',
        icon: HeadphonesIcon,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.courses', defaultMessage: 'Courses' }),
    icon: GraduationCap,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.courses.builder', defaultMessage: 'Builder' }),
        url: '/studio/courses/builder',
        icon: Workflow,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.courses.pricing', defaultMessage: 'Pricing' }),
        url: '/studio/courses/pricing',
        icon: DollarSign,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.courses.enrollments', defaultMessage: 'Enrollments' }),
        url: '/studio/courses/enrollments',
        icon: UserPlus,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.memberships', defaultMessage: 'Memberships' }),
    icon: Crown,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.memberships.plans', defaultMessage: 'Plans' }),
        url: '/studio/memberships/plans',
        icon: CreditCard,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.memberships.perks', defaultMessage: 'Perks' }),
        url: '/studio/memberships/perks',
        icon: Gift,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.memberships.community', defaultMessage: 'Community' }),
        url: '/studio/memberships/community',
        icon: Users,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.crowdfunding', defaultMessage: 'Crowdfunding' }),
    icon: DollarSign,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crowdfunding.campaigns', defaultMessage: 'Campaigns' }),
        url: '/studio/crowdfunding/campaigns',
        icon: PieChart,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crowdfunding.rewards', defaultMessage: 'Rewards' }),
        url: '/studio/crowdfunding/rewards',
        icon: Gift,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crowdfunding.supporters', defaultMessage: 'Supporters' }),
        url: '/studio/crowdfunding/supporters',
        icon: Users,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.collaborations', defaultMessage: 'Collaborations' }),
    icon: Handshake,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.collaborations.gigs', defaultMessage: 'Gigs' }),
        url: '/studio/collaborations/gigs',
        icon: Calendar,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.collaborations.inbox', defaultMessage: 'Inbox' }),
        url: '/studio/collaborations/inbox',
        icon: MessageCircle,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.collaborations.partners', defaultMessage: 'Partners' }),
        url: '/studio/collaborations/partners',
        icon: Handshake,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.analytics', defaultMessage: 'Analytics' }),
    icon: BarChart3,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.analytics.revenue', defaultMessage: 'Revenue' }),
        url: '/studio/analytics/revenue',
        icon: DollarSign,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.analytics.engagement', defaultMessage: 'Engagement' }),
        url: '/studio/analytics/engagement',
        icon: Users,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.analytics.audience', defaultMessage: 'Audience' }),
        url: '/studio/analytics/audience',
        icon: UserCheck,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.crm', defaultMessage: 'CRM' }),
    icon: Users,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crm.contacts', defaultMessage: 'Contacts' }),
        url: '/studio/crm/contacts',
        icon: Users,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crm.segments', defaultMessage: 'Segments' }),
        url: '/studio/crm/segments',
        icon: PieChart,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.crm.automations', defaultMessage: 'Automations' }),
        url: '/studio/crm/automations',
        icon: Workflow,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.storefront', defaultMessage: 'Storefront' }),
    icon: Store,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.storefront.themes', defaultMessage: 'Themes' }),
        url: '/studio/storefront/themes',
        icon: Lightbulb,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.storefront.pages', defaultMessage: 'Pages' }),
        url: '/studio/storefront/pages',
        icon: FileText,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.storefront.checkout', defaultMessage: 'Checkout' }),
        url: '/studio/storefront/checkout',
        icon: Receipt,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.financials', defaultMessage: 'Financials' }),
    icon: DollarSign,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.financials.payouts', defaultMessage: 'Payouts' }),
        url: '/studio/financials/payouts',
        icon: Receipt,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.financials.statements', defaultMessage: 'Statements' }),
        url: '/studio/financials/statements',
        icon: FileText,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.financials.taxes', defaultMessage: 'Taxes' }),
        url: '/studio/financials/taxes',
        icon: Shield,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.settings', defaultMessage: 'Settings' }),
    icon: Settings,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.settings.profile', defaultMessage: 'Profile' }),
        url: '/studio/settings/profile',
        icon: User,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.settings.team', defaultMessage: 'Team' }),
        url: '/studio/settings/team',
        icon: Users,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.settings.integrations', defaultMessage: 'Integrations' }),
        url: '/studio/settings/integrations',
        icon: Plug,
      },
    ],
  },
  {
    title: intl.formatMessage({ id: 'creatorStudio.nav.partnerships', defaultMessage: 'Partnerships' }),
    icon: Handshake,
    items: [
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.partnerships.marketplace', defaultMessage: 'Marketplace' }),
        url: '/studio/partnerships/marketplace',
        icon: Store,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.partnerships.requests', defaultMessage: 'Requests' }),
        url: '/studio/partnerships/requests',
        icon: MessageCircle,
      },
      {
        title: intl.formatMessage({ id: 'creatorStudio.nav.partnerships.deals', defaultMessage: 'Deals' }),
        url: '/studio/partnerships/deals',
        icon: Check,
      },
    ],
  },
  ];

  if (isAdmin) {
    items.push({
      title: intl.formatMessage({ id: 'creatorStudio.nav.admin', defaultMessage: 'Admin' }),
      icon: Shield,
      items: [
        {
          title: intl.formatMessage({ id: 'creatorStudio.nav.admin.moderation', defaultMessage: 'Moderation Queue' }),
          url: '/studio/admin/moderation',
          icon: Shield,
        },
      ],
    });
  }

  return items;
};

export const CreatorStudioLayout: React.FC<CreatorStudioLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { memberships, loading: labelsLoading, refresh } = useLabelMemberships();
  const intl = useIntl();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!cancelled) {
          if (error) {
            console.error('Failed to verify admin role', error);
            setIsAdmin(false);
          } else {
            setIsAdmin(Boolean(data));
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to verify admin role', err);
          setIsAdmin(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const navigationItems = useMemo(() => createNavigationItems(intl, isAdmin), [intl, isAdmin]);
  const defaultOpenSections = useMemo(
    () => {
      const sections = [
        intl.formatMessage({ id: 'creatorStudio.nav.catalog', defaultMessage: 'Catalog' }),
        intl.formatMessage({ id: 'creatorStudio.nav.analytics', defaultMessage: 'Analytics' }),
      ];
      if (isAdmin) {
        sections.push(intl.formatMessage({ id: 'creatorStudio.nav.admin', defaultMessage: 'Admin' }));
      }
      return sections;
    },
    [intl, isAdmin]
  );
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(defaultOpenSections));
  useEffect(() => {
    setOpenSections(new Set(defaultOpenSections));
  }, [defaultOpenSections]);

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
                {activeLabel.name || activeLabel.slug || intl.formatMessage({ id: 'creatorStudio.workspace.label', defaultMessage: 'Label workspace' })}
              </span>
              <Badge variant="secondary" className="text-xs capitalize">
                {activeLabel.role || intl.formatMessage({ id: 'creatorStudio.role.member', defaultMessage: 'member' })}
              </Badge>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>{intl.formatMessage({ id: 'creatorStudio.workspace.personal', defaultMessage: 'Personal workspace' })}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{intl.formatMessage({ id: 'creatorStudio.workspace.menuTitle', defaultMessage: 'Workspace' })}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleSetMode("personal")}>
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {intl.formatMessage({ id: 'creatorStudio.workspace.personal', defaultMessage: 'Personal workspace' })}
            </span>
            {mode === "personal" && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{intl.formatMessage({ id: 'creatorStudio.workspace.labels', defaultMessage: 'Labels' })}</DropdownMenuLabel>
        {labelsLoading ? (
          <DropdownMenuItem disabled>{intl.formatMessage({ id: 'creatorStudio.workspace.loading', defaultMessage: 'Loading labels…' })}</DropdownMenuItem>
        ) : memberships.length === 0 ? (
          <DropdownMenuItem disabled>{intl.formatMessage({ id: 'creatorStudio.workspace.none', defaultMessage: 'No labels yet' })}</DropdownMenuItem>
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
                    {membership.name || membership.slug || intl.formatMessage({ id: 'creatorStudio.workspace.labelFallback', defaultMessage: 'Label' })}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {membership.role || intl.formatMessage({ id: 'creatorStudio.role.member', defaultMessage: 'member' })}
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
          {intl.formatMessage({ id: 'creatorStudio.workspace.openLabel', defaultMessage: 'Open Label Studio' })}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/studio/label?create=1")}>
          <Plus className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: 'creatorStudio.workspace.createLabel', defaultMessage: 'Create New Label' })}
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
        <a
          href="#studio-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to studio content
        </a>
        <div className="min-h-screen w-full bg-background flex flex-col md:flex-row">
        <Sidebar className="border-r border-border/50" aria-label="Studio navigation">
          <SidebarHeader className="border-b border-border/30">
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
                <Music className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">{intl.formatMessage({ id: 'creatorStudio.header.title', defaultMessage: 'Creator Studio' })}</h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{intl.formatMessage({ id: 'creatorStudio.header.subtitle', defaultMessage: 'Pro Dashboard' })}</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <nav aria-label="Studio sections" className="space-y-1">
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
                                className={cn(
                                  "w-full justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-muted/50",
                                  hasActive && "bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 text-orange-500"
                                )}
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
                                      className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => navigate(subItem.url)}
                                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted focus-visible:outline-none"
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
                          className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <button
                            type="button"
                            onClick={() => item.url && navigate(item.url)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted focus-visible:outline-none"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                </nav>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-border/30">
            {/* Onboarding Progress Widget */}
            <div className="px-3 pt-3">
              <OnboardingProgressWidget variant="sidebar" />
            </div>
            <div className="p-3">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Studio v2.0
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-4 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10">
            <SidebarTrigger
              className="-ml-1 h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Toggle studio navigation"
            />
            <div className="flex-1" />
            {workspaceSwitcher}
            <div className="h-5 w-px bg-border/50" />
            <ThemeToggle />
          </header>
          
          <main id="studio-main" className="flex-1 p-6 creator-studio-scope" tabIndex={-1}>

            {children}
          </main>
        </SidebarInset>
      </div>
      </SidebarProvider>
      
      {/* Creator Welcome Modal for new creators */}
      <CreatorWelcome />
    </StudioContext.Provider>
  );
};
