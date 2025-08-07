#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAttachmentMigration() {
  try {
    console.log('🚀 Running message attachments migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/database/migrations/004_add_message_attachments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📋 SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    // Verify the table exists
    console.log('🔍 Verifying message_attachments table...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'message_attachments');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else if (tables && tables.length > 0) {
      console.log('✅ message_attachments table exists!');
      
      // Test inserting a dummy attachment
      console.log('🧪 Testing attachment insertion...');
      const { data: testMessage } = await supabase
        .from('messages')
        .select('id')
        .limit(1)
        .single();
      
      if (testMessage) {
        const { data: testAttachment, error: testError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: testMessage.id,
            filename: 'test.png',
            mime_type: 'image/png',
            size: 1024,
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          })
          .select()
          .single();
        
        if (testError) {
          console.error('❌ Error testing attachment:', testError);
        } else {
          console.log('✅ Test attachment created successfully!');
          
          // Clean up test attachment
          await supabase
            .from('message_attachments')
            .delete()
            .eq('id', testAttachment.id);
          console.log('🧹 Test attachment cleaned up');
        }
      }
    } else {
      console.log('❌ message_attachments table does not exist');
    }
    
    console.log('🎉 Migration check completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

runAttachmentMigration();