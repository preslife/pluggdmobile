const DEFAULT_OG_ENDPOINT =
  (import.meta as any).env?.VITE_OG_IMAGE_ENDPOINT || "https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image";

export type OgImageVariant = "release" | "beat" | "profile" | "session" | "store" | "default";

export interface BuildOgImageOptions {
  title: string;
  description?: string;
  type?: OgImageVariant;
  imageUrl?: string | null;
  accent?: string | null;
  resourceUrl?: string;
  endpoint?: string;
}

const getEndpoint = (override?: string) => {
  if (override) {
    return override;
  }

  const envEndpoint = DEFAULT_OG_ENDPOINT;
  if (envEndpoint) {
    return envEndpoint;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/og`;
  }

  return "/og";
};

export const buildOgImageUrl = ({
  title,
  description,
  type = "default",
  imageUrl,
  accent,
  resourceUrl,
  endpoint,
}: BuildOgImageOptions): string => {
  const base = getEndpoint(endpoint);
  const url = base.startsWith("http")
    ? new URL(base)
    : new URL(
        base,
        typeof window !== "undefined" ? window.location.origin : "https://pluggd.fm",
      );
  url.searchParams.set("title", title);
  if (description) {
    url.searchParams.set("description", description);
  }
  if (type) {
    url.searchParams.set("type", type);
  }
  if (imageUrl) {
    url.searchParams.set("image", imageUrl);
  }
  if (accent) {
    url.searchParams.set("accent", accent);
  }
  if (resourceUrl) {
    url.searchParams.set("url", resourceUrl);
  } else if (typeof window !== "undefined") {
    url.searchParams.set("url", window.location.hostname);
  }
  return url.toString();
};

export const buildReleaseOgImageUrl = (
  title: string,
  description?: string,
  imageUrl?: string | null,
) =>
  buildOgImageUrl({
    title,
    description,
    imageUrl,
    type: "release",
  });

export const buildProfileOgImageUrl = (
  title: string,
  description?: string,
  imageUrl?: string | null,
) =>
  buildOgImageUrl({
    title,
    description,
    imageUrl,
    type: "profile",
  });
