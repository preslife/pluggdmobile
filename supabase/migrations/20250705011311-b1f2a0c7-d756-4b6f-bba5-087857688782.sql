-- Create function to sync releases to store products
CREATE OR REPLACE FUNCTION sync_release_to_store()
RETURNS TRIGGER AS $$
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
      'digital_download',
      NEW.cover_art_url,
      NEW.download_url,
      true,
      ARRAY[NEW.genre, 'release', 'digital']::text[],
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = NEW.title || ' - ' || NEW.artist,
      description = COALESCE(NEW.description, 'Digital release by ' || NEW.artist),
      price = COALESCE(NEW.download_price, 0),
      image_url = NEW.cover_art_url,
      download_url = NEW.download_url,
      tags = ARRAY[NEW.genre, 'release', 'digital']::text[],
      updated_at = NEW.updated_at;
  ELSE
    -- If download_url is removed, remove from store
    DELETE FROM store_products WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on releases table
DROP TRIGGER IF EXISTS sync_release_to_store_trigger ON releases;
CREATE TRIGGER sync_release_to_store_trigger
  AFTER INSERT OR UPDATE ON releases
  FOR EACH ROW
  EXECUTE FUNCTION sync_release_to_store();

-- Sync existing releases with download URLs
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
SELECT 
  id,
  title || ' - ' || artist,
  COALESCE(description, 'Digital release by ' || artist),
  COALESCE(download_price, 0),
  'digital_download',
  cover_art_url,
  download_url,
  true,
  ARRAY[genre, 'release', 'digital']::text[],
  created_at,
  updated_at
FROM releases 
WHERE download_url IS NOT NULL AND download_url != ''
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  download_url = EXCLUDED.download_url,
  tags = EXCLUDED.tags,
  updated_at = EXCLUDED.updated_at;