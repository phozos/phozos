import { BaseRepository } from './base.repository';
import {
  CancellationRequest,
  InsertCancellationRequest,
  cancellationRequests,
  userSubscriptions,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface CancellationRequestWithDetails extends CancellationRequest {
  subscription?: {
    id: string;
    planId: string;
    status: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface CancellationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface ICancellationRequestRepository {
  create(data: InsertCancellationRequest): Promise<CancellationRequest>;
  findById(id: string): Promise<CancellationRequest>;
  findByIdOptional(id: string): Promise<CancellationRequest | undefined>;
  findBySubscriptionId(subscriptionId: string): Promise<CancellationRequest[]>;
  findByUserId(userId: string): Promise<CancellationRequest[]>;
  findPending(): Promise<CancellationRequestWithDetails[]>;
  updateStatus(id: string, status: string, processedBy: string, adminNotes?: string): Promise<CancellationRequest>;
  getStatistics(): Promise<CancellationStats>;
}

export class CancellationRequestRepository
  extends BaseRepository<CancellationRequest, InsertCancellationRequest>
  implements ICancellationRequestRepository
{
  constructor() {
    super(cancellationRequests, 'id');
  }

  async create(data: InsertCancellationRequest): Promise<CancellationRequest> {
    try {
      const results = await db
        .insert(cancellationRequests)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return results[0] as CancellationRequest;
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.create');
    }
  }

  async findBySubscriptionId(subscriptionId: string): Promise<CancellationRequest[]> {
    try {
      return await db
        .select()
        .from(cancellationRequests)
        .where(eq(cancellationRequests.subscriptionId, subscriptionId))
        .orderBy(desc(cancellationRequests.createdAt)) as CancellationRequest[];
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.findBySubscriptionId');
    }
  }

  async findByUserId(userId: string): Promise<CancellationRequest[]> {
    try {
      return await db
        .select()
        .from(cancellationRequests)
        .where(eq(cancellationRequests.userId, userId))
        .orderBy(desc(cancellationRequests.createdAt)) as CancellationRequest[];
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.findByUserId');
    }
  }

  async findPending(): Promise<CancellationRequestWithDetails[]> {
    try {
      const results = await db
        .select({
          id: cancellationRequests.id,
          subscriptionId: cancellationRequests.subscriptionId,
          userId: cancellationRequests.userId,
          reason: cancellationRequests.reason,
          status: cancellationRequests.status,
          requestedAt: cancellationRequests.requestedAt,
          processedAt: cancellationRequests.processedAt,
          processedBy: cancellationRequests.processedBy,
          adminNotes: cancellationRequests.adminNotes,
          createdAt: cancellationRequests.createdAt,
          updatedAt: cancellationRequests.updatedAt,
          subscription: {
            id: userSubscriptions.id,
            planId: userSubscriptions.planId,
            status: userSubscriptions.status,
          },
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(cancellationRequests)
        .leftJoin(userSubscriptions, eq(cancellationRequests.subscriptionId, userSubscriptions.id))
        .leftJoin(users, eq(cancellationRequests.userId, users.id))
        .where(eq(cancellationRequests.status, 'pending'))
        .orderBy(desc(cancellationRequests.createdAt));

      return results as CancellationRequestWithDetails[];
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.findPending');
    }
  }

  async updateStatus(
    id: string,
    status: string,
    processedBy: string,
    adminNotes?: string
  ): Promise<CancellationRequest> {
    try {
      const updateData: Partial<CancellationRequest> = {
        status: status as any,
        processedBy,
        processedAt: new Date(),
        updatedAt: new Date(),
      };

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      const results = await db
        .update(cancellationRequests)
        .set(updateData)
        .where(eq(cancellationRequests.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('CancellationRequest', id);
      }

      return results[0] as CancellationRequest;
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.updateStatus');
    }
  }

  async getStatistics(): Promise<CancellationStats> {
    try {
      const results = await db
        .select({
          status: cancellationRequests.status,
          count: count(),
        })
        .from(cancellationRequests)
        .groupBy(cancellationRequests.status);

      const stats: CancellationStats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      };

      results.forEach((row) => {
        const statusCount = Number(row.count);
        stats.total += statusCount;
        
        if (row.status === 'pending') stats.pending = statusCount;
        else if (row.status === 'approved') stats.approved = statusCount;
        else if (row.status === 'rejected') stats.rejected = statusCount;
        else if (row.status === 'cancelled') stats.cancelled = statusCount;
      });

      return stats;
    } catch (error) {
      handleDatabaseError(error, 'CancellationRequestRepository.getStatistics');
    }
  }
}

export const cancellationRequestRepository = new CancellationRequestRepository();
