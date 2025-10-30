import { Router, Response } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

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

// User Subscriptions
router.get('/user-subscriptions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getUserSubscriptions(req, res)));
router.post('/student-subscription/:studentId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updateStudentSubscription(req, res)));
router.get('/students-subscriptions', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStudentsWithSubscriptions(req, res)));

// Forum Moderation
router.get('/forum/reported-posts', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getReportedPosts(req, res)));
router.get('/forum/posts/:id/reports', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPostReports(req, res)));
router.post('/forum/posts/:id/restore', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.restorePost(req, res)));
router.delete('/forum/posts/:id/permanent', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.permanentlyDeletePost(req, res)));

// Force Logout
router.post('/force-logout-all', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.forceLogoutAll(req, res)));

// Staff Invitation Links
router.post('/staff-invitation-links', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.createStaffInvitationLink(req, res)));
router.get('/staff-invitation-links', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getStaffInvitationLinks(req, res)));
router.put('/staff-invitation-links/:id/refresh', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.refreshStaffInvitationLink(req, res)));

export default router;
