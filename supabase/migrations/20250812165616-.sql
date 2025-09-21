-- Harden functions by pinning search_path to public to satisfy security linter
-- NOTE: Logic unchanged; only SET search_path added.

CREATE OR REPLACE FUNCTION public.initialize_user_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Create default subscription record
  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  
  -- Create default usage tracking record
  INSERT INTO public.user_usage (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_follow_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Create notification for the user being followed
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    'Someone started following you',
    jsonb_build_object('follower_id', NEW.follower_id)
  );

  -- Create activity feed entry for followers of the person who followed
  INSERT INTO public.activity_feed (user_id, actor_id, type, entity_type, entity_id, data)
  SELECT 
    uf.follower_id,
    NEW.follower_id,
    'follow',
    'user',
    NEW.following_id,
    jsonb_build_object('following_id', NEW.following_id)
  FROM public.user_follows uf
  WHERE uf.following_id = NEW.follower_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_tier(user_id uuid)
 RETURNS subscription_tier
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_tier subscription_tier;
BEGIN
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE public.user_subscriptions.user_id = $1
  AND status = 'active';
  
  RETURN COALESCE(user_tier, 'free');
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_post_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Create activity feed entries for all followers when someone posts
  INSERT INTO public.activity_feed (user_id, actor_id, type, entity_type, entity_id, data)
  SELECT 
    uf.follower_id,
    NEW.user_id,
    'post',
    'post',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'type', NEW.type)
  FROM public.user_follows uf
  WHERE uf.following_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id uuid, p_course_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_tier subscription_tier;
  is_pro_only BOOLEAN;
  has_purchased BOOLEAN;
BEGIN
  -- Get user tier
  SELECT public.get_user_tier(p_user_id) INTO user_tier;
  
  -- Check if course is pro-only
  SELECT COALESCE(course_pricing.is_pro_only, false) INTO is_pro_only
  FROM public.course_pricing
  WHERE public.course_pricing.course_id = p_course_id;
  
  -- If not pro-only, everyone has access
  IF NOT is_pro_only THEN
    RETURN true;
  END IF;
  
  -- If pro-only and user is pro, they have access
  IF user_tier = 'pro' THEN
    RETURN true;
  END IF;
  
  -- Check if user purchased this course individually
  SELECT EXISTS (
    SELECT 1 FROM public.course_purchases
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO has_purchased;
  
  RETURN has_purchased;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_tier_limits(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_tier subscription_tier;
  tier_limits jsonb;
BEGIN
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE public.user_subscriptions.user_id = $1
  AND status = 'active';
  
  user_tier := COALESCE(user_tier, 'free');
  
  tier_limits := CASE user_tier
    WHEN 'free' THEN jsonb_build_object(
      'beats_upload_limit', 10,
      'commission_rate', 15.00,
      'tier_name', 'FREE'
    )
    WHEN 'creator' THEN jsonb_build_object(
      'beats_upload_limit', 100, 
      'commission_rate', 10.00,
      'tier_name', 'PRO'
    )
    WHEN 'pro' THEN jsonb_build_object(
      'beats_upload_limit', -1,
      'commission_rate', 5.00,
      'tier_name', 'PREMIUM'
    )
    ELSE jsonb_build_object(
      'beats_upload_limit', 10,
      'commission_rate', 15.00,
      'tier_name', 'FREE'
    )
  END;
  
  RETURN tier_limits;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_release_to_store()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- If release has download_url, create/update store product
  IF NEW.download_url IS NOT NULL AND NEW.download_url != '' THEN
    INSERT INTO store_products (
      id,
      title,
      description,
      price,
      product_type,
      image_url,
      download_url,
      is_active,
      tags,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.title || ' - ' || NEW.artist,
      COALESCE(NEW.description, 'Digital release by ' || NEW.artist),
      COALESCE(NEW.download_price, 0),
      'software', -- Changed from 'digital_download' to 'software' for music
      NEW.cover_art_url,
      NEW.download_url,
      true,
      ARRAY[NEW.genre, 'release', 'music']::text[], -- Updated tags
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = NEW.title || ' - ' || NEW.artist,
      description = COALESCE(NEW.description, 'Digital release by ' || NEW.artist),
      price = COALESCE(NEW.download_price, 0),
      image_url = NEW.cover_art_url,
      download_url = NEW.download_url,
      product_type = 'software', -- Ensure it stays as software
      tags = ARRAY[NEW.genre, 'release', 'music']::text[],
      updated_at = NEW.updated_at;
  ELSE
    -- If download_url is removed, remove from store
    DELETE FROM store_products WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Update stats when beats are uploaded
  IF TG_TABLE_NAME = 'beats' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_stats (user_id, beats_uploaded)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_uploaded = user_stats.beats_uploaded + 1,
      total_points = user_stats.total_points + 10,
      updated_at = now();
  END IF;

  -- Update stats when purchases are made
  IF TG_TABLE_NAME = 'purchases' AND TG_OP = 'INSERT' THEN
    -- Update buyer stats
    INSERT INTO public.user_stats (user_id, beats_purchased)
    VALUES (NEW.buyer_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_purchased = user_stats.beats_purchased + 1,
      total_points = user_stats.total_points + 5,
      updated_at = now();
      
    -- Update seller stats
    INSERT INTO public.user_stats (user_id, beats_sold)
    SELECT NEW.user_id, 1
    FROM public.beats 
    WHERE id = NEW.beat_id
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_sold = user_stats.beats_sold + 1,
      total_points = user_stats.total_points + 15,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_course_certificate(p_course_id uuid, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  certificate_id UUID;
  course_title TEXT;
  user_name TEXT;
BEGIN
  -- Get course and user details
  SELECT title INTO course_title FROM public.courses WHERE id = p_course_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE user_id = p_user_id;
  
  -- Create certificate record
  INSERT INTO public.course_certificates (course_id, user_id, certificate_data)
  VALUES (
    p_course_id, 
    p_user_id,
    jsonb_build_object(
      'course_title', course_title,
      'user_name', COALESCE(user_name, 'Student'),
      'completion_date', now()
    )
  )
  ON CONFLICT (course_id, user_id) 
  DO UPDATE SET 
    issued_at = now(),
    certificate_data = jsonb_build_object(
      'course_title', course_title,
      'user_name', COALESCE(user_name, 'Student'),
      'completion_date', now()
    )
  RETURNING id INTO certificate_id;
  
  RETURN certificate_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_user_usage(p_user_id uuid, p_usage_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;