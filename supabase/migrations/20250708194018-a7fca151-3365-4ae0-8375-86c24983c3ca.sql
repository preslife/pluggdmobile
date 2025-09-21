-- Create user following system
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for user_follows
CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Create notifications table for real-time notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'new_post', 'collaboration_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create activity feed table for social feed
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'post', 'like', 'comment', 'follow', 'collaboration'
  entity_type TEXT NOT NULL, -- 'post', 'user', 'project', etc.
  entity_id UUID NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for activity feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Create policies for activity feed
CREATE POLICY "Users can view their feed" 
ON public.activity_feed 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create activity" 
ON public.activity_feed 
FOR INSERT 
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id, created_at DESC);

-- Function to create follow notification
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger for follow notifications
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_notification();

-- Function to create post activity for followers
CREATE OR REPLACE FUNCTION public.create_post_activity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger for post activity
CREATE TRIGGER trigger_post_activity
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_activity();