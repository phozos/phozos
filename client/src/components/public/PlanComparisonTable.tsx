import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { 
  getFeatureCategories, 
  getFeatureValue, 
  formatFeatureValue,
  type SubscriptionPlan 
} from "@/lib/plan-features";

interface PlanComparisonTableProps {
  plans: SubscriptionPlan[];
  onSelectPlan?: (planId: string) => void;
}

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

  const clearSelection = () => {
    setSelectedPlans([]);
  };

  const comparisonPlans = useMemo(() => {
    return plans.filter(plan => selectedPlans.includes(plan.id));
  }, [plans, selectedPlans]);

  const featureCategories = getFeatureCategories();

  return (
    <div className="space-y-8">
      {/* Selection Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-cream via-background to-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            → Compare Plans
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
                          <div className="mb-2">
                            <span className={`font-semibold text-lg bg-gradient-to-r ${gradientColor} bg-clip-text text-transparent`}>
                              {plan.name}
                            </span>
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
            <CardTitle className="text-xl">Detailed Feature Comparison</CardTitle>
            <CardDescription>
              Compare all features across {comparisonPlans.length} selected plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] lg:w-[300px] sticky left-0 bg-background z-10 border-r">
                      Feature
                    </TableHead>
                    {comparisonPlans.map(plan => {
                      const gradientColor = getPlanColor(plan.name);

                      return (
                        <TableHead key={plan.id} className="text-center min-w-[150px]">
                          <div className="space-y-2">
                            <div className={`font-bold text-lg bg-gradient-to-r ${gradientColor} bg-clip-text text-transparent`}>
                              {plan.name}
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {parseFloat(plan.price) === 0 ? (
                                'Free'
                              ) : (
                                `${formatCurrency(plan.price, plan.currency)}/yr`
                              )}
                            </div>
                            {onSelectPlan && (
                              <Button
                                size="sm"
                                className={`w-full bg-gradient-to-r ${gradientColor} text-white`}
                                onClick={() => onSelectPlan(plan.id)}
                              >
                                Select Plan
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureCategories.map((category, categoryIndex) => (
                    <React.Fragment key={category.id}>
                      {/* Category Header Row */}
                      <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t-2 border-primary/20">
                        <TableCell 
                          colSpan={comparisonPlans.length + 1} 
                          className="font-bold text-foreground py-4 sticky left-0 z-10"
                        >
                          <div className="flex items-center gap-3 text-lg">
                            <span className="text-2xl">{category.emoji}</span>
                            <span>{category.name}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Feature Rows */}
                      {category.features.map((feature, featureIndex) => {
                        const isEvenRow = featureIndex % 2 === 0;
                        
                        return (
                          <TableRow 
                            key={feature.key}
                            className={isEvenRow ? 'bg-muted/30' : ''}
                          >
                            <TableCell className={`font-medium sticky left-0 z-10 border-r ${isEvenRow ? 'bg-muted/30' : 'bg-background'}`}>
                              {feature.label}
                            </TableCell>
                            {comparisonPlans.map(plan => {
                              const value = getFeatureValue(plan, feature.key);
                              const formattedValue = formatFeatureValue(value, feature.key, feature);
                              
                              return (
                                <TableCell key={plan.id} className="text-center">
                                  {formattedValue}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  
                  {/* Additional Info Row */}
                  <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t-2 border-primary/20">
                    <TableCell 
                      colSpan={comparisonPlans.length + 1} 
                      className="font-bold text-foreground py-4 sticky left-0 z-10"
                    >
                      <div className="flex items-center gap-3 text-lg">
                        <span className="text-2xl">ℹ️</span>
                        <span>Additional Information</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-muted/30 z-10 border-r">
                      Tier Level
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        <Badge variant="outline">Tier {plan.tierLevel || 1}</Badge>
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                      Access Type
                    </TableCell>
                    {comparisonPlans.map(plan => (
                      <TableCell key={plan.id} className="text-center">
                        {plan.isLifetime ? (
                          <Badge className="bg-green-600 text-white">Lifetime Access</Badge>
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
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">👉</div>
            <p className="text-lg font-semibold text-foreground mb-2">
              Select at least one more plan
            </p>
            <p className="text-muted-foreground">
              Choose 2-4 plans to see a detailed feature comparison
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPlans.length === 0 && (
        <Card className="border-2 border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-semibold text-foreground mb-2">
              No plans selected
            </p>
            <p className="text-muted-foreground">
              Select 2-4 plans above to see a detailed feature comparison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
