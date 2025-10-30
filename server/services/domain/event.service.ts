import { BaseService } from '../base.service';
import { IEventRepository } from '../../repositories';
import { Event, InsertEvent, EventRegistration } from '@shared/schema';
import { container, TYPES } from '../container';
import { DuplicateResourceError, ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface IEventService {
  getEventById(id: string): Promise<Event>;
  getAllEvents(upcoming?: boolean): Promise<Event[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  registerForEvent(eventId: string, userId: string): Promise<EventRegistration>;
  unregisterFromEvent(eventId: string, userId: string): Promise<boolean>;
  getUserRegistrations(userId: string): Promise<EventRegistration[]>;
}

export class EventService extends BaseService implements IEventService {
  constructor(
    private eventRepository: IEventRepository = container.get<IEventRepository>(TYPES.IEventRepository)
  ) {
    super();
  }

  async getEventById(id: string): Promise<Event> {
    try {
      const event = await this.eventRepository.findById(id);
      return event;
    } catch (error) {
      return this.handleError(error, 'EventService.getEventById');
    }
  }

  async getAllEvents(upcoming?: boolean): Promise<Event[]> {
    try {
      if (upcoming) {
        return await this.eventRepository.findUpcoming();
      }
      return await this.eventRepository.findAll();
    } catch (error) {
      return this.handleError(error, 'EventService.getAllEvents');
    }
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    try {
      this.validateRequired(data, ['title', 'startDate', 'endDate', 'organizerId']);

      const errors: Record<string, string> = {};

      const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, 'Event title');
      if (!titleValidation.valid) {
        errors.title = titleValidation.error!;
      }

      if (data.description) {
        const descValidation = CommonValidators.validateStringLength(data.description, 1, 5000, 'Event description');
        if (!descValidation.valid) {
          errors.description = descValidation.error!;
        }
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      const futureValidation = CommonValidators.validateFutureDate(startDate);
      if (!futureValidation.valid) {
        errors.startDate = futureValidation.error!;
      }

      const dateRangeValidation = CommonValidators.validateDateRange(startDate, endDate);
      if (!dateRangeValidation.valid) {
        errors.dateRange = dateRangeValidation.error!;
      }

      const organizerIdValidation = CommonValidators.validateUUID(data.organizerId, 'Organizer ID');
      if (!organizerIdValidation.valid) {
        errors.organizerId = organizerIdValidation.error!;
      }

      if (data.maxAttendees !== undefined && data.maxAttendees !== null) {
        const maxAttendeesValidation = CommonValidators.validatePositiveNumber(data.maxAttendees, 'Max attendees');
        if (!maxAttendeesValidation.valid) {
          errors.maxAttendees = maxAttendeesValidation.error!;
        }
      }

      if (data.meetingLink) {
        const urlValidation = CommonValidators.validateUrl(data.meetingLink);
        if (!urlValidation.valid) {
          errors.meetingLink = urlValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Event', errors);
      }

      return await this.eventRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'EventService.createEvent');
    }
  }

  async registerForEvent(eventId: string, userId: string): Promise<EventRegistration> {
    try {
      const errors: Record<string, string> = {};

      const eventIdValidation = CommonValidators.validateUUID(eventId, 'Event ID');
      if (!eventIdValidation.valid) {
        errors.eventId = eventIdValidation.error!;
      }

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Event Registration', errors);
      }

      const isRegistered = await this.eventRepository.isUserRegistered(eventId, userId);
      if (isRegistered) {
        throw new DuplicateResourceError('Event Registration', 'user', userId);
      }

      const event = await this.eventRepository.findById(eventId);
      if (event.maxAttendees && event.currentAttendees) {
        BusinessRuleValidators.validateEventCapacity(event.currentAttendees, event.maxAttendees);
      }

      return await this.eventRepository.registerUser(eventId, userId);
    } catch (error) {
      return this.handleError(error, 'EventService.registerForEvent');
    }
  }

  async unregisterFromEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      return await this.eventRepository.unregisterUser(eventId, userId);
    } catch (error) {
      return this.handleError(error, 'EventService.unregisterFromEvent');
    }
  }

  async getUserRegistrations(userId: string): Promise<EventRegistration[]> {
    try {
      return await this.eventRepository.getUserRegistrations(userId);
    } catch (error) {
      return this.handleError(error, 'EventService.getUserRegistrations');
    }
  }
}

export const eventService = new EventService();
