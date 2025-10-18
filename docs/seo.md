# SEO & Share Card Integration

This project now generates share card images through a dedicated Supabase Edge Function that hydrates entity-specific data and pipes it into the existing `generate-og-image` renderer.

## Edge Function

- **Path:** `supabase/functions/og-entity/index.ts`
- **Invocation:** `https://<project>.supabase.co/functions/v1/og-entity/<entity>/<identifier>`
- **Supported entities:** `release`, `beat`, `profile`
- **Behaviour:**
  1. Fetches canonical data from Supabase (`releases`, `beats`, `profiles` tables) using the same filters as the sitemap generator.
  2. Builds rich metadata (title, description, canonical URL, artwork) with the defaults defined in `src/lib/seo.ts`.
  3. Forwards the payload to the existing `generate-og-image` function and streams back the rendered PNG.
  4. Accepts optional query params:
     - `url` – overrides the canonical resource URL embedded in the image.
     - `accent` – supplies a custom accent colour used by the renderer.

## Front-end helpers

`src/lib/og.ts` exposes `buildEntityOgImageUrl(entity, identifier, options)` which constructs the correct endpoint URL (including API key, canonical resource URL, and optional accent override). When no custom endpoint is provided, the helper falls back to the Supabase function and works for both browser and SSR contexts.

Usage example inside a page component:

```ts
const canonicalPath = `/release/${release.id}`;
const origin = window.location.origin;
const ogUrl = buildEntityOgImageUrl('release', release.id, {
  resourceUrl: `${origin}${canonicalPath}`,
});
setMeta(metaTitle, metaDescription, canonicalPath, ogUrl);
```

## Updated routes

- `src/pages/ReleaseDetail.tsx`
- `src/pages/BeatDetail.tsx`
- `src/pages/Profile.tsx`
- `src/pages/UserProfile.tsx`
- `src/components/creator/WorldClassCreatorPage.tsx`
- `src/components/creator/components/CreatorSEO.tsx`

Each route now calls `setMeta` with the generated OG URL after data is loaded, ensuring consistent share cards for major entities.

## Testing

The integration test in `src/lib/__tests__/seo.spec.ts` verifies that `setMeta` writes the expected Open Graph and Twitter tags and that `buildEntityOgImageUrl` produces canonical Supabase URLs with resource tracking.
