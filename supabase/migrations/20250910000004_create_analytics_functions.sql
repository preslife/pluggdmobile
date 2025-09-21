-- Analytics SQL functions for the dashboard

-- Function to get analytics overview
CREATE OR REPLACE FUNCTION get_analytics_overview(start_date DATE, end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH user_metrics AS (
        SELECT 
            COUNT(DISTINCT user_id) as total_users,
            COUNT(DISTINCT CASE 
                WHEN created_at >= NOW() - INTERVAL '7 days' 
                THEN user_id END) as active_users
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
    ),
    page_metrics AS (
        SELECT 
            COUNT(*) as page_views,
            AVG(CASE 
                WHEN event_name = 'session_duration' 
                THEN (properties->>'duration_ms')::NUMERIC / 1000 
                END) as avg_session_duration
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
    ),
    conversion_metrics AS (
        SELECT 
            COUNT(CASE WHEN event_name = 'conversion' THEN 1 END)::FLOAT / 
            NULLIF(COUNT(DISTINCT user_id)::FLOAT, 0) * 100 as conversion_rate
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
    ),
    bounce_metrics AS (
        SELECT 
            COUNT(CASE WHEN session_pages = 1 THEN 1 END)::FLOAT / 
            NULLIF(COUNT(*)::FLOAT, 0) * 100 as bounce_rate
        FROM (
            SELECT 
                properties->>'session_id' as session_id,
                COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as session_pages
            FROM analytics_events 
            WHERE DATE(created_at) BETWEEN start_date AND end_date
            AND properties->>'session_id' IS NOT NULL
            GROUP BY properties->>'session_id'
        ) sessions
    )
    SELECT json_build_object(
        'totalUsers', COALESCE(um.total_users, 0),
        'activeUsers', COALESCE(um.active_users, 0),
        'pageViews', COALESCE(pm.page_views, 0),
        'averageSessionDuration', COALESCE(pm.avg_session_duration, 0),
        'bounceRate', COALESCE(bm.bounce_rate, 0),
        'conversionRate', COALESCE(cm.conversion_rate, 0)
    ) INTO result
    FROM user_metrics um, page_metrics pm, conversion_metrics cm, bounce_metrics bm;
    
    RETURN result;
END;
$$;

-- Function to get user engagement trends
CREATE OR REPLACE FUNCTION get_user_engagement_trends(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH daily_metrics AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT properties->>'session_id') as sessions,
            COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as page_views,
            AVG(CASE 
                WHEN event_name = 'session_duration' 
                THEN (properties->>'duration_ms')::NUMERIC / 1000 
                END) as avg_duration
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
        ORDER BY date
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'date', TO_CHAR(date, 'YYYY-MM-DD'),
            'users', COALESCE(users, 0),
            'sessions', COALESCE(sessions, 0),
            'pageViews', COALESCE(page_views, 0),
            'avgDuration', COALESCE(avg_duration, 0)
        )
    ) INTO result
    FROM daily_metrics;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH daily_performance AS (
        SELECT 
            DATE(timestamp) as date,
            AVG(CASE WHEN metric_name = 'CLS' THEN metric_value END) as cls,
            AVG(CASE WHEN metric_name = 'FID' THEN metric_value END) as fid,
            AVG(CASE WHEN metric_name = 'LCP' THEN metric_value END) as lcp,
            AVG(CASE 
                WHEN rating = 'good' THEN 100
                WHEN rating = 'needs-improvement' THEN 60
                WHEN rating = 'poor' THEN 20
                ELSE 0
            END) as score
        FROM performance_metrics 
        WHERE DATE(timestamp) BETWEEN start_date AND end_date
        GROUP BY DATE(timestamp)
        ORDER BY date
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'date', TO_CHAR(date, 'YYYY-MM-DD'),
            'cls', COALESCE(cls, 0),
            'fid', COALESCE(fid, 0),
            'lcp', COALESCE(lcp, 0),
            'score', COALESCE(score, 0)
        )
    ) INTO result
    FROM daily_performance;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get error metrics
CREATE OR REPLACE FUNCTION get_error_metrics(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH daily_errors AS (
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as errors,
            COUNT(*) * 100.0 / NULLIF(
                (SELECT COUNT(*) FROM analytics_events 
                 WHERE DATE(created_at) = DATE(system_logs.timestamp)), 0
            ) as error_rate,
            COUNT(CASE WHEN level >= 4 THEN 1 END) as critical_errors
        FROM system_logs 
        WHERE DATE(timestamp) BETWEEN start_date AND end_date
        AND level >= 2  -- WARN level and above
        GROUP BY DATE(timestamp)
        ORDER BY date
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'date', TO_CHAR(date, 'YYYY-MM-DD'),
            'errors', COALESCE(errors, 0),
            'errorRate', COALESCE(error_rate, 0),
            'criticalErrors', COALESCE(critical_errors, 0)
        )
    ) INTO result
    FROM daily_errors;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get top pages
CREATE OR REPLACE FUNCTION get_top_pages(start_date DATE, end_date DATE, limit_count INTEGER DEFAULT 10)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH page_metrics AS (
        SELECT 
            properties->>'url' as page,
            COUNT(*) as views,
            COUNT(DISTINCT user_id) as unique_views,
            AVG(CASE 
                WHEN event_name = 'session_duration' 
                THEN (properties->>'duration_ms')::NUMERIC / 1000 
                END) as avg_duration,
            COUNT(CASE WHEN session_pages = 1 THEN 1 END) * 100.0 / COUNT(*) as bounce_rate
        FROM analytics_events ae
        LEFT JOIN (
            SELECT 
                properties->>'session_id' as session_id,
                COUNT(*) as session_pages
            FROM analytics_events 
            WHERE event_name = 'page_view'
            AND DATE(created_at) BETWEEN start_date AND end_date
            GROUP BY properties->>'session_id'
        ) sp ON ae.properties->>'session_id' = sp.session_id
        WHERE event_name = 'page_view'
        AND DATE(ae.created_at) BETWEEN start_date AND end_date
        AND properties->>'url' IS NOT NULL
        GROUP BY properties->>'url'
        ORDER BY views DESC
        LIMIT limit_count
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'page', page,
            'views', views,
            'uniqueViews', unique_views,
            'avgDuration', COALESCE(avg_duration, 0),
            'bounceRate', COALESCE(bounce_rate, 0)
        )
    ) INTO result
    FROM page_metrics;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get device stats
CREATE OR REPLACE FUNCTION get_device_stats(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH device_analysis AS (
        SELECT 
            CASE 
                WHEN properties->>'userAgent' ILIKE '%mobile%' THEN 'Mobile'
                WHEN properties->>'userAgent' ILIKE '%tablet%' THEN 'Tablet'
                ELSE 'Desktop'
            END as device,
            COUNT(DISTINCT user_id) as count
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        AND properties->>'userAgent' IS NOT NULL
        GROUP BY device
    ),
    device_with_percentage AS (
        SELECT 
            device,
            count,
            ROUND(count * 100.0 / SUM(count) OVER (), 1) as percentage
        FROM device_analysis
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'device', device,
            'count', count,
            'percentage', percentage
        )
    ) INTO result
    FROM device_with_percentage
    ORDER BY count DESC;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get geographic stats
CREATE OR REPLACE FUNCTION get_geographic_stats(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    -- This is a simplified version - in production you'd use IP geolocation
    WITH country_stats AS (
        SELECT 
            COALESCE(properties->>'country', 'Unknown') as country,
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT properties->>'session_id') as sessions
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY country
        ORDER BY users DESC
        LIMIT 20
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'country', country,
            'users', users,
            'sessions', sessions
        )
    ) INTO result
    FROM country_stats;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;

-- Function to get conversion funnel
CREATE OR REPLACE FUNCTION get_conversion_funnel(start_date DATE, end_date DATE)
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON[];
BEGIN
    WITH funnel_stages AS (
        SELECT 
            CASE 
                WHEN event_name = 'page_view' THEN 'Landing'
                WHEN event_name = 'user_engagement' THEN 'Engagement'
                WHEN event_name = 'feature_usage' THEN 'Feature Usage'
                WHEN event_name = 'conversion' THEN 'Conversion'
                ELSE 'Other'
            END as stage,
            COUNT(DISTINCT user_id) as users
        FROM analytics_events 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        AND event_name IN ('page_view', 'user_engagement', 'feature_usage', 'conversion')
        GROUP BY stage
    ),
    funnel_with_rates AS (
        SELECT 
            stage,
            users,
            CASE 
                WHEN LAG(users) OVER (ORDER BY 
                    CASE stage 
                        WHEN 'Landing' THEN 1 
                        WHEN 'Engagement' THEN 2 
                        WHEN 'Feature Usage' THEN 3 
                        WHEN 'Conversion' THEN 4 
                    END) > 0
                THEN ROUND(
                    users * 100.0 / LAG(users) OVER (ORDER BY 
                        CASE stage 
                            WHEN 'Landing' THEN 1 
                            WHEN 'Engagement' THEN 2 
                            WHEN 'Feature Usage' THEN 3 
                            WHEN 'Conversion' THEN 4 
                        END), 1)
                ELSE 100.0
            END as conversion_rate
        FROM funnel_stages
        WHERE stage != 'Other'
    )
    SELECT ARRAY_AGG(
        json_build_object(
            'stage', stage,
            'users', users,
            'conversionRate', conversion_rate
        ) ORDER BY 
            CASE stage 
                WHEN 'Landing' THEN 1 
                WHEN 'Engagement' THEN 2 
                WHEN 'Feature Usage' THEN 3 
                WHEN 'Conversion' THEN 4 
            END
    ) INTO result
    FROM funnel_with_rates;
    
    RETURN COALESCE(result, ARRAY[]::JSON[]);
END;
$$;