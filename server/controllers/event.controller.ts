import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IEventService } from '../services/domain/event.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { insertEventSchema } from '@shared/schema';

/**
 * Event Controller
 * 
 * Handles event management including creation, registration, and user event tracking.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class EventController
 * @extends {BaseController}
 */
export class EventController extends BaseController {
  /**
   * Get all available events
   * 
   * @route GET /api/events
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all events
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const eventService = getService<IEventService>(TYPES.IEventService);
      const events = await eventService.getAllEvents();
      return this.sendSuccess(res, events);
    } catch (error) {
      return this.handleError(res, error, 'EventController.getEvents');
    }
  }

  /**
   * Create a new event
   * 
   * @route POST /api/events
   * @access Protected (Admin only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin user and event data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created event
   * 
   * @example
   * // Request body:
   * {
   *   "title": "University Fair 2025",
   *   "description": "Annual university fair event",
   *   "date": "2025-03-15",
   *   "location": "Main Campus"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const eventService = getService<IEventService>(TYPES.IEventService);
      const event = await eventService.createEvent(validatedData);
      
      res.status(201);
      return this.sendSuccess(res, event);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'EventController.createEvent');
    }
  }

  /**
   * Register the authenticated user for an event
   * 
   * @route POST /api/events/:id/register
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and event ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns registration details
   * 
   * @throws {404} Not found if event doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async registerForEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      
      const eventService = getService<IEventService>(TYPES.IEventService);
      const registration = await eventService.registerForEvent(id, userId);
      return this.sendSuccess(res, registration);
    } catch (error) {
      return this.handleError(res, error, 'EventController.registerForEvent');
    }
  }

  /**
   * Unregister the authenticated user from an event
   * 
   * @route DELETE /api/events/:id/register
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and event ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if registration doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async unregisterFromEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      
      const eventService = getService<IEventService>(TYPES.IEventService);
      const success = await eventService.unregisterFromEvent(id, userId);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Registration not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'EventController.unregisterFromEvent');
    }
  }

  /**
   * Get all event registrations for the authenticated user
   * 
   * @route GET /api/events/my-registrations
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's event registrations
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUserRegistrations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const eventService = getService<IEventService>(TYPES.IEventService);
      const registrations = await eventService.getUserRegistrations(userId);
      return this.sendSuccess(res, registrations);
    } catch (error) {
      return this.handleError(res, error, 'EventController.getUserRegistrations');
    }
  }
}

export const eventController = new EventController();
