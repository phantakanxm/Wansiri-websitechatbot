-- Migration: Add normalized_query column to cache table for fuzzy matching
-- Run this in your Supabase SQL Editor

-- Add normalized_query column if not exists
ALTER TABLE cache 
ADD COLUMN IF NOT EXISTS normalized_query TEXT;

-- Create index for faster fuzzy matching
CREATE INDEX IF NOT EXISTS idx_cache_normalized_query 
ON cache(normalized_query);

-- Create index for cache_type + expires_at queries
CREATE INDEX IF NOT EXISTS idx_cache_type_expires 
ON cache(cache_type, expires_at);

-- Update existing rows to have normalized_query
UPDATE cache 
SET normalized_query = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(cache_key, '^file_search:', ''), '[\u0E48\u0E49\u0E4A\u0E4B]', '', 'g'))
WHERE cache_type = 'file_search' AND normalized_query IS NULL;

-- Verify
SELECT cache_type, COUNT(*) as count FROM cache GROUP BY cache_type;
