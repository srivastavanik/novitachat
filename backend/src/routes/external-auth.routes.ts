import { Router } from 'express';
import { externalAuthController } from '../controllers/external-auth.controller';

const router = Router();

// OAuth authorization URL endpoint
router.get('/url', externalAuthController.getAuthUrl.bind(externalAuthController));

// OAuth callback endpoint
router.get('/callback', externalAuthController.handleCallback.bind(externalAuthController));

export default router; 