-- Fix function security warning by adding search_path to all functions that don't have it

-- Update functions to include proper search_path parameter
CREATE OR REPLACE FUNCTION public.update_submission_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_submissions 
    SET votes_count = votes_count + 1 
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_submissions 
    SET votes_count = votes_count - 1 
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.create_post_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.sync_release_to_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'software',
      NEW.cover_art_url,
      NEW.download_url,
      true,
      ARRAY[NEW.genre, 'release', 'music']::text[],
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = NEW.title || ' - ' || NEW.artist,
      description = COALESCE(NEW.description, 'Digital release by ' || NEW.artist),
      price = COALESCE(NEW.download_price, 0),
      image_url = NEW.cover_art_url,
      download_url = NEW.download_url,
      product_type = 'software',
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
SECURITY DEFINER
SET search_path TO 'public'
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