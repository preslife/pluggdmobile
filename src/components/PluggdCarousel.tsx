'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useSpring, useTransform, type SpringOptions } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useReleases } from "@/hooks/useReleases";
import { ReleaseCardSkeleton } from "@/components/ReleaseCardSkeleton";

type SpotlightProps = {
  className?: string;
  size?: number;
  springOptions?: SpringOptions;
  accentColor?: string;
};

function Spotlight({
  className,
  size = 220,
  springOptions = { bounce: 0 },
  accentColor = "#FF5A00",
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  const spotlightLeft = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const spotlightTop = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.style.position = "relative";
        setParentElement(parent);
      }
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!parentElement) return;
      const { left, top } = parentElement.getBoundingClientRect();
      mouseX.set(event.clientX - left);
      mouseY.set(event.clientY - top);
    },
    [mouseX, mouseY, parentElement]
  );

  useEffect(() => {
    if (!parentElement) return;
    const onEnter = () => setIsHovered(true);
    const onLeave = () => setIsHovered(false);
    parentElement.addEventListener("mousemove", handleMouseMove);
    parentElement.addEventListener("mouseenter", onEnter);
    parentElement.addEventListener("mouseleave", onLeave);
    return () => {
      parentElement.removeEventListener("mousemove", handleMouseMove);
      parentElement.removeEventListener("mouseenter", onEnter);
      parentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [parentElement, handleMouseMove]);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute -z-10 rounded-full blur-xl transition-opacity duration-200",
        isHovered ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        width: size,
        height: size,
        left: spotlightLeft,
        top: spotlightTop,
        background: `radial-gradient(circle at center, ${accentColor} 0%, rgba(255,90,0,0.15) 55%, transparent 75%)`,
      }}
    />
  );
}

type CarouselRelease = {
  id: string;
  title: string;
  artist: string;
  image: string;
  releaseDate: string;
  genre: string;
};

interface PluggdCarouselProps {
  releases?: CarouselRelease[];
  accentColor?: string;
  heightClass?: string;
}

const defaultReleases: CarouselRelease[] = [
  {
    id: "1",
    title: "Midnight Dreams",
    artist: "Luna Eclipse",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop",
    releaseDate: "2024-01-15",
    genre: "Electronic",
  },
  {
    id: "2",
    title: "Ocean Waves",
    artist: "Coastal Sounds",
    image: "https://images.unsplash.com/photo-1571974599782-87624638275c?w=800&h=800&fit=crop",
    releaseDate: "2024-02-20",
    genre: "Ambient",
  },
  {
    id: "3",
    title: "Urban Nights",
    artist: "City Beats",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop",
    releaseDate: "2024-03-10",
    genre: "Hip Hop",
  },
];

const mapRelease = (release: CarouselRelease) => ({
  ...release,
  title: release.title || "Untitled Release",
  artist: release.artist || "Unknown Artist",
  image: release.image || "/placeholder.svg",
  genre: release.genre || "",
  releaseDate: release.releaseDate || "",
});

type TouchTrackDiv = HTMLDivElement & { _touchX?: number };

export function PluggdCarousel({
  releases: releasesProp,
  accentColor = "#FF5A00",
  heightClass = "h-80",
}: PluggdCarouselProps) {
  const { data, loading, error } = useReleases(12);
  const hasExternalReleases = !!(releasesProp && releasesProp.length);

  useEffect(() => {
    if (error) {
      console.warn("Failed to load releases for carousel", error);
    }
  }, [error]);

  const supabaseReleases = useMemo<CarouselRelease[]>(
    () =>
      data.map((release) => ({
        id: release.id,
        title: release.title || "Untitled Release",
        artist: release.artist || "Unknown Artist",
        image: release.image_url || release.cover_art_url || "/placeholder.svg",
        releaseDate: release.release_date || "",
        genre: release.genre || "",
      })),
    [data]
  );

  const mergedReleases = useMemo(() => {
    if (hasExternalReleases) {
      return releasesProp!.map(mapRelease);
    }

    if (supabaseReleases.length) {
      return supabaseReleases.map(mapRelease);
    }

    return defaultReleases;
  }, [hasExternalReleases, releasesProp, supabaseReleases]);

  const releases = mergedReleases;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<TouchTrackDiv | null>(null);

  const showSkeleton = !hasExternalReleases && loading;

  useEffect(() => {
    if (!releases.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) => Math.min(current, releases.length - 1));
  }, [releases.length]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setRotation({ x: (y - cy) / 30, y: -(x - cx) / 30 });
  }, []);

  const resetTilt = useCallback(() => setRotation({ x: 0, y: 0 }), []);

  const next = useCallback(() => {
    if (releases.length <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % releases.length);
  }, [releases.length]);

  const prev = useCallback(() => {
    if (releases.length <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + releases.length) % releases.length);
  }, [releases.length]);

  const getCardPos = useCallback(
    (index: number) => {
      const diff = index - selectedIndex;
      const isActive = diff === 0;
      return {
        x: diff * 120,
        scale: isActive ? 1.06 : 0.92,
        opacity: Math.abs(diff) > 2 ? 0 : 1,
        zIndex: isActive ? 10 : 1,
        rotateY: diff * 12,
      };
    },
    [selectedIndex]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const handlePlayClick = useCallback((release: CarouselRelease) => {
    // Integrate with the global player bus when available
    console.info("Play release", release.id);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    wrapRef.current._touchX = event.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!wrapRef.current) return;
      const previous = wrapRef.current._touchX ?? event.touches[0].clientX;
      const current = event.touches[0].clientX;
      const delta = current - previous;
      wrapRef.current._touchX = current;

      if (Math.abs(delta) > 20) {
        if (delta < 0) {
          next();
        } else {
          prev();
        }
      }
    },
    [next, prev]
  );

  if (showSkeleton) {
    return (
      <section aria-label="Featured releases" className={cn("relative flex w-full items-center justify-center", heightClass)}>
        <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-6 overflow-x-auto px-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <ReleaseCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (!releases.length) {
    return null;
  }

  const selectedRelease = releases[selectedIndex] ?? releases[0];

  return (
    <section aria-label="Featured releases" className={cn("relative flex w-full items-center justify-center", heightClass)}>
      <Spotlight size={260} accentColor={accentColor} />

      <div
        ref={wrapRef}
        className="relative z-10 mx-auto flex h-full max-w-6xl items-center justify-center px-4 perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: "preserve-3d" }}
      >
        <div className="relative flex items-center justify-center w-full h-[22rem] md:h-[24rem]">
          {releases.map((release, index) => {
            const pos = getCardPos(index);
            const isActive = index === selectedIndex;
            return (
              <motion.div
                key={release.id}
                animate={pos}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="absolute cursor-pointer isolate"
                onClick={() => setSelectedIndex(index)}
                role="button"
                aria-pressed={isActive}
                aria-label={`Select ${release.title} by ${release.artist}`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedIndex(index);
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border transition-all duration-300",
                    "bg-white/5 backdrop-blur-sm border-white/10",
                    "shadow-2xl hover:shadow-3xl",
                    isActive ? "w-72 md:w-80 h-96" : "w-56 md:w-64 h-80 hover:scale-105"
                  )}
                >
                  <div className="relative h-full flex flex-col">
                    <div className="relative flex-1 overflow-hidden">
                      <img
                        src={release.image}
                        alt={`${release.title} cover`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        draggable={false}
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>

                    <div className="p-4 md:p-5 bg-black text-white border-t border-white/10">
                      <h3 className={cn("font-bold mb-1 line-clamp-1", isActive ? "text-xl" : "text-lg")}>{release.title}</h3>
                      <p className="text-white/80 text-sm mb-2 line-clamp-1">{release.artist}</p>
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>{release.genre}</span>
                        <span>{release.releaseDate ? new Date(release.releaseDate).getFullYear() : ""}</span>
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 h-8 px-3 text-black"
                        style={{ backgroundColor: accentColor }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePlayClick(release);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" /> Play
                      </Button>
                    </div>

                    {isActive && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-2xl border-2"
                        style={{ borderColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}33 inset` }}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={prev}
          className="border-white/20 text-white bg-white/5 hover:bg-white/10"
          aria-label="Previous release"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={next}
          className="border-white/20 text-white bg-white/5 hover:bg-white/10"
          aria-label="Next release"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {selectedRelease && (
        <div
          className="absolute top-0 right-4 md:right-8 mt-2 rounded-full px-3 py-1 text-xs font-medium text-black"
          style={{ backgroundColor: accentColor }}
        >
          Now Playing: {selectedRelease.title}
        </div>
      )}
    </section>
  );
}

export default PluggdCarousel;
