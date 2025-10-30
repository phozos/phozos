import { ValidationServiceError, BusinessRuleViolationError } from '../errors';

export class BusinessRuleValidators {
  static validateApplicationStatus(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'draft': ['submitted', 'cancelled'],
      'submitted': ['under_review', 'cancelled'],
      'under_review': ['approved', 'rejected', 'pending_info'],
      'pending_info': ['submitted', 'cancelled'],
      'approved': ['enrolled'],
      'rejected': [],
      'cancelled': [],
      'enrolled': []
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    if (!allowedStatuses.includes(newStatus)) {
      throw new BusinessRuleViolationError(
        'APPLICATION_STATUS_TRANSITION',
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        { currentStatus, newStatus, allowedStatuses }
      );
    }
  }

  static validateSubscriptionPlan(planId: string, validPlans: string[]): void {
    if (!validPlans.includes(planId)) {
      throw new ValidationServiceError('Subscription', {
        planId: `Invalid subscription plan. Must be one of: ${validPlans.join(', ')}`
      });
    }
  }

  static validateEventCapacity(currentRegistrations: number, maxCapacity: number): void {
    if (currentRegistrations >= maxCapacity) {
      throw new BusinessRuleViolationError(
        'EVENT_CAPACITY_EXCEEDED',
        'Event is at full capacity',
        { currentRegistrations, maxCapacity }
      );
    }
  }

  static validatePaymentAmount(amount: number, minAmount: number = 1): void {
    if (amount < minAmount) {
      throw new ValidationServiceError('Payment', {
        amount: `Payment amount must be at least ${minAmount}`
      });
    }
  }

  static validateDocumentType(documentType: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(documentType)) {
      throw new ValidationServiceError('Document', {
        type: `Invalid document type. Must be one of: ${allowedTypes.join(', ')}`
      });
    }
  }

  static validateCounselorAvailability(counselorId: string, assignedStudents: number, maxStudents: number): void {
    if (assignedStudents >= maxStudents) {
      throw new BusinessRuleViolationError(
        'COUNSELOR_CAPACITY_EXCEEDED',
        'Counselor has reached maximum student capacity',
        { counselorId, assignedStudents, maxStudents }
      );
    }
  }

  static validateForumPostModeration(
    isReported: boolean,
    reportCount: number,
    autoModThreshold: number = 5
  ): void {
    if (isReported && reportCount >= autoModThreshold) {
      throw new BusinessRuleViolationError(
        'POST_AUTO_MODERATED',
        'Post has been auto-moderated due to multiple reports',
        { reportCount, threshold: autoModThreshold }
      );
    }
  }

  static validateUniversityRanking(ranking: number): void {
    if (ranking < 1 || ranking > 5000) {
      throw new ValidationServiceError('University', {
        ranking: 'University ranking must be between 1 and 5000'
      });
    }
  }

  static validateTuitionRange(minTuition: number, maxTuition: number): void {
    if (minTuition < 0) {
      throw new ValidationServiceError('University', {
        minTuition: 'Minimum tuition cannot be negative'
      });
    }

    if (maxTuition < minTuition) {
      throw new ValidationServiceError('University', {
        maxTuition: 'Maximum tuition must be greater than minimum tuition'
      });
    }
  }

  static validateNotificationType(type: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(type)) {
      throw new ValidationServiceError('Notification', {
        type: `Invalid notification type. Must be one of: ${allowedTypes.join(', ')}`
      });
    }
  }

  static validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new ValidationServiceError('Password', {
        password: errors.join('. ')
      });
    }
  }

  static validateAdminPermission(userId: string, requiredRole: string, userRole: string): void {
    const roleHierarchy = ['viewer', 'editor', 'admin', 'super_admin'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    if (userRoleIndex < requiredRoleIndex) {
      throw new BusinessRuleViolationError(
        'INSUFFICIENT_PERMISSIONS',
        'Insufficient permissions for this operation',
        { userId, requiredRole, userRole }
      );
    }
  }
}
