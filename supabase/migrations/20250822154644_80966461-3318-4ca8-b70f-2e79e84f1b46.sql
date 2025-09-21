-- Set up daily cron job to check for contest reminders
-- This will run every day at 9 AM UTC
SELECT cron.schedule(
  'send-contest-reminders-daily',
  '0 9 * * *', -- 9 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/send-contest-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);