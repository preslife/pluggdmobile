'use client';

import React, { useEffect, useMemo, useRef, useState, useContext, createContext, useId } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Coins, Users, UploadCloud, FileKey2, Rocket, Music2, Play, Pause, Sparkles, Disc, Handshake, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setMeta } from "@/lib/seo";
import { HomeStudioPreview } from "@/components/HomeStudioPreview";
import { warmRoute } from "@/lib/warmRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

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
import NewThisWeekCarousel from "@/components/NewThisWeekCarousel";
import LatestReleases from "@/components/LatestReleases";
import FeaturedArtistsSection from "@/components/FeaturedArtistsSection";
import FeaturedBeatsCarousel from "@/components/FeaturedBeatsCarousel";
import UpcomingReleases from "@/components/UpcomingReleases";
import { CommunityActivity } from "@/components/CommunityActivity";
import PlatformStats from "@/components/PlatformStats";
import FeaturesPreview from "@/components/FeaturesPreview";

// -----------------------------------------------------------------------------
// Pluggd — Homepage (X3)
// -----------------------------------------------------------------------------
export default function PluggdHomepage() {
  const intl = useIntl();
  const [role, setRole] = useState<"fans" | "creators">("fans");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
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

  const labels = useMemo(
    () =>
      role === "fans"
        ? [
            { key: "music", label: "Music", helper: "Songs, EPs & albums" },
            { key: "creators", label: "Creators", helper: "Follow & support" },
            { key: "beats", label: "Beats", helper: "Instrumentals to license" },
          ]
        : [
            { key: "beats", label: "Beats", helper: "Instrumentals to license" },
            { key: "music", label: "Music", helper: "Tracks, EPs & albums" },
            { key: "creators", label: "Creators", helper: "Artists, producers, vocalists" },
          ],
    [role]
  );

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

  const trendingRef = useRef<HTMLDivElement | null>(null);
  const scrollTo = (el: HTMLElement | null) =>
    el?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Compute genres from live data with graceful fallback
  const genres = useMemo(() => {
    const set = new Set<string>();
    releases.forEach((r) => r.genre && set.add(r.genre));
    beats.forEach((b) => b.genre && set.add(b.genre));
    const arr = Array.from(set);
    if (arr.length) return arr.slice(0, 12);
    return ["Afrobeats", "Drill", "Trap", "Lo-fi", "Amapiano", "House"]; // fallback
  }, [releases, beats]);

  const filteredBeats = useMemo(
    () => (activeGenre ? beats.filter((b) => b.genre === activeGenre) : beats),
    [activeGenre, beats]
  );
  const filteredReleases = useMemo(
    () =>
      activeGenre ? releases.filter((r) => r.genre === activeGenre) : releases,
    [activeGenre, releases]
  );

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
          <Hero role={role} labels={labels} slides={slides} />

          {/* Core discovery sections */}
          <SpotlightCarousel />
          <NewThisWeekCarousel />
          <LatestReleases />
          <FeaturedArtistsSection />
          <FeaturedBeatsCarousel />
          <UpcomingReleases />

          {/* Dynamic first rail by role */}
          <section ref={trendingRef} id="trending" className="py-12">
            {role === "fans" ? (
              <>
                <HeaderRow
                  title={`Trending ${activeGenre ? `${activeGenre} ` : ""}Music`}
                  cta="View all"
                  ctaLink="/releases"
                />
                <Carousel
                  items={filteredReleases}
                  renderItem={(it) => <ReleaseCard item={it} />}
                />
              </>
            ) : (
              <>
                <HeaderRow
                  title={`Trending ${activeGenre ? `${activeGenre} ` : ""}Beats`}
                  cta="View all"
                  ctaLink="/search?tab=beats"
                />
                <Carousel items={filteredBeats} renderItem={(it) => <BeatCard item={it} />} />
              </>
            )}
          </section>

          {/* Popular Genres — clickable filters that drive the first rail */}
          <section className="py-6">
            <HeaderRow title="Popular Genres" cta="See more" ctaLink="/search" />
            <GenreGrid
              genres={genres}
              activeGenre={activeGenre}
              setActiveGenre={(g) => {
                setActiveGenre((prev) => (prev === g ? null : g));
                scrollTo(trendingRef.current as any);
              }}
              role={role}
            />
          </section>

          <HomeRecommendations role={role} activeGenre={activeGenre} />

          <section className="py-12">
            <HeaderRow title="Active Collaborations" cta="Browse all projects" ctaLink="/collaborate" />
            <Carousel
              items={collabs}
              renderItem={(it) => <CollabCard item={it} />}
              itemWidth={380}
            />
          </section>

          <section className="py-12">
            <HeaderRow title="Upcoming Live" cta="See schedule" ctaLink="/live" />
            <Carousel items={live} renderItem={(it) => <LiveCard item={it} />} itemWidth={360} />
          </section>

          <CommunityActivity />
          <PlatformStats />

          {/* Why Pluggd — credibility + conversion */}
          <section className="py-12">
            <HeaderRow title={<FormattedMessage id="homepage.section.why" defaultMessage="Why Pluggd" />} />
            <FeatureBand />
          </section>

          {/* How it works — role aware */}
          <section className="py-12">
            <HeaderRow title={<FormattedMessage id="homepage.section.how" defaultMessage="How it works" />} />
            <HowItWorks role={role} />
          </section>

          <FeaturesPreview />
          <HomeStudioPreview role={role} />

          {/* FAQ */}
          <section className="py-12">
            <HeaderRow title={<FormattedMessage id="homepage.section.faq" defaultMessage="FAQ" />} />
            <FAQ />
          </section>

          <section className="py-12">
            <HeaderRow
              title={<FormattedMessage id="homepage.section.madeWith" defaultMessage="Made with Pluggd" />}
              cta={<FormattedMessage id="homepage.section.madeWithCta" defaultMessage="See placements" />}
              ctaLink="/directory"
            />
            <PlacementsRow />
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
  labels,
  slides,
}: {
  role: "fans" | "creators";
  labels: { key: string; label: string; helper: string }[];
  slides: { src: string; fallbackSeed: number; title: string; artist?: string | null; href?: string }[];
}) {
  const intl = useIntl();
  return (
    <section className="relative overflow-visible pt-10">
      {/* subtle brand gradient behind the whole hero */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_20%_20%,rgba(124,58,237,0.15),transparent),radial-gradient(700px_400px_at_90%_10%,rgba(249,115,22,0.12),transparent)]" />
      </div>
      {/* Blended artwork backdrop */}
      <HeroBackdrop slides={slides} />
      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pb-12 md:grid md:grid-cols-12 md:gap-8 md:px-6">
        <div className="md:col-span-7">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-[72px]">
            {role === "fans"
              ? intl.formatMessage({ id: "homepage.hero.fanHeadline", defaultMessage: "Discover & support the artists you love" })
              : intl.formatMessage({ id: "homepage.hero.creatorHeadline", defaultMessage: "Build, release, and get paid — in one hub" })}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-200 sm:text-lg">
            {role === "fans"
              ? intl.formatMessage({ id: "homepage.hero.fanSubheadline", defaultMessage: "Stream releases, buy digital music, tip creators, and join live sessions." })
              : intl.formatMessage({ id: "homepage.hero.creatorSubheadline", defaultMessage: "Sell beats & sound packs, license music, and book collaborations." })}
          </p>
          <SearchBlock labels={labels} role={role} />
          <div className="mt-5 flex flex-wrap items-center gap-5 px-1 text-xs text-zinc-200/90">
            <span>{intl.formatMessage({ id: "homepage.hero.bullet.secureCheckout", defaultMessage: "✅ Secure checkout" })}</span>
            <span>{intl.formatMessage({ id: "homepage.hero.bullet.credits", defaultMessage: "🪙 Credits never expire" })}</span>
            <span>{intl.formatMessage({ id: "homepage.hero.bullet.noSpam", defaultMessage: "🔕 No spam" })}</span>
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
function SearchBlock({
  labels,
  role,
}: {
  labels: { key: string; label: string; helper: string }[];
  role: "fans" | "creators";
}) {
  const [active, setActive] = useState(labels[0].key);
  const [q, setQ] = useState("");
  const searchInputId = useId();
  const helperId = `${searchInputId}-helper`;
  useEffect(() => {
    if (!labels.length) return;
    setActive((prev) => (labels.some((label) => label.key === prev) ? prev : labels[0].key));
  }, [labels]);
  const submit = () => {
    const term = q.trim();
    if (!term) return;
    const type = active;
    try {
      const searchParams = new URLSearchParams({
        q: term,
        tab: String(type),
      });
      searchParams.set("type", String(type));
      window.location.href = `/search?${searchParams.toString()}`;
    } catch {}
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };
  const helperText = labels.find((l) => l.key === active)?.helper;
  return (
    <form className="mt-5" onSubmit={handleSubmit} noValidate>
      <div className="rounded-2xl border border-white/10 bg-white/10 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1 md:flex-nowrap">
          {labels.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setActive(l.key)}
              className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                active === l.key
                  ? "bg-white text-black"
                  : "text-zinc-200 hover:text-white"
              }`}
              aria-pressed={active === l.key}
            >
              {l.label}
            </button>
          ))}
          <div className="ml-auto flex w-full flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/60 pl-3 pr-2">
            <label htmlFor={searchInputId} className="sr-only">
              Search Pluggd catalog
            </label>
            <svg
              aria-hidden
              className="h-5 w-5 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <input
              id={searchInputId}
              aria-describedby={helperText ? helperId : undefined}
              className="w-full bg-transparent px-3 py-3 text-base outline-none placeholder:text-zinc-400"
              placeholder={
                role === "fans"
                  ? "Search music, creators, or beats…"
                  : "Search beats, music, or creators…"
              }
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-[#7C3AED] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#6d34d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Search
            </button>
          </div>
        </div>
      </div>
      {helperText && (
        <div id={helperId} className="mt-2 text-xs text-zinc-300">
          {helperText}
        </div>
      )}
    </form>
  );
}

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

function HowItWorks({ role }: { role: "fans" | "creators" }) {
  const steps =
    role === "fans"
      ? [
          { t: "Follow creators", d: "Get notified when they drop new music or go live." },
          { t: "Support releases", d: "Buy downloads, tip artists, and share what you love." },
          { t: "Join live sessions", d: "Be part of the process and the premieres." },
        ]
      : [
          { t: "Upload your work", d: "Beats, releases, or sample packs — all welcome." },
          { t: "Set your store", d: "Licenses, prices & bundles — your rules." },
          { t: "Launch & grow", d: "Run contests, host sessions, and collab." },
        ];
  return (
    <motion.ol
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ staggerChildren: 0.06 }}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {steps.map((s, i) => {
        const Icon = [Users, ShieldCheck, Zap][i % 3];
        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/20 bg-black/60 p-2">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                Step {i + 1}
              </span>
            </div>
            <div className="mt-1 text-base font-semibold leading-snug">{s.t}</div>
            <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{s.d}</p>
            <div className="mt-4 flex items-center gap-3 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Community
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Safe
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" /> Fast
              </span>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
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
    <footer className="mt-20 border-t border-white/10 bg-black/40">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-10 md:grid-cols-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-bold">
            <PluggdMark />
            <span>pluggd</span>
          </div>
          <p className="text-sm text-zinc-400">The community for creators & fans.</p>
        </div>
        <div>
          <div className="text-sm font-semibold">Product</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            <li>Beats</li>
            <li>Releases</li>
            <li>Live</li>
            <li>Collab</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Company</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            <li>About</li>
            <li>Blog</li>
            <li>Careers</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            <li>Terms</li>
            <li>Privacy</li>
          </ul>
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
