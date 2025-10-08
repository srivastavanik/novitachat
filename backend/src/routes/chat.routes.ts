import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { chatController } from '../controllers/chat.controller';

const router = Router();

// Rate limiting configurations
const trialChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for trial
  message: {
    error: 'Too many trial chat requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users with premium accounts
    return req.user && req.user.isPremium;
  }
});

const conversationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 conversation requests per windowMs
  message: {
    error: 'Too many conversation requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests instead of IP
    return req.user ? `user_${req.user.id}` : req.ip;
  }
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 messages per minute
  message: {
    error: 'Too many messages sent, please slow down.',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  }
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each user to 50 search requests per windowMs
  message: {
    error: 'Too many search requests, please try again later.',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  }
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each user to 200 general API requests per windowMs
  message: {
    error: 'Too many API requests, please try again later.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  }
});

// Trial chat endpoint (no auth required) with strict rate limiting
router.post('/trial', trialChatLimiter, (req, res) => chatController.trialChat(req, res));

// Protected routes
router.use(authenticate);
router.use(generalApiLimiter);

// Conversation management with specific rate limiting
router.get('/conversations', conversationLimiter, (req, res) => chatController.getConversations(req, res));
router.post('/conversations', conversationLimiter, (req, res) => chatController.createConversation(req, res));
router.get('/conversations/:id', conversationLimiter, (req, res) => chatController.getConversation(req, res));
router.put('/conversations/:conversationId', conversationLimiter, (req, res) => chatController.updateConversation(req, res));
router.patch('/conversations/:conversationId', conversationLimiter, (req, res) => chatController.updateConversation(req, res));
router.delete('/conversations/:id', conversationLimiter, (req, res) => chatController.deleteConversation(req, res));

// Message management with stricter rate limiting
router.get('/conversations/:conversationId/messages', conversationLimiter, (req, res) => chatController.getMessages(req, res));
router.post('/conversations/:conversationId/messages', messageLimiter, (req, res) => chatController.sendMessage(req, res));

// Search with specific rate limiting
router.get('/search', searchLimiter, (req, res) => chatController.searchConversations(req, res));
router.post('/conversations/:id/archive', conversationLimiter, (req, res) => chatController.archiveConversation(req, res));
router.post('/conversations/:id/unarchive', conversationLimiter, (req, res) => chatController.unarchiveConversation(req, res));

export default router;