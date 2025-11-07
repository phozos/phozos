/**
 * Feature Access Middleware
 * 
 * Provides middleware functions to protect routes based on feature entitlements
 * Uses the FeatureEntitlementService to check access
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { container, TYPES } from '../services/container';
import { IFeatureEntitlementService } from '../types/feature-types';
import { QuotaType } from '../types/feature-types';

/**
 * Middleware to require a specific feature
 * Blocks request if user lacks the feature
 * 
 * @param featureName - Name of the required feature
 * @returns Express middleware function
 * 
 * @example
 * router.post('/visa-support', requireFeature('includeVisaSupport'), handler);
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 401
        });
      }

      const featureService = container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
      const accessResult = await featureService.canUseFeature(authReq.user.id, featureName);

      if (!accessResult.allowed) {
        return res.status(403).json({
          success: false,
          error: 'FEATURE_NOT_AVAILABLE',
          message: accessResult.reason || `This feature requires ${featureName}. Please upgrade your plan.`,
          code: 403,
          data: {
            requiredFeature: featureName,
            currentPlan: accessResult.currentPlan || 'Free',
            requiresUpgrade: accessResult.requiresUpgrade,
            upgradeOptions: accessResult.upgradeOptions || []
          }
        });
      }

      // Feature access granted, continue
      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error checking feature access',
        code: 500
      });
    }
  };
}

/**
 * Middleware to require available quota
 * Validates quota availability before allowing request
 * 
 * @param quotaType - Type of quota to check ('universities' or 'countries')
 * @param minimumRequired - Minimum quota required (default: 1)
 * @returns Express middleware function
 * 
 * @example
 * router.post('/shortlist', requireQuota('universities'), handler);
 * router.post('/apply-country', requireQuota('countries', 1), handler);
 */
export function requireQuota(quotaType: QuotaType, minimumRequired: number = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 401
        });
      }

      const featureService = container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
      const quotaInfo = await featureService.getQuotaInfo(authReq.user.id, quotaType);

      if (quotaInfo.remaining < minimumRequired) {
        return res.status(403).json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: `You have reached your ${quotaType} limit. Please upgrade your plan.`,
          code: 403,
          data: {
            quotaType,
            limit: quotaInfo.limit,
            used: quotaInfo.used,
            remaining: quotaInfo.remaining,
            required: minimumRequired,
            requiresUpgrade: true
          }
        });
      }

      // Quota available, continue
      next();
    } catch (error) {
      console.error('Quota check error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error checking quota',
        code: 500
      });
    }
  };
}

/**
 * Middleware to check feature access and add to request context
 * Does not block request, just adds entitlement info to request
 * 
 * @returns Express middleware function
 * 
 * @example
 * router.use(checkFeatureAccess());
 */
export function checkFeatureAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return next();
      }

      const featureService = container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
      const features = await featureService.getEffectiveFeatures(authReq.user.id);

      // Add to request context
      (authReq as any).features = features;
      (authReq as any).hasFeature = (featureName: string) => {
        return featureService.hasFeatureAccess(authReq.user!.id, featureName);
      };

      next();
    } catch (error) {
      console.error('Feature access context error:', error);
      next(); // Continue even on error
    }
  };
}

/**
 * Middleware to require ANY of the specified features
 * Allows if user has at least one of the features
 * 
 * @param features - Array of feature names
 * @returns Express middleware function
 * 
 * @example
 * router.post('/support', requireAnyFeature(['includeVisaSupport', 'includeLoanAssistance']), handler);
 */
export function requireAnyFeature(features: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 401
        });
      }

      const featureService = container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
      const featureChecks = await featureService.checkFeatures(authReq.user.id, features);

      const hasAnyFeature = Object.values(featureChecks).some(hasAccess => hasAccess);

      if (!hasAnyFeature) {
        return res.status(403).json({
          success: false,
          error: 'FEATURE_NOT_AVAILABLE',
          message: `This action requires one of the following features: ${features.join(', ')}. Please upgrade your plan.`,
          code: 403,
          data: {
            requiredFeatures: features,
            requiresUpgrade: true
          }
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error checking feature access',
        code: 500
      });
    }
  };
}

/**
 * Middleware to require ALL of the specified features
 * Blocks if user lacks any of the features
 * 
 * @param features - Array of feature names
 * @returns Express middleware function
 * 
 * @example
 * router.post('/premium-package', requireAllFeatures(['includeCounselorSession', 'includeExpertEditing']), handler);
 */
export function requireAllFeatures(features: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 401
        });
      }

      const featureService = container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
      const featureChecks = await featureService.checkFeatures(authReq.user.id, features);

      const missingFeatures = Object.entries(featureChecks)
        .filter(([_, hasAccess]) => !hasAccess)
        .map(([featureName]) => featureName);

      if (missingFeatures.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'FEATURE_NOT_AVAILABLE',
          message: `This action requires all of the following features: ${features.join(', ')}. Missing: ${missingFeatures.join(', ')}.`,
          code: 403,
          data: {
            requiredFeatures: features,
            missingFeatures,
            requiresUpgrade: true
          }
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error checking feature access',
        code: 500
      });
    }
  };
}
