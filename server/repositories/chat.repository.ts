import { BaseRepository } from './base.repository';
import { ChatMessage, InsertChatMessage, chatMessages } from '@shared/schema';
import { db } from '../db';
import { eq, and, or, asc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IChatRepository {
  findById(id: string): Promise<ChatMessage>;
  findByIdOptional(id: string): Promise<ChatMessage | undefined>;
  findByChatParticipants(studentId: string, counselorId: string): Promise<ChatMessage[]>;
  create(data: InsertChatMessage): Promise<ChatMessage>;
  update(id: string, data: Partial<ChatMessage>): Promise<ChatMessage>;
  delete(id: string): Promise<boolean>;
  markAsRead(messageId: string, userId: string): Promise<boolean>;
}

export class ChatRepository extends BaseRepository<ChatMessage, InsertChatMessage> implements IChatRepository {
  constructor() {
    super(chatMessages, 'id');
  }

  async findByChatParticipants(studentId: string, counselorId: string): Promise<ChatMessage[]> {
    try {
      return await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.studentId, studentId),
            eq(chatMessages.counselorId, counselorId),
            eq(chatMessages.isDeleted, false)
          )
        )
        .orderBy(asc(chatMessages.createdAt)) as ChatMessage[];
    } catch (error) {
      handleDatabaseError(error, 'ChatRepository.findByChatParticipants');
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(chatMessages)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(chatMessages.id, messageId),
            or(
              eq(chatMessages.studentId, userId),
              eq(chatMessages.counselorId, userId)
            )
          )
        );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      handleDatabaseError(error, 'ChatRepository.markAsRead');
    }
  }
}

export const chatRepository = new ChatRepository();
