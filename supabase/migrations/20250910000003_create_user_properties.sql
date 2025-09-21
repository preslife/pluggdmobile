-- Create user_properties table for storing user analytics properties
CREATE TABLE IF NOT EXISTS public.user_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    properties JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_properties_user_id ON public.user_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_updated_at ON public.user_properties(updated_at DESC);

-- Create RLS policies
ALTER TABLE public.user_properties ENABLE ROW LEVEL SECURITY;

-- Users can manage their own properties
CREATE POLICY "Users can manage their own properties" ON public.user_properties
    FOR ALL USING (auth.uid() = user_id);

-- Admins can read all user properties
CREATE POLICY "Admins can read all user properties" ON public.user_properties
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH engagement_data AS (
        SELECT 
            COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as page_views,
            COUNT(CASE WHEN event_name = 'user_engagement' THEN 1 END) as interactions,
            EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as time_spent_minutes,
            ARRAY_AGG(DISTINCT 
                CASE WHEN event_name = 'feature_usage' 
                THEN properties->>'feature' 
                END
            ) FILTER (WHERE event_name = 'feature_usage') as features,
            MAX(created_at) as last_activity
        FROM analytics_events 
        WHERE analytics_events.user_id = get_user_engagement_metrics.user_id
        AND created_at >= NOW() - INTERVAL '30 days'
    )
    SELECT json_build_object(
        'pageViews', COALESCE(page_views, 0),
        'timeSpent', COALESCE(time_spent_minutes, 0),
        'interactions', COALESCE(interactions, 0),
        'features', COALESCE(features, ARRAY[]::text[]),
        'lastActivity', last_activity
    ) INTO result
    FROM engagement_data;
    
    RETURN result;
END;
$$;

-- Create function to get conversion funnel data
CREATE OR REPLACE FUNCTION get_conversion_funnel_data(funnel_name TEXT)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH funnel_stages AS (
        SELECT 
            properties->>'conversion_type' as stage,
            COUNT(*) as count,
            AVG(CASE WHEN properties->>'conversion_value' IS NOT NULL 
                THEN (properties->>'conversion_value')::NUMERIC 
                END) as avg_value
        FROM analytics_events 
        WHERE event_name = 'conversion'
        AND properties->>'funnel' = funnel_name
        AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY properties->>'conversion_type'
    ),
    funnel_with_rates AS (
        SELECT 
            stage,
            count,
            avg_value,
            LAG(count) OVER (ORDER BY stage) as prev_count,
            CASE 
                WHEN LAG(count) OVER (ORDER BY stage) > 0 
                THEN ROUND((count::NUMERIC / LAG(count) OVER (ORDER BY stage)) * 100, 2)
                ELSE 100.0
            END as conversion_rate
        FROM funnel_stages
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'funnelStage', stage,
            'conversionRate', COALESCE(conversion_rate, 0),
            'count', count,
            'avgValue', avg_value
        )
    ) INTO result
    FROM funnel_with_rates;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;