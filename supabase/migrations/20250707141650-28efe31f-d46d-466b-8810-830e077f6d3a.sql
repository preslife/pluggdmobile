-- Update the sync function to put releases under 'software' (music) category instead of 'digital_download'
CREATE OR REPLACE FUNCTION public.sync_release_to_store()
 RETURNS trigger
 LANGUAGE plpgsql
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