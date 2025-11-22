/**
 * FeatureChangeAlert Component
 * 
 * In-app banner component for displaying feature change notifications
 * - Supports addition (success), deprecation (warning), modification (info) styles
 * - Dismissible with local storage persistence
 * - Links to migration guides and help documentation
 */

import { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeatureChangeType = 'addition' | 'deprecation' | 'modification';

export interface FeatureChangeAlertProps {
  id: string;
  type: FeatureChangeType;
  featureName: string;
  planName: string;
  message: string;
  effectiveDate?: string;
  migrationGuideUrl?: string;
  grandfathered?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const FeatureChangeAlert = ({
  id,
  type,
  featureName,
  planName,
  message,
  effectiveDate,
  migrationGuideUrl,
  grandfathered = false,
  onDismiss,
  className
}: FeatureChangeAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissedAlerts = getDismissedAlerts();
    if (dismissedAlerts.includes(id)) {
      setIsVisible(false);
    }
  }, [id]);

  const handleDismiss = () => {
    saveDismissedAlert(id);
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const { icon: Icon, variant, borderColor, iconColor, bgColor, textColor } = getAlertStyles(type);

  return (
    <Alert
      className={cn(
        'relative mb-4 border-l-4 shadow-sm',
        borderColor,
        bgColor,
        className
      )}
      variant="default"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0">
          <AlertTitle className={cn('text-base font-semibold mb-2', textColor)}>
            {getAlertTitle(type, featureName)}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-sm">{message}</p>
              
              {effectiveDate && (
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">Effective Date:</span>{' '}
                  {new Date(effectiveDate).toLocaleDateString()}
                </p>
              )}

              {grandfathered && (
                <div className={cn(
                  'text-sm font-medium px-3 py-2 rounded-md',
                  'bg-green-50 text-green-800 border border-green-200',
                  'dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                )}>
                  ✓ You're grandfathered - This change doesn't affect you
                </div>
              )}

              {migrationGuideUrl && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(migrationGuideUrl, '_blank')}
                  >
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

function getAlertStyles(type: FeatureChangeType) {
  switch (type) {
    case 'addition':
      return {
        icon: CheckCircle,
        variant: 'default' as const,
        borderColor: 'border-l-green-500',
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50/50 dark:bg-green-900/10',
        textColor: 'text-green-900 dark:text-green-100'
      };
    case 'deprecation':
      return {
        icon: AlertCircle,
        variant: 'default' as const,
        borderColor: 'border-l-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
        textColor: 'text-amber-900 dark:text-amber-100'
      };
    case 'modification':
      return {
        icon: Info,
        variant: 'default' as const,
        borderColor: 'border-l-blue-500',
        iconColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
        textColor: 'text-blue-900 dark:text-blue-100'
      };
  }
}

function getAlertTitle(type: FeatureChangeType, featureName: string): string {
  switch (type) {
    case 'addition':
      return `🎉 New Feature Available: ${featureName}`;
    case 'deprecation':
      return `⚠️ Important: ${featureName} Scheduled for Removal`;
    case 'modification':
      return `📢 Update: Changes to ${featureName}`;
  }
}

function getDismissedAlerts(): string[] {
  try {
    const dismissed = localStorage.getItem('dismissedFeatureAlerts');
    return dismissed ? JSON.parse(dismissed) : [];
  } catch (error) {
    console.error('Error reading dismissed alerts from localStorage', error);
    return [];
  }
}

function saveDismissedAlert(alertId: string): void {
  try {
    const dismissed = getDismissedAlerts();
    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      localStorage.setItem('dismissedFeatureAlerts', JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error('Error saving dismissed alert to localStorage', error);
  }
}

export function clearDismissedAlert(alertId: string): void {
  try {
    const dismissed = getDismissedAlerts();
    const filtered = dismissed.filter(id => id !== alertId);
    localStorage.setItem('dismissedFeatureAlerts', JSON.stringify(filtered));
  } catch (error) {
    console.error('Error clearing dismissed alert from localStorage', error);
  }
}

export function clearAllDismissedAlerts(): void {
  try {
    localStorage.removeItem('dismissedFeatureAlerts');
  } catch (error) {
    console.error('Error clearing all dismissed alerts from localStorage', error);
  }
}

export default FeatureChangeAlert;
