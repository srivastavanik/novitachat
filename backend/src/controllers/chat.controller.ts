import { Request, Response } from 'express';
import { Socket } from 'socket.io';
import database from '../database';
import novitaService from '../services/novita.service';
import { ConversationModel } from '../models/Conversation';
import { MessageModel } from '../models/Message';
import { User } from '../models/User';
import { AuthRequest } from '../types/auth';

export class ChatController {
  // Get all conversations for the authenticated user
  async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversations = await ConversationModel.findByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  // Create a new conversation
  async createConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { title, model, temperature, max_tokens, system_prompt } = req.body;

      const conversation = await ConversationModel.create({
        user_id: userId,
        title,
        model,
        temperature,
        max_tokens,
        system_prompt
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  // Get a specific conversation
  async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
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
      const userId = req.userId!;
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
      const userId = req.userId!;
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
      const userId = req.userId!;
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

      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Send a message and get AI response
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
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

      // Get conversation context
      const context = await MessageModel.getConversationContext(conversationId);

      // Add system prompt if it exists
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (conversation.system_prompt) {
        messages.push({
          role: 'system',
          content: conversation.system_prompt
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

      // Save AI response
      const assistantMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: aiResponse.choices[0].message.content,
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
  }) {
    try {
      const { conversationId, content, userId } = data;

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

      // Save user message
      const userMessage = await MessageModel.create({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: content.trim()
      });

      socket.emit('user_message_saved', { message: userMessage });

      // Get conversation context
      const context = await MessageModel.getConversationContext(conversationId);

      // Build messages array
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (conversation.system_prompt) {
        messages.push({
          role: 'system',
          content: conversation.system_prompt
        });
      }
      messages.push(...context.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })));

      // Create streaming message placeholder
      const streamingMessage = await MessageModel.createStreamingMessage(
        conversationId,
        userId,
        conversation.model
      );

      socket.emit('stream_start', { messageId: streamingMessage.id });

      let fullContent = '';

      // Call Novita AI with streaming
      await novitaService.createChatCompletionStream(
        {
          model: conversation.model,
          messages,
          temperature: conversation.temperature,
          max_tokens: conversation.max_tokens || undefined,
          stream: true
        },
        async (chunk) => {
          // Handle streaming chunk
          if (chunk.choices[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            fullContent += content;
            
            // Emit chunk to client
            socket.emit('stream_chunk', { 
              messageId: streamingMessage.id,
              content 
            });

            // Update message in database periodically (batching for performance)
            // This could be optimized with a queue
            await MessageModel.appendToStreamingMessage(
              streamingMessage.id,
              content
            );
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
          // Finalize the message
          const finalizedMessage = await MessageModel.finalizeStreamingMessage(
            streamingMessage.id,
            novitaService.estimateTokens(fullContent)
          );

          // Update conversation timestamp
          await ConversationModel.updateLastMessageAt(conversationId);

          socket.emit('stream_complete', { 
            messageId: streamingMessage.id,
            message: finalizedMessage 
          });
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
      const userId = req.userId!;
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const conversations = await ConversationModel.search(userId, q);
      res.json(conversations);
    } catch (error) {
      console.error('Error searching conversations:', error);
      res.status(500).json({ error: 'Failed to search conversations' });
    }
  }

  // Archive a conversation
  async archiveConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
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
      const userId = req.userId!;
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
