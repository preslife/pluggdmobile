import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { render as renderPng } from "https://deno.land/x/resvg_wasm@0.2.0/mod.ts";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_DESCRIPTION =
  "Pluggd helps creators sell releases, beats, memberships, and more while fans discover the next wave of sound.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VariantKey = "release" | "beat" | "profile" | "session" | "store" | "default";

const escapeXml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const variants: Record<
  VariantKey,
  { label: string; gradient: string; accent: string; overlayOpacity?: number }
> = {
  release: {
    label: "New Release",
    gradient: "linear-gradient(135deg, #0f172a 0%, #6b21a8 60%, #fb7185 100%)",
    accent: "#fb7185",
  },
  beat: {
    label: "Featured Beat",
    gradient: "linear-gradient(135deg, #0f172a 0%, #0ea5e9 55%, #a855f7 100%)",
    accent: "#0ea5e9",
  },
  profile: {
    label: "Creator Spotlight",
    gradient: "linear-gradient(135deg, #111827 0%, #ff7eb6 50%, #8b5cf6 100%)",
    accent: "#ff7eb6",
  },
  session: {
    label: "Live Session",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #22d3ee 50%, #34d399 100%)",
    accent: "#22d3ee",
  },
  store: {
    label: "Marketplace Drop",
    gradient: "linear-gradient(135deg, #111827 0%, #2dd4bf 60%, #f59e0b 100%)",
    accent: "#2dd4bf",
  },
  default: {
    label: "Pluggd",
    gradient: "linear-gradient(135deg, #0f172a 0%, #6366f1 60%, #a855f7 100%)",
    accent: "#6366f1",
    overlayOpacity: 0.75,
  },
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const clamp = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const buildDescription = (description: string) =>
  description.split(/\s+/).slice(0, 30).join(" ");

const toDataUri = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch (_error) {
    console.warn("[generate-og-image] Failed to fetch background image", _error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const title = clamp(url.searchParams.get("title") ?? "Discover on Pluggd", 120);
    const description = clamp(
      buildDescription(url.searchParams.get("description") ?? DEFAULT_DESCRIPTION),
      200,
    );
    const type = (url.searchParams.get("type") as VariantKey) ?? "default";
    const accentOverride = url.searchParams.get("accent");
    const resourceUrl = url.searchParams.get("url") ?? "pluggd.fm";
    const backgroundImageUrl = url.searchParams.get("image") ?? "";

    const variant = variants[type] ?? variants.default;
    const accent = accentOverride || variant.accent;

    const backgroundDataUri = backgroundImageUrl ? await toDataUri(backgroundImageUrl) : null;
    const escapedTitle = escapeXml(title);
    const escapedDescription = escapeXml(description);
    const escapedType = escapeXml(toTitleCase(type));
    const escapedUrl = escapeXml(resourceUrl);
    const gradientOverlayOpacity = variant.overlayOpacity ?? 0.85;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="${variant.accent}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.4"/>
    </linearGradient>
    ${backgroundDataUri ? `<pattern id="bgImage" patternUnits="objectBoundingBox" width="1" height="1"><image href="${backgroundDataUri}" width="${OG_WIDTH}" height="${OG_HEIGHT}" preserveAspectRatio="xMidYMid slice" opacity="0.35"/></pattern>` : ""}
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#gradient)" />
  ${backgroundDataUri ? `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bgImage)" />` : ""}
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="rgba(15, 23, 42, ${gradientOverlayOpacity})" />
  <g fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2">
    <rect x="28" y="28" width="${OG_WIDTH - 56}" height="${OG_HEIGHT - 56}" rx="32" />
  </g>
  <circle cx="100" cy="100" r="16" fill="${accent}" />
  <text x="140" y="112" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="600" fill="#ffffff" letter-spacing="4">PLUGGD</text>
  <g transform="translate(${OG_WIDTH - 340}, 76)">
    <rect width="280" height="56" rx="28" fill="rgba(15, 23, 42, 0.6)" stroke="rgba(255,255,255,0.4)" />
    <text x="140" y="36" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" fill="#ffffff" text-anchor="middle" letter-spacing="6">${escapedType.toUpperCase()}</text>
  </g>
  <text x="100" y="240" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="600" fill="#ffffff" letter-spacing="-1" style="text-shadow: 0px 25px 45px rgba(0,0,0,0.35);">
    ${escapedTitle}
  </text>
  <foreignObject x="100" y="300" width="${OG_WIDTH - 200}" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, system-ui, sans-serif; font-size: 28px; line-height: 1.4; color: rgba(255,255,255,0.88);">
      ${escapedDescription}
    </div>
  </foreignObject>
  <g transform="translate(100, ${OG_HEIGHT - 120})" fill="rgba(255,255,255,0.75)" font-family="Inter, system-ui, sans-serif">
    <text font-size="24" font-weight="500" letter-spacing="8">${escapedType.toUpperCase()}</text>
    <text y="40" font-size="24">${escapedUrl}</text>
  </g>
</svg>`;

    const png = await renderPng(svg);

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[generate-og-image] Failed to render OG image", error);
    return new Response("Failed to render OG image", {
      headers: corsHeaders,
      status: 500,
    });
  }
});
