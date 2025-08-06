import { supabaseAdmin } from '../src/services/supabase.service'

async function updateMaxTokens() {
  console.log('Updating conversations to have default max_tokens...')
  
  try {
    // Update all conversations with null max_tokens to use 2048 as default
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ 
        max_tokens: 2048,
        updated_at: new Date().toISOString()
      })
      .is('max_tokens', null)
      .select()

    if (error) {
      console.error('Error updating conversations:', error)
      process.exit(1)
    }

    console.log(`Successfully updated ${data?.length || 0} conversations with default max_tokens of 2048`)
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

updateMaxTokens()
