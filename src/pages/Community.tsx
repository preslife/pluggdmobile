import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  Radio,
  Users,
  Megaphone,
  BookOpen,
  Coins,
  CalendarDays,
  Clock,
  Star,
  Handshake,
  ArrowRight,
  MessageSquarePlus,
  PlayCircle,
  Music2,
  Crown,
  Sparkles,
  Compass,
  Command as CommandIcon,
  Search,
  Play,
  Pause,
  Download,
  Plus,
  PenSquare,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArtistTipButton } from "@/components/ArtistTipButton";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuestsXP } from "@/components/QuestsXP";
import { useReleases, type ReleaseSummary } from "@/hooks/useReleases";
import { setMeta } from "@/lib/seo";
import { getAcademyBasePath } from '@/lib/academyRoutes';
import ReportButton from "@/components/ReportButton";
import MapView from "@/features/fanMap/components/MapView";
import PluggdWall from "@/features/fanMap/components/PluggdWall";
import { PlugProvider } from "@/features/fanMap/contexts/PlugContext";

/**
 * PLUGGD — COMMUNITY HUB
 * Refreshed hub around the release carousel, quick actions, and sticky tabs.
 * - Adds Supabase-powered feed with blog/forum merge + top releases rail.
 * - Introduces create modal + quick action sidebar tied to key workflows.
 * - Reorganises verticals into dedicated tab layouts while keeping command bar.
 */

// ---------- Shared UI primitives ---------- //

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div
    className={`rounded-2xl border border-white/10 bg-card backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div className={`px-5 pt-5 ${className}`} {...props}>{children}</div>
);

const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", children, ...props }) => (
  <h3 className={`text-zinc-100 text-lg font-semibold tracking-tight ${className}`} {...props}>{children}</h3>
);

const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div className={`px-5 pb-5 ${className}`} {...props}>{children}</div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition-all active:scale-[.98] ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className = "", children, ...props }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 ${className}`}
    {...props}
  >
    {children}
  </span>
);

// ---------- Helpers ---------- //

const formatNumber = (n: number) => new Intl.NumberFormat().format(n);
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

function timeLeft(toISO?: string) {
  if (!toISO) return "";
  const diff = new Date(toISO).getTime() - Date.now();
  if (diff <= 0) return "ended";
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function classNames(...n: (string | false | null | undefined)[]) { return n.filter(Boolean).join(" "); }

function normalizeCommunityHref(href?: string | null) {
  if (!href) return "/collaborate";
  try {
    if (href.startsWith("/forum")) {
      const url = new URL(href, "https://pluggd.community");
      const tag = url.searchParams.get("tag");
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[1];
      if (tag) return `/collaborate?tag=${encodeURIComponent(tag)}`;
      if (slug) return `/collaborate?thread=${encodeURIComponent(slug)}`;
      return "/collaborate";
    }
    if (href.startsWith("/campaigns")) {
      const url = new URL(href, "https://pluggd.community");
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[1];
      return `/studio/crowdfunding${slug ? `?campaign=${encodeURIComponent(slug)}` : ""}`;
    }
    if (href === "/contests") return "/challenges";
    if (href === "/campaigns/new") return "/studio/crowdfunding";
  } catch {
    return "/collaborate";
  }
  return href;
}

// ---------- Types ---------- //

type Contest = { id: string; title: string; cover: string | null; cover_image_url?: string | null; entrants: number; ends_at: string; slug: string };

type Campaign = { id: string; title: string; cover?: string | null; goal: number; raised: number; ends_at?: string | null; slug?: string | null };

type Track = { id: string; title: string; artist: string; cover: string | null; url: string | null; duration?: number };

type LiveEvent = { id: string; title: string; cover: string | null; start_at: string; url: string; host: string; viewers: number; is_live: boolean };

type Thread = { id: string; title: string; slug: string; tag: string; reply_count: number; updated_at: string; author: { username: string | null; avatar: string | null } };

type Course = { id: string; title: string; instructor: string | null; level: string | null; length: string | null; cover: string | null; slug: string };

type Member = { id: string; username: string | null; avatar: string | null; role: string; badges: string[] };

type Creator = {
  id: string; slug: string; name: string; avatar: string | null; cover: string | null; genres: string[]; followers: number;
  bio: string; stats: { contest_wins: number; placements: number };
  featured_track: { title: string | null; cover: string | null; url: string | null; plays: number };
  featured_campaign_slug?: string | null;
};

type Announcement = { text: string };

type DailyPromptT = { text: string; tag: string | null; cta_text?: string | null; cta_href?: string | null };

type CollabBrief = { id: string; title: string; slug: string; genre: string | null; skill: string; budget: string | null; author: { avatar: string | null } };

type Quest = { id: string; title: string; xp: number; completed?: boolean };

type CommunityRadioT = { listeners: number; now: Track; queue: Track[] };

type BlogPost = {
  id: string;
  title: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  tags?: string[];
  created_at: string;
  slug?: string | null;
};

type HubData = {
  contests: Contest[]; campaigns: Campaign[]; events: LiveEvent[]; threads: Thread[]; courses: Course[]; members: Member[];
  trending: { tag: string; count: number }[]; badges: string[];
  stats: { members: number; active_week: number; streak_days: number; xp: number };
  creator_spotlight: Creator | null; radio: CommunityRadioT; announcements: Announcement[]; daily_prompt: DailyPromptT | null; collab_briefs: CollabBrief[]; quests: Quest[]; blog_posts: BlogPost[];
};

// ---------- Data Fetcher ---------- //

async function fetchHubData(): Promise<HubData> {
  // Try to fetch from RPC, but fall back to empty data if it fails
  let rpcData: any = null;
  try {
    const { data, error } = await supabase.rpc("fn_hub_payload");
    if (!error) {
      rpcData = data;
    }
  } catch (e) {
    console.warn("fn_hub_payload RPC not available, using fallback data");
  }

  // Fetch additional data not included in fn_hub_payload
  const [
    campaignsRes,
    announcementsRes,
    dailyPromptRes,
    questsRes,
    radioStateRes,
    radioQueueRes,
    blogPostsRes,
  ] = await Promise.all([
    supabase.from("campaigns").select("id, owner_id, title, cover_url, goal, raised, ends_at, slug").order("created_at", { ascending: false }).limit(6),
    supabase.from("announcements").select("text, is_live, starts_at, ends_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("daily_prompts").select("text, tag, cta_text, cta_href, starts_at, ends_at").order("starts_at", { ascending: false }).limit(1),
    supabase.from("quests").select("id, title, xp, is_active").order("created_at", { ascending: false }).limit(6),
    supabase.from("radio_state").select("listeners, now_track_id").order("updated_at", { ascending: false }).limit(1),
    supabase.from("radio_queue").select("position, track_id").order("position", { ascending: true }),
    supabase.from("blog_posts").select("id, title, excerpt, featured_image_url, tags, created_at, slug, is_published").eq("is_published", true).order("created_at", { ascending: false }).limit(6),
  ]);

  const campaigns = campaignsRes.data?.map(c => ({
    id: c.id, title: c.title, cover: c.cover_url ?? null, goal: Number(c.goal ?? 0), raised: Number(c.raised ?? 0),
    ends_at: c.ends_at ?? null, slug: c.slug ?? null
  })) ?? [];

  const now = new Date();
  const announcements = (announcementsRes.data ?? [])
    .filter(a => (a.is_live ?? true) && (!a.starts_at || new Date(a.starts_at) <= now) && (!a.ends_at || now <= new Date(a.ends_at)))
    .map(a => ({ text: a.text }));

  const daily_prompt = (dailyPromptRes.data?.[0])
    ? { text: dailyPromptRes.data[0].text, tag: dailyPromptRes.data[0].tag ?? null, cta_text: dailyPromptRes.data[0].cta_text ?? null, cta_href: dailyPromptRes.data[0].cta_href ?? null }
    : null;

  const quests = (questsRes.data ?? [])
    .filter(q => q.is_active)
    .map(q => ({ id: q.id, title: q.title, xp: q.xp }));

  const blog_posts: BlogPost[] = (blogPostsRes.data ?? []).map((post: any) => ({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt ?? null,
    featured_image_url: post.featured_image_url ?? null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    created_at: post.created_at,
    slug: post.slug ?? null,
  }));

  // Radio join (safe fallback if empty)
  const listeners = radioStateRes.data?.[0]?.listeners ?? 0;
  const nowTrackId = radioStateRes.data?.[0]?.now_track_id ?? null;
  const trackIds = [
    ...(nowTrackId ? [nowTrackId] : []),
    ...((radioQueueRes.data ?? []).map(q => q.track_id))
  ];
  const unique = Array.from(new Set(trackIds));
  const radio: HubData["radio"] = {
    listeners,
    now: { id: "0", title: "Community Radio", artist: "Pluggd", cover: null, url: null },
    queue: []
  };
  if (unique.length) {
    const { data: tracks } = await supabase.from("tracks")
      .select("id, title, audio_url, release:releases(id, title, artist, cover_art_url)")
      .in("id", unique);

    const toTrack = (t: any): Track => ({
      id: t.id,
      title: t.title,
      artist: t.release?.artist ?? "Unknown",
      cover: t.release?.cover_art_url ?? null,
      url: t.audio_url ?? null
    });

    const map = new Map(tracks?.map(t => [t.id, t]) ?? []);
    if (nowTrackId && map.has(nowTrackId)) radio.now = toTrack(map.get(nowTrackId));
    radio.queue = (radioQueueRes.data ?? [])
      .map(q => map.get(q.track_id))
      .filter(Boolean)
      .map(toTrack)
      .slice(0, 5);
  }

  // Merge with RPC payload (or use empty defaults)
  const payload = rpcData ?? {};
  const hub: HubData = {
    contests: payload.contests ?? [],
    events: payload.events ?? [],
    threads: payload.threads ?? [],
    courses: payload.courses ?? [],
    members: (payload.members ?? []).map((m: any) => ({
      id: m.id, username: m.username, avatar: m.avatar, role: m.role ?? "member", badges: m.badges ?? []
    })),
    trending: payload.trending ?? [],
    badges: [], // keep as [] for now (we show badges per member & achievements card)
    stats: payload.stats ?? { members: 0, active_week: 0, streak_days: 0, xp: 0 },
    creator_spotlight: payload.creator_spotlight ?? null,
    radio,
    announcements,
    daily_prompt,
    campaigns,
    collab_briefs: payload.collab_briefs ?? [],
    quests,
    blog_posts,
  };

  // Fill required fallbacks for nullables
  hub.contests = hub.contests.map((c: any) => ({ ...c, cover: c.cover ?? "/placeholder.svg" }));
  hub.events   = hub.events.map((e: any) => ({ ...e, cover: e.cover ?? "/placeholder.svg" }));
  hub.courses  = hub.courses.map((c: any) => ({ ...c, cover: c.cover ?? "/placeholder.svg" }));

  return hub;
}

// ---------- EPIC Community Hub ---------- //

type TabId = "feed" | "contests" | "collabs" | "crowdfund" | "live" | "blog";

const TABS: { id: TabId; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "contests", label: "Contests" },
  { id: "collabs", label: "Collabs" },
  { id: "crowdfund", label: "Crowdfund" },
  { id: "live", label: "Live" },
  { id: "blog", label: "Blog" },
];

export default function CommunityHubEpic() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCmd, setShowCmd] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const academyPath = getAcademyBasePath();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hub = await fetchHubData();
        if (!cancelled) { setData(hub); }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Command bar hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setShowCmd((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const dynamicDescription = data?.announcements?.[0]?.text
      || "Catch live battles, collaborate with peers, and unlock quests inside the Pluggd community hub.";
    setMeta(
      "Community Hub — Pluggd",
      dynamicDescription,
      "/community",
      data?.creator_spotlight?.cover || undefined
    );
  }, [data]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam as TabId);
    }
  }, [searchParams]);

  const handleTabChange = useCallback(
    (next: TabId) => {
      setActiveTab(next);
      const params = new URLSearchParams(searchParams);
      params.set("tab", next);
      navigate({ search: params.toString() }, { replace: true });
    },
    [navigate, searchParams]
  );

  const livesNow = useMemo(() => (data?.events || []).filter((e) => e.is_live), [data?.events]);

  const quickActions = useMemo(
    () => [
      {
        label: "Enter a contest",
        description: "Win placements and cash prizes",
        href: "/challenges",
        icon: <Trophy className="h-4 w-4" />,
      },
      {
        label: "Post a collab brief",
        description: "Find your next co-creator",
        href: "/collaborate",
        icon: <Handshake className="h-4 w-4" />,
      },
      {
        label: "Start crowdfunding",
        description: "Launch member-only rewards",
        href: "/studio/crowdfunding",
        icon: <Megaphone className="h-4 w-4" />,
      },
      {
        label: "Host a live session",
        description: "Book a slot and go live",
        href: "/studio/live/sessions",
        icon: <Radio className="h-4 w-4" />,
      },
    ],
    []
  );

  const createActions = useMemo(
    () => [
      { label: "Contest", description: "Launch a new challenge", href: "/studio/catalog?tab=releases", icon: <Trophy className="h-4 w-4" /> },
      { label: "Collab Brief", description: "Recruit producers, writers, vocalists", href: "/collaborate", icon: <Handshake className="h-4 w-4" /> },
      { label: "Crowdfunding Campaign", description: "Fund releases with fan backing", href: "/studio/crowdfunding", icon: <Megaphone className="h-4 w-4" /> },
      { label: "Live Session", description: "Schedule a livestream or listening party", href: "/studio/live/sessions", icon: <Radio className="h-4 w-4" /> },
      { label: "Blog Post", description: "Share news, recaps, or tutorials", href: "/studio/courses/builder", icon: <PenSquare className="h-4 w-4" /> },
    ],
    []
  );

  const renderTabContent = () => {
    if (!data) return null;

    switch (activeTab) {
      case "contests":
        return (
          <ContestsTabContent
            contests={data.contests}
            leaderboard={data.members}
            events={data.events}
          />
        );
      case "collabs":
        return (
          <CollabsTabContent
            briefs={data.collab_briefs}
            threads={data.threads}
            trending={data.trending}
          />
        );
      case "crowdfund":
        return <CrowdfundTabContent campaigns={data.campaigns} />;
      case "live":
        return (
          <LiveTabContent
            events={data.events}
            livesNow={livesNow}
            radio={data.radio}
          />
        );
      case "blog":
        return <BlogTabContent posts={data.blog_posts} threads={data.threads} />;
      case "feed":
      default:
        return (
          <FeedTabContent
            loading={loading}
            dailyPrompt={data.daily_prompt}
            threads={data.threads}
            blogPosts={data.blog_posts}
            events={data.events}
            radio={data.radio}
            trending={data.trending}
            creator={data.creator_spotlight}
          />
        );
    }
  };

  const tabContent = renderTabContent();

  if (loading) {
    return (
      <PlugProvider>
        <main className="relative min-h-screen w-full bg-background text-foreground">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="mx-auto mb-6 h-20 w-20 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
              <h2 className="text-xl font-semibold text-white mb-2">Loading Community Hub</h2>
              <p className="text-zinc-400">Gathering the latest from the community...</p>
            </div>
          </div>
        </main>
      </PlugProvider>
    );
  }

  if (!data) {
    return (
      <PlugProvider>
        <main className="relative min-h-screen w-full bg-background text-foreground">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Community Hub</h2>
              <p className="text-zinc-400 mb-6">
                {error || "Unable to load community data. Please try again."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </main>
      </PlugProvider>
    );
  }

  const hasAnnouncements = Boolean(data.announcements?.length);

  return (
    <PlugProvider>
      <main className="relative min-h-screen w-full bg-background text-foreground">
      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative pt-6 pb-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Users className="w-3 h-3 mr-1" />
              {formatNumber(data.stats.members)} creators worldwide
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              The <span className="text-primary">Community Hub</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Connect with creators, enter contests, find collaborators, and grow together. 
              Your creative journey starts here.
            </p>
          </motion.div>

          {/* Quick Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-6 mb-8"
          >
            {[
              { icon: Users, label: `${formatNumber(data.stats.active_week)} active this week`, color: "text-emerald-400" },
              { icon: Trophy, label: `${data.contests.length} live contests`, color: "text-amber-400" },
              { icon: Radio, label: `${livesNow.length} live now`, color: "text-red-400" },
              { icon: Handshake, label: `${data.collab_briefs.length} open collabs`, color: "text-purple-400" },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-zinc-300">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Main Grid: Map + Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border border-white/10 bg-card/80 p-5 shadow-2xl backdrop-blur-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <Compass className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Fan Map</h2>
                <Badge className="ml-auto bg-white/10 border-white/20 text-xs">Interactive</Badge>
              </div>
              <div className="space-y-4">
                <PluggdWall />
                <MapView className="min-h-[24rem] rounded-2xl overflow-hidden" />
              </div>
            </motion.div>
            <motion.div 
              id="quick-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <QuickActionSidebar
                actions={quickActions}
                stats={data.stats}
                onCreate={() => setShowCreateModal(true)}
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="relative pb-16">
        {/* Sticky Tab Navigation */}
        <div className="sticky top-[var(--masthead-h)] z-30 border-b border-white/10 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4">
            <TabsNav
              tabs={TABS}
              active={activeTab}
              onSelect={handleTabChange}
              onCreate={() => setShowCreateModal(true)}
              onCommand={() => setShowCmd(true)}
            />
          </div>
        </div>

        {/* Announcements */}
        {hasAnnouncements && (
          <div className="border-b border-white/10 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5">
            <div className="mx-auto max-w-7xl px-4 py-2">
              <AnnouncementsBar announcements={data.announcements} />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <section className="mx-auto max-w-7xl px-4 py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tabContent}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <FooterCTA />

      <CreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        actions={createActions}
      />
      <CommandBar open={showCmd} onClose={() => setShowCmd(false)} onSelectTab={handleTabChange} />
      </main>
    </PlugProvider>
  );
}

// ---------- Action Dock (sticky) ---------- //

// ---------- Command Bar ---------- //

function CommandBar({ open, onClose, onSelectTab }: { open: boolean; onClose: () => void; onSelectTab?: (tab: TabId) => void }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onEsc); return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const actions: { label: string; href?: string; sectionId?: string; tab?: TabId }[] = [
    { label: "Switch to Feed tab", tab: "feed" },
    { label: "Switch to Contests tab", tab: "contests" },
    { label: "Switch to Collabs tab", tab: "collabs" },
    { label: "Switch to Crowdfund tab", tab: "crowdfund" },
    { label: "Switch to Live tab", tab: "live" },
    { label: "Switch to Blog tab", tab: "blog" },
    { label: "Jump: Quick Actions", sectionId: "quick-actions" },
    { label: "Action: Start a Post", href: "/collaborate" },
    { label: "Action: Enter a Contest", href: "/challenges" },
    { label: "Action: Start Crowdfunding", href: "/studio/crowdfunding" },
    { label: "Action: Host a Session", href: "/studio/live/sessions" },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()));

  const go = (a: { label: string; href?: string; sectionId?: string; tab?: TabId }) => {
    if (a.href) { window.location.href = a.href; return; }
    if (a.tab && onSelectTab) {
      onSelectTab(a.tab);
      onClose();
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      return;
    }
    if (a.sectionId) {
      const el = document.querySelector<HTMLElement>(`[data-section='${a.sectionId}']`) || document.getElementById(a.sectionId);
      if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 88; window.scrollTo({ top: y, behavior: "smooth" }); }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
          <CommandIcon className="h-4 w-4 text-amber-300"/>
          <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Type a command or jump…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
          <kbd className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-400">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map((a, i) => (
            <button key={i} onClick={() => go(a)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5">
              {a.label}
              <ArrowRight className="h-4 w-4 text-zinc-500"/>
            </button>
          ))}
          {!filtered.length && <div className="px-3 py-6 text-center text-sm text-zinc-500">No matches</div>}
        </div>
      </div>
    </div>
  );
}

type QuickActionItem = {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

function QuickActionSidebar({ actions, stats, onCreate }: { actions: QuickActionItem[]; stats: HubData["stats"]; onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-card/90 to-card/70 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Actions
          </h2>
          <p className="text-sm text-zinc-400">What would you like to do?</p>
        </div>
      </div>
      
      <div className="grid gap-2">
        {actions.map((action, idx) => (
          <motion.a
            key={action.label}
            href={action.href}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.05 }}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-primary/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-transparent text-primary">
              {action.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white group-hover:text-primary transition-colors">{action.label}</div>
              <div className="text-xs text-zinc-500 truncate">{action.description}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-primary group-hover:translate-x-0.5" />
          </motion.a>
        ))}
      </div>
      
      {/* Stats Card */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Community Pulse</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats.active_week)}</div>
            <div className="text-xs text-zinc-500">Active this week</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{formatNumber(stats.members)}</div>
            <div className="text-xs text-zinc-500">Total members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{formatNumber(stats.xp)}</div>
            <div className="text-xs text-zinc-500">XP earned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{stats.streak_days}d</div>
            <div className="text-xs text-zinc-500">Avg streak</div>
          </div>
        </div>
      </div>
      
      <Button 
        className="w-full bg-gradient-to-r from-primary to-amber-500 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]" 
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" />
        Create Something New
      </Button>
    </div>
  );
}

type TabsNavProps = {
  tabs: { id: TabId; label: string }[];
  active: TabId;
  onSelect: (tab: TabId) => void;
  onCreate: () => void;
  onCommand: () => void;
};

function TabsNav({ tabs, active, onSelect, onCreate, onCommand }: TabsNavProps) {
  const tabIcons: Record<TabId, React.ReactNode> = {
    feed: <Megaphone className="h-4 w-4" />,
    contests: <Trophy className="h-4 w-4" />,
    collabs: <Handshake className="h-4 w-4" />,
    crowdfund: <Coins className="h-4 w-4" />,
    live: <Radio className="h-4 w-4" />,
    blog: <BookOpen className="h-4 w-4" />,
  };

  return (
    <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
      <nav className="no-scrollbar -mx-2 flex gap-1.5 overflow-x-auto px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={classNames(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
              active === tab.id
                ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                : "border-transparent bg-transparent text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tabIcons[tab.id]}
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-2 self-start md:self-auto">
        <Button 
          className="hidden sm:inline-flex bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all" 
          onClick={onCommand}
        >
          <CommandIcon className="h-4 w-4" />
          <span className="hidden lg:inline">Command</span>
          <kbd className="ml-2 hidden lg:inline-flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
            ⌘K
          </kbd>
        </Button>
        <Button 
          className="bg-gradient-to-r from-primary to-amber-500 text-white font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>
    </div>
  );
}

type CreateModalProps = {
  open: boolean;
  onClose: () => void;
  actions: { label: string; description: string; href: string; icon: React.ReactNode }[];
};

function CreateModal({ open, onClose, actions }: CreateModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        onClick={stop}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Launch something new</h3>
            <p className="text-sm text-zinc-400">Choose a format and we’ll open the right workspace.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
            aria-label="Close create modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
              onClick={onClose}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-200">
                {action.icon}
              </span>
              <div className="flex-1">
                <div className="font-medium text-white">{action.label}</div>
                <div className="text-sm text-zinc-400">{action.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 transition group-hover:text-amber-300" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Sections ---------- //

function AnnouncementsBar({ announcements }: { announcements: Announcement[] }) {
  if (!announcements?.length) return null;
  return (
    <div className="relative isolate mx-auto w-full bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-500/10 py-2">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 text-sm text-amber-200">
        <SparkIcon />
        <div className="flex-1 overflow-hidden">
          <div className="whitespace-nowrap">
            {announcements.map((a, i) => (
              <span key={i} className="mr-6 opacity-90">{a.text}</span>
            ))}
          </div>
        </div>
        <a href="/roadmap" className="text-amber-300 hover:text-amber-200">What's new</a>
      </div>
    </div>
  );
}

function DailyPrompt({ prompt }: { prompt: DailyPromptT }) {
  const targetHref = normalizeCommunityHref(prompt.cta_href);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-500/10 p-4">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3 text-sm">
          <Sparkles className="h-4 w-4 text-amber-300"/>
          <span className="text-zinc-200"><strong>Daily Prompt:</strong> {prompt.text}</span>
        </div>
        <div className="flex items-center gap-3">
          {prompt.tag ? <Badge className="border-white/10 bg-white/5">{prompt.tag}</Badge> : null}
          <a href={targetHref}><Button className="bg-amber-500 text-zinc-950 hover:bg-amber-400">{prompt.cta_text || 'Open'}</Button></a>
        </div>
      </div>
    </div>
  );
}

// ---------- Creator Spotlight & Audio ---------- //

function CreatorSpotlight({ creator }: { creator: Creator }) {
  const { user } = useAuth();
  const { state, actions } = useGlobalPlayer();

  // Guard against incomplete creator data
  if (!creator || !creator.name) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative h-36 w-full overflow-hidden">
        <img src={creator.cover || '/placeholder.svg'} alt="cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 dark:from-black/70 dark:via-black/0" />
        <Badge className="absolute left-4 top-4 border-amber-400/30 bg-amber-500/10 text-amber-200"><Crown className="h-3 w-3"/>Creator of the Week</Badge>
      </div>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <img src={creator.avatar || '/placeholder.svg'} className="h-16 w-16 rounded-xl object-cover" alt="avatar"/>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-white">{creator.name}</h3>
              <Badge>{creator.genres?.join(" • ") || "No genres"}</Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-300/90">{creator.bio}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <span>{formatNumber(creator.followers || 0)} followers</span>
              {creator.stats?.contest_wins ? <span>{formatNumber(creator.stats.contest_wins)} contest wins</span> : null}
              {creator.stats?.placements ? <span>{formatNumber(creator.stats.placements)} placements</span> : null}
            </div>
          </div>
          <div className="hidden sm:block">
            <a href={`/creator/${creator.slug}`}><Button className="bg-white/10 text-white hover:bg-white/20">View Profile</Button></a>
          </div>
        </div>

        {/* Featured track mini-player */}
        {creator.featured_track && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <img src={creator.featured_track.cover || '/placeholder.svg'} className="h-12 w-12 rounded-lg object-cover" alt="track"/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{creator.featured_track.title}</div>
                <div className="text-xs text-zinc-400">{creator.name} • {formatNumber(creator.featured_track.plays || 0)} plays</div>
              </div>
              <SpotlightTrackPlayer creator={creator} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3">
          <ArtistTipButton 
            artistId={creator.id} 
            artistName={creator.name}
            variant="default"
            size="sm"
          />
          {creator.featured_campaign_slug && (
            <a href={`/studio/crowdfunding${creator.featured_campaign_slug ? `?campaign=${creator.featured_campaign_slug}` : ''}`}>
              <Button className="bg-white/10 text-white hover:bg-white/20">
                <Megaphone className="h-4 w-4"/>Support Campaign
              </Button>
            </a>
          )}
          <FollowButton 
            userId={creator.id} 
            currentUserId={user?.id || null}
            className="bg-white/10 text-white hover:bg-white/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightTrackPlayer({ creator }: { creator: Creator }) {
  const { state, actions } = useGlobalPlayer();
  
  // Guard against missing featured_track
  if (!creator?.featured_track) {
    return null;
  }
  
  const track = {
    id: `creator-spotlight-${creator.id}`,
    title: creator.featured_track.title || 'Unknown Track',
    artist: creator.name || 'Unknown Artist',
    src: creator.featured_track.url || '',
    artwork: creator.featured_track.cover || '/placeholder.svg'
  };

  const isCurrentTrack = state.currentTrack?.id === track.id;
  const trackIsPlaying = isCurrentTrack && state.isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack && state.isPlaying) {
      // This track is already playing, the global player handles pause
      return;
    }
    // Set up queue first, then play - same as SpotlightCarousel
    actions.setQueue([track], 0);
    actions.play(track);
  };

  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <Button 
        className="px-3 bg-white/10 text-white hover:bg-white/20" 
        onClick={handlePlay}
        disabled={!track.src}
      >
        {trackIsPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all duration-200" 
          style={{ width: trackIsPlaying ? '60%' : '0%' }} 
        />
      </div>
    </div>
  );
}

function RadioTrackPlayer({ track }: { track: { id: string; title: string; artist: string; url: string; cover: string } }) {
  const { state, actions } = useGlobalPlayer();
  
  const audioTrack = {
    id: `radio-${track.id}`,
    title: track.title,
    artist: track.artist,
    src: track.url,
    artwork: track.cover
  };

  const isCurrentTrack = state.currentTrack?.id === audioTrack.id;
  const trackIsPlaying = isCurrentTrack && state.isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack && state.isPlaying) {
      return;
    }
    actions.play(audioTrack);
  };

  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <Button 
        className="px-3 bg-white/10 text-white hover:bg-white/20" 
        onClick={handlePlay}
        disabled={!audioTrack.src}
      >
        {trackIsPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all duration-200" 
          style={{ width: trackIsPlaying ? '60%' : '0%' }} 
        />
      </div>
    </div>
  );
}

function CommunityRadio({ radio }: { radio: CommunityRadioT }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200"><Music2 className="h-5 w-5"/><CardTitle>Community Radio</CardTitle></div>
        <Badge className="border-green-400/40 bg-green-500/10 text-green-200">{formatNumber(radio.listeners)} listening</Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <img src={radio.now.cover} className="h-14 w-14 rounded-lg object-cover"/>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{radio.now.title}</div>
              <div className="text-xs text-zinc-400">{radio.now.artist}</div>
            </div>
            <RadioTrackPlayer track={radio.now} />
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-400">Up next</div>
        <div className="mt-1 flex flex-col gap-2">
          {radio.queue.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
              <img src={t.cover} className="h-10 w-10 rounded-md object-cover"/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-zinc-200">{t.title}</div>
                <div className="text-xs text-zinc-400">{t.artist}</div>
              </div>
              <a href={`/track/${t.id}`} className="text-xs text-amber-300 hover:text-amber-200">View</a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Tab Layouts ---------- //

type CombinedPost = {
  id: string;
  type: "forum" | "blog";
  title: string;
  subtitle: string;
  href: string;
  date: string;
  sourceId: string;
  tag?: string | null;
};

function FeedTabContent({
  loading,
  dailyPrompt,
  threads,
  blogPosts,
  events,
  radio,
  trending,
  creator,
}: {
  loading: boolean;
  dailyPrompt: DailyPromptT | null;
  threads: Thread[];
  blogPosts: BlogPost[];
  events: LiveEvent[];
  radio: CommunityRadioT;
  trending: { tag: string; count: number }[];
  creator: Creator | null;
}) {
  const { data: releases, loading: releasesLoading, error: releasesError } = useReleases(6);

  useEffect(() => {
    if (releasesError) console.warn("Failed to load releases for feed", releasesError);
  }, [releasesError]);

  const latestPosts = useMemo<CombinedPost[]>(() => {
    const forumPosts: CombinedPost[] = threads.slice(0, 6).map((thread) => ({
      id: `thread-${thread.id}`,
      type: "forum",
      title: thread.title,
      subtitle: `by ${thread.author.username ?? "Unknown"} • ${thread.reply_count} replies`,
      href: normalizeCommunityHref(`/forum/${thread.slug}`),
      date: thread.updated_at,
      sourceId: thread.id,
      tag: thread.tag,
    }));

    const blog: CombinedPost[] = blogPosts.slice(0, 6).map((post) => ({
      id: `blog-${post.id}`,
      type: "blog",
      title: post.title,
      subtitle: post.excerpt ?? "",
      href: post.slug ? `/blog/${post.slug}` : `/blog`,
      date: post.created_at,
      sourceId: post.id,
      tag: (post.tags && post.tags[0]) || "Blog",
    }));

    return [...forumPosts, ...blog]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [threads, blogPosts]);

  const eventsTeaser = useMemo(() => events.slice(0, 3), [events]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr),minmax(0,1.2fr)]">
      <div className="space-y-6">
        {dailyPrompt && <DailyPrompt prompt={dailyPrompt} />}
        {creator ? <CreatorSpotlight creator={creator} /> : null}
        <LatestPostsList posts={latestPosts} />
        <TopReleasesList loading={releasesLoading} releases={releases} />
      </div>
      <aside className="space-y-6">
        <RadioMiniCard radio={radio} />
        <QuestsXP />
        <UpcomingEventsTeaser events={eventsTeaser} />
        <TrendingTopics topics={trending} />
      </aside>
    </div>
  );
}

function LatestPostsList({ posts }: { posts: CombinedPost[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200">
          <MessageSquarePlus className="h-5 w-5" />
          <CardTitle>Latest posts</CardTitle>
        </div>
        <a href="/collaborate" className="text-sm text-amber-300 hover:text-amber-200">Open feed</a>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No conversations yet — start one!</div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.href}
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-amber-200">
                  {post.type === "blog" ? <PenSquare className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-white group-hover:text-amber-200">{post.title}</span>
                    {post.tag ? <Badge>{post.tag}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{post.subtitle}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                  <ReportButton
                    targetType={post.type === "blog" ? "blog_post" : "post"}
                    targetId={post.sourceId}
                    className="text-xs"
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopReleasesList({ releases, loading }: { releases: ReleaseSummary[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200">
          <PlayCircle className="h-5 w-5" />
          <CardTitle>Top releases</CardTitle>
        </div>
        <a href="/releases" className="text-sm text-amber-300 hover:text-amber-200">Browse all</a>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : releases.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {releases.map((release) => (
              <a
                key={release.id}
                href={`/release/${release.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
              >
                <img
                  src={release.cover_art_url || "/placeholder.svg"}
                  alt={release.title ?? "Release art"}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{release.title ?? "Untitled release"}</div>
                  <div className="text-xs text-zinc-400">{release.artist ?? "Unknown"}</div>
                  <div className="text-xs text-zinc-500">
                    {release.genre ?? ""}
                    {release.release_date ? ` • ${new Date(release.release_date).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No live releases yet.</div>
        )}
      </CardContent>
    </Card>
  );
}

function RadioMiniCard({ radio }: { radio: CommunityRadioT }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200"><Music2 className="h-5 w-5"/><CardTitle>Community radio</CardTitle></div>
        <Badge className="border-green-400/40 bg-green-500/10 text-green-200">{formatNumber(radio.listeners)} listening</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <img src={radio.now.cover || "/placeholder.svg"} alt={radio.now.title} className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{radio.now.title}</div>
            <div className="text-xs text-zinc-400">{radio.now.artist}</div>
          </div>
          <a href="/radio" className="text-sm text-amber-300 hover:text-amber-200">Listen</a>
        </div>
        {radio.queue.length ? (
          <div className="mt-3 space-y-2">
            {radio.queue.slice(0, 3).map((track) => (
              <div key={track.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-zinc-400">
                <img src={track.cover || "/placeholder.svg"} alt={track.title} className="h-8 w-8 rounded-md object-cover" />
                <div className="min-w-0 flex-1 truncate text-zinc-300">{track.title}</div>
                <span className="text-zinc-500">{track.artist}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UpcomingEventsTeaser({ events }: { events: LiveEvent[] }) {
  if (!events.length) return null;
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200"><CalendarDays className="h-5 w-5"/><CardTitle>Upcoming events</CardTitle></div>
        <a href="/live" className="text-sm text-amber-300 hover:text-amber-200">See schedule</a>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <a
              key={event.id}
              href={event.url}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <img src={event.cover || "/placeholder.svg"} alt={event.title} className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{event.title}</div>
                <div className="text-xs text-zinc-400">{new Date(event.start_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContestsTabContent({ contests, leaderboard, events }: { contests: Contest[]; leaderboard: Member[]; events: LiveEvent[] }) {
  const liveEvents = useMemo(() => events.filter((event) => event.is_live), [events]);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">Featured contests</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contests.length ? contests.map((contest) => (
            <ContestCard key={contest.id} contest={contest} />
          )) : <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No contests are running right now.</div>}
        </div>
      </div>
      {liveEvents.length ? <LiveNow lives={liveEvents} /> : null}
      <TopMembers members={leaderboard.slice(0, 5)} />
    </div>
  );
}

function CollabsTabContent({ briefs, threads, trending }: { briefs: CollabBrief[]; threads: Thread[]; trending: { tag: string; count: number }[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
      <div className="space-y-6">
        <CollabRadar briefs={briefs} />
        <ForumThreads threads={threads} loading={false} />
      </div>
      <div className="space-y-6">
        <TrendingTopics topics={trending} />
        <QuestsXP />
      </div>
    </div>
  );
}

function CrowdfundTabContent({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.length ? campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        )) : <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No active campaigns yet.</div>}
      </div>
    </div>
  );
}

function LiveTabContent({ events, livesNow, radio }: { events: LiveEvent[]; livesNow: LiveEvent[]; radio: CommunityRadioT }) {
  return (
    <div className="space-y-8">
      {livesNow.length ? <LiveNow lives={livesNow} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <EventsCalendar events={events} />
        <CommunityRadio radio={radio} />
      </div>
    </div>
  );
}

function BlogTabContent({ posts, threads }: { posts: BlogPost[]; threads: Thread[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr),minmax(0,1.2fr)]">
      <div className="space-y-6">
        <BlogPostList posts={posts.slice(0, 6)} />
      </div>
      <aside className="space-y-6">
        <ForumThreads threads={threads.slice(0, 5)} loading={false} />
      </aside>
    </div>
  );
}

function BlogPostList({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Latest blog updates</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No blog posts yet.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.slug ? `/blog/${post.slug}` : `/blog`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card hover:border-white/20"
        >
          <div className="aspect-video w-full overflow-hidden bg-white/5">
            <img src={post.featured_image_url || "/placeholder.svg"} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              {post.tags && post.tags.length ? <Badge className="bg-white/5">{post.tags[0]}</Badge> : null}
            </div>
            <div className="text-base font-semibold text-white group-hover:text-amber-200">{post.title}</div>
            {post.excerpt ? <p className="text-sm text-zinc-400">{post.excerpt}</p> : null}
            <span className="mt-auto text-sm text-amber-300">Read article →</span>
          </div>
        </a>
      ))}
    </div>
  );
}


// ---------- Spotlight rows & cards ---------- //

function ContestCard({ contest }: { contest: Contest }) {
  const fallbackImage = "/placeholder.svg";
  
  return (
    <Card className="snap-start w-[280px] flex-shrink-0 overflow-hidden">
      <div className="relative h-36 w-full overflow-hidden">
        <img 
          src={(contest as any).cover_image_url || contest.cover || fallbackImage} 
          alt={contest.title}
          className="h-full w-full object-cover" 
          onError={(e) => {
            e.currentTarget.src = fallbackImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 dark:from-black/70 dark:via-black/0" />
        <Badge className="absolute left-3 top-3 border-amber-400/30 bg-amber-500/10 text-amber-200">
          <Trophy className="h-3 w-3"/>Contest
        </Badge>
        {/* Show download icon if resources available */}
        {(contest as any).resource_files && (contest as any).resource_files.length > 0 && (
          <Badge className="absolute right-3 top-3 border-blue-400/30 bg-blue-500/10 text-blue-200">
            <Download className="h-3 w-3"/>Resources
          </Badge>
        )}
      </div>
      <CardHeader><CardTitle className="line-clamp-1">{contest.title}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3"/>{formatNumber(contest.entrants)} entrants</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3"/>{timeLeft(contest.ends_at)}</span>
        </div>
        <a href={`/contests/${contest.id}`}><Button className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400">More</Button></a>
      </CardContent>
    </Card>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const goal = campaign.goal || 1;
  const pct = Math.min(100, Math.round((campaign.raised / goal) * 100));
  const cover = campaign.cover || "/placeholder.svg";
  return (
    <Card className="snap-start w-[280px] flex-shrink-0 overflow-hidden">
      <div className="relative h-36 w-full overflow-hidden">
        <img src={cover} alt="campaign" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 dark:from-black/70 dark:via-black/0" />
        <Badge className="absolute left-3 top-3 border-cyan-400/30 bg-cyan-500/10 text-cyan-100"><Megaphone className="h-3 w-3"/>Campaign</Badge>
      </div>
      <CardHeader><CardTitle className="line-clamp-1">{campaign.title}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3"/>£{formatNumber(campaign.raised)} / £{formatNumber(campaign.goal)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3"/>{timeLeft(campaign.ends_at)}</span>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
        </div>
        <a href={`/studio/crowdfunding${campaign.slug ? `?campaign=${campaign.slug}` : ''}`}><Button className="w-full bg-white/10 text-white hover:bg-white/20">Support</Button></a>
      </CardContent>
    </Card>
  );
}

function EventCard({ event }: { event: LiveEvent }) {
  return (
    <Card className="snap-start w-[280px] flex-shrink-0 overflow-hidden">
      <div className="relative h-36 w-full overflow-hidden">
        <img src={event.cover} alt="event" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0" />
        <Badge className={classNames("absolute left-3 top-3", event.is_live ? "border-green-400/40 bg-green-500/10 text-green-200" : "border-indigo-400/40 bg-indigo-500/10 text-indigo-100")}><Radio className="h-3 w-3"/>{event.is_live ? "Live" : "Upcoming"}</Badge>
      </div>
      <CardHeader><CardTitle className="line-clamp-1">{event.title}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3"/>{formatNumber(event.viewers)} attending</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{new Date(event.start_at).toLocaleString()}</span>
        </div>
        <a href={event.url}><Button className="w-full bg-white/10 text-white hover:bg-white/20">{event.is_live ? "Join now" : "Remind me"}</Button></a>
      </CardContent>
    </Card>
  );
}

// ---------- Main grid widgets ---------- //

function LiveNow({ lives }: { lives: LiveEvent[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-200"><PlayCircle className="h-5 w-5"/><CardTitle>Happening Now</CardTitle></div><a className="text-sm text-amber-300 hover:text-amber-200" href="/live">All live</a></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lives.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <img src={e.cover} alt="cover" className="h-16 w-16 rounded-lg object-cover"/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm"><Badge className="border-green-400/40 bg-green-500/10 text-green-200">Live</Badge><span className="truncate text-zinc-200">{e.title}</span></div>
                <div className="mt-1 text-xs text-zinc-400">{formatNumber(e.viewers)} watching • Host: {e.host}</div>
              </div>
              <a href={e.url}><Button className="bg-amber-500 text-zinc-950 hover:bg-amber-400">Join</Button></a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ForumThreads({ threads, loading }: { threads: Thread[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-200"><Handshake className="h-5 w-5"/><CardTitle>Latest Forum Threads</CardTitle></div><div className="flex items-center gap-2"><a href="/collaborate" className="text-sm text-amber-300 hover:text-amber-200">Open forum</a><a href="/collaborate" className="text-sm text-amber-300 hover:text-amber-200">Start a post</a></div></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {loading && <SkeletonRows count={5}/>}        
          {!loading && threads.map((t) => (
            <a key={t.id} href={normalizeCommunityHref(`/forum/${t.slug}`)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
              <img src={t.author.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover"/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm"><Badge>{t.tag}</Badge><span className="truncate font-medium text-white group-hover:text-amber-200">{t.title}</span></div>
                <div className="mt-0.5 text-xs text-zinc-400">by {t.author.username} • {t.reply_count} replies • updated {new Date(t.updated_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <ReportButton targetType="post" targetId={t.id} className="text-xs" />
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-300"/>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CoursesStrip({ courses }: { courses: Course[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-200"><BookOpen className="h-5 w-5"/><CardTitle>New Courses & Masterclasses</CardTitle></div><a className="text-sm text-amber-300 hover:text-amber-200" href={academyPath}>View all</a></CardHeader>
      <CardContent>
        <div className="no-scrollbar -mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {courses.map((c) => (
            <div key={c.id} className="w-[280px] flex-shrink-0 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <img src={c.cover} alt="course" className="h-16 w-16 rounded-lg object-cover"/>
                <div className="min-w-0">
                  <div className="line-clamp-1 font-medium text-white">{c.title}</div>
                  <div className="text-xs text-zinc-400">by {c.instructor}</div>
                  <div className="mt-1 text-xs text-zinc-400">{c.level} • {c.length}</div>
                </div>
              </div>
              <a href={academyPath}><Button className="mt-3 w-full bg-white/10 text-white hover:bg-white/20">Watch</Button></a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EventsCalendar({ events }: { events: LiveEvent[] }) {
  const days = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: { day?: number; events?: LiveEvent[] }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({});
    for (let d = 1; d <= total; d++) {
      const dt = new Date(year, month, d);
      const dayEvents = events.filter((e) => new Date(e.start_at).toDateString() === dt.toDateString());
      cells.push({ day: d, events: dayEvents });
    }
    return { year, month, cells };
  }, [events]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-200"><CalendarDays className="h-5 w-5"/><CardTitle>Events Calendar</CardTitle></div><a className="text-sm text-amber-300 hover:text-amber-200" href="/events">All events</a></CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm text-zinc-400">{new Date(days.year, days.month).toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-400">{"SMTWTFS".split("").map((d) => (<div key={d}>{d}</div>))}</div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {days.cells.map((c, i) => (
                <div key={i} className={classNames("h-14 rounded-lg border border-white/10 bg-card p-1", c.day ? "" : "opacity-30")}> 
                  {c.day && (
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="text-sm text-zinc-200">{c.day}</div>
                      {c.events && c.events.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              {c.events.map((event, idx) => (
                                 <div key={event.id} className={idx > 0 ? "border-t border-white/20 pt-2" : ""}>
                                   <a 
                                     href={`/events/${event.id}`} 
                                     className="font-medium text-sm text-amber-300 hover:text-amber-200 cursor-pointer"
                                   >
                                     {event.title}
                                   </a>
                                  <div className="text-xs text-muted-foreground">
                                    Host: {event.host}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function CollabRadar({ briefs }: { briefs: CollabBrief[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2"><Compass className="h-5 w-5"/><CardTitle>Collab Radar</CardTitle></CardHeader>
      <CardContent>
        {briefs.length ? (
          <div className="grid gap-3">
            {briefs.map((b) => (
              <a key={b.id} href={normalizeCommunityHref(`/forum/${b.slug}`)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <img src={b.author.avatar || "/placeholder.svg"} className="h-10 w-10 rounded-full object-cover"/>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{b.title}</div>
                  <div className="text-xs text-zinc-400">{b.genre ?? "Any genre"} • {b.skill} • budget {b.budget ?? "tbd"}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500"/>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No open briefs right now. Post yours to get collaborators.</div>
        )}
      </CardContent>
    </Card>
  );
}

function TopMembers({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Top Members this Week</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {members.map((m) => {
            const profileHref = m.username ? `/u/${m.username}` : `/profile/${m.id}`;
            return (
              <a key={m.id} href={profileHref} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
              <img src={m.avatar} className="h-10 w-10 rounded-full object-cover" alt="avatar"/>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{m.username}</div><div className="text-xs text-zinc-400">{m.role} • {m.badges.join(" • ")}</div></div>
              <Star className="h-4 w-4 text-amber-300"/>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingTopics({ topics }: { topics: { tag: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Trending Topics</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <a key={t.tag} href={normalizeCommunityHref(`/forum?tag=${encodeURIComponent(t.tag)}`)} className="group">
              <Badge className="transition-colors group-hover:bg-white/15">#{t.tag} <span className="ml-1 text-zinc-400">{t.count}</span></Badge>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FooterCTA() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-purple-900/10 p-8 sm:p-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col items-center text-center gap-6 md:flex-row md:text-left md:justify-between">
          <div className="max-w-xl">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Star className="h-3 w-3 mr-1" />
              Share your expertise
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white">Ready to lead a session or teach a course?</h3>
            <p className="mt-2 text-zinc-400">Share your knowledge with the community. Host live sessions, create courses, and earn while helping others grow.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/studio/live/sessions">
              <Button className="bg-gradient-to-r from-primary to-amber-500 text-white font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                <Radio className="h-4 w-4"/>
                Host a Session
              </Button>
            </a>
            <a href="/studio/courses/builder">
              <Button className="bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-all">
                <BookOpen className="h-4 w-4"/>
                Create a Course
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkeletonRows({ count = 5 }: { count?: number }) { return (<div className="grid gap-3">{Array.from({ length: count }).map((_, i) => (<div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/5" />))}</div>); }

function SparkIcon() { return (<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 0l.9 3.2L10 5l-4.1 1.8L5 10l-.9-3.2L0 5l4.1-1.8L5 0z" fill="currentColor" /></svg>); }

// ---------- Mock Data ---------- //

function getMockHubDataEpic(): HubData {
  return {
    announcements: [ { text: "New: Weekly A&R Hotseat — Submit by Friday" }, { text: "Crowdfund tools v2 live: tiered rewards + stretch goals" } ],
    daily_prompt: { text: "Post a 20-second chorus idea to the #hook-challenge.", tag: "hook-challenge", cta_text: "Post Now", cta_href: "/collaborate?tag=hook-challenge" },
    creator_spotlight: {
      id: "cr1",
      slug: "ishola-pedro",
      name: "Ishola Pedro",
      avatar: "https://i.pravatar.cc/100?img=5",
      cover: "https://images.unsplash.com/photo-1520975922284-7b29d3f11f4f?q=80&w=1400&auto=format&fit=crop",
      genres: ["Dancehall", "Afro-Fusion"],
      followers: 12840,
      bio: "Producer & architect of PLUGGD sound. Blending Afro rhythms with cinematic textures.",
      stats: { contest_wins: 3, placements: 12 },
      featured_track: {
        title: "Summer High (Preview)",
        cover: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1400&auto=format&fit=crop",
        // Public domain sample URL (placeholder). Replace with your CDN link.
        url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_1da7c4cf34.mp3?filename=summer-walk-113162.mp3",
        plays: 45210,
      },
      featured_campaign_slug: "summer-high-mv",
    },
    radio: {
      listeners: 742,
      now: {
        id: "trk_now",
        title: "Glow in the Dark",
        artist: "NovaWaves",
        cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop",
        url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_7f86ad7b38.mp3?filename=vibes-hip-hop-11254.mp3",
      },
      queue: [
        { id: "trk2", title: "Lionheart (Dub)", artist: "ELEKT876", cover: "https://images.unsplash.com/photo-1516281326934-c923fa379e95?q=80&w=1400&auto=format&fit=crop", url: "https://cdn.pixabay.com/download/audio/2022/02/23/audio_965d7f0584.mp3?filename=urban-hip-hop-123005.mp3" },
        { id: "trk3", title: "Shimmer", artist: "Raebel", cover: "https://images.unsplash.com/photo-1499210894093-3ca52f1b4a81?q=80&w=1400&auto=format&fit=crop", url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_7aa90bf34a.mp3?filename=ambient-112532.mp3" },
      ],
    },
    contests: [
      { id: "c1", title: "Dancehall Hook Challenge", cover: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=1400&auto=format&fit=crop", entrants: 248, ends_at: addDaysISO(5), slug: "dancehall-hook" },
      { id: "c2", title: "Afrobeats Producer Royale", cover: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1400&auto=format&fit=crop", entrants: 612, ends_at: addDaysISO(2), slug: "afrobeats-royale" },
      { id: "c3", title: "Best Remix: Open Stems", cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1400&auto=format&fit=crop", entrants: 94, ends_at: addDaysISO(9), slug: "best-remix" },
    ],
    campaigns: [
      { id: "p1", title: "Crowdfund: 'Summer High' MV", cover: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1400&auto=format&fit=crop", goal: 8000, raised: 5200, ends_at: addDaysISO(12), slug: "summer-high-mv" },
      { id: "p2", title: "Vinyl Pressing — Limited 300", cover: "https://images.unsplash.com/photo-1516281326934-c923fa379e95?q=80&w=1400&auto=format&fit=crop", goal: 6000, raised: 2300, ends_at: addDaysISO(20), slug: "vinyl-press" },
    ],
    events: [
      { id: "e1", title: "Live Mixing: The FaNaTiX Studio", cover: "https://images.unsplash.com/photo-1520975922284-7b29d3f11f4f?q=80&w=1400&auto=format&fit=crop", start_at: addHoursISO(1), url: "/live/e1", host: "The FaNaTiX", viewers: 1243, is_live: true },
      { id: "e2", title: "Masterclass: Afro-Fusion Drums", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop", start_at: addHoursISO(26), url: "/live/e2", host: "DJ Xena", viewers: 312, is_live: false },
      { id: "e3", title: "A&R Hotseat — Pitch Your Record", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop", start_at: addHoursISO(54), url: "/live/e3", host: "Pluggd Records", viewers: 698, is_live: false },
    ],
    threads: [
      { id: "t1", title: "Looking for a female vocalist (Afro R&B)", slug: "vocalist-afro-rnb", tag: "collab", reply_count: 12, updated_at: new Date().toISOString(), author: { username: "AyoBeats", avatar: "https://i.pravatar.cc/100?img=40" } },
      { id: "t2", title: "Feedback on my mix? 'Midnight Drive'", slug: "feedback-midnight-drive", tag: "feedback", reply_count: 34, updated_at: new Date().toISOString(), author: { username: "NovaWaves", avatar: "https://i.pravatar.cc/100?img=22" } },
      { id: "t3", title: "Weekly Wins: I hit 100k streams!", slug: "weekly-wins-100k", tag: "win", reply_count: 18, updated_at: new Date().toISOString(), author: { username: "KeyzBoy", avatar: "https://i.pravatar.cc/100?img=31" } },
    ],
    courses: [
      { id: "co1", title: "From Loop to Hit: Arrangement Tricks", instructor: "Julius Vero", level: "Intermediate", length: "48 min", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop", slug: "loop-to-hit" },
      { id: "co2", title: "Vocal Chains for Afro-Pop", instructor: "Raebel", level: "Beginner", length: "35 min", cover: "https://images.unsplash.com/photo-1499210894093-3ca52f1b4a81?q=80&w=1400&auto=format&fit=crop", slug: "vocal-chains" },
      { id: "co3", title: "Royalties 101 — Keep Your Bag", instructor: "Ben Ryan", level: "All Levels", length: "42 min", cover: "https://images.unsplash.com/photo-1601935111741-a4f3f1a1b8a1?q=80&w=1400&auto=format&fit=crop", slug: "royalties-101" },
    ],
    members: [
      { id: "m1", username: "IsholaPedro", avatar: "https://i.pravatar.cc/100?img=5", role: "Producer", badges: ["Top 1%", "Contest Winner"] },
      { id: "m2", username: "LordTokumbo", avatar: "https://i.pravatar.cc/100?img=13", role: "A&R", badges: ["Mentor", "Helper"] },
      { id: "m3", username: "ZeeksFan", avatar: "https://i.pravatar.cc/100?img=47", role: "Artist", badges: ["Rising", "Streak 7d"] },
    ],
    trending: [ { tag: "collab", count: 128 }, { tag: "feedback", count: 96 }, { tag: "win", count: 37 }, { tag: "sync", count: 22 }, { tag: "mixing", count: 81 } ],
    badges: ["Day One", "Community Builder", "Contest Finalist"],
    collab_briefs: [
      { id: "cb1", title: "Need Afro-fusion topliner for summer single", slug: "afro-fusion-topliner", genre: "Afro", skill: "Topline", budget: "£200", author: { avatar: "https://i.pravatar.cc/100?img=29" } },
      { id: "cb2", title: "Mix engineer for Dancehall EP (5 tracks)", slug: "mix-dancehall-ep", genre: "Dancehall", skill: "Mixing", budget: "£400", author: { avatar: "https://i.pravatar.cc/100?img=15" } },
    ],
    quests: [
      { id: "q1", title: "Comment on 3 threads", xp: 20 },
      { id: "q2", title: "Post a collab brief", xp: 30 },
      { id: "q3", title: "Give feedback on 1 track", xp: 25 },
    ],
    stats: { members: 32487, active_week: 1823, streak_days: 3, xp: 120 },
  };
}

function addDaysISO(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); }
function addHoursISO(hours: number) { const d = new Date(); d.setHours(d.getHours() + hours); return d.toISOString(); }

// ---------- DEV TEST CASES ---------- //

/**
 * Minimal dev-time tests rendered optionally in your app.
 * Ensure the calendar has a valid month header and 28-31 day cells present.
 */
export function TestCases() {
  // Calendar shape test
  const sampleEvents: LiveEvent[] = [
    { id: "te1", title: "Sample", cover: "", start_at: new Date().toISOString(), url: "#", host: "Host", viewers: 1, is_live: false },
  ];
  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-zinc-400">Test: EventsCalendar should render current month and mark at least one day.</div>
      <EventsCalendar events={sampleEvents} />
    </div>
  );
}
