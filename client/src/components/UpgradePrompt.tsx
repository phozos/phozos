import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';

/**
 * Props for UpgradePrompt component
 */
export interface UpgradePromptProps {
  /**
   * Name of the feature that is locked
   */
  feature: string;
  
  /**
   * Description of what the feature does
   */
  description?: string;
  
  /**
   * Current plan name (optional)
   */
  currentPlan?: string;
  
  /**
   * Suggested plans that include this feature (optional)
   */
  upgradeOptions?: string[];
  
  /**
   * Variant of the prompt
   * - 'card': Full card with header and footer (default)
   * - 'inline': Compact inline alert
   * - 'banner': Full-width banner
   */
  variant?: 'card' | 'inline' | 'banner';
  
  /**
   * Size of the prompt
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom CTA text (optional)
   */
  ctaText?: string;
  
  /**
   * Custom icon (optional)
   */
  icon?: React.ReactNode;
  
  /**
   * Show upgrade benefits (optional)
   */
  showBenefits?: boolean;
  
  /**
   * Additional className for styling
   */
  className?: string;
}

/**
 * UpgradePrompt Component
 * 
 * Displays when a user lacks a specific feature, prompting them to upgrade.
 * Uses professional UI with shadcn/ui components.
 * 
 * @example
 * // Card variant (default)
 * <UpgradePrompt 
 *   feature="Loan Assistance" 
 *   description="Get expert help with student loan applications"
 * />
 * 
 * @example
 * // Inline variant
 * <UpgradePrompt 
 *   feature="Visa Support" 
 *   variant="inline"
 * />
 * 
 * @example
 * // Banner variant with upgrade options
 * <UpgradePrompt 
 *   feature="Expert Editing" 
 *   variant="banner"
 *   upgradeOptions={['Achiever', 'Champion']}
 *   showBenefits
 * />
 */
export function UpgradePrompt({
  feature,
  description,
  currentPlan,
  upgradeOptions = [],
  variant = 'card',
  size = 'md',
  ctaText,
  icon,
  showBenefits = false,
  className = ''
}: UpgradePromptProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    navigate(`/plans?feature=${encodeURIComponent(feature)}`);
  };

  // Default description if none provided
  const displayDescription = description || `Unlock ${feature} by upgrading your plan.`;

  // Default CTA text
  const displayCtaText = ctaText || 'View Plans';

  // Inline variant
  if (variant === 'inline') {
    return (
      <Alert className={`border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 ${className}`}>
        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium text-amber-900 dark:text-amber-100">{feature}</span>
            <span className="text-amber-700 dark:text-amber-300 ml-2">requires an upgrade</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleUpgrade}
            className="ml-4 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
          >
            Upgrade
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={`w-full bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border-y border-primary/20 ${className}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {icon || <Sparkles className="h-8 w-8 text-primary" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-600" />
                  {feature}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{displayDescription}</p>
                {upgradeOptions.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Available in:</span>
                    {upgradeOptions.map((plan) => (
                      <Badge key={plan} variant="secondary" className="text-xs">
                        {plan}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button 
              size="lg"
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {displayCtaText}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  return (
    <Card className={`${sizeClasses[size]} mx-auto border-amber-200 dark:border-amber-800 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-100 to-primary/10 dark:from-amber-900/20 dark:to-primary/20 rounded-full flex items-center justify-center mb-4">
          {icon || <Lock className="h-8 w-8 text-primary" />}
        </div>
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Lock className="h-5 w-5 text-amber-600" />
          {feature}
        </CardTitle>
        <CardDescription className="mt-2 text-base">
          {displayDescription}
        </CardDescription>
      </CardHeader>

      {(showBenefits || currentPlan || upgradeOptions.length > 0) && (
        <CardContent className="space-y-4">
          {/* Current Plan */}
          {currentPlan && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge variant="outline">{currentPlan}</Badge>
            </div>
          )}

          {/* Upgrade Options */}
          {upgradeOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Available in these plans:</p>
              <div className="flex flex-wrap gap-2">
                {upgradeOptions.map((plan) => (
                  <Badge 
                    key={plan} 
                    variant="secondary"
                    className="bg-gradient-to-r from-primary/10 to-amber-500/10 text-foreground"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {plan}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {showBenefits && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Upgrade benefits:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Unlock {feature} immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Lifetime access - pay once, use forever</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Access to all plan features</span>
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-3 pt-6">
        <Button 
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
          size="lg"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {displayCtaText}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Compare all plans and choose the one that fits your needs
        </p>
      </CardFooter>
    </Card>
  );
}

/**
 * QuotaExceededPrompt Component
 * Specialized version for quota limits
 */
export interface QuotaExceededPromptProps {
  quotaType: 'universities' | 'countries';
  limit: number;
  used: number;
  variant?: 'card' | 'inline' | 'banner';
  className?: string;
}

export function QuotaExceededPrompt({
  quotaType,
  limit,
  used,
  variant = 'card',
  className = ''
}: QuotaExceededPromptProps) {
  const displayType = quotaType === 'universities' ? 'Universities' : 'Countries';
  
  return (
    <UpgradePrompt
      feature={`${displayType} Limit Reached`}
      description={`You've used ${used} of ${limit} ${quotaType}. Upgrade your plan to add more ${quotaType}.`}
      variant={variant}
      icon={<AlertCircle className="h-8 w-8 text-amber-600" />}
      ctaText="Increase Limit"
      showBenefits
      className={className}
    />
  );
}
