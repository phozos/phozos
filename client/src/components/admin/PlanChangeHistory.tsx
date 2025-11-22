import { useState } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, History } from "lucide-react";

interface SubscriptionPlanChange {
  id: string;
  planId: string;
  changedBy: string;
  changeType: 'created' | 'updated' | 'deprecated' | 'archived' | 'activated' | 'deactivated';
  fieldChanges: Record<string, { old: any; new: any }>;
  changeReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  changedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: string;
    name: string;
  };
}

interface PlanChangeHistoryProps {
  planId?: string;
}

const getChangeTypeBadgeColor = (changeType: string) => {
  const colors: Record<string, string> = {
    created: "bg-green-500 hover:bg-green-600",
    updated: "bg-blue-500 hover:bg-blue-600",
    deprecated: "bg-yellow-500 hover:bg-yellow-600",
    archived: "bg-red-500 hover:bg-red-600",
    activated: "bg-emerald-500 hover:bg-emerald-600",
    deactivated: "bg-gray-500 hover:bg-gray-600",
  };
  return colors[changeType] || "bg-gray-500 hover:bg-gray-600";
};

const formatFieldChange = (field: string, oldValue: any, newValue: any) => {
  if (oldValue === null || oldValue === undefined) {
    return (
      <div className="text-sm">
        <span className="font-medium">{field}:</span> <span className="text-green-600 dark:text-green-400">Set to {formatValue(newValue)}</span>
      </div>
    );
  }
  
  if (newValue === null || newValue === undefined) {
    return (
      <div className="text-sm">
        <span className="font-medium">{field}:</span> <span className="text-red-600 dark:text-red-400">Removed (was {formatValue(oldValue)})</span>
      </div>
    );
  }
  
  return (
    <div className="text-sm">
      <span className="font-medium">{field}:</span>{" "}
      <span className="text-red-600 dark:text-red-400 line-through">{formatValue(oldValue)}</span>
      {" → "}
      <span className="text-green-600 dark:text-green-400">{formatValue(newValue)}</span>
    </div>
  );
};

const formatValue = (value: any): string => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return String(value);
};

export default function PlanChangeHistory({ planId }: PlanChangeHistoryProps) {
  const [limit] = useState(50);

  const endpoint = planId 
    ? `/api/admin/subscription-plans/${planId}/change-history`
    : `/api/admin/subscription-plans/recent-changes?limit=${limit}`;

  const { data: changes, isLoading, error } = useApiQuery<SubscriptionPlanChange[]>(
    [endpoint],
    endpoint,
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: 60000,
    }
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load change history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!changes || changes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {planId ? "Plan Change History" : "Recent Plan Changes"}
          </CardTitle>
          <CardDescription>
            {planId ? "History of all changes to this subscription plan" : "Recent changes across all subscription plans"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No change history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {planId ? "Plan Change History" : "Recent Plan Changes"}
        </CardTitle>
        <CardDescription>
          {planId ? "History of all changes to this subscription plan" : `Showing the last ${changes.length} changes across all subscription plans`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                {!planId && <TableHead>Plan</TableHead>}
                <TableHead>Changed By</TableHead>
                <TableHead>Change Type</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">
                      {new Date(change.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  {!planId && (
                    <TableCell>
                      <div className="font-medium">{change.plan?.name || 'Unknown Plan'}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{change.changedByUser?.name || 'Unknown User'}</div>
                      <div className="text-xs text-muted-foreground">{change.changedByUser?.email || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getChangeTypeBadgeColor(change.changeType)}>
                      {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 max-w-md">
                      {Object.entries(change.fieldChanges || {}).map(([field, values]) => (
                        <div key={field}>
                          {formatFieldChange(field, values.old, values.new)}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs">
                      {change.changeReason || <span className="text-muted-foreground italic">No reason provided</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
