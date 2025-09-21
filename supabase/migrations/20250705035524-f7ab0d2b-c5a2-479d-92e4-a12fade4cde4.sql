-- Update storage bucket configuration to allow larger files
UPDATE storage.buckets 
SET file_size_limit = 83886080 -- 80MB in bytes (80 * 1024 * 1024)
WHERE id = 'audio-files';

-- Also update beat-artwork bucket for consistency  
UPDATE storage.buckets 
SET file_size_limit = 83886080 -- 80MB in bytes
WHERE id = 'beat-artwork';

-- Update project-files bucket as well
UPDATE storage.buckets 
SET file_size_limit = 83886080 -- 80MB in bytes  
WHERE id = 'project-files';