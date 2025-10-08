import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, query, validationResult } from 'express-validator';
import { oauthConfig } from '../config';
import { buildAuthUrl } from '../services/external-auth.service';
import { ExternalAuthController } from '../controllers/external-auth.controller';

const router = Router();

// Security middleware
router.use(helmet());

// Rate limiting middleware for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for internal health checks
    return req.ip === '127.0.0.1' && req.get('User-Agent')?.includes('health-check');
  }
});

// Stricter rate limiting for callback endpoint
const callbackRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 callback requests per windowMs
  message: {
    error: 'Too many callback requests from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Test endpoint with basic rate limiting
const testRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 test requests per minute
  message: {
    error: 'Too many test requests from this IP, please try again later.'
  }
});

// Input validation middleware
const validateStateParam = [
  query('state')
    .optional()
    .isLength({ min: 1, max: 256 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('State parameter must be alphanumeric with hyphens and underscores only'),
];

const validateCallbackParams = [
  query('code')
    .optional()
    .isLength({ min: 1, max: 512 })
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Invalid authorization code format'),
  query('state')
    .optional()
    .isLength({ min: 1, max: 256 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid state parameter format'),
  query('error')
    .optional()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid error parameter format')
];

// Validation error handler
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Test endpoint
router.get('/test', testRateLimit, (req, res) => {
  res.json({ 
    message: 'External auth routes working',
    timestamp: new Date().toISOString()
  });
});

// OAuth authorization URL endpoint
router.get('/url', 
  authRateLimit,
  validateStateParam,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Validate OAuth configuration
      if (!oauthConfig.clientId || !oauthConfig.authUrl || !oauthConfig.redirectUri) {
        return res.status(500).json({ 
          error: 'OAuth configuration incomplete' 
        });
      }

      const state = req.query.state as string || undefined;
      
      // Additional state validation
      if (state && (state.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(state))) {
        return res.status(400).json({ 
          error: 'Invalid state parameter format' 
        });
      }

      const authUrl = buildAuthUrl(state);
      
      // Validate the built URL
      try {
        new URL(authUrl);
      } catch (urlError) {
        return res.status(500).json({ 
          error: 'Failed to generate valid authorization URL' 
        });
      }

      res.json({ 
        authUrl,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      // Log error securely (don't expose sensitive details)
      console.error('Auth URL generation error:', {
        message: error.message,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      res.status(500).json({ 
        error: 'Failed to build authorization URL',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// OAuth callback endpoint
const authController = new ExternalAuthController();
router.get('/callback',
  callbackRateLimit,
  validateCallbackParams,
  handleValidationErrors,
  (req, res, next) => {
    // Additional security logging
    console.log('OAuth callback received:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      hasCode: !!req.query.code,
      hasState: !!req.query.state,
      hasError: !!req.query.error
    });
    
    authController.handleCallback(req, res, next);
  }
);

export default router;