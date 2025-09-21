-- Increase file size limit to 100MB for all storage buckets
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB in bytes (100 * 1024 * 1024)
WHERE id IN ('audio-files', 'beat-artwork', 'project-files');