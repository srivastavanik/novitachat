import { supabaseAdmin } from '../src/services/supabase.service';

async function createAttachmentsTable() {
  try {
    console.log('Creating attachments table...');
    
    // Create the table using Supabase's direct query method
    // Since we can't use exec_sql, we'll need to create tables via the Supabase dashboard
    // For now, let's verify if the table already exists
    
    const { data, error } = await supabaseAdmin
      .from('message_attachments')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('Table does not exist. Please create it via Supabase dashboard with this SQL:');
      console.log(`
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  url TEXT,
  data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- Also add metadata column to messages if not exists
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);
      `);
    } else if (!error) {
      console.log('Attachments table already exists!');
    } else {
      console.error('Error checking table:', error);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

createAttachmentsTable();
