import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES, container } from '../services/container';
import { IChatService } from '../services/domain/chat.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { WebSocketService } from '../services/infrastructure/websocket';

// Validation schemas
const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000)
});

const bulkReadSchema = z.object({
  messageIds: z.array(z.string())
});

/**
 * Chat Controller
 * 
 * Handles real-time chat operations between students and counselors.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for chat logic
 * - Standardized error handling
 * 
 * @class ChatController
 * @extends {BaseController}
 */
export class ChatController extends BaseController {
  /**
   * Get chat messages between student and assigned counselor
   * 
   * @route GET /api/chat/messages
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted chat messages
   * 
   * @throws {403} Forbidden if user is not a student or has no assigned counselor
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const user = this.getUser(req);
      
      if (user.userType !== 'customer') {
        return this.sendError(res, 403, 'AUTH_FORBIDDEN', 'Student access required');
      }
      
      const studentId = user.id;
      const chatService = getService<IChatService>(TYPES.IChatService);
      const assignedCounselorId = await chatService.getStudentAssignedCounselor(studentId);
      
      if (!assignedCounselorId) {
        return this.sendError(res, 403, 'AUTH_FORBIDDEN', 'No counselor assigned. Please contact admin to assign a counselor.');
      }
      
      const messages = await chatService.getChatMessages(studentId, assignedCounselorId);
      const formattedMessages = chatService.formatChatMessagesForStudent(messages, studentId);
      
      return this.sendSuccess(res, formattedMessages);
    } catch (error) {
      return this.handleError(res, error, 'ChatController.getMessages');
    }
  }

  /**
   * Send a chat message to the assigned counselor
   * 
   * @route POST /api/chat/messages
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user and message content
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created message
   * 
   * @example
   * // Request body:
   * {
   *   "message": "I need help with my university application"
   * }
   * 
   * @throws {422} Validation error if message is invalid
   * @throws {403} Forbidden if user is not a student
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const user = this.getUser(req);
      const { message } = sendMessageSchema.parse(req.body);
      
      if (user.userType !== 'customer') {
        return this.sendError(res, 403, 'AUTH_FORBIDDEN', 'Student access required');
      }
      
      const userId = user.id;
      const chatService = getService<IChatService>(TYPES.IChatService);
      const assignedCounselorId = await chatService.getStudentAssignedCounselor(userId);
      
      const newMessage = await chatService.validateAndSendMessage(userId, message, assignedCounselorId || null);
      const studentResponse = chatService.formatChatMessageResponse(newMessage, 'student');
      
      // Broadcast message via WebSocket with role-specific payloads
      if (assignedCounselorId) {
        const wsService = container.get<WebSocketService>(TYPES.WebSocketService);
        const counselorResponse = chatService.formatCounselorChatMessageResponse(newMessage);
        
        // Send student-formatted message to student
        await wsService.sendToUser(userId, {
          type: 'chat_message',
          data: studentResponse,
          timestamp: new Date().toISOString()
        });
        
        // Send counselor-formatted message to counselor
        await wsService.sendToUser(assignedCounselorId, {
          type: 'chat_message',
          data: counselorResponse,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📨 Broadcast chat message from student ${userId} to counselor ${assignedCounselorId}`);
      }
      
      res.status(201);
      return this.sendSuccess(res, studentResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ChatController.createMessage');
    }
  }

  /**
   * Mark a single chat message as read
   * 
   * @route PUT /api/chat/messages/:messageId/read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and message ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns read confirmation
   * 
   * @throws {404} Not found if message doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateMessageReadStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = this.getUserId(req);
      
      console.log(`📨 Message mark as read: ${messageId} by user: ${userId}`);
      
      const chatService = getService<IChatService>(TYPES.IChatService);
      const message = await chatService.getChatMessageById(messageId);
      if (!message) {
        return this.sendError(res, 404, 'MESSAGE_NOT_FOUND', 'Message not found');
      }
      
      await chatService.markChatMessageAsRead(messageId, userId);
      const readData = chatService.createReadConfirmation(messageId, userId);
      
      // Broadcast read status via WebSocket to both student and counselor
      const wsService = container.get<WebSocketService>(TYPES.WebSocketService);
      const recipients = [message.studentId, message.counselorId];
      recipients.forEach(recipientId => {
        wsService.sendToUser(recipientId, {
          type: 'message_read',
          data: readData,
          timestamp: new Date().toISOString()
        });
      });
      
      console.log(`✓ Broadcast read status for message ${messageId} between student ${message.studentId} and counselor ${message.counselorId}`);
      
      return this.sendSuccess(res, readData);
    } catch (error) {
      return this.handleError(res, error, 'ChatController.updateMessageReadStatus');
    }
  }

  /**
   * Mark multiple chat messages as read in bulk
   * 
   * @route PUT /api/chat/messages/bulk-read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and array of message IDs
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success status and count of marked messages
   * 
   * @example
   * // Request body:
   * {
   *   "messageIds": ["msg-123", "msg-456", "msg-789"]
   * }
   * 
   * @throws {422} Validation error if message IDs are invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateMessagesReadStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { messageIds } = bulkReadSchema.parse(req.body);
      
      const chatService = getService<IChatService>(TYPES.IChatService);
      const wsService = container.get<WebSocketService>(TYPES.WebSocketService);
      
      // Mark each message as read and broadcast the status
      for (const messageId of messageIds) {
        const message = await chatService.getChatMessageById(messageId);
        if (message) {
          await chatService.markChatMessageAsRead(messageId, userId);
          const readData = chatService.createReadConfirmation(messageId, userId);
          
          // Broadcast read status via WebSocket
          const recipients = [message.studentId, message.counselorId];
          recipients.forEach(recipientId => {
            wsService.sendToUser(recipientId, {
              type: 'message_read',
              data: readData,
              timestamp: new Date().toISOString()
            });
          });
        }
      }
      
      console.log(`✓ Broadcast bulk read status for ${messageIds.length} messages`);
      
      return this.sendSuccess(res, { 
        success: true, 
        markedCount: messageIds.length 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ChatController.updateMessagesReadStatus');
    }
  }
}

export const chatController = new ChatController();
