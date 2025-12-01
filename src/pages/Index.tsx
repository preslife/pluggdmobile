'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Coins, Users, UploadCloud, FileKey2, Rocket, Music2, Play, Pause, Sparkles, Disc, Handshake, TrendingUp, HeartHandshake, Megaphone, BarChart3, Radio, CheckCircle2, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setMeta } from "@/lib/seo";
import { warmRoute } from "@/lib/warmRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useIntl } from "react-intl";

// -----------------------------------------------------------------------------
// X3 HOMEPAGE — production pass wired to Supabase
// Schema mapping:
//  - Trending Beats ➜ public.beats (is_published = true, is_featured desc, created_at desc)
//  - Trending Music (Releases) ➜ public.releases (status = 'live', approved = true, spotlight desc, created_at desc)
//  - Active Collaborations ➜ public.collaboration_projects (status = 'open', votes desc, created_at desc)
//  - Upcoming Live ➜ public.sessions (is_public = true AND (status = 'live' OR scheduled_at in future))
//  - Hero cover rotation ➜ top releases with cover_art_url (spotlight/is_featured first)
// -----------------------------------------------------------------------------

// === Demo image source control ===
const USE_EXTERNAL_IMAGES = false; // keep false to avoid permission prompts; hero uses your real covers with fallback

function demoImage(seed: number, w = 1200, h = 1200, title = "Pluggd", subtitle = "") {
  return USE_EXTERNAL_IMAGES
    ? `https://picsum.photos/seed/pluggd-${seed}/${w}/${h}`
    : coverDataUri(seed, title, subtitle);
}

function coverDataUri(seed: number, title: string, subtitle?: string) {
  const bg = ["#0B0D10", "#111827", "#0E1117"][seed % 3];
  const fg = "#ffffff";
  const sub = subtitle
    ? `<text x='50%' y='62%' font-size='26' fill='${fg}' opacity='0.85' dominant-baseline='middle' text-anchor='middle' font-family='Inter,system-ui'>${escapeHtml(
        subtitle
      )}</text>`
    : "";
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${bg}'/>
        <stop offset='100%' stop-color='#111' />
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' font-size='54' fill='${fg}' dominant-baseline='middle' text-anchor='middle' font-weight='700' font-family='Inter,system-ui'>${escapeHtml(
      title
    )}</text>
    ${sub}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));

// Types (subset of columns we read)
export type BeatRow = {
  id: string;
  title: string;
  price: number | string; // numeric can arrive as string depending on client config
  image_url: string | null;
  audio_url: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  is_published: boolean;
  created_at: string;
  producer_name: string | null;
  is_featured: boolean;
};
export type ReleaseRow = {
  id: string;
  title: string;
  artist: string;
  cover_art_url: string | null;
  genre: string | null;
  preview_url: string | null;
  price: number | string | null;
  status: string;
  approved: boolean | null;
  spotlight: boolean | null;
  is_featured?: boolean | null;
  created_at: string;
};
export type CollabProject = {
  id: string;
  title: string;
  description?: string | null;
  genre: string | null;
  skills_needed: string[] | null;
  budget_range: string | null;
  status: string;
  votes: number | null;
  created_at: string;
};
export type LiveSession = {
  id: string;
  title: string;
  status: string;
  is_public: boolean;
  scheduled_at: string | null;
  created_at: string;
};

// Fetchers (typed)
async function fetchBeats(limit = 24): Promise<BeatRow[]> {
  const { data, error } = await supabase
    .from("beats")
    .select(
      "id,title,price,image_url,audio_url,genre,bpm,key,is_published,created_at,producer_name,is_featured"
    )
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BeatRow[];
}

async function fetchReleases(limit = 24): Promise<ReleaseRow[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(
      "id,title,artist,cover_art_url,genre,preview_url,price,status,approved,spotlight,created_at"
    )
    .eq("status", "live")
    .eq("approved", true)
    .order("spotlight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ReleaseRow[];
}

async function fetchCollabs(limit = 12): Promise<CollabProject[]> {
  const { data, error } = await supabase
    .from("collaboration_projects")
    .select(
      "id,title,description,genre,skills_needed,budget_range,status,votes,created_at"
    )
    .eq("status", "open")
    .order("votes", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CollabProject[];
}

async function fetchLive(limit = 12): Promise<LiveSession[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("id,title,status,is_public,scheduled_at,created_at")
    .eq("is_public", true)
    // status='live' OR (scheduled_at not null AND scheduled_at > now)
    .or(
      `status.eq.live,and(scheduled_at.not.is.null,scheduled_at.gt.${nowIso})`
    )
    .order("status", { ascending: false }) // live first
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LiveSession[];
}

import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import SpotlightCarousel from "@/components/SpotlightCarousel";
import { CommunityActivity } from "@/components/CommunityActivity";
import FeaturesPreview from "@/components/FeaturesPreview";

// -----------------------------------------------------------------------------
// Pluggd — Homepage (X3)
// -----------------------------------------------------------------------------
export default function PluggdHomepage() {
  const intl = useIntl();
  const [role, setRole] = useState<"fans" | "creators">("fans");
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [collabs, setCollabs] = useState<CollabProject[]>([]);
  const [live, setLive] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMeta(
      "Pluggd — The creator-first music platform",
      "Discover exclusive releases, license beats, join live sessions, and grow your creative business with Pluggd.",
      "/"
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [b, r, c, l] = await Promise.all([
          fetchBeats(),
          fetchReleases(),
          fetchCollabs(),
          fetchLive(),
        ]);
        if (!cancelled) {
          setBeats(b);
          setReleases(r);
          setCollabs(c);
          setLive(l);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load homepage data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hero slides from releases with cover
  const slides = useMemo(() => {
    if (role === "creators") {
      const picks = (beats || []).filter((b) => !!b.image_url).slice(0, 6);
      if (picks.length) {
        return picks.map((b, i) => ({
          src: b.image_url as string,
          fallbackSeed: 600 + i,
          title: b.title,
          artist: b.producer_name ?? "Producer",
          href: `/beats/${b.id}`,
        }));
      }
    }
    const picks = (releases || []).filter((r) => !!r.cover_art_url).slice(0, 6);
    if (picks.length) {
      return picks.map((r, i) => ({
        src: r.cover_art_url as string,
        fallbackSeed: 500 + i,
        title: r.title,
        artist: r.artist,
        href: `/releases/${r.id}`,
      }));
    }
    // fallback demo artwork
    return [
      { src: demoImage(501), fallbackSeed: 501, title: "Wood pon E Fire", artist: "Elevatetoday", href: "#" },
      { src: demoImage(502), fallbackSeed: 502, title: "MUSE EP", artist: "D'YANI", href: "#" },
      { src: demoImage(503), fallbackSeed: 503, title: "Still ah Link", artist: "Elevatetoday", href: "#" },
    ];
  }, [role, releases, beats]);

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-background text-foreground">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center p-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-amber-400" />
            <p className="text-zinc-400">Loading homepage…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      className="min-h-screen w-full pt-masthead bg-background text-foreground"
    >
      <Header role={role} setRole={setRole} />
      <main className="mx-auto max-w-[1280px] px-4">
        <Hero role={role} slides={slides} />

        {/* Role-specific value proposition */}
        <section className="py-16">
          <WhyPluggdExists role={role} />
        </section>

        {/* Role-specific feature grid */}
        <section className="py-16">
          {role === "creators" ? <CreatorOSGrid /> : <FanFeaturesGrid />}
        </section>

        {/* Role-specific content sections */}
        {role === "fans" ? (
          <>
            <section className="py-16">
              <HeaderRow title="Trending releases" cta="See all" ctaLink="/releases" />
              <SpotlightCarousel />
            </section>

            <section className="py-16">
              <HeaderRow title="Discover creators" cta="Browse all" ctaLink="/directory" />
              <HomeRecommendations role={role} activeGenre={null} />
            </section>

            <section className="py-16">
              <CollabHighlights collabs={[]} live={live} />
            </section>
          </>
        ) : (
          <>
            <section className="py-16">
              <HeaderRow title="How Pluggd works" />
              <HowItWorks />
            </section>

            <section className="py-16">
              <HeaderRow title="See the Creator OS in action" />
              <FeaturesPreview />
            </section>

            <section className="py-16">
              <CollabHighlights collabs={collabs} live={live} />
            </section>
          </>
        )}

        <section className="py-16">
          <SocialProofStrip role={role} />
        </section>

        <section className="py-16">
          <TestimonialsSection role={role} />
        </section>

        <section className="py-16">
          <CommunityActivity maxPosts={2} />
        </section>

        <section className="py-16">
          <FinalCTA role={role} />
        </section>

        {error && (
            <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <div className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <button
                  className="rounded-md border border-red-500/30 px-2 py-1 text-xs hover:bg-red-500/20"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    Promise.all([fetchBeats(), fetchReleases(), fetchCollabs(), fetchLive()])
                      .then(([b, r, c, l]) => {
                        setBeats(b);
                        setReleases(r);
                        setCollabs(c);
                        setLive(l);
                      })
                      .catch((e) => setError(e?.message ?? intl.formatMessage({ id: "homepage.error.again", defaultMessage: "Failed again" })))
                      .finally(() => setLoading(false));
                  }}
                >
                  {intl.formatMessage({ id: "homepage.retry", defaultMessage: "Retry" })}
                </button>
              </div>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Header & Hero
// -----------------------------------------------------------------------------
// [HEADER:START] — the sticky sub-bar that only renders the Fan/Creator toggle
function Header({
  role,
  setRole,
}: {
  role: "fans" | "creators";
  setRole: (r: "fans" | "creators") => void;
}) {
  const intl = useIntl();
  // Minimal sticky sub-bar: only the Fan/Creator toggle
  return (
    <header className="sticky top-[var(--masthead-h)] z-40">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mx-auto flex h-12 w-full items-center justify-center">
          <div
            role="group"
            aria-label={intl.formatMessage({ id: "homepage.audienceLabel", defaultMessage: "Audience mode" })}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/40 px-1 py-1 backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,0.4)] dark:bg-black/40"
          >
            <button
              onClick={() => setRole("fans")}
              className={`rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                role === "fans" ? "bg-white text-black" : "text-zinc-300 hover:text-white"
              }`}
              aria-pressed={role === "fans"}
            >
              {intl.formatMessage({ id: "homepage.hero.toggle.fans", defaultMessage: "I’m a Fan" })}
            </button>
            <button
              onClick={() => setRole("creators")}
              className={`rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                role === "creators" ? "bg-white text-black" : "text-zinc-300 hover:text-white"
              }`}
              aria-pressed={role === "creators"}
            >
              {intl.formatMessage({ id: "homepage.hero.toggle.creators", defaultMessage: "I’m a Creator" })}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
// [HEADER:END]

function Hero({
  role,
  slides,
}: {
  role: "fans" | "creators";
  slides: { src: string; fallbackSeed: number; title: string; artist?: string | null; href?: string }[];
}) {
  // Different content based on role
  const heroContent = role === "creators" ? {
    badge: "🚀 Built for independent artists",
    headline: <>Your Music.<br className="hidden sm:block" /><span className="text-primary">Your Money.</span></>,
    subtext: <>Stop giving away <span className="font-semibold text-white">70% to streaming platforms</span>. Pluggd gives you the tools to release music, sell beats, run memberships, and go live — while keeping 90% of what you earn.</>,
    primaryCta: { text: "Claim Your Free Creator Page →", link: "/signup?intent=create" },
    secondaryCta: { text: "See Creator Tools", link: "/features" },
    stats: [
      { label: "Creator earnings", value: "90%", icon: "💰", accent: "from-emerald-500/20 to-transparent" },
      { label: "Payouts", value: "Weekly", icon: "⚡", accent: "from-primary/20 to-transparent" },
      { label: "Tools included", value: "10+", icon: "🛠️", accent: "from-purple-500/20 to-transparent" },
    ],
    highlights: ["Sell beats & releases", "Run memberships", "Go live with fans", "Track analytics"]
  } : {
    badge: "🎵 Discover music directly from artists",
    headline: <>Support Artists.<br className="hidden sm:block" /><span className="text-primary">Get Exclusive Access.</span></>,
    subtext: <>Discover new music, unlock exclusive drops, and connect directly with your favourite creators. When you support on Pluggd, <span className="font-semibold text-white">artists actually get paid</span>.</>,
    primaryCta: { text: "Start Exploring →", link: "/releases" },
    secondaryCta: { text: "Browse Beats", link: "/marketplace" },
    stats: [
      { label: "To artists", value: "90%", icon: "❤️", accent: "from-pink-500/20 to-transparent" },
      { label: "Exclusive drops", value: "Daily", icon: "🔥", accent: "from-primary/20 to-transparent" },
      { label: "Live sessions", value: "Weekly", icon: "📺", accent: "from-purple-500/20 to-transparent" },
    ],
    highlights: ["Early access drops", "Exclusive memberships", "Live Q&As", "Direct support"]
  };

  return (
    <section className="relative overflow-visible pt-10">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_20%_20%,rgba(124,58,237,0.2),transparent),radial-gradient(700px_400px_at_90%_10%,rgba(249,115,22,0.15),transparent)]" />
      </div>
      <HeroBackdrop slides={slides} />
      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pb-12 md:grid md:grid-cols-12 md:gap-10 md:px-6">
        <div className="md:col-span-7 flex flex-col gap-6">
          <Badge variant="secondary" className="w-fit border border-primary/40 bg-primary/10 text-primary font-medium animate-pulse">
            {heroContent.badge}
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-[72px] bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
            {heroContent.headline}
          </h1>
          <p className="text-lg text-zinc-200 sm:text-xl leading-relaxed max-w-xl">
            {heroContent.subtext}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="px-8 text-base font-semibold bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02]" asChild>
              <Link to={heroContent.primaryCta.link}>{heroContent.primaryCta.text}</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-base border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300" asChild>
              <Link to={heroContent.secondaryCta.link}>{heroContent.secondaryCta.text}</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {heroContent.stats.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} px-4 py-3.5 text-sm text-zinc-200 backdrop-blur-sm hover:border-white/20 transition-colors`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs uppercase tracking-wider text-zinc-400">{item.label}</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">{item.value}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
              {heroContent.highlights.map((highlight) => (
                <span key={highlight} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="md:sticky md:top-28">
            <HeroBackdrop slides={slides} variant="panel" />
          </div>
        </div>
      </div>
    </section>
  );
}

// [HERO_BACKDROP:START]
function HeroBackdrop({
  slides,
  variant,
}: {
  slides: { src: string; fallbackSeed: number; title: string; artist?: string | null; href?: string }[];
  variant?: "background" | "panel";
}) {
  const intl = useIntl();
  const [idx, setIdx] = useState(0);
  const [errorMap, setErrorMap] = useState<Record<number, boolean>>({});
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      7000
    );
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const go = (dir: number) => setIdx((i) => (i + dir + slides.length) % slides.length);

  if (variant === "panel") {
    return (
      <div className="relative mt-4 h-64 overflow-hidden rounded-3xl border border-white/10 bg-background/70 shadow-xl backdrop-blur md:mt-0 md:h-[420px]">
        {slides.map((s, i) => {
          const active = i === idx;
          const uri = errorMap[i]
            ? coverDataUri(s.fallbackSeed, s.title, "Pluggd")
            : s.src;
          return (
            <img
              key={`${s.src}-${i}`}
              src={uri}
              onError={() => setErrorMap((m) => ({ ...m, [i]: true }))}
              alt={s.title}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          );
        })}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40 dark:from-black/70" />
        <a
          href={slides[idx]?.href ?? "#"}
          aria-label={slides[idx]?.title ? `Open ${slides[idx]?.title}` : "Open"}
          className="absolute inset-0 z-10 block"
          onMouseEnter={() => warmRoute(slides[idx]?.href, slides[idx]?.src)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 text-sm text-white/90">
          <div className="font-semibold">{slides[idx]?.title ?? "Featured release"}</div>
          {slides[idx]?.artist && <div className="text-xs text-white/80">{slides[idx]?.artist}</div>}
        </div>
        <div className="pointer-events-auto absolute inset-x-0 bottom-5 flex justify-between px-5">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-background/80 text-lg text-white transition hover:bg-background/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-background/80 text-lg text-white transition hover:bg-background/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ›
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute right-0 top-[50px] z-0 hidden h-[360px] w-[50%] min-w-[480px] overflow-hidden rounded-none border-0 bg-transparent shadow-none md:block md:top-[44px] md:h-[400px]"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 55%)",
        maskImage:
          "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 55%)",
      }}
      aria-roledescription="carousel"
      aria-label={intl.formatMessage({ id: "homepage.hero.carouselLabel", defaultMessage: "Spotlight covers" })}
    >
      {slides.map((s, i) => {
        const active = i === idx;
        const uri = errorMap[i]
          ? coverDataUri(s.fallbackSeed, s.title, "Pluggd")
          : s.src;
        return (
          <img
            key={i}
            src={uri}
            onError={() => setErrorMap((m) => ({ ...m, [i]: true }))}
            alt={s.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${
              active ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 left-[-45%] bg-gradient-to-r from-background/70 via-background/40 to-transparent dark:from-black/70 dark:via-black/40" />
      <a
        href={slides[idx]?.href ?? '#'}
        aria-label={(() => {
          const label = intl.formatMessage({ id: "homepage.hero.open", defaultMessage: "Open" });
          return slides[idx]?.title ? `${label} ${slides[idx]?.title}` : label;
        })()}
        className="absolute inset-0 z-10 block"
        onMouseEnter={() => warmRoute(slides[idx]?.href, slides[idx]?.src)}
      />
      <div className="pointer-events-auto relative z-20">
        <button
          aria-label="Prev"
          onClick={() => go(-1)}
          className="absolute left-6 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-background/55 text-lg backdrop-blur transition hover:bg-background/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-black/55 dark:hover:bg-black/70"
        >
          ‹
        </button>
        <button
          aria-label="Next"
          onClick={() => go(1)}
          className="absolute right-6 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-background/55 text-lg backdrop-blur transition hover:bg-background/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-black/55 dark:hover:bg-black/70"
        >
          ›
        </button>
      </div>
    </div>
  );
}
// [HERO_BACKDROP:END]

// -----------------------------------------------------------------------------
// Search / Tabs
// -----------------------------------------------------------------------------
type ReleaseRecommendation = {
  id: string;
  title: string;
  artist: string;
  genre?: string | null;
  imageUrl?: string | null;
  price?: number | null;
};

type CreatorRecommendation = {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  verified?: boolean | null;
  bio?: string | null;
};

type BeatRecommendation = {
  id: string;
  title: string;
  producer: string;
  genre?: string | null;
  imageUrl?: string | null;
  price?: number | null;
};

type CollabRecommendation = {
  id: string;
  title: string;
  genre?: string | null;
  budget?: string | null;
  description?: string | null;
};

function HomeRecommendations({
  role,
  activeGenre,
}: {
  role: "fans" | "creators";
  activeGenre?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [fanRecs, setFanRecs] = useState<{
    releases: ReleaseRecommendation[];
    creators: CreatorRecommendation[];
  }>({ releases: [], creators: [] });
  const [creatorRecs, setCreatorRecs] = useState<{
    beats: BeatRecommendation[];
    collabs: CollabRecommendation[];
  }>({ beats: [], collabs: [] });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        if (role === "fans") {
          let releaseQuery = supabase
            .from("releases")
            .select("id,title,artist,cover_art_url,genre,price,total_plays")
            .eq("status", "live")
            .eq("approved", true)
            .order("total_plays", { ascending: false })
            .limit(6);

          if (activeGenre) {
            releaseQuery = releaseQuery.eq("genre", activeGenre);
          }

          const [{ data: releaseData }, { data: creatorData }] = await Promise.all([
            releaseQuery,
            supabase
              .from("profiles")
              .select("user_id,username,full_name,avatar_url,is_verified,bio")
              .eq("is_creator", true)
              .order("is_verified", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false })
              .limit(6),
          ]);

          if (!cancelled) {
            setFanRecs({
              releases:
                releaseData?.map((release) => ({
                  id: release.id,
                  title: release.title,
                  artist: release.artist,
                  genre: release.genre,
                  imageUrl: release.cover_art_url,
                  price: release.price,
                })) ?? [],
              creators:
                creatorData?.map((creator) => ({
                  id: creator.user_id,
                  name: creator.full_name || creator.username || "Creator",
                  username: creator.username,
                  avatarUrl: creator.avatar_url,
                  verified: creator.is_verified,
                  bio: creator.bio,
                })) ?? [],
            });
          }
        } else {
          let beatsQuery = supabase
            .from("beats")
            .select("id,title,producer_name,genre,image_url,price,created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(6);

          if (activeGenre) {
            beatsQuery = beatsQuery.eq("genre", activeGenre);
          }

          const [{ data: beatData }, { data: collabData }] = await Promise.all([
            beatsQuery,
            supabase
              .from("collaboration_projects")
              .select("id,title,genre,budget_range,description,status")
              .eq("status", "open")
              .order("created_at", { ascending: false })
              .limit(6),
          ]);

          if (!cancelled) {
            setCreatorRecs({
              beats:
                beatData?.map((beat) => ({
                  id: beat.id,
                  title: beat.title,
                  producer: beat.producer_name || "Producer",
                  genre: beat.genre,
                  imageUrl: beat.image_url,
                  price: beat.price,
                })) ?? [],
              collabs:
                collabData?.map((collab) => ({
                  id: collab.id,
                  title: collab.title,
                  genre: collab.genre,
                  budget: collab.budget_range,
                  description: collab.description,
                })) ?? [],
            });
          }
        }
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [role, activeGenre]);

  const title = role === "fans" ? "For you" : "Opportunities for you";
  const cta = role === "fans" ? "Open search" : "Browse marketplace";
  const ctaLink = role === "fans" ? "/search" : "/marketplace";

  if (loading) {
    return (
      <section className="py-12">
        <HeaderRow title={title} cta={cta} ctaLink={ctaLink} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-1/3 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-muted/80 rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (role === "fans") {
    const { releases, creators } = fanRecs;
    if (!releases.length && !creators.length) {
      return null;
    }

    return (
      <section className="py-12">
        <HeaderRow title={title} cta={cta} ctaLink={ctaLink} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {releases.length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Fresh drops in your lane
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {releases.slice(0, 4).map((release) => {
                  const releasePath = `/release/${release.id}`;
                  return (
                    <Link
                      key={release.id}
                      to={releasePath}
                      onMouseEnter={() => warmRoute(releasePath, release.imageUrl)}
                      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Avatar className="h-11 w-11 rounded-lg">
                        {release.imageUrl ? (
                          <AvatarImage src={release.imageUrl} alt={release.title} />
                        ) : (
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          <Music2 className="w-4 h-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{release.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{release.artist}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {release.genre && (
                        <Badge variant="secondary" className="text-[10px]">
                          {release.genre}
                        </Badge>
                      )}
                      {typeof release.price === "number" && (
                        <span className="text-xs text-muted-foreground">
                          £{release.price.toFixed(2)}
                        </span>
                      )}
                      </div>
                    </Link>
                  );
                })}
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  asChild
                  onMouseEnter={() => warmRoute("/releases")}
                >
                  <Link to="/releases">
                    Explore all releases
                    <TrendingUp className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {creators.length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Creators to follow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creators.slice(0, 4).map((creator) => {
                  const creatorPath = `/creator/${creator.username ?? creator.id}`;
                  return (
                    <Link
                      key={creator.id}
                      to={creatorPath}
                      onMouseEnter={() => warmRoute(creatorPath, creator.avatarUrl)}
                      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Avatar className="h-11 w-11">
                        {creator.avatarUrl ? (
                          <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                        ) : (
                          <AvatarFallback>
                          {creator.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "C"}
                        </AvatarFallback>
                      )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{creator.name}</p>
                        {creator.username && (
                          <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
                      )}
                    </div>
                    {creator.verified && (
                      <Badge variant="outline" className="text-[10px]">
                        Verified
                      </Badge>
                      )}
                    </Link>
                  );
                })}
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  asChild
                  onMouseEnter={() => warmRoute("/directory")}
                >
                  <Link to="/directory">
                    Discover more creators
                    <Sparkles className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    );
  }

  const { beats, collabs } = creatorRecs;
  if (!beats.length && !collabs.length) {
    return null;
  }

  return (
    <section className="py-12">
      <HeaderRow title={title} cta={cta} ctaLink={ctaLink} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {beats.length > 0 && (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Disc className="w-5 h-5 text-primary" />
                Beats fans are buying
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {beats.slice(0, 4).map((beat) => {
                const beatPath = `/beat/${beat.id}`;
                return (
                  <Link
                    key={beat.id}
                    to={beatPath}
                    onMouseEnter={() => warmRoute(beatPath, beat.imageUrl)}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Avatar className="h-11 w-11 rounded-lg">
                      {beat.imageUrl ? (
                        <AvatarImage src={beat.imageUrl} alt={beat.title} />
                      ) : (
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        <Disc className="w-4 h-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{beat.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{beat.producer}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {beat.genre && (
                      <Badge variant="secondary" className="text-[10px]">
                        {beat.genre}
                      </Badge>
                    )}
                    {typeof beat.price === "number" && (
                      <span className="text-xs text-muted-foreground">
                        £{beat.price.toFixed(0)}
                      </span>
                    )}
                  </div>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-between"
                asChild
                onMouseEnter={() => warmRoute("/marketplace")}
              >
                <Link to="/marketplace">
                  Browse all beats
                  <TrendingUp className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {collabs.length > 0 && (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Handshake className="w-5 h-5 text-primary" />
                Open collaboration briefs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {collabs.slice(0, 4).map((collab) => {
                const collabPath = `/collaborate/${collab.id}`;
                return (
                  <Link
                    key={collab.id}
                    to={collabPath}
                    onMouseEnter={() => warmRoute(collabPath)}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Handshake className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{collab.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {collab.description ?? "Bring your sound to this project"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {collab.genre && (
                      <Badge variant="secondary" className="text-[10px]">
                        {collab.genre}
                      </Badge>
                    )}
                    {collab.budget && (
                      <span className="text-xs text-muted-foreground">{collab.budget}</span>
                    )}
                  </div>
                </Link>
              );
              })}
              <Button
                variant="ghost"
                className="w-full justify-between"
                asChild
                onMouseEnter={() => warmRoute("/collaborate")}
              >
                <Link to="/collaborate">
                  View all briefs
                  <Sparkles className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function WhyPluggdExists({ role }: { role: "fans" | "creators" }) {
  const creatorPillars = [
    {
      title: "Keep 90% of what you earn",
      description: "Streaming pays £0.003 per play. On Pluggd, you set the price — and keep almost all of it. Your music, your business.",
      Icon: ShieldCheck,
      stat: "90%",
      statLabel: "creator cut"
    },
    {
      title: "Your fans, direct",
      description: "No algorithms deciding who sees your releases. Build real relationships through live sessions, memberships, and exclusive drops.",
      Icon: HeartHandshake,
      stat: "0",
      statLabel: "middlemen"
    },
    {
      title: "All-in-one creator OS",
      description: "Releases, beat store, courses, live streaming, collabs, contracts, and analytics — one login, zero app-hopping.",
      Icon: Megaphone,
      stat: "10+",
      statLabel: "tools built-in"
    },
  ];

  const fanPillars = [
    {
      title: "Support artists directly",
      description: "When you buy on Pluggd, 90% goes straight to the artist. No middlemen, no waiting, just real support.",
      Icon: HeartHandshake,
      stat: "90%",
      statLabel: "to artists"
    },
    {
      title: "Exclusive access",
      description: "Get early releases, behind-the-scenes content, and VIP access through creator memberships.",
      Icon: Sparkles,
      stat: "∞",
      statLabel: "exclusives"
    },
    {
      title: "Connect with creators",
      description: "Join live sessions, participate in Q&As, and build real relationships with the artists you love.",
      Icon: Users,
      stat: "Live",
      statLabel: "interaction"
    },
  ];

  const pillars = role === "creators" ? creatorPillars : fanPillars;

  const content = role === "creators" ? {
    badge: "The problem we solve",
    headline: <>Streaming broke music.<br />Pluggd fixes it.</>,
    subtext: "Artists need more than a platform — they need an operating system for their entire career. That's Pluggd: releases, community, commerce, and collaboration in one place."
  } : {
    badge: "Why fans love Pluggd",
    headline: <>Real support.<br />Real connection.</>,
    subtext: "Tired of streaming services that pay artists pennies? On Pluggd, your support actually matters — and you get exclusive access in return."
  };

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-primary/5 via-transparent to-purple-900/10 p-8 md:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.1),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Badge className="mb-4 bg-white/10 text-white border-white/20">{content.badge}</Badge>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
          {content.headline}
        </h2>
        <p className="mt-5 text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
          {content.subtext}
        </p>
      </div>
      <div className="relative z-10 mt-10 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.Icon;
          return (
            <motion.div 
              key={pillar.title} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{pillar.stat}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">{pillar.statLabel}</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{pillar.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CreatorOSGrid() {
  const features = [
    { title: "Music Releases", description: "Drop singles, EPs, and albums. Get paid instantly — no 90-day wait.", Icon: UploadCloud, color: "from-blue-500" },
    { title: "Beat Store", description: "Sell beats with standard, premium, and exclusive licenses built-in.", Icon: Disc, color: "from-purple-500" },
    { title: "Live Sessions", description: "Go live with ticketed shows, tips, and real-time fan interaction.", Icon: Radio, color: "from-red-500" },
    { title: "Collaborations", description: "Post briefs, find talent, and split payments automatically.", Icon: Handshake, color: "from-emerald-500" },
    { title: "Smart Contracts", description: "Auto-generate split sheets and licensing agreements. Legally sound.", Icon: FileKey2, color: "from-amber-500" },
    { title: "Fan Community", description: "Paid memberships, exclusive posts, and tiered supporter access.", Icon: Users, color: "from-pink-500" },
    { title: "Pro Analytics", description: "Real-time revenue, audience insights, and growth tracking.", Icon: BarChart3, color: "from-cyan-500" },
    { title: "AI Toolkit", description: "Lyric assists, artwork concepts, and production feedback.", Icon: Sparkles, color: "from-violet-500" },
  ];
  return (
    <div className="relative rounded-3xl border border-white/10 bg-black/40 p-8 md:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">The Creator OS</Badge>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl">
          One platform.<br />
          <span className="text-zinc-400">Every tool you need.</span>
        </h2>
        <p className="mt-5 text-lg text-zinc-300 max-w-xl mx-auto">
          No more juggling 10 different apps. Pluggd brings your entire music business under one roof.
        </p>
      </div>
      <div className="relative z-10 mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.Icon;
          return (
            <motion.div 
              key={feature.title} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} to-transparent`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div className="text-base font-semibold group-hover:text-primary transition-colors">{feature.title}</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="relative z-10 mt-10 text-center">
        <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10" asChild>
          <Link to="/features">See all features →</Link>
        </Button>
      </div>
    </div>
  );
}

function FanFeaturesGrid() {
  const features = [
    { title: "Discover Music", description: "Find fresh releases and hidden gems directly from independent artists.", Icon: Music2, color: "from-blue-500" },
    { title: "Beat Marketplace", description: "License beats for your own projects from verified producers.", Icon: Disc, color: "from-purple-500" },
    { title: "Watch Live", description: "Join live sessions, Q&As, and exclusive performances from creators.", Icon: Radio, color: "from-red-500" },
    { title: "Memberships", description: "Unlock exclusive content and perks with creator memberships.", Icon: Users, color: "from-emerald-500" },
    { title: "Learn & Grow", description: "Take courses from industry pros to level up your skills.", Icon: Sparkles, color: "from-amber-500" },
    { title: "Community", description: "Connect with other fans and creators who share your taste.", Icon: HeartHandshake, color: "from-pink-500" },
    { title: "Early Access", description: "Get first access to new drops before anyone else.", Icon: Zap, color: "from-cyan-500" },
    { title: "Support Artists", description: "90% of your purchase goes directly to the creator.", Icon: Coins, color: "from-violet-500" },
  ];
  return (
    <div className="relative rounded-3xl border border-white/10 bg-black/40 p-8 md:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Badge className="mb-4 bg-pink-500/10 text-pink-400 border-pink-500/20">For Fans</Badge>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl">
          More than streaming.<br />
          <span className="text-zinc-400">Real connection.</span>
        </h2>
        <p className="mt-5 text-lg text-zinc-300 max-w-xl mx-auto">
          Pluggd isn't just about listening — it's about being part of an artist's journey.
        </p>
      </div>
      <div className="relative z-10 mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.Icon;
          return (
            <motion.div 
              key={feature.title} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} to-transparent`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div className="text-base font-semibold group-hover:text-primary transition-colors">{feature.title}</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="relative z-10 mt-10 text-center">
        <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10" asChild>
          <Link to="/releases">Start Exploring →</Link>
        </Button>
      </div>
    </div>
  );
}

function BenefitsSplit({ role }: { role: "fans" | "creators" }) {
  const creatorBenefits = [
    "90% creator earnings",
    "Fast payouts",
    "Your own store page",
    "Sync-ready licensing",
    "Community monetisation",
    "AI workflow tools",
    "Professional feedback & collabs",
    "Live interactive sessions",
  ];
  const fanBenefits = [
    "Exclusive content",
    "Early drops",
    "Direct support",
    "Zero-spam credits",
    "Community access",
    "Verified creator pages",
    "Live Q&A and events",
    "Backstage memberships",
  ];
  const lists = [
    { title: "Why creators love Pluggd", description: "Turn your music business into a streamlined OS with commerce, community, and collabs in one place.", bullets: creatorBenefits },
    { title: "Why fans join", description: "Unlock deeper access to the artists you champion and keep every credit working for you.", bullets: fanBenefits },
  ];
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Built for both sides</p>
        <h2 className="text-3xl font-bold md:text-4xl">Why creators and fans commit to Pluggd.</h2>
        <p className="text-zinc-300">
          Toggle above to explore what matters most to you. You’re currently in <span className="font-semibold text-white">{role}</span> mode.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {lists.map((list) => (
          <div key={list.title} className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <h3 className="text-2xl font-semibold">{list.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{list.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-200">
              {list.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollabHighlights({ collabs, live }: { collabs: CollabProject[]; live: LiveSession[] }) {
  if (!collabs.length && !live.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center text-sm text-zinc-400">
        Fresh collaborations and live sessions will appear here soon.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Live collaboration briefs</CardTitle>
          <Badge variant="outline" className="border-primary/40 text-xs text-primary">
            {collabs.length} active
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {collabs.slice(0, 3).map((collab) => (
            <Link
              key={collab.id}
              to={`/collaborate/${collab.id}`}
              className="block rounded-xl border border-white/10 bg-black/40 p-4 hover:border-primary/50"
              onMouseEnter={() => warmRoute(`/collaborate/${collab.id}`)}
            >
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span className="inline-flex items-center gap-2 text-white">
                  <Handshake className="h-4 w-4 text-primary" />
                  {collab.title}
                </span>
                {collab.genre && <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{collab.genre}</span>}
              </div>
              {collab.description && <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{collab.description}</p>}
              {collab.budget_range && <p className="mt-3 text-xs text-zinc-500">Budget: {collab.budget_range}</p>}
            </Link>
          ))}
          <Button variant="ghost" className="w-full justify-between" asChild>
            <Link to="/collaborate">
              Browse all projects
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Upcoming live sessions</CardTitle>
          <Badge variant="outline" className="border-white/20 text-xs text-white/80">
            Live & scheduled
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {live.slice(0, 3).map((session) => (
            <Link
              key={session.id}
              to={`/live/${session.id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:border-primary/50"
              onMouseEnter={() => warmRoute(`/live/${session.id}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{session.title}</p>
                <p className="text-xs text-zinc-400">{session.scheduled_at ? formatWhen(session.scheduled_at) : session.status}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Play className="h-4 w-4 text-primary" />
                {session.status === "live" ? "Live now" : "Upcoming"}
              </div>
            </Link>
          ))}
          <Button variant="ghost" className="w-full justify-between" asChild>
            <Link to="/live">
              See the schedule
              <TrendingUp className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SocialProofStrip({ role }: { role: "fans" | "creators" }) {
  const creatorStats = [
    { label: "Paid out monthly", value: "£13,854", icon: "💸", trend: "+12%" },
    { label: "Active creators", value: "2,900+", icon: "🎤", trend: "+8%" },
    { label: "Completed collabs", value: "187", icon: "🤝", trend: "+23%" },
    { label: "Countries worldwide", value: "16", icon: "🌍", trend: "" },
  ];

  const fanStats = [
    { label: "Direct to artists", value: "90%", icon: "❤️", trend: "" },
    { label: "Active fans", value: "12,400+", icon: "🎧", trend: "+15%" },
    { label: "Exclusive releases", value: "340+", icon: "🔥", trend: "+18%" },
    { label: "Live sessions weekly", value: "50+", icon: "📺", trend: "" },
  ];

  const stats = role === "creators" ? creatorStats : fanStats;

  const content = role === "creators" ? {
    title: "Trusted by creators worldwide",
    subtitle: "Real numbers, real impact, real payouts",
    footer: (
      <>
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Featured creators include</span>
        <span className="text-sm text-white font-medium">D'Yani</span>
        <span className="text-zinc-600">•</span>
        <span className="text-sm text-white font-medium">The FaNaTiX</span>
        <span className="text-zinc-600">•</span>
        <span className="text-sm text-white font-medium">Elevatetoday</span>
        <span className="text-zinc-600">•</span>
        <Link to="/directory" className="text-sm text-primary hover:underline">and more →</Link>
      </>
    )
  } : {
    title: "A community that cares",
    subtitle: "Join fans who support artists directly",
    footer: (
      <>
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Popular this week</span>
        <span className="text-sm text-white font-medium">Fresh drops</span>
        <span className="text-zinc-600">•</span>
        <span className="text-sm text-white font-medium">Live Q&As</span>
        <span className="text-zinc-600">•</span>
        <span className="text-sm text-white font-medium">Exclusive content</span>
        <span className="text-zinc-600">•</span>
        <Link to="/releases" className="text-sm text-primary hover:underline">Explore →</Link>
      </>
    )
  };

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-primary/10 via-transparent to-purple-900/10 p-8 md:p-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(249,115,22,0.15),transparent_40%)]" />
      <div className="relative z-10">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold md:text-3xl">{content.title}</h3>
          <p className="mt-2 text-zinc-400">{content.subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm px-5 py-5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                {stat.trend && (
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">{stat.value}</div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center">
          {content.footer}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Carousel (controlled)
// -----------------------------------------------------------------------------
function Carousel<T>({
  items,
  renderItem,
  itemWidth = 260,
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemWidth?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const scrollByAmount = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9 * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
    setPage((p) => Math.max(0, p + dir));
  };
  return (
    <div className="relative" role="region" aria-label="carousel">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {items.length === 0 && (
          <div className="h-[160px] w-full place-content-center text-zinc-400">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm">
              Nothing here yet. Try another genre.
            </div>
          </div>
        )}
        {items.map((it, idx) => (
          <div key={idx} className="snap-start" style={{ width: itemWidth }}>
            {renderItem(it)}
          </div>
        ))}
      </div>
      <button
        aria-label="Previous"
        onClick={() => scrollByAmount(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 backdrop-blur hover:bg-black/70"
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={() => scrollByAmount(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 backdrop-blur hover:bg-black/70"
      >
        ›
      </button>
      <div className="mt-3 flex items-center justify-center gap-1">
        {Array.from({ length: Math.min(items.length || 1, 6) }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${
              i === page ? "bg-white" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Cards
// -----------------------------------------------------------------------------
function BeatCard({ item }: { item: BeatRow }) {
  const { state, actions } = useGlobalPlayer();
  const uri =
    item.image_url ||
    demoImage(
      item.id.length,
      800,
      800,
      item.title,
      `${item.genre ?? "Beat"}${item.bpm ? ` • ${item.bpm} BPM` : ""}`
    );
  const src = item.audio_url ?? "";
  const isCurrentTrack = state.currentTrack?.id === item.id;
  const playing = isCurrentTrack && state.isPlaying;
  return (
    <a href={`/beats/${item.id}`} onMouseEnter={() => warmRoute(`/beats/${item.id}`, uri)} className="group block w-[260px] select-none">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
        <img src={uri} alt={item.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        {src && (
          <button
            aria-label={playing ? "Pause preview" : "Play preview"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isCurrentTrack) {
                playing ? actions.pause() : actions.resume();
              } else {
                actions.play({
                  id: item.id,
                  title: item.title,
                  artist: item.producer_name || "Producer",
                  src: src,
                  artwork: uri,
                  type: 'beat',
                  price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || 0))
                });
              }
            }}
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur transition group-hover:scale-105"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-black/10 opacity-90" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="line-clamp-1 font-medium">{item.title}</div>
          <div className="text-xs text-zinc-400">
            {item.genre || "Beat"}
            {item.bpm ? ` • ${item.bpm} BPM` : ""}
          </div>
        </div>
        <span className="rounded-full bg-[#F97316] px-3 py-1 text-sm">
          {formatPrice(item.price)}
        </span>
      </div>
    </a>
  );
}

function ReleaseCard({ item }: { item: ReleaseRow }) {
  const { state, actions } = useGlobalPlayer();
  const uri =
    item.cover_art_url ||
    demoImage(
      item.id.length,
      800,
      800,
      item.title,
      `${item.artist}${item.genre ? ` • ${item.genre}` : ""}`
    );
  const price = item.price ? (
    <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
      {formatPrice(item.price)}
    </span>
  ) : (
    <span />
  );
  const src = item.preview_url ?? "";
  const isCurrentTrack = state.currentTrack?.id === item.id;
  const playing = isCurrentTrack && state.isPlaying;
  return (
    <a href={`/releases/${item.id}`} onMouseEnter={() => warmRoute(`/releases/${item.id}`, uri)} className="group block w-[260px] select-none">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
        <img src={uri} alt={`${item.title} cover`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        {src && (
          <button
            aria-label={playing ? "Pause preview" : "Play preview"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isCurrentTrack) {
                playing ? actions.pause() : actions.resume();
              } else {
                actions.play({
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  src: src,
                  artwork: uri,
                  type: 'release',
                  releaseId: item.id,
                  price: item.price ? (typeof item.price === 'number' ? item.price : parseFloat(String(item.price))) : undefined
                });
              }
            }}
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 backdrop-blur transition group-hover:scale-105"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-black/10 opacity-90" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="line-clamp-1 font-medium">{item.title}</div>
          <div className="text-xs text-zinc-400">
            {item.artist}
            {item.genre ? ` • ${item.genre}` : ""}
          </div>
        </div>
        {price}
      </div>
    </a>
  );
}

function CollabCard({ item }: { item: CollabProject }) {
  return (
    <div className="w-[360px] select-none rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-amber-300">{item.genre || "Open"}</div>
          <div className="mt-1 line-clamp-2 text-base font-semibold">
            {item.title}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Skills: {item.skills_needed?.join(", ") || "Any"}
          </div>
        </div>
        {item.budget_range && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
            {item.budget_range}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>Votes: {item.votes ?? 0}</span>
        <a href={`/collab/${item.id}`} onMouseEnter={() => warmRoute(`/collab/${item.id}`)} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">View brief</a>
      </div>
    </div>
  );
}

function LiveCard({ item }: { item: LiveSession }) {
  const live = item.status === "live";
  return (
    <div className="w-[340px] select-none rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-950/70 p-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-medium">
          <span className="inline-flex h-2 w-2 items-center justify-center">
            {live ? (
              <>
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400/80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </>
            ) : (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-500" />
            )}
          </span>
          {live ? "Live now" : "Upcoming"}
        </div>
        {item.scheduled_at && (
          <span className="text-xs text-zinc-400">{formatWhen(item.scheduled_at)}</span>
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-base font-semibold">{item.title}</div>
      <div className="mt-3">
        <a className="block w-full rounded-lg bg-white/10 px-3 py-2 text-center text-sm hover:bg-white/20" href={`/live/${item.id}`} onMouseEnter={() => warmRoute(`/live/${item.id}`)}>
          {live ? "Join" : "Remind me"}
        </a>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Grids / Bands / Footer (kept from X3 visual language)
// -----------------------------------------------------------------------------
function HeaderRow({ title, cta, ctaLink }: { title: React.ReactNode; cta?: React.ReactNode; ctaLink?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {cta && (
        <a
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          href={ctaLink || "#"}
        >
          {cta}
        </a>
      )}
    </div>
  );
}

function GenreGrid({
  genres,
  activeGenre,
  setActiveGenre,
  role,
}: {
  genres: string[];
  activeGenre: string | null;
  setActiveGenre: (g: string) => void;
  role: "fans" | "creators";
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {genres.map((g) => (
        <button
          key={g}
          onClick={() => setActiveGenre(g)}
          className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            activeGenre === g
              ? "border-white/30 bg-white/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
          aria-pressed={activeGenre === g}
        >
          <div className="flex flex-col items-start justify-center gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
            <span>{g}</span>
            <span className="text-xs text-zinc-400">
              {role === "fans" ? "Music" : "Beats"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function FeatureBand() {
  const intl = useIntl();
  const feats = [
    {
      icon: UploadCloud,
      t: intl.formatMessage({ id: "homepage.features.uploadOnce", defaultMessage: "Upload once" }),
      d: intl.formatMessage({ id: "homepage.features.uploadDescription", defaultMessage: "One hub for beats, releases, and packs." }),
    },
    {
      icon: FileKey2,
      t: intl.formatMessage({ id: "homepage.features.ownStore", defaultMessage: "Own your store" }),
      d: intl.formatMessage({ id: "homepage.features.ownStoreDescription", defaultMessage: "Set pricing, licenses, and bundles." }),
    },
    {
      icon: Coins,
      t: intl.formatMessage({ id: "homepage.features.getPaid", defaultMessage: "Get paid fast" }),
      d: intl.formatMessage({ id: "homepage.features.getPaidDescription", defaultMessage: "Transparent payouts. No nonsense." }),
    },
    {
      icon: Rocket,
      t: intl.formatMessage({ id: "homepage.features.grow", defaultMessage: "Grow" }),
      d: intl.formatMessage({ id: "homepage.features.growDescription", defaultMessage: "Contests, collabs & live sessions built-in." }),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {feats.map((f, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/20 bg-black/60 p-2">
              <f.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-base font-semibold leading-snug">{f.t}</div>
          </div>
          <p className="mt-2 text-sm text-zinc-300">{f.d}</p>
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { 
      t: "Create", 
      d: "Upload your music, set up your beat store, design your memberships. Your page is live in minutes.", 
      Icon: UploadCloud,
      color: "from-blue-500",
      time: "5 min setup"
    },
    { 
      t: "Earn", 
      d: "Fans buy directly from you. No middlemen, no 90-day waits. Payouts hit your account fast.", 
      Icon: Coins,
      color: "from-emerald-500",
      time: "Instant payouts"
    },
    { 
      t: "Grow", 
      d: "Go live, run collabs, launch courses. Track everything in your Creator Studio dashboard.", 
      Icon: Rocket,
      color: "from-primary",
      time: "Scale infinitely"
    },
  ];
  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden md:block" />
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative z-10">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 hover:border-white/20 transition-all duration-300"
          >
            {/* Step number badge */}
            <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-black border border-white/20 text-xs font-medium">
              Step {i + 1}
            </div>
            
            <div className="flex items-start justify-between mt-2">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} to-transparent`}>
                <s.Icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full">{s.time}</span>
            </div>
            
            <h3 className="mt-4 text-xl font-bold group-hover:text-primary transition-colors">{s.t}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection({ role }: { role: "fans" | "creators" }) {
  const creatorQuotes = [
    {
      quote: "I made more in my first week on Pluggd than 3 months of streaming. The direct fan connection is everything.",
      name: "AYOFÉ",
      userRole: "Singer & Producer",
      stat: "£2,400",
      statLabel: "first month",
      initials: "AY"
    },
    {
      quote: "Finally a platform built for creators, not corporations. The collab tools alone changed how we work.",
      name: "The FaNaTiX",
      userRole: "Grammy-nominated collective",
      stat: "47",
      statLabel: "collabs completed",
      initials: "TF"
    },
    {
      quote: "Selling beats with proper licensing, running memberships, AND going live? All in one place. Game changer.",
      name: "Elevatetoday",
      userRole: "Producer & Artist",
      stat: "1,200+",
      statLabel: "beats sold",
      initials: "ET"
    },
  ];

  const fanQuotes = [
    {
      quote: "I finally feel like my support actually reaches the artists I love. The exclusive content is incredible.",
      name: "Marcus T.",
      userRole: "Music Fan",
      stat: "15",
      statLabel: "artists supported",
      initials: "MT"
    },
    {
      quote: "Got early access to 3 albums this year before they went mainstream. The membership perks are worth every penny.",
      name: "Sarah K.",
      userRole: "Superfan",
      stat: "3",
      statLabel: "exclusive albums",
      initials: "SK"
    },
    {
      quote: "The live Q&As are amazing. I've had real conversations with producers I've followed for years.",
      name: "James R.",
      userRole: "Beat Collector",
      stat: "12",
      statLabel: "live sessions joined",
      initials: "JR"
    },
  ];

  const quotesData = role === "creators" ? creatorQuotes : fanQuotes;

  const content = role === "creators" ? {
    badge: "Creator stories",
    headline: <>Hear it from the<br /><span className="text-primary">creators themselves</span></>,
    subtitle: "Real artists. Real results. Real payouts."
  } : {
    badge: "Fan experiences",
    headline: <>Fans who<br /><span className="text-primary">support differently</span></>,
    subtitle: "Real fans. Real connections. Real impact."
  };

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-black/50 to-black/30 p-8 md:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Badge className="mb-4 bg-white/10 text-white border-white/20">{content.badge}</Badge>
        <h2 className="mt-3 text-3xl font-bold md:text-5xl">
          {content.headline}
        </h2>
        <p className="mt-4 text-zinc-400">{content.subtitle}</p>
      </div>
      <div className="relative z-10 mt-10 grid gap-6 md:grid-cols-3">
        {quotesData.map((quote, idx) => (
          <motion.div 
            key={quote.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <Quote className="h-8 w-8 text-primary/60" />
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{quote.stat}</div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">{quote.statLabel}</div>
              </div>
            </div>
            <p className="text-base leading-relaxed text-white/90 italic">"{quote.quote}"</p>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">{quote.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-white">{quote.name}</div>
                <div className="text-xs text-zinc-500">{quote.userRole}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FinalCTA({ role }: { role: "fans" | "creators" }) {
  const content = role === "creators" ? {
    badge: "✨ Free to get started",
    headline: <>Ready to own<br /><span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">your music career?</span></>,
    subtext: "Join thousands of creators who chose independence over algorithms. Set up your page in minutes, start earning today.",
    primaryCta: { text: "Create Your Free Page →", link: "/signup?intent=create" },
    secondaryCta: { text: "See How It Works", link: "/features" },
    footer: "No credit card required • Set up in under 5 minutes • 90% creator earnings"
  } : {
    badge: "🎵 Join the community",
    headline: <>Ready to discover<br /><span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">music that matters?</span></>,
    subtext: "Support artists directly and get exclusive access to new releases, live sessions, and behind-the-scenes content.",
    primaryCta: { text: "Start Exploring →", link: "/releases" },
    secondaryCta: { text: "Browse Creators", link: "/directory" },
    footer: "Free to browse • No subscription required • 90% goes to artists"
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-black/60 to-purple-900/30 p-10 md:p-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.25),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.2),_transparent_50%)]" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 space-y-6"
      >
        <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">
          {content.badge}
        </Badge>
        <h2 className="text-4xl md:text-6xl font-bold leading-tight">
          {content.headline}
        </h2>
        <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {content.subtext}
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button size="lg" className="px-10 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-xl shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 hover:scale-[1.02]" asChild>
            <Link to={content.primaryCta.link}>{content.primaryCta.text}</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-10 py-6 text-lg border-white/20 hover:bg-white/10 hover:border-white/40" asChild>
            <Link to={content.secondaryCta.link}>{content.secondaryCta.text}</Link>
          </Button>
        </div>
        <p className="text-sm text-zinc-500 pt-2">
          {content.footer}
        </p>
      </motion.div>
    </div>
  );
}

function FAQ() {
  const qa = [
    { q: "Do credits expire?", a: "No. Credits never expire." },
    { q: "Can I sell both beats and music?", a: "Yes. You can list beats, releases, and (optionally) sound packs." },
    { q: "What fees do you take?", a: "Transparent, low fees shown at checkout and in payouts." },
  ];
  return (
    <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
      {qa.map((x, i) => (
        <details key={i} className="group px-5 py-4">
          <summary className="cursor-pointer list-none text-base font-medium marker:content-none">
            <span className="mr-2 inline-block rounded bg-white/10 px-2 py-0.5 text-xs">Q</span>
            {x.q}
          </summary>
          <div className="mt-2 pl-6 text-sm text-zinc-300">{x.a}</div>
        </details>
      ))}
    </div>
  );
}

function PlacementsRow() {
  const placements = [
    { src: demoImage(901, 800, 800, "Wood pon E Fire", "Elevatetoday"), title: "Wood pon E Fire", artist: "Elevatetoday" },
    { src: demoImage(902, 800, 800, "MUSE EP", "D'YANI"), title: "MUSE EP", artist: "D'YANI" },
    { src: demoImage(903, 800, 800, "Still ah Link", "Elevatetoday"), title: "Still ah Link", artist: "Elevatetoday" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {placements.map((p, i) => (
        <div
          key={i}
          className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30"
        >
          <img src={p.src} alt={p.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-3 bottom-3">
            <div className="line-clamp-1 text-sm font-semibold">{p.title}</div>
            <div className="text-xs text-zinc-300">{p.artist}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/60">
      <div className="mx-auto max-w-[1280px] px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 flex items-center gap-2 text-lg font-bold">
              <PluggdMark />
              <span>pluggd</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The creator-first music platform. Own your work. Grow your fanbase. Keep your earnings.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="https://twitter.com/pluggdmusic" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition-colors" aria-label="Twitter">
                𝕏
              </a>
              <a href="https://instagram.com/pluggdmusic" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition-colors" aria-label="Instagram">
                📷
              </a>
              <a href="https://discord.gg/pluggd" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition-colors" aria-label="Discord">
                💬
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/marketplace" className="text-zinc-400 hover:text-white transition-colors">Beat Store</Link></li>
              <li><Link to="/releases" className="text-zinc-400 hover:text-white transition-colors">Releases</Link></li>
              <li><Link to="/live" className="text-zinc-400 hover:text-white transition-colors">Live Sessions</Link></li>
              <li><Link to="/collaborate" className="text-zinc-400 hover:text-white transition-colors">Collaborations</Link></li>
              <li><Link to="/courses" className="text-zinc-400 hover:text-white transition-colors">Courses</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Creators</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/signup?intent=create" className="text-zinc-400 hover:text-white transition-colors">Get Started</Link></li>
              <li><Link to="/studio" className="text-zinc-400 hover:text-white transition-colors">Creator Studio</Link></li>
              <li><Link to="/directory" className="text-zinc-400 hover:text-white transition-colors">Directory</Link></li>
              <li><Link to="/tools" className="text-zinc-400 hover:text-white transition-colors">Pro Tools</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-zinc-400 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/blog" className="text-zinc-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/careers" className="text-zinc-400 hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Legal</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="text-zinc-400 hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link to="/dmca" className="text-zinc-400 hover:text-white transition-colors">DMCA</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Pluggd. All rights reserved.</p>
          <p className="text-center">Made with 🎵 for creators, by creators</p>
        </div>
      </div>
    </footer>
  );
}

function PluggdMark() {
  return (
    <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-fuchsia-500 text-black shadow-lg">
      <Music2 className="h-4 w-4" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
function formatPrice(p?: number | string | null) {
  if (p == null) return "";
  const num = typeof p === "string" ? Number(p) : p;
  if (Number.isNaN(num)) return "";
  try {
    return gbp.format(num);
  } catch {
    return `£${num}`;
  }
}
function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return d.toLocaleString();
  const h = Math.round(diff / (1000 * 60 * 60));
  if (h < 24) return `in ${h}h`;
  const days = Math.round(h / 24);
  return `in ${days}d`;
}

// Utility: prefetch route & image to feel snappy
// -----------------------------------------------------------------------------
// END
// -----------------------------------------------------------------------------
