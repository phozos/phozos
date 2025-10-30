import { BaseService } from '../base.service';
import { 
  IForumPostRepository,
  IForumCommentRepository,
  IForumInteractionRepository,
  IForumPollRepository,
  IForumReportsRepository
} from '../../repositories';
import { container, TYPES } from '../container';
import { ForumPostEnhanced, InsertForumPostEnhanced, ForumComment } from '@shared/schema';
import { ForumPostWithUser } from '../../types/repository-responses';
import { ForumPostFilters } from '../../types/repository-filters';
import {
  ResourceNotFoundError,
  InvalidOperationError,
  DuplicateResourceError,
  ValidationServiceError
} from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface UploadedImageInfo {
  filename: string;
  url: string;
  originalName: string;
  size: number;
}

export interface IForumService {
  getPostById(id: string): Promise<ForumPostEnhanced>;
  getPostWithUser(id: string): Promise<any>;
  getAllPosts(filters?: ForumPostFilters, userId?: string): Promise<ForumPostWithUser[]>;
  getPostsPaginated(limit: number, offset: number, filters?: ForumPostFilters, userId?: string): Promise<ForumPostWithUser[]>;
  getPostsCount(filters?: ForumPostFilters): Promise<number>;
  getPostsWithPagination(
    page: number, 
    limit: number, 
    filters?: ForumPostFilters, 
    userId?: string
  ): Promise<{
    data: ForumPostWithUser[];
    pagination: { page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
    total: number;
  }>;
  createPost(data: InsertForumPostEnhanced): Promise<ForumPostEnhanced>;
  createForumPost(data: InsertForumPostEnhanced): Promise<ForumPostEnhanced>;
  updatePost(id: string, data: Partial<ForumPostEnhanced>): Promise<ForumPostEnhanced>;
  deletePost(id: string): Promise<boolean>;
  getComments(postId: string): Promise<ForumComment[]>;
  createComment(postId: string, userId: string, content: string): Promise<ForumComment>;
  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }>;
  toggleSave(postId: string, userId: string): Promise<{ saved: boolean }>;
  getSavedPosts(userId: string): Promise<any[]>;
  getPostAnalytics(postId: string): Promise<any>;
  votePollOption(postId: string, userId: string, optionId: string): Promise<any>;
  getPollResults(postId: string): Promise<any>;
  getUserPollVotes(postId: string, userId: string): Promise<any[]>;
  getUserPostLimit(userId: string): Promise<any>;
  updateUserPostLimit(userId: string): Promise<void>;
  reportPost(postId: string, userId: string, reportReason: string, reportDetails?: string): Promise<any>;
  getUserVotes(postId: string): Promise<any[]>;
  getUserVoteStatus(postId: string, userId: string): Promise<{ hasVoted: boolean; optionId: string | null }>;
  getImagePath(filename: string): Promise<string>;
  getUserSpecificPollData(postId: string, currentUserId: string | null): Promise<{
    pollOptions: any[];
    userVotes: string[];
    showResults: boolean;
  } | null>;
  formatUploadedImages(files: Express.Multer.File[]): UploadedImageInfo[];
}

export class ForumService extends BaseService implements IForumService {
  constructor(
    private postRepository: IForumPostRepository = container.get<IForumPostRepository>(TYPES.IForumPostRepository),
    private commentRepository: IForumCommentRepository = container.get<IForumCommentRepository>(TYPES.IForumCommentRepository),
    private interactionRepository: IForumInteractionRepository = container.get<IForumInteractionRepository>(TYPES.IForumInteractionRepository),
    private pollRepository: IForumPollRepository = container.get<IForumPollRepository>(TYPES.IForumPollRepository),
    private reportsRepository: IForumReportsRepository = container.get<IForumReportsRepository>(TYPES.IForumReportsRepository)
  ) {
    super();
  }

  async getPostById(id: string): Promise<ForumPostEnhanced> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw new ResourceNotFoundError('Forum Post', id);
      }
      return post;
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostById');
    }
  }

  async getAllPosts(filters?: ForumPostFilters, userId?: string): Promise<ForumPostWithUser[]> {
    try {
      return await this.postRepository.findAllWithUser(filters, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getAllPosts');
    }
  }

  async createPost(data: InsertForumPostEnhanced): Promise<ForumPostEnhanced> {
    try {
      this.validateRequired(data, ['authorId', 'content']);

      const errors: Record<string, string> = {};

      const authorIdValidation = CommonValidators.validateUUID(data.authorId, 'Author ID');
      if (!authorIdValidation.valid) {
        errors.authorId = authorIdValidation.error!;
      }

      const contentValidation = CommonValidators.validateStringLength(data.content, 1, 10000, 'Post content');
      if (!contentValidation.valid) {
        errors.content = contentValidation.error!;
      }

      if (data.title) {
        const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, 'Post title');
        if (!titleValidation.valid) {
          errors.title = titleValidation.error!;
        }
      }

      const validCategories = ['uk_study', 'visa_tips', 'ielts_prep', 'general', 'usa_study', 'canada_study', 'australia_study'];
      if (data.category && !validCategories.includes(data.category)) {
        errors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Forum Post', errors);
      }

      // Transform pollEndsAt from string to Date if present
      const transformedData: any = { ...data };
      if (transformedData.pollEndsAt) {
        const pollValue = transformedData.pollEndsAt;
        if (typeof pollValue === 'string') {
          // Handle empty string by setting to undefined
          if (pollValue.trim() === '') {
            transformedData.pollEndsAt = undefined;
          } else {
            const date = new Date(pollValue);
            transformedData.pollEndsAt = isNaN(date.getTime()) ? undefined : date;
          }
        }
      }

      return await this.postRepository.create(transformedData);
    } catch (error) {
      return this.handleError(error, 'ForumService.createPost');
    }
  }

  async updatePost(id: string, data: Partial<ForumPostEnhanced>): Promise<ForumPostEnhanced> {
    try {
      const errors: Record<string, string> = {};

      if (data.content !== undefined && data.content !== null) {
        const contentValidation = CommonValidators.validateStringLength(data.content, 1, 10000, 'Post content');
        if (!contentValidation.valid) {
          errors.content = contentValidation.error!;
        }
      }

      if (data.title !== undefined && data.title !== null) {
        const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, 'Post title');
        if (!titleValidation.valid) {
          errors.title = titleValidation.error!;
        }
      }

      const validCategories = ['uk_study', 'visa_tips', 'ielts_prep', 'general', 'usa_study', 'canada_study', 'australia_study'];
      if (data.category && !validCategories.includes(data.category)) {
        errors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Forum Post', errors);
      }

      const updated = await this.postRepository.update(id, data);
      if (!updated) {
        throw new InvalidOperationError('update post', 'Post update failed or post not found');
      }
      return updated;
    } catch (error) {
      return this.handleError(error, 'ForumService.updatePost');
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      return await this.postRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'ForumService.deletePost');
    }
  }

  async getComments(postId: string): Promise<ForumComment[]> {
    try {
      return await this.commentRepository.getCommentsByPost(postId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getComments');
    }
  }

  async createComment(postId: string, userId: string, content: string): Promise<ForumComment> {
    try {
      const errors: Record<string, string> = {};

      const postIdValidation = CommonValidators.validateUUID(postId, 'Post ID');
      if (!postIdValidation.valid) {
        errors.postId = postIdValidation.error!;
      }

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const contentValidation = CommonValidators.validateStringLength(content, 1, 2000, 'Comment content');
      if (!contentValidation.valid) {
        errors.content = contentValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Forum Comment', errors);
      }

      return await this.commentRepository.create({
        postId,
        userId,
        content
      });
    } catch (error) {
      return this.handleError(error, 'ForumService.createComment');
    }
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      return await this.interactionRepository.toggleLike(postId, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.toggleLike');
    }
  }

  async toggleSave(postId: string, userId: string): Promise<{ saved: boolean }> {
    try {
      return await this.interactionRepository.toggleSave(postId, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.toggleSave');
    }
  }

  async getPostsPaginated(limit: number, offset: number, filters?: ForumPostFilters, userId?: string): Promise<ForumPostWithUser[]> {
    try {
      return await this.postRepository.findPaginated(limit, offset, filters, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostsPaginated');
    }
  }

  async getPostsCount(filters?: ForumPostFilters): Promise<number> {
    try {
      return await this.postRepository.countPosts(filters);
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostsCount');
    }
  }

  async getPostsWithPagination(
    page: number, 
    limit: number, 
    filters?: ForumPostFilters, 
    userId?: string
  ): Promise<{
    data: ForumPostWithUser[];
    pagination: { page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
    total: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.postRepository.findPaginated(limit, offset, filters, userId),
        this.postRepository.countPosts(filters)
      ]);

      // Get all post IDs that have polls
      const postIdsWithPolls = data
        .filter(post => post.pollOptions && Array.isArray(post.pollOptions) && post.pollOptions.length > 0)
        .map(post => post.id);

      if (postIdsWithPolls.length > 0) {
        // Fetch poll results and user votes in parallel for efficiency
        const [pollResultsByPost, votesByPost] = await Promise.all([
          this.pollRepository.getBulkPollResults(postIdsWithPolls),
          userId ? this.pollRepository.getBulkUserPollVotes(postIdsWithPolls, userId) : Promise.resolve(new Map())
        ]);

        // Enrich each post with poll results (vote counts) and user votes
        const enrichedData = data.map(post => {
          if (postIdsWithPolls.includes(post.id)) {
            const pollResults = pollResultsByPost.get(post.id);
            return {
              ...post,
              pollOptions: pollResults?.options || post.pollOptions,
              userVotes: userId ? (votesByPost.get(post.id) || []) : []
            };
          }
          return post;
        });

        const totalPages = Math.ceil(total / limit);

        return {
          data: enrichedData as ForumPostWithUser[],
          pagination: {
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          },
          total
        };
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        total
      };
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostsWithPagination');
    }
  }

  async getSavedPosts(userId: string): Promise<any[]> {
    try {
      return await this.interactionRepository.getSavedPostsForUser(userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getSavedPosts');
    }
  }

  async getPostAnalytics(postId: string): Promise<any> {
    try {
      return await this.interactionRepository.getPostAnalytics(postId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostAnalytics');
    }
  }

  async votePollOption(postId: string, userId: string, optionId: string): Promise<any> {
    try {
      return await this.pollRepository.votePollOption(postId, userId, optionId);
    } catch (error) {
      return this.handleError(error, 'ForumService.votePollOption');
    }
  }

  async getPollResults(postId: string): Promise<any> {
    try {
      return await this.pollRepository.getPollResults(postId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getPollResults');
    }
  }

  async getUserPollVotes(postId: string, userId: string): Promise<any[]> {
    try {
      return await this.pollRepository.getUserPollVotes(postId, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getUserPollVotes');
    }
  }

  async getPostWithUser(id: string): Promise<any> {
    try {
      return await this.postRepository.getPostWithUser(id);
    } catch (error) {
      return this.handleError(error, 'ForumService.getPostWithUser');
    }
  }

  async createForumPost(data: InsertForumPostEnhanced): Promise<ForumPostEnhanced> {
    try {
      this.validateRequired(data, ['authorId', 'content']);

      const errors: Record<string, string> = {};

      const authorIdValidation = CommonValidators.validateUUID(data.authorId, 'Author ID');
      if (!authorIdValidation.valid) {
        errors.authorId = authorIdValidation.error!;
      }

      const contentValidation = CommonValidators.validateStringLength(data.content, 1, 10000, 'Post content');
      if (!contentValidation.valid) {
        errors.content = contentValidation.error!;
      }

      if (data.title) {
        const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, 'Post title');
        if (!titleValidation.valid) {
          errors.title = titleValidation.error!;
        }
      }

      const validCategories = ['uk_study', 'visa_tips', 'ielts_prep', 'general', 'usa_study', 'canada_study', 'australia_study'];
      if (data.category && !validCategories.includes(data.category)) {
        errors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Forum Post', errors);
      }

      return await this.postRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'ForumService.createForumPost');
    }
  }

  async getUserPostLimit(userId: string): Promise<any> {
    try {
      return await this.postRepository.getUserPostLimit(userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getUserPostLimit');
    }
  }

  async updateUserPostLimit(userId: string): Promise<void> {
    try {
      await this.postRepository.updateUserPostLimit(userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.updateUserPostLimit');
    }
  }

  async reportPost(postId: string, userId: string, reportReason: string, reportDetails?: string): Promise<any> {
    try {
      const existingReport = await this.reportsRepository.findByPostAndUser(postId, userId);
      if (existingReport) {
        throw new DuplicateResourceError('Report', 'post and user combination', `${postId}-${userId}`);
      }

      const report = await this.reportsRepository.create({
        postId,
        reporterUserId: userId,
        reportReason: reportReason as any,
        reportDetails: reportDetails
      });

      await this.postRepository.incrementReportCount(postId);

      return report;
    } catch (error) {
      return this.handleError(error, 'ForumService.reportPost');
    }
  }

  async getUserVotes(postId: string): Promise<any[]> {
    try {
      return await this.pollRepository.getUserVotes(postId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getUserVotes');
    }
  }

  async getUserVoteStatus(postId: string, userId: string): Promise<{ hasVoted: boolean; optionId: string | null }> {
    try {
      return await this.pollRepository.getUserVoteStatus(postId, userId);
    } catch (error) {
      return this.handleError(error, 'ForumService.getUserVoteStatus');
    }
  }

  async getImagePath(filename: string): Promise<string> {
    try {
      const path = await import('path');
      const imagePath = path.join(process.cwd(), 'uploads', 'forum-images', filename);
      return imagePath;
    } catch (error) {
      return this.handleError(error, 'ForumService.getImagePath');
    }
  }

  async getUserSpecificPollData(postId: string, currentUserId: string | null): Promise<{
    pollOptions: any[];
    userVotes: string[];
    showResults: boolean;
  } | null> {
    try {
      const post = await this.getPostWithUser(postId);
      if (!post || !post.pollQuestion) {
        return null;
      }

      let userVotes: string[] = [];
      if (currentUserId && post.pollOptions) {
        const votes = await this.pollRepository.getUserPollVotes(postId, currentUserId);
        userVotes = votes;
      }

      const hasUserVoted = userVotes.length > 0;

      if (hasUserVoted) {
        const pollResults = await this.getPollResults(postId);
        return {
          pollOptions: pollResults ? pollResults.options : post.pollOptions,
          userVotes: userVotes,
          showResults: true
        };
      } else {
        return {
          pollOptions: this.getCleanPollOptionsForNonVoters(post.pollOptions),
          userVotes: [],
          showResults: false
        };
      }
    } catch (error) {
      return this.handleError(error, 'ForumService.getUserSpecificPollData');
    }
  }

  private getCleanPollOptionsForNonVoters(pollOptions: any): any[] {
    if (!pollOptions || !Array.isArray(pollOptions)) {
      return [];
    }
    
    return pollOptions.map((option, index) => {
      if (typeof option === 'object' && option !== null) {
        return {
          id: option.id || option.optionId || `option_${index}`,
          text: option.text || option.option || String(option)
        };
      }
      if (typeof option === 'string') {
        return {
          id: `option_${index}`,
          text: option
        };
      }
      return {
        id: `option_${index}`,
        text: String(option || '')
      };
    });
  }

  formatUploadedImages(files: Express.Multer.File[]): UploadedImageInfo[] {
    return files.map(file => ({
      filename: file.filename,
      url: `/api/forum/images/${file.filename}`,
      originalName: file.originalname,
      size: file.size
    }));
  }
}

export const forumService = new ForumService();
