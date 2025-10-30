import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventService } from '../event.service';
import { eventRepository } from '../../../repositories/event.repository';
import { userRepository } from '../../../repositories/user.repository';

describe('EventService', () => {
  let eventService: EventService;
  let testEventIds: string[] = [];
  let testUserIds: string[] = [];
  let testOrganizerIds: string[] = [];

  beforeEach(() => {
    eventService = new EventService();
  });

  afterEach(async () => {
    for (const eventId of testEventIds) {
      try {
        await eventRepository.delete(eventId);
      } catch (error) {
        console.log('Event cleanup failed:', error);
      }
    }
    testEventIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];

    for (const organizerId of testOrganizerIds) {
      try {
        await userRepository.delete(organizerId);
      } catch (error) {
        console.log('Organizer cleanup failed:', error);
      }
    }
    testOrganizerIds = [];
  });

  describe('getEventById', () => {
    it('should return event by id', async () => {
      const organizer = await userRepository.create({
        email: `event-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Event',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const event = await eventRepository.create({
        title: 'University Fair',
        description: 'Annual fair',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event.id);

      const result = await eventService.getEventById(event.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(event.id);
      expect(result.title).toBe('University Fair');
    });

    it('should throw error if event not found', async () => {
      await expect(
        eventService.getEventById('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('getAllEvents', () => {
    it('should return all events when upcoming is false', async () => {
      const organizer = await userRepository.create({
        email: `event-all-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'All',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const event1 = await eventRepository.create({
        title: 'Event 1',
        description: 'Description 1',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        organizerId: organizer.id
      });
      testEventIds.push(event1.id);

      const event2 = await eventRepository.create({
        title: 'Event 2',
        description: 'Description 2',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event2.id);

      const result = await eventService.getAllEvents(false);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(e => e.id === event1.id)).toBe(true);
      expect(result.some(e => e.id === event2.id)).toBe(true);
    });

    it('should return only upcoming events when upcoming is true', async () => {
      const organizer = await userRepository.create({
        email: `event-upcoming-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Upcoming',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const pastEvent = await eventRepository.create({
        title: 'Past Event',
        description: 'Past description',
        startDate: new Date(Date.now() - 172800000),
        endDate: new Date(Date.now() - 86400000),
        organizerId: organizer.id
      });
      testEventIds.push(pastEvent.id);

      const upcomingEvent = await eventRepository.create({
        title: 'Upcoming Event',
        description: 'Upcoming description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(upcomingEvent.id);

      const result = await eventService.getAllEvents(true);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(e => e.id === upcomingEvent.id)).toBe(true);
    });

    it('should handle errors when fetching events', async () => {
      const result = await eventService.getAllEvents(false);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const organizer = await userRepository.create({
        email: `event-create-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Create',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const eventData = {
        title: 'New Event',
        description: 'Description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      };

      const result = await eventService.createEvent(eventData as any);
      testEventIds.push(result.id);

      expect(result).toBeDefined();
      expect(result.title).toBe('New Event');
      expect(result.description).toBe('Description');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        eventService.createEvent({} as any)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('registerForEvent', () => {
    it('should register user for event successfully', async () => {
      const organizer = await userRepository.create({
        email: `event-reg-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Reg',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const user = await userRepository.create({
        email: `event-reg-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Event',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const event = await eventRepository.create({
        title: 'Registration Event',
        description: 'Description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event.id);

      const result = await eventService.registerForEvent(event.id, user.id);

      expect(result).toBeDefined();
      expect(result.eventId).toBe(event.id);
      expect(result.userId).toBe(user.id);
    });

    it('should throw error if already registered', async () => {
      const organizer = await userRepository.create({
        email: `event-dup-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Dup',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const user = await userRepository.create({
        email: `event-duplicate-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Duplicate',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const event = await eventRepository.create({
        title: 'Duplicate Registration Event',
        description: 'Description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event.id);

      await eventRepository.registerUser(event.id, user.id);

      await expect(
        eventService.registerForEvent(event.id, user.id)
      ).rejects.toThrow('ALREADY_REGISTERED');
    });
  });

  describe('unregisterFromEvent', () => {
    it('should unregister user from event', async () => {
      const organizer = await userRepository.create({
        email: `event-unreg-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Unreg',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const user = await userRepository.create({
        email: `event-unreg-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Unregister',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const event = await eventRepository.create({
        title: 'Unregistration Event',
        description: 'Description',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event.id);

      await eventRepository.registerUser(event.id, user.id);

      const result = await eventService.unregisterFromEvent(event.id, user.id);

      expect(result).toBe(true);
      const isRegistered = await eventRepository.isUserRegistered(event.id, user.id);
      expect(isRegistered).toBe(false);
    });

    it('should return false when unregistering from non-existent event', async () => {
      const result = await eventService.unregisterFromEvent('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
      expect(result).toBe(false);
    });
  });

  describe('getUserRegistrations', () => {
    it('should return user event registrations', async () => {
      const organizer = await userRepository.create({
        email: `event-getreg-organizer-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'GetReg',
        lastName: 'Organizer'
      });
      testOrganizerIds.push(organizer.id);

      const user = await userRepository.create({
        email: `event-getreg-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'GetReg',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const event1 = await eventRepository.create({
        title: 'Event 1',
        description: 'Description 1',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        organizerId: organizer.id
      });
      testEventIds.push(event1.id);

      const event2 = await eventRepository.create({
        title: 'Event 2',
        description: 'Description 2',
        startDate: new Date(Date.now() + 259200000),
        endDate: new Date(Date.now() + 345600000),
        organizerId: organizer.id
      });
      testEventIds.push(event2.id);

      await eventRepository.registerUser(event1.id, user.id);
      await eventRepository.registerUser(event2.id, user.id);

      const result = await eventService.getUserRegistrations(user.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(r => r.eventId === event1.id)).toBe(true);
      expect(result.some(r => r.eventId === event2.id)).toBe(true);
    });

    it('should return empty array when fetching registrations for non-existent user', async () => {
      const result = await eventService.getUserRegistrations('00000000-0000-0000-0000-000000000001');
      expect(result).toEqual([]);
    });
  });
});
