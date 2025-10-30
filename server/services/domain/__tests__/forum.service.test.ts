import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ForumService } from '../forum.service';
import { forumRepository } from '../../../repositories/forum.repository';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { db } from '../../../db';
import { forumLikes, forumSaves, forumPollVotes } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('ForumService', () => {
  let forumService: ForumService;
  let testUserId: string;
  let testUser2Id: string;
  let testStudentId: string;
  let testStudent2Id: string;
  let testPostIds: string[] = [];
  let testCommentIds: string[] = [];

  beforeEach(async () => {
    forumService = new ForumService();

    const user = await userRepository.create({
      email: `forum-svc-user-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Forum',
      lastName: 'User'
    });
    testUserId = user.id;

    const student = await studentRepository.create({
      userId: testUserId,
      status: 'inquiry'
    });
    testStudentId = student.id;

    const user2 = await userRepository.create({
      email: `forum-svc-user2-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Forum',
      lastName: 'User2'
    });
    testUser2Id = user2.id;

    const student2 = await studentRepository.create({
      userId: testUser2Id,
      status: 'inquiry'
    });
    testStudent2Id = student2.id;
  });

  afterEach(async () => {
    for (const commentId of testCommentIds) {
      try {
        await forumRepository.deleteComment(commentId);
      } catch (error) {
        console.log('Comment cleanup failed:', error);
      }
    }
    testCommentIds = [];

    for (const postId of testPostIds) {
      try {
        await db.delete(forumLikes).where(eq(forumLikes.postId, postId));
        await db.delete(forumSaves).where(eq(forumSaves.postId, postId));
        await db.delete(forumPollVotes).where(eq(forumPollVotes.postId, postId));
        await forumRepository.delete(postId);
      } catch (error) {
        console.log('Forum post cleanup failed:', error);
      }
    }
    testPostIds = [];

    if (testStudentId) {
      try {
        await studentRepository.delete(testStudentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }

    if (testStudent2Id) {
      try {
        await studentRepository.delete(testStudent2Id);
      } catch (error) {
        console.log('Student2 cleanup failed:', error);
      }
    }

    if (testUserId) {
      try {
        await db.delete(forumLikes).where(eq(forumLikes.authorId, testUserId));
        await db.delete(forumSaves).where(eq(forumSaves.authorId, testUserId));
        await db.delete(forumPollVotes).where(eq(forumPollVotes.userId, testUserId));
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }

    if (testUser2Id) {
      try {
        await db.delete(forumLikes).where(eq(forumLikes.authorId, testUser2Id));
        await db.delete(forumSaves).where(eq(forumSaves.authorId, testUser2Id));
        await db.delete(forumPollVotes).where(eq(forumPollVotes.userId, testUser2Id));
        await userRepository.delete(testUser2Id);
      } catch (error) {
        console.log('User2 cleanup failed:', error);
      }
    }
  });

  describe('getPostById', () => {
    it('should return post by id', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Test post content',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.getPostById(post.id);

      expect(result.id).toBe(post.id);
      expect(result.content).toBe('Test post content');
    });

    it('should throw error if post not found', async () => {
      await expect(
        forumService.getPostById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts', async () => {
      const post1 = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post 1 content',
        category: 'general'
      });
      testPostIds.push(post1.id);

      const post2 = await forumRepository.create({
        authorId: testUser2Id,
        studentId: testStudent2Id,
        content: 'Post 2 content',
        category: 'general'
      });
      testPostIds.push(post2.id);

      const result = await forumService.getAllPosts();

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(p => p.id === post1.id)).toBe(true);
      expect(result.some(p => p.id === post2.id)).toBe(true);
    });

    it('should return posts with filters', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'General category post',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.getAllPosts({ category: 'general' });

      expect(result.some(p => p.id === post.id)).toBe(true);
    });
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const result = await forumService.createPost({
        userId: testUserId,
        authorId: testUserId,
        studentId: testStudentId,
        title: 'New Post',
        content: 'New content',
        category: 'general'
      });
      testPostIds.push(result.id);

      expect(result.content).toBeDefined();
      expect(result.category).toBe('general');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        forumService.createPost({ userId: '', title: '', content: '' } as any)
      ).rejects.toThrow();
    });
  });

  describe('updatePost', () => {
    it('should update post successfully', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Original content',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.updatePost(post.id, {
        content: 'Updated content'
      });

      expect(result.content).toBe('Updated content');
    });

    it('should throw error if update fails', async () => {
      await expect(
        forumService.updatePost('00000000-0000-0000-0000-000000000000', { content: 'Updated' })
      ).rejects.toThrow('UPDATE_FAILED');
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'To be deleted',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.deletePost(post.id);

      expect(result).toBe(true);
    });

    it('should return false if delete fails', async () => {
      const result = await forumService.deletePost('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });
  });

  describe('getComments', () => {
    it('should return comments for a post', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post with comments',
        category: 'general'
      });
      testPostIds.push(post.id);

      const comment1 = await forumRepository.createComment({
        postId: post.id,
        userId: testUserId,
        content: 'Comment 1'
      });
      testCommentIds.push(comment1.id);

      const comment2 = await forumRepository.createComment({
        postId: post.id,
        userId: testUser2Id,
        content: 'Comment 2'
      });
      testCommentIds.push(comment2.id);

      const result = await forumService.getComments(post.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(c => c.content === 'Comment 1')).toBe(true);
      expect(result.some(c => c.content === 'Comment 2')).toBe(true);
    });
  });

  describe('createComment', () => {
    it('should create comment successfully', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post for comments',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.createComment(post.id, testUserId, 'New comment');
      testCommentIds.push(result.id);

      expect(result.content).toBe('New comment');
      expect(result.postId).toBe(post.id);
      expect(result.userId).toBe(testUserId);
    });
  });

  describe('toggleLike', () => {
    it('should toggle like on a post', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post to like',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.toggleLike(post.id, testUser2Id);

      expect(result.liked).toBe(true);
      expect(typeof result.likesCount).toBe('number');
    });
  });

  describe('toggleSave', () => {
    it('should toggle save on a post', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post to save',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.toggleSave(post.id, testUser2Id);

      expect(result.saved).toBe(true);
    });
  });

  describe('getPostsPaginated', () => {
    it('should return paginated posts', async () => {
      const post1 = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Paginated Post 1',
        category: 'general'
      });
      testPostIds.push(post1.id);

      const post2 = await forumRepository.create({
        authorId: testUser2Id,
        studentId: testStudent2Id,
        content: 'Paginated Post 2',
        category: 'general'
      });
      testPostIds.push(post2.id);

      const result = await forumService.getPostsPaginated(10, 0, {});

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle errors when getting paginated posts', async () => {
      const result = await forumService.getPostsPaginated(-1, 0, {});

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPostsCount', () => {
    it('should return count of posts', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Count me',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.getPostsCount({ category: 'general' });

      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('should handle errors when counting posts', async () => {
      const result = await forumService.getPostsCount({});

      expect(typeof result).toBe('number');
    });
  });

  describe('getSavedPosts', () => {
    it('should return saved posts for a user', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post to be saved',
        category: 'general'
      });
      testPostIds.push(post.id);

      await forumService.toggleSave(post.id, testUser2Id);

      const result = await forumService.getSavedPosts(testUser2Id);

      expect(result.some((p: any) => p.id === post.id)).toBe(true);
    });

    it('should handle errors when getting saved posts', async () => {
      const result = await forumService.getSavedPosts('00000000-0000-0000-0000-000000000000');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPostAnalytics', () => {
    it('should return analytics for a post', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post for analytics',
        category: 'general'
      });
      testPostIds.push(post.id);

      await forumService.toggleLike(post.id, testUser2Id);

      const comment = await forumRepository.createComment({
        postId: post.id,
        userId: testUser2Id,
        content: 'Analytics comment'
      });
      testCommentIds.push(comment.id);

      const result = await forumService.getPostAnalytics(post.id);

      expect(result.likes.length).toBeGreaterThanOrEqual(1);
      expect(result.comments.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle errors when getting post analytics', async () => {
      const result = await forumService.getPostAnalytics('00000000-0000-0000-0000-000000000000');

      expect(result).toBeDefined();
    });
  });

  describe('votePollOption', () => {
    it('should vote on a poll option', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Poll post',
        category: 'general',
        pollOptions: JSON.stringify([
          { id: 'option-1', text: 'Option 1' },
          { id: 'option-2', text: 'Option 2' }
        ])
      });
      testPostIds.push(post.id);

      const result = await forumService.votePollOption(post.id, testUser2Id, 'option-1');

      expect(result).toBeDefined();
    });

    it('should handle errors when voting on poll', async () => {
      await expect(
        forumService.votePollOption('00000000-0000-0000-0000-000000000000', testUserId, 'option-1')
      ).rejects.toThrow();
    });
  });

  describe('getPollResults', () => {
    it('should return poll results', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Poll for results',
        category: 'general',
        pollOptions: JSON.stringify([
          { id: 'option-1', text: 'Option 1' },
          { id: 'option-2', text: 'Option 2' }
        ])
      });
      testPostIds.push(post.id);

      await forumService.votePollOption(post.id, testUser2Id, 'option-1');

      const result = await forumService.getPollResults(post.id);

      expect(result).toBeDefined();
    });

    it('should handle errors when getting poll results', async () => {
      const result = await forumService.getPollResults('00000000-0000-0000-0000-000000000000');

      expect(result).toBeDefined();
    });
  });

  describe('getUserPollVotes', () => {
    it('should return user poll votes', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Poll for votes',
        category: 'general',
        pollOptions: JSON.stringify([
          { id: 'option-1', text: 'Option 1' }
        ])
      });
      testPostIds.push(post.id);

      await forumService.votePollOption(post.id, testUser2Id, 'option-1');

      const result = await forumService.getUserPollVotes(post.id, testUser2Id);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors when getting user poll votes', async () => {
      const result = await forumService.getUserPollVotes('00000000-0000-0000-0000-000000000000', testUserId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPostWithUser', () => {
    it('should return post with user details', async () => {
      const post = await forumRepository.create({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Post with user',
        category: 'general'
      });
      testPostIds.push(post.id);

      const result = await forumService.getPostWithUser(post.id);

      expect(result.id).toBe(post.id);
      expect(result.authorName).toBeDefined();
      expect(result.authorEmail).toBeDefined();
    });

    it('should return undefined when getting post with non-existent user', async () => {
      const result = await forumService.getPostWithUser('00000000-0000-0000-0000-000000000000');
      
      expect(result).toBeUndefined();
    });
  });

  describe('createForumPost', () => {
    it('should create forum post successfully', async () => {
      const result = await forumService.createForumPost({
        authorId: testUserId,
        studentId: testStudentId,
        content: 'Forum post content',
        category: 'general'
      });
      testPostIds.push(result.id);

      expect(result.content).toBe('Forum post content');
    });

    it('should handle errors when creating forum post', async () => {
      await expect(
        forumService.createForumPost({ authorId: '', content: '' } as any)
      ).rejects.toThrow();
    });
  });

  describe('getUserPostLimit', () => {
    it('should return user post limit info', async () => {
      const result = await forumService.getUserPostLimit(testUserId);

      expect(result).toBeDefined();
      expect(result.postCount).toBeDefined();
      expect(result.canPost).toBeDefined();
    });

    it('should handle errors when getting user post limit', async () => {
      const result = await forumService.getUserPostLimit('00000000-0000-0000-0000-000000000000');

      expect(result).toBeDefined();
    });
  });

  describe('updateUserPostLimit', () => {
    it('should update user post limit', async () => {
      await forumService.updateUserPostLimit(testUserId);

      const result = await forumService.getUserPostLimit(testUserId);
      expect(result).toBeDefined();
    });

    it('should complete successfully even for non-existent user', async () => {
      await expect(
        forumService.updateUserPostLimit('00000000-0000-0000-0000-000000000000')
      ).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors in getComments', async () => {
      const result = await forumService.getComments('00000000-0000-0000-0000-000000000000');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors in createComment', async () => {
      await expect(
        forumService.createComment('00000000-0000-0000-0000-000000000000', testUserId, 'comment')
      ).rejects.toThrow();
    });

    it('should handle errors in toggleLike', async () => {
      await expect(
        forumService.toggleLike('00000000-0000-0000-0000-000000000000', testUserId)
      ).rejects.toThrow();
    });

    it('should handle errors in toggleSave', async () => {
      await expect(
        forumService.toggleSave('00000000-0000-0000-0000-000000000000', testUserId)
      ).rejects.toThrow();
    });

    it('should handle errors in getAllPosts', async () => {
      const result = await forumService.getAllPosts();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors in deletePost', async () => {
      const result = await forumService.deletePost('00000000-0000-0000-0000-000000000000');

      expect(typeof result).toBe('boolean');
    });
  });
});
