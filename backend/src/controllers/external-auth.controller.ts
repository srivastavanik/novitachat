import { Request, Response, NextFunction } from 'express';
import { UserModel, User } from '../models/User';
import { redisClient } from '../utils/redis';
import { frontendConfig, oauthConfig } from '../config';
import { 
  buildAuthUrl, 
  exchangeCodeForToken, 
  getUserInfo,
} from '../services/external-auth.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export class ExternalAuthController {
  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('=== getAuthUrl called ===');
      const state = req.query.state as string || undefined;
      
      // Log OAuth configuration for debugging
      console.log('OAuth Config:', {
        clientId: oauthConfig.clientId,
        authUrl: oauthConfig.authUrl,
        redirectUri: oauthConfig.redirectUri,
        scope: oauthConfig.scope
      });
      
      const authUrl = buildAuthUrl(state);
      console.log('Auth URL built successfully:', { state, authUrlLength: authUrl.length, authUrl });
      
      res.json({ authUrl });
    } catch (error: any) {
      console.error('=== Failed to build auth URL ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('OAuth config at error:', oauthConfig);
      
      res.status(500).json({
        error: 'Failed to build auth URL',
        details: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, error, state } = req.query;

      // Handle OAuth error
      if (error) {
        console.error('OAuth error:', { error, state });
        return res.redirect(`/?error=${encodeURIComponent(error as string)}`);
      }

      // Validate authorization code
      if (!code) {
        console.error('Missing authorization code');
        return res.redirect('/?error=missing_code');
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await exchangeCodeForToken(code as string);
        console.log('Token exchange successful:', { 
          hasAccessToken: !!tokenResponse.access_token,
          hasRefreshToken: !!tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in 
        });

        // Get user information using access token
        const externalUser = await getUserInfo(tokenResponse.access_token);
        console.log('User info retrieved:', { 
          userId: externalUser.sub, 
          username: externalUser.preferred_username,
          hasBalance: externalUser.balance !== undefined,
          hasApiAccess: externalUser.access_api 
        });

        // Check if user already exists (use userId as the unique identifier, which is set to the email)
        let user = await UserModel.findByEmail(externalUser.sub);
        if (!user) {
          // Create new user
          user = await UserModel.create({
            email: externalUser.sub,
            password: externalUser.sub,
            username: externalUser.preferred_username || externalUser.sub
          });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token in Redis
        await redisClient.set(
          `refresh_token:${user.id}`,
          refreshToken,
          30 * 24 * 60 * 60 // 30 days
        );

        // Set auth cookies
        this.setAuthCookies(res, accessToken);

        // Redirect to chat page
        const baseUrl = frontendConfig.webOrigin;
        const redirectUrl = `${baseUrl}/chat`;
        console.log('Auth redirect URL:', { redirectUrl });

        res.redirect(redirectUrl);
      } catch (tokenError) {
        console.error('Token exchange failed:', tokenError);
        res.redirect('/?error=token_exchange_failed');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  }

  /**
   * Set authentication cookies
   * @private
   */
  private setAuthCookies(res: Response, accessToken: string): void {
    res.cookie('access_token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
  }

  /**
   * Clear authentication cookies
   * @private
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
  }
}

// Export singleton instance
export const externalAuthController = new ExternalAuthController();
