import { db } from '../db';
import { chargebacksDisputes, users } from '@shared/schema';
import { eq, and, or, lt } from 'drizzle-orm';
import logger from '../utils/logger';
import { emailConfig } from '../config/index';

export class DisputeEscalationJob {
  private escalationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly ESCALATION_THRESHOLD_HOURS = 48;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000;

  start(): void {
    if (this.isRunning) {
      logger.warn('Dispute escalation job already running');
      return;
    }

    logger.info('Starting dispute escalation job', {
      checkIntervalMinutes: this.CHECK_INTERVAL_MS / 60000,
      escalationThresholdHours: this.ESCALATION_THRESHOLD_HOURS,
    });

    this.runEscalation();

    this.escalationInterval = setInterval(() => {
      this.runEscalation();
    }, this.CHECK_INTERVAL_MS);

    this.isRunning = true;
    logger.info('Dispute escalation job started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Dispute escalation job is not running');
      return;
    }

    logger.info('Stopping dispute escalation job');

    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = null;
    }

    this.isRunning = false;
    logger.info('Dispute escalation job stopped successfully');
  }

  private async runEscalation(): Promise<void> {
    logger.info('Running dispute escalation check');

    try {
      const escalationCutoff = new Date();
      escalationCutoff.setHours(escalationCutoff.getHours() - this.ESCALATION_THRESHOLD_HOURS);

      const disputesToEscalate = await db
        .select()
        .from(chargebacksDisputes)
        .where(
          and(
            or(
              eq(chargebacksDisputes.status, 'open'),
              eq(chargebacksDisputes.status, 'investigating')
            ),
            lt(chargebacksDisputes.createdAt, escalationCutoff)
          )
        );

      if (disputesToEscalate.length === 0) {
        logger.info('No disputes to escalate');
        return;
      }

      logger.info('Found disputes to escalate', {
        count: disputesToEscalate.length,
        thresholdHours: this.ESCALATION_THRESHOLD_HOURS,
      });

      let escalatedCount = 0;

      for (const dispute of disputesToEscalate) {
        try {
          await this.escalateDispute(dispute);
          escalatedCount++;
        } catch (error) {
          logger.error('Failed to escalate dispute', {
            disputeId: dispute.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Dispute escalation completed', {
        total: disputesToEscalate.length,
        escalated: escalatedCount,
      });
    } catch (error) {
      logger.error('Dispute escalation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async escalateDispute(dispute: any): Promise<void> {
    const hoursSinceCreation = Math.floor(
      (Date.now() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60)
    );

    const escalationNote = `AUTO-ESCALATED: Dispute has been ${dispute.status} for ${hoursSinceCreation} hours without resolution. Requires immediate attention.`;

    const currentEvidence = dispute.evidence || {};
    const updatedEvidence = {
      ...currentEvidence,
      escalations: [
        ...(currentEvidence.escalations || []),
        {
          timestamp: new Date().toISOString(),
          reason: escalationNote,
          hoursPending: hoursSinceCreation,
        },
      ],
    };

    await db.transaction(async (tx) => {
      await tx
        .update(chargebacksDisputes)
        .set({
          evidence: updatedEvidence,
          updatedAt: new Date(),
        })
        .where(eq(chargebacksDisputes.id, dispute.id));

      logger.info('Dispute escalated', {
        disputeId: dispute.id,
        userId: dispute.userId,
        type: dispute.type,
        hoursPending: hoursSinceCreation,
        previousStatus: dispute.status,
      });
    });

    await this.sendAdminAlert(dispute, hoursSinceCreation);
  }

  private async sendAdminAlert(dispute: any, hoursPending: number): Promise<void> {
    if (!emailConfig.SENDGRID_API_KEY || !emailConfig.SENDGRID_FROM_EMAIL) {
      logger.warn('Email not configured, skipping admin alert', {
        disputeId: dispute.id,
      });
      return;
    }

    try {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.teamRole, 'admin'));

      logger.info('Sending dispute escalation alert to admins', {
        disputeId: dispute.id,
        adminCount: adminUsers.length,
        hoursPending,
      });

      logger.info('Admin dispute escalation alert logged', {
        disputeId: dispute.id,
        type: dispute.type,
        status: dispute.status,
        hoursPending,
        amount: dispute.amount,
        userId: dispute.userId,
        message: `URGENT: Dispute ${dispute.id} requires immediate attention. Pending for ${hoursPending} hours.`,
      });
    } catch (error) {
      logger.error('Failed to send admin alert', {
        disputeId: dispute.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
