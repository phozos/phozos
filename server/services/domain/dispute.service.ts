import { BaseService } from '../base.service';
import {
  IChargebackDisputeRepository,
  IUserSubscriptionRepository,
  IPaymentRecordRepository,
} from '../../repositories';
import { container, TYPES } from '../container';
import {
  ChargebackDispute,
  InsertChargebackDispute,
  chargebacksDisputes,
} from '@shared/schema';
import { ValidationServiceError, InvalidOperationError, ResourceNotFoundError } from '../errors';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { InputSanitizer } from '../../utils/input-sanitizer';
import type { ChargebackDisputeWithDetails } from '../../repositories/chargeback-dispute.repository';
import { subscriptionManagementNotificationService } from './subscription-management-notifications.service';

export interface IDisputeService {
  createDispute(data: InsertChargebackDispute): Promise<ChargebackDispute>;
  getDispute(id: string): Promise<ChargebackDispute>;
  getDisputesByUser(userId: string): Promise<ChargebackDispute[]>;
  getDisputesByPayment(paymentId: string): Promise<ChargebackDispute[]>;
  getOpenDisputes(): Promise<ChargebackDisputeWithDetails[]>;
  updateDisputeStatus(id: string, status: string, adminId?: string): Promise<ChargebackDispute>;
  addEvidence(id: string, evidence: Record<string, any>, adminId: string): Promise<ChargebackDispute>;
  resolveDispute(id: string, resolution: string, adminId: string): Promise<ChargebackDispute>;
  escalateToInvestigation(id: string, adminId: string): Promise<ChargebackDispute>;
}

export class DisputeService extends BaseService implements IDisputeService {
  constructor(
    private disputeRepository: IChargebackDisputeRepository,
    private userSubscriptionRepository: IUserSubscriptionRepository,
    private paymentRepository: IPaymentRecordRepository
  ) {
    super();
  }

  async createDispute(data: InsertChargebackDispute): Promise<ChargebackDispute> {
    try {
      const payment = await this.paymentRepository.findById(data.paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment', data.paymentId);
      }

      const subscription = await this.userSubscriptionRepository.findById(data.subscriptionId);
      if (!subscription) {
        throw new ResourceNotFoundError('Subscription', data.subscriptionId);
      }

      if (subscription.userId !== data.userId) {
        throw new InvalidOperationError('dispute creation', 'User does not own this subscription');
      }

      const existingDisputes = await this.disputeRepository.findByPaymentId(data.paymentId);
      const hasOpenDispute = existingDisputes.some(
        (dispute) => dispute.status === 'open' || dispute.status === 'investigating'
      );
      if (hasOpenDispute) {
        throw new InvalidOperationError(
          'dispute creation',
          'An open or investigating dispute already exists for this payment'
        );
      }

      const sanitizedData: InsertChargebackDispute = {
        ...data,
        reason: InputSanitizer.sanitizePlainText(data.reason),
        status: 'open',
        currency: payment.currency,
      };

      const dispute = await db.transaction(async (tx) => {
        const newDispute = await this.disputeRepository.create(sanitizedData);

        logger.info('Dispute created', {
          disputeId: newDispute.id,
          userId: data.userId,
          paymentId: data.paymentId,
          type: data.type,
        });

        return newDispute;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyDisputeReceived(
        data.userId,
        dispute.id
      );

      return dispute;
    } catch (error) {
      return this.handleError(error, 'DisputeService.createDispute');
    }
  }

  async getDispute(id: string): Promise<ChargebackDispute> {
    try {
      const dispute = await this.disputeRepository.findById(id);
      if (!dispute) {
        throw new ResourceNotFoundError('Dispute', id);
      }
      return dispute;
    } catch (error) {
      return this.handleError(error, 'DisputeService.getDispute');
    }
  }

  async getDisputesByUser(userId: string): Promise<ChargebackDispute[]> {
    try {
      return await this.disputeRepository.findByUserId(userId);
    } catch (error) {
      return this.handleError(error, 'DisputeService.getDisputesByUser');
    }
  }

  async getDisputesByPayment(paymentId: string): Promise<ChargebackDispute[]> {
    try {
      return await this.disputeRepository.findByPaymentId(paymentId);
    } catch (error) {
      return this.handleError(error, 'DisputeService.getDisputesByPayment');
    }
  }

  async getOpenDisputes(): Promise<ChargebackDisputeWithDetails[]> {
    try {
      return await this.disputeRepository.findOpen();
    } catch (error) {
      return this.handleError(error, 'DisputeService.getOpenDisputes');
    }
  }

  async updateDisputeStatus(id: string, status: string, adminId?: string): Promise<ChargebackDispute> {
    try {
      const dispute = await this.disputeRepository.findById(id);
      if (!dispute) {
        throw new ResourceNotFoundError('Dispute', id);
      }

      const validStatuses = ['open', 'investigating', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        throw new InvalidOperationError('status update', `Invalid status: ${status}`);
      }

      return await db.transaction(async (tx) => {
        const updatedDispute = await this.disputeRepository.updateStatus(id, status, adminId);

        logger.info('Dispute status updated', {
          disputeId: id,
          newStatus: status,
          adminId,
        });

        return updatedDispute;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'DisputeService.updateDisputeStatus');
    }
  }

  async addEvidence(id: string, evidence: Record<string, any>, adminId: string): Promise<ChargebackDispute> {
    try {
      const dispute = await this.disputeRepository.findById(id);
      if (!dispute) {
        throw new ResourceNotFoundError('Dispute', id);
      }

      if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new InvalidOperationError(
          'add evidence',
          `Cannot add evidence to dispute with status: ${dispute.status}`
        );
      }

      const sanitizedEvidence: Record<string, any> = {};
      for (const key in evidence) {
        if (typeof evidence[key] === 'string') {
          sanitizedEvidence[key] = InputSanitizer.sanitizePlainText(evidence[key]);
        } else {
          sanitizedEvidence[key] = evidence[key];
        }
      }

      sanitizedEvidence.addedBy = adminId;
      sanitizedEvidence.addedAt = new Date().toISOString();

      return await db.transaction(async (tx) => {
        const updatedDispute = await this.disputeRepository.addEvidence(id, sanitizedEvidence);

        logger.info('Evidence added to dispute', {
          disputeId: id,
          adminId,
        });

        return updatedDispute;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'DisputeService.addEvidence');
    }
  }

  async resolveDispute(id: string, resolution: string, adminId: string): Promise<ChargebackDispute> {
    try {
      const dispute = await this.disputeRepository.findById(id);
      if (!dispute) {
        throw new ResourceNotFoundError('Dispute', id);
      }

      if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new InvalidOperationError(
          'resolve dispute',
          `Cannot resolve dispute with status: ${dispute.status}`
        );
      }

      const sanitizedResolution = InputSanitizer.sanitizePlainText(resolution);

      const updatedDispute = await db.transaction(async (tx) => {
        const updated = await this.disputeRepository.resolve(id, sanitizedResolution, adminId);

        logger.info('Dispute resolved', {
          disputeId: id,
          adminId,
          resolution: sanitizedResolution,
        });

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyDisputeResolved(
        dispute.userId,
        id,
        sanitizedResolution
      );

      return updatedDispute;
    } catch (error) {
      return this.handleError(error, 'DisputeService.resolveDispute');
    }
  }

  async escalateToInvestigation(id: string, adminId: string): Promise<ChargebackDispute> {
    try {
      const dispute = await this.disputeRepository.findById(id);
      if (!dispute) {
        throw new ResourceNotFoundError('Dispute', id);
      }

      if (dispute.status !== 'open') {
        throw new InvalidOperationError(
          'escalate dispute',
          `Cannot escalate dispute with status: ${dispute.status}`
        );
      }

      const updatedDispute = await db.transaction(async (tx) => {
        const updated = await this.disputeRepository.updateStatus(id, 'investigating', adminId);

        logger.info('Dispute escalated to investigation', {
          disputeId: id,
          adminId,
        });

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyDisputeUnderInvestigation(
        dispute.userId,
        id
      );

      return updatedDispute;
    } catch (error) {
      return this.handleError(error, 'DisputeService.escalateToInvestigation');
    }
  }
}

export const disputeService = container.get<IDisputeService>(TYPES.IDisputeService);
