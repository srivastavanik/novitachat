import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chatController } from '../controllers/chat.controller';

const router = Router();

// Trial chat endpoint (no auth required)
router.post('/trial', (req, res) => chatController.trialChat(req, res));

// Protected routes
router.use(authenticate);

// Conversation management
router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.post('/conversations', (req, res) => chatController.createConversation(req, res));
router.get('/conversations/:id', (req, res) => chatController.getConversation(req, res));
router.put('/conversations/:conversationId', (req, res) => chatController.updateConversation(req, res));
router.patch('/conversations/:conversationId', (req, res) => chatController.updateConversation(req, res));
router.delete('/conversations/:id', (req, res) => chatController.deleteConversation(req, res));

// Message management
router.get('/conversations/:conversationId/messages', (req, res) => chatController.getMessages(req, res));
router.post('/conversations/:conversationId/messages', (req, res) => chatController.sendMessage(req, res));

// Search
router.post('/search', (req, res) => chatController.searchConversations(req, res));
router.post('/conversations/:id/archive', (req, res) => chatController.archiveConversation(req, res));
router.post('/conversations/:id/unarchive', (req, res) => chatController.unarchiveConversation(req, res));

export default router;
