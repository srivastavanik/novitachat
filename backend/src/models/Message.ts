import { supabaseAdmin } from '../services/supabase.service';

export interface Attachment {
  id: string;
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
  type: 'image' | 'document';
  url?: string;
  data?: string;
  created_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  token_count: number | null;
  is_error: boolean;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  attachments?: Attachment[];
}

export interface CreateMessageInput {
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string | null;
  token_count?: number | null;
  is_error?: boolean;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateMessageInput {
  content?: string;
  token_count?: number | null;
  is_error?: boolean;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
}

export class MessageModel {
  static async create(input: CreateMessageInput): Promise<Message> {
    const {
      conversation_id,
      user_id,
      role,
      content,
      model = null,
      token_count = null,
      is_error = false,
      error_message = null,
      metadata = null
    } = input;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id,
        user_id,
        role,
        content,
        model,
        token_count,
        is_error,
        error_message,
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id: string): Promise<Message | null> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async findByConversationId(
    conversationId: string,
    limit = 100,
    offset = 0
  ): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data || [];
  }

  static async findLatestByConversationId(
    conversationId: string,
    limit = 20
  ): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    // Reverse to get chronological order
    return (data || []).reverse();
  }

  static async update(id: string, updates: UpdateMessageInput): Promise<Message | null> {
    const allowedFields = ['content', 'token_count', 'is_error', 'error_message', 'metadata'];
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
      .from('messages')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data;
  }

  static async delete(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id);

    return !error;
  }

  static async deleteByConversationId(conversationId: string): Promise<number> {
    // First count the messages
    const { count } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (!count) return 0;

    // Then delete them
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    return error ? 0 : count;
  }

  static async countByConversationId(conversationId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    return count || 0;
  }

  static async getTotalTokenCount(conversationId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('token_count')
      .eq('conversation_id', conversationId)
      .not('token_count', 'is', null);

    if (!data) return 0;
    
    return data.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
  }

  static async search(
    userId: string,
    searchTerm: string,
    limit = 20
  ): Promise<Array<Message & { conversation_title: string }>> {
    // First get messages that match the search term
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('*, conversations!inner(title)')
      .eq('user_id', userId)
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!messages) return [];

    // Transform the results to include conversation_title
    return messages.map(msg => ({
      ...msg,
      conversation_title: msg.conversations?.title || 'Untitled'
    }));
  }

  static async getConversationContext(
    conversationId: string,
    maxMessages = 50,  // Increased to get more context
    maxTokens = 4000   // Token limit for context window
  ): Promise<Array<{ role: string; content: string; attachments?: Attachment[]; created_at?: Date }>> {
    const { data } = await supabaseAdmin
      .from('messages')
      .select(`
        role,
        content,
        metadata,
        token_count,
        created_at,
        message_attachments (
          id,
          message_id,
          filename,
          mime_type,
          size,
          type,
          url,
          data,
          created_at
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_error', false)
      .order('created_at', { ascending: false })
      .limit(maxMessages);

    if (!data) return [];
    
    // Filter out search progress messages
    const filteredMessages = data.filter(msg => !msg.metadata?.isSearchProgress);
    
    // Implement token-aware context windowing
    const contextMessages = [];
    let currentTokenCount = 0;
    
    // Start from most recent messages and work backwards
    for (const msg of filteredMessages) {
      const estimatedTokens = msg.token_count || this.estimateTokens(msg.content);
      
      // Always include the most recent exchange (user + assistant pair)
      if (contextMessages.length < 4) {
        contextMessages.push(msg);
        currentTokenCount += estimatedTokens;
        continue;
      }
      
      // Stop if adding this message would exceed token limit
      if (currentTokenCount + estimatedTokens > maxTokens) {
        break;
      }
      
      contextMessages.push(msg);
      currentTokenCount += estimatedTokens;
    }
    
    // Reverse to get chronological order and map to required format
    return contextMessages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
      attachments: msg.message_attachments || [],
      created_at: msg.created_at
    }));
  }

  // Helper method to estimate tokens
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  // Get context with intelligent summarization for long conversations
  static async getIntelligentContext(
    conversationId: string,
    maxTokens = 4000
  ): Promise<Array<{ role: string; content: string; attachments?: Attachment[] }>> {
    // Get recent context first
    const recentContext = await this.getConversationContext(conversationId, 20, maxTokens * 0.8);
    
    // If we have room for more context, get earlier messages
    if (recentContext.length > 0) {
      const recentTokens = recentContext.reduce((sum, msg) => 
        sum + this.estimateTokens(msg.content), 0);
      
      if (recentTokens < maxTokens * 0.6) {
        // Get some earlier context for better understanding
        const { data: earlierMessages } = await supabaseAdmin
          .from('messages')
          .select('role, content, created_at')
          .eq('conversation_id', conversationId)
          .eq('is_error', false)
          .lt('created_at', recentContext[0]?.created_at || new Date())
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (earlierMessages) {
          const remainingTokens = maxTokens - recentTokens;
          const additionalContext = [];
          let tokenCount = 0;
          
          for (const msg of earlierMessages.reverse()) {
            const tokens = this.estimateTokens(msg.content);
            if (tokenCount + tokens > remainingTokens) break;
            
            additionalContext.push({
              role: msg.role,
              content: msg.content,
              attachments: []
            });
            tokenCount += tokens;
          }
          
          return [...additionalContext, ...recentContext];
        }
      }
    }
    
    return recentContext;
  }

  static async createStreamingMessage(
    conversationId: string,
    userId: string,
    model: string
  ): Promise<Message> {
    // Create a placeholder message for streaming
    return await this.create({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: '',
      model,
      metadata: { streaming: true }
    });
  }

  static async appendToStreamingMessage(
    messageId: string,
    contentChunk: string
  ): Promise<void> {
    // Get current message content
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('content')
      .eq('id', messageId)
      .single();

    if (message) {
      // Append new chunk to existing content
      await supabaseAdmin
        .from('messages')
        .update({ 
          content: (message.content || '') + contentChunk,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);
    }
  }

  static async finalizeStreamingMessage(
    messageId: string,
    tokenCount?: number
  ): Promise<Message | null> {
    const updates: UpdateMessageInput = {
      metadata: { streaming: false }
    };

    if (tokenCount !== undefined) {
      updates.token_count = tokenCount;
    }

    return await this.update(messageId, updates);
  }

  static async markAsError(
    messageId: string,
    errorMessage: string
  ): Promise<Message | null> {
    return await this.update(messageId, {
      is_error: true,
      error_message: errorMessage
    });
  }

  static async addAttachment(
    messageId: string,
    attachment: {
      filename: string;
      mime_type: string;
      size: number;
      type: 'image' | 'document';
      url?: string;
      data?: string;
    }
  ): Promise<Attachment | null> {
    const { data, error } = await supabaseAdmin
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename: attachment.filename,
        mime_type: attachment.mime_type,
        size: attachment.size,
        type: attachment.type,
        url: attachment.url,
        data: attachment.data
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding attachment:', error);
      return null;
    }
    return data;
  }

  static async getAttachments(messageId: string): Promise<Attachment[]> {
    const { data, error } = await supabaseAdmin
      .from('message_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
  }

  static async deleteAttachment(attachmentId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('message_attachments')
      .delete()
      .eq('id', attachmentId);

    return !error;
  }

  // Create a conversation summary for very long conversations
  static async createConversationSummary(
    conversationId: string,
    maxSummaryLength = 500
  ): Promise<string> {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('is_error', false)
      .order('created_at', { ascending: true })
      .limit(20); // Get first 20 messages for summary

    if (!data || data.length === 0) {
      return 'This conversation has no previous context.';
    }

    // Create a basic summary of key topics and themes
    const userMessages = data.filter(msg => msg.role === 'user').map(msg => msg.content);
    const topics = userMessages.join(' ').slice(0, maxSummaryLength);
    
    return `Previous conversation summary: The user has been discussing: ${topics}...`;
  }

  // Get context with conversation summary for very long chats
  static async getContextWithSummary(
    conversationId: string,
    maxTokens = 4000
  ): Promise<{
    context: Array<{ role: string; content: string; attachments?: Attachment[] }>;
    summary?: string;
  }> {
    const messageCount = await this.countByConversationId(conversationId);
    
    // If conversation is very long (>100 messages), use summarization
    if (messageCount > 100) {
      const summary = await this.createConversationSummary(conversationId);
      const recentContext = await this.getConversationContext(conversationId, 15, maxTokens * 0.7);
      
      return {
        context: recentContext,
        summary
      };
    }
    
    // For shorter conversations, use intelligent context
    const context = await this.getIntelligentContext(conversationId, maxTokens);
    return { context };
  }

  // Priority-based context selection
  static async getPriorityContext(
    conversationId: string,
    maxTokens = 4000
  ): Promise<Array<{ role: string; content: string; attachments?: Attachment[]; priority?: number }>> {
    const { data } = await supabaseAdmin
      .from('messages')
      .select(`
        role,
        content,
        metadata,
        token_count,
        created_at,
        message_attachments (
          id, message_id, filename, mime_type, size, type, url, data, created_at
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_error', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return [];

    // Assign priority scores to messages
    const prioritizedMessages = data
      .filter(msg => !msg.metadata?.isSearchProgress)
      .map((msg, index) => {
        let priority = 0;
        
        // Recent messages get higher priority
        priority += Math.max(0, 10 - index);
        
        // Messages with attachments get higher priority
        if (msg.message_attachments && msg.message_attachments.length > 0) {
          priority += 5;
        }
        
        // User messages get slightly higher priority than assistant messages
        if (msg.role === 'user') {
          priority += 2;
        }
        
        // Longer messages might be more important
        if (msg.content.length > 200) {
          priority += 3;
        }
        
        // System messages get high priority
        if (msg.role === 'system') {
          priority += 8;
        }
        
        return {
          ...msg,
          priority,
          estimatedTokens: msg.token_count || this.estimateTokens(msg.content)
        };
      });

    // Sort by priority (highest first) then by recency
    prioritizedMessages.sort((a, b) => {
      if (b.priority === a.priority) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return b.priority - a.priority;
    });

    // Select messages within token budget
    const selectedMessages = [];
    let currentTokenCount = 0;

    for (const msg of prioritizedMessages) {
      if (currentTokenCount + msg.estimatedTokens > maxTokens) {
        // If we haven't selected many messages yet, try to fit this one anyway
        if (selectedMessages.length < 10) {
          selectedMessages.push(msg);
        }
        break;
      }
      
      selectedMessages.push(msg);
      currentTokenCount += msg.estimatedTokens;
    }

    // Sort selected messages chronologically for conversation flow
    selectedMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return selectedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      attachments: msg.message_attachments || [],
      priority: msg.priority
    }));
  }
}
