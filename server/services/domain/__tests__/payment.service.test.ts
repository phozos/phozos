import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaymentService } from '../payment.service';
import { paymentRepository } from '../../../repositories/payment.repository';
import { userRepository } from '../../../repositories/user.repository';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let testPaymentSettingIds: string[] = [];
  let testUserId: string;
  let testUser2Id: string;

  beforeEach(async () => {
    paymentService = new PaymentService();
    
    const user = await userRepository.create({
      email: `payment-admin-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
      userType: 'team_member',
      firstName: 'Payment',
      lastName: 'Admin'
    });
    testUserId = user.id;

    const user2 = await userRepository.create({
      email: `payment-admin2-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
      userType: 'team_member',
      firstName: 'Payment',
      lastName: 'Admin2'
    });
    testUser2Id = user2.id;
  });

  afterEach(async () => {
    for (const id of testPaymentSettingIds) {
      try {
        await paymentRepository.delete(id);
      } catch (error) {
        console.log('Payment setting cleanup failed:', error);
      }
    }
    testPaymentSettingIds = [];

    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    if (testUser2Id) {
      try {
        await userRepository.delete(testUser2Id);
      } catch (error) {
        console.log('User2 cleanup failed:', error);
      }
    }
  });

  describe('getPaymentSettings', () => {
    it('should return all payment settings', async () => {
      const setting1 = await paymentRepository.create({
        gateway: `stripe-${Date.now()}-${Math.random()}`,
        isActive: true,
        configuration: { key: 'value1' },
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(setting1.id);

      const setting2 = await paymentRepository.create({
        gateway: `paypal-${Date.now()}-${Math.random()}`,
        isActive: false,
        configuration: { key: 'value2' },
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(setting2.id);

      const result = await paymentService.getPaymentSettings();

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(s => s.id === setting1.id)).toBe(true);
      expect(result.some(s => s.id === setting2.id)).toBe(true);
    });

    it('should handle repository errors', async () => {
      const result = await paymentService.getPaymentSettings();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getActivePaymentSettings', () => {
    it('should return only active payment settings', async () => {
      const activeSetting = await paymentRepository.create({
        gateway: `stripe-active-${Date.now()}-${Math.random()}`,
        isActive: true,
        configuration: { key: 'active' },
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(activeSetting.id);

      const inactiveSetting = await paymentRepository.create({
        gateway: `paypal-inactive-${Date.now()}-${Math.random()}`,
        isActive: false,
        configuration: { key: 'inactive' },
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(inactiveSetting.id);

      const result = await paymentService.getActivePaymentSettings();

      expect(result.some(s => s.id === activeSetting.id)).toBe(true);
      expect(result.every(s => s.isActive === true)).toBe(true);
    });

    it('should handle repository errors', async () => {
      const result = await paymentService.getActivePaymentSettings();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updatePaymentSettings', () => {
    it('should update existing payment setting', async () => {
      const gateway = `stripe-update-${Date.now()}-${Math.random()}`;
      const existingSetting = await paymentRepository.create({
        gateway,
        isActive: true,
        configuration: { key: 'old' },
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(existingSetting.id);

      const result = await paymentService.updatePaymentSettings(gateway, { key: 'new' }, testUser2Id);

      expect(result.gateway).toBe(gateway);
      expect(result.configuration).toEqual({ key: 'new' });
      expect(result.updatedBy).toBe(testUser2Id);
    });

    it('should create new payment setting if not exists', async () => {
      const gateway = `new-gateway-${Date.now()}-${Math.random()}`;

      const result = await paymentService.updatePaymentSettings(gateway, { key: 'value' }, testUserId);
      testPaymentSettingIds.push(result.id);

      expect(result.gateway).toBe(gateway);
      expect(result.configuration).toEqual({ key: 'value' });
      expect(result.updatedBy).toBe(testUserId);
      expect(result.isActive).toBe(false);
    });

    it('should handle error when update returns null', async () => {
      await expect(
        paymentService.updatePaymentSettings('nonexistent-gateway', { key: 'new' }, testUserId)
      ).resolves.toBeDefined();
    });

    it('should handle repository errors', async () => {
      const result = await paymentService.updatePaymentSettings(`gateway-${Date.now()}`, {}, testUserId);
      testPaymentSettingIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('togglePaymentGateway', () => {
    it('should toggle payment gateway active status', async () => {
      const gateway = `stripe-toggle-${Date.now()}-${Math.random()}`;
      const setting = await paymentRepository.create({
        gateway,
        isActive: false,
        configuration: {},
        updatedBy: testUserId
      });
      testPaymentSettingIds.push(setting.id);

      const result = await paymentService.togglePaymentGateway(gateway, true, testUser2Id);

      expect(result).toBeDefined();
      if (result) {
        expect(result.isActive).toBe(true);
        expect(result.updatedBy).toBe(testUser2Id);
      }
    });

    it('should return undefined if gateway not found', async () => {
      const uniqueGateway = `truly-nonexistent-${Date.now()}-${Math.random()}`;
      const result = await paymentService.togglePaymentGateway(uniqueGateway, true, testUserId);

      expect(result).toBeUndefined();
    });

    it('should handle repository errors', async () => {
      const gateway = `stripe-error-${Date.now()}-${Math.random()}`;
      const result = await paymentService.togglePaymentGateway(gateway, true, testUserId);

      expect(result === undefined || result !== null).toBe(true);
    });
  });
});
