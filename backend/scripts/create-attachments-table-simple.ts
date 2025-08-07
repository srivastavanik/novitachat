#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureAttachmentsTable() {
  try {
    console.log('🔍 Checking if message_attachments table exists...');
    
    // Try to query the table to see if it exists
    const { data: existingTable, error: tableCheckError } = await supabase
      .from('message_attachments')
      .select('id')
      .limit(1);
    
    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      console.log('❌ message_attachments table does not exist');
      console.log('📝 Please run the following SQL manually in your Supabase SQL editor:');
      console.log(`
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments (message_id);

-- Add metadata column to messages table for search options
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);
      `);
      console.log('');
      console.log('💡 After running the SQL above, file uploads should work!');
      
    } else if (tableCheckError) {
      console.error('❌ Error checking table:', tableCheckError);
    } else {
      console.log('✅ message_attachments table already exists!');
      
      // Test the table by trying to insert and delete a dummy record
      console.log('🧪 Testing table functionality...');
      
      // Get a real message ID to test with
      const { data: testMessage } = await supabase
        .from('messages')
        .select('id')
        .limit(1)
        .single();
      
      if (testMessage) {
        const { data: testAttachment, error: insertError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: testMessage.id,
            filename: 'test.png',
            mime_type: 'image/png',
            size: 1024,
            type: 'image',
            data: 'test-base64-data'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Error testing attachment insert:', insertError);
        } else {
          console.log('✅ Test attachment insert successful!');
          
          // Clean up the test record
          const { error: deleteError } = await supabase
            .from('message_attachments')
            .delete()
            .eq('id', testAttachment.id);
          
          if (deleteError) {
            console.error('❌ Error cleaning up test attachment:', deleteError);
          } else {
            console.log('🧹 Test attachment cleaned up successfully!');
            console.log('🎉 File uploads should be working properly!');
          }
        }
      } else {
        console.log('⚠️  No messages found to test with, but table exists');
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

ensureAttachmentsTable();