import type { ReactNode } from 'react';
import { Badge } from "@/components/ui/badge";

export type FeatureValue = boolean | string | number | string[] | null | undefined;

export interface FeatureDefinition {
  key: string;
  label: string;
  description?: string;
  formatter?: (value: FeatureValue) => ReactNode;
}

export interface FeatureCategory {
  id: string;
  name: string;
  emoji: string;
  features: FeatureDefinition[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  maxUniversities: number;
  maxCountries: number;
  turnaroundDays?: number;
  universityTier?: string;
  
  supportType?: string;
  supportTypes?: string[];
  includeDedicatedManager?: boolean;
  
  includeCourseCountrySelection?: boolean;
  includeUniversityShortlisting?: boolean;
  includeExpertEditing?: boolean;
  includeOneOnOneEditing?: boolean;
  includeProfileBuilding?: boolean;
  includeTop50Counselling?: boolean;
  
  phozosAiTier?: 'none' | 'basic' | 'pro' | 'ultra';
  
  includeScholarshipPlanning?: boolean;
  includeLoanAssistance?: boolean;
  includeForexServices?: boolean;
  
  includeVisaSupport?: boolean;
  includePreDepartureSession?: boolean;
  includeMockInterview?: boolean;
  includeFlightAccommodation?: boolean;
  includePostAdmitSupport?: boolean;
  
  phozosPrepTier?: 'none' | 'basic' | 'pro' | 'ultra';
  phozosPrepDescription?: string;
  
  includeCounselorSession?: boolean;
  includeNetworkingEvents?: boolean;
  
  isActive: boolean;
  displayOrder: number;
  tierLevel?: number;
  isLifetime?: boolean;
}

const formatTier = (value: FeatureValue): ReactNode => {
  const tier = value as string | undefined | null;
  if (!tier || tier === 'none') return <span className="text-muted-foreground">—</span>;
  
  const colorMap: Record<string, string> = {
    basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ultra: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
  
  return (
    <Badge variant="secondary" className={colorMap[tier] || ''}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
};

const formatSupportTypes = (value: FeatureValue): ReactNode => {
  const types = value as string[] | string | undefined | null;
  if (!types) return <span className="text-muted-foreground">—</span>;
  
  const typeArray = Array.isArray(types) ? types : [types];
  if (typeArray.length === 0) return <span className="text-muted-foreground">—</span>;
  
  return (
    <div className="flex flex-wrap gap-1">
      {typeArray.map((type, idx) => (
        <Badge key={idx} variant="outline" className="text-xs">
          {type}
        </Badge>
      ))}
    </div>
  );
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'access-quotas',
    name: 'Access & Quotas',
    emoji: '🎓',
    features: [
      {
        key: 'maxUniversities',
        label: 'University Applications',
        formatter: (value) => {
          const num = value as number;
          return num === 999999 ? 'Unlimited' : num;
        }
      },
      {
        key: 'maxCountries',
        label: 'Countries',
        formatter: (value) => {
          const num = value as number;
          return num === 999 ? 'All' : num;
        }
      },
      {
        key: 'universityTier',
        label: 'University Tier',
        formatter: (value) => {
          if (!value || value === 'general') return <span className="text-muted-foreground">General</span>;
          const tier = value as string;
          const tierMap: Record<string, string> = {
            top500: 'Top 500',
            top200: 'Top 200',
            top100: 'Top 100',
            ivy_league: 'Ivy League',
          };
          return tierMap[tier] || tier;
        }
      },
      {
        key: 'turnaroundDays',
        label: 'Turnaround Time',
        formatter: (value) => {
          if (!value) return <span className="text-muted-foreground">—</span>;
          return `${value} days`;
        }
      },
    ]
  },
  {
    id: 'application-support',
    name: 'Application Support',
    emoji: '📝',
    features: [
      {
        key: 'includeCourseCountrySelection',
        label: 'Course & Country Selection',
      },
      {
        key: 'includeUniversityShortlisting',
        label: 'University Shortlisting',
      },
      {
        key: 'includeExpertEditing',
        label: 'Expert Essay Editing',
      },
      {
        key: 'includeOneOnOneEditing',
        label: '1-on-1 Editing Sessions',
      },
      {
        key: 'includeProfileBuilding',
        label: 'Profile Building',
      },
      {
        key: 'includeTop50Counselling',
        label: 'Top 50 University Counselling',
      },
      {
        key: 'includeCounselorSession',
        label: 'Counselor Sessions',
      },
    ]
  },
  {
    id: 'smart-tools',
    name: 'Smart Tools',
    emoji: '🤖',
    features: [
      {
        key: 'phozosAiTier',
        label: 'Phozos AI Assistant',
        formatter: formatTier,
      },
      {
        key: 'phozosPrepTier',
        label: 'Phozos Prep',
        formatter: formatTier,
      },
      {
        key: 'phozosPrepDescription',
        label: 'Prep Details',
        formatter: (value) => {
          if (!value) return <span className="text-muted-foreground">—</span>;
          return <span className="text-sm">{value}</span>;
        }
      },
    ]
  },
  {
    id: 'financial-services',
    name: 'Financial Services',
    emoji: '💰',
    features: [
      {
        key: 'includeScholarshipPlanning',
        label: 'Scholarship Planning',
      },
      {
        key: 'includeLoanAssistance',
        label: 'Education Loan Assistance',
      },
      {
        key: 'includeForexServices',
        label: 'Forex Services',
      },
    ]
  },
  {
    id: 'visa-travel',
    name: 'Visa & Travel',
    emoji: '✈️',
    features: [
      {
        key: 'includeVisaSupport',
        label: 'Visa Application Support',
      },
      {
        key: 'includePreDepartureSession',
        label: 'Pre-Departure Orientation',
      },
      {
        key: 'includeMockInterview',
        label: 'Mock Visa Interview',
      },
      {
        key: 'includeFlightAccommodation',
        label: 'Flight & Accommodation Assistance',
      },
      {
        key: 'includePostAdmitSupport',
        label: 'Post-Admission Support',
      },
    ]
  },
  {
    id: 'support-mentorship',
    name: 'Support & Mentorship',
    emoji: '💬',
    features: [
      {
        key: 'supportTypes',
        label: 'Support Channels',
        formatter: formatSupportTypes,
      },
      {
        key: 'includeDedicatedManager',
        label: 'Dedicated Success Manager',
      },
      {
        key: 'includeNetworkingEvents',
        label: 'Networking Events',
      },
    ]
  },
];

export function getFeatureCategories(): FeatureCategory[] {
  return FEATURE_CATEGORIES;
}

export function getFeatureValue(plan: SubscriptionPlan, featureKey: string): FeatureValue {
  return (plan as any)[featureKey];
}

export function formatFeatureValue(
  value: FeatureValue, 
  featureKey: string, 
  feature?: FeatureDefinition
): ReactNode {
  if (feature?.formatter) {
    return feature.formatter(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? (
      <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  }
  
  return <span className="text-muted-foreground">—</span>;
}

export function isFeatureIncluded(plan: SubscriptionPlan, featureKey: string): boolean {
  const value = getFeatureValue(plan, featureKey);
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value !== 'none' && value !== '';
  }
  
  if (typeof value === 'number') {
    return value > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return false;
}

export function getPrimaryFeatures(plan: SubscriptionPlan): Array<{ label: string; value: React.ReactNode }> {
  return [
    {
      label: 'Universities',
      value: plan.maxUniversities === 999999 ? 'Unlimited' : plan.maxUniversities
    },
    {
      label: 'Countries',
      value: plan.maxCountries === 999 ? 'All' : plan.maxCountries
    },
    {
      label: 'Support',
      value: formatSupportTypes(plan.supportTypes || plan.supportType)
    },
    {
      label: 'AI Assistant',
      value: formatTier(plan.phozosAiTier)
    },
    {
      label: 'Prep Tools',
      value: formatTier(plan.phozosPrepTier)
    },
  ];
}
