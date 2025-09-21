-- Phase 3 / Stage 5: Final Polish Database Extensions

-- A) Extend existing tables for PDF receipts and licenses
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS license_pdf_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS license_pdf_url TEXT;
ALTER TABLE public.release_purchases ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;

-- C) Extend profiles for creator verification (reuse existing table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;

-- D) Create API tokens table for developer keys (only if no suitable table exists)
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_tokens
CREATE POLICY "Users can view their own API tokens" ON public.api_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API tokens" ON public.api_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API tokens" ON public.api_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API tokens" ON public.api_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Create receipts storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Create verification storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('verification', 'verification', false);

-- Storage policies for receipts bucket
CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "System can manage receipts" ON storage.objects
  FOR ALL USING (bucket_id = 'receipts');

-- Storage policies for verification bucket  
CREATE POLICY "Users can upload verification documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own verification documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'verification' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role
  ));