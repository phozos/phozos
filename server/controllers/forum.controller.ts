import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IForumService } from '../services/domain/forum.service';
import { IForumPostRepository } from '../repositories/forum-post.repository';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { getWebSocketHandlers } from '../routes/index';

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).optional().nullable(),
  content: z.string().min(1),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  pollOptions: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
  pollQuestion: z.string().optional(),
  pollEndsAt: z.string().optional().nullable()
});

const updatePostSchema = createPostSchema.partial();

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional().nullable()
});

const reportPostSchema = z.object({
  reportReason: z.string(),
  reportDetails: z.string().optional()
});

const paginationQuerySchema = z.object({
  page: z.string().optional().refine(val => !val || (Number.isFinite(Number(val)) && Number(val) >= 1), {
    message: 'page must be a positive integer'
  }).transform(val => val ? Number(val) : 1),
  limit: z.string().optional().refine(val => !val || (Number.isFinite(Number(val)) && Number(val) >= 1 && Number(val) <= 100), {
    message: 'limit must be between 1 and 100'
  }).transform(val => val ? Number(val) : 10),
  category: z.string().optional(),
  search: z.string().optional()
    .transform(val => val?.trim())
    .refine(val => !val || val.length >= 2, {
      message: 'Search must be at least 2 characters'
    })
    .refine(val => !val || val.length <= 100, {
      message: 'Search query too long (max 100 characters)'
    })
});

/**
 * Forum Controller
 * 
 * Handles all community forum operations including posts, comments, polls, and interactions.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class ForumController
 * @extends {BaseController}
 */
export class ForumController extends BaseController {
  /**
   * Get all forum posts with pagination and optional filtering
   * 
   * @route GET /api/forum/posts
   * @access Public/Authenticated (optional)
   * @param {AuthenticatedRequest} req - Express request object with optional user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns paginated list of posts
   * 
   * @example
   * // Query parameters:
   * ?page=1&limit=10&category=general&search=university
   * 
   * @throws {422} Validation error if query parameters are invalid
   */
  async getAllPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const validatedQuery = paginationQuerySchema.parse(req.query);
      const { page, limit, category, search } = validatedQuery;

      const forumService = getService<IForumService>(TYPES.IForumService);
      const result = await forumService.getPostsWithPagination(
        page, 
        limit, 
        { category, search }, 
        userId
      );

      return this.sendPaginatedSuccess(res, result.data, result.pagination, result.total);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid query parameters', error.errors);
      }
      return this.handleError(res, error, 'ForumController.getAllPosts');
    }
  }

  /**
   * Get detailed information for a specific forum post
   * 
   * @route GET /api/forum/posts/:id
   * @access Public
   * @param {Request} req - Express request object with post ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns detailed post data
   * 
   * @throws {404} Post not found
   */
  async getPostById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const post = await forumService.getPostById(id);
      return this.sendSuccess(res, post);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getPostById');
    }
  }

  /**
   * Create a new forum post (with optional poll)
   * 
   * @route POST /api/forum/posts
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user and post data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created post data
   * 
   * @example
   * // Request body:
   * {
   *   "title": "How to apply to Ivy League?",
   *   "content": "I need advice on the application process...",
   *   "category": "admissions",
   *   "tags": ["ivy-league", "applications"],
   *   "images": ["/api/forum/images/photo1.jpg"],
   *   "pollQuestion": "Which university is your top choice?",
   *   "pollOptions": [{"id": "1", "text": "Harvard"}, {"id": "2", "text": "Yale"}]
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   */
  async createPost(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createPostSchema.parse(req.body);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const post = await forumService.createPost({
        authorId: userId,
        ...validatedData
      } as any);

      // Fetch the complete post with user data for WebSocket broadcast
      const postRepository = getService<IForumPostRepository>(TYPES.IForumPostRepository);
      const postWithUser = await postRepository.getPostWithUser(post.id);

      // Broadcast the new post to all connected clients via WebSocket
      if (postWithUser) {
        const wsHandlers = getWebSocketHandlers();
        await wsHandlers.forum.broadcastPostCreated(postWithUser);
      }

      res.status(201);
      return this.sendSuccess(res, postWithUser || post);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ForumController.createPost');
    }
  }

  /**
   * Update an existing forum post
   * 
   * @route PUT /api/forum/posts/:id
   * @access Protected (requires authentication and ownership)
   * @param {AuthenticatedRequest} req - Express request object with post ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated post data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user doesn't own the post
   * @throws {404} Post not found
   */
  async updatePost(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updatePostSchema.parse(req.body);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const post = await forumService.updatePost(id, validatedData as any);
      return this.sendSuccess(res, post);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ForumController.updatePost');
    }
  }

  /**
   * Delete a forum post
   * 
   * @route DELETE /api/forum/posts/:id
   * @access Protected (requires authentication and ownership)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user doesn't own the post
   * @throws {404} Post not found
   */
  async deletePost(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      await forumService.deletePost(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.deletePost');
    }
  }

  /**
   * Get all comments for a specific post
   * 
   * @route GET /api/forum/posts/:id/comments
   * @access Public
   * @param {Request} req - Express request object with post ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of comments for the post
   * 
   * @throws {404} Post not found
   */
  async getComments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const comments = await forumService.getComments(id);
      return this.sendSuccess(res, comments);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getComments');
    }
  }

  /**
   * Create a comment on a forum post
   * 
   * @route POST /api/forum/posts/:id/comments
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and comment data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created comment data
   * 
   * @example
   * // Request body:
   * {
   *   "content": "Great advice! I found this very helpful.",
   *   "parentId": "comment-123" // Optional, for nested replies
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async createComment(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const { content } = createCommentSchema.parse(req.body);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const comment = await forumService.createComment(id, userId, content);
      res.status(201);
      return this.sendSuccess(res, comment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ForumController.createComment');
    }
  }

  /**
   * Toggle like status on a post (like/unlike)
   * 
   * @route POST /api/forum/posts/:id/like
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated like status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async toggleLike(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const result = await forumService.toggleLike(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.toggleLike');
    }
  }

  /**
   * Toggle save/bookmark status on a post
   * 
   * @route POST /api/forum/posts/:id/save
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated save status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async toggleSave(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const result = await forumService.toggleSave(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.toggleSave');
    }
  }

  /**
   * Get all saved/bookmarked posts for the authenticated user
   * 
   * @route GET /api/forum/saved
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of saved posts
   * 
   * @throws {401} Unauthorized if user is not authenticated
   */
  async getSavedPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const forumService = getService<IForumService>(TYPES.IForumService);
      const posts = await forumService.getSavedPosts(userId);
      return this.sendSuccess(res, posts);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getSavedPosts');
    }
  }

  /**
   * Vote on a poll option within a forum post
   * 
   * @route POST /api/forum/posts/:id/poll/vote/:optionId
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and option ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated poll results with user's vote
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post or poll option not found
   * @throws {400} Poll has ended or user already voted
   */
  async votePollOption(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, optionId } = req.params;
      const userId = this.getUserId(req);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const result = await forumService.votePollOption(id, userId, optionId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.votePollOption');
    }
  }

  /**
   * Get poll results for a specific post
   * 
   * @route GET /api/forum/posts/:id/poll/results
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns poll results with vote counts and percentages
   * 
   * @throws {404} Post or poll not found
   */
  async getPollResults(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const results = await forumService.getPollResults(id);
      return this.sendSuccess(res, results);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getPollResults');
    }
  }

  /**
   * Get analytics data for a specific post (views, likes, comments, shares)
   * 
   * @route GET /api/forum/posts/:id/analytics
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns analytics data for the post
   * 
   * @throws {404} Post not found
   */
  async getPostAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const analytics = await forumService.getPostAnalytics(id);
      return this.sendSuccess(res, analytics);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getPostAnalytics');
    }
  }

  /**
   * Report a post for violating community guidelines
   * 
   * @route POST /api/forum/posts/:id/report
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and report details
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created report data
   * 
   * @example
   * // Request body:
   * {
   *   "reportReason": "spam",
   *   "reportDetails": "This post contains promotional content"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async reportPost(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const validatedData = reportPostSchema.parse(req.body);

      const forumService = getService<IForumService>(TYPES.IForumService);
      const report = await forumService.reportPost(id, userId, validatedData.reportReason, validatedData.reportDetails);
      res.status(201);
      return this.sendSuccess(res, report);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ForumController.reportPost');
    }
  }

  /**
   * Get all user votes for a specific poll
   * 
   * @route GET /api/forum/posts/:id/user-votes
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user votes for the poll
   * 
   * @throws {404} Post or poll not found
   */
  async getUserVotes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const votes = await forumService.getUserVotes(id);
      return this.sendSuccess(res, votes);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getUserVotes');
    }
  }

  /**
   * Get the authenticated user's vote status for a specific poll
   * 
   * @route GET /api/forum/posts/:id/user-vote-status
   * @access Public/Authenticated (optional)
   * @param {AuthenticatedRequest} req - Express request object with optional user and post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user's vote status (hasVoted, optionId)
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "hasVoted": true,
   *     "optionId": "option-123"
   *   }
   * }
   */
  async getUserVoteStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.sendSuccess(res, { hasVoted: false, optionId: null });
      }

      const forumService = getService<IForumService>(TYPES.IForumService);
      const status = await forumService.getUserVoteStatus(id, userId);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getUserVoteStatus');
    }
  }

  /**
   * Upload images for forum posts
   * 
   * @route POST /api/forum/upload-images
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with multipart/form-data images
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of uploaded image URLs
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "images": ["/api/forum/images/abc123.jpg", "/api/forum/images/def456.jpg"]
   *   }
   * }
   * 
   * @throws {400} No files uploaded
   * @throws {401} Unauthorized if user is not authenticated
   */
  async uploadImages(req: AuthenticatedRequest, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return this.sendError(res, 400, 'NO_FILES', 'No files uploaded');
      }

      const forumService = getService<IForumService>(TYPES.IForumService);
      const imageUrls = forumService.formatUploadedImages(files);

      res.status(201);
      return this.sendSuccess(res, { images: imageUrls });
    } catch (error) {
      return this.handleError(res, error, 'ForumController.uploadImages');
    }
  }

  /**
   * Serve a forum image file
   * 
   * @route GET /api/forum/images/:filename
   * @access Public
   * @param {Request} req - Express request object with filename parameter
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Sends the image file
   * 
   * @throws {404} Image not found
   */
  async getForumImage(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      const forumService = getService<IForumService>(TYPES.IForumService);
      const imagePath = await forumService.getImagePath(filename);
      res.sendFile(imagePath);
    } catch (error) {
      return this.handleError(res, error, 'ForumController.getForumImage');
    }
  }
}

export const forumController = new ForumController();
