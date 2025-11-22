import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PlanVersion {
  id: string;
  version: number;
  price: string;
  currency?: string;
  name: string;
  createdAt: string;
  features: string[];
  maxUniversities?: number;
  maxCountries?: number;
  turnaroundDays?: number;
  universityTier?: string;
  supportType?: string;
  includeLoanAssistance?: boolean;
  includeVisaSupport?: boolean;
  includeCounselorSession?: boolean;
  includeScholarshipPlanning?: boolean;
  includeMockInterview?: boolean;
  includeExpertEditing?: boolean;
  includePostAdmitSupport?: boolean;
  includeDedicatedManager?: boolean;
  includeNetworkingEvents?: boolean;
  includeFlightAccommodation?: boolean;
  isBusinessFocused?: boolean;
}

interface VersionComparisonViewProps {
  version1: PlanVersion;
  version2: PlanVersion;
  onClose?: () => void;
}

export default function VersionComparisonView({ 
  version1, 
  version2, 
  onClose 
}: VersionComparisonViewProps) {
  const fields = [
    { key: 'price', label: 'Price', format: (v: PlanVersion) => `${v.currency || 'INR'} ${v.price}` },
    { key: 'maxUniversities', label: 'Max Universities' },
    { key: 'maxCountries', label: 'Max Countries' },
    { key: 'turnaroundDays', label: 'Turnaround Days' },
    { key: 'universityTier', label: 'University Tier' },
    { key: 'supportType', label: 'Support Type' },
  ];

  const booleanFields = [
    { key: 'includeLoanAssistance', label: 'Loan Assistance' },
    { key: 'includeVisaSupport', label: 'Visa Support' },
    { key: 'includeCounselorSession', label: 'Counselor Session' },
    { key: 'includeScholarshipPlanning', label: 'Scholarship Planning' },
    { key: 'includeMockInterview', label: 'Mock Interview' },
    { key: 'includeExpertEditing', label: 'Expert Editing' },
  ];

  const getDiffClass = (v1: any, v2: any) => {
    if (v1 === v2) return "";
    return "bg-yellow-50 dark:bg-yellow-900/20";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Version Comparison</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium text-sm text-muted-foreground">Field</div>
          <div className="font-medium text-sm text-center">
            <Badge variant="outline">v{version1.version}</Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(version1.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
          <div className="font-medium text-sm text-center">
            <Badge variant="outline">v{version2.version}</Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(version2.createdAt), 'MMM d, yyyy')}
            </div>
          </div>

          {fields.map(field => {
            const key = field.key as keyof PlanVersion;
            return (
              <Fragment key={field.key}>
                <div className="text-sm py-2 border-t">{field.label}</div>
                <div className={cn(
                  "text-sm py-2 border-t text-center",
                  getDiffClass(version1[key], version2[key])
                )}>
                  {field.format ? field.format(version1) : String(version1[key] ?? '')}
                </div>
                <div className={cn(
                  "text-sm py-2 border-t text-center",
                  getDiffClass(version1[key], version2[key])
                )}>
                  {field.format ? field.format(version2) : String(version2[key] ?? '')}
                </div>
              </Fragment>
            );
          })}

          {booleanFields.map(field => {
            const key = field.key as keyof PlanVersion;
            return (
              <Fragment key={field.key}>
                <div className="text-sm py-2 border-t">{field.label}</div>
                <div className={cn(
                  "text-sm py-2 border-t text-center",
                  getDiffClass(version1[key], version2[key])
                )}>
                  {version1[key] ? (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400 mx-auto" />
                  )}
                </div>
                <div className={cn(
                  "text-sm py-2 border-t text-center",
                  getDiffClass(version1[key], version2[key])
                )}>
                  {version2[key] ? (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400 mx-auto" />
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Features</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Badge variant="outline" className="mb-2">v{version1.version}</Badge>
              <ul className="text-sm space-y-1">
                {version1.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Badge variant="outline" className="mb-2">v{version2.version}</Badge>
              <ul className="text-sm space-y-1">
                {version2.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
