-- Create performance_metrics table for Web Vitals and custom performance data
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
    delta NUMERIC,
    metric_id TEXT,
    navigation_type TEXT,
    url TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON public.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_rating ON public.performance_metrics(rating);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON public.performance_metrics(url);

-- Create composite index for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_name_time ON public.performance_metrics(user_id, metric_name, timestamp DESC);

-- Create RLS policies
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own performance metrics
CREATE POLICY "Users can insert their own performance metrics" ON public.performance_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow admins to read all performance metrics
CREATE POLICY "Admins can read all performance metrics" ON public.performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow users to read their own performance metrics
CREATE POLICY "Users can read their own performance metrics" ON public.performance_metrics
    FOR SELECT USING (auth.uid() = user_id);

-- Create a view for aggregated performance metrics
CREATE OR REPLACE VIEW performance_metrics_summary AS
SELECT 
    metric_name,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_measurements,
    AVG(metric_value) as avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
    COUNT(CASE WHEN rating = 'good' THEN 1 END) as good_count,
    COUNT(CASE WHEN rating = 'needs-improvement' THEN 1 END) as needs_improvement_count,
    COUNT(CASE WHEN rating = 'poor' THEN 1 END) as poor_count,
    (COUNT(CASE WHEN rating = 'good' THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100) as good_percentage
FROM public.performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY metric_name, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC, metric_name;

-- Create function to clean up old performance metrics
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete performance metrics older than 30 days
    DELETE FROM public.performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant permissions for the view
GRANT SELECT ON performance_metrics_summary TO authenticated;