import database from '../database';

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

    const query = `
      INSERT INTO messages (
        conversation_id, user_id, role, content, model, 
        token_count, is_error, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      conversation_id,
      user_id,
      role,
      content,
      model,
      token_count,
      is_error,
      error_message,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await database.query(query, values);
    const message = result.rows[0];

    // Parse metadata if it exists
    if (message.metadata) {
      message.metadata = JSON.parse(message.metadata);
    }

    return message;
  }

  static async findById(id: string): Promise<Message | null> {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await database.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0];
    if (message.metadata) {
      message.metadata = JSON.parse(message.metadata);
    }

    return message;
  }

  static async findByConversationId(
    conversationId: string,
    limit = 100,
    offset = 0
  ): Promise<Message[]> {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;
    const result = await database.query(query, [conversationId, limit, offset]);

    return result.rows.map(message => {
      if (message.metadata) {
        message.metadata = JSON.parse(message.metadata);
      }
      return message;
    });
  }

  static async findLatestByConversationId(
    conversationId: string,
    limit = 20
  ): Promise<Message[]> {
    const query = `
      SELECT * FROM (
        SELECT * FROM messages 
        WHERE conversation_id = $1 
        ORDER BY created_at DESC
        LIMIT $2
      ) sub
      ORDER BY created_at ASC
    `;
    const result = await database.query(query, [conversationId, limit]);

    return result.rows.map(message => {
      if (message.metadata) {
        message.metadata = JSON.parse(message.metadata);
      }
      return message;
    });
  }

  static async update(id: string, updates: UpdateMessageInput): Promise<Message | null> {
    const allowedFields = ['content', 'token_count', 'is_error', 'error_message', 'metadata'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'metadata' && value) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE messages 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await database.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    const message = result.rows[0];
    if (message.metadata) {
      message.metadata = JSON.parse(message.metadata);
    }

    return message;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM messages WHERE id = $1';
    const result = await database.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  static async deleteByConversationId(conversationId: string): Promise<number> {
    const query = 'DELETE FROM messages WHERE conversation_id = $1';
    const result = await database.query(query, [conversationId]);

    return result.rowCount ?? 0;
  }

  static async countByConversationId(conversationId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1';
    const result = await database.query(query, [conversationId]);

    return parseInt(result.rows[0].count, 10);
  }

  static async getTotalTokenCount(conversationId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(token_count), 0) as total_tokens 
      FROM messages 
      WHERE conversation_id = $1 AND token_count IS NOT NULL
    `;
    const result = await database.query(query, [conversationId]);

    return parseInt(result.rows[0].total_tokens, 10);
  }

  static async search(
    userId: string,
    searchTerm: string,
    limit = 20
  ): Promise<Array<Message & { conversation_title: string }>> {
    const query = `
      SELECT m.*, c.title as conversation_title
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.user_id = $1 AND m.content ILIKE $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    const searchPattern = `%${searchTerm}%`;
    const result = await database.query(query, [userId, searchPattern, limit]);

    return result.rows.map(row => {
      if (row.metadata) {
        row.metadata = JSON.parse(row.metadata);
      }
      return row;
    });
  }

  static async getConversationContext(
    conversationId: string,
    maxMessages = 10
  ): Promise<Array<{ role: string; content: string }>> {
    const query = `
      SELECT role, content 
      FROM messages 
      WHERE conversation_id = $1 AND is_error = false
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await database.query(query, [conversationId, maxMessages]);

    // Reverse to get chronological order
    return result.rows.reverse();
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
    const query = `
      UPDATE messages 
      SET content = content || $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await database.query(query, [messageId, contentChunk]);
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
}
