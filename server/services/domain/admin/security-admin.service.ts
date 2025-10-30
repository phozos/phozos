import { BaseService } from '../../base.service';
import { ISecuritySettingsRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { ValidationServiceError } from '../../errors';
import { CommonValidators } from '../../validation';

export interface MaintenanceStatus {
  maintenanceMode: boolean;
  message: string;
}

export interface IAdminSecurityService {
  getSecuritySettings(): Promise<any[]>;
  updateSecuritySetting(settingKey: string, settingValue: string, updatedBy: string): Promise<any>;
  getMaintenanceStatus(): Promise<MaintenanceStatus>;
}

export class AdminSecurityService extends BaseService implements IAdminSecurityService {
  constructor(
    private securitySettingsRepository: ISecuritySettingsRepository = container.get<ISecuritySettingsRepository>(TYPES.ISecuritySettingsRepository)
  ) {
    super();
  }

  async getSecuritySettings(): Promise<any[]> {
    try {
      return await this.securitySettingsRepository.getAllSettings();
    } catch (error) {
      return this.handleError(error, 'AdminSecurityService.getSecuritySettings');
    }
  }

  async updateSecuritySetting(settingKey: string, settingValue: string, updatedBy: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const settingKeyValidation = CommonValidators.validateStringLength(settingKey, 1, 100, 'Setting key');
      if (!settingKeyValidation.valid) {
        errors.settingKey = settingKeyValidation.error!;
      }

      const settingValueValidation = CommonValidators.validateStringLength(settingValue, 0, 1000, 'Setting value');
      if (!settingValueValidation.valid) {
        errors.settingValue = settingValueValidation.error!;
      }

      const updatedByValidation = CommonValidators.validateUUID(updatedBy, 'Updated by user ID');
      if (!updatedByValidation.valid) {
        errors.updatedBy = updatedByValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Security Setting', errors);
      }

      return await this.securitySettingsRepository.upsertSetting(settingKey, settingValue, updatedBy);
    } catch (error) {
      return this.handleError(error, 'AdminSecurityService.updateSecuritySetting');
    }
  }

  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const settings = await this.securitySettingsRepository.getAllSettings();
      const maintenanceSetting = settings.find((s: any) => s.settingKey === 'maintenance_mode');
      const isInMaintenance = maintenanceSetting?.settingValue === 'true';
      
      return {
        maintenanceMode: isInMaintenance,
        message: isInMaintenance 
          ? 'Site is currently under maintenance' 
          : 'Site is operational'
      };
    } catch (error) {
      return this.handleError(error, 'AdminSecurityService.getMaintenanceStatus');
    }
  }
}

// Export singleton instance
export const adminSecurityService = new AdminSecurityService();
