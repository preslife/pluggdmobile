-- Add Mailchimp integration fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN mailchimp_list_id TEXT,
ADD COLUMN mailchimp_status TEXT DEFAULT 'disconnected' CHECK (mailchimp_status IN ('disconnected', 'connected', 'error')),
ADD COLUMN mailchimp_auto_sync BOOLEAN DEFAULT false;

-- Add Discord integration fields to profiles  
ALTER TABLE public.profiles
ADD COLUMN discord_guild_id TEXT,
ADD COLUMN discord_role_map JSONB DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX idx_profiles_mailchimp_auto_sync ON public.profiles(mailchimp_auto_sync) WHERE mailchimp_auto_sync = true;
CREATE INDEX idx_profiles_discord_guild ON public.profiles(discord_guild_id) WHERE discord_guild_id IS NOT NULL;