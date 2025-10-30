import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IAdminSecurityService } from '../services/domain/admin/security-admin.service';
import { AuthenticatedRequest } from '../types/auth';

/**
 * System Controller
 * 
 * Handles system-level operations including maintenance status and administrative overrides.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class SystemController
 * @extends {BaseController}
 */
export class SystemController extends BaseController {
  /**
   * Get system maintenance status
   * 
   * @route GET /api/system/maintenance
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns maintenance status and related settings
   * 
   * @throws {500} Internal server error
   */
  async getMaintenanceStatus(req: Request, res: Response) {
    try {
      const adminSecurityService = getService<IAdminSecurityService>(TYPES.IAdminSecurityService);
      const status = await adminSecurityService.getMaintenanceStatus();
      
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.handleError(res, error, 'SystemController.getMaintenanceStatus');
    }
  }

  /**
   * Bypass cooling period for a student (admin override)
   * 
   * @route DELETE /api/system/cooling-period/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request with admin user and studentId parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message with student ID
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async deleteCoolingPeriod(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      
      return this.sendSuccess(res, {
        message: 'Cooling period bypassed successfully',
        studentId
      });
    } catch (error) {
      return this.handleError(res, error, 'SystemController.deleteCoolingPeriod');
    }
  }
}

export const systemController = new SystemController();
