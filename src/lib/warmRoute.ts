const prefetched = new Set<string>();

const schedule =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (window.requestIdleCallback as typeof window.requestIdleCallback).bind(window)
    : (cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as any), 0);

function attachPrefetchLink(href: string) {
  if (typeof document === "undefined") return;
  try {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "document";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[warmRoute] failed to prefetch", href, error);
    }
  }
}

export function warmRoute(href: string | undefined | null, image?: string | null) {
  if (typeof window === "undefined" || !href) return;

  if (!prefetched.has(href)) {
    prefetched.add(href);
    schedule(() => attachPrefetchLink(href));
  }

  if (image) {
    const img = new Image();
    img.decoding = "async";
    img.src = image;
  }
}
