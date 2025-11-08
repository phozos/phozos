import { usePlanVersionHistory } from "@/hooks/plan-versioning-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Users, Eye } from "lucide-react";
import { format } from "date-fns";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Active Subscribers</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
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
                  {format(new Date(version.createdAt), 'MMM d, yyyy')}
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
      </CardContent>
    </Card>
  );
}
