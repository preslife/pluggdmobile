-- Enable full replica identity so realtime sends complete rows
ALTER TABLE public.contest_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.contest_votes REPLICA IDENTITY FULL;

-- Add the tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_votes;