import { getService, TYPES } from '../container';
import { INotificationService } from './notification.service';
import logger from '../../utils/logger';

export class SubscriptionManagementNotificationService {
  private get notificationService(): INotificationService {
    return getService<INotificationService>(TYPES.INotificationService);
  }

  async notifyCancellationRequestReceived(userId: string, subscriptionId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Cancellation Request Received',
        message: `Your subscription cancellation request has been received and is being reviewed by our team.`,
        data: { subscriptionId, action: 'cancellation_request_received' },
      });

      logger.info('Cancellation request notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send cancellation request notification', { error, userId });
    }
  }

  async notifyCancellationApproved(userId: string, subscriptionId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Cancellation Request Approved',
        message: `Your subscription cancellation request has been approved. Your subscription has been cancelled.`,
        data: { subscriptionId, action: 'cancellation_approved' },
      });

      logger.info('Cancellation approval notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send cancellation approval notification', { error, userId });
    }
  }

  async notifyCancellationRejected(userId: string, subscriptionId: string, reason: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Cancellation Request Rejected',
        message: `Your subscription cancellation request has been reviewed and was not approved. Reason: ${reason}`,
        data: { subscriptionId, action: 'cancellation_rejected', reason },
      });

      logger.info('Cancellation rejection notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send cancellation rejection notification', { error, userId });
    }
  }

  async notifyRefundRequestReceived(userId: string, subscriptionId: string, amount: number): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Request Received',
        message: `Your refund request for ₹${amount / 100} has been received and is being processed.`,
        data: { subscriptionId, amount, action: 'refund_request_received' },
      });

      logger.info('Refund request notification sent', { userId, subscriptionId, amount });
    } catch (error) {
      logger.error('Failed to send refund request notification', { error, userId });
    }
  }

  async notifyRefundApproved(userId: string, subscriptionId: string, amount: number): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Request Approved',
        message: `Your refund request for ₹${amount / 100} has been approved and is being processed. The amount will be credited to your original payment method within 5-7 business days.`,
        data: { subscriptionId, amount, action: 'refund_approved' },
      });

      logger.info('Refund approval notification sent', { userId, subscriptionId, amount });
    } catch (error) {
      logger.error('Failed to send refund approval notification', { error, userId });
    }
  }

  async notifyRefundRejected(userId: string, subscriptionId: string, reason: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Request Rejected',
        message: `Your refund request has been reviewed and was not approved. Reason: ${reason}`,
        data: { subscriptionId, action: 'refund_rejected', reason },
      });

      logger.info('Refund rejection notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send refund rejection notification', { error, userId });
    }
  }

  async notifyRefundProcessed(userId: string, subscriptionId: string, amount: number): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Processed Successfully',
        message: `Your refund of ₹${amount / 100} has been processed successfully. The amount will be credited to your original payment method within 5-7 business days.`,
        data: { subscriptionId, amount, action: 'refund_processed' },
      });

      logger.info('Refund processed notification sent', { userId, subscriptionId, amount });
    } catch (error) {
      logger.error('Failed to send refund processed notification', { error, userId });
    }
  }

  async notifyRefundFailed(userId: string, subscriptionId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Processing Failed',
        message: `We encountered an issue processing your refund. Our team has been notified and will contact you shortly.`,
        data: { subscriptionId, action: 'refund_failed' },
      });

      logger.info('Refund failed notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send refund failure notification', { error, userId });
    }
  }

  async notifyDisputeReceived(userId: string, disputeId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Received',
        message: `Your dispute has been received and is under review. We will investigate and respond within 2-3 business days.`,
        data: { disputeId, action: 'dispute_received' },
      });

      logger.info('Dispute received notification sent', { userId, disputeId });
    } catch (error) {
      logger.error('Failed to send dispute received notification', { error, userId });
    }
  }

  async notifyDisputeUnderInvestigation(userId: string, disputeId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Under Investigation',
        message: `Your dispute is currently being investigated by our team. We will update you on the progress soon.`,
        data: { disputeId, action: 'dispute_investigating' },
      });

      logger.info('Dispute investigation notification sent', { userId, disputeId });
    } catch (error) {
      logger.error('Failed to send dispute investigation notification', { error, userId });
    }
  }

  async notifyDisputeResolved(userId: string, disputeId: string, resolution: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved. Resolution: ${resolution}`,
        data: { disputeId, action: 'dispute_resolved', resolution },
      });

      logger.info('Dispute resolution notification sent', { userId, disputeId });
    } catch (error) {
      logger.error('Failed to send dispute resolution notification', { error, userId });
    }
  }

  async notifyAdminNewCancellationRequest(adminUserId: string, requestId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId: adminUserId,
        type: 'system',
        title: 'New Cancellation Request',
        message: `A new subscription cancellation request requires your review.`,
        data: { requestId, action: 'admin_new_cancellation_request' },
      });

      logger.info('Admin cancellation request notification sent', { adminUserId, requestId });
    } catch (error) {
      logger.error('Failed to send admin cancellation notification', { error, adminUserId });
    }
  }

  async notifyAdminNewRefundRequest(adminUserId: string, requestId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId: adminUserId,
        type: 'system',
        title: 'New Refund Request',
        message: `A new refund request requires your immediate attention.`,
        data: { requestId, action: 'admin_new_refund_request' },
      });

      logger.info('Admin refund request notification sent', { adminUserId, requestId });
    } catch (error) {
      logger.error('Failed to send admin refund notification', { error, adminUserId });
    }
  }

  async notifyAdminNewDispute(adminUserId: string, disputeId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId: adminUserId,
        type: 'system',
        title: 'New Dispute Raised',
        message: `A new dispute has been raised and requires investigation.`,
        data: { disputeId, action: 'admin_new_dispute' },
      });

      logger.info('Admin dispute notification sent', { adminUserId, disputeId });
    } catch (error) {
      logger.error('Failed to send admin dispute notification', { error, adminUserId });
    }
  }

  async notifyAdminRefundFailed(adminUserId: string, refundId: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId: adminUserId,
        type: 'system',
        title: 'Refund Processing Failed',
        message: `Refund ${refundId} failed to process and requires manual intervention.`,
        data: { refundId, action: 'admin_refund_failed' },
      });

      logger.info('Admin refund failure notification sent', { adminUserId, refundId });
    } catch (error) {
      logger.error('Failed to send admin refund failure notification', { error, adminUserId });
    }
  }
}

export const subscriptionManagementNotificationService = new SubscriptionManagementNotificationService();
