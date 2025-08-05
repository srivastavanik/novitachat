-- Migration: Update conversations to have default max_tokens
-- This ensures all existing conversations have proper token limits

-- Update all conversations with null max_tokens to use 2048 as default
UPDATE conversations 
SET max_tokens = 2048 
WHERE max_tokens IS NULL;

-- Update timestamp
UPDATE conversations 
SET updated_at = CURRENT_TIMESTAMP 
WHERE max_tokens = 2048;
