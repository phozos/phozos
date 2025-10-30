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
export * from './security-settings.repository';
export * from './testimonial.repository';
export * from './student-timeline.repository';
export * from './forum-reports.repository';
export * from './staff-invitation.repository';

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
import { securitySettingsRepository } from './security-settings.repository';
import { testimonialRepository } from './testimonial.repository';
import { studentTimelineRepository } from './student-timeline.repository';
import { forumReportsRepository } from './forum-reports.repository';
import { staffInvitationRepository } from './staff-invitation.repository';

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
  securitySettings: securitySettingsRepository,
  testimonial: testimonialRepository,
  studentTimeline: studentTimelineRepository,
  forumReports: forumReportsRepository,
  staffInvitation: staffInvitationRepository
};
