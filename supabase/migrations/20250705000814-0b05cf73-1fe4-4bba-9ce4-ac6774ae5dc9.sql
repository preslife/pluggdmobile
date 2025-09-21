-- Add featured_artist and download_url fields to releases table
ALTER TABLE public.releases 
ADD COLUMN featured_artist TEXT,
ADD COLUMN download_url TEXT,
ADD COLUMN download_price NUMERIC DEFAULT 0;

-- Create product_images table to support multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_options table for merchandise variants (sizes, colors, etc.)
CREATE TABLE public.product_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  option_type TEXT NOT NULL, -- 'size', 'color', etc.
  option_value TEXT NOT NULL,
  price_modifier NUMERIC DEFAULT 0, -- additional cost for this option
  stock_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images
CREATE POLICY "Product images are viewable by everyone" 
ON public.product_images 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage product images" 
ON public.product_images 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Create policies for product_options
CREATE POLICY "Product options are viewable by everyone" 
ON public.product_options 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage product options" 
ON public.product_options 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Create indexes for performance
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(display_order);
CREATE INDEX idx_product_options_product_id ON public.product_options(product_id);
CREATE INDEX idx_product_options_type ON public.product_options(option_type);