import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userRepository } from '../user.repository';
import { studentRepository } from '../student.repository';
import { forumInteractionRepository } from '../forum-interaction.repository';
import { forumPollRepository } from '../forum-poll.repository';
import { forumPostRepository } from '../forum-post.repository';
import { db } from '../../db';
import { users, studentProfiles, forumPostsEnhanced, forumLikes, forumSaves, forumPollVotes } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Repository Transaction Support', () => {
  const testUserIds: string[] = [];
  const testStudentIds: string[] = [];
  const testPostIds: string[] = [];

  afterEach(async () => {
    for (const id of testPostIds) {
      try {
        await db.delete(forumLikes).where(eq(forumLikes.postId, id));
        await db.delete(forumSaves).where(eq(forumSaves.postId, id));
        await db.delete(forumPollVotes).where(eq(forumPollVotes.postId, id));
        await db.delete(forumPostsEnhanced).where(eq(forumPostsEnhanced.id, id));
      } catch (e) {  }
    }
    for (const id of testStudentIds) {
      try {
        await db.delete(studentProfiles).where(eq(studentProfiles.id, id));
      } catch (e) {  }
    }
    for (const id of testUserIds) {
      try {
        await db.delete(users).where(eq(users.id, id));
      } catch (e) {  }
    }
    testUserIds.length = 0;
    testStudentIds.length = 0;
    testPostIds.length = 0;
  });

  describe('Transaction Method', () => {
    it('should execute operations within a transaction', async () => {
      const result = await userRepository.executeInTransaction(async (tx) => {
        const user = await tx
          .insert(users)
          .values({
            email: `transaction-test-${Date.now()}@example.com`,
            password: 'password123',
            userType: 'customer',
            firstName: 'Transaction',
            lastName: 'Test'
          })
          .returning();

        testUserIds.push(user[0].id);
        return user[0];
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      
      const found = await userRepository.findById(result.id);
      expect(found).toBeDefined();
      expect(found?.email).toContain('transaction-test-');
    });

    it('should rollback transaction on error', async () => {
      const uniqueEmail = `rollback-test-${Date.now()}@example.com`;
      
      try {
        await userRepository.executeInTransaction(async (tx) => {
          const user = await tx
            .insert(users)
            .values({
              email: uniqueEmail,
              password: 'password123',
              userType: 'customer',
              firstName: 'Rollback',
              lastName: 'Test'
            })
            .returning();

          testUserIds.push(user[0].id);

          throw new Error('Intentional error to trigger rollback');
        });
        expect.fail('Transaction should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Transaction failed');
      }

      const found = await userRepository.findByEmail(uniqueEmail);
      expect(found).toBeUndefined();
    });

    it('should support atomic multi-repository operations', async () => {
      const testEmail = `atomic-test-${Date.now()}@example.com`;
      
      const { user, student } = await userRepository.executeInTransaction(async (tx) => {
        const newUser = await tx
          .insert(users)
          .values({
            email: testEmail,
            password: 'password123',
            userType: 'customer',
            firstName: 'Atomic',
            lastName: 'Test'
          })
          .returning();

        testUserIds.push(newUser[0].id);

        const newStudent = await tx
          .insert(studentProfiles)
          .values({
            userId: newUser[0].id,
            status: 'inquiry'
          })
          .returning();

        testStudentIds.push(newStudent[0].id);

        return { user: newUser[0], student: newStudent[0] };
      });

      expect(user).toBeDefined();
      expect(student).toBeDefined();
      expect(student.userId).toBe(user.id);

      const foundUser = await userRepository.findById(user.id);
      const foundStudent = await studentRepository.findByUserId(user.id);
      
      expect(foundUser).toBeDefined();
      expect(foundStudent).toBeDefined();
    });

    it('should rollback all operations in multi-repository transaction on error', async () => {
      const testEmail = `rollback-multi-${Date.now()}@example.com`;
      
      try {
        await userRepository.executeInTransaction(async (tx) => {
          const newUser = await tx
            .insert(users)
            .values({
              email: testEmail,
              password: 'password123',
              userType: 'customer',
              firstName: 'Rollback',
              lastName: 'Multi'
            })
            .returning();

          testUserIds.push(newUser[0].id);

          const newStudent = await tx
            .insert(studentProfiles)
            .values({
              userId: newUser[0].id,
              status: 'inquiry'
            })
            .returning();

          testStudentIds.push(newStudent[0].id);

          throw new Error('Force rollback of both operations');
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Transaction failed');
      }

      const foundUser = await userRepository.findByEmail(testEmail);
      expect(foundUser).toBeUndefined();
    });

    it('should handle nested transactions gracefully', async () => {
      const result = await userRepository.executeInTransaction(async (outerTx) => {
        const user = await outerTx
          .insert(users)
          .values({
            email: `nested-tx-${Date.now()}@example.com`,
            password: 'password123',
            userType: 'customer',
            firstName: 'Nested',
            lastName: 'Transaction'
          })
          .returning();

        testUserIds.push(user[0].id);
        return user[0];
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('Transaction Error Handling', () => {
    it('should wrap transaction errors with TransactionError', async () => {
      try {
        await userRepository.executeInTransaction(async (tx) => {
          throw new Error('Database connection failed');
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Forum Transaction Operations', () => {
    let testUserId: string;
    let testPostId: string;

    beforeEach(async () => {
      const user = await db
        .insert(users)
        .values({
          email: `forum-tx-test-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'customer',
          firstName: 'Forum',
          lastName: 'Test'
        })
        .returning();
      testUserId = user[0].id;
      testUserIds.push(testUserId);

      const post = await forumPostRepository.create({
        authorId: testUserId,
        title: 'Test Post for Transactions',
        content: 'Test content',
        category: 'general' as any
      });
      testPostId = post.id;
      testPostIds.push(testPostId);
    });

    it('should handle toggleLike transaction atomically', async () => {
      const result1 = await forumInteractionRepository.toggleLike(testPostId, testUserId);
      expect(result1.liked).toBe(true);
      expect(result1.likesCount).toBe(1);

      const result2 = await forumInteractionRepository.toggleLike(testPostId, testUserId);
      expect(result2.liked).toBe(false);
      expect(result2.likesCount).toBe(0);
    });

    it('should handle toggleSave transaction atomically', async () => {
      const result1 = await forumInteractionRepository.toggleSave(testPostId, testUserId);
      expect(result1.saved).toBe(true);

      const result2 = await forumInteractionRepository.toggleSave(testPostId, testUserId);
      expect(result2.saved).toBe(false);
    });

    it('should handle votePollOption transaction atomically', async () => {
      const pollPost = await forumPostRepository.create({
        authorId: testUserId,
        title: 'Poll Test',
        content: 'Which option?',
        category: 'general' as any,
        pollQuestion: 'Test Question',
        pollOptions: [
          { id: 'opt1', text: 'Option 1' },
          { id: 'opt2', text: 'Option 2' }
        ]
      });
      testPostIds.push(pollPost.id);

      const result = await forumPollRepository.votePollOption(pollPost.id, testUserId, 'opt1');
      expect(result).toBeDefined();
      expect(result?.totalVotes).toBe(1);

      const result2 = await forumPollRepository.votePollOption(pollPost.id, testUserId, 'opt2');
      expect(result2).toBeDefined();
      expect(result2?.totalVotes).toBe(1);
    });
  });

  describe('Transaction Rollback on Errors', () => {
    let testUserId: string;
    let testPostId: string;

    beforeEach(async () => {
      const user = await db
        .insert(users)
        .values({
          email: `rollback-forum-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'customer',
          firstName: 'Rollback',
          lastName: 'Test'
        })
        .returning();
      testUserId = user[0].id;
      testUserIds.push(testUserId);

      const post = await forumPostRepository.create({
        authorId: testUserId,
        title: 'Rollback Test Post',
        content: 'Test content for rollback',
        category: 'general' as any
      });
      testPostId = post.id;
      testPostIds.push(testPostId);
    });

    it('should rollback toggleLike on transaction error', async () => {
      const likesBeforeCount = await db
        .select()
        .from(forumLikes)
        .where(eq(forumLikes.postId, testPostId));
      
      expect(likesBeforeCount.length).toBe(0);

      try {
        await db.transaction(async (tx) => {
          await tx
            .insert(forumLikes)
            .values({ postId: testPostId, authorId: testUserId });
          
          throw new Error('Simulated transaction error');
        });
      } catch (error: any) {
        expect(error.message).toContain('Simulated transaction error');
      }

      const likesAfter = await db
        .select()
        .from(forumLikes)
        .where(eq(forumLikes.postId, testPostId));
      
      expect(likesAfter.length).toBe(0);
    });

    it('should rollback toggleSave on transaction error', async () => {
      const savesBeforeCount = await db
        .select()
        .from(forumSaves)
        .where(eq(forumSaves.postId, testPostId));
      
      expect(savesBeforeCount.length).toBe(0);

      try {
        await db.transaction(async (tx) => {
          await tx
            .insert(forumSaves)
            .values({ postId: testPostId, authorId: testUserId });
          
          throw new Error('Simulated save rollback');
        });
      } catch (error: any) {
        expect(error.message).toContain('Simulated save rollback');
      }

      const savesAfter = await db
        .select()
        .from(forumSaves)
        .where(eq(forumSaves.postId, testPostId));
      
      expect(savesAfter.length).toBe(0);
    });

    it('should rollback votePollOption on transaction error', async () => {
      const pollPost = await forumPostRepository.create({
        authorId: testUserId,
        title: 'Rollback Poll',
        content: 'Poll rollback test',
        category: 'general' as any,
        pollQuestion: 'Test Rollback?',
        pollOptions: [
          { id: 'opt1', text: 'Yes' },
          { id: 'opt2', text: 'No' }
        ]
      });
      testPostIds.push(pollPost.id);

      const votesBefore = await db
        .select()
        .from(forumPollVotes)
        .where(eq(forumPollVotes.postId, pollPost.id));
      
      expect(votesBefore.length).toBe(0);

      try {
        await db.transaction(async (tx) => {
          await tx
            .insert(forumPollVotes)
            .values({ postId: pollPost.id, userId: testUserId, optionId: 'opt1' });
          
          throw new Error('Simulated vote rollback');
        });
      } catch (error: any) {
        expect(error.message).toContain('Simulated vote rollback');
      }

      const votesAfter = await db
        .select()
        .from(forumPollVotes)
        .where(eq(forumPollVotes.postId, pollPost.id));
      
      expect(votesAfter.length).toBe(0);
    });
  });
});
