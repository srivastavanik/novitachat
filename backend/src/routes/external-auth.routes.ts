import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { oauthConfig } from '../config';
import { buildAuthUrl } from '../services/external-auth.service';
import { ExternalAuthController } from '../controllers/external-auth.controller';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Test endpoint
router.get('/test', (req, res) => {
  logger.info('External auth test endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  res.json({ message: 'External auth routes working' });
});

// OAuth authorization URL endpoint
router.get('/url', async (req, res) => {
  try {
    logger.info('OAuth URL endpoint accessed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Log sanitized config (no sensitive data)
    logger.debug('OAuth configuration loaded', {
      hasClientId: !!oauthConfig.clientId,
      authUrlDomain: oauthConfig.authUrl ? new URL(oauthConfig.authUrl).hostname : 'undefined',
      redirectUriDomain: oauthConfig.redirectUri ? new URL(oauthConfig.redirectUri).hostname : 'undefined',
      scopeCount: oauthConfig.scope ? oauthConfig.scope.split(' ').length : 0
    });
    
    const state = req.query.state as string || undefined;
    
    // Validate state parameter if provided
    if (state && (typeof state !== 'string' || state.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(state))) {
      logger.warn('Invalid state parameter provided', {
        ip: req.ip,
        stateLength: state?.length,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    const authUrl = buildAuthUrl(state);
    
    logger.info('Auth URL generated successfully', {
      ip: req.ip,
      hasState: !!state,
      timestamp: new Date().toISOString()
    });
    
    res.json({ authUrl });
  } catch (error: any) {
    logger.error('Error building auth URL', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to build auth URL'
    });
  }
});

// OAuth callback endpoint
const authController = new ExternalAuthController();
router.get('/callback', (req, res, next) => {
  logger.info('OAuth callback endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    hasCode: !!req.query.code,
    hasState: !!req.query.state,
    hasError: !!req.query.error,
    timestamp: new Date().toISOString()
  });
  
  authController.handleCallback(req, res, next);
});

export default router;