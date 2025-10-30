import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { INotificationService } from '../services/domain/notification.service';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Notification Controller
 * 
 * Handles user notification operations including retrieval, read status updates, and unread count.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class NotificationController
 * @extends {BaseController}
 */
export class NotificationController extends BaseController {
  /**
   * Get all notifications for the authenticated user
   * 
   * @route GET /api/notifications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's notifications
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const notificationService = getService<INotificationService>(TYPES.INotificationService);
      const notifications = await notificationService.getUserNotifications(userId);
      return this.sendSuccess(res, notifications);
    } catch (error) {
      return this.handleError(res, error, 'NotificationController.getNotifications');
    }
  }

  /**
   * Mark a notification as read
   * 
   * @route PUT /api/notifications/:id/read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and notification ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateReadStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const notificationService = getService<INotificationService>(TYPES.INotificationService);
      const success = await notificationService.markAsRead(id);
      return this.sendSuccess(res, { success });
    } catch (error) {
      return this.handleError(res, error, 'NotificationController.updateReadStatus');
    }
  }

  /**
   * Get unread notification count for the authenticated user
   * 
   * @route GET /api/notifications/unread-count
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns unread notification count
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const notificationService = getService<INotificationService>(TYPES.INotificationService);
      const count = await notificationService.getUnreadCount(userId);
      return this.sendSuccess(res, { count });
    } catch (error) {
      return this.handleError(res, error, 'NotificationController.getUnreadCount');
    }
  }
}

export const notificationController = new NotificationController();
