export * from './base.repository';
export * from './errors';
export * from './user.repository';
export * from './student.repository';
export * from './university.repository';
export * from './course.repository';
export * from './application.repository';
export * from './document.repository';
export * from './forum-post.repository';
export * from './forum-comment.repository';
export * from './forum-interaction.repository';
export * from './forum-poll.repository';
export * from './notification.repository';
export * from './event.repository';
export * from './ai-matching.repository';
export * from './chat.repository';
export * from './payment.repository';
export * from './subscription.repository';
export * from './subscription-plan-audit.repository';
export * from './subscription-plan-notification.repository';
export * from './user-plan-notification.repository';
export * from './plan-migration.repository';
export * from './security-settings.repository';
export * from './testimonial.repository';
export * from './student-timeline.repository';
export * from './forum-reports.repository';
export * from './staff-invitation.repository';
export * from './quota-usage.repository';
export * from './feature-usage.repository';
export * from './partner-profile.repository';
export * from './partner-referral-link.repository';
export * from './referral-click.repository';
export * from './partner-student-referral.repository';
export * from './partner-commission.repository';
export * from './partner-payout.repository';

import { userRepository } from './user.repository';
import { studentRepository } from './student.repository';
import { universityRepository } from './university.repository';
import { courseRepository } from './course.repository';
import { applicationRepository } from './application.repository';
import { documentRepository } from './document.repository';
import { forumPostRepository } from './forum-post.repository';
import { forumCommentRepository } from './forum-comment.repository';
import { forumInteractionRepository } from './forum-interaction.repository';
import { forumPollRepository } from './forum-poll.repository';
import { notificationRepository } from './notification.repository';
import { eventRepository } from './event.repository';
import { aiMatchingRepository } from './ai-matching.repository';
import { chatRepository } from './chat.repository';
import { paymentRepository } from './payment.repository';
import { subscriptionPlanRepository, userSubscriptionRepository } from './subscription.repository';
import { subscriptionPlanAuditRepository } from './subscription-plan-audit.repository';
import { subscriptionPlanNotificationRepository } from './subscription-plan-notification.repository';
import { userPlanNotificationRepository } from './user-plan-notification.repository';
import { planMigrationRepository, planMigrationUserRepository } from './plan-migration.repository';
import { securitySettingsRepository } from './security-settings.repository';
import { testimonialRepository } from './testimonial.repository';
import { studentTimelineRepository } from './student-timeline.repository';
import { forumReportsRepository } from './forum-reports.repository';
import { staffInvitationRepository } from './staff-invitation.repository';
import { quotaUsageRepository } from './quota-usage.repository';
import { featureUsageRepository } from './feature-usage.repository';
import { partnerProfileRepository } from './partner-profile.repository';
import { partnerReferralLinkRepository } from './partner-referral-link.repository';
import { referralClickRepository } from './referral-click.repository';
import { partnerStudentReferralRepository } from './partner-student-referral.repository';
import { partnerCommissionRepository } from './partner-commission.repository';
import { partnerPayoutRepository } from './partner-payout.repository';

export const repositories = {
  user: userRepository,
  student: studentRepository,
  university: universityRepository,
  course: courseRepository,
  application: applicationRepository,
  document: documentRepository,
  forumPost: forumPostRepository,
  forumComment: forumCommentRepository,
  forumInteraction: forumInteractionRepository,
  forumPoll: forumPollRepository,
  notification: notificationRepository,
  event: eventRepository,
  aiMatching: aiMatchingRepository,
  chat: chatRepository,
  payment: paymentRepository,
  subscriptionPlan: subscriptionPlanRepository,
  userSubscription: userSubscriptionRepository,
  subscriptionPlanAudit: subscriptionPlanAuditRepository,
  subscriptionPlanNotification: subscriptionPlanNotificationRepository,
  userPlanNotification: userPlanNotificationRepository,
  planMigration: planMigrationRepository,
  planMigrationUser: planMigrationUserRepository,
  securitySettings: securitySettingsRepository,
  testimonial: testimonialRepository,
  studentTimeline: studentTimelineRepository,
  forumReports: forumReportsRepository,
  staffInvitation: staffInvitationRepository,
  quotaUsage: quotaUsageRepository,
  featureUsage: featureUsageRepository,
  partnerProfile: partnerProfileRepository,
  partnerReferralLink: partnerReferralLinkRepository,
  referralClick: referralClickRepository,
  partnerStudentReferral: partnerStudentReferralRepository,
  partnerCommission: partnerCommissionRepository,
  partnerPayout: partnerPayoutRepository
};
