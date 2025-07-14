import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Conversation routes
router.get('/conversations', chatController.getConversations.bind(chatController));
router.post('/conversations', chatController.createConversation.bind(chatController));
router.get('/conversations/search', chatController.searchConversations.bind(chatController));
router.get('/conversations/:conversationId', chatController.getConversation.bind(chatController));
router.put('/conversations/:conversationId', chatController.updateConversation.bind(chatController));
router.delete('/conversations/:conversationId', chatController.deleteConversation.bind(chatController));
router.post('/conversations/:conversationId/archive', chatController.archiveConversation.bind(chatController));
router.post('/conversations/:conversationId/unarchive', chatController.unarchiveConversation.bind(chatController));

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages.bind(chatController));
router.post('/conversations/:conversationId/messages', chatController.sendMessage.bind(chatController));

export default router;
