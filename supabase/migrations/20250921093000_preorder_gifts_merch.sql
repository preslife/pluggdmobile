-- Allow multiple purchases (gifts, preorders) per user/release
ALTER TABLE public.release_purchases DROP CONSTRAINT IF EXISTS release_purchases_user_id_release_id_key;

ALTER TABLE public.release_purchases
  ADD COLUMN IF NOT EXISTS purchaser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.release_purchases
SET purchaser_id = COALESCE(purchaser_id, user_id)
WHERE purchaser_id IS NULL;

-- Add preorder and gifting metadata to releases
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS preorder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preorder_inventory INTEGER,
  ADD COLUMN IF NOT EXISTS allow_gifting BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_message_template TEXT;

-- Track preorder / gift metadata on release purchases
ALTER TABLE public.release_purchases
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS gift_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS gift_message TEXT,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;

-- Store uploaded split sheets & agreements per release
CREATE TABLE IF NOT EXISTS public.release_split_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.release_split_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Release owners manage split docs"
  ON public.release_split_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.releases r
      WHERE r.id = release_split_documents.release_id
      AND (
        r.user_id = auth.uid()
        OR r.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.releases r
      WHERE r.id = release_split_documents.release_id
      AND (
        r.user_id = auth.uid()
        OR r.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Collaborators can view split docs"
  ON public.release_split_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.collaborators rc
      WHERE rc.release_id = release_split_documents.release_id
      AND rc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Gift fulfilment queue
CREATE TABLE IF NOT EXISTS public.release_gift_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.release_purchases(id) ON DELETE SET NULL,
  purchaser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  gift_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'delivered', 'failed')),
  deliver_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.release_gift_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasers manage their gifts"
  ON public.release_gift_queue
  FOR ALL
  USING (purchaser_id = auth.uid())
  WITH CHECK (purchaser_id = auth.uid());

CREATE POLICY "Release owners view gift queue"
  ON public.release_gift_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.releases r
      WHERE r.id = release_gift_queue.release_id
      AND (
        r.user_id = auth.uid()
        OR r.owner_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Merch variants & inventory
CREATE TABLE IF NOT EXISTS public.merch_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  option_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  barcode TEXT,
  price_override_cents INTEGER,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, sku)
);

CREATE TABLE IF NOT EXISTS public.merch_inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.merch_variants(id) ON DELETE CASCADE,
  quantity_delta INTEGER NOT NULL,
  reason TEXT,
  reference TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merch_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage merch variants"
  ON public.merch_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage merch inventory adjustments"
  ON public.merch_inventory_adjustments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add helper trigger to keep merch_variants.updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_merch_variant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS merch_variants_set_updated_at ON public.merch_variants;
CREATE TRIGGER merch_variants_set_updated_at
  BEFORE UPDATE ON public.merch_variants
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_merch_variant_updated_at();
