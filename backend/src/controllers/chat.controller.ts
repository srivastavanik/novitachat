import { Request, Response } from 'express';
import { Socket } from 'socket.io';
import novitaService from '../services/novita.service';
import searchService from '../services/search.service';
import { ConversationModel } from '../models/Conversation';
import { MessageModel } from '../models/Message';
import { AuthRequest } from '../types/auth';
import { updateUsage, hasRemainingQuota } from '../routes/usage.routes';
import { getUserApiKey } from '../routes/apikey.routes';
import rateLimit from 'express-rate-limit';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Rate limiting middleware
export const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many chat requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const trialChatRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 trial requests per hour
  message: 'Trial chat limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation and sanitization helpers
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(validator.escape(input.trim()));
};

const validateMessageContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  const sanitized = content.trim();
  return sanitized.length > 0 && sanitized.length <= 50000; // Max 50k chars
};

const validateConversationId = (id: string): boolean => {
  return validator.isUUID(id);
};

const validateUserId = (id: string): boolean => {
  return validator.isUUID(id);
};

export class ChatController {
  // Trial chat handler (no auth required)
  async trialChat(req: Request, res: Response) {
    try {
      const { message, history = [], attachments = [], webSearch = false, thinking = false } = req.body;

      // Input validation
      if (!validateMessageContent(message)) {
        return res.status(400).json({ error: 'Invalid message content' });
      }

      const sanitizedMessage = sanitizeInput(message);

      // Validate history array
      if (!Array.isArray(history) || history.length > 50) {
        return res.status(400).json({ error: 'Invalid history format or too many messages' });
      }

      // Validate and sanitize history
      const sanitizedHistory = history.map(msg => ({
        role: ['user', 'assistant', 'system'].includes(msg.role) ? msg.role : 'user',
        content: sanitizeInput(msg.content || '')
      })).filter(msg => msg.content.length > 0);

      // Validate attachments
      if (!Array.isArray(attachments) || attachments.length > 10) {
        return res.status(400).json({ error: 'Invalid attachments or too many files' });
      }

      // Build messages array
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<any> }> = [];
      
      let systemPrompt = 'I am Chat, an AI assistant offered by Novita AI. I am a helpful AI assistant designed to keep my responses concise and helpful.';
      
      // Handle web search if requested
      let searchResults = '';
      if (webSearch) {
        try {
          console.log('Performing web search for trial user:', sanitizedMessage);
          // Simple web search without progress callbacks for trial
          searchResults = await searchService.webSearch(sanitizedMessage, 5);
          systemPrompt += '\n\nYou have access to web search results. Use this information to provide accurate, up-to-date responses. When citing sources, format them as clickable links using markdown: [Source Title](URL).';
          systemPrompt += '\n\nSearch Results:\n' + DOMPurify.sanitize(searchResults);
        } catch (error) {
          console.error('Trial search error:', error);
          // Continue without search results
        }
      }
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });

      // Add sanitized history
      for (const msg of sanitizedHistory) {
        messages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        });
      }

      // Add current message with attachments if any
      if (attachments && attachments.length > 0) {
        const contentParts: any[] = [{ type: 'text', text: sanitizedMessage }];
        
        // Add image attachments with validation
        for (const attachment of attachments) {
          if (attachment.type === 'image' && attachment.data) {
            // Validate base64 data
            if (!validator.isBase64(attachment.data)) {
              continue; // Skip invalid base64 data
            }
            
            const mimeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(attachment.mimeType) 
              ? attachment.mimeType 
              : 'image/jpeg';
            
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${attachment.data}`
              }
            });
          }
        }
        
        messages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        messages.push({
          role: 'user',
          content: sanitizedMessage
        });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Check if model supports thinking (use a thinking model for trial)
      const model = 'openai/gpt-oss-20b';  // Use GPT OSS 20B for trial (supports thinking)
      const isThinkingModel = (
        model.includes('thinking') || 
        model.includes('gpt-oss') ||  // GPT OSS models support thinking
        model.includes('deepseek-r1') ||
        model.includes('glm-4.1v-9b-thinking') ||
        model.includes('qwen3-235b-a22b-thinking') ||
        model.includes('qwen-2.5-72b-instruct-thinking') ||
        model.includes('kimi-k2') ||
        model.includes('kimi/k2') ||
        model.includes('reflection') ||
        model.includes('reasoning')
      );
      
      const supportsThinking = isThinkingModel;

      let isInThinkingBlock = false;
      let fullContent = '';
      let fullThinking = '';

      // Stream response
      await novitaService.createChatCompletionStream(
        {
          model,
          messages,
          temperature: Math.max(0.1, Math.min(2.0, 0.7)), // Clamp temperature
          max_tokens: Math.max(100, Math.min(4000, isThinkingModel ? 4000 : 1024)), // Clamp max_tokens
          stream: true,
          ...(supportsThinking && { thinking: true })
        },
        async (chunk) => {
          // Handle streaming chunk
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
            const delta = chunk.choices[0].delta;
            
            // Handle regular content
            if (delta.content) {
              const sanitizedContent = DOMPurify.sanitize(delta.content);
              
              // Parse content to separate thinking from regular response
              if (supportsThinking) {
                let remainingContent = sanitizedContent;
                let regularChunk = '';
                
                while (remainingContent.length > 0) {
                  if (isInThinkingBlock) {
                    // We're inside a thinking block, look for the end tag
                    const endIndex = remainingContent.indexOf('</think>');
                    if (endIndex !== -1) {
                      // Found the end tag
                      const thinkingChunk = remainingContent.substring(0, endIndex);
                      if (thinkingChunk) {
                        fullThinking += thinkingChunk;
                        res.write(`data: ${JSON.stringify({ thinking: thinkingChunk })}\n\n`);
                      }
                      isInThinkingBlock = false;
                      remainingContent = remainingContent.substring(endIndex + 8); // Skip </think>
                    } else {
                      // No end tag in this chunk, entire content is thinking
                      fullThinking += remainingContent;
                      res.write(`data: ${JSON.stringify({ thinking: remainingContent })}\n\n`);
                      remainingContent = '';
                    }
                  } else {
                    // Not in thinking block, look for start tag
                    const startIndex = remainingContent.indexOf('<think>');
                    if (startIndex !== -1) {
                      // Found start tag
                      const beforeThinking = remainingContent.substring(0, startIndex);
                      if (beforeThinking) {
                        regularChunk += beforeThinking;
                      }
                      isInThinkingBlock = true;
                      remainingContent = remainingContent.substring(startIndex + 7); // Skip <think>
                    } else {
                      // No thinking tag in remaining content
                      regularChunk += remainingContent;
                      remainingContent = '';
                    }
                  }
                }
                
                // Send any accumulated regular content
                if (regularChunk) {
                  fullContent += regularChunk;
                  res.write(`data: ${JSON.stringify({ content: regularChunk })}\n\n`);
                }
              } else {
                // No thinking support - just send as regular content
                fullContent += sanitizedContent;
                res.write(`data: ${JSON.stringify({ content: sanitizedContent })}\n\n`);
              }
            }
            
            // Handle thinking content from delta (if API provides it separately)
            if (delta.thinking && supportsThinking) {
              const sanitizedThinking = DOMPurify.sanitize(delta.thinking);
              fullThinking += sanitizedThinking;
              res.write(`data: ${JSON.stringify({ thinking: sanitizedThinking })}\n\n`);
            }
          }
        },
        (error) => {
          // Handle error
          console.error('Trial chat streaming error:', error);
          const sanitizedError = sanitizeInput(error.message || 'Unknown error');
          res.write(`data: ${JSON.stringify({ error: sanitizedError })}\n\n`);
          res.end();
        },
        async () => {
          // Handle completion
          res.write('data: [DONE]\n\n');
          res.end();
        }
      );
    } catch (error) {
      console.error('Trial chat error:', error);
      res.status(500).json({ error: 'Failed to process trial chat' });
    }
  }

  // Get all conversations for the authenticated user
  async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const conversations = await ConversationModel.findByUserId(userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  // Create a new conversation
  async createConversation(req: AuthRequest, res: Response) {
    try {
      console.log('Create conversation request - user object:', (req as any).user);
      const userId = (req as any).user?.userId;
      console.log('Extracted userId:', userId);
      
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { title, model, temperature, max_tokens, system_prompt } = req.body;

      // Input validation and sanitization
      const sanitizedTitle = sanitizeInput(title || 'New Chat');
      const sanitizedModel = sanitizeInput(model || 'gpt-3.5-turbo');
      const sanitizedSystemPrompt = sanitizeInput(system_prompt || '');
      
      // Validate numeric inputs
      const validTemperature = temperature !== undefined ? 
        Math.max(0.1, Math.min(2.0, parseFloat(temperature) || 0.7)) : 0.7;
      const validMaxTokens = max_tokens !== undefined ? 
        Math.max(100, Math.min(8192, parseInt(max_tokens) || 2048)) : 2048;

      const conversation = await ConversationModel.create({
        user_id: userId,
        title: sanitizedTitle,
        model: sanitizedModel,
        temperature: validTemperature,
        max_tokens: validMaxTokens,
        system_prompt: sanitizedSystemPrompt
      });

      res.status(201).json({ conversation });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  // Get a specific conversation
  async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

      if (!validateConversationId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  }

  // Update a conversation
  async updateConversation(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      
      if (!validateConversationId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Sanitize updates
      const updates = req.body;
      const sanitizedUpdates: any = {};
      
      if (updates.title) {
        sanitizedUpdates.title = sanitizeInput(updates.title);
      }
      if (updates.model) {
        sanitizedUpdates.model = sanitizeInput(updates.model);
      }
      if (updates.system_prompt) {
        sanitizedUpdates.system_prompt = sanitizeInput(updates.system_prompt);
      }
      if (updates.temperature !== undefined) {
        sanitizedUpdates.temperature = Math.max(0.1, Math.min(2.0, parseFloat(updates.temperature) || 0.7));
      }
      if (updates.max_tokens !== undefined) {
        sanitizedUpdates.max_tokens = Math.max(100, Math.min(8192, parseInt(updates.max_tokens) || 2048));
      }

      const conversation = await ConversationModel.update(conversationId, sanitizedUpdates);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ error: 'Failed to update conversation' });
    }
  }

  // Delete a conversation
  async deleteConversation(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

      if (!validateConversationId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Delete all messages first
      await MessageModel.deleteByConversationId(conversationId);

      // Then delete the conversation
      const deleted = await ConversationModel.delete(conversationId);
      if (!deleted) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }

  // Get messages for a conversation
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      if (!validateConversationId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      // Validate and sanitize pagination parameters
      const validLimit = Math.max(1, Math.min(1000, parseInt(limit as string) || 100));
      const validOffset = Math.max(0, parseInt(offset as string) || 0);

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await MessageModel.findByConversationId(
        conversationId,
        validLimit,
        validOffset
      );

      // Load attachments for each message
      const messagesWithAttachments = await Promise.all(
        messages.map(async (message) => {
          const attachments = await MessageModel.getAttachments(message.id);
          return { ...message, attachments };
        })
      );

      res.json({ messages: messagesWithAttachments });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Send a message and get AI response
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId || !validateUserId(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      const { content } = req.body;

      if (!validateConversationId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      if (!validateMessageContent(content)) {
        return res.status(400).json({ error: 'Invalid message content' });
      }

      const sanitizedContent = sanitizeInput(content);

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Get conversation details
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Save user message
      const userMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: sanitizedContent
      });

      // Get advanced priority-based conversation context
      const contextData = await MessageModel.getContextWithSummary(conversationId, 4000);
      const context = contextData.context;
      
      // Prepare system prompt with conversation summary if available
      let systemPrompt = sanitizeInput(conversation.system_prompt || '');
      
      // Add Chat by Novita AI branding with model info
      const modelName = sanitizeInput(conversation.model || 'GPT-4');
      const novitaBranding = `I am Chat, an AI assistant offered by Novita AI. I am powered by the ${modelName} model. I am a helpful, knowledgeable AI assistant designed to provide accurate, helpful, and engaging responses while maintaining a professional and friendly tone.`;
      systemPrompt = novitaBranding + '\n\n' + systemPrompt;
      
      if (contextData.summary) {
        systemPrompt += '\n\nConversation Context: ' + DOMPurify.sanitize(contextData.summary);
      }

      // Add system prompt if it exists
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add context messages with proper type casting and sanitization
      messages.push(...context.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: DOMPurify.sanitize(msg.content)
      })));

      // Call Novita AI
      const aiResponse = await novitaService.createChatCompletion({
        model: conversation.model,
        messages,
        temperature: conversation.temperature,
        max_tokens: conversation.max_tokens || undefined
      });

      // Extract content from AI response with null safety
      if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
        throw new Error('Invalid AI response structure');
      }
      
      const aiContent = aiResponse.choices[0].message.content;
      const contentString = typeof aiContent === 'string' 
        ? DOMPurify.sanitize(aiContent)
        : Array.isArray(aiContent) ? DOMPurify.sanitize(aiContent.map(part => part.text || '').join('')) : '';

      // Save AI response
      const assistantMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: contentString,
        model: conversation.model,
        token_count: aiResponse.usage.total_tokens
      });

      // Update conversation's last message timestamp
      await ConversationModel.updateLastMessageAt(conversationId);

      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // WebSocket handler for streaming chat
  async handleStreamingChat(socket: Socket, data: {
    conversationId: string;
    content: string;
    userId: string;
    attachments?: Array<{
      name: string;
      type: 'image' | 'document';
      mimeType: string;
      size: number;
      data: string; // base64
    }>;
    webSearch?: boolean;
    deepResearch?: boolean;
    thinking?: boolean;
    useUserKey?: boolean;
    userApiKey?: string;
    useNovitaKey?: boolean;
    style?: {
      systemPrompt: string;
    };
  }) {
    try {
      const { conversationId, content, userId, attachments, webSearch, deepResearch, thinking } = data;

      // Input validation
      if (!validateUserId(userId) || !validateConversationId(conversationId) || !validateMessageContent(content)) {
        socket.emit('error', { message: 'Invalid input parameters' });
        return;
      }

      const sanitizedContent = sanitizeInput(content);

      // Check rate limits only if using Novita platform key (not user's own key)
      if (!data.useUserKey) {
        let usageType: 'total' | 'webSearch' | 'deepResearch' = 'total';
        if (deepResearch) usageType = 'deepResearch';
        else if (webSearch) usageType = 'webSearch';
        
        const hasQuota = await hasRemainingQuota(userId, usageType);
        if (!hasQuota) {
          let errorMessage = 'Daily usage limit exceeded.';
          if (usageType === 'deepResearch') {
            errorMessage = 'Daily deep research limit exceeded. You can use up to 3 deep research queries per day.';
          } else if (usageType === 'webSearch') {
            errorMessage = 'Daily web search limit exceeded. You can use up to 20 web search queries per day.';
          } else {
            errorMessage = 'Daily usage limit exceeded. You can use up to 100 queries per day.';
          }
          
          socket.emit('error', { 
            message: errorMessage,
            type: 'rate_limit_exceeded',
            usageType: usageType
          });
          return;
        }
      }

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Get conversation details
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Extract and sanitize style if provided
      let styleSystemPrompt = '';
      if (data.style && data.style.systemPrompt) {
        styleSystemPrompt = sanitizeInput(data.style.systemPrompt);
      }

      // Validate and sanitize attachments
      const validatedAttachments: any[] = [];
      if (attachments && Array.isArray(attachments) && attachments.length <= 10) {
        for (const attachment of attachments) {
          if (attachment.name && attachment.type && attachment.mimeType && attachment.data) {
            // Validate base64 data
            if (!validator.isBase64(attachment.data)) {
              continue; // Skip invalid base64 data
            }
            
            // Validate file size (max 10MB)
            if (attachment.size > 10 * 1024 * 1024) {
              continue; // Skip files larger than 10MB
            }
            
            // Validate MIME types
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const allowedDocTypes = ['text/plain', 'application/pdf', 'text/csv'];
            
            if (attachment.type === 'image' && !allowedImageTypes.includes(attachment.mimeType)) {
              continue; // Skip invalid image types
            }
            
            if (attachment.type === 'document' && !allowedDocTypes.includes(attachment.mimeType)) {
              continue; // Skip invalid document types
            }
            
            validatedAttachments.push({
              name: sanitizeInput(attachment.name),
              type: attachment.type,
              mimeType: attachment.mimeType,
              size: attachment.size,
              data: attachment.data
            });
          }
        }
      }

      // Prepare metadata for user message
      const userMessageMetadata: any = {};
      if (webSearch) userMessageMetadata.webSearch = true;
      if (deepResearch) userMessageMetadata.deepResearch = true;
      if (validatedAttachments && validatedAttachments.length > 0) {
        userMessageMetadata.hasAttachments = true;
        userMessageMetadata.attachmentCount = validatedAttachments.length;
      }

      // Save user message
      const userMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: sanitizedContent,
        metadata: userMessageMetadata
      });

      // Save attachments if any
      const savedAttachments: any[] = [];
      if (validatedAttachments && validatedAttachments.length > 0) {
        for (const attachment of validatedAttachments) {
          const savedAttachment = await MessageModel.addAttachment(userMessage.id, {
            filename: attachment.name,
            mime_type: attachment.mimeType,
            size: attachment.size,
            type: attachment.type,
            data: attachment.data
          });
          if (savedAttachment) {
            savedAttachments.push(savedAttachment);
          }
        }
      }

      // Get user message with properly saved attachments for frontend display
      const userMessageWithAttachments = {
        ...userMessage,
        attachments: savedAttachments
      };
      
      socket.emit('user_message_saved', { message: userMessageWithAttachments });

      // Check if this is the first message and update title
      const messageCount = await MessageModel.countByConversationId(conversationId);
      const shouldUpdateTitle = messageCount === 1 && conversation.title === 'New Chat';

      // Get conversation context
      let context: Array<{ role: string; content: string; attachments?: any[] }> = [];
      
      try {
        // Get context AFTER saving the user message to include full conversation history
        context = await MessageModel.getConversationContext(conversationId, 30, 4000);
        console.log('Retrieved context messages:', context.length);
        
        // If still no context, try alternative method
        if (context.length === 0) {
          const allMessages = await MessageModel.findByConversationId(conversationId,