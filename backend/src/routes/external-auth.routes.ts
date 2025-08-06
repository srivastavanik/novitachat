import { Router } from 'express';
import { oauthConfig } from '../config';
import { buildAuthUrl } from '../services/external-auth.service';

const router = Router();

// Test endpoint
router.get('/test', (req, res) => {
  console.log('External auth test endpoint hit');
  res.json({ message: 'External auth routes working' });
});

// OAuth authorization URL endpoint - simplified for debugging
router.get('/url', async (req, res) => {
  try {
    console.log('=== URL endpoint hit directly ===');
    console.log('OAuth config:', {
      clientId: oauthConfig.clientId,
      authUrl: oauthConfig.authUrl,
      redirectUri: oauthConfig.redirectUri,
      scope: oauthConfig.scope
    });
    
    const state = req.query.state as string || undefined;
    const authUrl = buildAuthUrl(state);
    
    console.log('Auth URL built:', authUrl);
    res.json({ authUrl });
  } catch (error: any) {
    console.error('=== Error in /url endpoint ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to build auth URL',
      details: error.message,
      stack: error.stack
    });
  }
});

// OAuth callback endpoint
router.get('/callback', async (req, res) => {
  console.log('Callback endpoint hit');
  res.json({ message: 'Callback endpoint reached' });
});

export default router;
