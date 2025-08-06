import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../services/supabase.service';
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
    
    try {
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      const testQuery = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(0);
      
      if (testQuery.error) {
        console.error('ERROR: Supabase connection test failed:', testQuery.error);
        throw new Error(`Database connection failed: ${testQuery.error.message}`);
      }
      console.log('Supabase connection OK');
      
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      console.log('Password hashed, inserting user into database...');
      console.log('Insert data:', { email, username, password_hash: '***', full_name });
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          username,
          password_hash,
          full_name: full_name || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('ERROR: Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to create user: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from insert');
      }
      
      console.log('User created in database:', data.id);
      return data;
    } catch (error: any) {
      console.error('ERROR: UserModel.create error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) return null;
    return data;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) return null;
    return data;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
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
    const filteredUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return await this.findById(userId);
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }

  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash })
      .eq('id', userId);
    
    return !error;
  }

  static async delete(userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    
    return !error;
  }

  static async exists(email: string, username: string): Promise<{ emailExists: boolean; usernameExists: boolean }> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`);
    
    if (error || !data) {
      return { emailExists: false, usernameExists: false };
    }
    
    let emailExists = false;
    let usernameExists = false;
    
    for (const row of data) {
      if (row.email === email) emailExists = true;
      if (row.username === username) usernameExists = true;
    }
    
    return { emailExists, usernameExists };
  }
}
