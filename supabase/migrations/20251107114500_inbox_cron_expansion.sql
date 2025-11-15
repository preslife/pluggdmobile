CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inbox-fetch-gmail-15min') THEN
    PERFORM cron.schedule(
      'inbox-fetch-gmail-15min',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-gmail',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      );
      $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inbox-fetch-discord-15min') THEN
    PERFORM cron.schedule(
      'inbox-fetch-discord-15min',
      '5-59/15 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-discord',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      );
      $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inbox-fetch-youtube-20min') THEN
    PERFORM cron.schedule(
      'inbox-fetch-youtube-20min',
      '10-59/20 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-youtube',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      );
      $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inbox-fetch-instagram-30min') THEN
    PERFORM cron.schedule(
      'inbox-fetch-instagram-30min',
      '*/30 * * * *',
      $cron$
      SELECT net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/inbox-fetch-instagram',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:='{"cron":true}'::jsonb
      );
      $cron$
    );
  END IF;
END
$$;
