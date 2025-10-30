import { describe, it, expect, afterEach } from 'vitest';
import { eventRepository } from '../event.repository';
import { userRepository } from '../user.repository';
import { db } from '../../db';
import { eventRegistrations } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('EventRepository', () => {
  let testEventId: string;
  let testUserId: string;
  let testUserIds: string[] = [];

  afterEach(async () => {
    // Cleanup order is critical due to foreign keys:
    // 1. Delete event_registrations first
    // 2. Then delete events
    // 3. Finally delete users
    
    if (testEventId) {
      try {
        // Delete all event registrations for this event
        await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, testEventId));
        // Now delete the event
        await eventRepository.delete(testEventId);
      } catch (error) {
        console.log('Event cleanup failed:', error);
      }
    }
    
    // Clean up all test users
    const allUserIds = [testUserId, ...testUserIds].filter(Boolean);
    for (const userId of allUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log(`User cleanup failed for ${userId}:`, error);
      }
    }
    
    // Reset for next test
    testUserIds = [];
  });

  describe('create', () => {
    it('should create an event', async () => {
      const user = await userRepository.create({
        email: `organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Organizer',
        lastName: 'User'
      });
      testUserId = user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Test Event ${Date.now()}`,
        description: 'Test event description',
        startDate: startDate,
        endDate: endDate,
        location: 'Online',
        eventType: 'webinar',
        maxAttendees: 100,
        organizerId: user.id
      });
      testEventId = event.id;

      expect(event.id).toBeDefined();
      expect(event.title).toContain('Test Event');
      expect(event.location).toBe('Online');
      expect(event.maxAttendees).toBe(100);
    });
  });

  describe('findById', () => {
    it('should find event by ID', async () => {
      const user = await userRepository.create({
        email: `find-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Find',
        lastName: 'Organizer'
      });
      testUserId = user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);

      const event = await eventRepository.create({
        title: `Find Event ${Date.now()}`,
        description: 'Find this event',
        startDate: startDate,
        endDate: endDate,
        location: 'Conference Hall',
        eventType: 'workshop',
        organizerId: user.id
      });
      testEventId = event.id;

      const found = await eventRepository.findById(event.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(event.id);
      expect(found?.title).toContain('Find Event');
    });
  });

  describe('findUpcoming', () => {
    it('should find upcoming events', async () => {
      const user = await userRepository.create({
        email: `upcoming-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Upcoming',
        lastName: 'Organizer'
      });
      testUserId = user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const event = await eventRepository.create({
        title: `Upcoming Event ${Date.now()}`,
        description: 'Upcoming event',
        startDate: startDate,
        endDate: endDate,
        location: 'Online',
        eventType: 'seminar',
        organizerId: user.id
      });
      testEventId = event.id;

      const upcomingEvents = await eventRepository.findUpcoming();
      expect(upcomingEvents.length).toBeGreaterThan(0);
      expect(upcomingEvents.some(e => e.id === event.id)).toBe(true);
    });
  });

  describe('registerUser', () => {
    it('should register a user for an event', async () => {
      const organizer = await userRepository.create({
        email: `reg-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Reg',
        lastName: 'Organizer'
      });

      const user = await userRepository.create({
        email: `event-user-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Event',
        lastName: 'User'
      });
      testUserId = organizer.id;
      testUserIds.push(user.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Registration Event ${Date.now()}`,
        description: 'Event for registration',
        startDate: startDate,
        endDate: endDate,
        location: 'Virtual',
        eventType: 'webinar',
        organizerId: organizer.id
      });
      testEventId = event.id;

      const registration = await eventRepository.registerUser(event.id, user.id);
      expect(registration).toBeDefined();
      expect(registration.eventId).toBe(event.id);
      expect(registration.userId).toBe(user.id);
    });
  });

  describe('getRegistrations', () => {
    it('should get all registrations for an event', async () => {
      const organizer = await userRepository.create({
        email: `get-reg-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'GetReg',
        lastName: 'Organizer'
      });

      const user = await userRepository.create({
        email: `reg-user-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Reg',
        lastName: 'User'
      });
      testUserId = organizer.id;
      testUserIds.push(user.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 8);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Get Registrations ${Date.now()}`,
        description: 'Event to get registrations',
        startDate: startDate,
        endDate: endDate,
        location: 'Online',
        eventType: 'workshop',
        organizerId: organizer.id
      });
      testEventId = event.id;

      await eventRepository.registerUser(event.id, user.id);

      const registrations = await eventRepository.getRegistrations(event.id);
      expect(registrations.length).toBeGreaterThan(0);
      expect(registrations.some(r => r.userId === user.id)).toBe(true);
    });
  });

  describe('isUserRegistered', () => {
    it('should check if user is registered for an event', async () => {
      const organizer = await userRepository.create({
        email: `check-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'CheckOrg',
        lastName: 'User'
      });

      const user = await userRepository.create({
        email: `check-reg-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Check',
        lastName: 'Reg'
      });
      testUserId = organizer.id;
      testUserIds.push(user.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 6);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Check Registration ${Date.now()}`,
        description: 'Check if registered',
        startDate: startDate,
        endDate: endDate,
        location: 'Virtual',
        eventType: 'seminar',
        organizerId: organizer.id
      });
      testEventId = event.id;

      await eventRepository.registerUser(event.id, user.id);

      const isRegistered = await eventRepository.isUserRegistered(event.id, user.id);
      expect(isRegistered).toBe(true);
    });
  });

  describe('update', () => {
    it('should update event details', async () => {
      const user = await userRepository.create({
        email: `update-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Update',
        lastName: 'Organizer'
      });
      testUserId = user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 12);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Update Event ${Date.now()}`,
        description: 'Original description',
        startDate: startDate,
        endDate: endDate,
        location: 'Original Location',
        eventType: 'workshop',
        organizerId: user.id
      });
      testEventId = event.id;

      const updated = await eventRepository.update(event.id, {
        description: 'Updated description',
        location: 'New Location'
      });

      expect(updated?.description).toBe('Updated description');
      expect(updated?.location).toBe('New Location');
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      const user = await userRepository.create({
        email: `delete-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Delete',
        lastName: 'Organizer'
      });
      testUserId = user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 3);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Delete Event ${Date.now()}`,
        description: 'Will be deleted',
        startDate: startDate,
        endDate: endDate,
        location: 'Anywhere',
        eventType: 'webinar',
        organizerId: user.id
      });

      const deleted = await eventRepository.delete(event.id);
      expect(deleted).toBe(true);

      const found = await eventRepository.findById(event.id);
      expect(found).toBeUndefined();
      testEventId = '';
    });
  });

  describe('getUserRegistrations', () => {
    it('should get all event registrations for a user', async () => {
      const organizer = await userRepository.create({
        email: `user-regs-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'UserRegs',
        lastName: 'Organizer'
      });

      const user = await userRepository.create({
        email: `user-regs-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'User',
        lastName: 'Regs'
      });
      testUserId = organizer.id;
      testUserIds.push(user.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `User Registrations ${Date.now()}`,
        description: 'Event for user registrations',
        startDate: startDate,
        endDate: endDate,
        location: 'Online',
        eventType: 'workshop',
        organizerId: organizer.id
      });
      testEventId = event.id;

      await eventRepository.registerUser(event.id, user.id);

      const registrations = await eventRepository.getUserRegistrations(user.id);
      expect(registrations.length).toBeGreaterThan(0);
      expect(registrations.some(r => r.eventId === event.id)).toBe(true);
    });
  });

  describe('unregisterUser', () => {
    it('should unregister a user from an event', async () => {
      const organizer = await userRepository.create({
        email: `unreg-organizer-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Unreg',
        lastName: 'Organizer'
      });

      const user = await userRepository.create({
        email: `unreg-user-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Unreg',
        lastName: 'User'
      });
      testUserId = organizer.id;
      testUserIds.push(user.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);

      const event = await eventRepository.create({
        title: `Unregister Event ${Date.now()}`,
        description: 'Event to test unregister',
        startDate: startDate,
        endDate: endDate,
        location: 'Virtual',
        eventType: 'seminar',
        organizerId: organizer.id
      });
      testEventId = event.id;

      await eventRepository.registerUser(event.id, user.id);
      
      const isRegistered = await eventRepository.isUserRegistered(event.id, user.id);
      expect(isRegistered).toBe(true);

      const unregistered = await eventRepository.unregisterUser(event.id, user.id);
      expect(unregistered).toBe(true);

      const stillRegistered = await eventRepository.isUserRegistered(event.id, user.id);
      expect(stillRegistered).toBe(false);
    });
  });
});
