import { supabaseAdmin } from '../src/services/supabase.service';

async function createUsageTable() {
  try {
    console.log('🚀 Creating daily_usage table...');
    
    // Try to insert a test record to see if table exists
    const testResult = await supabaseAdmin
      .from('daily_usage')
      .select('id')
      .limit(1);
    
    if (testResult.error) {
      console.log('Table does not exist, need to create it manually in Supabase dashboard');
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    web_search_queries INTEGER DEFAULT 0,
    deep_research_queries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, usage_date)
);

CREATE INDEX idx_daily_usage_user_id ON daily_usage(user_id);
CREATE INDEX idx_daily_usage_date ON daily_usage(usage_date);
      `);
    } else {
      console.log('✅ Table already exists!');
      
      // Test with a valid UUID
      const today = new Date().toISOString().split('T')[0];
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
      
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
    }
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
  }
}

// Run the script
createUsageTable().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});