/**
 * Feature Access Middleware Tests
 * 
 * Comprehensive tests for feature access middleware including:
 * - requireFeature middleware
 * - requireQuota middleware
 * - checkFeatureAccess middleware
 * - requireAnyFeature middleware
 * - requireAllFeatures middleware
 * - Error responses with upgrade URLs
 * - Feature entitlement attachment to request
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requireFeature,
  requireQuota,
  checkFeatureAccess,
  requireAnyFeature,
  requireAllFeatures
} from '../feature-access.middleware';
import { container, TYPES } from '../../services/container';
import type { IFeatureEntitlementService } from '../../types/feature-types';

// Mock container
vi.mock('../../services/container', () => ({
  container: {
    get: vi.fn()
  },
  TYPES: {
    IFeatureEntitlementService: Symbol.for('IFeatureEntitlementService')
  }
}));

describe('Feature Access Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockFeatureService: Partial<IFeatureEntitlementService>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock request
    mockReq = {
      user: {
        id: 'user-123',
        email: 'test@example.com'
      } as any
    };

    // Mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Mock next
    mockNext = vi.fn();

    // Mock feature service
    mockFeatureService = {
      canUseFeature: vi.fn(),
      getQuotaInfo: vi.fn(),
      getEffectiveFeatures: vi.fn(),
      checkFeatures: vi.fn(),
      hasFeatureAccess: vi.fn()
    };

    // Mock container.get
    (container.get as any).mockReturnValue(mockFeatureService);
  });

  describe('requireFeature', () => {
    it('should allow access when user has the feature', async () => {
      mockFeatureService.canUseFeature = vi.fn().mockResolvedValue({
        allowed: true
      });

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFeatureService.canUseFeature).toHaveBeenCalledWith(
        'user-123',
        'includeLoanAssistance'
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block access when user lacks the feature', async () => {
      mockFeatureService.canUseFeature = vi.fn().mockResolvedValue({
        allowed: false,
        reason: 'This feature requires a premium plan',
        requiresUpgrade: true,
        currentPlan: 'Free',
        upgradeOptions: ['Premium', 'Elite']
      });

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'FEATURE_NOT_AVAILABLE',
          message: expect.stringContaining('This feature requires'),
          code: 403,
          data: expect.objectContaining({
            requiredFeature: 'includeLoanAssistance',
            currentPlan: 'Free',
            requiresUpgrade: true,
            upgradeOptions: ['Premium', 'Elite'],
            upgradeUrl: expect.stringContaining('/plans?feature='),
            helpText: expect.any(String)
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach feature entitlement to request on success', async () => {
      mockFeatureService.canUseFeature = vi.fn().mockResolvedValue({
        allowed: true
      });

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).featureEntitlement).toEqual({
        includeLoanAssistance: true
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockFeatureService.canUseFeature = vi.fn().mockRejectedValue(
        new Error('Service error')
      );

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'Error checking feature access'
        })
      );
    });
  });

  describe('requireQuota', () => {
    it('should allow access when user has available quota', async () => {
      mockFeatureService.getQuotaInfo = vi.fn().mockResolvedValue({
        quotaType: 'universities',
        limit: 10,
        used: 5,
        remaining: 5,
        isUnlimited: false
      });

      const middleware = requireQuota('universities', 1);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFeatureService.getQuotaInfo).toHaveBeenCalledWith(
        'user-123',
        'universities'
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block access when quota is exceeded', async () => {
      mockFeatureService.getQuotaInfo = vi.fn().mockResolvedValue({
        quotaType: 'universities',
        limit: 10,
        used: 10,
        remaining: 0,
        isUnlimited: false
      });

      const middleware = requireQuota('universities', 1);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: expect.stringContaining('reached your universities limit'),
          code: 403,
          data: expect.objectContaining({
            quotaType: 'universities',
            limit: 10,
            used: 10,
            remaining: 0,
            required: 1,
            requiresUpgrade: true,
            upgradeUrl: expect.stringContaining('/plans?quota='),
            helpText: expect.any(String)
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check minimum required quota correctly', async () => {
      mockFeatureService.getQuotaInfo = vi.fn().mockResolvedValue({
        quotaType: 'universities',
        limit: 10,
        used: 8,
        remaining: 2,
        isUnlimited: false
      });

      const middleware = requireQuota('universities', 3);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow unlimited quota users', async () => {
      mockFeatureService.getQuotaInfo = vi.fn().mockResolvedValue({
        quotaType: 'universities',
        limit: 999,
        used: 100,
        remaining: 899,
        isUnlimited: true
      });

      const middleware = requireQuota('universities', 1);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkFeatureAccess', () => {
    it('should add features to request context', async () => {
      const mockFeatures = {
        features: ['Feature A', 'Feature B'],
        includeLoanAssistance: true,
        includeVisaSupport: false,
        maxUniversities: 10,
        planName: 'Premium',
        planId: 'plan-123',
        tierLevel: 2,
        isLifetime: true
      };

      mockFeatureService.getEffectiveFeatures = vi.fn().mockResolvedValue(mockFeatures);
      mockFeatureService.hasFeatureAccess = vi.fn();

      const middleware = checkFeatureAccess();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).features).toEqual(mockFeatures);
      expect((mockReq as any).hasFeature).toBeInstanceOf(Function);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even when user is not authenticated', async () => {
      mockReq.user = undefined;

      const middleware = checkFeatureAccess();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).features).toBeUndefined();
    });

    it('should continue even on service error', async () => {
      mockFeatureService.getEffectiveFeatures = vi.fn().mockRejectedValue(
        new Error('Service error')
      );

      const middleware = checkFeatureAccess();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAnyFeature', () => {
    it('should allow access when user has any of the features', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: false,
        includeLoanAssistance: true,
        includeCounselorSession: false
      });

      const middleware = requireAnyFeature([
        'includeVisaSupport',
        'includeLoanAssistance',
        'includeCounselorSession'
      ]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block access when user has none of the features', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: false,
        includeLoanAssistance: false,
        includeCounselorSession: false
      });

      const middleware = requireAnyFeature([
        'includeVisaSupport',
        'includeLoanAssistance',
        'includeCounselorSession'
      ]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FEATURE_NOT_AVAILABLE',
          message: expect.stringContaining('requires at least one'),
          data: expect.objectContaining({
            requiredFeatures: expect.arrayContaining([
              'includeVisaSupport',
              'includeLoanAssistance',
              'includeCounselorSession'
            ]),
            upgradeUrl: expect.any(String)
          })
        })
      );
    });

    it('should attach anyOf entitlement to request', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: true,
        includeLoanAssistance: false
      });

      const features = ['includeVisaSupport', 'includeLoanAssistance'];
      const middleware = requireAnyFeature(features);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).featureEntitlement).toEqual({
        anyOf: features
      });
    });
  });

  describe('requireAllFeatures', () => {
    it('should allow access when user has all features', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: true,
        includeLoanAssistance: true,
        includeCounselorSession: true
      });

      const middleware = requireAllFeatures([
        'includeVisaSupport',
        'includeLoanAssistance',
        'includeCounselorSession'
      ]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block access when user lacks some features', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: true,
        includeLoanAssistance: false,
        includeCounselorSession: true
      });

      const middleware = requireAllFeatures([
        'includeVisaSupport',
        'includeLoanAssistance',
        'includeCounselorSession'
      ]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FEATURE_NOT_AVAILABLE',
          message: expect.stringContaining('requires all of the following features'),
          data: expect.objectContaining({
            requiredFeatures: expect.any(Array),
            missingFeatures: ['includeLoanAssistance'],
            upgradeUrl: expect.any(String)
          })
        })
      );
    });

    it('should attach allOf entitlement to request', async () => {
      mockFeatureService.checkFeatures = vi.fn().mockResolvedValue({
        includeVisaSupport: true,
        includeLoanAssistance: true
      });

      const features = ['includeVisaSupport', 'includeLoanAssistance'];
      const middleware = requireAllFeatures(features);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).featureEntitlement).toEqual({
        allOf: features
      });
    });
  });

  describe('Error Response Format', () => {
    it('should include upgrade URL in all error responses', async () => {
      mockFeatureService.canUseFeature = vi.fn().mockResolvedValue({
        allowed: false,
        requiresUpgrade: true
      });

      const middleware = requireFeature('includeLoanAssistance');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = (mockRes.json as any).mock.calls[0][0];
      expect(responseData.data.upgradeUrl).toMatch(/^\/plans\?feature=/);
    });

    it('should include helpful text in error responses', async () => {
      mockFeatureService.getQuotaInfo = vi.fn().mockResolvedValue({
        quotaType: 'universities',
        limit: 5,
        used: 5,
        remaining: 0,
        isUnlimited: false
      });

      const middleware = requireQuota('universities');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = (mockRes.json as any).mock.calls[0][0];
      expect(responseData.data.helpText).toContain('Upgrade your plan');
    });
  });
});
