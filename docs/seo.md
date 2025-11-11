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

## Sitemap generation

The sitemap builder in `scripts/generate-sitemap.ts` now hydrates every public-facing entity that receives an OG treatment:

- **Releases** (`releases` table, `status` ∈ {`live`, `approved`})
- **Beats** (`beats` table, `is_published = true`)
- **Profiles** (`profiles` table with a username)
- **Labels** (`labels` table, published slugs only)
- **Sample packs** (`sample_packs` table, latest 200 items)
- **Live sessions** (`live_sessions` table excluding drafts)
- **Store products** (`store_products` table, active & published)

Static coverage also includes `/marketplace`, `/sample-pack-store`, `/live`, and `/studio` so crawlers pick up the landing hubs that aggregate each entity.

### Running the generator

```bash
SUPABASE_URL=<project-url> \
SUPABASE_SERVICE_ROLE_KEY=<service-key> \
node scripts/generate-sitemap.mjs public/sitemap.xml
```

`SITEMAP_BASE_URL` or `SITE_URL` overrides the canonical origin during generation.

### Verifying output

- A Vitest snapshot (`tests/scripts/generate-sitemap.test.ts`) exercises `buildSitemapXml` to ensure beats, releases, sample packs, sessions, and profiles render into the expected XML structure.
- Use `npm run test -- tests/scripts/generate-sitemap.test.ts` when adjusting the sitemap helper to lock in deterministic output.
- Inspect the generated XML for the expected `<loc>` patterns (`/sample-pack-store/:id`, `/live/sessions/:id`, etc.) before deploying to production.

### Debugging tips

1. Run `node scripts/generate-sitemap.mjs --inspect` locally to step through the Supabase fetches; each helper throws immediately when the underlying query fails.
2. Pass `DEBUG=pg` to Supabase (`process.env.DEBUG = 'supabase'`) if you need to inspect raw SQL while validating filters.
3. Validate the final XML via `curl https://www.google.com/ping?sitemap=<encoded sitemap URL>` and confirm a 200 response from the search engine endpoint.

## OG endpoint reference

The Supabase edge function accepts optional query parameters for further tuning:

| Parameter | Purpose |
|-----------|---------|
| `url`     | Overrides the canonical URL embedded inside the generated Open Graph image. |
| `accent`  | Injects a hex colour (without `#`) that the renderer uses for gradients and emphasis. |

For manual testing, hit `https://<project>.supabase.co/functions/v1/og-entity/<entity>/<identifier>?url=<encoded>&accent=<hex>` and inspect the returned PNG. When debugging stale artwork, use the browser’s “Disable cache” dev-tools setting and confirm the Supabase logs show fresh fetches for the target entity.
