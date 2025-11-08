import { Router, Response } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import rateLimit from 'express-rate-limit';

// P0.6: Rate limiters for expensive operations to prevent DoS attacks
const versionCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 version creations per 15 minutes per admin
  message: 'Too many version creation requests. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip || 'unknown';
  }
});

const migrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 migrations per hour per admin
  message: 'Too many migration requests. Please try again in 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip || 'unknown';
  }
});

const bulkNotificationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1, // 1 bulk notification per 30 minutes per admin
  message: 'Too many bulk notification requests. Please try again in 30 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip || 'unknown';
  }
});

const router = Router();

// All routes require admin authentication
router.use(requireAdmin);

// System Stats
router.get('/stats', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStats(req, res)));

// Team Member Management
router.post('/team-members', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createTeamMember(req, res)));

// Company Profile Management
router.post('/company-profiles', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createCompanyProfile(req, res)));
router.get('/company-profiles', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getCompanyProfiles(req, res)));
router.put('/company-profiles/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateCompanyProfile(req, res)));
router.post('/company-profiles/:id/reset-password', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.resetCompanyPassword(req, res)));
router.put('/company-profiles/:id/toggle-status', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.toggleCompanyStatus(req, res)));
router.delete('/company-profiles/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deleteCompanyProfile(req, res)));

// University Management
router.get('/universities', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getUniversities(req, res)));
router.post('/universities', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createUniversity(req, res)));
router.put('/universities/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateUniversity(req, res)));
router.delete('/universities/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deleteUniversity(req, res)));

// University Bulk Import
router.post('/universities/bulk-import', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.bulkImportUniversities(req, res)));
router.get('/universities/sample-csv', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSampleCSV(req, res)));

// Student Management
router.get('/students', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStudents(req, res)));
router.get('/students/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStudentById(req, res)));
router.post('/students/:studentId/reset-password', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.resetStudentPassword(req, res)));
router.put('/students/:studentId/toggle-status', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.toggleStudentStatus(req, res)));

// Staff Management
router.get('/staff', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStaff(req, res)));
router.post('/staff', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createStaff(req, res)));
router.get('/staff/:id/credentials', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStaffCredentials(req, res)));
router.post('/staff/:id/reset-password', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.resetStaffPassword(req, res)));
router.put('/staff/:id/toggle-status', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.toggleStaffStatus(req, res)));
router.put('/staff/:id/approve', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.approveStaff(req, res)));
router.put('/staff/:id/reject', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.rejectStaff(req, res)));
router.put('/staff/:id/suspend', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.suspendStaff(req, res)));
router.put('/staff/:id/reactivate', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.reactivateStaff(req, res)));

// Counselor Assignment
router.get('/counselors', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getCounselors(req, res)));
router.post('/assign-student', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.assignStudent(req, res)));
router.post('/unassign-student', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.unassignStudent(req, res)));

// Security Settings
router.get('/security/settings', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSecuritySettings(req, res)));
router.put('/security/settings/:settingKey', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateSecuritySetting(req, res)));

// Security-Settings (legacy route)
router.get('/security-settings', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSecuritySettings(req, res)));
router.post('/security-settings', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateSecuritySetting(req, res)));

// Payment Settings
router.get('/payment-settings', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPaymentSettings(req, res)));
router.put('/payment-settings/:gateway', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updatePaymentSettings(req, res)));
router.patch('/payment-settings/:gateway/toggle', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.togglePaymentGateway(req, res)));

// Subscription Plans
router.get('/subscription-plans', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSubscriptionPlans(req, res)));
router.post('/subscription-plans', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createSubscriptionPlan(req, res)));
router.put('/subscription-plans/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateSubscriptionPlan(req, res)));
router.delete('/subscription-plans/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deleteSubscriptionPlan(req, res)));

// Subscription Plan Change History
router.get('/subscription-plans/recent-changes', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getRecentPlanChanges(req, res)));
router.get('/subscription-plans/:id/change-history', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanChangeHistory(req, res)));

// Plan Versioning
router.post('/subscription-plans/:basePlanId/versions', versionCreationLimiter, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createPlanVersion(req, res)));
router.get('/subscription-plans/:basePlanId/versions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanVersions(req, res)));
router.get('/subscription-plans/:basePlanId/versions/:version', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanVersion(req, res)));

// Phase 4: New API endpoints for versioning and grandfathering
router.post('/subscription-plans/:basePlanId/price', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updatePlanPrice(req, res)));
router.get('/subscription-plans/:basePlanId/versions/history', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanVersionHistory(req, res)));
router.post('/subscription-plans/:id/deprecate', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deprecatePlan(req, res)));
router.post('/subscription-plans/:id/archive', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.archivePlan(req, res)));
router.get('/subscription-plans/:id/analytics', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanAnalytics(req, res)));

// User Subscriptions
router.get('/user-subscriptions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getUserSubscriptions(req, res)));
router.post('/student-subscription/:studentId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateStudentSubscription(req, res)));
router.get('/students-subscriptions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStudentsWithSubscriptions(req, res)));
router.delete('/user-subscriptions/:subscriptionId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.cancelUserSubscription(req, res)));
router.get('/user-subscriptions/:userId/payment-history', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getUserPaymentHistory(req, res)));
router.get('/user-subscriptions/:userId/events', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getUserSubscriptionEvents(req, res)));

// Failed Payments
router.get('/failed-payments', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFailedPayments(req, res)));

// Forum Moderation
router.get('/forum/reported-posts', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getReportedPosts(req, res)));
router.get('/forum/posts/:id/reports', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPostReports(req, res)));
router.post('/forum/posts/:id/restore', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.restorePost(req, res)));
router.delete('/forum/posts/:id/permanent', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.permanentlyDeletePost(req, res)));

// Force Logout
// TODO: Implement forceLogoutAll method in AdminController
// router.post('/force-logout-all', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.forceLogoutAll(req, res)));

// Staff Invitation Links
router.post('/staff-invitation-links', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createStaffInvitationLink(req, res)));
router.get('/staff-invitation-links', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStaffInvitationLinks(req, res)));
router.put('/staff-invitation-links/:id/refresh', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.refreshStaffInvitationLink(req, res)));

// Subscription Analytics
router.get('/analytics/subscriptions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSubscriptionAnalytics(req, res)));
router.get('/analytics/revenue', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getRevenueAnalytics(req, res)));
router.get('/analytics/growth', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getSubscriptionGrowth(req, res)));

// Outbox Monitoring
router.get('/outbox/metrics', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getOutboxMetrics(req, res)));
router.get('/outbox/events', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getOutboxEvents(req, res)));
router.post('/outbox/events/:id/retry', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.retryOutboxEvent(req, res)));
router.delete('/outbox/events/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deleteOutboxEvent(req, res)));

// Plan Migrations
router.get('/migrations', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getMigrations(req, res)));
router.post('/migrations', migrationLimiter, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createMigration(req, res)));
router.get('/migrations/:id', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getMigration(req, res)));
router.post('/migrations/:id/start', migrationLimiter, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.startMigration(req, res)));
router.post('/migrations/:id/cancel', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.cancelMigration(req, res)));
router.get('/migrations/:id/stats', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getMigrationStats(req, res)));

// Comprehensive Plan Analytics
router.get('/subscription-plans/analytics', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getComprehensivePlanAnalytics(req, res)));

// Feature Management (Phase 4)
// Feature Impact Preview
router.post('/features/preview/:planId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureImpactPreview(req, res)));

// Feature Management Dashboard
router.get('/features/dashboard', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureManagementDashboard(req, res)));
router.get('/features/usage', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureUsageOverview(req, res)));
router.get('/features/health', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureHealth(req, res)));
router.get('/features/:featureName/health', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureHealth(req, res)));
router.get('/features/:featureName/lifecycle', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getFeatureLifecycle(req, res)));

// Bulk Operations
router.post('/features/bulk', bulkNotificationLimiter, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.executeBulkFeatureOperation(req, res)));

// Feature Deprecation Workflow
router.post('/features/deprecations', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createDeprecationSchedule(req, res)));
router.get('/features/deprecations', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getDeprecationSchedules(req, res)));
router.get('/features/deprecations/:scheduleId', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getDeprecationSchedule(req, res)));
router.put('/features/deprecations/update', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateDeprecationSchedule(req, res)));
router.post('/features/deprecations/:scheduleId/cancel', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.cancelDeprecationSchedule(req, res)));
router.get('/features/deprecations/:scheduleId/impact', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getDeprecationImpact(req, res)));
router.get('/features/deprecations/:scheduleId/timeline', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getDeprecationTimeline(req, res)));

export default router;
