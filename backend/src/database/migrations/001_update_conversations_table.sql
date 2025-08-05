-- Migration to update conversations table to match the model

-- Add missing columns
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Migrate status to is_archived
UPDATE conversations 
SET is_archived = true 
WHERE status = 'archived';

UPDATE conversations 
SET is_archived = false 
WHERE status = 'active';

-- Drop the old status column and enum type (optional - can keep for backwards compatibility)
-- ALTER TABLE conversations DROP COLUMN status;
-- DROP TYPE IF EXISTS conversation_status;

-- Create index on is_archived for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON conversations(is_archived);
