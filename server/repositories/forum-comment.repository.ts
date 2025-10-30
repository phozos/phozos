import { BaseRepository, DeleteResult } from './base.repository';
import { 
  ForumComment,
  InsertForumComment,
  forumComments,
  forumPostsEnhanced,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, sql, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { ForumCommentFilters } from '../types/repository-filters';

export interface IForumCommentRepository {
  findById(id: string): Promise<ForumComment>;
  findByIdOptional(id: string): Promise<ForumComment | undefined>;
  findAll(filters?: ForumCommentFilters): Promise<ForumComment[]>;
  create(data: InsertForumComment): Promise<ForumComment>;
  update(id: string, data: Partial<ForumComment>): Promise<ForumComment>;
  delete(id: string): Promise<boolean>;
  getCommentsByPost(postId: string): Promise<ForumComment[]>;
  deleteComment(commentId: string): Promise<boolean>;
}

export class ForumCommentRepository extends BaseRepository<ForumComment, InsertForumComment> implements IForumCommentRepository {
  constructor() {
    super(forumComments, 'id');
  }

  async getCommentsByPost(postId: string): Promise<ForumComment[]> {
    try {
      return await db
        .select({
          id: forumComments.id,
          postId: forumComments.postId,
          userId: forumComments.userId,
          parentId: forumComments.parentId,
          content: forumComments.content,
          likesCount: forumComments.likesCount,
          createdAt: forumComments.createdAt,
          updatedAt: forumComments.updatedAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture,
            email: users.email
          }
        })
        .from(forumComments)
        .leftJoin(users, eq(forumComments.userId, users.id))
        .where(eq(forumComments.postId, postId))
        .orderBy(forumComments.createdAt) as ForumComment[];
    } catch (error) {
      handleDatabaseError(error, 'ForumCommentRepository.getCommentsByPost');
    }
  }

  async create(data: InsertForumComment): Promise<ForumComment> {
    try {
      return await this.executeInTransaction(async (tx) => {
        const results = await tx
          .insert(forumComments)
          .values(data)
          .returning();
        
        // Synchronize the cached commentsCount field atomically
        const commentCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(forumComments)
          .where(eq(forumComments.postId, data.postId));
        
        await tx
          .update(forumPostsEnhanced)
          .set({ commentsCount: Number(commentCount[0]?.count || 0) })
          .where(eq(forumPostsEnhanced.id, data.postId));
        
        return results[0] as ForumComment;
      });
    } catch (error) {
      handleDatabaseError(error, 'ForumCommentRepository.create');
    }
  }

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      return await this.executeInTransaction(async (tx) => {
        // Get the post ID before deleting the comment
        const comment = await tx
          .select({ postId: forumComments.postId })
          .from(forumComments)
          .where(eq(forumComments.id, commentId))
          .limit(1);
        
        const result = await tx
          .delete(forumComments)
          .where(eq(forumComments.id, commentId)) as unknown as DeleteResult;
        
        // Synchronize the cached commentsCount field if comment was deleted
        if ((result.rowCount ?? 0) > 0 && comment.length > 0) {
          const commentCount = await tx
            .select({ count: sql<number>`count(*)` })
            .from(forumComments)
            .where(eq(forumComments.postId, comment[0].postId));
          
          await tx
            .update(forumPostsEnhanced)
            .set({ commentsCount: Number(commentCount[0]?.count || 0) })
            .where(eq(forumPostsEnhanced.id, comment[0].postId));
        }
        
        return (result.rowCount ?? 0) > 0;
      });
    } catch (error) {
      handleDatabaseError(error, 'ForumCommentRepository.deleteComment');
    }
  }

  private async updatePostCommentCount(postId: string): Promise<void> {
    const commentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumComments)
      .where(eq(forumComments.postId, postId));
    
    await db
      .update(forumPostsEnhanced)
      .set({ commentsCount: Number(commentCount[0]?.count || 0) })
      .where(eq(forumPostsEnhanced.id, postId));
  }

  async findAll(filters?: ForumCommentFilters): Promise<ForumComment[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.postId) {
          conditions.push(eq(forumComments.postId, filters.postId));
        }
        if (filters.userId) {
          conditions.push(eq(forumComments.userId, filters.userId));
        }
        if (filters.parentId !== undefined) {
          if (filters.parentId === null) {
            conditions.push(sql`${forumComments.parentId} IS NULL`);
          } else {
            conditions.push(eq(forumComments.parentId, filters.parentId));
          }
        }
      }
      
      let query = db.select().from(forumComments);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(forumComments.createdAt) as ForumComment[];
    } catch (error) {
      handleDatabaseError(error, 'ForumCommentRepository.findAll');
    }
  }
}

export const forumCommentRepository = new ForumCommentRepository();
