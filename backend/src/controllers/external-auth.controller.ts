import { Request, Response, NextFunction } from 'express';
import { 
  buildAuthUrl, 
  exchangeCodeForToken, 
  getUserInfo,
  completeAuthentication,
  getSessionData,
  cleanupUserSession
} from '../services/external-auth.service';
import { getCookie } from '../utils/cookies';

export class ExternalAuthController {
  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = req.query.state as string || undefined;
      
      const authUrl = buildAuthUrl(state);
      console.log('Auth URL built successfully:', { state, authUrlLength: authUrl.length });
      
      res.json({ authUrl });
    } catch (error) {
      console.error('Failed to build auth URL:', { state: req.query.state, error });
      res.status(500).json({
        error: 'Failed to build auth URL'
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
        const userInfo = await getUserInfo(tokenResponse.access_token);
        console.log('User info retrieved:', { 
          userId: userInfo.sub, 
          username: userInfo.preferred_username,
          hasBalance: userInfo.balance !== undefined,
          hasApiAccess: userInfo.access_api 
        });

        // Complete authentication flow (handled by service)
        const authTokens = await completeAuthentication(userInfo, tokenResponse);

        // Set auth cookies
        this.setAuthCookies(res, authTokens);

        // Redirect to chat page
        const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
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
   * Get current user session info
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = getCookie(req, 'sessionId');
      
      if (!sessionId) {
        res.status(401).json({ error: 'No session found' });
        return;
      }

      const sessionData = await getSessionData(sessionId);
      
      if (!sessionData) {
        res.status(401).json({ error: 'Session expired' });
        return;
      }

      res.json({
        user: sessionData.user,
        createdAt: sessionData.createdAt
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = getCookie(req, 'sessionId');
      
      if (sessionId) {
        await cleanupUserSession(sessionId);
      }

      // Clear cookies
      this.clearAuthCookies(res);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  }

  /**
   * Set authentication cookies
   * @private
   */
  private setAuthCookies(res: Response, authTokens: { accessToken: string; refreshToken: string; sessionId: string }): void {
    res.cookie('accessToken', authTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', authTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.cookie('sessionId', authTokens.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  /**
   * Clear authentication cookies
   * @private
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');
  }
}

// Export singleton instance
export const externalAuthController = new ExternalAuthController();