# Release Playback Repair Runbook

## Affected releases (current data)
- `a96ea39e-e666-410f-9dfb-fc382377cdce` — "Wood pon E Fire"
  - Preview points to a signed URL in the private `audio-files` bucket. Once the token expires the player has nothing to stream.
- `834871ec-ca14-4add-a2e6-7746940dfb40` — "Ordained"
  - No preview URL and no tracks attached.

## Repair steps
1. **Move/confirm audio assets in the public bucket**
   - Download the original masters from `audio-files/...` if needed.
   - Upload to `release-audio/<owner_id>/<filename>` so the asset is public.
   - Suggested paths:
     - `release-audio/c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f/WOODSHORT1.mp3`
     - `release-audio/c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f/ordained.mp3`
2. **Update preview/track references**
   - If the release relies on a preview clip, set `releases.preview_url` to the public URL.
   - If full tracks exist, insert/update rows in `public.tracks` with the public audio URL (one per song) and allow the new backfill migration (`20250918095000_backfill_release_preview_from_tracks.sql`) to populate missing previews automatically.
3. **Re-run the backfill (if necessary)**
   ```sql
   update public.releases r
   set preview_url = t.audio_url
   from (
     select distinct on (release_id) release_id, audio_url
     from public.tracks
     where audio_url is not null and audio_url <> ''
     order by release_id, coalesce(track_number, 1), created_at
   ) t
   where r.id = t.release_id
     and (r.preview_url is null or r.preview_url = '');
   ```
4. **Smoke test**
   - Visit `/release/<slug-or-id>` in the app.
   - Confirm the player now appears (new frontend fallback also uses the first track when a preview URL is missing).

## Preventing regressions
- Prefer uploading release previews to the public `release-audio` bucket instead of relying on signed URLs that expire.
- Attach at least one track row per release so the player has a durable source.
- Keep the new fallback in `src/pages/Release.tsx` and run the backfill after bulk updates to ensure `preview_url` is never empty.
