import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminForumModerationService } from '../forum-moderation.service';
import { forumReportsRepository } from '../../../../repositories/forum-reports.repository';

describe('AdminForumModerationService', () => {
  let adminForumModerationService: AdminForumModerationService;
  let testReportIds: string[] = [];

  beforeEach(() => {
    adminForumModerationService = new AdminForumModerationService();
  });

  afterEach(async () => {
    for (const id of testReportIds) {
      try {
        await forumReportsRepository.delete(id);
      } catch (error) {
        console.log('Report cleanup failed:', error);
      }
    }
    testReportIds = [];
  });

  describe('getReportedPosts', () => {
    it('should return all reported posts', async () => {
      const reportedPosts = await adminForumModerationService.getReportedPosts();
      expect(Array.isArray(reportedPosts)).toBe(true);
    });
  });

  describe('reportPost', () => {
    it('should create a new post report', async () => {
      const reportData = {
        postId: 'test-post-id',
        reportedBy: 'test-user-id',
        reason: 'spam',
        details: 'This is a test report'
      };

      const report = await adminForumModerationService.reportPost(reportData);
      testReportIds.push(report.id);

      expect(report).toBeDefined();
      expect(report.postId).toBe(reportData.postId);
      expect(report.reason).toBe(reportData.reason);
    });
  });

  describe('restoreReportedPost', () => {
    it('should restore a reported post', async () => {
      const postId = 'test-post-id';
      const adminId = 'test-admin-id';
      const result = await adminForumModerationService.restoreReportedPost(postId, adminId);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('permanentlyDeleteReportedPost', () => {
    it('should permanently delete a reported post', async () => {
      const postId = 'test-post-id';
      const adminId = 'test-admin-id';
      const result = await adminForumModerationService.permanentlyDeleteReportedPost(postId, adminId);
      expect(typeof result).toBe('boolean');
    });
  });
});
