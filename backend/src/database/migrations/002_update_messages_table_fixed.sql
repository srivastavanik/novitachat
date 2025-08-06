-- Migration to update messages table to match the model

-- Add missing columns only if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_error BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_streaming BOOLEAN DEFAULT false;

-- Handle token count column - check if tokens_used exists and token_count doesn't
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'messages' AND column_name = 'tokens_used')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'messages' AND column_name = 'token_count') THEN
        ALTER TABLE messages RENAME COLUMN tokens_used TO token_count;
    END IF;
END $$;

-- Add token_count if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_error ON messages(is_error);
CREATE INDEX IF NOT EXISTS idx_messages_is_streaming ON messages(is_streaming);
