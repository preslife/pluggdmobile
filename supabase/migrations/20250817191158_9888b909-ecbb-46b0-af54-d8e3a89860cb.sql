-- Add missing fields to session_rooms table
ALTER TABLE session_rooms 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;