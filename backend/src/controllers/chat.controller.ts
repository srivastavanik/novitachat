import { Request, Response } from 'express';
import { Socket } from 'socket.io';
import novitaService from '../services/novita.service';
import searchService from '../services/search.service';
import { ConversationModel } from '../models/Conversation';
import { MessageModel } from '../models/Message';
import { AuthRequest } from '../types/auth';
import { updateUsage, hasRemainingQuota } from '../routes/usage.routes';
import { getUserApiKey } from '../routes/apikey.routes';

export class ChatController {
  // Trial chat handler (no auth required)
  async trialChat(req: Request, res: Response) {
    try {
      const { message, history = [], attachments = [], webSearch = false, thinking = false } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Build messages array
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<any> }> = [];
      
      let systemPrompt = 'I am Chat, an AI assistant offered by Novita AI. I am a helpful AI assistant designed to keep my responses concise and helpful.';
      
      // Handle web search if requested
      let searchResults = '';
      if (webSearch) {
        try {
          console.log('Performing web search for trial user:', message);
          // Simple web search without progress callbacks for trial
          searchResults = await searchService.webSearch(message, 5);
          systemPrompt += '\n\nYou have access to web search results. Use this information to provide accurate, up-to-date responses. When citing sources, format them as clickable links using markdown: [Source Title](URL).';
          systemPrompt += '\n\nSearch Results:\n' + searchResults;
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
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }

      // Add current message with attachments if any
      if (attachments && attachments.length > 0) {
        const contentParts: any[] = [{ type: 'text', text: message.trim() }];
        
        // Add image attachments
        for (const attachment of attachments) {
          if (attachment.type === 'image' && attachment.data) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.data}`
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
          content: message.trim()
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
          temperature: 0.7,
          max_tokens: isThinkingModel ? 4000 : 1024,
          stream: true,
          ...(supportsThinking && { thinking: true })
        },
        async (chunk) => {
          // Handle streaming chunk
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
            const delta = chunk.choices[0].delta;
            
            // Handle regular content
            if (delta.content) {
              // Parse content to separate thinking from regular response
              if (supportsThinking) {
                let remainingContent = delta.content;
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
                fullContent += delta.content;
                res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
              }
            }
            
            // Handle thinking content from delta (if API provides it separately)
            if (delta.thinking && supportsThinking) {
              fullThinking += delta.thinking;
              res.write(`data: ${JSON.stringify({ thinking: delta.thinking })}\n\n`);
            }
          }
        },
        (error) => {
          // Handle error
          console.error('Trial chat streaming error:', error);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
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
      if (!userId) {
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
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { title, model, temperature, max_tokens, system_prompt } = req.body;

      const conversation = await ConversationModel.create({
        user_id: userId,
        title,
        model,
        temperature,
        max_tokens,
        system_prompt
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
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

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
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      const updates = req.body;

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = await ConversationModel.update(conversationId, updates);
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
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

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
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await MessageModel.findByConversationId(
        conversationId,
        Number(limit),
        Number(offset)
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
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;
      const { content } = req.body;

      if (!content || content.trim() === '') {
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
        content: content.trim()
      });

      // Get advanced priority-based conversation context
      const contextData = await MessageModel.getContextWithSummary(conversationId, 4000);
      const context = contextData.context;
      
      // Prepare system prompt with conversation summary if available
      let systemPrompt = conversation.system_prompt || '';
      
      // Add Chat by Novita AI branding with model info
      const modelName = conversation.model || 'GPT-4';
      const novitaBranding = `I am Chat, an AI assistant offered by Novita AI. I am powered by the ${modelName} model. I am a helpful, knowledgeable AI assistant designed to provide accurate, helpful, and engaging responses while maintaining a professional and friendly tone.`;
      systemPrompt = novitaBranding + '\n\n' + systemPrompt;
      
      if (contextData.summary) {
        systemPrompt += '\n\nConversation Context: ' + contextData.summary;
      }

      // Add system prompt if it exists
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add context messages with proper type casting
      messages.push(...context.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
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
        ? aiContent 
        : Array.isArray(aiContent) ? aiContent.map(part => part.text || '').join('') : '';

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
        styleSystemPrompt = data.style.systemPrompt;
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
        content: content.trim(),
        metadata: userMessageMetadata
      });

      // Save attachments if any
      const savedAttachments: any[] = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
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
          const allMessages = await MessageModel.findByConversationId(conversationId, 20, 0);
          context = allMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
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
            content: msg.content,
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
            content: deepResearch ? 'Performing deep research...' : 'Performing web search...',
            metadata: { isSearchProgress: true }
          });

          socket.emit('search_progress', { 
            messageId: searchMessage.id,
            message: searchMessage 
          });

          const progressCallback = (update: string, links?: any[]) => {
            socket.emit('search_update', {
              messageId: searchMessage.id,
              update,
              links
            });
            
            // Collect link previews
            if (links) {
              linkPreviews = [...linkPreviews, ...links];
            }
          };

          if (deepResearch) {
            console.log('Performing deep research for:', content);
            const deepResearchResult = await searchService.deepResearch(content, progressCallback);
            searchResults = deepResearchResult.content;
            // Add the unique sources to link previews
            if (deepResearchResult.sources) {
              linkPreviews = [...linkPreviews, ...deepResearchResult.sources];
            }
          } else if (webSearch) {
            console.log('Performing web search for:', content);
            searchResults = await searchService.webSearch(content, 5, progressCallback);
          }

          // Update search message with results summary
          const finalUpdate = deepResearch 
            ? 'Deep research completed! Analyzed multiple sources to provide comprehensive insights.'
            : 'Web search completed! Results from top sources included in response.';
          
          socket.emit('search_update', {
            messageId: searchMessage.id,
            update: `\n${finalUpdate}`,
            isComplete: true
          });
          
          // Final update to the message
          await MessageModel.update(searchMessage.id, {
            content: (await MessageModel.findById(searchMessage.id))?.content + `\n${finalUpdate}`,
            metadata: { 
              isSearchProgress: true,
              isComplete: true
            }
          });

        } catch (error) {
          console.error('Search error:', error);
          searchResults = 'Search failed. Proceeding with general knowledge.';
        }
      }

      // Check if model supports thinking (expanded list)  
      const isThinkingModel = (
        conversation.model.includes('thinking') || 
        conversation.model.includes('gpt-oss') ||  // GPT OSS models support thinking
        conversation.model.includes('deepseek-r1') ||
        conversation.model.includes('glm-4.1v-9b-thinking') ||
        conversation.model.includes('qwen3-235b-a22b-thinking') ||
        conversation.model.includes('qwen-2.5-72b-instruct-thinking') ||
        conversation.model.includes('kimi-k2') ||
        conversation.model.includes('kimi/k2') ||
        conversation.model.includes('reflection') ||
        conversation.model.includes('reasoning')
      );
      
      // Enable thinking for thinking models
      const supportsThinking = isThinkingModel;

      // Create thinking message if enabled (not saved to DB)
      let thinkingMessageId: string | null = null;
      if (supportsThinking) {
        thinkingMessageId = `thinking-${Date.now()}`;
        
        socket.emit('thinking_start', {
          messageId: thinkingMessageId
        });
      }

      // Build messages array with enhanced context
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<any> }> = [];
      
      // Add system prompt with search instructions if needed
      let systemPrompt = conversation.system_prompt || '';
      
      // Add Chat by Novita AI branding with model info
      const modelName = conversation.model || 'GPT-4';
      const novitaBranding = `I am Chat, an AI assistant offered by Novita AI. I am powered by the ${modelName} model. I am a helpful, knowledgeable AI assistant designed to provide accurate, helpful, and engaging responses while maintaining a professional and friendly tone.`;
      
      // Add style system prompt if provided
      if (styleSystemPrompt) {
        systemPrompt = novitaBranding + '\n\n' + styleSystemPrompt + '\n\n' + systemPrompt;
      } else {
        systemPrompt = novitaBranding + '\n\n' + systemPrompt;
      }
      
      if (searchResults) {
        systemPrompt += '\n\nYou have access to web search results. Use this information to provide accurate, up-to-date responses. When citing sources, format them as clickable links using markdown: [Source Title](URL). Always include the specific sources you reference.';
        systemPrompt += '\n\nSearch Results:\n' + searchResults;
      }
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add context messages
      for (const msg of context) {
        // For user messages with attachments, format content appropriately
        if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
          const contentParts: any[] = [{ type: 'text', text: msg.content }];
          
          // Add attachments to content
          for (const attachment of msg.attachments) {
            if (attachment.type === 'image' && attachment.data) {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: `data:${attachment.mime_type};base64,${attachment.data}`
                }
              });
            } else if (attachment.type === 'document' && attachment.data) {
              // For documents in history, add them as text content with file info
              let documentText = `\n\n[DOCUMENT: ${attachment.filename}]\n`;
              
              // Try to extract text content from common formats
              if (attachment.mime_type === 'text/plain' || attachment.filename?.endsWith('.txt')) {
                // Plain text file - decode base64
                try {
                  const textContent = Buffer.from(attachment.data, 'base64').toString('utf-8');
                  documentText += `Content:\n${textContent}\n[END DOCUMENT]\n\n`;
                } catch (error) {
                  documentText += `[Could not read text content]\n[END DOCUMENT]\n\n`;
                }
              } else if (attachment.mime_type === 'application/pdf' || attachment.filename?.endsWith('.pdf')) {
                // PDF file - inform about the document
                documentText += `[PDF Document - ${Math.round(attachment.size / 1024)}KB]\n`;
                documentText += `Please note: This is a PDF document that was previously uploaded.\n[END DOCUMENT]\n\n`;
              } else {
                // Other document types
                documentText += `[${attachment.mime_type || 'Unknown'} - ${Math.round(attachment.size / 1024)}KB]\n`;
                documentText += `Document type: ${attachment.mime_type || 'Unknown'}\n[END DOCUMENT]\n\n`;
              }
              
              // Add document info to the text content
              contentParts[0].text += documentText;
            }
          }
          
          messages.push({
            role: 'user',
            content: contentParts.length > 1 ? contentParts : msg.content
          });
        } else {
          messages.push({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          });
        }
      }

      // Add the current user message with attachments to the messages array
      if (attachments && attachments.length > 0) {
        console.log('Processing attachments for model:', conversation.model);
        console.log('Attachments received:', attachments.map(att => ({
          name: att.name,
          type: att.type,
          mimeType: att.mimeType,
          size: att.size,
          hasData: !!att.data
        })));

        const contentParts: any[] = [{ type: 'text', text: content }];
        
        // Add attachments to content
        for (const attachment of attachments) {
          if (attachment.type === 'image' && attachment.data) {
            console.log('Adding image attachment:', attachment.name);
            // Add image attachments as image_url
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.data}`
              }
            });
          } else if (attachment.type === 'document' && attachment.data) {
            console.log('Adding document attachment:', attachment.name);
            // For documents, add them as text content with file info
            let documentText = `\n\n[DOCUMENT: ${attachment.name}]\n`;
            
            // Try to extract text content from common formats
            if (attachment.mimeType === 'text/plain' || attachment.name?.endsWith('.txt')) {
              // Plain text file - decode base64
              try {
                const textContent = Buffer.from(attachment.data, 'base64').toString('utf-8');
                documentText += `Content:\n${textContent}\n[END DOCUMENT]\n\n`;
              } catch (error) {
                documentText += `[Could not read text content]\n[END DOCUMENT]\n\n`;
              }
            } else if (attachment.mimeType === 'application/pdf' || attachment.name?.endsWith('.pdf')) {
              // PDF file - extract text server-side for text-only models
              try {
                const pdfBuffer = Buffer.from(attachment.data, 'base64');
                const pdfParse = (await import('pdf-parse')).default as any;
                const parsed = await pdfParse(pdfBuffer);
                const extracted = (parsed?.text || '').trim();
                if (extracted) {
                  const limited = extracted.length > 20000 ? `${extracted.slice(0, 20000)}...[truncated]` : extracted;
                  documentText += `PDF Extracted Text (truncated if large):\n${limited}\n[END DOCUMENT]\n\n`;
                } else {
                  documentText += `[PDF detected but no extractable text]\n[END DOCUMENT]\n\n`;
                }
              } catch (err) {
                console.error('PDF parse failed:', err);
                documentText += `[PDF Document - ${Math.round(attachment.size / 1024)}KB]\n`;
                documentText += `Unable to extract text. Please summarize key sections to analyze.\n[END DOCUMENT]\n\n`;
              }
            } else if (attachment.mimeType === 'text/csv' || attachment.name?.endsWith('.csv')) {
              // CSV file - decode and include content
              try {
                const csvContent = Buffer.from(attachment.data, 'base64').toString('utf-8');
                documentText += `CSV Content (first 2000 chars):\n${csvContent.substring(0, 2000)}${csvContent.length > 2000 ? '...[truncated]' : ''}\n[END DOCUMENT]\n\n`;
              } catch (error) {
                documentText += `[Could not read CSV content]\n[END DOCUMENT]\n\n`;
              }
            } else {
              // Other document types
              documentText += `[${attachment.mimeType || 'Unknown'} - ${Math.round(attachment.size / 1024)}KB]\n`;
              documentText += `Document type: ${attachment.mimeType || 'Unknown'}\n[END DOCUMENT]\n\n`;
            }
            
            // Add document info to the text content
            contentParts[0].text += documentText;
          }
        }
        
        console.log('Final message content structure:', {
          hasMultipleParts: contentParts.length > 1,
          parts: contentParts.map(part => ({ type: part.type, hasImageUrl: !!part.image_url }))
        });

        messages.push({
          role: 'user',
          content: contentParts
        });
      } else {
        messages.push({
          role: 'user',
          content: content
        });
      }

      // Create streaming message placeholder
      const streamingMessage = await MessageModel.createStreamingMessage(
        conversationId,
        userId,
        conversation.model
      );

      socket.emit('stream_start', { 
        messageId: streamingMessage.id,
        message: streamingMessage 
      });

      let fullContent = '';
      let fullThinking = '';
      let isInThinkingBlock = false;

      // Call Novita AI with streaming
      await novitaService.createChatCompletionStream(
        {
          model: conversation.model,
          messages,
          temperature: conversation.temperature,
          max_tokens: conversation.max_tokens || (deepResearch ? 16384 : isThinkingModel ? 8192 : 4096),
          stream: true,
          ...(supportsThinking && { thinking: true })
        },
        async (chunk) => {
          // Handle streaming chunk
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
            const delta = chunk.choices[0].delta;
            
            // Handle regular content
            if (delta.content) {
              // Parse content to separate thinking from regular response
              if (supportsThinking && thinkingMessageId) {
                let remainingContent = delta.content;
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
                        socket.emit('thinking_chunk', {
                          messageId: thinkingMessageId,
                          chunk: thinkingChunk
                        });
                      }
                      isInThinkingBlock = false;
                      remainingContent = remainingContent.substring(endIndex + 8); // Skip </think>
                    } else {
                      // No end tag in this chunk, entire content is thinking
                      fullThinking += remainingContent;
                      socket.emit('thinking_chunk', {
                        messageId: thinkingMessageId,
                        chunk: remainingContent
                      });
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
                  socket.emit('stream_chunk', { 
                    messageId: streamingMessage.id,
                    chunk: regularChunk 
                  });
                }
              } else {
                // No thinking support or no thinking message - just send as regular content
                fullContent += delta.content;
                socket.emit('stream_chunk', { 
                  messageId: streamingMessage.id,
                  chunk: delta.content 
                });
              }
            }
            
            // Handle thinking content from delta (if API provides it separately)
            if (delta.thinking && thinkingMessageId) {
              fullThinking += delta.thinking;
              socket.emit('thinking_chunk', {
                messageId: thinkingMessageId,
                chunk: delta.thinking
              });
            }
          }
        },
        (error) => {
          // Handle error
          console.error('Streaming error:', error);
          socket.emit('stream_error', { 
            messageId: streamingMessage.id,
            error: error.message 
          });
          
          // Mark message as error
          MessageModel.markAsError(
            streamingMessage.id,
            error.message
          );
        },
        async () => {
          // Handle completion
          // Complete thinking message if exists
          if (thinkingMessageId) {
            socket.emit('thinking_complete', {
              messageId: thinkingMessageId
            });
          }
          
          // Update the message with the full content and link previews
          const finalMetadata: any = { 
            streaming: false,
            ...(linkPreviews.length > 0 && { 
              linkPreviews,
              searchSources: linkPreviews  // Also include as searchSources for compatibility
            })
          };
          
          await MessageModel.update(streamingMessage.id, {
            content: fullContent,
            metadata: finalMetadata
          });
          
          // Finalize the message with all metadata
          const finalizedMessage = await MessageModel.finalizeStreamingMessage(
            streamingMessage.id,
            novitaService.estimateTokens(fullContent)
          );
          
          // Get the message with metadata included
          const messageWithMetadata = await MessageModel.findById(streamingMessage.id);
          if (messageWithMetadata && linkPreviews.length > 0) {
            messageWithMetadata.metadata = {
              ...messageWithMetadata.metadata,
              linkPreviews,
              searchSources: linkPreviews
            };
          }

          // Update conversation timestamp
          await ConversationModel.updateLastMessageAt(conversationId);

          // Generate title if needed
          if (shouldUpdateTitle && fullContent.length > 10) {
            try {
              const titlePrompt = `Generate a concise 3-5 word title for a conversation that started with this user message: "${content.trim()}". The title should capture the main topic or intent. Respond with only the title, no quotes or extra text.`;
              
              const titleResponse = await novitaService.createChatCompletion({
                model: 'meta-llama/llama-3.1-8b-instruct',
                messages: [{ role: 'user', content: titlePrompt }],
                temperature: 0.3,
                max_tokens: 20
              });
              
              const titleContent = titleResponse.choices[0].message.content;
              const generatedTitle = typeof titleContent === 'string' 
                ? titleContent.trim()
                : titleContent.map(part => part.text || '').join('').trim();
              if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length < 100) {
                await ConversationModel.update(conversationId, { title: generatedTitle });
                socket.emit('conversation_title_updated', { 
                  conversationId, 
                  title: generatedTitle 
                });
              }
            } catch (error) {
              console.error('Failed to generate conversation title:', error);
            }
          }

          // Send the complete message with all metadata
          if (finalizedMessage) {
            const completeMessage = {
              ...finalizedMessage,
              metadata: {
                ...finalizedMessage.metadata,
                ...finalMetadata
              }
            };
            
            socket.emit('stream_complete', { 
              messageId: streamingMessage.id,
              message: completeMessage 
            });

            // Update usage tracking - only for Novita platform key usage
            if (!data.useUserKey) {
              try {
                let usageType: 'total' | 'webSearch' | 'deepResearch' = 'total';
                if (deepResearch) usageType = 'deepResearch';
                else if (webSearch) usageType = 'webSearch';
                
                await updateUsage(userId, usageType);
                console.log(`Usage updated for user ${userId}, type: ${usageType}`);
              } catch (usageError) {
                console.error('Error updating usage:', usageError);
              }
            }
          } else {
            // If finalization failed, still send the message with metadata
            const messageWithAllMetadata = await MessageModel.findById(streamingMessage.id);
            if (messageWithAllMetadata) {
              messageWithAllMetadata.metadata = finalMetadata;
              socket.emit('stream_complete', { 
                messageId: streamingMessage.id,
                message: messageWithAllMetadata 
              });

              // Update usage tracking - only for Novita platform key usage
              if (!data.useUserKey) {
                try {
                  let usageType: 'total' | 'webSearch' | 'deepResearch' = 'total';
                  if (deepResearch) usageType = 'deepResearch';
                  else if (webSearch) usageType = 'webSearch';
                  
                  await updateUsage(userId, usageType);
                  console.log(`Usage updated for user ${userId}, type: ${usageType}`);
                } catch (usageError) {
                  console.error('Error updating usage:', usageError);
                }
              }
            }
          }
        }
      );

    } catch (error) {
      console.error('WebSocket streaming error:', error);
      socket.emit('error', { message: 'Failed to process streaming chat' });
    }
  }

  // Search conversations and messages
  async searchConversations(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Sanitize search query
      const sanitizedQuery = q.replace(/[\\%\_\[\]\^]/g, '\\      // Search in conversation titles
      const conversations = await ConversationModel.search(userId, q);
      
      // Also search in message content for each conversation');

      // Search in conversation titles using parameterized query
      const conversations = await ConversationModel.search(userId, sanitizedQuery);
      
      // Also search in message content for each conversation using sanitized query
      const conversationsWithMessageMatches = await Promise.all(
        conversations.map(async (conv) => {
          const messageMatches = await MessageModel.searchInConversation(conv.id, q);
          return {
            ...conv,
            hasMessageMatch: messageMatches.length > 0,
            matchedMessages: messageMatches.slice(0, 3) // Include up to 3 matching messages
          };
        })
      );

      // Sort by relevance - conversations with message matches first
      conversationsWithMessageMatches.sort((a, b) => {
        if (a.hasMessageMatch && !b.hasMessageMatch) return -1;
        if (!a.hasMessageMatch && b.hasMessageMatch) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      res.json(conversationsWithMessageMatches);
    } catch (error) {
      console.error('Error searching conversations:', error);
      res.status(500).json({ error: 'Failed to search conversations' });
    }
  }

  // Archive a conversation
  async archiveConversation(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = await ConversationModel.archive(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error archiving conversation:', error);
      res.status(500).json({ error: 'Failed to archive conversation' });
    }
  }

  // Unarchive a conversation
  async unarchiveConversation(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { conversationId } = req.params;

      // Verify ownership
      const isOwner = await ConversationModel.verifyOwnership(conversationId, userId);
      if (!isOwner) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = await ConversationModel.unarchive(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      res.status(500).json({ error: 'Failed to unarchive conversation' });
    }
  }
}

// Export singleton instance
export const chatController = new ChatController();
