-- Create subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'creator', 'pro');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' or 'annual'
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user usage tracking table
CREATE TABLE public.user_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_courses INTEGER DEFAULT 0,
  beats_uploaded_month INTEGER DEFAULT 0,
  projects_posted_month INTEGER DEFAULT 0,
  tool_usage_today INTEGER DEFAULT 0,
  feedback_submissions_month INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course pricing table for Pro-only courses and one-time purchases
CREATE TABLE public.course_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_pro_only BOOLEAN DEFAULT false,
  one_time_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

-- Create one-time course purchases table
CREATE TABLE public.course_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (true);

-- RLS Policies for user_usage
CREATE POLICY "Users can view their own usage" ON public.user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage" ON public.user_usage
  FOR ALL USING (true);

-- RLS Policies for course_pricing
CREATE POLICY "Course pricing is viewable by everyone" ON public.course_pricing
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage course pricing" ON public.course_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for course_purchases
CREATE POLICY "Users can view their own purchases" ON public.course_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON public.course_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage purchases" ON public.course_purchases
  FOR ALL USING (true);

-- Create function to initialize user subscription and usage
CREATE OR REPLACE FUNCTION public.initialize_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default subscription record
  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  
  -- Create default usage tracking record
  INSERT INTO public.user_usage (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize user tier on signup
CREATE TRIGGER on_auth_user_created_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_tier();

-- Create function to check user tier
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id UUID)
RETURNS subscription_tier AS $$
DECLARE
  user_tier subscription_tier;
BEGIN
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = $1
  AND status = 'active';
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has access to pro course
CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN AS $$
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
  WHERE course_pricing.course_id = p_course_id;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;