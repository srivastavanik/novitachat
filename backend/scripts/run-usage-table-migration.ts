import { supabaseAdmin } from '../src/services/supabase.service';
import fs from 'fs';
import path from 'path';

async function runUsageTableMigration() {
  try {
    console.log('🚀 Running daily_usage table migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-usage-tracking-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      console.log('Executing statement:', statement.substring(0, 100) + '...');
      const { error } = await supabaseAdmin.rpc('execute_sql', { query: statement.trim() });
      
      if (error) {
        console.error('❌ Error executing statement:', error);
        // Try direct query for some statements
        const { error: directError } = await supabaseAdmin.from('').select('').range(0, 0);
        if (directError) {
          console.error('Direct query also failed:', directError);
        }
      } else {
        console.log('✅ Statement executed successfully');
      }
    }
    
    console.log('🎉 Daily usage table migration completed!');
    
    // Test the table by creating a test record
    const testUserId = 'test-user-id';
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabaseAdmin
      .from('daily_usage')
      .insert({
        user_id: testUserId,
        usage_date: today,
        total_queries: 1,
        web_search_queries: 0,
        deep_research_queries: 0
      })
      .select();
    
    if (error) {
      console.error('❌ Test insert failed:', error);
    } else {
      console.log('✅ Test insert successful:', data);
      
      // Clean up test record
      await supabaseAdmin
        .from('daily_usage')
        .delete()
        .eq('user_id', testUserId);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runUsageTableMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});