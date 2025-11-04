import { BaseService } from '../base.service';
import { db } from '../../db';
import { userSubscriptions, subscriptionPlans } from '@shared/schema';
import { UserSubscription } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { InvalidOperationError, ValidationServiceError } from '../errors';
import { NotFoundError } from '../../repositories/errors';
import { CommonValidators } from '../validation';
import { subscriptionAuditService } from '../infrastructure/subscription-audit.service';

export interface IPaymentTransactionService {
  createSubscriptionWithLock(
    userId: string,
    planId: string,
    orderId: string,
    paymentId: string,
    amountPaid: number,
    currency: string
  ): Promise<UserSubscription>;
}

export class PaymentTransactionService extends BaseService implements IPaymentTransactionService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 100;

  async createSubscriptionWithLock(
    userId: string,
    planId: string,
    orderId: string,
    paymentId: string,
    amountPaid: number,
    currency: string
  ): Promise<UserSubscription> {
    const errors: Record<string, string> = {};

    const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
    if (!userIdValidation.valid) {
      errors.userId = userIdValidation.error!;
    }

    const planIdValidation = CommonValidators.validateUUID(planId, 'Plan ID');
    if (!planIdValidation.valid) {
      errors.planId = planIdValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationServiceError('Payment Transaction', errors);
    }

    return this.executeWithRetry(userId, planId, orderId, paymentId, amountPaid, currency);
  }

  private async executeWithRetry(
    userId: string,
    planId: string,
    orderId: string,
    paymentId: string,
    amountPaid: number,
    currency: string,
    attempt: number = 1
  ): Promise<UserSubscription> {
    try {
      return await this.executeTransaction(userId, planId, orderId, paymentId, amountPaid, currency);
    } catch (error: any) {
      const isDeadlock = error?.code === '40P01' || error?.message?.includes('deadlock');
      const isSerializationFailure = error?.code === '40001';
      
      if ((isDeadlock || isSerializationFailure) && attempt < this.MAX_RETRY_ATTEMPTS) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(userId, planId, orderId, paymentId, amountPaid, currency, attempt + 1);
      }
      
      if (isDeadlock) {
        throw new InvalidOperationError(
          'process payment',
          'Payment processing is experiencing high load. Please try again in a moment.'
        );
      }
      
      if (isSerializationFailure) {
        throw new InvalidOperationError(
          'process payment',
          'Payment verification conflict detected. Please refresh and try again.'
        );
      }
      
      return this.handleError(error, 'PaymentTransactionService.createSubscriptionWithLock');
    }
  }

  private async executeTransaction(
    userId: string,
    planId: string,
    orderId: string,
    paymentId: string,
    amountPaid: number,
    currency: string
  ): Promise<UserSubscription> {
    return await db.transaction(
      async (tx) => {
        const existingByOrder = await tx
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.orderId, orderId))
          .for('update')
          .limit(1);

        if (existingByOrder.length > 0) {
          return existingByOrder[0] as UserSubscription;
        }

        const existingSubscriptions = await tx
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, userId))
          .for('update');

        const targetPlanResult = await tx
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, planId))
          .limit(1);

        if (targetPlanResult.length === 0) {
          throw new NotFoundError('Subscription Plan', planId);
        }

        const targetPlan = targetPlanResult[0];
        const activeSubscription = existingSubscriptions.find(
          (sub) => sub.status === 'active'
        );

        if (activeSubscription) {
          const currentPlanResult = await tx
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, activeSubscription.planId))
            .limit(1);

          if (currentPlanResult.length === 0) {
            throw new NotFoundError('Subscription Plan', activeSubscription.planId);
          }

          const currentPlan = currentPlanResult[0];

          if (targetPlan.id === currentPlan.id) {
            throw new InvalidOperationError(
              'purchase plan',
              'You already have this plan'
            );
          }

          if (targetPlan.tierLevel <= currentPlan.tierLevel) {
            throw new InvalidOperationError(
              'purchase plan',
              `You cannot ${
                targetPlan.tierLevel < currentPlan.tierLevel
                  ? 'downgrade to a lower tier'
                  : 'switch to the same tier'
              }. Only upgrades to higher tiers are allowed.`
            );
          }

          const updated = await tx
            .update(userSubscriptions)
            .set({
              planId: targetPlan.id,
              orderId,
              paymentReference: paymentId,
              paymentGateway: 'razorpay',
              status: 'active',
              isLifetime: true,
              tierLevel: targetPlan.tierLevel,
              highestTierReached: targetPlan.tierLevel,
              expiresAt: null,
              autoRenew: null,
              lifetimeActivatedAt: activeSubscription.lifetimeActivatedAt || new Date(),
              amountPaid: amountPaid.toString(),
              currency,
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(userSubscriptions.id, activeSubscription.id))
            .returning();

          if (updated.length === 0) {
            throw new Error('Failed to update subscription');
          }

          const updatedSubscription = updated[0] as UserSubscription;

          // Log subscription upgrade event
          await subscriptionAuditService.logEvent(
            updatedSubscription.id,
            userId,
            'subscription_upgraded',
            currentPlan.name,
            targetPlan.name,
            {
              oldPlanId: currentPlan.id,
              newPlanId: targetPlan.id,
              oldTierLevel: currentPlan.tierLevel,
              newTierLevel: targetPlan.tierLevel,
              orderId,
              paymentId,
              amountPaid,
              currency,
            }
          );

          return updatedSubscription;
        }

        const startDate = new Date();
        const created = await tx
          .insert(userSubscriptions)
          .values({
            userId,
            planId: targetPlan.id,
            orderId,
            paymentReference: paymentId,
            paymentGateway: 'razorpay',
            status: 'active',
            startedAt: startDate,
            isLifetime: true,
            tierLevel: targetPlan.tierLevel,
            lifetimeActivatedAt: new Date(),
            highestTierReached: targetPlan.tierLevel,
            expiresAt: null,
            autoRenew: null,
            universitiesUsed: 0,
            countriesUsed: 0,
            amountPaid: amountPaid.toString(),
            currency,
            paidAt: new Date(),
          })
          .returning();

        if (created.length === 0) {
          throw new Error('Failed to create subscription');
        }

        const newSubscription = created[0] as UserSubscription;

        // Log subscription creation event
        await subscriptionAuditService.logEvent(
          newSubscription.id,
          userId,
          'subscription_created',
          undefined,
          'active',
          {
            planId: targetPlan.id,
            planName: targetPlan.name,
            tierLevel: targetPlan.tierLevel,
            orderId,
            paymentId,
            amountPaid,
            currency,
            isLifetime: true,
          }
        );

        return newSubscription;
      },
      {
        isolationLevel: 'serializable',
        accessMode: 'read write',
      }
    );
  }
}

export const paymentTransactionService = new PaymentTransactionService();
