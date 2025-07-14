import bcrypt from 'bcrypt';
import database from '../database';
import { generateTokenPair } from '../utils/jwt';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface UserWithTokens {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

export class UserModel {
  static async create(input: CreateUserInput): Promise<User> {
    const { email, username, password, full_name } = input;
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, username, password_hash, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [email, username, password_hash, full_name || null];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await database.query(query, [email]);
    
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await database.query(query, [username]);
    
    return result.rows[0] || null;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const query = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1';
    await database.query(query, [userId]);
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }

  static async authenticate(emailOrUsername: string, password: string): Promise<UserWithTokens | null> {
    // Find user by email or username
    let user = await this.findByEmail(emailOrUsername);
    if (!user) {
      user = await this.findByUsername(emailOrUsername);
    }
    
    if (!user || !user.is_active) {
      return null;
    }
    
    // Verify password
    const isValid = await this.verifyPassword(user, password);
    if (!isValid) {
      return null;
    }
    
    // Update last login
    await this.updateLastLogin(user.id);
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  static async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['full_name', 'avatar_url', 'email', 'username'];
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
      return await this.findById(userId);
    }
    
    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
    const result = await database.query(query, [password_hash, userId]);
    
    return (result.rowCount ?? 0) > 0;
  }

  static async delete(userId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await database.query(query, [userId]);
    
    return (result.rowCount ?? 0) > 0;
  }

  static async exists(email: string, username: string): Promise<{ emailExists: boolean; usernameExists: boolean }> {
    const query = 'SELECT email, username FROM users WHERE email = $1 OR username = $2';
    const result = await database.query(query, [email, username]);
    
    let emailExists = false;
    let usernameExists = false;
    
    for (const row of result.rows) {
      if (row.email === email) emailExists = true;
      if (row.username === username) usernameExists = true;
    }
    
    return { emailExists, usernameExists };
  }
}
