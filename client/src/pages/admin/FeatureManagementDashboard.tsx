import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureManagementDashboard, useFeatureUsageOverview } from '@/hooks/api-hooks';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
} from 'lucide-react';

interface DashboardSummary {
  totalFeatures: number;
  activePlans: number;
  totalSubscribers: number;
  healthyFeatures: number;
  featuresAtRisk: number;
  deprecatedFeatures: number;
  recentChanges: number;
}

interface FeatureUsageOverview {
  featureName: string;
  displayName: string;
  totalPlansOffering: number;
  totalUsersWithAccess: number;
  activeUsers: number;
  adoptionRate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  usageCount: number;
}

export default function FeatureManagementDashboard() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  const { data: dashboard, isLoading: dashboardLoading } = useFeatureManagementDashboard();
  const { data: featureUsage, isLoading: usageLoading } = useFeatureUsageOverview();

  const [activeTab, setActiveTab] = useState('overview');

  if (authLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24 space-y-6">
          <LoadingSkeleton className="h-32" />
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

  if (dashboardLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feature Management</h1>
              <p className="text-gray-600 mt-2">Manage features across all subscription plans</p>
            </div>
          </div>
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-64" />
        </div>
      </>
    );
  }

  const summaryData = dashboard as DashboardSummary | undefined;
  const usageData = featureUsage as FeatureUsageOverview[] | undefined;

  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feature Management Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Monitor, analyze, and manage features across all subscription plans
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Features</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.totalFeatures}</div>
                <p className="text-xs text-muted-foreground">
                  Across {summaryData.activePlans} active plans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy Features</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryData.healthyFeatures}</div>
                <p className="text-xs text-muted-foreground">
                  {((summaryData.healthyFeatures / summaryData.totalFeatures) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summaryData.featuresAtRisk}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.totalSubscribers}</div>
                <p className="text-xs text-muted-foreground">
                  Active subscriptions
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Feature Usage</TabsTrigger>
            <TabsTrigger value="health">Health Monitor</TabsTrigger>
            <TabsTrigger value="deprecation">Deprecation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Overview</CardTitle>
                <CardDescription>
                  Summary of all features across subscription plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!usageData || usageData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feature data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Plans</TableHead>
                        <TableHead>Users with Access</TableHead>
                        <TableHead>Adoption Rate</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.slice(0, 10).map((feature) => (
                        <TableRow key={feature.featureName}>
                          <TableCell className="font-medium">{feature.displayName}</TableCell>
                          <TableCell>{feature.totalPlansOffering}</TableCell>
                          <TableCell>{feature.totalUsersWithAccess.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={feature.adoptionRate > 50 ? 'default' : 'secondary'}>
                              {feature.adoptionRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {feature.trend === 'increasing' && (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            )}
                            {feature.trend === 'decreasing' && (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            {feature.trend === 'stable' && (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Analytics</CardTitle>
                <CardDescription>
                  Detailed usage statistics for all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <LoadingSkeleton className="h-64" />
                ) : !usageData || usageData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No usage data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Active Users</TableHead>
                        <TableHead>Total Access</TableHead>
                        <TableHead>Usage Count</TableHead>
                        <TableHead>Adoption</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.map((feature) => (
                        <TableRow key={feature.featureName}>
                          <TableCell className="font-medium">{feature.displayName}</TableCell>
                          <TableCell>{feature.activeUsers.toLocaleString()}</TableCell>
                          <TableCell>{feature.totalUsersWithAccess.toLocaleString()}</TableCell>
                          <TableCell>{feature.usageCount.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${feature.adoptionRate}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {feature.adoptionRate.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Health Monitor</CardTitle>
                <CardDescription>
                  Monitor the health and performance of features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Health monitoring data will be displayed here. Check adoption rates, usage patterns, and alerts.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deprecation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Deprecation Workflow</CardTitle>
                <CardDescription>
                  Manage the 4-phase feature deprecation process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No active deprecation schedules. Create a new schedule to begin the deprecation workflow.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
