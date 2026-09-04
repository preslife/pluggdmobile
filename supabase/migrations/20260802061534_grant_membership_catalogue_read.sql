-- The membership screen reads this server-owned catalogue through PostgREST.
-- RLS still limits authenticated callers to active, fully provisioned rows;
-- the explicit table grant is also required for the policy to take effect.
revoke all on table public.membership_iap_products from public;
revoke all on table public.membership_iap_products from anon;
grant select on table public.membership_iap_products to authenticated;
