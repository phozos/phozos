import { useState } from "react";
import { usePlanVersionHistory, useRollbackPlanVersion } from "@/hooks/plan-versioning-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History, Users, Eye, HelpCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const rollbackMutation = useRollbackPlanVersion();
  const { toast } = useToast();
  
  const [rollbackDialog, setRollbackDialog] = useState<{
    open: boolean;
    targetVersion: PlanVersion | null;
    currentVersion: PlanVersion | null;
    reason: string;
    notifySubscribers: boolean;
  }>({
    open: false,
    targetVersion: null,
    currentVersion: null,
    reason: "",
    notifySubscribers: false,
  });

  const handleRollbackClick = (targetVersion: PlanVersion, currentVersion: PlanVersion) => {
    setRollbackDialog({
      open: true,
      targetVersion,
      currentVersion,
      reason: "",
      notifySubscribers: false,
    });
  };

  const handleRollbackConfirm = async () => {
    if (!rollbackDialog.targetVersion || !rollbackDialog.currentVersion) return;
    
    if (!rollbackDialog.reason || rollbackDialog.reason.trim().length < 10) {
      toast({
        title: "Invalid reason",
        description: "Rollback reason must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      await rollbackMutation.mutateAsync({
        planId: basePlanId,
        data: {
          targetVersion: rollbackDialog.targetVersion.version,
          reason: rollbackDialog.reason,
          notifySubscribers: rollbackDialog.notifySubscribers,
        },
      });

      toast({
        title: "Rollback successful",
        description: `Plan rolled back to version ${rollbackDialog.targetVersion.version}. A new version has been created.`,
      });

      setRollbackDialog({
        open: false,
        targetVersion: null,
        currentVersion: null,
        reason: "",
        notifySubscribers: false,
      });
    } catch (error: any) {
      toast({
        title: "Rollback failed",
        description: error?.response?.data?.message || "Failed to rollback plan version. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRollbackCancel = () => {
    setRollbackDialog({
      open: false,
      targetVersion: null,
      currentVersion: null,
      reason: "",
      notifySubscribers: false,
    });
  };

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
  const currentVersion = typedHistory.latestVersion;

  return (
    <>
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
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onVersionSelect?.(version)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {!version.isLatestVersion && !version.deprecatedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollbackClick(version, currentVersion)}
                        disabled={rollbackMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TooltipProvider>
      </CardContent>
    </Card>

    <Dialog open={rollbackDialog.open} onOpenChange={(open) => !open && handleRollbackCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Plan Rollback
          </DialogTitle>
          <DialogDescription>
            This will create a new version with settings from the target version.
            Historical data will remain unchanged.
          </DialogDescription>
        </DialogHeader>

        {rollbackDialog.targetVersion && rollbackDialog.currentVersion && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Current Version</p>
                <p className="text-lg font-bold">v{rollbackDialog.currentVersion.version}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rollbackDialog.currentVersion.currency || 'INR'} {rollbackDialog.currentVersion.price}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Rolling Back To</p>
                <p className="text-lg font-bold text-amber-600">v{rollbackDialog.targetVersion.version}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rollbackDialog.targetVersion.currency || 'INR'} {rollbackDialog.targetVersion.price}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-semibold mb-2">Changes that will be reverted:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {rollbackDialog.currentVersion.price !== rollbackDialog.targetVersion.price && (
                  <li>
                    Price: {rollbackDialog.currentVersion.currency || 'INR'} {rollbackDialog.currentVersion.price} → {rollbackDialog.targetVersion.currency || 'INR'} {rollbackDialog.targetVersion.price}
                  </li>
                )}
                {JSON.stringify(rollbackDialog.currentVersion.features) !== JSON.stringify(rollbackDialog.targetVersion.features) && (
                  <li>Features will be reverted to v{rollbackDialog.targetVersion.version}</li>
                )}
                {rollbackDialog.currentVersion.maxUniversities !== rollbackDialog.targetVersion.maxUniversities && (
                  <li>Max Universities: {rollbackDialog.currentVersion.maxUniversities} → {rollbackDialog.targetVersion.maxUniversities}</li>
                )}
                {rollbackDialog.currentVersion.maxCountries !== rollbackDialog.targetVersion.maxCountries && (
                  <li>Max Countries: {rollbackDialog.currentVersion.maxCountries} → {rollbackDialog.targetVersion.maxCountries}</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rollback-reason">
                Reason for Rollback <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rollback-reason"
                placeholder="Explain why you are rolling back this plan (minimum 10 characters)..."
                value={rollbackDialog.reason}
                onChange={(e) => setRollbackDialog({ ...rollbackDialog, reason: e.target.value })}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {rollbackDialog.reason.length}/500 characters (minimum 10 required)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-subscribers"
                checked={rollbackDialog.notifySubscribers}
                onCheckedChange={(checked) => 
                  setRollbackDialog({ ...rollbackDialog, notifySubscribers: checked === true })
                }
              />
              <Label
                htmlFor="notify-subscribers"
                className="text-sm font-normal cursor-pointer"
              >
                Notify subscribers about this change
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleRollbackCancel}
            disabled={rollbackMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRollbackConfirm}
            disabled={rollbackMutation.isPending || rollbackDialog.reason.trim().length < 10}
          >
            {rollbackMutation.isPending ? "Rolling back..." : "Confirm Rollback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
