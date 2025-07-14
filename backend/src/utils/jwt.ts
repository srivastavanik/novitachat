import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

export class JWTService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.accessTokenExpiry,
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): DecodedToken {
    try {
      return jwt.verify(token, jwtConfig.secret) as DecodedToken;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): DecodedToken {
    try {
      return jwt.verify(token, jwtConfig.secret) as DecodedToken;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static decodeToken(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch {
      return null;
    }
  }
}

export const generateTokenPair = (payload: TokenPayload) => {
  return {
    accessToken: JWTService.generateAccessToken(payload),
    refreshToken: JWTService.generateRefreshToken(payload),
  };
};

// Export convenience functions for auth controller
export const generateAccessToken = (userId: string): string => {
  return JWTService.generateAccessToken({ userId, email: '', role: 'user' });
};

export const generateRefreshToken = (userId: string): string => {
  return JWTService.generateRefreshToken({ userId, email: '', role: 'user' });
};

export const verifyRefreshToken = (token: string): DecodedToken | null => {
  try {
    return JWTService.verifyRefreshToken(token);
  } catch {
    return null;
  }
};

export const verifyToken = (token: string): DecodedToken | null => {
  try {
    return JWTService.verifyAccessToken(token);
  } catch {
    return null;
  }
};
