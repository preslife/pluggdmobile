-- Create function to increment user usage
CREATE OR REPLACE FUNCTION public.increment_user_usage(p_user_id UUID, p_usage_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Reset daily/monthly counters if needed
  UPDATE public.user_usage 
  SET 
    tool_usage_today = CASE 
      WHEN last_reset_date < CURRENT_DATE THEN 0 
      ELSE tool_usage_today 
    END,
    beats_uploaded_month = CASE 
      WHEN last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN 0 
      ELSE beats_uploaded_month 
    END,
    projects_posted_month = CASE 
      WHEN last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN 0 
      ELSE projects_posted_month 
    END,
    feedback_submissions_month = CASE 
      WHEN last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN 0 
      ELSE feedback_submissions_month 
    END,
    last_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id;
  
  -- Increment the specific usage type
  UPDATE public.user_usage 
  SET 
    tool_usage_today = CASE WHEN p_usage_type = 'tool_usage_today' THEN tool_usage_today + 1 ELSE tool_usage_today END,
    beats_uploaded_month = CASE WHEN p_usage_type = 'beats_uploaded_month' THEN beats_uploaded_month + 1 ELSE beats_uploaded_month END,
    projects_posted_month = CASE WHEN p_usage_type = 'projects_posted_month' THEN projects_posted_month + 1 ELSE projects_posted_month END,
    feedback_submissions_month = CASE WHEN p_usage_type = 'feedback_submissions_month' THEN feedback_submissions_month + 1 ELSE feedback_submissions_month END,
    active_courses = CASE WHEN p_usage_type = 'active_courses' THEN active_courses + 1 ELSE active_courses END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;