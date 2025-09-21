-- Add missing fields to order_items table for tips and creator tracking
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id);

-- Add bundle support to store_products
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS bundle BOOLEAN DEFAULT false;

-- Create store_product_items mapping table for bundles
CREATE TABLE IF NOT EXISTS public.store_product_items (
  bundle_product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('beat', 'release', 'pack')),
  item_id UUID NOT NULL,
  qty INTEGER DEFAULT 1,
  PRIMARY KEY(bundle_product_id, item_type, item_id)
);

-- Enable RLS on the new table
ALTER TABLE public.store_product_items ENABLE ROW LEVEL SECURITY;

-- Create policies for store_product_items
CREATE POLICY "Bundle items are viewable by everyone" 
ON public.store_product_items 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage bundle items" 
ON public.store_product_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::user_role
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_product_items_bundle_id ON public.store_product_items(bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_items_item ON public.store_product_items(item_type, item_id);