import { supabaseAdmin } from '../services/supabase.service';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  temperature: number;
  max_tokens: number | null;
  system_prompt: string | null;
  is_archived: boolean;
  last_message_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConversationInput {
  user_id: string;
  title?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number | null;
  system_prompt?: string | null;
}

export interface UpdateConversationInput {
  title?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number | null;
  system_prompt?: string | null;
  is_archived?: boolean;
}

export class ConversationModel {
  static async create(input: CreateConversationInput): Promise<Conversation> {
    const {
      user_id,
      title = 'New Conversation',
      model = 'meta-llama/llama-3.3-70b-instruct',
      temperature = 0.7,
      max_tokens = 2048,  // Default to 2048 tokens
      system_prompt = null
    } = input;

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id,
        title,
        model,
        temperature,
        max_tokens,
        system_prompt
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async findByUserId(userId: string, limit = 50, offset = 0): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data || [];
  }

  static async findActiveByUserId(userId: string, limit = 50): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data || [];
  }

  static async update(id: string, updates: UpdateConversationInput): Promise<Conversation | null> {
    const allowedFields = ['title', 'model', 'temperature', 'max_tokens', 'system_prompt', 'is_archived'];
    const filteredUpdates: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return await this.findById(id);
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  static async updateLastMessageAt(id: string): Promise<void> {
    await supabaseAdmin
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  }

  static async delete(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('id', id);

    return !error;
  }

  static async deleteByUserId(userId: string): Promise<number> {
    // First count the conversations
    const { count } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!count) return 0;

    // Then delete them
    const { error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('user_id', userId);

    return error ? 0 : count;
  }

  static async archive(id: string): Promise<Conversation | null> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  static async unarchive(id: string): Promise<Conversation | null> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ 
        is_archived: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  static async verifyOwnership(conversationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (error || !data) return false;
    return data.user_id === userId;
  }

  static async getMessageCount(conversationId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    return count || 0;
  }

  static async search(userId: string, searchTerm: string, limit = 20): Promise<Conversation[]> {
    // First, search conversations by title
    const { data: titleMatches } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', `%${searchTerm}%`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Also search by message content (this is more complex in Supabase)
    const { data: messageMatches } = await supabaseAdmin
      .from('messages')
      .select('conversation_id')
      .ilike('content', `%${searchTerm}%`);

    const conversationIds = new Set<string>();
    
    // Add title matches
    if (titleMatches) {
      titleMatches.forEach(conv => conversationIds.add(conv.id));
    }
    
    // Add conversation IDs from message matches
    if (messageMatches) {
      messageMatches.forEach(msg => conversationIds.add(msg.conversation_id));
    }

    // If no matches, return empty array
    if (conversationIds.size === 0) return [];

    // Fetch all matching conversations
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .in('id', Array.from(conversationIds))
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    return conversations || [];
  }
}
