-- Public-schema views execute with the caller's permissions so underlying RLS
-- remains authoritative. Limit API grants to the views each client role needs.

do $$
declare
  view_name text;
begin
  foreach view_name in array array[
    'artist_dj_support',
    'catalog_items_overview',
    'creator_kpi_daily_personal',
    'crm_contact_rollup',
    'crm_contacts_enriched',
    'directory_entities',
    'live_gift_room_totals',
    'membership_access_rules',
    'profile_age_bands',
    'social_author_profiles',
    'social_trending_hashtags',
    'track_mix_inclusions',
    'v_creator_available_balances',
    'v_creator_pool_month_summary',
    'v_trending_content',
    'v_wallet_balances',
    'view_hub_collab_briefs',
    'view_hub_contests',
    'view_hub_courses',
    'view_hub_creator_spotlight',
    'view_hub_events',
    'view_hub_events_core',
    'view_hub_members_top',
    'view_hub_threads',
    'view_hub_trending',
    'vw_checkout_activity_daily',
    'vw_membership_activity_daily',
    'vw_notification_skip_summary',
    'vw_trust_safety_report_status',
    'vw_webhook_delivery_errors'
  ]
  loop
    if to_regclass(format('public.%I', view_name)) is not null then
      execute format(
        'alter view public.%I set (security_invoker = true)',
        view_name
      );
      execute format(
        'revoke all privileges on public.%I from anon, authenticated',
        view_name
      );
    end if;
  end loop;
end
$$;

-- Public discovery and community projections expose only published/public
-- records permitted by their underlying row-level policies.
grant select on public.artist_dj_support to anon, authenticated;
grant select on public.directory_entities to anon, authenticated;
grant select on public.live_gift_room_totals to anon, authenticated;
grant select on public.membership_access_rules to anon, authenticated;
grant select on public.social_author_profiles to anon, authenticated;
grant select on public.social_trending_hashtags to anon, authenticated;
grant select on public.track_mix_inclusions to anon, authenticated;
grant select on public.v_trending_content to anon, authenticated;
grant select on public.view_hub_collab_briefs to anon, authenticated;
grant select on public.view_hub_contests to anon, authenticated;
grant select on public.view_hub_courses to anon, authenticated;
grant select on public.view_hub_creator_spotlight to anon, authenticated;
grant select on public.view_hub_events to anon, authenticated;
grant select on public.view_hub_events_core to anon, authenticated;
grant select on public.view_hub_members_top to anon, authenticated;
grant select on public.view_hub_threads to anon, authenticated;
grant select on public.view_hub_trending to anon, authenticated;

-- Signed-in creator surfaces remain caller-scoped by RLS or auth.uid().
grant select on public.catalog_items_overview to authenticated;
grant select on public.creator_kpi_daily_personal to authenticated;
grant select on public.v_creator_available_balances to authenticated;
grant select on public.v_wallet_balances to authenticated;

-- CRM, private demographics, pool accounting and operational observability
-- are deliberately service-role only.
grant select on public.crm_contact_rollup to service_role;
grant select on public.crm_contacts_enriched to service_role;
grant select on public.profile_age_bands to service_role;
grant select on public.v_creator_pool_month_summary to service_role;
grant select on public.vw_checkout_activity_daily to service_role;
grant select on public.vw_membership_activity_daily to service_role;
grant select on public.vw_notification_skip_summary to service_role;
grant select on public.vw_trust_safety_report_status to service_role;
grant select on public.vw_webhook_delivery_errors to service_role;
