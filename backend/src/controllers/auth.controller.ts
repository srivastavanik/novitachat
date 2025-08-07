import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { UserModel, User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redisClient } from '../utils/redis';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Register attempt for:', req.body.email);
      
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('ERROR: Validation errors:', errors.array());
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, username } = req.body;
      console.log('Validation passed');

      // Check if user already exists
      console.log('Checking if user exists...');
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ 
          error: 'User already exists with this email' 
        });
        return;
      }

      // Create new user
      console.log('Creating new user...');
      const user = await UserModel.create({
        email,
        password,
        username
      });
      console.log('User created:', user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken(user.id, user.email, user.role);

      // Store refresh token in Redis (if available)
      try {
        await redisClient.set(
          `refresh_token:${user.id}`,
          refreshToken,
          30 * 24 * 60 * 60 // 30 days
        );
      } catch (redisError: any) {
        console.warn('WARNING: Could not store refresh token in Redis:', redisError.message);
        // Continue without Redis - tokens will still work but won't be revocable
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error: any) {
      console.error('ERROR: Registration error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: JSON.stringify(error, null, 2),
        errorKeys: Object.keys(error || {})
      });
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Authenticate user (supports both email and username)
      const authResult = await UserModel.authenticate(email, password);
      if (!authResult) {
        res.status(401).json({ 
          error: 'Invalid credentials' 
        });
        return;
      }

      const { user, accessToken, refreshToken } = authResult;

      // Store refresh token in Redis (if available)
      try {
        await redisClient.set(
          `refresh_token:${user.id}`,
          refreshToken,
          30 * 24 * 60 * 60 // 30 days
        );
      } catch (redisError: any) {
        console.warn('WARNING: Could not store refresh token in Redis:', redisError.message);
        // Continue without Redis - tokens will still work but won't be revocable
      }

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          lastLoginAt: new Date()
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ 
          error: 'Refresh token is required' 
        });
        return;
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload || typeof payload === 'string') {
        res.status(401).json({ 
          error: 'Invalid refresh token' 
        });
        return;
      }

      // Check if refresh token exists in Redis (if available)
      try {
        const storedToken = await redisClient.get(`refresh_token:${payload.userId}`);
        if (storedToken && storedToken !== refreshToken) {
          res.status(401).json({ 
            error: 'Invalid refresh token' 
          });
          return;
        }
      } catch (redisError: any) {
        console.warn('WARNING: Could not check refresh token in Redis:', redisError.message);
        // Continue without Redis validation
      }

      // Generate new access token
      const accessToken = generateAccessToken(payload.userId, payload.email, payload.role);

      res.json({
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userInfo = (req as any).user;

      if (!userInfo || !userInfo.userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      // Remove refresh token from Redis (if available)
      try {
        await redisClient.del(`refresh_token:${userInfo.userId}`);
      } catch (redisError: any) {
        console.warn('WARNING: Could not remove refresh token from Redis:', redisError.message);
      }

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userInfo = (req as any).user;

      if (!userInfo || !userInfo.userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      const user = await UserModel.findById(userInfo.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'User not found' 
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profilePictureUrl: user.avatar_url,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userInfo = (req as any).user;

      if (!userInfo || !userInfo.userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user
      const user = await UserModel.findById(userInfo.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'User not found' 
        });
        return;
      }

      // Verify current password
      const isValidPassword = await UserModel.verifyPassword(user, currentPassword);
      if (!isValidPassword) {
        res.status(401).json({ 
          error: 'Current password is incorrect' 
        });
        return;
      }

      // Update password
      await UserModel.changePassword(userInfo.userId, newPassword);

      // Invalidate all refresh tokens (if Redis is available)
      try {
        await redisClient.del(`refresh_token:${userInfo.userId}`);
      } catch (redisError: any) {
        console.warn('WARNING: Could not invalidate refresh tokens in Redis:', redisError.message);
      }

      res.json({
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * External login (Novita OAuth)
   */
  async externalLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userInfo, novitaToken } = req.body;

      if (!userInfo || !novitaToken) {
        res.status(400).json({ error: 'Missing user info or Novita token' });
        return;
      }

      // Check if user already exists
      let user = await UserModel.findByEmail(userInfo.email || userInfo.sub);
      
      if (!user) {
        // Create new user
        user = await UserModel.create({
          email: userInfo.email || userInfo.sub,
          password: userInfo.sub, // Use sub as password placeholder
          username: userInfo.preferred_username || userInfo.name || userInfo.sub
        });
      }

      // Generate our own access token
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redisClient.set(
        `refresh_token:${user.id}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        access_token: accessToken,
        novita_token: novitaToken // Pass through for frontend use
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
