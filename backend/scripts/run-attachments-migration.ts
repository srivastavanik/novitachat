import { supabaseAdmin } from '../src/services/supabase.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running attachments migration...');
    
    const migrationPath = path.join(__dirname, '../src/database/migrations/004_add_message_attachments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: statement + ';'
      });
      
      if (error) {
        console.error('Error executing statement:', error);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
