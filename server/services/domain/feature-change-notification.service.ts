/**
 * Feature Change Notification Service
 * 
 * Handles notifications for feature changes in subscription plans
 * - Feature additions (upgrade opportunities)
 * - Feature deprecations (migration paths)
 * - Feature modifications (value changes)
 * 
 * Implements multi-channel delivery (email, in-app) with batching strategy
 */

import { BaseService } from '../base.service';
import { container, TYPES } from '../container';
import { INotificationService } from './notification.service';
import { IUserSubscriptionRepository, ISubscriptionPlanRepository, IUserRepository } from '../../repositories';
import { FeatureChange } from '@shared/types/feature-changes';
import { logger } from '../../utils/logger';
import sgMail from '@sendgrid/mail';
import config from '../../config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FeatureChangeDetails {
  planId: string;
  planName: string;
  featureName: string;
  featureDisplayName: string;
  oldValue?: any;
  newValue?: any;
  effectiveDate: Date;
  migrationGuideUrl?: string;
  grandfathered?: boolean;
  grandfatherExpiryDate?: Date | null;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  batchSize?: number;
  respectPreferences?: boolean;
}

export interface NotificationResults {
  totalUsers: number;
  emailsSent: number;
  inAppCreated: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface IFeatureChangeNotificationService {
  notifyFeatureChange(
    changeType: 'addition' | 'deprecation' | 'modification',
    affectedUserIds: string[],
    featureDetails: FeatureChangeDetails,
    notificationConfig: NotificationConfig
  ): Promise<NotificationResults>;

  sendFeatureAdditionNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults>;

  sendFeatureDeprecationNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults>;

  sendFeatureModificationNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults>;
}

export class FeatureChangeNotificationService extends BaseService implements IFeatureChangeNotificationService {
  private _notificationService?: INotificationService;
  private _userSubscriptionRepo?: IUserSubscriptionRepository;
  private _subscriptionPlanRepo?: ISubscriptionPlanRepository;
  private _userRepo?: IUserRepository;
  private sendGridConfigured: boolean = false;
  private templatesPath: string;

  constructor(
    notificationService?: INotificationService,
    userSubscriptionRepo?: IUserSubscriptionRepository,
    subscriptionPlanRepo?: ISubscriptionPlanRepository,
    userRepo?: IUserRepository
  ) {
    super();
    this._notificationService = notificationService;
    this._userSubscriptionRepo = userSubscriptionRepo;
    this._subscriptionPlanRepo = subscriptionPlanRepo;
    this._userRepo = userRepo;

    this.templatesPath = path.join(__dirname, '../../templates/emails');

    if (config.email.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(config.email.SENDGRID_API_KEY);
        this.sendGridConfigured = true;
        logger.info('SendGrid configured for feature change notifications');
      } catch (error) {
        logger.error('Failed to configure SendGrid for feature change notifications', { error });
      }
    } else {
      logger.warn('SendGrid API key not configured - feature change email notifications will be disabled');
    }
  }

  // Lazy getters to avoid circular dependency at initialization
  private get notificationService(): INotificationService {
    if (!this._notificationService) {
      this._notificationService = container.get<INotificationService>(TYPES.INotificationService);
    }
    return this._notificationService;
  }

  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    if (!this._userSubscriptionRepo) {
      this._userSubscriptionRepo = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
    }
    return this._userSubscriptionRepo;
  }

  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    if (!this._subscriptionPlanRepo) {
      this._subscriptionPlanRepo = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
    }
    return this._subscriptionPlanRepo;
  }

  private get userRepo(): IUserRepository {
    if (!this._userRepo) {
      this._userRepo = container.get<IUserRepository>(TYPES.IUserRepository);
    }
    return this._userRepo;
  }

  /**
   * Main notification orchestration method
   * Routes to appropriate notification handler based on change type
   */
  async notifyFeatureChange(
    changeType: 'addition' | 'deprecation' | 'modification',
    affectedUserIds: string[],
    featureDetails: FeatureChangeDetails,
    notificationConfig: NotificationConfig
  ): Promise<NotificationResults> {
    try {
      logger.info('Starting feature change notifications', {
        changeType,
        affectedUsers: affectedUserIds.length,
        featureName: featureDetails.featureName
      });

      switch (changeType) {
        case 'addition':
          return await this.sendFeatureAdditionNotification(affectedUserIds, featureDetails);
        case 'deprecation':
          return await this.sendFeatureDeprecationNotification(affectedUserIds, featureDetails);
        case 'modification':
          return await this.sendFeatureModificationNotification(affectedUserIds, featureDetails);
        default:
          throw new Error(`Unknown change type: ${changeType}`);
      }
    } catch (error) {
      logger.error('Error in feature change notification', { error, changeType });
      return this.handleError(error, 'FeatureChangeNotificationService.notifyFeatureChange');
    }
  }

  /**
   * Send notifications for new feature additions (upgrade opportunities)
   */
  async sendFeatureAdditionNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults> {
    try {
      const results: NotificationResults = {
        totalUsers: userIds.length,
        emailsSent: 0,
        inAppCreated: 0,
        failed: 0,
        errors: []
      };

      const batchSize = 1000;
      const batches = this.createBatches(userIds, batchSize);

      for (const batch of batches) {
        const batchResults = await this.processBatch(
          batch,
          featureDetails,
          'feature_addition',
          'feature-addition.html'
        );

        results.emailsSent += batchResults.emailsSent;
        results.inAppCreated += batchResults.inAppCreated;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);

        await this.delay(500);
      }

      logger.info('Feature addition notifications completed', results);
      return results;
    } catch (error) {
      logger.error('Error sending feature addition notifications', { error });
      return this.handleError(error, 'FeatureChangeNotificationService.sendFeatureAdditionNotification');
    }
  }

  /**
   * Send notifications for feature deprecations (migration paths)
   */
  async sendFeatureDeprecationNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults> {
    try {
      const results: NotificationResults = {
        totalUsers: userIds.length,
        emailsSent: 0,
        inAppCreated: 0,
        failed: 0,
        errors: []
      };

      const batchSize = 1000;
      const batches = this.createBatches(userIds, batchSize);

      for (const batch of batches) {
        const batchResults = await this.processBatch(
          batch,
          featureDetails,
          'feature_deprecation',
          'feature-deprecation.html'
        );

        results.emailsSent += batchResults.emailsSent;
        results.inAppCreated += batchResults.inAppCreated;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);

        await this.delay(500);
      }

      logger.info('Feature deprecation notifications completed', results);
      return results;
    } catch (error) {
      logger.error('Error sending feature deprecation notifications', { error });
      return this.handleError(error, 'FeatureChangeNotificationService.sendFeatureDeprecationNotification');
    }
  }

  /**
   * Send notifications for feature value changes
   */
  async sendFeatureModificationNotification(
    userIds: string[],
    featureDetails: FeatureChangeDetails
  ): Promise<NotificationResults> {
    try {
      const results: NotificationResults = {
        totalUsers: userIds.length,
        emailsSent: 0,
        inAppCreated: 0,
        failed: 0,
        errors: []
      };

      const batchSize = 1000;
      const batches = this.createBatches(userIds, batchSize);

      for (const batch of batches) {
        const batchResults = await this.processBatch(
          batch,
          featureDetails,
          'feature_modification',
          'feature-modification.html'
        );

        results.emailsSent += batchResults.emailsSent;
        results.inAppCreated += batchResults.inAppCreated;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);

        await this.delay(500);
      }

      logger.info('Feature modification notifications completed', results);
      return results;
    } catch (error) {
      logger.error('Error sending feature modification notifications', { error });
      return this.handleError(error, 'FeatureChangeNotificationService.sendFeatureModificationNotification');
    }
  }

  /**
   * Process a batch of users for notifications
   */
  private async processBatch(
    userIds: string[],
    featureDetails: FeatureChangeDetails,
    notificationType: 'feature_addition' | 'feature_deprecation' | 'feature_modification',
    templateFile: string
  ): Promise<NotificationResults> {
    const results: NotificationResults = {
      totalUsers: userIds.length,
      emailsSent: 0,
      inAppCreated: 0,
      failed: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        const user = await this.userRepo.findById(userId);

        const notificationTitle = this.getNotificationTitle(notificationType, featureDetails);
        const notificationMessage = this.getNotificationMessage(notificationType, featureDetails);

        await this.notificationService.createNotification({
          userId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            featureName: featureDetails.featureName,
            planId: featureDetails.planId,
            effectiveDate: featureDetails.effectiveDate.toISOString(),
            migrationGuideUrl: featureDetails.migrationGuideUrl
          } as any
        });
        results.inAppCreated++;

        if (this.sendGridConfigured) {
          const emailSent = await this.sendEmail(user.email, featureDetails, templateFile, notificationType);
          if (emailSent) {
            results.emailsSent++;
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error('Failed to send notification to user', { userId, error });
      }
    }

    return results;
  }

  /**
   * Send email using SendGrid with HTML template
   */
  private async sendEmail(
    toEmail: string,
    featureDetails: FeatureChangeDetails,
    templateFile: string,
    notificationType: string
  ): Promise<boolean> {
    try {
      const subject = this.getEmailSubject(notificationType, featureDetails);
      const htmlTemplate = await this.loadEmailTemplate(templateFile);
      const htmlContent = this.populateTemplate(htmlTemplate, featureDetails);

      const emailContent = {
        to: toEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@edupath.com',
        subject,
        html: htmlContent
      };

      await sgMail.send(emailContent);
      return true;
    } catch (error) {
      logger.error('Failed to send feature change email', { toEmail, error });
      return false;
    }
  }

  /**
   * Load email template from file system
   */
  private async loadEmailTemplate(templateFile: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, templateFile);
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to load email template', { templateFile, error });
      return this.getFallbackTemplate();
    }
  }

  /**
   * Populate template with feature details
   */
  private populateTemplate(template: string, featureDetails: FeatureChangeDetails): string {
    return template
      .replace(/{{planName}}/g, featureDetails.planName)
      .replace(/{{featureName}}/g, featureDetails.featureDisplayName || featureDetails.featureName)
      .replace(/{{effectiveDate}}/g, featureDetails.effectiveDate.toDateString())
      .replace(/{{migrationGuideUrl}}/g, featureDetails.migrationGuideUrl || '#')
      .replace(/{{oldValue}}/g, String(featureDetails.oldValue || 'N/A'))
      .replace(/{{newValue}}/g, String(featureDetails.newValue || 'N/A'))
      .replace(/{{grandfathered}}/g, featureDetails.grandfathered ? 'Yes' : 'No')
      .replace(/{{grandfatherExpiryDate}}/g, featureDetails.grandfatherExpiryDate?.toDateString() || 'Never');
  }

  /**
   * Get notification title based on type
   */
  private getNotificationTitle(notificationType: string, featureDetails: FeatureChangeDetails): string {
    switch (notificationType) {
      case 'feature_addition':
        return `🎉 New Feature Available: ${featureDetails.featureDisplayName || featureDetails.featureName}`;
      case 'feature_deprecation':
        return `⚠️ Important: ${featureDetails.featureDisplayName || featureDetails.featureName} Scheduled for Removal`;
      case 'feature_modification':
        return `📢 Update: Changes to ${featureDetails.featureDisplayName || featureDetails.featureName}`;
      default:
        return 'Plan Feature Update';
    }
  }

  /**
   * Get notification message based on type
   */
  private getNotificationMessage(notificationType: string, featureDetails: FeatureChangeDetails): string {
    switch (notificationType) {
      case 'feature_addition':
        return `Great news! Your ${featureDetails.planName} plan now includes ${featureDetails.featureDisplayName || featureDetails.featureName}. This feature is now active in your account.`;
      case 'feature_deprecation':
        return `We're writing to inform you about an upcoming change to your ${featureDetails.planName} plan. ${featureDetails.featureDisplayName || featureDetails.featureName} will be deprecated on ${featureDetails.effectiveDate.toDateString()}.${featureDetails.grandfathered ? ' You are grandfathered and can keep this feature.' : ''}`;
      case 'feature_modification':
        return `We're making improvements to ${featureDetails.featureDisplayName || featureDetails.featureName} in your ${featureDetails.planName} plan. Effective ${featureDetails.effectiveDate.toDateString()}.${featureDetails.grandfathered ? ' You are grandfathered with the old behavior.' : ''}`;
      default:
        return 'Your plan features have been updated.';
    }
  }

  /**
   * Get email subject based on type
   */
  private getEmailSubject(notificationType: string, featureDetails: FeatureChangeDetails): string {
    switch (notificationType) {
      case 'feature_addition':
        return `🎉 New Feature Available: ${featureDetails.featureDisplayName || featureDetails.featureName}`;
      case 'feature_deprecation':
        return `⚠️ Important: ${featureDetails.featureDisplayName || featureDetails.featureName} Scheduled for Removal`;
      case 'feature_modification':
        return `📢 Update: Changes to ${featureDetails.featureDisplayName || featureDetails.featureName}`;
      default:
        return 'Plan Feature Update';
    }
  }

  /**
   * Fallback template if file loading fails
   */
  private getFallbackTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plan Feature Update</h1>
    </div>
    <div class="content">
      <p>Your {{planName}} plan has been updated with changes to {{featureName}}.</p>
      <p>Effective Date: {{effectiveDate}}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Create batches from user IDs
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay helper for throttling
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const featureChangeNotificationService = new FeatureChangeNotificationService();
