-- Increase file size limit to 150MB to account for potential overhead
UPDATE storage.buckets 
SET file_size_limit = 157286400 -- 150MB in bytes (150 * 1024 * 1024)
WHERE id = 'audio-files';