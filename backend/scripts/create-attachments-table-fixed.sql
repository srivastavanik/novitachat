-- Create message attachments table for file uploads
-- This is a corrected version that will work with Supabase

CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'image' or 'document'
    url TEXT, -- URL if stored externally
    data TEXT, -- Base64 data if stored inline
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- Add metadata column to messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'metadata') THEN
        ALTER TABLE messages ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);

-- Set up RLS (Row Level Security) policies for attachments
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access attachments from their own messages
CREATE POLICY IF NOT EXISTS "Users can access own attachments" ON message_attachments
    FOR ALL USING (
        message_id IN (
            SELECT id FROM messages 
            WHERE user_id = auth.uid()
        )
    );