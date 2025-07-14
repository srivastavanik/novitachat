import database from '../database';

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
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      max_tokens = null,
      system_prompt = null
    } = input;

    const query = `
      INSERT INTO conversations (user_id, title, model, temperature, max_tokens, system_prompt)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [user_id, title, model, temperature, max_tokens, system_prompt];
    const result = await database.query(query, values);

    return result.rows[0];
  }

  static async findById(id: string): Promise<Conversation | null> {
    const query = 'SELECT * FROM conversations WHERE id = $1';
    const result = await database.query(query, [id]);

    return result.rows[0] || null;
  }

  static async findByUserId(userId: string, limit = 50, offset = 0): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations 
      WHERE user_id = $1 
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await database.query(query, [userId, limit, offset]);

    return result.rows;
  }

  static async findActiveByUserId(userId: string, limit = 50): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations 
      WHERE user_id = $1 AND is_archived = false
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT $2
    `;
    const result = await database.query(query, [userId, limit]);

    return result.rows;
  }

  static async update(id: string, updates: UpdateConversationInput): Promise<Conversation | null> {
    const allowedFields = ['title', 'model', 'temperature', 'max_tokens', 'system_prompt', 'is_archived'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE conversations 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  static async updateLastMessageAt(id: string): Promise<void> {
    const query = `
      UPDATE conversations 
      SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await database.query(query, [id]);
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM conversations WHERE id = $1';
    const result = await database.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  static async deleteByUserId(userId: string): Promise<number> {
    const query = 'DELETE FROM conversations WHERE user_id = $1';
    const result = await database.query(query, [userId]);

    return result.rowCount ?? 0;
  }

  static async archive(id: string): Promise<Conversation | null> {
    const query = `
      UPDATE conversations 
      SET is_archived = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await database.query(query, [id]);

    return result.rows[0] || null;
  }

  static async unarchive(id: string): Promise<Conversation | null> {
    const query = `
      UPDATE conversations 
      SET is_archived = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await database.query(query, [id]);

    return result.rows[0] || null;
  }

  static async verifyOwnership(conversationId: string, userId: string): Promise<boolean> {
    const query = 'SELECT user_id FROM conversations WHERE id = $1';
    const result = await database.query(query, [conversationId]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].user_id === userId;
  }

  static async getMessageCount(conversationId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1';
    const result = await database.query(query, [conversationId]);

    return parseInt(result.rows[0].count, 10);
  }

  static async search(userId: string, searchTerm: string, limit = 20): Promise<Conversation[]> {
    const query = `
      SELECT c.* FROM conversations c
      WHERE c.user_id = $1 
      AND (
        c.title ILIKE $2 
        OR EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id 
          AND m.content ILIKE $2
        )
      )
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT $3
    `;
    const searchPattern = `%${searchTerm}%`;
    const result = await database.query(query, [userId, searchPattern, limit]);

    return result.rows;
  }
}
