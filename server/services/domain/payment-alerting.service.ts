import sgMail from '@sendgrid/mail';
import { db } from '../../db';
import { failedPayments } from '@shared/schema';
import { userRepository } from '../../repositories';
import { subscriptionPlanRepository } from '../../repositories/subscription.repository';
import logger from '../../utils/logger';
import config from '../../config';
import { desc, and, gte, isNull } from 'drizzle-orm';

export interface IPaymentAlertingService {
  sendFailedPaymentEmail(params: {
    userId: string;
    planId?: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
  }): Promise<void>;
  
  sendSlackAlert(params: {
    userId: string;
    userEmail: string;
    userName: string;
    planName?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    paymentId?: string;
    orderId?: string;
  }): Promise<void>;
  
  sendDailyDigest(): Promise<void>;
}

export class PaymentAlertingService implements IPaymentAlertingService {
  private sendGridConfigured: boolean = false;
  private alertsEnabled: boolean = false;
  private adminEmail: string | null = null;
  private slackWebhookUrl: string | null = null;

  constructor() {
    // Initialize SendGrid if API key is available
    if (config.email.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(config.email.SENDGRID_API_KEY);
        this.sendGridConfigured = true;
        logger.info('SendGrid configured for payment alerting');
      } catch (error) {
        logger.error('Failed to configure SendGrid for payment alerting', { error });
      }
    } else {
      logger.warn('SendGrid API key not configured - payment email alerts will be disabled');
    }

    // Load alerting configuration
    this.alertsEnabled = process.env.ENABLE_FAILED_PAYMENT_ALERTS === 'true';
    this.adminEmail = process.env.ADMIN_ALERT_EMAIL || null;
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || null;

    if (this.alertsEnabled) {
      if (!this.adminEmail) {
        logger.warn('Payment alerts enabled but ADMIN_ALERT_EMAIL not configured');
      }
      if (this.slackWebhookUrl) {
        logger.info('Slack webhook configured for payment alerts');
      }
    }

    logger.info('Payment alerting service initialized', {
      alertsEnabled: this.alertsEnabled,
      sendGridConfigured: this.sendGridConfigured,
      adminEmailConfigured: !!this.adminEmail,
      slackConfigured: !!this.slackWebhookUrl,
    });
  }

  /**
   * Send immediate email alert when payment fails
   * @param params - Payment failure details
   */
  async sendFailedPaymentEmail(params: {
    userId: string;
    planId?: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
  }): Promise<void> {
    // Check if alerts are enabled
    if (!this.alertsEnabled) {
      logger.debug('Payment alerts disabled - skipping email alert', {
        userId: params.userId,
        paymentId: params.paymentId,
      });
      return;
    }

    // Check if SendGrid is configured
    if (!this.sendGridConfigured) {
      logger.warn('SendGrid not configured - cannot send payment failure email', {
        userId: params.userId,
        paymentId: params.paymentId,
      });
      return;
    }

    // Check if admin email is configured
    if (!this.adminEmail) {
      logger.warn('Admin email not configured - cannot send payment failure alert', {
        userId: params.userId,
        paymentId: params.paymentId,
      });
      return;
    }

    try {
      // Fetch user details
      const user = await userRepository.findById(params.userId);
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.email;

      // Fetch plan details if planId is provided
      let planName = 'Unknown Plan';
      if (params.planId) {
        try {
          const plan = await subscriptionPlanRepository.findById(params.planId);
          planName = plan.name;
        } catch (error) {
          logger.warn('Failed to fetch plan details for alert', {
            planId: params.planId,
            error,
          });
        }
      }

      // Format amount
      const formattedAmount = params.amount 
        ? `${params.currency || 'INR'} ${params.amount.toFixed(2)}` 
        : 'N/A';

      // Build admin panel link (if available)
      const adminPanelLink = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/admin/subscriptions`
        : 'Admin Panel';

      // Construct email
      const emailContent = {
        to: this.adminEmail,
        from: process.env.SENDGRID_FROM_EMAIL || this.adminEmail,
        subject: `🚨 Payment Failed Alert - ${userName}`,
        text: this.buildEmailTextContent({
          userName,
          userEmail: user.email,
          planName,
          amount: formattedAmount,
          failureReason: params.failureReason,
          razorpayErrorCode: params.razorpayErrorCode,
          razorpayErrorDescription: params.razorpayErrorDescription,
          paymentId: params.paymentId,
          orderId: params.orderId,
          timestamp: new Date().toISOString(),
          adminPanelLink,
        }),
        html: this.buildEmailHtmlContent({
          userName,
          userEmail: user.email,
          planName,
          amount: formattedAmount,
          failureReason: params.failureReason,
          razorpayErrorCode: params.razorpayErrorCode,
          razorpayErrorDescription: params.razorpayErrorDescription,
          paymentId: params.paymentId,
          orderId: params.orderId,
          timestamp: new Date().toISOString(),
          adminPanelLink,
        }),
      };

      // Send email
      await sgMail.send(emailContent);

      logger.info('Payment failure email alert sent successfully', {
        userId: params.userId,
        userEmail: user.email,
        paymentId: params.paymentId,
        orderId: params.orderId,
        adminEmail: this.adminEmail,
      });
    } catch (error) {
      logger.error('Failed to send payment failure email alert', {
        error,
        userId: params.userId,
        paymentId: params.paymentId,
        orderId: params.orderId,
      });
      // Don't throw - email failures shouldn't break the payment flow
    }
  }

  /**
   * Send Slack alert for critical payment failures
   * @param params - Payment failure details
   */
  async sendSlackAlert(params: {
    userId: string;
    userEmail: string;
    userName: string;
    planName?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    paymentId?: string;
    orderId?: string;
  }): Promise<void> {
    // Check if alerts are enabled
    if (!this.alertsEnabled) {
      logger.debug('Payment alerts disabled - skipping Slack alert', {
        userId: params.userId,
        paymentId: params.paymentId,
      });
      return;
    }

    // Check if Slack webhook is configured
    if (!this.slackWebhookUrl) {
      logger.debug('Slack webhook not configured - skipping Slack alert', {
        userId: params.userId,
        paymentId: params.paymentId,
      });
      return;
    }

    try {
      // Format amount
      const formattedAmount = params.amount 
        ? `${params.currency || 'INR'} ${params.amount.toFixed(2)}` 
        : 'N/A';

      // Build Slack message payload
      const slackPayload = {
        text: `🚨 Payment Failed Alert`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Payment Failed Alert',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*User:*\n${params.userName}\n(${params.userEmail})`,
              },
              {
                type: 'mrkdwn',
                text: `*Plan:*\n${params.planName || 'Unknown'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Amount:*\n${formattedAmount}`,
              },
              {
                type: 'mrkdwn',
                text: `*Payment ID:*\n${params.paymentId || 'N/A'}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Failure Reason:*\n${params.failureReason}`,
              },
              {
                type: 'mrkdwn',
                text: `*Error Code:*\n${params.razorpayErrorCode || 'N/A'}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Timestamp:*\n${new Date().toLocaleString()}`,
            },
          },
        ],
      };

      // Send to Slack webhook
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`);
      }

      logger.info('Payment failure Slack alert sent successfully', {
        userId: params.userId,
        userEmail: params.userEmail,
        paymentId: params.paymentId,
        orderId: params.orderId,
      });
    } catch (error) {
      logger.error('Failed to send payment failure Slack alert', {
        error,
        userId: params.userId,
        paymentId: params.paymentId,
        orderId: params.orderId,
      });
      // Don't throw - Slack failures shouldn't break the payment flow
    }
  }

  /**
   * Send daily digest of failed payments
   * This should be called by a scheduled job (e.g., cron)
   */
  async sendDailyDigest(): Promise<void> {
    // Check if alerts are enabled
    if (!this.alertsEnabled) {
      logger.debug('Payment alerts disabled - skipping daily digest');
      return;
    }

    // Check if SendGrid is configured
    if (!this.sendGridConfigured) {
      logger.warn('SendGrid not configured - cannot send daily digest');
      return;
    }

    // Check if admin email is configured
    if (!this.adminEmail) {
      logger.warn('Admin email not configured - cannot send daily digest');
      return;
    }

    try {
      // Get failed payments from the last 24 hours that haven't been included in a digest yet
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentFailures = await db.query.failedPayments.findMany({
        where: (failedPayments, { and, gte, isNull }) => 
          and(
            gte(failedPayments.failedAt, twentyFourHoursAgo),
            isNull(failedPayments.digestSentAt)
          ),
        orderBy: [desc(failedPayments.failedAt)],
      });

      // If no failures, skip sending digest
      if (recentFailures.length === 0) {
        logger.info('No failed payments in the last 24 hours - skipping daily digest');
        return;
      }

      // Fetch user and plan details for each failure
      const failuresWithDetails = await Promise.all(
        recentFailures.map(async (failure) => {
          let userName = 'Unknown User';
          let userEmail = 'unknown@email.com';
          let planName = 'Unknown Plan';

          try {
            const user = await userRepository.findById(failure.userId);
            userName = user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user.email;
            userEmail = user.email;
          } catch (error) {
            logger.warn('Failed to fetch user details for digest', {
              userId: failure.userId,
              error,
            });
          }

          if (failure.planId) {
            try {
              const plan = await subscriptionPlanRepository.findById(failure.planId);
              planName = plan.name;
            } catch (error) {
              logger.warn('Failed to fetch plan details for digest', {
                planId: failure.planId,
                error,
              });
            }
          }

          return {
            ...failure,
            userName,
            userEmail,
            planName,
          };
        })
      );

      // Build digest email
      const emailContent = {
        to: this.adminEmail,
        from: process.env.SENDGRID_FROM_EMAIL || this.adminEmail,
        subject: `📊 Daily Payment Failures Digest - ${recentFailures.length} Failed Payments`,
        text: this.buildDigestTextContent(failuresWithDetails),
        html: this.buildDigestHtmlContent(failuresWithDetails),
      };

      // Send digest email
      await sgMail.send(emailContent);

      // Mark all failures as included in digest
      const failureIds = recentFailures.map(f => f.id);
      await db
        .update(failedPayments)
        .set({ digestSentAt: new Date() })
        .where((failedPayments as any).id.in(failureIds));

      logger.info('Daily payment failures digest sent successfully', {
        failureCount: recentFailures.length,
        adminEmail: this.adminEmail,
      });
    } catch (error) {
      logger.error('Failed to send daily payment failures digest', { error });
      // Don't throw - digest failures shouldn't crash the scheduler
    }
  }

  /**
   * Build plain text email content for immediate alert
   */
  private buildEmailTextContent(params: {
    userName: string;
    userEmail: string;
    planName: string;
    amount: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
    paymentId?: string;
    orderId?: string;
    timestamp: string;
    adminPanelLink: string;
  }): string {
    return `
Payment Failed Alert
====================

A payment attempt has failed. Please review the details below:

User Information
----------------
Name: ${params.userName}
Email: ${params.userEmail}

Payment Details
---------------
Plan: ${params.planName}
Amount: ${params.amount}
Payment ID: ${params.paymentId || 'N/A'}
Order ID: ${params.orderId || 'N/A'}

Failure Details
---------------
Reason: ${params.failureReason}
Razorpay Error Code: ${params.razorpayErrorCode || 'N/A'}
Razorpay Description: ${params.razorpayErrorDescription || 'N/A'}

Timestamp
---------
${params.timestamp}

Action Required
---------------
Please review this failure in the admin panel: ${params.adminPanelLink}

---
This is an automated alert from the payment system.
    `.trim();
  }

  /**
   * Build HTML email content for immediate alert
   */
  private buildEmailHtmlContent(params: {
    userName: string;
    userEmail: string;
    planName: string;
    amount: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
    paymentId?: string;
    orderId?: string;
    timestamp: string;
    adminPanelLink: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #1f2937; margin-bottom: 10px; font-size: 16px; }
    .detail-row { margin: 5px 0; padding: 8px; background-color: white; border-radius: 3px; }
    .label { font-weight: 600; color: #4b5563; }
    .value { color: #1f2937; }
    .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 Payment Failed Alert</h1>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">User Information</div>
        <div class="detail-row">
          <span class="label">Name:</span> <span class="value">${params.userName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span> <span class="value">${params.userEmail}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="detail-row">
          <span class="label">Plan:</span> <span class="value">${params.planName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Amount:</span> <span class="value">${params.amount}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment ID:</span> <span class="value">${params.paymentId || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Order ID:</span> <span class="value">${params.orderId || 'N/A'}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Failure Details</div>
        <div class="detail-row">
          <span class="label">Reason:</span> <span class="value">${params.failureReason}</span>
        </div>
        <div class="detail-row">
          <span class="label">Razorpay Error Code:</span> <span class="value">${params.razorpayErrorCode || 'N/A'}</span>
        </div>
        ${params.razorpayErrorDescription ? `
        <div class="detail-row">
          <span class="label">Error Description:</span> <span class="value">${params.razorpayErrorDescription}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">Timestamp</div>
        <div class="detail-row">
          <span class="value">${new Date(params.timestamp).toLocaleString()}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${params.adminPanelLink}" class="btn">View in Admin Panel</a>
      </div>
    </div>
    
    <div class="footer">
      This is an automated alert from the payment system.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Build plain text digest content
   */
  private buildDigestTextContent(failures: any[]): string {
    let content = `
Daily Payment Failures Digest
==============================

Summary: ${failures.length} payment(s) failed in the last 24 hours

Failed Payments
---------------

`;

    failures.forEach((failure, index) => {
      const amount = failure.amount 
        ? `${failure.currency || 'INR'} ${parseFloat(failure.amount).toFixed(2)}` 
        : 'N/A';
      
      content += `
${index + 1}. ${failure.userName} (${failure.userEmail})
   Plan: ${failure.planName}
   Amount: ${amount}
   Reason: ${failure.failureReason}
   Error Code: ${failure.razorpayErrorCode || 'N/A'}
   Time: ${new Date(failure.failedAt).toLocaleString()}
   Payment ID: ${failure.paymentId || 'N/A'}
   Order ID: ${failure.orderId || 'N/A'}

`;
    });

    content += `
---
This is an automated daily digest from the payment system.
    `;

    return content.trim();
  }

  /**
   * Build HTML digest content
   */
  private buildDigestHtmlContent(failures: any[]): string {
    const failureRows = failures.map((failure, index) => {
      const amount = failure.amount 
        ? `${failure.currency || 'INR'} ${parseFloat(failure.amount).toFixed(2)}` 
        : 'N/A';
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 12px;">
            <strong>${failure.userName}</strong><br>
            <small style="color: #6b7280;">${failure.userEmail}</small>
          </td>
          <td style="padding: 12px;">${failure.planName}</td>
          <td style="padding: 12px;">${amount}</td>
          <td style="padding: 12px;">
            ${failure.failureReason}<br>
            ${failure.razorpayErrorCode ? `<small style="color: #6b7280;">Code: ${failure.razorpayErrorCode}</small>` : ''}
          </td>
          <td style="padding: 12px;"><small>${new Date(failure.failedAt).toLocaleString()}</small></td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; background-color: white; margin-top: 15px; }
    th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #1f2937; }
    .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
    .summary { background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Daily Payment Failures Digest</h1>
    </div>
    
    <div class="content">
      <div class="summary">
        <h2 style="margin: 0 0 10px 0; color: #1f2937;">Summary</h2>
        <p style="margin: 0; font-size: 18px;"><strong>${failures.length}</strong> payment(s) failed in the last 24 hours</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Failure Reason</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${failureRows}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      This is an automated daily digest from the payment system.
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

export const paymentAlertingService = new PaymentAlertingService();
