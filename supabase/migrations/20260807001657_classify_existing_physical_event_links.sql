-- Existing imported event listings predate the hybrid-commerce classification
-- column. Mark only future, location-backed, HTTPS ticket listings without any
-- in-app stream or replay as physical. New events remain unclassified until the
-- trusted ingestion/admin path assigns a classification; organisers cannot set
-- this value from the mobile client.
update public.events
set commerce_classification = 'physical',
    updated_at = now()
where coalesce(commerce_classification, 'unclassified') = 'unclassified'
  and starts_at >= now() - interval '1 day'
  and ticket_url ~* '^https://[^[:space:]]+$'
  and nullif(btrim(location), '') is not null
  and coalesce(location, '') !~* '(online|virtual|zoom|webinar|live[ -]?stream)'
  and stream_url is null
  and playback_url is null;
