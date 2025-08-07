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
   * Handle OAuth callback - Exchange code for token and set cookie
   * Set Novita token as cookie for frontend to use
   */
  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, error, state } = req.query;

      // Handle OAuth error
      if (error) {
        console.error('OAuth error:', { error, state });
        const baseUrl = frontendConfig.webOrigin;
        return res.redirect(`${baseUrl}/?error=${encodeURIComponent(error as string)}`);
      }

      // Validate authorization code
      if (!code) {
        console.error('Missing authorization code');
        const baseUrl = frontendConfig.webOrigin;
        return res.redirect(`${baseUrl}/?error=missing_code`);
      }

      console.log('OAuth callback endpoint hit with query:', req.query);

      // Exchange code for token
      try {
        console.log('Exchanging code for token...');
        const tokenResponse = await exchangeCodeForToken(code as string);
        console.log('Token exchange successful, redirecting with token...');

        // Instead of setting a cookie (which won't work cross-domain), 
        // pass the token in the redirect URL for frontend to use
        const baseUrl = frontendConfig.webOrigin;
        const redirectUrl = `${baseUrl}/chat?auth=success&code=${encodeURIComponent(code as string)}&token=${encodeURIComponent(tokenResponse.access_token)}`;
        console.log('OAuth callback successful, redirecting to:', redirectUrl.replace(tokenResponse.access_token, '***TOKEN***'));

        res.redirect(redirectUrl);
      } catch (tokenError) {
        console.error('Token exchange failed:', tokenError);
        const baseUrl = frontendConfig.webOrigin;
        res.redirect(`${baseUrl}/?error=token_exchange_failed`);
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      const baseUrl = frontendConfig.webOrigin;
      res.redirect(`${baseUrl}/?error=auth_failed`);
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
