-- Create system_logs table for structured logging
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level INTEGER NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    component TEXT,
    action TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON public.system_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON public.system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action);

-- Create RLS policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own logs" ON public.system_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only allow admins to read logs (you may want to adjust this based on your needs)
CREATE POLICY "Admins can read all logs" ON public.system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow users to read their own logs
CREATE POLICY "Users can read their own logs" ON public.system_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Create a function to clean up old logs (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete logs older than 30 days, keeping only ERROR and CRITICAL logs older than 90 days
    DELETE FROM public.system_logs 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND level < 3; -- Keep ERROR (3) and CRITICAL (4) logs longer

    DELETE FROM public.system_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;