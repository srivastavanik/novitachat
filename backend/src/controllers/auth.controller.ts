import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { UserModel, User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redisClient } from '../utils/redis';
import { AuthRequest } from '../types/auth';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, username } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ 
          error: 'User already exists with this email' 
        });
        return;
      }

      // Create new user
      const user = await UserModel.create({
        email,
        password,
        username
      });

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redisClient.set(
        `refresh_token:${user.id}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

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
    } catch (error) {
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

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({ 
          error: 'Invalid credentials' 
        });
        return;
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(user, password);
      if (!isValidPassword) {
        res.status(401).json({ 
          error: 'Invalid credentials' 
        });
        return;
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redisClient.set(
        `refresh_token:${user.id}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

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

      // Check if refresh token exists in Redis
      const storedToken = await redisClient.get(`refresh_token:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        res.status(401).json({ 
          error: 'Invalid refresh token' 
        });
        return;
      }

      // Generate new access token
      const accessToken = generateAccessToken(payload.userId);

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
      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      // Remove refresh token from Redis
      await redisClient.del(`refresh_token:${userId}`);

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
      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      const user = await UserModel.findById(userId);
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

      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized' 
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user
      const user = await UserModel.findById(userId);
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
      await UserModel.changePassword(userId, newPassword);

      // Invalidate all refresh tokens
      await redisClient.del(`refresh_token:${userId}`);

      res.json({
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
