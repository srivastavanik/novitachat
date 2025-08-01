import { Router } from 'express';
import { externalAuthController } from '../controllers/external-auth.controller';

const router = Router();

// OAuth authorization URL endpoint
router.get('/url', externalAuthController.getAuthUrl);

// OAuth callback endpoint
router.get('/callback', externalAuthController.handleCallback);

// Get current user info
router.get('/user', externalAuthController.getCurrentUser);

// Logout
router.post('/logout', externalAuthController.logout);

export default router; 