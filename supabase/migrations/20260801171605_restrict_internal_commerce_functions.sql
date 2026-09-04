-- Server-only commerce primitives must never be callable through PostgREST by
-- anonymous or ordinary authenticated clients. Edge Functions invoke them with
-- the service role after validating the relevant purchase state.

revoke all on function public.fn_enforce_exclusive_license_grant(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.fn_enforce_exclusive_license_grant(uuid, uuid, uuid)
  to service_role;

revoke all on function public.fn_resolve_sale_allocations(
  text, uuid, text, uuid, numeric, numeric, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.fn_resolve_sale_allocations(
  text, uuid, text, uuid, numeric, numeric, text, uuid, text
) to service_role;

revoke all on function public.fn_seed_release_licensing_options(uuid)
  from public, anon, authenticated;
grant execute on function public.fn_seed_release_licensing_options(uuid)
  to service_role;

-- Certificate generation exposes an immutable purchase document and is also
-- kept behind the authenticated commerce document endpoint.
revoke all on function public.fn_build_license_certificate(text)
  from public, anon, authenticated;
grant execute on function public.fn_build_license_certificate(text)
  to service_role;
