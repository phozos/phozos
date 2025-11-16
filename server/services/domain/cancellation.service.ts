import { BaseService } from '../base.service';
import {
  ICancellationRequestRepository,
  IUserSubscriptionRepository,
  IPaymentRepository,
} from '../../repositories';
import { container, TYPES } from '../container';
import {
  CancellationRequest,
  InsertCancellationRequest,
  cancellationRequests,
} from '@shared/schema';
import { ValidationServiceError, InvalidOperationError, ResourceNotFoundError } from '../errors';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { InputSanitizer } from '../../utils/input-sanitizer';
import type { CancellationRequestWithDetails, CancellationStats } from '../../repositories/cancellation-request.repository';
import { subscriptionManagementNotificationService } from './subscription-management-notifications.service';

export interface ICancellationService {
  createCancellationRequest(data: InsertCancellationRequest): Promise<CancellationRequest>;
  getCancellationRequest(id: string): Promise<CancellationRequest>;
  getCancellationRequestsByUser(userId: string): Promise<CancellationRequest[]>;
  getCancellationRequestsBySubscription(subscriptionId: string): Promise<CancellationRequest[]>;
  getPendingCancellationRequests(): Promise<CancellationRequestWithDetails[]>;
  approveCancellationRequest(id: string, adminId: string, adminNotes?: string): Promise<CancellationRequest>;
  rejectCancellationRequest(id: string, adminId: string, adminNotes?: string): Promise<CancellationRequest>;
  cancelRequest(id: string, userId: string): Promise<CancellationRequest>;
  getCancellationStatistics(): Promise<CancellationStats>;
}

export class CancellationService extends BaseService implements ICancellationService {
  constructor(
    private cancellationRequestRepository: ICancellationRequestRepository,
    private userSubscriptionRepository: IUserSubscriptionRepository,
    private paymentRepository: IPaymentRepository
  ) {
    super();
  }

  async createCancellationRequest(data: InsertCancellationRequest): Promise<CancellationRequest> {
    try {
      const subscription = await this.userSubscriptionRepository.findById(data.subscriptionId);
      if (!subscription) {
        throw new ResourceNotFoundError('Subscription', data.subscriptionId);
      }

      if (subscription.userId !== data.userId) {
        throw new InvalidOperationError(
          'cancellation request',
          'User does not own this subscription'
        );
      }

      if (subscription.status === 'cancelled') {
        throw new InvalidOperationError(
          'cancellation request',
          'Subscription is already cancelled'
        );
      }

      const existingRequests = await this.cancellationRequestRepository.findBySubscriptionId(
        data.subscriptionId
      );
      const hasPendingRequest = existingRequests.some((req) => req.status === 'pending');
      if (hasPendingRequest) {
        throw new InvalidOperationError(
          'cancellation request',
          'A pending cancellation request already exists for this subscription'
        );
      }

      const sanitizedData: InsertCancellationRequest = {
        ...data,
        reason: InputSanitizer.sanitizePlainText(data.reason),
        status: 'pending',
        requestedAt: new Date(),
      };

      const cancellationRequest = await db.transaction(async (tx) => {
        const request = await this.cancellationRequestRepository.create(sanitizedData);

        logger.info('Cancellation request created', {
          requestId: request.id,
          userId: data.userId,
          subscriptionId: data.subscriptionId,
        });

        return request;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyCancellationRequestReceived(
        data.userId,
        data.subscriptionId
      );

      return cancellationRequest;
    } catch (error) {
      return this.handleError(error, 'CancellationService.createCancellationRequest');
    }
  }

  async getCancellationRequest(id: string): Promise<CancellationRequest> {
    try {
      const request = await this.cancellationRequestRepository.findById(id);
      if (!request) {
        throw new ResourceNotFoundError('CancellationRequest', id);
      }
      return request;
    } catch (error) {
      return this.handleError(error, 'CancellationService.getCancellationRequest');
    }
  }

  async getCancellationRequestsByUser(userId: string): Promise<CancellationRequest[]> {
    try {
      return await this.cancellationRequestRepository.findByUserId(userId);
    } catch (error) {
      return this.handleError(error, 'CancellationService.getCancellationRequestsByUser');
    }
  }

  async getCancellationRequestsBySubscription(subscriptionId: string): Promise<CancellationRequest[]> {
    try {
      return await this.cancellationRequestRepository.findBySubscriptionId(subscriptionId);
    } catch (error) {
      return this.handleError(error, 'CancellationService.getCancellationRequestsBySubscription');
    }
  }

  async getPendingCancellationRequests(): Promise<CancellationRequestWithDetails[]> {
    try {
      return await this.cancellationRequestRepository.findPending();
    } catch (error) {
      return this.handleError(error, 'CancellationService.getPendingCancellationRequests');
    }
  }

  async approveCancellationRequest(
    id: string,
    adminId: string,
    adminNotes?: string
  ): Promise<CancellationRequest> {
    try {
      const request = await this.cancellationRequestRepository.findById(id);
      if (!request) {
        throw new ResourceNotFoundError('CancellationRequest', id);
      }

      if (request.status !== 'pending') {
        throw new InvalidOperationError(
          'approve cancellation',
          `Cannot approve cancellation request with status: ${request.status}`
        );
      }

      const updatedRequest = await db.transaction(async (tx) => {
        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;
        
        const updated = await this.cancellationRequestRepository.updateStatus(
          id,
          'approved',
          adminId,
          sanitizedNotes
        );

        const subscription = await this.userSubscriptionRepository.findById(request.subscriptionId);
        if (subscription && subscription.status !== 'cancelled') {
          await this.userSubscriptionRepository.update(request.subscriptionId, {
            status: 'cancelled',
            updatedAt: new Date(),
          });
        }

        logger.info('Cancellation request approved', {
          requestId: id,
          adminId,
          subscriptionId: request.subscriptionId,
        });

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyCancellationApproved(
        request.userId,
        request.subscriptionId
      );

      return updatedRequest;
    } catch (error) {
      return this.handleError(error, 'CancellationService.approveCancellationRequest');
    }
  }

  async rejectCancellationRequest(
    id: string,
    adminId: string,
    adminNotes?: string
  ): Promise<CancellationRequest> {
    try {
      const request = await this.cancellationRequestRepository.findById(id);
      if (!request) {
        throw new ResourceNotFoundError('CancellationRequest', id);
      }

      if (request.status !== 'pending') {
        throw new InvalidOperationError(
          'reject cancellation',
          `Cannot reject cancellation request with status: ${request.status}`
        );
      }

      const updatedRequest = await db.transaction(async (tx) => {
        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;
        
        const updated = await this.cancellationRequestRepository.updateStatus(
          id,
          'rejected',
          adminId,
          sanitizedNotes
        );

        logger.info('Cancellation request rejected', {
          requestId: id,
          adminId,
          subscriptionId: request.subscriptionId,
        });

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyCancellationRejected(
        request.userId,
        request.subscriptionId,
        adminNotes || 'Your request did not meet the cancellation criteria.'
      );

      return updatedRequest;
    } catch (error) {
      return this.handleError(error, 'CancellationService.rejectCancellationRequest');
    }
  }

  async cancelRequest(id: string, userId: string): Promise<CancellationRequest> {
    try {
      const request = await this.cancellationRequestRepository.findById(id);
      if (!request) {
        throw new ResourceNotFoundError('CancellationRequest', id);
      }

      if (request.userId !== userId) {
        throw new InvalidOperationError(
          'cancel request',
          'User does not own this cancellation request'
        );
      }

      if (request.status !== 'pending') {
        throw new InvalidOperationError(
          'cancel request',
          `Cannot cancel request with status: ${request.status}`
        );
      }

      return await db.transaction(async (tx) => {
        const updatedRequest = await this.cancellationRequestRepository.updateStatus(
          id,
          'cancelled',
          userId
        );

        logger.info('Cancellation request cancelled by user', {
          requestId: id,
          userId,
        });

        return updatedRequest;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'CancellationService.cancelRequest');
    }
  }

  async getCancellationStatistics(): Promise<CancellationStats> {
    try {
      return await this.cancellationRequestRepository.getStatistics();
    } catch (error) {
      return this.handleError(error, 'CancellationService.getCancellationStatistics');
    }
  }
}

export const cancellationService = container.get<ICancellationService>(TYPES.ICancellationService);
