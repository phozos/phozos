import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { paymentRepository } from '../payment.repository';
import { userRepository } from '../user.repository';

describe('PaymentRepository', () => {
  let testSettingIds: string[] = [];
  let testAdminId: string;

  beforeEach(async () => {
    // Create test admin user
    const admin = await userRepository.create({
      email: `payment-admin-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'team_member',
      firstName: 'Payment',
      lastName: 'Admin'
    });
    testAdminId = admin.id;
  });

  afterEach(async () => {
    // Cleanup
    for (const settingId of testSettingIds) {
      try {
        await paymentRepository.delete(settingId);
      } catch (error) {
        console.log('Payment setting cleanup failed:', error);
      }
    }
    testSettingIds = [];

    // Cleanup admin user
    if (testAdminId) {
      try {
        await userRepository.delete(testAdminId);
      } catch (error) {
        console.log('Admin cleanup failed:', error);
      }
    }
  });

  describe('create and findById', () => {
    it('should create and retrieve a payment setting', async () => {
      const setting = await paymentRepository.create({
        gateway: `stripe-${Date.now()}`,
        configuration: { apiKey: 'test-key' },
        updatedBy: testAdminId,
        isActive: false
      });
      testSettingIds.push(setting.id);

      expect(setting.id).toBeDefined();
      expect(setting.gateway).toContain('stripe');

      const found = await paymentRepository.findById(setting.id);
      expect(found).toBeDefined();
      expect(found?.gateway).toBe(setting.gateway);
    });
  });

  describe('findByGateway', () => {
    it('should find payment setting by gateway name', async () => {
      const gatewayName = `paypal-${Date.now()}`;
      const setting = await paymentRepository.create({
        gateway: gatewayName,
        configuration: { clientId: 'test-client' },
        updatedBy: testAdminId,
        isActive: true
      });
      testSettingIds.push(setting.id);

      const found = await paymentRepository.findByGateway(gatewayName);
      expect(found).toBeDefined();
      expect(found?.gateway).toBe(gatewayName);
      expect(found?.isActive).toBe(true);
    });

    it('should return undefined for non-existent gateway', async () => {
      const found = await paymentRepository.findByGateway('non-existent-gateway');
      expect(found).toBeUndefined();
    });
  });

  describe('findActive', () => {
    it('should return only active payment settings', async () => {
      const activeSetting = await paymentRepository.create({
        gateway: `stripe-active-${Date.now()}`,
        configuration: { key: 'active' },
        updatedBy: testAdminId,
        isActive: true
      });
      testSettingIds.push(activeSetting.id);

      const inactiveSetting = await paymentRepository.create({
        gateway: `stripe-inactive-${Date.now()}`,
        configuration: { key: 'inactive' },
        updatedBy: testAdminId,
        isActive: false
      });
      testSettingIds.push(inactiveSetting.id);

      const activeSettings = await paymentRepository.findActive();
      const activeGateways = activeSettings.map(s => s.gateway);
      
      expect(activeGateways).toContain(activeSetting.gateway);
      expect(activeGateways).not.toContain(inactiveSetting.gateway);
    });
  });

  describe('updateByGateway', () => {
    it('should update payment setting by gateway name', async () => {
      const gatewayName = `stripe-update-${Date.now()}`;
      const setting = await paymentRepository.create({
        gateway: gatewayName,
        configuration: { key: 'original' },
        updatedBy: testAdminId,
        isActive: false
      });
      testSettingIds.push(setting.id);

      const updated = await paymentRepository.updateByGateway(gatewayName, {
        configuration: { key: 'updated' },
        isActive: true,
        updatedBy: testAdminId
      });

      expect(updated).toBeDefined();
      expect(updated?.isActive).toBe(true);
      expect(updated?.configuration).toEqual({ key: 'updated' });
      expect(updated?.updatedBy).toBe(testAdminId);
    });
  });

  describe('findAll', () => {
    it('should find all payment settings', async () => {
      const setting = await paymentRepository.create({
        gateway: `findall-gateway-${Date.now()}`,
        configuration: { key: 'value' },
        updatedBy: testAdminId,
        isActive: true
      });
      testSettingIds.push(setting.id);

      const settings = await paymentRepository.findAll();
      expect(Array.isArray(settings)).toBe(true);
      expect(settings.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update payment setting by ID', async () => {
      const setting = await paymentRepository.create({
        gateway: `update-gateway-${Date.now()}`,
        configuration: { original: 'value' },
        updatedBy: testAdminId,
        isActive: false
      });
      testSettingIds.push(setting.id);

      const updated = await paymentRepository.update(setting.id, {
        isActive: true,
        configuration: { updated: 'value' }
      });

      expect(updated).toBeDefined();
      expect(updated?.isActive).toBe(true);
      expect(updated?.configuration).toEqual({ updated: 'value' });
    });
  });

  describe('delete', () => {
    it('should delete a payment setting', async () => {
      const setting = await paymentRepository.create({
        gateway: `delete-gateway-${Date.now()}`,
        configuration: { delete: 'me' },
        updatedBy: testAdminId,
        isActive: false
      });

      const deleted = await paymentRepository.delete(setting.id);
      expect(deleted).toBe(true);

      const found = await paymentRepository.findById(setting.id);
      expect(found).toBeUndefined();
    });
  });
});
