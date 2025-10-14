import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { h } from "https://esm.sh/preact@10.19.2";
import satori from "https://esm.sh/satori@0.10.3";
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

const interRegularPromise = fetch(
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.5/files/inter-latin-400-normal.woff2",
).then((res) => res.arrayBuffer());

const interSemiBoldPromise = fetch(
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.5/files/inter-latin-600-normal.woff2",
).then((res) => res.arrayBuffer());

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

    const [interRegular, interSemiBold] = await Promise.all([
      interRegularPromise,
      interSemiBoldPromise,
    ]);

    const backgroundDataUri = backgroundImageUrl ? await toDataUri(backgroundImageUrl) : null;

    const svg = await satori(
      h(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: variant.gradient,
            color: "#ffffff",
            padding: "64px",
            boxSizing: "border-box",
          },
        },
        backgroundDataUri
          ? h("div", {
              style: {
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${backgroundDataUri})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.35,
                filter: "blur(1px)",
              },
            })
          : null,
        h("div", {
          style: {
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.35) 100%)",
            opacity: variant.overlayOpacity ?? 0.85,
          },
        }),
        h(
          "div",
          {
            style: {
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 32,
                fontWeight: 600,
              },
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 16 } },
              h("div", {
                style: {
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: accent,
                },
              }),
              "PLUGGD",
            ),
            h(
              "div",
              {
                style: {
                  padding: "8px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                  fontSize: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                },
              },
              variant.label,
            ),
          ),
          h(
            "div",
            {
              style: {
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              },
            },
            h("h1", {
              style: {
                fontSize: 72,
                fontWeight: 600,
                lineHeight: 1.1,
                margin: 0,
                maxWidth: "960px",
                textShadow: "0 20px 60px rgba(0,0,0,0.35)",
              },
              children: title,
            }),
            h("p", {
              style: {
                marginTop: 32,
                fontSize: 30,
                maxWidth: "840px",
                lineHeight: 1.4,
                color: "rgba(255,255,255,0.86)",
              },
              children: description,
            }),
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 24,
                color: "rgba(255,255,255,0.75)",
              },
            },
            h("span", {
              style: { textTransform: "uppercase", letterSpacing: "0.4em" },
              children: toTitleCase(type),
            }),
            h("span", { children: resourceUrl }),
          ),
        ),
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
          {
            name: "Inter",
            data: interRegular,
            weight: 400,
            style: "normal",
          },
          {
            name: "Inter",
            data: interSemiBold,
            weight: 600,
            style: "normal",
          },
        ],
      },
    );

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
