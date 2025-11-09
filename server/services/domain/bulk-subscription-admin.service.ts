import { BaseService } from '../base.service';
import { 
  IUserSubscriptionRepository, 
  ISubscriptionPlanRepository,
  IUserRepository 
} from '../../repositories';
import { container, TYPES } from '../container';
import { UserSubscription, SubscriptionPlan, User } from '@shared/schema';
import { ValidationServiceError, InvalidOperationError } from '../errors';
import { CommonValidators } from '../validation';
import { db } from '../../db';
import { eq, and, inArray, or, SQL, sql } from 'drizzle-orm';
import { userSubscriptions, subscriptionPlans, users } from '@shared/schema';
import { logger } from '../../utils/logger';
import { InputSanitizer } from '../../utils/input-sanitizer';

export interface BulkMigrationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    email: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BulkCancellationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    email: string;
    success: boolean;
    error?: string;
  }>;
}

export interface SubscriberExportRow {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  planName: string;
  planPrice: string;
  status: string;
  isLifetime: boolean;
  startedAt: string;
  expiresAt: string;
  amountPaid: string;
  currency: string;
  paidAt: string;
  cancellationReason: string;
}

export interface IBulkSubscriptionAdminService {
  bulkMigrateSubscribers(
    sourcePlanId: string,
    targetPlanId: string,
    userIds: string[],
    adminId: string
  ): Promise<BulkMigrationResult>;
  
  bulkCancelSubscriptions(
    userIds: string[],
    reason: string,
    adminId: string
  ): Promise<BulkCancellationResult>;
  
  exportSubscribers(
    planId?: string,
    status?: string,
    format?: 'csv'
  ): Promise<string>;
}

export class BulkSubscriptionAdminService extends BaseService implements IBulkSubscriptionAdminService {
  private readonly BATCH_SIZE = 25;

  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository),
    private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  /**
   * Bulk migrate subscribers from one plan to another
   * Processes in batches of 20-25 users with transaction safety
   */
  async bulkMigrateSubscribers(
    sourcePlanId: string,
    targetPlanId: string,
    userIds: string[],
    adminId: string
  ): Promise<BulkMigrationResult> {
    try {
      // Sanitize inputs
      const sanitizedSourcePlanId = InputSanitizer.sanitizePlainText(sourcePlanId);
      const sanitizedTargetPlanId = InputSanitizer.sanitizePlainText(targetPlanId);
      const sanitizedUserIds = InputSanitizer.sanitizeArray(userIds);
      const sanitizedAdminId = InputSanitizer.sanitizePlainText(adminId);

      // Validate inputs
      const errors: Record<string, string> = {};

      const sourcePlanValidation = CommonValidators.validateUUID(sanitizedSourcePlanId, 'Source Plan ID');
      if (!sourcePlanValidation.valid) {
        errors.sourcePlanId = sourcePlanValidation.error!;
      }

      const targetPlanValidation = CommonValidators.validateUUID(sanitizedTargetPlanId, 'Target Plan ID');
      if (!targetPlanValidation.valid) {
        errors.targetPlanId = targetPlanValidation.error!;
      }

      if (sanitizedUserIds.length === 0) {
        errors.userIds = 'At least one user ID is required';
      }

      // Validate each user ID
      for (const userId of sanitizedUserIds) {
        const validation = CommonValidators.validateUUID(userId, 'User ID');
        if (!validation.valid) {
          errors[`userId_${userId}`] = validation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Bulk Migration', errors);
      }

      // Verify both plans exist
      const [sourcePlan, targetPlan] = await Promise.all([
        this.subscriptionPlanRepo.findByIdOptional(sanitizedSourcePlanId),
        this.subscriptionPlanRepo.findByIdOptional(sanitizedTargetPlanId)
      ]);

      if (!sourcePlan) {
        throw new InvalidOperationError('bulk migrate', 'Source plan not found');
      }

      if (!targetPlan) {
        throw new InvalidOperationError('bulk migrate', 'Target plan not found');
      }

      logger.info('Starting bulk migration', {
        sourcePlanId: sanitizedSourcePlanId,
        targetPlanId: sanitizedTargetPlanId,
        userCount: sanitizedUserIds.length,
        adminId: sanitizedAdminId
      });

      const results: BulkMigrationResult = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: []
      };

      // Process in batches
      for (let i = 0; i < sanitizedUserIds.length; i += this.BATCH_SIZE) {
        const batch = sanitizedUserIds.slice(i, i + this.BATCH_SIZE);
        
        await this.processMigrationBatch(
          batch,
          sanitizedSourcePlanId,
          sanitizedTargetPlanId,
          results
        );
      }

      logger.info('Bulk migration completed', {
        totalProcessed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed
      });

      return results;
    } catch (error) {
      return this.handleError(error, 'BulkSubscriptionAdminService.bulkMigrateSubscribers');
    }
  }

  /**
   * Process a single batch of migrations within a transaction
   */
  private async processMigrationBatch(
    userIds: string[],
    sourcePlanId: string,
    targetPlanId: string,
    results: BulkMigrationResult
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        for (const userId of userIds) {
          results.totalProcessed++;

          try {
            // Find user for email reference
            const user = await this.userRepo.findById(userId);

            // Find active subscription for this user on the source plan
            const subscription = await tx
              .select()
              .from(userSubscriptions)
              .where(
                and(
                  eq(userSubscriptions.userId, userId),
                  eq(userSubscriptions.planId, sourcePlanId),
                  eq(userSubscriptions.status, 'active')
                )
              )
              .limit(1);

            if (!subscription || subscription.length === 0) {
              results.failed++;
              results.results.push({
                userId,
                email: user.email,
                success: false,
                error: 'No active subscription found on source plan'
              });
              continue;
            }

            // Update subscription to target plan
            await tx
              .update(userSubscriptions)
              .set({
                planId: targetPlanId,
                updatedAt: new Date()
              })
              .where(eq(userSubscriptions.id, subscription[0].id));

            results.successful++;
            results.results.push({
              userId,
              email: user.email,
              success: true
            });

            logger.info('User migration successful', {
              userId,
              email: user.email,
              sourcePlanId,
              targetPlanId
            });
          } catch (error) {
            results.failed++;
            const user = await this.userRepo.findById(userId).catch(() => ({ email: 'unknown' }));
            results.results.push({
              userId,
              email: user.email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            logger.error('User migration failed', {
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });
    } catch (error) {
      // Transaction failed - mark all users in this batch as failed
      for (const userId of userIds) {
        if (!results.results.find(r => r.userId === userId)) {
          results.totalProcessed++;
          results.failed++;
          const user = await this.userRepo.findById(userId).catch(() => ({ email: 'unknown' }));
          results.results.push({
            userId,
            email: user.email,
            success: false,
            error: 'Transaction failed: ' + (error instanceof Error ? error.message : 'Unknown error')
          });
        }
      }

      logger.error('Migration batch transaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Bulk cancel subscriptions for multiple users
   * Processes in batches with transaction safety
   */
  async bulkCancelSubscriptions(
    userIds: string[],
    reason: string,
    adminId: string
  ): Promise<BulkCancellationResult> {
    try {
      // Sanitize inputs
      const sanitizedUserIds = InputSanitizer.sanitizeArray(userIds);
      const sanitizedReason = InputSanitizer.sanitizePlainText(reason);
      const sanitizedAdminId = InputSanitizer.sanitizePlainText(adminId);

      // Validate inputs
      const errors: Record<string, string> = {};

      if (sanitizedUserIds.length === 0) {
        errors.userIds = 'At least one user ID is required';
      }

      const reasonValidation = CommonValidators.validateStringLength(sanitizedReason, 1, 500, 'Cancellation reason');
      if (!reasonValidation.valid) {
        errors.reason = reasonValidation.error!;
      }

      // Validate each user ID
      for (const userId of sanitizedUserIds) {
        const validation = CommonValidators.validateUUID(userId, 'User ID');
        if (!validation.valid) {
          errors[`userId_${userId}`] = validation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Bulk Cancellation', errors);
      }

      logger.info('Starting bulk cancellation', {
        userCount: sanitizedUserIds.length,
        reason: sanitizedReason,
        adminId: sanitizedAdminId
      });

      const results: BulkCancellationResult = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: []
      };

      // Process in batches
      for (let i = 0; i < sanitizedUserIds.length; i += this.BATCH_SIZE) {
        const batch = sanitizedUserIds.slice(i, i + this.BATCH_SIZE);
        
        await this.processCancellationBatch(
          batch,
          sanitizedReason,
          results
        );
      }

      logger.info('Bulk cancellation completed', {
        totalProcessed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed
      });

      return results;
    } catch (error) {
      return this.handleError(error, 'BulkSubscriptionAdminService.bulkCancelSubscriptions');
    }
  }

  /**
   * Process a single batch of cancellations within a transaction
   */
  private async processCancellationBatch(
    userIds: string[],
    reason: string,
    results: BulkCancellationResult
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        for (const userId of userIds) {
          results.totalProcessed++;

          try {
            // Find user for email reference
            const user = await this.userRepo.findById(userId);

            // Find active subscription for this user
            const subscription = await tx
              .select()
              .from(userSubscriptions)
              .where(
                and(
                  eq(userSubscriptions.userId, userId),
                  eq(userSubscriptions.status, 'active')
                )
              )
              .limit(1);

            if (!subscription || subscription.length === 0) {
              results.failed++;
              results.results.push({
                userId,
                email: user.email,
                success: false,
                error: 'No active subscription found'
              });
              continue;
            }

            // Cancel subscription
            await tx
              .update(userSubscriptions)
              .set({
                status: 'cancelled',
                cancellationReason: reason,
                updatedAt: new Date()
              })
              .where(eq(userSubscriptions.id, subscription[0].id));

            results.successful++;
            results.results.push({
              userId,
              email: user.email,
              success: true
            });

            logger.info('Subscription cancelled successfully', {
              userId,
              email: user.email,
              reason
            });
          } catch (error) {
            results.failed++;
            const user = await this.userRepo.findById(userId).catch(() => ({ email: 'unknown' }));
            results.results.push({
              userId,
              email: user.email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            logger.error('Subscription cancellation failed', {
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });
    } catch (error) {
      // Transaction failed - mark all users in this batch as failed
      for (const userId of userIds) {
        if (!results.results.find(r => r.userId === userId)) {
          results.totalProcessed++;
          results.failed++;
          const user = await this.userRepo.findById(userId).catch(() => ({ email: 'unknown' }));
          results.results.push({
            userId,
            email: user.email,
            success: false,
            error: 'Transaction failed: ' + (error instanceof Error ? error.message : 'Unknown error')
          });
        }
      }

      logger.error('Cancellation batch transaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export subscribers to CSV format
   * Optionally filter by plan ID and/or status
   */
  async exportSubscribers(
    planId?: string,
    status?: string,
    format: 'csv' = 'csv'
  ): Promise<string> {
    try {
      // Sanitize inputs
      const sanitizedPlanId = planId ? InputSanitizer.sanitizePlainText(planId) : undefined;
      const sanitizedStatus = status ? InputSanitizer.sanitizePlainText(status) : undefined;

      // Validate inputs
      const errors: Record<string, string> = {};

      if (sanitizedPlanId) {
        const planIdValidation = CommonValidators.validateUUID(sanitizedPlanId, 'Plan ID');
        if (!planIdValidation.valid) {
          errors.planId = planIdValidation.error!;
        }
      }

      if (sanitizedStatus) {
        const validStatuses = ['active', 'cancelled', 'expired', 'pending'];
        if (!validStatuses.includes(sanitizedStatus)) {
          errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Export Subscribers', errors);
      }

      logger.info('Starting subscriber export', {
        planId: sanitizedPlanId,
        status: sanitizedStatus,
        format
      });

      // Build query conditions
      const conditions: SQL[] = [];
      if (sanitizedPlanId) {
        conditions.push(eq(userSubscriptions.planId, sanitizedPlanId));
      }
      if (sanitizedStatus) {
        conditions.push(eq(userSubscriptions.status, sanitizedStatus as any));
      }

      // Query subscriptions with user and plan details
      let query = db
        .select({
          userId: userSubscriptions.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          planName: subscriptionPlans.name,
          planPrice: subscriptionPlans.price,
          status: userSubscriptions.status,
          isLifetime: userSubscriptions.isLifetime,
          startedAt: userSubscriptions.startedAt,
          expiresAt: userSubscriptions.expiresAt,
          amountPaid: userSubscriptions.amountPaid,
          currency: userSubscriptions.currency,
          paidAt: userSubscriptions.paidAt,
          cancellationReason: userSubscriptions.cancellationReason
        })
        .from(userSubscriptions)
        .innerJoin(users, eq(userSubscriptions.userId, users.id))
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const subscriptions = await query;

      // Convert to CSV
      const csv = this.generateCSV(subscriptions);

      logger.info('Subscriber export completed', {
        recordCount: subscriptions.length
      });

      return csv;
    } catch (error) {
      return this.handleError(error, 'BulkSubscriptionAdminService.exportSubscribers');
    }
  }

  /**
   * Generate CSV from subscriber data
   */
  private generateCSV(data: any[]): string {
    const headers = [
      'User ID',
      'Email',
      'First Name',
      'Last Name',
      'Plan Name',
      'Plan Price',
      'Status',
      'Is Lifetime',
      'Started At',
      'Expires At',
      'Amount Paid',
      'Currency',
      'Paid At',
      'Cancellation Reason'
    ];

    const csvEscape = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }

      const str = String(value);
      
      // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      
      return str;
    };

    const rows = data.map(row => [
      csvEscape(row.userId),
      csvEscape(row.email),
      csvEscape(row.firstName),
      csvEscape(row.lastName),
      csvEscape(row.planName),
      csvEscape(row.planPrice),
      csvEscape(row.status),
      csvEscape(row.isLifetime),
      csvEscape(row.startedAt ? new Date(row.startedAt).toISOString() : ''),
      csvEscape(row.expiresAt ? new Date(row.expiresAt).toISOString() : ''),
      csvEscape(row.amountPaid),
      csvEscape(row.currency),
      csvEscape(row.paidAt ? new Date(row.paidAt).toISOString() : ''),
      csvEscape(row.cancellationReason)
    ]);

    const csvLines = [headers.map(csvEscape).join(',')];
    rows.forEach(row => {
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }
}

// Export singleton instance
export const bulkSubscriptionAdminService = new BulkSubscriptionAdminService();
