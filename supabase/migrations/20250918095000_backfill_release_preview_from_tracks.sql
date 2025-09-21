-- Backfill release previews using first available track audio URL when missing
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
