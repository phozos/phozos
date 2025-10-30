import { BaseRepository } from './base.repository';
import type { DbOrTransaction } from './base.repository';
import { 
  forumLikes,
  forumSaves,
  forumPostsEnhanced,
  forumComments,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { handleDatabaseError, TransactionError } from './errors';
import { PostAnalytics, SavedPostWithDetails } from '../types/repository-responses';

type ForumLike = typeof forumLikes.$inferSelect;
type InsertForumLike = typeof forumLikes.$inferInsert;
type ForumSave = typeof forumSaves.$inferSelect;
type InsertForumSave = typeof forumSaves.$inferInsert;

export interface IForumInteractionRepository {
  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }>;
  toggleSave(postId: string, userId: string): Promise<{ saved: boolean }>;
  getPostAnalytics(postId: string): Promise<PostAnalytics>;
  getSavedPostsForUser(userId: string): Promise<SavedPostWithDetails[]>;
}

export class ForumInteractionRepository implements IForumInteractionRepository {
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(forumLikes)
          .where(and(
            eq(forumLikes.postId, postId),
            eq(forumLikes.authorId, userId)
          ))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .delete(forumLikes)
            .where(and(
              eq(forumLikes.postId, postId),
              eq(forumLikes.authorId, userId)
            ));
        } else {
          await tx
            .insert(forumLikes)
            .values({ postId, authorId: userId });
        }

        const likesCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(forumLikes)
          .where(eq(forumLikes.postId, postId));

        const finalCount = Number(likesCount[0]?.count || 0);

        // Synchronize the cached likes_count field in forum_posts_enhanced
        await tx
          .update(forumPostsEnhanced)
          .set({ likesCount: finalCount })
          .where(eq(forumPostsEnhanced.id, postId));

        return {
          liked: existing.length === 0,
          likesCount: finalCount
        };
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('transaction')) {
        throw new TransactionError('toggleLike', error);
      }
      handleDatabaseError(error, 'ForumInteractionRepository.toggleLike');
    }
  }

  async toggleSave(postId: string, userId: string): Promise<{ saved: boolean }> {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(forumSaves)
          .where(and(
            eq(forumSaves.postId, postId),
            eq(forumSaves.authorId, userId)
          ))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .delete(forumSaves)
            .where(and(
              eq(forumSaves.postId, postId),
              eq(forumSaves.authorId, userId)
            ));
          return { saved: false };
        } else {
          await tx
            .insert(forumSaves)
            .values({ postId, authorId: userId });
          return { saved: true };
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('transaction')) {
        throw new TransactionError('toggleSave', error);
      }
      handleDatabaseError(error, 'ForumInteractionRepository.toggleSave');
    }
  }

  async getPostAnalytics(postId: string): Promise<PostAnalytics> {
    try {
      const [likes, comments, saves] = await Promise.all([
        db.select({
          id: forumLikes.id,
          postId: forumLikes.postId,
          authorId: forumLikes.authorId,
          createdAt: forumLikes.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture,
          userType: users.userType,
          companyName: users.companyName
        })
        .from(forumLikes)
        .leftJoin(users, eq(forumLikes.authorId, users.id))
        .where(eq(forumLikes.postId, postId)),
        
        db.select({
          id: forumComments.id,
          postId: forumComments.postId,
          userId: forumComments.userId,
          content: forumComments.content,
          createdAt: forumComments.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          profilePicture: users.profilePicture
        })
        .from(forumComments)
        .leftJoin(users, eq(forumComments.userId, users.id))
        .where(eq(forumComments.postId, postId)),
        
        db.select().from(forumSaves).where(eq(forumSaves.postId, postId))
      ]);

      return { likes, comments, saves };
    } catch (error) {
      handleDatabaseError(error, 'ForumInteractionRepository.getPostAnalytics');
    }
  }

  async getSavedPostsForUser(userId: string): Promise<SavedPostWithDetails[]> {
    try {
      return await db
        .select({
          id: forumPostsEnhanced.id,
          authorId: forumPostsEnhanced.authorId,
          title: forumPostsEnhanced.title,
          content: forumPostsEnhanced.content,
          category: forumPostsEnhanced.category,
          tags: forumPostsEnhanced.tags,
          images: forumPostsEnhanced.images,
          createdAt: forumPostsEnhanced.createdAt,
          updatedAt: forumPostsEnhanced.updatedAt,
          savedAt: forumSaves.createdAt,
          likesCount: forumPostsEnhanced.likesCount,
          commentsCount: forumPostsEnhanced.commentsCount,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profilePicture: users.profilePicture,
            userType: users.userType,
            companyName: users.companyName
          }
        })
        .from(forumSaves)
        .leftJoin(forumPostsEnhanced, eq(forumSaves.postId, forumPostsEnhanced.id))
        .leftJoin(users, eq(forumPostsEnhanced.authorId, users.id))
        .where(eq(forumSaves.authorId, userId))
        .orderBy(desc(forumSaves.createdAt));
    } catch (error) {
      handleDatabaseError(error, 'ForumInteractionRepository.getSavedPostsForUser');
    }
  }
}

export const forumInteractionRepository = new ForumInteractionRepository();
