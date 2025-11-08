import { usePlanVersionHistory } from "@/hooks/plan-versioning-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History, Users, Eye, HelpCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PlanVersion {
  id: string;
  basePlanId: string;
  version: number;
  price: string;
  currency?: string;
  name: string;
  isLatestVersion: boolean;
  activeSubscribers: number;
  createdAt: string;
  deprecatedAt: string | null;
  features: string[];
  maxUniversities?: number;
  maxCountries?: number;
  universityTier?: string;
  supportType?: string;
  turnaroundDays?: number;
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

interface PlanVersionHistoryProps {
  basePlanId: string;
  onVersionSelect?: (version: PlanVersion) => void;
}

interface VersionHistoryResponse {
  basePlanId: string;
  latestVersion: PlanVersion;
  versions: PlanVersion[];
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlanVersionHistory({ basePlanId, onVersionSelect }: PlanVersionHistoryProps) {
  const { data: versionHistory, isLoading, error } = usePlanVersionHistory(basePlanId);

  if (isLoading) return <LoadingSkeleton />;
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load version history. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!versionHistory) {
    return (
      <Alert>
        <AlertDescription>
          No version history available for this plan.
        </AlertDescription>
      </Alert>
    );
  }

  const typedHistory = versionHistory as VersionHistoryResponse;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>
          All versions of {typedHistory.latestVersion?.name || 'this plan'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Version
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Version number increments with each price or feature change</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Active Subscribers</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Status
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p><strong>Active:</strong> Latest version for new subscribers<br/>
                        <strong>Grandfathered:</strong> Older version with existing subscribers<br/>
                        <strong>Deprecated:</strong> Plan no longer available</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {typedHistory.versions.map((version) => (
              <TableRow 
                key={version.id} 
                className={version.isLatestVersion ? "bg-blue-50 dark:bg-blue-900/20" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={version.isLatestVersion ? "default" : "outline"}>
                      v{version.version}
                    </Badge>
                    {version.isLatestVersion && (
                      <Badge className="bg-green-500 hover:bg-green-600">Latest</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {version.currency || 'INR'} {version.price}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    {version.activeSubscribers}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(version.createdAt, "short")}
                </TableCell>
                <TableCell>
                  {version.deprecatedAt ? (
                    <Badge variant="destructive">Deprecated</Badge>
                  ) : version.isLatestVersion ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="outline">Grandfathered</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onVersionSelect?.(version)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
