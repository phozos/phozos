/**
 * Dependency Injection Container
 * Provides centralized dependency management for services
 */

import {
  IUserRepository,
  userRepository,
  IStudentRepository,
  studentRepository,
  IUniversityRepository,
  universityRepository,
  ICourseRepository,
  courseRepository,
  IApplicationRepository,
  applicationRepository,
  IDocumentRepository,
  documentRepository,
  IForumPostRepository,
  forumPostRepository,
  IForumCommentRepository,
  forumCommentRepository,
  IForumInteractionRepository,
  forumInteractionRepository,
  IForumPollRepository,
  forumPollRepository,
  IForumReportsRepository,
  forumReportsRepository,
  INotificationRepository,
  notificationRepository,
  IEventRepository,
  eventRepository,
  IAIMatchingRepository,
  aiMatchingRepository,
  IChatRepository,
  chatRepository,
  IPaymentRepository,
  paymentRepository,
  ISubscriptionPlanRepository,
  subscriptionPlanRepository,
  IUserSubscriptionRepository,
  userSubscriptionRepository,
  ISecuritySettingsRepository,
  securitySettingsRepository,
  ITestimonialRepository,
  testimonialRepository,
  IStudentTimelineRepository,
  studentTimelineRepository,
  IStaffInvitationRepository,
  staffInvitationRepository,
} from '../repositories';
import { jwtService } from '../security/jwtService';
import { validationService } from './infrastructure/validation.service';
import { temporaryPasswordService } from './domain/temporaryPassword.service';

/**
 * DI Container Interface
 */
export interface IContainer {
  get<T>(token: symbol): T;
}

/**
 * Dependency Injection Tokens
 * Symbol-based tokens for type-safe dependency resolution
 */
export const TYPES = {
  // Repository Tokens
  IUserRepository: Symbol.for('IUserRepository'),
  IStudentRepository: Symbol.for('IStudentRepository'),
  IUniversityRepository: Symbol.for('IUniversityRepository'),
  ICourseRepository: Symbol.for('ICourseRepository'),
  IApplicationRepository: Symbol.for('IApplicationRepository'),
  IDocumentRepository: Symbol.for('IDocumentRepository'),
  IForumPostRepository: Symbol.for('IForumPostRepository'),
  IForumCommentRepository: Symbol.for('IForumCommentRepository'),
  IForumInteractionRepository: Symbol.for('IForumInteractionRepository'),
  IForumPollRepository: Symbol.for('IForumPollRepository'),
  IForumReportsRepository: Symbol.for('IForumReportsRepository'),
  INotificationRepository: Symbol.for('INotificationRepository'),
  IEventRepository: Symbol.for('IEventRepository'),
  IAIMatchingRepository: Symbol.for('IAIMatchingRepository'),
  IChatRepository: Symbol.for('IChatRepository'),
  IPaymentRepository: Symbol.for('IPaymentRepository'),
  ISubscriptionPlanRepository: Symbol.for('ISubscriptionPlanRepository'),
  IUserSubscriptionRepository: Symbol.for('IUserSubscriptionRepository'),
  ISecuritySettingsRepository: Symbol.for('ISecuritySettingsRepository'),
  ITestimonialRepository: Symbol.for('ITestimonialRepository'),
  IStudentTimelineRepository: Symbol.for('IStudentTimelineRepository'),
  IStaffInvitationRepository: Symbol.for('IStaffInvitationRepository'),
  
  // Infrastructure Service Tokens (Phase 5.4)
  WebSocketService: Symbol.for('WebSocketService'),
  WebSocketEventHandlers: Symbol.for('WebSocketEventHandlers'),
  
  // Domain Service Tokens (Phase 3)
  IAuthService: Symbol.for('IAuthService'),
  IApplicationService: Symbol.for('IApplicationService'),
  IChatService: Symbol.for('IChatService'),
  ICompanyProfileService: Symbol.for('ICompanyProfileService'),
  ICounselorAssignmentService: Symbol.for('ICounselorAssignmentService'),
  ICounselorDashboardService: Symbol.for('ICounselorDashboardService'),
  IDocumentService: Symbol.for('IDocumentService'),
  IEventService: Symbol.for('IEventService'),
  IForumService: Symbol.for('IForumService'),
  INotificationService: Symbol.for('INotificationService'),
  IPaymentService: Symbol.for('IPaymentService'),
  IRegistrationService: Symbol.for('IRegistrationService'),
  ISubscriptionService: Symbol.for('ISubscriptionService'),
  ITemporaryPasswordService: Symbol.for('ITemporaryPasswordService'),
  ITestimonialService: Symbol.for('ITestimonialService'),
  IUniversityService: Symbol.for('IUniversityService'),
  IUserProfileService: Symbol.for('IUserProfileService'),
  IUserSubscriptionService: Symbol.for('IUserSubscriptionService'),
  
  // Admin Service Tokens (Phase 3)
  IAdminAnalyticsService: Symbol.for('IAdminAnalyticsService'),
  IAdminCompanyService: Symbol.for('IAdminCompanyService'),
  IAdminForumModerationService: Symbol.for('IAdminForumModerationService'),
  IAdminSecurityService: Symbol.for('IAdminSecurityService'),
  IAdminStaffInvitationService: Symbol.for('IAdminStaffInvitationService'),
  IAdminStudentService: Symbol.for('IAdminStudentService'),
  IAdminTestimonialService: Symbol.for('IAdminTestimonialService'),
  IAdminUniversityService: Symbol.for('IAdminUniversityService'),
  IAdminUserService: Symbol.for('IAdminUserService'),
  
  // Integration Service Tokens (Phase 3)
  IAIMatchingService: Symbol.for('IAIMatchingService'),
  
  // Infrastructure Service Tokens (Phase 3)
  IValidationService: Symbol.for('IValidationService'),
  
  // Security Service Tokens (Phase 3)
  JwtService: Symbol.for('JwtService'),
} as const;

/**
 * Dependency Injection Container Implementation
 */
class Container implements IContainer {
  private bindings = new Map<symbol, any>();

  constructor() {
    // Bind repository interfaces to concrete implementations
    this.bindings.set(TYPES.IUserRepository, userRepository);
    this.bindings.set(TYPES.IStudentRepository, studentRepository);
    this.bindings.set(TYPES.IUniversityRepository, universityRepository);
    this.bindings.set(TYPES.ICourseRepository, courseRepository);
    this.bindings.set(TYPES.IApplicationRepository, applicationRepository);
    this.bindings.set(TYPES.IDocumentRepository, documentRepository);
    this.bindings.set(TYPES.IForumPostRepository, forumPostRepository);
    this.bindings.set(TYPES.IForumCommentRepository, forumCommentRepository);
    this.bindings.set(TYPES.IForumInteractionRepository, forumInteractionRepository);
    this.bindings.set(TYPES.IForumPollRepository, forumPollRepository);
    this.bindings.set(TYPES.IForumReportsRepository, forumReportsRepository);
    this.bindings.set(TYPES.INotificationRepository, notificationRepository);
    this.bindings.set(TYPES.IEventRepository, eventRepository);
    this.bindings.set(TYPES.IAIMatchingRepository, aiMatchingRepository);
    this.bindings.set(TYPES.IChatRepository, chatRepository);
    this.bindings.set(TYPES.IPaymentRepository, paymentRepository);
    this.bindings.set(TYPES.ISubscriptionPlanRepository, subscriptionPlanRepository);
    this.bindings.set(TYPES.IUserSubscriptionRepository, userSubscriptionRepository);
    this.bindings.set(TYPES.ISecuritySettingsRepository, securitySettingsRepository);
    this.bindings.set(TYPES.ITestimonialRepository, testimonialRepository);
    this.bindings.set(TYPES.IStudentTimelineRepository, studentTimelineRepository);
    this.bindings.set(TYPES.IStaffInvitationRepository, staffInvitationRepository);
    
    // Bind security services
    this.bindings.set(TYPES.JwtService, jwtService);
    
    // Bind infrastructure services (no dependencies - can be bound immediately)
    this.bindings.set(TYPES.IValidationService, validationService);
    this.bindings.set(TYPES.ITemporaryPasswordService, temporaryPasswordService);
    
    // Note: Service bindings are registered lazily to avoid circular dependencies
    // Services will be bound when they are first requested
  }

  /**
   * Resolve a dependency by its token
   * @param token - Symbol token for the dependency
   * @returns The bound implementation
   * @throws Error if no binding found for token
   */
  get<T>(token: symbol): T {
    const binding = this.bindings.get(token);
    if (!binding) {
      throw new Error(`No binding found for token: ${token.toString()}`);
    }
    return binding as T;
  }

  /**
   * Bind a new implementation to a token (for testing/mocking)
   * @param token - Symbol token
   * @param implementation - Implementation to bind
   */
  bind<T>(token: symbol, implementation: T): void {
    this.bindings.set(token, implementation);
  }

  /**
   * Unbind a token (for testing cleanup)
   * @param token - Symbol token to unbind
   */
  unbind(token: symbol): void {
    this.bindings.delete(token);
  }

  /**
   * Reset all bindings to defaults (for testing)
   */
  reset(): void {
    this.bindings.clear();
    // Re-initialize with default bindings
    this.bindings.set(TYPES.IUserRepository, userRepository);
    this.bindings.set(TYPES.IStudentRepository, studentRepository);
    this.bindings.set(TYPES.IUniversityRepository, universityRepository);
    this.bindings.set(TYPES.ICourseRepository, courseRepository);
    this.bindings.set(TYPES.IApplicationRepository, applicationRepository);
    this.bindings.set(TYPES.IDocumentRepository, documentRepository);
    this.bindings.set(TYPES.IForumPostRepository, forumPostRepository);
    this.bindings.set(TYPES.IForumCommentRepository, forumCommentRepository);
    this.bindings.set(TYPES.IForumInteractionRepository, forumInteractionRepository);
    this.bindings.set(TYPES.IForumPollRepository, forumPollRepository);
    this.bindings.set(TYPES.IForumReportsRepository, forumReportsRepository);
    this.bindings.set(TYPES.INotificationRepository, notificationRepository);
    this.bindings.set(TYPES.IEventRepository, eventRepository);
    this.bindings.set(TYPES.IAIMatchingRepository, aiMatchingRepository);
    this.bindings.set(TYPES.IChatRepository, chatRepository);
    this.bindings.set(TYPES.IPaymentRepository, paymentRepository);
    this.bindings.set(TYPES.ISubscriptionPlanRepository, subscriptionPlanRepository);
    this.bindings.set(TYPES.IUserSubscriptionRepository, userSubscriptionRepository);
    this.bindings.set(TYPES.ISecuritySettingsRepository, securitySettingsRepository);
    this.bindings.set(TYPES.ITestimonialRepository, testimonialRepository);
    this.bindings.set(TYPES.IStudentTimelineRepository, studentTimelineRepository);
    this.bindings.set(TYPES.IStaffInvitationRepository, staffInvitationRepository);
    this.bindings.set(TYPES.JwtService, jwtService);
  }
  
  /**
   * Register service bindings (called after all services are defined)
   * This prevents circular dependency issues
   */
  async registerServices(): Promise<void> {
    // Import services lazily using dynamic imports to avoid circular dependencies
    const { authService } = await import('./domain/auth.service');
    const { applicationService } = await import('./domain/application.service');
    const { chatService } = await import('./domain/chat.service');
    const { companyProfileService } = await import('./domain/company-profile.service');
    const { counselorAssignmentService } = await import('./domain/counselor-assignment.service');
    const { counselorDashboardService } = await import('./domain/counselor-dashboard.service');
    const { documentService } = await import('./domain/document.service');
    const { eventService } = await import('./domain/event.service');
    const { forumService } = await import('./domain/forum.service');
    const { notificationService } = await import('./domain/notification.service');
    const { paymentService } = await import('./domain/payment.service');
    const { registrationService } = await import('./domain/registration.service');
    const { subscriptionService } = await import('./domain/subscription.service');
    const { temporaryPasswordService } = await import('./domain/temporaryPassword.service');
    const { testimonialService } = await import('./domain/testimonial.service');
    const { universityService } = await import('./domain/university.service');
    const { userProfileService } = await import('./domain/user-profile.service');
    const { userSubscriptionService } = await import('./domain/user-subscription.service');
    
    const { adminAnalyticsService } = await import('./domain/admin/analytics-admin.service');
    const { adminCompanyService } = await import('./domain/admin/company-admin.service');
    const { adminForumModerationService } = await import('./domain/admin/forum-moderation.service');
    const { adminSecurityService } = await import('./domain/admin/security-admin.service');
    const { adminStaffInvitationService } = await import('./domain/admin/staff-invitation.service');
    const { adminStudentService } = await import('./domain/admin/student-admin.service');
    const { adminTestimonialService } = await import('./domain/admin/testimonial-admin.service');
    const { adminUniversityService } = await import('./domain/admin/university-admin.service');
    const { adminUserService } = await import('./domain/admin/user-admin.service');
    
    const { aiMatchingService } = await import('./integration/ai-matching.service');
    
    // Bind domain services
    this.bindings.set(TYPES.IAuthService, authService);
    this.bindings.set(TYPES.IApplicationService, applicationService);
    this.bindings.set(TYPES.IChatService, chatService);
    this.bindings.set(TYPES.ICompanyProfileService, companyProfileService);
    this.bindings.set(TYPES.ICounselorAssignmentService, counselorAssignmentService);
    this.bindings.set(TYPES.ICounselorDashboardService, counselorDashboardService);
    this.bindings.set(TYPES.IDocumentService, documentService);
    this.bindings.set(TYPES.IEventService, eventService);
    this.bindings.set(TYPES.IForumService, forumService);
    this.bindings.set(TYPES.INotificationService, notificationService);
    this.bindings.set(TYPES.IPaymentService, paymentService);
    this.bindings.set(TYPES.IRegistrationService, registrationService);
    this.bindings.set(TYPES.ISubscriptionService, subscriptionService);
    this.bindings.set(TYPES.ITemporaryPasswordService, temporaryPasswordService);
    this.bindings.set(TYPES.ITestimonialService, testimonialService);
    this.bindings.set(TYPES.IUniversityService, universityService);
    this.bindings.set(TYPES.IUserProfileService, userProfileService);
    this.bindings.set(TYPES.IUserSubscriptionService, userSubscriptionService);
    
    // Bind admin services
    this.bindings.set(TYPES.IAdminAnalyticsService, adminAnalyticsService);
    this.bindings.set(TYPES.IAdminCompanyService, adminCompanyService);
    this.bindings.set(TYPES.IAdminForumModerationService, adminForumModerationService);
    this.bindings.set(TYPES.IAdminSecurityService, adminSecurityService);
    this.bindings.set(TYPES.IAdminStaffInvitationService, adminStaffInvitationService);
    this.bindings.set(TYPES.IAdminStudentService, adminStudentService);
    this.bindings.set(TYPES.IAdminTestimonialService, adminTestimonialService);
    this.bindings.set(TYPES.IAdminUniversityService, adminUniversityService);
    this.bindings.set(TYPES.IAdminUserService, adminUserService);
    
    // Bind integration services
    this.bindings.set(TYPES.IAIMatchingService, aiMatchingService);
  }
}

/**
 * Singleton container instance
 */
export const container = new Container();

/**
 * Initialize the DI container with service bindings
 * Must be called after all services are loaded to avoid circular dependencies
 */
export async function initializeContainer(): Promise<void> {
  await container.registerServices();
}

/**
 * Helper function to get a service from the container
 * Note: Container must be initialized via initializeContainer() at server startup
 */
export function getService<T>(token: symbol): T {
  return container.get<T>(token);
}
