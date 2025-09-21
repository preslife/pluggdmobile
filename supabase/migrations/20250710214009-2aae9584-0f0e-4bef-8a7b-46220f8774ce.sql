-- Clean up duplicate user_usage records, keeping only the most recent one
WITH ranked_usage AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM public.user_usage
)
DELETE FROM public.user_usage
WHERE (user_id, created_at) IN (
  SELECT user_id, created_at
  FROM ranked_usage
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.user_usage 
ADD CONSTRAINT user_usage_user_id_unique UNIQUE (user_id);