import { getService, TYPES } from '../container';
import { INotificationService } from './notification.service';
import logger from '../../utils/logger';
import sgMail from '@sendgrid/mail';
import config from '../../config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SubscriptionManagementNotificationService {
  private sendGridConfigured: boolean = false;
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates/emails');

    if (config.email.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(config.email.SENDGRID_API_KEY);
        this.sendGridConfigured = true;
        logger.info('SendGrid configured for subscription management notifications');
      } catch (error) {
        logger.error('Failed to configure SendGrid', { error });
      }
    } else {
      logger.warn('SendGrid API key not configured - email notifications will be disabled');
    }
  }

  private get notificationService(): INotificationService {
    return getService<INotificationService>(TYPES.INotificationService);
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user[0]?.email || null;
    } catch (error) {
      logger.error('Failed to get user email', { userId, error });
      return null;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!this.sendGridConfigured || !config.email.SENDGRID_FROM_EMAIL) {
      logger.warn('Email not sent - SendGrid not configured', { templateName });
      return;
    }

    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      let htmlContent = await fs.readFile(templatePath, 'utf-8');

      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, String(value));
      }

      const msg = {
        to,
        from: config.email.SENDGRID_FROM_EMAIL,
        subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      logger.info('Email sent successfully', { to, subject, templateName });
    } catch (error) {
      logger.error('Failed to send email', { to, subject, templateName, error });
    }
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

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Cancellation Request Received', 'cancellation-request-received', {
          userName: 'User',
          requestId: subscriptionId,
          subscriptionPlan: 'Premium Plan',
          submittedDate: new Date().toLocaleDateString(),
          reason: 'Your cancellation request',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

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

      const email = await this.getUserEmail(userId);
      if (email) {
        const currentDate = new Date();
        const endDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        await this.sendEmail(email, 'Cancellation Request Approved', 'cancellation-approved', {
          userName: 'User',
          subscriptionPlan: 'Premium Plan',
          cancellationDate: currentDate.toLocaleDateString(),
          accessEndDate: endDate.toLocaleDateString(),
          adminNotes: '',
          plansUrl: config.app.APP_URL + '/plans',
        });
      }

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

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Cancellation Request Not Approved', 'cancellation-rejected', {
          userName: 'User',
          requestId: subscriptionId,
          subscriptionPlan: 'Premium Plan',
          rejectionReason: reason,
          supportUrl: config.app.APP_URL + '/support',
          dashboardUrl: config.app.APP_URL + '/dashboard',
        });
      }

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

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Refund Request Received', 'refund-request-received', {
          userName: 'User',
          amount: (amount / 100).toFixed(2),
          requestId: subscriptionId,
          paymentId: 'pay_' + subscriptionId.slice(0, 8),
          submittedDate: new Date().toLocaleDateString(),
          reason: 'Your refund request',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

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

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Refund Request Approved', 'refund-approved', {
          userName: 'User',
          amount: (amount / 100).toFixed(2),
          adminNotes: '',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

      logger.info('Refund approval notification sent', { userId, subscriptionId, amount });
    } catch (error) {
      logger.error('Failed to send refund approval notification', { error, userId });
    }
  }

  async notifyRefundRejected(userId: string, subscriptionId: string, amount: number, reason: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Request Rejected',
        message: `Your refund request has been reviewed and was not approved. Reason: ${reason}`,
        data: { subscriptionId, action: 'refund_rejected', reason },
      });

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Refund Request Not Approved', 'refund-rejected', {
          userName: 'User',
          amount: (amount / 100).toFixed(2),
          requestId: subscriptionId,
          rejectionReason: reason,
          supportUrl: config.app.APP_URL + '/support',
          dashboardUrl: config.app.APP_URL + '/dashboard',
        });
      }

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

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Refund Processed Successfully', 'refund-processed', {
          userName: 'User',
          amount: (amount / 100).toFixed(2),
          refundId: subscriptionId,
          razorpayRefundId: 'rfnd_' + subscriptionId.slice(0, 8),
          processedDate: new Date().toLocaleDateString(),
          paymentMethod: 'Original Payment Method',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

      logger.info('Refund processed notification sent', { userId, subscriptionId, amount });
    } catch (error) {
      logger.error('Failed to send refund processed notification', { error, userId });
    }
  }

  async notifyRefundFailed(userId: string, subscriptionId: string, amount: number): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Refund Processing Failed',
        message: `We encountered an issue processing your refund. Our team has been notified and will contact you shortly.`,
        data: { subscriptionId, action: 'refund_failed' },
      });

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Refund Processing Issue', 'refund-failed', {
          userName: 'User',
          amount: (amount / 100).toFixed(2),
          refundId: subscriptionId,
          requestDate: new Date().toLocaleDateString(),
          paymentMethod: 'Original Payment Method',
          supportUrl: config.app.APP_URL + '/support',
          dashboardUrl: config.app.APP_URL + '/dashboard',
        });
      }

      logger.info('Refund failed notification sent', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to send refund failure notification', { error, userId });
    }
  }

  async notifyDisputeReceived(userId: string, disputeId: string, amount: number, disputeType: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Received',
        message: `Your dispute has been received and is under review. We will investigate and respond within 2-3 business days.`,
        data: { disputeId, action: 'dispute_received' },
      });

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Dispute Received', 'dispute-received', {
          userName: 'User',
          disputeId,
          amount: (amount / 100).toFixed(2),
          disputeType,
          submittedDate: new Date().toLocaleDateString(),
          reason: 'Your dispute',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

      logger.info('Dispute received notification sent', { userId, disputeId });
    } catch (error) {
      logger.error('Failed to send dispute received notification', { error, userId });
    }
  }

  async notifyDisputeUnderInvestigation(userId: string, disputeId: string, disputeType: string, amount: number): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Under Investigation',
        message: `Your dispute is currently being investigated by our team. We will update you on the progress soon.`,
        data: { disputeId, action: 'dispute_investigating' },
      });

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Dispute Investigation in Progress', 'dispute-under-investigation', {
          userName: 'User',
          disputeId,
          disputeType,
          amount: (amount / 100).toFixed(2),
          investigationStartDate: new Date().toLocaleDateString(),
          supportUrl: config.app.APP_URL + '/support',
        });
      }

      logger.info('Dispute investigation notification sent', { userId, disputeId });
    } catch (error) {
      logger.error('Failed to send dispute investigation notification', { error, userId });
    }
  }

  async notifyDisputeResolved(userId: string, disputeId: string, amount: number, resolution: string): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved. Resolution: ${resolution}`,
        data: { disputeId, action: 'dispute_resolved', resolution },
      });

      const email = await this.getUserEmail(userId);
      if (email) {
        await this.sendEmail(email, 'Dispute Resolved', 'dispute-resolved', {
          userName: 'User',
          disputeId,
          amount: (amount / 100).toFixed(2),
          resolutionDate: new Date().toLocaleDateString(),
          resolutionSummary: resolution,
          actionRequired: false,
          actionDetails: '',
          isRefunded: false,
          adminNotes: '',
          supportUrl: config.app.APP_URL + '/support',
        });
      }

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
