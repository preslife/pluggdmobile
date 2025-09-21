-- Fix critical RLS policy vulnerabilities with correct column names

-- contact_messages table - restrict to admins only (no user_id column, admin-only access)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all contact messages" 
ON public.contact_messages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- bookings table - restrict to booking participants and admins
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = client_user_id);

CREATE POLICY "Professionals can view their bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = professional_user_id);

CREATE POLICY "Clients can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Clients can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = client_user_id);

CREATE POLICY "Professionals can update their bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = professional_user_id);

CREATE POLICY "Admins can manage all bookings" 
ON public.bookings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- purchases table - restrict to buyer and admins
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" 
ON public.purchases 
FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can create their own purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "System can manage purchases" 
ON public.purchases 
FOR ALL 
USING (true);

CREATE POLICY "Admins can manage all purchases" 
ON public.purchases 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- orders table - restrict to order owner and admins
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- producer_payouts table - restrict to producer and admins
ALTER TABLE public.producer_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers can view their own payouts" 
ON public.producer_payouts 
FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "System can create producer payouts" 
ON public.producer_payouts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update producer payouts" 
ON public.producer_payouts 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage all producer payouts" 
ON public.producer_payouts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- producer_stripe_accounts table - restrict to account owner and admins
ALTER TABLE public.producer_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe account" 
ON public.producer_stripe_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stripe account" 
ON public.producer_stripe_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stripe account" 
ON public.producer_stripe_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can update stripe accounts" 
ON public.producer_stripe_accounts 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage all stripe accounts" 
ON public.producer_stripe_accounts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));