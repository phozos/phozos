import { describe, it, expect, afterEach } from 'vitest';
import { forumRepository } from '../forum.repository';
import { userRepository } from '../user.repository';
import { studentRepository } from '../student.repository';
import { db } from '../../db';
import { forumLikes, forumSaves, forumPollVotes } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('ForumRepository', () => {
  let testPostId: string;
  let testCommentId: string;
  let testUserId: string;
  let testStudentId: string;

  afterEach(async () => {
    if (testCommentId) {
      try {
        await forumRepository.deleteComment(testCommentId);
      } catch (error) {
        console.log('Comment cleanup failed:', error);
      }
    }
    if (testPostId) {
      try {
        await db.delete(forumLikes).where(eq(forumLikes.postId, testPostId));
        await db.delete(forumSaves).where(eq(forumSaves.postId, testPostId));
        await db.delete(forumPollVotes).where(eq(forumPollVotes.postId, testPostId));
        await forumRepository.delete(testPostId);
      } catch (error) {
        console.log('Forum post cleanup failed:', error);
      }
    }
    if (testStudentId) {
      try {
        await studentRepository.delete(testStudentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
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
  });

  describe('create', () => {
    it('should create a forum post', async () => {
      const user = await userRepository.create({
        email: `forum-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Forum',
        lastName: 'Test'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Test forum post content',
        category: 'general'
      });
      testPostId = post.id;

      expect(post.id).toBeDefined();
      expect(post.authorId).toBe(user.id);
      expect(post.content).toBe('Test forum post content');
      expect(post.category).toBe('general');
    });
  });

  describe('findById', () => {
    it('should find forum post by ID', async () => {
      const user = await userRepository.create({
        email: `find-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'Forum'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Find this post',
        category: 'uk_study'
      });
      testPostId = post.id;

      const found = await forumRepository.findById(post.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(post.id);
      expect(found?.content).toBe('Find this post');
    });
  });

  describe('createComment', () => {
    it('should create a comment on a forum post', async () => {
      const user = await userRepository.create({
        email: `comment-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Comment',
        lastName: 'Test'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post for commenting',
        category: 'general'
      });
      testPostId = post.id;

      const comment = await forumRepository.createComment({
        postId: post.id,
        userId: user.id,
        content: 'Test comment content'
      });
      testCommentId = comment.id;

      expect(comment.id).toBeDefined();
      expect(comment.postId).toBe(post.id);
      expect(comment.content).toBe('Test comment content');
    });
  });

  describe('getComments', () => {
    it('should get all comments for a post', async () => {
      const user = await userRepository.create({
        email: `get-comments-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Get',
        lastName: 'Comments'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post with comments',
        category: 'general'
      });
      testPostId = post.id;

      const comment = await forumRepository.createComment({
        postId: post.id,
        userId: user.id,
        content: 'First comment'
      });
      testCommentId = comment.id;

      const comments = await forumRepository.getComments(post.id);
      expect(comments.length).toBeGreaterThan(0);
      expect(comments.some(c => c.id === comment.id)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should find all forum posts with filters', async () => {
      const user = await userRepository.create({
        email: `findall-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindAll',
        lastName: 'Forum'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Test category filter',
        category: 'visa_tips'
      });
      testPostId = post.id;

      const posts = await forumRepository.findAll({ category: 'visa_tips' });
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.some(p => p.id === post.id)).toBe(true);
    });

    it('should find all forum posts without filters', async () => {
      const posts = await forumRepository.findAll();
      expect(Array.isArray(posts)).toBe(true);
    });

    it('should find all forum posts with search filter', async () => {
      const user = await userRepository.create({
        email: `search-all-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'SearchAll',
        lastName: 'Forum'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Unique search content xyzabc999',
        category: 'general'
      });
      testPostId = post.id;

      const posts = await forumRepository.findAll({ search: 'xyzabc999' });
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.some(p => p.id === post.id)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a forum post', async () => {
      const user = await userRepository.create({
        email: `delete-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Forum'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Delete this post',
        category: 'general'
      });

      const deleted = await forumRepository.delete(post.id);
      expect(deleted).toBe(true);

      const found = await forumRepository.findById(post.id);
      expect(found).toBeUndefined();
      testPostId = '';
    });
  });

  describe('toggleLike', () => {
    it('should like a post', async () => {
      const user = await userRepository.create({
        email: `like-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Like',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post to like',
        category: 'general'
      });
      testPostId = post.id;

      const result = await forumRepository.toggleLike(post.id, user.id);
      expect(result.liked).toBe(true);
    });

    it('should unlike a post when toggled again', async () => {
      const user = await userRepository.create({
        email: `unlike-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Unlike',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post to unlike',
        category: 'general'
      });
      testPostId = post.id;

      await forumRepository.toggleLike(post.id, user.id);
      const result = await forumRepository.toggleLike(post.id, user.id);
      expect(result.liked).toBe(false);
    });
  });

  describe('toggleSave', () => {
    it('should save a post', async () => {
      const user = await userRepository.create({
        email: `save-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Save',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post to save',
        category: 'general'
      });
      testPostId = post.id;

      const result = await forumRepository.toggleSave(post.id, user.id);
      expect(result.saved).toBe(true);
    });

    it('should unsave a post when toggled again', async () => {
      const user = await userRepository.create({
        email: `unsave-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Unsave',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post to unsave',
        category: 'general'
      });
      testPostId = post.id;

      await forumRepository.toggleSave(post.id, user.id);
      const result = await forumRepository.toggleSave(post.id, user.id);
      expect(result.saved).toBe(false);
    });
  });

  describe('getPostAnalytics', () => {
    it('should get analytics for a post', async () => {
      const user = await userRepository.create({
        email: `analytics-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Analytics',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post for analytics',
        category: 'general'
      });
      testPostId = post.id;

      await forumRepository.toggleLike(post.id, user.id);
      const comment = await forumRepository.createComment({
        postId: post.id,
        userId: user.id,
        content: 'Test comment for analytics'
      });
      testCommentId = comment.id;

      const analytics = await forumRepository.getPostAnalytics(post.id);
      expect(analytics).toBeDefined();
      expect(analytics.likes.length).toBeGreaterThanOrEqual(1);
      expect(analytics.comments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('update', () => {
    it('should update a forum post', async () => {
      const user = await userRepository.create({
        email: `update-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Original content',
        category: 'general'
      });
      testPostId = post.id;

      const updated = await forumRepository.update(post.id, {
        content: 'Updated content',
        category: 'uk_study'
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated content');
      expect(updated?.category).toBe('uk_study');
    });
  });

  describe('findPaginated', () => {
    it('should find posts with pagination', async () => {
      const user = await userRepository.create({
        email: `paginated-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Paginated',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Paginated post',
        category: 'general'
      });
      testPostId = post.id;

      const posts = await forumRepository.findPaginated(10, 0);
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(10);
    });

    it('should find posts with search filter', async () => {
      const user = await userRepository.create({
        email: `search-paginated-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Search',
        lastName: 'Paginated'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Unique search term xyz123',
        category: 'general'
      });
      testPostId = post.id;

      const posts = await forumRepository.findPaginated(10, 0, { search: 'xyz123' });
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.some(p => p.id === post.id)).toBe(true);
    });

    it('should find posts with category filter', async () => {
      const user = await userRepository.create({
        email: `category-paginated-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Category',
        lastName: 'Paginated'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Category test post',
        category: 'usa_study'
      });
      testPostId = post.id;

      const posts = await forumRepository.findPaginated(10, 0, { category: 'usa_study' });
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.some(p => p.id === post.id)).toBe(true);
    });
  });

  describe('count', () => {
    it('should count forum posts', async () => {
      const user = await userRepository.create({
        email: `count-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Count',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Count this post',
        category: 'general'
      });
      testPostId = post.id;

      const count = await forumRepository.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should count forum posts with category filter', async () => {
      const user = await userRepository.create({
        email: `count-category-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'CountCat',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Category count post',
        category: 'australia_study'
      });
      testPostId = post.id;

      const count = await forumRepository.count({ category: 'australia_study' });
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should count forum posts with search filter', async () => {
      const user = await userRepository.create({
        email: `count-search-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'CountSearch',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Unique search term abc789',
        category: 'general'
      });
      testPostId = post.id;

      const count = await forumRepository.count({ search: 'abc789' });
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const user = await userRepository.create({
        email: `delcomment-forum-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'DelComment',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post for comment deletion',
        category: 'general'
      });
      testPostId = post.id;

      const comment = await forumRepository.createComment({
        postId: post.id,
        userId: user.id,
        content: 'Comment to delete'
      });

      const deleted = await forumRepository.deleteComment(comment.id);
      expect(deleted).toBe(true);
      testCommentId = '';
    });
  });

  describe('getPostWithUser', () => {
    it('should get post with user details', async () => {
      const user = await userRepository.create({
        email: `postwithuser-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'PostWith',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post with user info',
        category: 'general'
      });
      testPostId = post.id;

      const result = await forumRepository.getPostWithUser(post.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(post.id);
      expect(result.authorName).toBeDefined();
    });
  });

  describe('getSavedPostsForUser', () => {
    it('should get saved posts for user', async () => {
      const user = await userRepository.create({
        email: `saved-posts-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Saved',
        lastName: 'Posts'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post to save',
        category: 'general'
      });
      testPostId = post.id;

      await forumRepository.toggleSave(post.id, user.id);

      const savedPosts = await forumRepository.getSavedPostsForUser(user.id);
      expect(Array.isArray(savedPosts)).toBe(true);
      expect(savedPosts.length).toBeGreaterThan(0);
    });
  });

  describe('votePollOption', () => {
    it('should vote on poll option', async () => {
      const user = await userRepository.create({
        email: `poll-vote-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Poll',
        lastName: 'Vote'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Poll post',
        category: 'general',
        pollQuestion: 'Test poll?',
        pollOptions: [{ id: 'opt1', text: 'Option 1' }, { id: 'opt2', text: 'Option 2' }]
      });
      testPostId = post.id;

      const result = await forumRepository.votePollOption(post.id, user.id, 'opt1');
      expect(result).toBeDefined();
      expect(result.options).toBeDefined();
    });

    it('should update vote when user changes their vote', async () => {
      const user = await userRepository.create({
        email: `poll-changevote-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Change',
        lastName: 'Vote'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Poll to change vote',
        category: 'general',
        pollQuestion: 'Which option?',
        pollOptions: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]
      });
      testPostId = post.id;

      await forumRepository.votePollOption(post.id, user.id, 'a');
      const result = await forumRepository.votePollOption(post.id, user.id, 'b');
      
      expect(result).toBeDefined();
      const bOption = result.options.find((o: any) => o.id === 'b');
      expect(bOption?.votes).toBe(1);
    });
  });

  describe('getPollResults', () => {
    it('should get poll results', async () => {
      const user = await userRepository.create({
        email: `poll-results-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Poll',
        lastName: 'Results'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Poll for results',
        category: 'general',
        pollQuestion: 'Test question?',
        pollOptions: [{ id: 'a', text: 'Answer A' }]
      });
      testPostId = post.id;

      const results = await forumRepository.getPollResults(post.id);
      expect(results).toBeDefined();
      expect(results.question).toBe('Test question?');
    });

    it('should return null for post without poll', async () => {
      const user = await userRepository.create({
        email: `no-poll-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'NoPoll',
        lastName: 'User'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Regular post without poll',
        category: 'general'
      });
      testPostId = post.id;

      const results = await forumRepository.getPollResults(post.id);
      expect(results).toBeNull();
    });

    it('should return null for non-existent post', async () => {
      const fakePostId = '00000000-0000-0000-0000-000000000999';
      const results = await forumRepository.getPollResults(fakePostId);
      expect(results).toBeNull();
    });
  });

  describe('getUserPollVotes', () => {
    it('should get user poll votes', async () => {
      const user = await userRepository.create({
        email: `uservotes-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'User',
        lastName: 'Votes'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'User poll votes',
        category: 'general',
        pollQuestion: 'Question?',
        pollOptions: [{ id: 'x', text: 'X' }]
      });
      testPostId = post.id;

      await forumRepository.votePollOption(post.id, user.id, 'x');

      const votes = await forumRepository.getUserPollVotes(post.id, user.id);
      expect(Array.isArray(votes)).toBe(true);
    });
  });

  describe('getUserPostLimit', () => {
    it('should get user post limit', async () => {
      const user = await userRepository.create({
        email: `postlimit-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Post',
        lastName: 'Limit'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Post for limit check',
        category: 'general'
      });
      testPostId = post.id;

      const limitInfo = await forumRepository.getUserPostLimit(user.id);
      expect(limitInfo).toBeDefined();
      expect(typeof limitInfo.postCount).toBe('number');
      expect(typeof limitInfo.canPost).toBe('boolean');
    });

    it('should get user post limit with multiple posts and sort correctly', async () => {
      const user = await userRepository.create({
        email: `multiplelimit-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Multi',
        lastName: 'Limit'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const post1 = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'First post',
        category: 'general'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const post2 = await forumRepository.create({
        authorId: user.id,
        studentId: student.id,
        content: 'Second post',
        category: 'general'
      });
      testPostId = post2.id;

      const limitInfo = await forumRepository.getUserPostLimit(user.id);
      expect(limitInfo).toBeDefined();
      expect(limitInfo.postCount).toBeGreaterThanOrEqual(2);
      expect(limitInfo.lastPostAt).toBeDefined();

      await forumRepository.delete(post1.id);
    });
  });

  describe('updateUserPostLimit', () => {
    it('should update user post limit', async () => {
      const user = await userRepository.create({
        email: `updatelimit-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'Limit'
      });
      testUserId = user.id;

      await forumRepository.updateUserPostLimit(user.id);
      const limitInfo = await forumRepository.getUserPostLimit(user.id);
      expect(limitInfo).toBeDefined();
    });
  });
});
