-- Keep creator membership provisioning moving without exposing its worker
-- credential to clients. The secret is stored separately in Supabase Vault.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.claim_membership_iap_provisioning_jobs(
  p_limit integer,
  p_worker_id text
)
returns setof public.membership_iap_provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.membership_iap_provisioning_jobs
    where (
      status in ('queued', 'pricing')
      and attempts < 8
      and next_attempt_at <= now()
    ) or (
      status = 'awaiting_review'
      and next_attempt_at <= now()
    )
    order by next_attempt_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 10))
  )
  update public.membership_iap_provisioning_jobs job
  set status = 'processing',
      attempts = case
        when job.status = 'awaiting_review' then job.attempts
        else job.attempts + 1
      end,
      locked_at = now(),
      locked_by = left(coalesce(nullif(p_worker_id, ''), 'worker'), 120),
      progress = jsonb_set(
        coalesce(job.progress, '{}'::jsonb),
        '{claimed_from}',
        to_jsonb(job.status),
        true
      ),
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_membership_iap_provisioning_jobs(integer, text)
  from public, anon, authenticated;
grant execute on function public.claim_membership_iap_provisioning_jobs(integer, text)
  to service_role;

create or replace function public.invoke_membership_iap_provisioner()
returns bigint
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'membership_iap_provisioner_secret'
  order by updated_at desc
  limit 1;

  if coalesce(v_secret, '') = '' then
    raise warning 'membership_iap_provisioner_secret is not configured in Vault';
    return null;
  end if;

  select net.http_post(
    url := 'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/provision-membership-iap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-pluggd-provisioner-secret', v_secret
    ),
    body := jsonb_build_object('limit', 3)
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_membership_iap_provisioner()
  from public, anon, authenticated;
grant execute on function public.invoke_membership_iap_provisioner()
  to postgres, service_role;

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'membership-iap-provisioner'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end
$$;

select cron.schedule(
  'membership-iap-provisioner',
  '* * * * *',
  'select public.invoke_membership_iap_provisioner();'
);

comment on function public.invoke_membership_iap_provisioner() is
  'Cron-only bridge to the membership App Store provisioning worker; its shared secret lives in Vault.';
