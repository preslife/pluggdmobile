-- Insert sample beat sales data for testing (can be removed in production)
INSERT INTO public.beat_sales (
  beat_id,
  buyer_id,
  producer_id,
  license_type,
  sale_price,
  commission_rate,
  producer_earnings,
  platform_fee,
  currency,
  payout_status,
  created_at
) VALUES 
-- Sample sale 1
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'basic',
  25.00,
  20.0,
  20.00,
  5.00,
  'GBP',
  'pending',
  now() - interval '2 days'
),
-- Sample sale 2  
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'premium',
  50.00,
  20.0,
  40.00,
  10.00,
  'GBP',
  'paid',
  now() - interval '5 days'
),
-- Sample sale 3
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'exclusive',
  200.00,
  20.0,
  160.00,
  40.00,
  'GBP',
  'pending',
  now() - interval '1 day'
);