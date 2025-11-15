-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Gmail inbox polling every 15 minutes
SELECT
  cron.schedule(
    'inbox-fetch-gmail-15min',
    '*/15 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-gmail',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      ) AS request_id;
    $$
  );

-- Schedule Discord inbox polling every 15 minutes (offset by 5 minutes)
SELECT
  cron.schedule(
    'inbox-fetch-discord-15min',
    '5-59/15 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-discord',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      ) AS request_id;
    $$
  );
