import { BaseService } from '../base.service';
import { 
  ISubscriptionPlanNotificationRepository,
  IUserPlanNotificationRepository,
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository
} from '../../repositories';
import { INotificationService } from './notification.service';
import { container, TYPES } from '../container';
import { SubscriptionPlanNotification } from '@shared/schema';

export interface IPlanNotificationService {
  createPriceChangeNotification(
    planId: string,
    oldPrice: number,
    newPrice: number,
    effectiveDate: Date,
    adminId: string
  ): Promise<SubscriptionPlanNotification>;

  createDeprecationNotification(
    planId: string,
    successorPlanId: string | undefined,
    effectiveDate: Date,
    adminId: string,
    migrationDeadline?: Date
  ): Promise<SubscriptionPlanNotification>;

  sendPlanNotifications(notificationId: string): Promise<{ sent: number; failed: number }>;
  
  getUnreadPlanNotifications(userId: string): Promise<any[]>;
  markPlanNotificationRead(userId: string, notificationId: string): Promise<void>;
  acknowledgePlanChange(userId: string, notificationId: string): Promise<void>;
}

export class PlanNotificationService extends BaseService implements IPlanNotificationService {
  constructor(
    private planNotificationRepo: ISubscriptionPlanNotificationRepository = container.get<ISubscriptionPlanNotificationRepository>(TYPES.ISubscriptionPlanNotificationRepository),
    private userPlanNotificationRepo: IUserPlanNotificationRepository = container.get<IUserPlanNotificationRepository>(TYPES.IUserPlanNotificationRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository),
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private notificationService: INotificationService = container.get<INotificationService>(TYPES.INotificationService)
  ) {
    super();
  }

  async createPriceChangeNotification(
    planId: string,
    oldPrice: number,
    newPrice: number,
    effectiveDate: Date,
    adminId: string
  ): Promise<SubscriptionPlanNotification> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      
      const priceIncrease = newPrice > oldPrice;
      const percentChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);
      
      const title = priceIncrease 
        ? `Price Increase Notice: ${plan.name}`
        : `Price Reduction Notice: ${plan.name}`;

      const message = priceIncrease
        ? `We're writing to inform you of an upcoming price change for your ${plan.name} subscription. Effective ${effectiveDate.toDateString()}, the price will increase from ₹${oldPrice} to ₹${newPrice} (${percentChange}% increase). Your current pricing is grandfathered and will NOT change. This new pricing applies only to new subscribers.`
        : `Good news! We're reducing the price of ${plan.name} from ₹${oldPrice} to ₹${newPrice} (${percentChange}% decrease). You can opt-in to the new lower price at any time from your account settings.`;

      const notificationDate = new Date(effectiveDate);
      notificationDate.setDate(notificationDate.getDate() - 30);

      return await this.planNotificationRepo.create({
        planId,
        notificationType: 'price_change',
        title,
        message,
        effectiveDate,
        notificationDate,
        metadata: {
          oldPrice,
          newPrice,
          percentChange,
          priceIncrease
        },
        createdBy: adminId
      });
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.createPriceChangeNotification');
    }
  }

  async createDeprecationNotification(
    planId: string,
    successorPlanId: string | undefined,
    effectiveDate: Date,
    adminId: string,
    migrationDeadline?: Date
  ): Promise<SubscriptionPlanNotification> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      let successorPlan = null;
      
      if (successorPlanId) {
        successorPlan = await this.subscriptionPlanRepo.findByIdOptional(successorPlanId);
      }

      const title = `Important: ${plan.name} Plan Deprecation`;
      
      const message = successorPlan
        ? `We're discontinuing the ${plan.name} plan effective ${effectiveDate.toDateString()}. We've created an improved plan, ${successorPlan.name}, which we believe better serves your needs. Your current subscription will continue uninterrupted, but we encourage you to review the new plan. Migration deadline: ${migrationDeadline?.toDateString() || 'No deadline'}.`
        : `We're discontinuing the ${plan.name} plan effective ${effectiveDate.toDateString()}. Your current subscription will continue at your grandfathered price. No action is required.`;

      const notificationDate = new Date();

      return await this.planNotificationRepo.create({
        planId,
        notificationType: 'deprecation',
        title,
        message,
        effectiveDate,
        notificationDate,
        metadata: {
          successorPlanId,
          migrationDeadline: migrationDeadline?.toISOString()
        },
        createdBy: adminId
      });
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.createDeprecationNotification');
    }
  }

  async sendPlanNotifications(notificationId: string): Promise<{ sent: number; failed: number }> {
    try {
      const notification = await this.planNotificationRepo.findById(notificationId);
      
      const subscriptions = await this.userSubscriptionRepo.findAll({
        planId: notification.planId,
        status: 'active'
      });

      let sent = 0;
      let failed = 0;

      for (const subscription of subscriptions) {
        try {
          await this.notificationService.createNotification({
            userId: subscription.userId,
            type: 'system',
            title: notification.title,
            message: notification.message,
            data: {
              planNotificationId: notificationId,
              planId: notification.planId,
              effectiveDate: notification.effectiveDate
            } as any
          });

          await this.userPlanNotificationRepo.create({
            planNotificationId: notificationId,
            userId: subscription.userId,
            emailStatus: 'sent'
          });

          sent++;
        } catch (error) {
          console.error(`Failed to send notification to user ${subscription.userId}:`, error);
          failed++;
        }
      }

      await this.planNotificationRepo.update(notificationId, {
        sentAt: new Date(),
        recipientCount: sent
      });

      return { sent, failed };
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.sendPlanNotifications');
    }
  }

  async getUnreadPlanNotifications(userId: string): Promise<any[]> {
    try {
      return await this.userPlanNotificationRepo.findUnreadByUser(userId);
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.getUnreadPlanNotifications');
    }
  }

  async markPlanNotificationRead(userId: string, notificationId: string): Promise<void> {
    try {
      await this.userPlanNotificationRepo.markAsRead(userId, notificationId);
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.markPlanNotificationRead');
    }
  }

  async acknowledgePlanChange(userId: string, notificationId: string): Promise<void> {
    try {
      await this.userPlanNotificationRepo.acknowledge(userId, notificationId);
    } catch (error) {
      return this.handleError(error, 'PlanNotificationService.acknowledgePlanChange');
    }
  }
}
