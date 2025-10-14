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
import helmet from 'helmet';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

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

export class ChatController {
  private sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove any potential XSS vectors
    const sanitized = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Additional validation
    if (sanitized.length > 10000) {
      throw new Error('Input too long');
    }
    
    return sanitized.trim();
  }

  private validateUserId(userId: any): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    
    // Validate UUID format
    if (!validator.isUUID(userId)) {
      throw new Error('Invalid user ID format');
    }
    
    return userId;
  }

  private validateConversationId(conversationId: any): string {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Invalid conversation ID');
    }
    
    // Validate UUID format
    if (!validator.isUUID(conversationId)) {
      throw new Error('Invalid conversation ID format');
    }
    
    return conversationId;
  }

  // Trial chat handler (no auth required)
  async trialChat(req: Request, res: Response) {
    try {
      const { message, history = [], attachments = [], webSearch = false, thinking = false } = req.body;

      const sanitizedMessage = this.sanitizeInput(message);
      if (!sanitizedMessage) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Validate and sanitize history
      const sanitizedHistory = Array.isArray(history) ? history.slice(0, 20).map(msg => ({
        role: ['user', 'assistant', 'system'].includes(msg.role) ? msg.role : 'user',
        content: this.sanitizeInput(msg.content)
      })).filter(msg => msg.content) : [];

      // Validate attachments
      const validatedAttachments = Array.isArray(attachments) ? attachments.slice(0, 5).filter(att => 
        att && typeof att === 'object' && 
        ['image', 'document'].includes(att.type) &&
        att.data && typeof att.data === 'string' &&
        att.data.length < 10 * 1024 * 1024 // 10MB limit
      ) : [];

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
          systemPrompt += '\n\nSearch Results:\n' + this.sanitizeInput(searchResults);
        } catch (error) {
          console.error('Trial search error:', error);
          // Continue without search results
        }
      }
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });

      // Add history
      for (const msg of sanitizedHistory) {
        messages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        });
      }

      // Add current message with attachments if any
      if (validatedAttachments && validatedAttachments.length > 0) {
        const contentParts: any[] = [{ type: 'text', text: sanitizedMessage }];
        
        // Add image attachments
        for (const attachment of validatedAttachments) {
          if (attachment.type === 'image' && attachment.data) {
            // Validate base64 image data
            if (validator.isBase64(attachment.data)) {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: `data:${validator.escape(attachment.mimeType || 'image/jpeg')};base64,${attachment.data}`
                }
              });
            }
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

      // Set up SSE headers with security headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

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
          temperature: Math.max(0.1, Math.min(1.0, 0.7)), // Clamp temperature
          max_tokens: Math.min(isThinkingModel ? 4000 : 1024, 8192), // Limit max tokens
          stream: true,
          ...(supportsThinking && { thinking: true })
        },
        async (chunk) => {
          // Handle streaming chunk
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
            const delta = chunk.choices[0].delta;
            
            // Handle regular content
            if (delta.content) {
              const sanitizedContent = this.sanitizeInput(delta.content);
              
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
              const sanitizedThinking = this.sanitizeInput(delta.thinking);
              fullThinking += sanitizedThinking;
              res.write(`data: ${JSON.stringify({ thinking: sanitizedThinking })}\n\n`);
            }
          }
        },
        (error) => {
          // Handle error
          console.error('Trial chat streaming error:', error);
          res.write(`data: ${JSON.stringify({ error: 'An error occurred while processing your request' })}\n\n`);
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
      const userId = this.validateUserId((req as any).user?.userId);
      const conversations = await ConversationModel.findByUserId(userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  // Create a new conversation
  async createConversation(req: AuthRequest, res: Response) {
    try {
      console.log('Create conversation request - user object:', (req as any).user);
      const userId = this.validateUserId((req as any).user?.userId);
      console.log('Extracted userId:', userId);
      
      const { title, model, temperature, max_tokens, system_prompt } = req.body;

      // Validate and sanitize inputs
      const sanitizedTitle = this.sanitizeInput(title);
      const sanitizedModel = this.sanitizeInput(model);
      const sanitizedSystemPrompt = this.sanitizeInput(system_prompt);
      
      // Validate numeric inputs
      const validTemperature = temperature ? Math.max(0.1, Math.min(2.0, parseFloat(temperature))) : undefined;
      const validMaxTokens = max_tokens ? Math.max(1, Math.min(32768, parseInt(max_tokens))) : undefined;

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
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  // Get a specific conversation
  async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = this.validateUserId((req as any).user?.userId);
      const conversationId = this.validateConversationId(req.params.conversationId);

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
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  }

  // Update a conversation
  async updateConversation(req: AuthRequest, res: Response) {
    try {
      const userId = this.validateUserId((req as any).user?.userId);
      const conversationId = this.validateConversationId(req.params.conversationId);
      const updates = req.body;

      // Sanitize update fields
      const sanitizedUpdates: any = {};
      if (updates.title) sanitizedUpdates.title = this.sanitizeInput(updates.title);
      if (updates.model) sanitizedUpdates.model = this.sanitizeInput(updates.model);
      if (updates.system_prompt) sanitizedUpdates.system_prompt = this.sanitizeInput(updates.system_prompt);
      if (updates.temperature) sanitizedUpdates.temperature = Math.max(0.1, Math.min(2.0, parseFloat(updates.temperature)));
      if (updates.max_tokens) sanitizedUpdates.max_tokens = Math.max(1, Math.min(32768, parseInt(updates.max_tokens)));

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = await ConversationModel.update(conversationId, sanitizedUpdates);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update conversation' });
    }
  }

  // Delete a conversation
  async deleteConversation(req: AuthRequest, res: Response) {
    try {
      const userId = this.validateUserId((req as any).user?.userId);
      const conversationId = this.validateConversationId(req.params.conversationId);

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
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }

  // Get messages for a conversation
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = this.validateUserId((req as any).user?.userId);
      const conversationId = this.validateConversationId(req.params.conversationId);
      
      // Validate and sanitize query parameters
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 100), 1000);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await MessageModel.findByConversationId(
        conversationId,
        limit,
        offset
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
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Send a message and get AI response
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = this.validateUserId((req as any).user?.userId);
      const conversationId = this.validateConversationId(req.params.conversationId);
      const { content } = req.body;

      const sanitizedContent = this.sanitizeInput(content);
      if (!sanitizedContent) {
        return res.status(400).json({ error: 'Message content is required' });
      }

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
      let systemPrompt = this.sanitizeInput(conversation.system_prompt || '');
      
      // Add Chat by Novita AI branding with model info
      const modelName = this.sanitizeInput(conversation.model || 'GPT-4');
      const novitaBranding = `I am Chat, an AI assistant offered by Novita AI. I am powered by the ${modelName} model. I am a helpful, knowledgeable AI assistant designed to provide accurate, helpful, and engaging responses while maintaining a professional and friendly tone.`;
      systemPrompt = novitaBranding + '\n\n' + systemPrompt;
      
      if (contextData.summary) {
        systemPrompt += '\n\nConversation Context: ' + this.sanitizeInput(contextData.summary);
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
        content: this.sanitizeInput(msg.content)
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
        ? this.sanitizeInput(aiContent)
        : Array.isArray(aiContent) ? aiContent.map(part => this.sanitizeInput(part.text || '')).join('') : '';

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
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
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
      // Validate and sanitize inputs
      const userId = this.validateUserId(data.userId);
      const conversationId = this.validateConversationId(data.conversationId);
      const content = this.sanitizeInput(data.content);
      
      if (!content) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Validate attachments
      const attachments = Array.isArray(data.attachments) ? 
        data.attachments.slice(0, 10).filter(att => 
          att && typeof att === 'object' && 
          ['image', 'document'].includes(att.type) &&
          att.data && typeof att.data === 'string' &&
          validator.isBase64(att.data) &&
          att.data.length < 50 * 1024 * 1024 // 50MB limit
        ) : [];

      const { webSearch, deepResearch, thinking } = data;

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

      // Extract style if provided
      let styleSystemPrompt = '';
      if (data.style && data.style.systemPrompt) {
        styleSystemPrompt = this.sanitizeInput(data.style.systemPrompt);
      }

      // Prepare metadata for user message
      const userMessageMetadata: any = {};
      if (webSearch) userMessageMetadata.webSearch = true;
      if (deepResearch) userMessageMetadata.deepResearch = true;
      if (attachments && attachments.length > 0) {
        userMessageMetadata.hasAttachments = true;
        userMessageMetadata.attachmentCount = attachments.length;
      }

      // Save user message
      const userMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: content,
        metadata: userMessageMetadata
      });

      // Save attachments if any
      const savedAttachments: any[] = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const savedAttachment = await MessageModel.addAttachment(userMessage.id, {
            filename: this.sanitizeInput(attachment.name),
            mime_type: this.sanitizeInput(attachment.mimeType),
            size: Math.min(attachment.size, 100 * 1024 * 1024), // 100MB max
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
          const allMessages = await MessageModel.findByConversationId(conversationId, 20, 0);
          context = allMessages.map(msg => ({
            role: msg.role,
            content: this.sanitizeInput(msg.content),
            attachments: []
          }));
          console.log('Fallback - retrieved messages:', context.length);
        }
      } catch (error) {
        console.error('ERROR: Error retrieving context:', error);
        // Try basic message retrieval as last resort
        try {
          const basicMessages = await MessageModel.findByConversationId(conversationId, 10, 0);
          context = basicMessages.map(msg => ({
            role: msg.role,
            content: this.sanitizeInput(msg.content),
            attachments: []
          }));
          console.log('Emergency fallback - retrieved messages:', context.length);
        } catch (fallbackError) {
          console.error('ERROR: Emergency fallback also failed:', fallbackError);
          context = []; // Absolutely final fallback
        }
      }

      // Perform web search or deep research if requested
      let searchResults = '';
      let linkPreviews: any[] = [];
      
      if (webSearch || deepResearch) {
        try {
          // Create a search progress message
          const searchMessage = await MessageModel.create({
            conversation_id: conversationId,
            user_id: userId,
            role: 'system',
            content: