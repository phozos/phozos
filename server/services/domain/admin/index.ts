// Admin Service Exports - Phase 4.1
// Decomposed from monolithic AdminService into focused domain services

export { AdminUserService, adminUserService } from './user-admin.service';
export type { IAdminUserService } from './user-admin.service';

export { AdminUniversityService, adminUniversityService } from './university-admin.service';
export type { IAdminUniversityService } from './university-admin.service';

export { AdminStudentService, adminStudentService } from './student-admin.service';
export type { IAdminStudentService } from './student-admin.service';

export { AdminCompanyService, adminCompanyService } from './company-admin.service';
export type { IAdminCompanyService } from './company-admin.service';

export { AdminSecurityService, adminSecurityService } from './security-admin.service';
export type { IAdminSecurityService } from './security-admin.service';

export { AdminTestimonialService, adminTestimonialService } from './testimonial-admin.service';
export type { IAdminTestimonialService } from './testimonial-admin.service';

export { AdminForumModerationService, adminForumModerationService } from './forum-moderation.service';
export type { IAdminForumModerationService } from './forum-moderation.service';

export { AdminStaffInvitationService, adminStaffInvitationService } from './staff-invitation.service';
export type { IAdminStaffInvitationService } from './staff-invitation.service';

export { AdminAnalyticsService, adminAnalyticsService } from './analytics-admin.service';
export type { IAdminAnalyticsService } from './analytics-admin.service';
