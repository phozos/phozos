import { BaseRepository } from './base.repository';
import type { DbOrTransaction } from './base.repository';
import { 
  forumPollVotes,
  forumPostsEnhanced,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { handleDatabaseError, TransactionError } from './errors';
import { PollResults, PollVoteWithUser } from '../types/repository-responses';

type ForumPollVote = typeof forumPollVotes.$inferSelect;
type InsertForumPollVote = typeof forumPollVotes.$inferInsert;

export interface IForumPollRepository {
  votePollOption(postId: string, userId: string, optionId: string): Promise<{ pollResults: PollResults | null; userVotes: string[] } | null>;
  getPollResults(postId: string, tx?: DbOrTransaction): Promise<PollResults | null>;
  getUserPollVotes(postId: string, userId: string): Promise<string[]>;
  getUserVotes(postId: string): Promise<PollVoteWithUser[]>;
  getUserVoteStatus(postId: string, userId: string): Promise<{ hasVoted: boolean; optionId: string | null }>;
  getBulkUserPollVotes(postIds: string[], userId: string): Promise<Map<string, string[]>>;
  getBulkPollResults(postIds: string[]): Promise<Map<string, PollResults>>;
}

export class ForumPollRepository implements IForumPollRepository {
  async votePollOption(postId: string, userId: string, optionId: string): Promise<{ pollResults: PollResults | null; userVotes: string[] } | null> {
    try {
      return await db.transaction(async (tx) => {
        const existingVote = await tx
          .select()
          .from(forumPollVotes)
          .where(and(
            eq(forumPollVotes.postId, postId),
            eq(forumPollVotes.userId, userId)
          ))
          .limit(1);

        if (existingVote.length > 0) {
          await tx
            .update(forumPollVotes)
            .set({ optionId })
            .where(and(
              eq(forumPollVotes.postId, postId),
              eq(forumPollVotes.userId, userId)
            ));
        } else {
          await tx
            .insert(forumPollVotes)
            .values({ postId, userId, optionId });
        }

        const pollResults = await this.getPollResults(postId, tx as unknown as DbOrTransaction);
        
        const userVotes = await tx
          .select()
          .from(forumPollVotes)
          .where(and(
            eq(forumPollVotes.postId, postId),
            eq(forumPollVotes.userId, userId)
          ));

        return {
          pollResults,
          userVotes: userVotes.map(v => v.optionId)
        };
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('transaction')) {
        throw new TransactionError('votePollOption', error);
      }
      handleDatabaseError(error, 'ForumPollRepository.votePollOption');
    }
  }

  async getPollResults(postId: string, tx?: DbOrTransaction): Promise<PollResults | null> {
    try {
      const executor = tx || db;
      const post = await executor
        .select()
        .from(forumPostsEnhanced)
        .where(eq(forumPostsEnhanced.id, postId))
        .limit(1);
      
      if (post.length === 0 || !post[0].pollOptions) {
        return null;
      }

      const votes = await executor
        .select()
        .from(forumPollVotes)
        .where(eq(forumPollVotes.postId, postId));

      const pollOptions = post[0].pollOptions as Array<{ id: string; text: string }>;
      const totalVotes = votes.length;
      
      const results = pollOptions.map((option: { id: string; text: string }) => {
        const optionVotes = votes.filter(v => v.optionId === option.id).length;
        const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
        
        return {
          id: option.id,
          text: option.text,
          votes: optionVotes,
          percentage: percentage
        };
      });

      return {
        question: post[0].pollQuestion,
        options: results,
        totalVotes: totalVotes,
        endsAt: post[0].pollEndsAt
      };
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getPollResults');
    }
  }

  async getUserPollVotes(postId: string, userId: string): Promise<string[]> {
    try {
      const votes = await db
        .select()
        .from(forumPollVotes)
        .where(and(
          eq(forumPollVotes.postId, postId),
          eq(forumPollVotes.userId, userId)
        ));

      return votes.map(v => v.optionId);
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getUserPollVotes');
    }
  }

  async getUserVotes(postId: string): Promise<PollVoteWithUser[]> {
    try {
      const votes = await db
        .select({
          id: forumPollVotes.id,
          userId: forumPollVotes.userId,
          optionId: forumPollVotes.optionId,
          createdAt: forumPollVotes.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture
          }
        })
        .from(forumPollVotes)
        .leftJoin(users, eq(forumPollVotes.userId, users.id))
        .where(eq(forumPollVotes.postId, postId));

      return votes;
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getUserVotes');
    }
  }

  async getUserVoteStatus(postId: string, userId: string): Promise<{ hasVoted: boolean; optionId: string | null }> {
    try {
      const vote = await db
        .select()
        .from(forumPollVotes)
        .where(and(
          eq(forumPollVotes.postId, postId),
          eq(forumPollVotes.userId, userId)
        ))
        .limit(1);

      if (vote.length === 0) {
        return { hasVoted: false, optionId: null };
      }

      return { hasVoted: true, optionId: vote[0].optionId };
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getUserVoteStatus');
    }
  }

  async getBulkUserPollVotes(postIds: string[], userId: string): Promise<Map<string, string[]>> {
    try {
      if (postIds.length === 0) {
        return new Map();
      }

      const votes = await db
        .select({
          postId: forumPollVotes.postId,
          optionId: forumPollVotes.optionId
        })
        .from(forumPollVotes)
        .where(and(
          eq(forumPollVotes.userId, userId),
          inArray(forumPollVotes.postId, postIds)
        ));

      const votesByPost = new Map<string, string[]>();
      
      for (const vote of votes) {
        const existing = votesByPost.get(vote.postId) || [];
        existing.push(vote.optionId);
        votesByPost.set(vote.postId, existing);
      }

      return votesByPost;
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getBulkUserPollVotes');
    }
  }

  async getBulkPollResults(postIds: string[]): Promise<Map<string, PollResults>> {
    try {
      if (postIds.length === 0) {
        return new Map();
      }

      const posts = await db
        .select({
          id: forumPostsEnhanced.id,
          pollOptions: forumPostsEnhanced.pollOptions,
          pollQuestion: forumPostsEnhanced.pollQuestion,
          pollEndsAt: forumPostsEnhanced.pollEndsAt
        })
        .from(forumPostsEnhanced)
        .where(inArray(forumPostsEnhanced.id, postIds));

      const votes = await db
        .select({
          postId: forumPollVotes.postId,
          optionId: forumPollVotes.optionId
        })
        .from(forumPollVotes)
        .where(inArray(forumPollVotes.postId, postIds));

      const votesByPost = new Map<string, Array<{ optionId: string }>>();
      for (const vote of votes) {
        const existing = votesByPost.get(vote.postId) || [];
        existing.push({ optionId: vote.optionId });
        votesByPost.set(vote.postId, existing);
      }

      const resultsByPost = new Map<string, PollResults>();
      
      for (const post of posts) {
        if (!post.pollOptions || !Array.isArray(post.pollOptions)) {
          continue;
        }

        const postVotes = votesByPost.get(post.id) || [];
        const pollOptions = post.pollOptions as Array<{ id: string; text: string }>;
        const totalVotes = postVotes.length;
        
        const results = pollOptions.map((option: { id: string; text: string }) => {
          const optionVotes = postVotes.filter(v => v.optionId === option.id).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          
          return {
            id: option.id,
            text: option.text,
            votes: optionVotes,
            percentage: percentage
          };
        });

        resultsByPost.set(post.id, {
          question: post.pollQuestion,
          options: results,
          totalVotes: totalVotes,
          endsAt: post.pollEndsAt
        });
      }

      return resultsByPost;
    } catch (error) {
      handleDatabaseError(error, 'ForumPollRepository.getBulkPollResults');
    }
  }
}

export const forumPollRepository = new ForumPollRepository();
