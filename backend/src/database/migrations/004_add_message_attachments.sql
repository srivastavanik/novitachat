-- Migration: Add support for message attachments
-- Created: 2025-01-14

-- Create attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'image' or 'document'
  url TEXT, -- URL if stored externally
  data TEXT, -- Base64 data if stored inline
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_message_attachments_message_id (message_id)
);

-- Add metadata column to messages table for search options
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);

-- Comments
COMMENT ON COLUMN message_attachments.type IS 'Type of attachment: image or document';
COMMENT ON COLUMN message_attachments.url IS 'External URL if attachment is stored in cloud storage';
COMMENT ON COLUMN message_attachments.data IS 'Base64 encoded data if stored inline (for small files)';
COMMENT ON COLUMN messages.metadata IS 'Additional message metadata including search options, attachments info, etc.';
