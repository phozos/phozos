import { describe, it, expect, beforeEach } from 'vitest';
import { AdminAnalyticsService } from '../analytics-admin.service';

describe('AdminAnalyticsService', () => {
  let adminAnalyticsService: AdminAnalyticsService;

  beforeEach(() => {
    adminAnalyticsService = new AdminAnalyticsService();
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      const stats = await adminAnalyticsService.getSystemStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalStudents');
      expect(stats).toHaveProperty('totalApplications');
      expect(stats).toHaveProperty('totalUniversities');
      expect(stats).toHaveProperty('pendingTasks');
      expect(stats).toHaveProperty('newSignups');
      expect(stats).toHaveProperty('conversionRate');
      
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.conversionRate).toBe('number');
    });
  });

  describe('getAnalyticsDashboard', () => {
    it('should return analytics dashboard data', async () => {
      const dashboard = await adminAnalyticsService.getAnalyticsDashboard();
      
      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty('activeStudents');
      expect(dashboard).toHaveProperty('totalApplications');
      expect(dashboard).toHaveProperty('successRate');
      expect(dashboard).toHaveProperty('teamMembers');
      expect(dashboard).toHaveProperty('recentActivity');
      
      expect(typeof dashboard.activeStudents).toBe('number');
      expect(Array.isArray(dashboard.recentActivity)).toBe(true);
    });
  });

  describe('getAllApplications', () => {
    it('should return all applications', async () => {
      const applications = await adminAnalyticsService.getAllApplications();
      expect(Array.isArray(applications)).toBe(true);
    });
  });
});
