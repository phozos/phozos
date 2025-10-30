import { BaseRepository, DeleteResult } from './base.repository';
import { Event, InsertEvent, events, EventRegistration, eventRegistrations } from '@shared/schema';
import { db } from '../db';
import { eq, and, gte, desc, lte, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { EventFilters } from '../types/repository-filters';

export interface IEventRepository {
  findById(id: string): Promise<Event>;
  findByIdOptional(id: string): Promise<Event | undefined>;
  findAll(filters?: EventFilters): Promise<Event[]>;
  findUpcoming(): Promise<Event[]>;
  create(data: InsertEvent): Promise<Event>;
  update(id: string, data: Partial<Event>): Promise<Event>;
  delete(id: string): Promise<boolean>;
  
  registerUser(eventId: string, userId: string): Promise<EventRegistration>;
  getRegistrations(eventId: string): Promise<EventRegistration[]>;
  getUserRegistrations(userId: string): Promise<EventRegistration[]>;
  isUserRegistered(eventId: string, userId: string): Promise<boolean>;
  unregisterUser(eventId: string, userId: string): Promise<boolean>;
}

export class EventRepository extends BaseRepository<Event, InsertEvent> implements IEventRepository {
  constructor() {
    super(events, 'id');
  }

  async findUpcoming(): Promise<Event[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(events)
        .where(gte(events.startDate, now))
        .orderBy(events.startDate) as Event[];
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.findUpcoming');
    }
  }

  async registerUser(eventId: string, userId: string): Promise<EventRegistration> {
    try {
      const results = await db
        .insert(eventRegistrations)
        .values({ eventId, userId })
        .returning();
      return results[0] as EventRegistration;
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.registerUser');
    }
  }

  async getRegistrations(eventId: string): Promise<EventRegistration[]> {
    try {
      return await db
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, eventId))
        .orderBy(desc(eventRegistrations.registeredAt)) as EventRegistration[];
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.getRegistrations');
    }
  }

  async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
    try {
      return await db
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.userId, userId))
        .orderBy(desc(eventRegistrations.registeredAt)) as EventRegistration[];
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.getUserRegistrations');
    }
  }

  async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
    try {
      const results = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.userId, userId)
          )
        )
        .limit(1);
      
      return results.length > 0;
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.isUserRegistered');
    }
  }

  async unregisterUser(eventId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.userId, userId)
          )
        ) as unknown as DeleteResult;
      
      return result.rowCount > 0;
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.unregisterUser');
    }
  }

  async findAll(filters?: EventFilters): Promise<Event[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.startDate) {
          conditions.push(gte(events.startDate, filters.startDate));
        }
        if (filters.endDate) {
          conditions.push(lte(events.endDate, filters.endDate));
        }
        if (filters.eventType) {
          conditions.push(eq(events.eventType, filters.eventType));
        }
        if (filters.isActive !== undefined) {
          conditions.push(eq(events.isActive, filters.isActive));
        }
      }
      
      let query = db.select().from(events);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(events.startDate) as Event[];
    } catch (error) {
      handleDatabaseError(error, 'EventRepository.findAll');
    }
  }
}

export const eventRepository = new EventRepository();
