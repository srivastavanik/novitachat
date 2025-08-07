import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import usageRoutes from './usage.routes';
import apiKeyRoutes from './apikey.routes';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/external-login', authController.externalLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);

// Usage tracking routes
router.use('/', usageRoutes);

// API key management routes
router.use('/', apiKeyRoutes);

export default router;
