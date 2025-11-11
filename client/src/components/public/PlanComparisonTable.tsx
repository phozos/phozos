import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Star, Zap, Crown, Award, Globe, Users, Heart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  logo?: string;
  features?: string[];
  maxUniversities: number;
  maxCountries: number;
  turnaroundDays?: number;
  
  // Support & Mentorship (modified from supportType to supportTypes)
  supportType?: string; // Deprecated - for backward compatibility
  supportTypes?: string[]; // New multi-select field
  includeDedicatedManager?: boolean;
  
  // Core Application Services
  includeCourseCountrySelection?: boolean;
  includeUniversityShortlisting?: boolean;
  includeExpertEditing?: boolean;
  includeOneOnOneEditing?: boolean;
  includeProfileBuilding?: boolean;
  includeTop50Counselling?: boolean;
  
  // Phozos AI
  phozosAiTier?: 'none' | 'basic' | 'pro' | 'ultra';
  
  // Financial & Scholarship Services
  includeScholarshipPlanning?: boolean;
  includeLoanAssistance?: boolean;
  includeForexServices?: boolean;
  
  // Visa & Post-Admission
  includeVisaSupport?: boolean;
  includePreDepartureSession?: boolean;
  includeMockInterview?: boolean;
  includeFlightAccommodation?: boolean;
  
  // Phozos Prep
  phozosPrepTier?: 'none' | 'basic' | 'pro' | 'ultra';
  phozosPrepDescription?: string;
  
  // Existing fields
  isActive: boolean;
  displayOrder: number;
  tierLevel?: number;
  isLifetime?: boolean;
}

interface PlanComparisonTableProps {
  plans: SubscriptionPlan[];
  onSelectPlan?: (planId: string) => void;
}

const getPlanIcon = (planName: string) => {
  switch (planName.toLowerCase()) {
    case 'explorer': return Star;
    case 'achiever': return Zap;
    case 'champion': return Crown;
    case 'legend': return Award;
    default: return Star;
  }
};

const getPlanColor = (planName: string) => {
  switch (planName.toLowerCase()) {
    case 'explorer': return 'from-blue-500 to-cyan-500';
    case 'achiever': return 'from-emerald-500 to-teal-500';
    case 'champion': return 'from-purple-500 to-pink-500';
    case 'legend': return 'from-amber-500 to-orange-500';
    default: return 'from-gray-500 to-slate-600';
  }
};

export function PlanComparisonTable({ plans, onSelectPlan }: PlanComparisonTableProps) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

  // Toggle plan selection
  const togglePlanSelection = (planId: string) => {
    setSelectedPlans(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      } else if (prev.length < 4) {
        return [...prev, planId];
      }
      return prev;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedPlans([]);
  };

  // Get plans selected for comparison
  const comparisonPlans = useMemo(() => {
    return plans.filter(plan => selectedPlans.includes(plan.id));
  }, [plans, selectedPlans]);

  return (
    <div className="space-y-8">
      {/* Selection Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-cream via-background to-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ArrowRight className="w-6 h-6 text-primary" />
            Compare Plans
          </CardTitle>
          <CardDescription>
            Select 2-4 plans to compare side by side. Choose the perfect plan for your journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans
                .filter(plan => plan.isActive)
                .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                .map(plan => {
                  const PlanIcon = getPlanIcon(plan.name);
                  const gradientColor = getPlanColor(plan.name);
                  const isSelected = selectedPlans.includes(plan.id);
                  const isMaxSelected = selectedPlans.length >= 4 && !isSelected;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => !isMaxSelected && togglePlanSelection(plan.id)}
                      disabled={isMaxSelected}
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all duration-300 text-left",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-lg"
                          : isMaxSelected
                          ? "border-border/30 opacity-50 cursor-not-allowed"
                          : "border-border/50 hover:border-primary/50 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={isMaxSelected}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${gradientColor} p-0.5`}>
                              <div className="w-full h-full rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                                <PlanIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                              </div>
                            </div>
                            <span className="font-semibold text-foreground">{plan.name}</span>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {parseFloat(plan.price) === 0 ? (
                              'Free'
                            ) : (
                              <>{formatCurrency(plan.price, plan.currency)}<span className="text-sm text-muted-foreground">/year</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {selectedPlans.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  {selectedPlans.length} plan{selectedPlans.length !== 1 ? 's' : ''} selected
                  {selectedPlans.length >= 4 && ' (maximum reached)'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {comparisonPlans.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Plan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] lg:w-[300px] sticky left-0 bg-background z-10">
                      Feature
                    </TableHead>
                    {comparisonPlans.map(plan => {
                      const PlanIcon = getPlanIcon(plan.name);
                      const gradientColor = getPlanColor(plan.name);

                      return (
                        <TableHead key={plan.id} className="text-center min-w-[150px]">
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${gradientColor} p-0.5`}>
                                <div className="w-full h-full rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                                  <PlanIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{plan.name}</div>
                              <div className="text-lg font-bold text-primary">
                                {parseFloat(plan.price) === 0 ? (
                                  'Free'
                                ) : (
                                  `${formatCurrency(plan.price, plan.currency)}/yr`
                                )}
                              </div>
                            </div>
                            {onSelectPlan && (
                              <Button
                                size="sm"
                                className={`w-full bg-gradient-to-r ${gradientColor} text-white`}
                                onClick={() => onSelectPlan(plan.id)}
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Plan Details Rows */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold sticky left-0 bg-muted/30 z-10">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        Universities
                      </div>
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center font-semibold">
                        {plan.maxUniversities === 999999 ? 'Unlimited' : plan.maxUniversities}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-semibold sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Countries
                      </div>
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center font-semibold">
                        {plan.maxCountries === 999 ? 'All' : plan.maxCountries}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold sticky left-0 bg-muted/30 z-10">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        Support Type
                      </div>
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {plan.supportTypes && plan.supportTypes.length > 0 ? (
                            plan.supportTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs capitalize">
                                {type}
                              </Badge>
                            ))
                          ) : plan.supportType ? (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {plan.supportType}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Email</span>
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-semibold sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🤖</span>
                        Phozos AI Tier
                      </div>
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        {plan.phozosAiTier && plan.phozosAiTier !== 'none' ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold ${
                              plan.phozosAiTier === 'ultra' ? 'border-purple-500 text-purple-700 dark:text-purple-400' :
                              plan.phozosAiTier === 'pro' ? 'border-blue-500 text-blue-700 dark:text-blue-400' :
                              'border-green-500 text-green-700 dark:text-green-400'
                            }`}
                          >
                            {plan.phozosAiTier.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not included</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold sticky left-0 bg-muted/30 z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📚</span>
                        Phozos Prep Tier
                      </div>
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        {plan.phozosPrepTier && plan.phozosPrepTier !== 'none' ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold ${
                              plan.phozosPrepTier === 'ultra' ? 'border-purple-500 text-purple-700 dark:text-purple-400' :
                              plan.phozosPrepTier === 'pro' ? 'border-blue-500 text-blue-700 dark:text-blue-400' :
                              'border-green-500 text-green-700 dark:text-green-400'
                            }`}
                          >
                            {plan.phozosPrepTier.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not included</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-semibold sticky left-0 bg-background z-10">
                      Tier Level
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        <Badge variant="outline">Tier {plan.tierLevel || 1}</Badge>
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold sticky left-0 bg-muted/30 z-10">
                      Access Type
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        {plan.isLifetime ? (
                          <Badge className="bg-green-600 text-white">Lifetime</Badge>
                        ) : (
                          <Badge variant="secondary">Standard</Badge>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlans.length === 1 && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Select at least one more plan to start comparing features
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPlans.length === 0 && (
        <Card className="border-2 border-dashed border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Select 2-4 plans above to see a detailed feature comparison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
