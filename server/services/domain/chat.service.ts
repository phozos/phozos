import { BaseService } from '../base.service';
import { IChatRepository, IStudentRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { IValidationService } from '../infrastructure/validation.service';
import { ChatMessage, InsertChatMessage } from '@shared/schema';
import {
  ValidationServiceError,
  InvalidOperationError,
  BusinessRuleViolationError
} from '../errors';

export interface FormattedChatMessage {
  id: string;
  message: string;
  sender: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatMessageResponse {
  id: string;
  message: string;
  sender: string;
  timestamp: string;
  isRead: boolean;
}

export interface ReadConfirmation {
  messageId: string;
  userId: string;
  read: boolean;
  timestamp: string;
}

export interface CounselorChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface IChatService {
  getChatMessages(studentId: string, counselorId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessageById(messageId: string): Promise<ChatMessage | undefined>;
  markChatMessageAsRead(messageId: string, userId: string): Promise<void>;
  getStudentAssignedCounselor(studentId: string): Promise<string | null>;
  validateAndSendMessage(userId: string, message: string, assignedCounselorId: string | null): Promise<ChatMessage>;
  checkRateLimit(userId: string): { allowed: boolean; remainingTime?: number };
  formatChatMessagesForStudent(messages: ChatMessage[], studentId: string): FormattedChatMessage[];
  formatChatMessageResponse(message: ChatMessage, sender: string): ChatMessageResponse;
  createReadConfirmation(messageId: string, userId: string): ReadConfirmation;
  formatCounselorChatMessages(messages: ChatMessage[]): CounselorChatMessage[];
  formatCounselorChatMessageResponse(message: ChatMessage): CounselorChatMessage;
}

export class ChatService extends BaseService implements IChatService {
  constructor(
    private chatRepository: IChatRepository = container.get<IChatRepository>(TYPES.IChatRepository),
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository)
  ) {
    super();
  }

  private get validationService(): IValidationService {
    return container.get<IValidationService>(TYPES.IValidationService);
  }

  private userMessageTimes = new Map<string, number>();
  private readonly RATE_LIMIT_MS = 15000; // 15 seconds between messages
  async getChatMessages(studentId: string, counselorId: string): Promise<ChatMessage[]> {
    try {
      return await this.chatRepository.findByChatParticipants(studentId, counselorId);
    } catch (error) {
      return this.handleError(error, 'ChatService.getChatMessages');
    }
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      // Validate required fields
      this.validateRequired(message, ['studentId', 'counselorId', 'senderId', 'message']);

      // Validate message content
      if (!message.message.trim()) {
        throw new ValidationServiceError('Chat Message', {
          message: 'Message cannot be empty'
        });
      }

      const validation = this.validationService.validateMessageContent(message.message);
      if (!validation.valid) {
        throw new ValidationServiceError('Chat Message', {
          message: validation.error || 'Invalid message content'
        });
      }

      return await this.chatRepository.create(message);
    } catch (error) {
      return this.handleError(error, 'ChatService.createChatMessage');
    }
  }

  async getChatMessageById(messageId: string): Promise<ChatMessage | undefined> {
    try {
      return await this.chatRepository.findById(messageId);
    } catch (error) {
      return this.handleError(error, 'ChatService.getChatMessageById');
    }
  }

  async markChatMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await this.chatRepository.markAsRead(messageId, userId);
    } catch (error) {
      return this.handleError(error, 'ChatService.markChatMessageAsRead');
    }
  }

  async getStudentAssignedCounselor(studentId: string): Promise<string | null> {
    try {
      const student = await this.studentRepository.findByUserId(studentId);
      return student?.assignedCounselorId || null;
    } catch (error) {
      return this.handleError(error, 'ChatService.getStudentAssignedCounselor');
    }
  }

  checkRateLimit(userId: string): { allowed: boolean; remainingTime?: number } {
    const currentTime = Date.now();
    const lastMessageTime = this.userMessageTimes.get(userId) || 0;
    const timeSinceLastMessage = currentTime - lastMessageTime;

    if (timeSinceLastMessage < this.RATE_LIMIT_MS && lastMessageTime > 0) {
      const remainingTime = Math.ceil((this.RATE_LIMIT_MS - timeSinceLastMessage) / 1000);
      return { allowed: false, remainingTime };
    }

    return { allowed: true };
  }

  async validateAndSendMessage(userId: string, message: string, assignedCounselorId: string | null): Promise<ChatMessage> {
    try {
      // Validate message is not empty
      if (!message || !message.trim()) {
        throw new ValidationServiceError('Chat Message', {
          message: 'Message is required'
        });
      }

      // Rate limit check
      const rateLimitCheck = this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        throw new BusinessRuleViolationError(
          'rate_limit',
          `Please wait ${rateLimitCheck.remainingTime} seconds before sending another message`
        );
      }

      // Validate message content
      const validation = this.validationService.validateMessageContent(message);
      if (!validation.valid) {
        throw new ValidationServiceError('Chat Message', {
          message: validation.error || 'Invalid message content'
        });
      }

      // Check if student has assigned counselor
      if (!assignedCounselorId) {
        throw new InvalidOperationError(
          'send message',
          'No counselor assigned. Please contact admin to assign a counselor'
        );
      }

      // Create the message
      const chatMessage = await this.chatRepository.create({
        studentId: userId,
        counselorId: assignedCounselorId,
        senderId: userId,
        message: message.trim(),
        isRead: false
      });

      // Update rate limit tracker
      this.userMessageTimes.set(userId, Date.now());

      return chatMessage;
    } catch (error) {
      return this.handleError(error, 'ChatService.validateAndSendMessage');
    }
  }

  formatChatMessagesForStudent(messages: ChatMessage[], studentId: string): FormattedChatMessage[] {
    return messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      sender: msg.senderId === studentId ? 'student' : 'counselor',
      timestamp: msg.createdAt.toISOString(),
      isRead: msg.isRead ?? false
    }));
  }

  formatChatMessageResponse(message: ChatMessage, sender: string): ChatMessageResponse {
    return {
      id: message.id,
      message: message.message,
      sender,
      timestamp: message.createdAt.toISOString(),
      isRead: message.isRead ?? false
    };
  }

  createReadConfirmation(messageId: string, userId: string): ReadConfirmation {
    return {
      messageId,
      userId,
      read: true,
      timestamp: new Date().toISOString()
    };
  }

  formatCounselorChatMessages(messages: ChatMessage[]): CounselorChatMessage[] {
    return messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      content: msg.message,
      timestamp: msg.createdAt,
      isRead: msg.isRead ?? false
    }));
  }

  formatCounselorChatMessageResponse(message: ChatMessage): CounselorChatMessage {
    return {
      id: message.id,
      senderId: message.senderId,
      content: message.message,
      timestamp: message.createdAt,
      isRead: message.isRead ?? false
    };
  }
}

export const chatService = new ChatService();
