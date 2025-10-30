import { BaseRepository } from './base.repository';
import { 
  ForumPostEnhanced, 
  InsertForumPostEnhanced, 
  forumPostsEnhanced,
  forumLikes,
  forumSaves,
  forumComments,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, or, desc, ilike, sql, gte, count, SQL } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';
import { ForumPostFilters } from '../types/repository-filters';
import { ForumPostWithUser } from '../types/repository-responses';

export interface IForumPostRepository {
  findById(id: string): Promise<ForumPostEnhanced>;
  findByIdOptional(id: string): Promise<ForumPostEnhanced | undefined>;
  findAllWithUser(filters?: ForumPostFilters, currentUserId?: string): Promise<ForumPostWithUser[]>;
  findPaginated(limit: number, offset: number, filters?: ForumPostFilters, currentUserId?: string): Promise<ForumPostWithUser[]>;
  countPosts(filters?: ForumPostFilters): Promise<number>;
  create(data: InsertForumPostEnhanced): Promise<ForumPostEnhanced>;
  update(id: string, data: Partial<ForumPostEnhanced>): Promise<ForumPostEnhanced>;
  delete(id: string): Promise<boolean>;
  getPostWithUser(postId: string): Promise<ForumPostWithUser | undefined>;
  getUserPostLimit(userId: string): Promise<{ postCount: number; lastPostAt: Date | null; canPost: boolean; timeRemaining?: number }>;
  updateUserPostLimit(userId: string): Promise<void>;
  incrementReportCount(postId: string): Promise<void>;
  getReportedPosts(): Promise<ForumPostEnhanced[]>;
}

export class ForumPostRepository extends BaseRepository<ForumPostEnhanced, InsertForumPostEnhanced> implements IForumPostRepository {
  constructor() {
    super(forumPostsEnhanced, 'id');
  }

  private buildPostFilters(filters?: ForumPostFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters) {
      if (filters.category) {
        conditions.push(sql`${forumPostsEnhanced.category} = ${filters.category}`);
      }
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(forumPostsEnhanced.title, searchTerm),
            ilike(forumPostsEnhanced.content, searchTerm),
            sql`EXISTS (
              SELECT 1 FROM unnest(COALESCE(${forumPostsEnhanced.tags}, ARRAY[]::text[])) tag 
              WHERE tag ILIKE ${searchTerm}
            )`,
            sql`EXISTS (
              SELECT 1 FROM ${users} u 
              WHERE u.id = ${forumPostsEnhanced.authorId} 
              AND (
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE ${searchTerm}
                OR COALESCE(u.company_name, '') ILIKE ${searchTerm}
              )
            )`
          )!
        );
      }
      if (filters.authorId) {
        conditions.push(eq(forumPostsEnhanced.authorId, filters.authorId));
      }
    }

    return conditions;
  }

  async findAllWithUser(filters?: ForumPostFilters, currentUserId?: string): Promise<ForumPostWithUser[]> {
    try {
      const conditions = this.buildPostFilters(filters);

      let query = db
        .select({
          id: forumPostsEnhanced.id,
          authorId: forumPostsEnhanced.authorId,
          title: forumPostsEnhanced.title,
          content: forumPostsEnhanced.content,
          category: forumPostsEnhanced.category,
          tags: forumPostsEnhanced.tags,
          images: forumPostsEnhanced.images,
          pollOptions: forumPostsEnhanced.pollOptions,
          pollQuestion: forumPostsEnhanced.pollQuestion,
          pollEndsAt: forumPostsEnhanced.pollEndsAt,
          isEdited: forumPostsEnhanced.isEdited,
          editedAt: forumPostsEnhanced.editedAt,
          isModerated: forumPostsEnhanced.isModerated,
          moderatedAt: forumPostsEnhanced.moderatedAt,
          likesCount: forumPostsEnhanced.likesCount,
          commentsCount: forumPostsEnhanced.commentsCount,
          viewsCount: forumPostsEnhanced.viewsCount,
          reportCount: forumPostsEnhanced.reportCount,
          isHiddenByReports: forumPostsEnhanced.isHiddenByReports,
          createdAt: forumPostsEnhanced.createdAt,
          updatedAt: forumPostsEnhanced.updatedAt,
          isLiked: currentUserId 
            ? sql<boolean>`CASE WHEN ${forumLikes.id} IS NOT NULL THEN true ELSE false END`
            : sql<boolean>`false`,
          isSaved: currentUserId 
            ? sql<boolean>`CASE WHEN ${forumSaves.id} IS NOT NULL THEN true ELSE false END`
            : sql<boolean>`false`,
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
        .from(forumPostsEnhanced)
        .leftJoin(users, eq(forumPostsEnhanced.authorId, users.id))
        .leftJoin(
          forumLikes,
          currentUserId 
            ? and(
                eq(forumLikes.postId, forumPostsEnhanced.id),
                eq(forumLikes.authorId, currentUserId)
              )
            : sql`false`
        )
        .leftJoin(
          forumSaves,
          currentUserId 
            ? and(
                eq(forumSaves.postId, forumPostsEnhanced.id),
                eq(forumSaves.authorId, currentUserId)
              )
            : sql`false`
        );
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      return await query.orderBy(desc(forumPostsEnhanced.createdAt)) as ForumPostWithUser[];
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.findAll');
    }
  }

  async findPaginated(limit: number, offset: number, filters?: ForumPostFilters, currentUserId?: string): Promise<ForumPostWithUser[]> {
    try {
      const conditions = this.buildPostFilters(filters);

      let query = db
        .select({
          id: forumPostsEnhanced.id,
          authorId: forumPostsEnhanced.authorId,
          title: forumPostsEnhanced.title,
          content: forumPostsEnhanced.content,
          category: forumPostsEnhanced.category,
          tags: forumPostsEnhanced.tags,
          images: forumPostsEnhanced.images,
          pollOptions: forumPostsEnhanced.pollOptions,
          pollQuestion: forumPostsEnhanced.pollQuestion,
          pollEndsAt: forumPostsEnhanced.pollEndsAt,
          isEdited: forumPostsEnhanced.isEdited,
          editedAt: forumPostsEnhanced.editedAt,
          isModerated: forumPostsEnhanced.isModerated,
          moderatedAt: forumPostsEnhanced.moderatedAt,
          likesCount: forumPostsEnhanced.likesCount,
          commentsCount: forumPostsEnhanced.commentsCount,
          viewsCount: forumPostsEnhanced.viewsCount,
          reportCount: forumPostsEnhanced.reportCount,
          isHiddenByReports: forumPostsEnhanced.isHiddenByReports,
          createdAt: forumPostsEnhanced.createdAt,
          updatedAt: forumPostsEnhanced.updatedAt,
          isLiked: currentUserId 
            ? sql<boolean>`CASE WHEN ${forumLikes.id} IS NOT NULL THEN true ELSE false END`
            : sql<boolean>`false`,
          isSaved: currentUserId 
            ? sql<boolean>`CASE WHEN ${forumSaves.id} IS NOT NULL THEN true ELSE false END`
            : sql<boolean>`false`,
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
        .from(forumPostsEnhanced)
        .leftJoin(users, eq(forumPostsEnhanced.authorId, users.id))
        .leftJoin(
          forumLikes,
          currentUserId 
            ? and(
                eq(forumLikes.postId, forumPostsEnhanced.id),
                eq(forumLikes.authorId, currentUserId)
              )
            : sql`false`
        )
        .leftJoin(
          forumSaves,
          currentUserId 
            ? and(
                eq(forumSaves.postId, forumPostsEnhanced.id),
                eq(forumSaves.authorId, currentUserId)
              )
            : sql`false`
        );
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      return await query
        .orderBy(desc(forumPostsEnhanced.createdAt))
        .limit(limit)
        .offset(offset) as ForumPostWithUser[];
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.findPaginated');
    }
  }

  async countPosts(filters?: ForumPostFilters): Promise<number> {
    try {
      const conditions = this.buildPostFilters(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      return await super.count(whereClause);
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.countPosts');
    }
  }

  async getPostWithUser(postId: string): Promise<ForumPostWithUser | undefined> {
    try {
      const result = await db
        .select({
          id: forumPostsEnhanced.id,
          authorId: forumPostsEnhanced.authorId,
          title: forumPostsEnhanced.title,
          content: forumPostsEnhanced.content,
          category: forumPostsEnhanced.category,
          tags: forumPostsEnhanced.tags,
          images: forumPostsEnhanced.images,
          pollOptions: forumPostsEnhanced.pollOptions,
          pollQuestion: forumPostsEnhanced.pollQuestion,
          pollEndsAt: forumPostsEnhanced.pollEndsAt,
          isEdited: forumPostsEnhanced.isEdited,
          editedAt: forumPostsEnhanced.editedAt,
          isModerated: forumPostsEnhanced.isModerated,
          moderatedAt: forumPostsEnhanced.moderatedAt,
          likesCount: forumPostsEnhanced.likesCount,
          commentsCount: forumPostsEnhanced.commentsCount,
          viewsCount: forumPostsEnhanced.viewsCount,
          createdAt: forumPostsEnhanced.createdAt,
          updatedAt: forumPostsEnhanced.updatedAt,
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
        .from(forumPostsEnhanced)
        .leftJoin(users, eq(forumPostsEnhanced.authorId, users.id))
        .where(eq(forumPostsEnhanced.id, postId))
        .limit(1);

      const post = result[0];
      if (!post) return undefined;
      
      return {
        ...post,
        likesCount: post.likesCount ?? 0,
        commentsCount: post.commentsCount ?? 0,
        viewsCount: post.viewsCount ?? 0
      };
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.getPostWithUser');
    }
  }

  async getUserPostLimit(userId: string): Promise<{ postCount: number; lastPostAt: Date | null; canPost: boolean; timeRemaining?: number }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentPosts = await db
        .select()
        .from(forumPostsEnhanced)
        .where(and(
          eq(forumPostsEnhanced.authorId, userId),
          gte(forumPostsEnhanced.createdAt, oneDayAgo)
        ));

      const postCount = recentPosts.length;
      const maxPostsPerDay = 10;
      const canPost = postCount < maxPostsPerDay;
      
      const lastPost = recentPosts.length > 0 
        ? recentPosts.sort((a, b) => 
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
          )[0]
        : null;

      return {
        postCount,
        lastPostAt: lastPost?.createdAt || null,
        canPost,
        timeRemaining: canPost ? 0 : undefined
      };
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.getUserPostLimit');
    }
  }

  async updateUserPostLimit(userId: string): Promise<void> {
    // This is tracked automatically by getUserPostLimit based on createdAt timestamps
    // No action needed
  }

  async incrementReportCount(postId: string): Promise<void> {
    try {
      const result = await db
        .update(forumPostsEnhanced)
        .set({ 
          reportCount: sql`${forumPostsEnhanced.reportCount} + 1`
        })
        .where(eq(forumPostsEnhanced.id, postId))
        .returning();
      
      if (!result[0]) {
        throw new NotFoundError('ForumPost', postId);
      }
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.incrementReportCount');
    }
  }

  async getReportedPosts(): Promise<ForumPostEnhanced[]> {
    try {
      return await db
        .select()
        .from(forumPostsEnhanced)
        .where(eq(forumPostsEnhanced.isHiddenByReports, true))
        .orderBy(desc(forumPostsEnhanced.hiddenAt)) as ForumPostEnhanced[];
    } catch (error) {
      handleDatabaseError(error, 'ForumPostRepository.getReportedPosts');
    }
  }
}

export const forumPostRepository = new ForumPostRepository();
