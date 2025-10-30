import { BaseService } from '../../base.service';
import { IForumPostRepository, IForumReportsRepository, IUserRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { ForumPostReport, InsertForumPostReport, ForumPostReportWithMetadata } from '@shared/schema';
import {
  DuplicateResourceError,
  ResourceNotFoundError,
  ValidationServiceError
} from '../../errors';
import { CommonValidators } from '../../validation';

export interface IAdminForumModerationService {
  reportPost(reportData: InsertForumPostReport): Promise<ForumPostReportWithMetadata>;
  getReportedPosts(): Promise<any[]>;
  getReportDetails(postId: string): Promise<any[]>;
  restoreReportedPost(postId: string, adminId: string): Promise<boolean>;
  permanentlyDeleteReportedPost(postId: string, adminId: string): Promise<boolean>;
}

export class AdminForumModerationService extends BaseService implements IAdminForumModerationService {
  constructor(
    private forumPostRepository: IForumPostRepository = container.get<IForumPostRepository>(TYPES.IForumPostRepository),
    private forumReportsRepository: IForumReportsRepository = container.get<IForumReportsRepository>(TYPES.IForumReportsRepository),
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  async reportPost(reportData: InsertForumPostReport): Promise<ForumPostReportWithMetadata> {
    try {
      const errors: Record<string, string> = {};

      const postIdValidation = CommonValidators.validateUUID(reportData.postId, 'Post ID');
      if (!postIdValidation.valid) {
        errors.postId = postIdValidation.error!;
      }

      const reporterIdValidation = CommonValidators.validateUUID(reportData.reporterUserId, 'Reporter user ID');
      if (!reporterIdValidation.valid) {
        errors.reporterUserId = reporterIdValidation.error!;
      }

      const reportReasonValidation = CommonValidators.validateStringLength(reportData.reportReason, 1, 255, 'Report reason');
      if (!reportReasonValidation.valid) {
        errors.reportReason = reportReasonValidation.error!;
      }

      if (reportData.reportDetails) {
        const reportDetailsValidation = CommonValidators.validateStringLength(reportData.reportDetails, 0, 1000, 'Report details');
        if (!reportDetailsValidation.valid) {
          errors.reportDetails = reportDetailsValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Forum Post Report', errors);
      }

      // Check if user already reported this post
      const existingReport = await this.forumReportsRepository.findByPostAndUser(reportData.postId, reportData.reporterUserId);

      if (existingReport) {
        throw new DuplicateResourceError('Report', 'post and user combination', `${reportData.postId}-${reportData.reporterUserId}`);
      }

      // Get current post to check report count before inserting
      const post = await this.forumPostRepository.findById(reportData.postId);
      if (!post) {
        throw new ResourceNotFoundError('Forum Post', reportData.postId);
      }

      const currentReportCount = post.reportCount || 0;

      // Create the report
      const report = await this.forumReportsRepository.create(reportData);

      // Increment report count
      const newReportCount = currentReportCount + 1;
      let wasAutoHidden = false;

      // Auto-hide if report count reaches threshold (e.g., 3)
      if (newReportCount >= 3 && !post.isHiddenByReports) {
        await this.forumPostRepository.update(reportData.postId, {
          reportCount: newReportCount,
          isHiddenByReports: true,
          hiddenAt: new Date()
        });
        wasAutoHidden = true;
      } else {
        await this.forumPostRepository.update(reportData.postId, {
          reportCount: newReportCount
        });
      }

      return {
        ...report,
        currentReportCount: newReportCount,
        wasAutoHidden
      };
    } catch (error) {
      return this.handleError(error, 'AdminForumModerationService.reportPost');
    }
  }

  async getReportedPosts(): Promise<any[]> {
    try {
      // Get posts that are hidden by reports
      const hiddenPosts = await this.forumPostRepository.getReportedPosts();

      // Enrich with post and reporter data
      const enrichedReports = await Promise.all(
        hiddenPosts.map(async (post) => {
          // Get all reports for this post
          const reports = await this.forumReportsRepository.findByPostId(post.id);

          // Get reporter details for the first report
          const firstReporter = reports.length > 0 
            ? await this.userRepository.findById(reports[0].reporterUserId)
            : null;

          return {
            postId: post.id,
            title: post.title,
            content: post.content?.substring(0, 200),
            authorId: post.authorId,
            reportCount: post.reportCount || 0,
            hiddenAt: post.hiddenAt,
            reports: reports.map(r => ({
              id: r.id,
              reason: r.reportReason,
              details: r.reportDetails,
              createdAt: r.createdAt
            })),
            firstReporter: firstReporter ? {
              id: firstReporter.id,
              name: `${firstReporter.firstName} ${firstReporter.lastName}`,
              email: firstReporter.email
            } : null
          };
        })
      );

      return enrichedReports;
    } catch (error) {
      return this.handleError(error, 'AdminForumModerationService.getReportedPosts');
    }
  }

  async getReportDetails(postId: string): Promise<any[]> {
    try {
      const errors: Record<string, string> = {};

      const postIdValidation = CommonValidators.validateUUID(postId, 'Post ID');
      if (!postIdValidation.valid) {
        errors.postId = postIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Report Details', errors);
      }

      return await this.forumReportsRepository.findByPostId(postId);
    } catch (error) {
      return this.handleError(error, 'AdminForumModerationService.getReportDetails');
    }
  }

  async restoreReportedPost(postId: string, adminId: string): Promise<boolean> {
    try {
      const errors: Record<string, string> = {};

      const postIdValidation = CommonValidators.validateUUID(postId, 'Post ID');
      if (!postIdValidation.valid) {
        errors.postId = postIdValidation.error!;
      }

      const adminIdValidation = CommonValidators.validateUUID(adminId, 'Admin ID');
      if (!adminIdValidation.valid) {
        errors.adminId = adminIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Restore Post', errors);
      }

      // Restore the post by unhiding it and resetting report count
      await this.forumPostRepository.update(postId, { 
        isHiddenByReports: false,
        reportCount: 0,
        hiddenAt: null
      });

      // Delete all reports for this post (admin cleared them)
      await this.forumReportsRepository.deleteByPostId(postId);

      return true;
    } catch (error) {
      return this.handleError(error, 'AdminForumModerationService.restoreReportedPost');
    }
  }

  async permanentlyDeleteReportedPost(postId: string, adminId: string): Promise<boolean> {
    try {
      const errors: Record<string, string> = {};

      const postIdValidation = CommonValidators.validateUUID(postId, 'Post ID');
      if (!postIdValidation.valid) {
        errors.postId = postIdValidation.error!;
      }

      const adminIdValidation = CommonValidators.validateUUID(adminId, 'Admin ID');
      if (!adminIdValidation.valid) {
        errors.adminId = adminIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Delete Post', errors);
      }

      // Mark post as moderated (hidden) permanently
      await this.forumPostRepository.update(postId, { 
        isModerated: true,
        moderatorId: adminId,
        moderatedAt: new Date()
      });

      return true;
    } catch (error) {
      return this.handleError(error, 'AdminForumModerationService.permanentlyDeleteReportedPost');
    }
  }
}

// Export singleton instance
export const adminForumModerationService = new AdminForumModerationService();
