import { useApiQuery } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PlanVersionBreakdown {
  basePlanId: string;
  planName: string;
  version: number;
  isLatestVersion: boolean;
  isDeprecated: boolean;
  subscribers: number;
  mrr: number;
  avgPrice: number;
  status: string;
}

interface GrandfatheringImpact {
  totalGrandfatheredUsers: number;
  totalGrandfatheredMRR: number;
  totalCurrentPriceMRR: number;
  revenueGap: number;
  percentageImpact: number;
}

interface RecentPlanChange {
  id: string;
  planId: string;
  planName: string;
  changeType: string;
  fieldChanges: Record<string, { old: any; new: any }>;
  changeReason: string | null;
  changedBy: string;
  changedByName: string | null;
  createdAt: string;
}

interface ComprehensiveAnalytics {
  overview: {
    totalMRR: number;
    totalActiveSubscribers: number;
    grandfatheredCount: number;
    arpu: number;
    activeMigrationsCount: number;
  };
  planVersions: PlanVersionBreakdown[];
  grandfatheringImpact: GrandfatheringImpact;
  recentChanges: RecentPlanChange[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export default function PlanAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  const { data: analytics, isLoading, error } = useApiQuery<ComprehensiveAnalytics>(
    ['admin-plan-analytics'],
    '/api/admin/subscription-plans/analytics',
    undefined,
    { enabled: !authLoading && isAdmin }
  );

  if (authLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24 space-y-6">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Plan Analytics</h1>
              <p className="text-gray-600 mt-2">Comprehensive subscription plan metrics and versioning insights</p>
            </div>
          </div>
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64" />
        </div>
      </>
    );
  }

  if (error || !analytics) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load analytics data. Please try again later.'}
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  const chartData = analytics.planVersions.map(pv => ({
    name: `${pv.planName} v${pv.version}`,
    subscribers: pv.subscribers,
    mrr: pv.mrr,
  }));

  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plan Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive insights into subscription plans, versioning, and grandfathering impact
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalMRR)}</div>
              <p className="text-xs text-muted-foreground mt-1">Monthly Recurring Revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalActiveSubscribers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.overview.grandfatheredCount} grandfathered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARPU</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.overview.arpu)}</div>
              <p className="text-xs text-muted-foreground mt-1">Average Revenue Per User</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Migrations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.activeMigrationsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Plan Version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Plan Version
            </CardTitle>
            <CardDescription>
              Breakdown of subscribers and revenue across all plan versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Chart */}
              {chartData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'mrr') return formatCurrency(value);
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="subscribers" fill="#3b82f6" name="Subscribers" />
                      <Bar yAxisId="right" dataKey="mrr" fill="#10b981" name="MRR" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead className="text-center">Version</TableHead>
                      <TableHead className="text-center">Subscribers</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.planVersions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No plan versions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      analytics.planVersions.map((pv) => (
                        <TableRow key={`${pv.basePlanId}-v${pv.version}`}>
                          <TableCell className="font-medium">
                            {pv.planName}
                            {pv.isLatestVersion && (
                              <Badge variant="outline" className="ml-2 text-xs">Latest</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">v{pv.version}</TableCell>
                          <TableCell className="text-center">{pv.subscribers}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(pv.mrr)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(pv.avgPrice)}</TableCell>
                          <TableCell className="text-center">
                            {pv.isDeprecated ? (
                              <Badge variant="secondary">Deprecated</Badge>
                            ) : pv.status === 'active' ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grandfathering Revenue Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Grandfathering Revenue Impact
            </CardTitle>
            <CardDescription>
              Analysis of revenue impact from grandfathered pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Grandfathered Users</p>
                <p className="text-2xl font-bold">{analytics.grandfatheringImpact.totalGrandfatheredUsers}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Grandfathered MRR</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics.grandfatheringImpact.totalGrandfatheredMRR)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Price MRR</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics.grandfatheringImpact.totalCurrentPriceMRR)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Revenue Gap</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(analytics.grandfatheringImpact.revenueGap)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(analytics.grandfatheringImpact.percentageImpact)} of potential MRR
                </p>
              </div>
            </div>
            {analytics.grandfatheringImpact.totalGrandfatheredUsers > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You have {analytics.grandfatheringImpact.totalGrandfatheredUsers} users on grandfathered pricing, 
                  resulting in a revenue gap of {formatCurrency(analytics.grandfatheringImpact.revenueGap)} per month 
                  compared to current pricing. This represents{' '}
                  {formatPercentage(analytics.grandfatheringImpact.percentageImpact)} of your potential MRR.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Plan Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Plan Changes
            </CardTitle>
            <CardDescription>
              Audit trail of the 20 most recent plan modifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recentChanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No recent plan changes
                      </TableCell>
                    </TableRow>
                  ) : (
                    analytics.recentChanges.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(change.createdAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{change.planName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{change.changeType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm space-y-1">
                            {Object.entries(change.fieldChanges).map(([field, values]) => (
                              <div key={field} className="text-xs">
                                <span className="font-medium">{field}:</span>{' '}
                                <span className="text-red-600">{JSON.stringify(values.old)}</span>
                                {' → '}
                                <span className="text-green-600">{JSON.stringify(values.new)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{change.changedByName || 'Unknown'}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-muted-foreground">
                            {change.changeReason || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
