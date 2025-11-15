-- Phase E2: Social feed RPC for followed creators
create or replace function public.get_follow_feed(
  p_user_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  feed_id uuid,
  activity_type text,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  actor_name text,
  actor_avatar_url text,
  title text,
  body text,
  media_url text,
  price numeric,
  status text,
  created_at timestamptz,
  metadata jsonb
)
language sql
security definer
set search_path = public
stable
as $$
with followees as (
  select following_id
  from public.user_follows
  where follower_id = p_user_id
),
release_feed as (
  select
    r.id as feed_id,
    'release'::text as activity_type,
    'release'::text as entity_type,
    r.id as entity_id,
    r.user_id as actor_id,
    coalesce(p.full_name, p.username, r.artist) as actor_name,
    p.avatar_url as actor_avatar_url,
    r.title,
    nullif(r.description, '') as body,
    r.cover_art_url as media_url,
    coalesce(r.price, r.download_price, 0)::numeric as price,
    coalesce(r.status, 'draft') as status,
    r.created_at,
    jsonb_build_object(
      'genre', r.genre,
      'preview_url', r.preview_url,
      'smartlink', r.smartlink_slug,
      'cover_art_url', r.cover_art_url
    ) as metadata
  from public.releases r
  join followees f on f.following_id = r.user_id
  left join public.profiles p on p.user_id = r.user_id
  where coalesce(r.status, 'draft') not in ('draft', 'submitted', 'rejected')
),
beat_feed as (
  select
    b.id as feed_id,
    'beat_upload'::text as activity_type,
    'beat'::text as entity_type,
    b.id as entity_id,
    b.user_id as actor_id,
    coalesce(p.full_name, p.username, b.producer_name, 'Producer') as actor_name,
    p.avatar_url as actor_avatar_url,
    b.title,
    nullif(b.description, '') as body,
    b.image_url as media_url,
    coalesce(b.price, 0)::numeric as price,
    case when b.is_published then 'live' else 'draft' end as status,
    b.created_at,
    jsonb_build_object(
      'genre', b.genre,
      'bpm', b.bpm,
      'audio_url', b.audio_url,
      'image_url', b.image_url
    ) as metadata
  from public.beats b
  join followees f on f.following_id = b.user_id
  left join public.profiles p on p.user_id = b.user_id
  where b.is_published = true
),
post_feed as (
  select
    sp.id as feed_id,
    'social_post'::text as activity_type,
    'post'::text as entity_type,
    sp.id as entity_id,
    sp.user_id as actor_id,
    coalesce(p.full_name, p.username, 'Creator') as actor_name,
    p.avatar_url as actor_avatar_url,
    null::text as title,
    sp.body as body,
    coalesce(sp.media_paths[1], null) as media_url,
    0::numeric as price,
    sp.status,
    sp.created_at,
    jsonb_build_object(
      'media_paths', sp.media_paths,
      'destinations', sp.destinations
    ) as metadata
  from public.social_posts sp
  join followees f on f.following_id = sp.user_id
  left join public.profiles p on p.user_id = sp.user_id
  where sp.status = 'posted'
),
combined as (
  select * from release_feed
  union all
  select * from beat_feed
  union all
  select * from post_feed
)
select
  feed_id,
  activity_type,
  entity_type,
  entity_id,
  actor_id,
  actor_name,
  actor_avatar_url,
  title,
  body,
  media_url,
  price,
  status,
  created_at,
  metadata
from combined
order by created_at desc
limit greatest(p_limit, 1)
offset greatest(p_offset, 0);
$$;

grant execute on function public.get_follow_feed(uuid, integer, integer) to authenticated;
