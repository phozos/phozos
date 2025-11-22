import { useMemo } from 'react';
import { useUserSubscription } from './useUserSubscription';

/**
 * Feature access hook types
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  upgradeRequired: boolean;
  currentPlan: string | null;
  featureValue: any;
}

/**
 * Hook to check if user has access to a specific feature
 * Uses snapshot-first pattern for grandfathering support
 * 
 * @param featureName - Name of the feature to check (e.g., 'includeLoanAssistance', 'maxUniversities')
 * @returns Feature access information
 * 
 * @example
 * const { hasAccess, upgradeRequired, currentPlan } = useFeatureAccess('includeLoanAssistance');
 * 
 * if (hasAccess) {
 *   return <LoanAssistanceForm />;
 * } else {
 *   return <UpgradePrompt feature="Loan Assistance" />;
 * }
 */
export function useFeatureAccess(featureName: string): FeatureAccessResult {
  const { data: subscriptionData, isLoading } = useUserSubscription();

  const result = useMemo(() => {
    // Loading state
    if (isLoading) {
      return {
        hasAccess: false,
        isLoading: true,
        upgradeRequired: false,
        currentPlan: null,
        featureValue: null
      };
    }

    // No subscription
    if (!subscriptionData) {
      return {
        hasAccess: false,
        isLoading: false,
        upgradeRequired: true,
        currentPlan: 'Free',
        featureValue: null
      };
    }

    const { subscription, plan } = subscriptionData;

    // CRITICAL: Snapshot-first pattern for grandfathering
    // 1. Check if subscription has a snapshot (grandfathered features)
    // 2. If snapshot exists, use it
    // 3. Otherwise, fall back to current live plan
    let effectiveFeatures: any = null;

    if (subscription.subscribedPlanSnapshot) {
      // Use grandfathered snapshot
      effectiveFeatures = subscription.subscribedPlanSnapshot as any;
    } else {
      // Use current live plan
      effectiveFeatures = plan;
    }

    // Extract feature value
    let featureValue: any = null;
    let hasAccess = false;

    if (effectiveFeatures) {
      // Check if it's a direct property (boolean, number, string)
      if (featureName in effectiveFeatures) {
        featureValue = effectiveFeatures[featureName];
        
        // For boolean features
        if (typeof featureValue === 'boolean') {
          hasAccess = featureValue;
        }
        // For numeric features (quotas)
        else if (typeof featureValue === 'number') {
          hasAccess = featureValue > 0;
        }
        // For string features (tiers, types)
        else if (typeof featureValue === 'string') {
          hasAccess = featureValue !== '' && featureValue !== null;
        }
        // For other types
        else {
          hasAccess = !!featureValue;
        }
      }
      // Check if it's in the features array (JSONB features)
      else if (effectiveFeatures.features && Array.isArray(effectiveFeatures.features)) {
        hasAccess = effectiveFeatures.features.includes(featureName);
        featureValue = hasAccess;
      }
    }

    return {
      hasAccess,
      isLoading: false,
      upgradeRequired: !hasAccess,
      currentPlan: plan?.name || 'Free',
      featureValue
    };
  }, [subscriptionData, isLoading, featureName]);

  return result;
}

/**
 * Hook to check quota information for universities or countries
 * 
 * @param quotaType - Type of quota ('universities' or 'countries')
 * @returns Quota information
 * 
 * @example
 * const { limit, used, remaining, canAdd } = useQuotaInfo('universities');
 */
export function useQuotaInfo(quotaType: 'universities' | 'countries') {
  const { data: subscriptionData, isLoading } = useUserSubscription();

  return useMemo(() => {
    if (isLoading || !subscriptionData) {
      return {
        limit: 0,
        used: 0,
        remaining: 0,
        canAdd: false,
        isUnlimited: false,
        isLoading
      };
    }

    const { subscription, plan } = subscriptionData;

    // Get limit from snapshot or plan
    let limit = 0;
    if (subscription.subscribedPlanSnapshot) {
      const snapshot = subscription.subscribedPlanSnapshot as any;
      limit = quotaType === 'universities' 
        ? snapshot.maxUniversities 
        : snapshot.maxCountries;
    } else {
      limit = quotaType === 'universities' 
        ? plan.maxUniversities 
        : plan.maxCountries;
    }

    // Get usage from subscription
    const used = quotaType === 'universities'
      ? (subscription.universitiesUsed || 0)
      : (subscription.countriesUsed || 0);

    const remaining = Math.max(0, limit - used);
    const isUnlimited = limit === -1 || limit >= 999;

    return {
      limit,
      used,
      remaining,
      canAdd: isUnlimited || remaining > 0,
      isUnlimited,
      isLoading: false
    };
  }, [subscriptionData, isLoading, quotaType]);
}

/**
 * Hook to check if user has ANY of the specified features
 * 
 * @param features - Array of feature names
 * @returns True if user has at least one of the features
 * 
 * @example
 * const hasAnySupport = useHasAnyFeature(['includeVisaSupport', 'includeLoanAssistance']);
 */
export function useHasAnyFeature(features: string[]): boolean {
  const { data: subscriptionData, isLoading } = useUserSubscription();

  return useMemo(() => {
    if (isLoading || !subscriptionData) {
      return false;
    }

    const { subscription, plan } = subscriptionData;

    // Get effective features
    const effectiveFeatures = subscription.subscribedPlanSnapshot 
      ? (subscription.subscribedPlanSnapshot as any)
      : plan;

    if (!effectiveFeatures) {
      return false;
    }

    // Check if any feature is available
    return features.some(featureName => {
      // Check direct properties
      if (featureName in effectiveFeatures) {
        const value = effectiveFeatures[featureName];
        if (typeof value === 'boolean') {
          return value;
        }
        return !!value;
      }
      
      // Check features array
      if (effectiveFeatures.features && Array.isArray(effectiveFeatures.features)) {
        return effectiveFeatures.features.includes(featureName);
      }
      
      return false;
    });
  }, [subscriptionData, isLoading, features]);
}

/**
 * Hook to check if user has ALL of the specified features
 * 
 * @param features - Array of feature names
 * @returns True if user has all of the features
 * 
 * @example
 * const hasFullPackage = useHasAllFeatures(['includeCounselorSession', 'includeExpertEditing']);
 */
export function useHasAllFeatures(features: string[]): boolean {
  const { data: subscriptionData, isLoading } = useUserSubscription();

  return useMemo(() => {
    if (isLoading || !subscriptionData) {
      return false;
    }

    const { subscription, plan } = subscriptionData;

    // Get effective features
    const effectiveFeatures = subscription.subscribedPlanSnapshot 
      ? (subscription.subscribedPlanSnapshot as any)
      : plan;

    if (!effectiveFeatures) {
      return false;
    }

    // Check if ALL features are available
    return features.every(featureName => {
      // Check direct properties
      if (featureName in effectiveFeatures) {
        const value = effectiveFeatures[featureName];
        if (typeof value === 'boolean') {
          return value;
        }
        return !!value;
      }
      
      // Check features array
      if (effectiveFeatures.features && Array.isArray(effectiveFeatures.features)) {
        return effectiveFeatures.features.includes(featureName);
      }
      
      return false;
    });
  }, [subscriptionData, isLoading, features]);
}
