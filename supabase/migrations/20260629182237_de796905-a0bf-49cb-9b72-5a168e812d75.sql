
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'steadfast-status-sync') THEN
    PERFORM cron.unschedule('steadfast-status-sync');
  END IF;
END $$;

SELECT cron.schedule(
  'steadfast-status-sync',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--nncupkjvywrrcrbasqcx.lovable.app/api/public/steadfast/sync',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uY3Vwa2p2eXdycmNyYmFzcWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTQxODIsImV4cCI6MjA5NTQ3MDE4Mn0.ADMAHfassMeA22Bxq1bw0OxCsRi6Pi3KY5iMzjequnY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
