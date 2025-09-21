-- Clear existing test data and insert realistic beat sales with actual beat IDs
DELETE FROM public.beat_sales WHERE beat_id IN (
  'c2612db6-ea1a-40f0-831d-a498e49143df',
  '1136c577-d73f-4756-bd27-9a4bd2a158e4', 
  '9d8aba8d-9a4c-4c8c-b9df-4de5df38b663',
  'e7d62aae-53c2-4e09-8f75-34df888e9cf6'
);

-- Insert sample beat sales data using real beat IDs
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
-- Sale for "Lose Your Way"
(
  'c2612db6-ea1a-40f0-831d-a498e49143df',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  'basic',
  25.00,
  20.0,
  20.00,
  5.00,
  'GBP',
  'pending',
  now() - interval '2 days'
),
-- Sale for "PLF"
(
  '1136c577-d73f-4756-bd27-9a4bd2a158e4',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  'premium',
  50.00,
  20.0,
  40.00,
  10.00,
  'GBP',
  'paid',
  now() - interval '5 days'
),
-- Sale for "Tek my Time"
(
  '9d8aba8d-9a4c-4c8c-b9df-4de5df38b663',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  'exclusive',
  200.00,
  20.0,
  160.00,
  40.00,
  'GBP',
  'pending',
  now() - interval '1 day'
),
-- Sale for "Grounding Riddim"
(
  'e7d62aae-53c2-4e09-8f75-34df888e9cf6',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  'basic',
  30.00,
  20.0,
  24.00,
  6.00,
  'GBP',
  'paid',
  now() - interval '3 days'
),
-- Additional sale for "PLF" 
(
  '1136c577-d73f-4756-bd27-9a4bd2a158e4',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  '862d3297-de1d-4c02-bd8d-8fd2cbe70f45',
  'basic',
  25.00,
  20.0,
  20.00,
  5.00,
  'GBP',
  'pending',
  now() - interval '6 hours'
);