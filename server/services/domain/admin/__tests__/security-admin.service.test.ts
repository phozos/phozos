import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminSecurityService } from '../security-admin.service';
import { securitySettingsRepository } from '../../../../repositories/security-settings.repository';

describe('AdminSecurityService', () => {
  let adminSecurityService: AdminSecurityService;
  let testSettingIds: string[] = [];

  beforeEach(() => {
    adminSecurityService = new AdminSecurityService();
  });

  afterEach(async () => {
    for (const id of testSettingIds) {
      try {
        await securitySettingsRepository.delete(id);
      } catch (error) {
        console.log('Security setting cleanup failed:', error);
      }
    }
    testSettingIds = [];
  });

  describe('getSecuritySettings', () => {
    it('should return all security settings', async () => {
      const settings = await adminSecurityService.getSecuritySettings();
      expect(Array.isArray(settings)).toBe(true);
    });
  });

  describe('updateSecuritySetting', () => {
    it('should update a security setting', async () => {
      const setting = await securitySettingsRepository.create({
        settingKey: `test_setting_${Date.now()}`,
        settingValue: 'false',
        updatedBy: 'test-admin'
      });
      testSettingIds.push(setting.id);

      const updated = await adminSecurityService.updateSecuritySetting(
        setting.settingKey,
        'true',
        'test-admin'
      );

      expect(updated.settingValue).toBe('true');
    });
  });
});
