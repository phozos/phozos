import { useState } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  BarChart3,
  AlertCircle,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface LifetimeMetrics {
  totalRevenue: number;
  totalActiveSubscribers: number;
  averageTransactionValue: number;
  upgradeRate: number;
  planDistribution: {
    planName: string;
    subscriberCount: number;
    percentage: number;
  }[];
  revenueByTier: {
    planName: string;
    revenue: number;
    tierLevel: number;
  }[];
  lifetimeValueByPlan: {
    planId: string;
    planName: string;
    totalSubscribers: number;
    totalRevenue: number;
    averageValue: number;
    upgradeCount: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function LifetimeAnalyticsDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const { data: metrics, isLoading, error, refetch } = useApiQuery<LifetimeMetrics>(
    ["/api/admin/analytics/lifetime-metrics", refreshKey],
    "/api/admin/analytics/lifetime-metrics"
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/lifetime-metrics"] });
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-IN');
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Analytics</AlertTitle>
        <AlertDescription>
          Failed to load lifetime subscription metrics. Please try again later.
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics || metrics.totalActiveSubscribers === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Lifetime Analytics</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            There are no active subscriptions yet. Analytics will appear once users subscribe to plans.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lifetime Subscription Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of one-time payment subscriptions and revenue metrics
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime earnings from all subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalActiveSubscribers)}</div>
            <p className="text-xs text-muted-foreground">
              Users with active lifetime subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageTransactionValue)}</div>
            <p className="text-xs text-muted-foreground">
              Average payment per subscription
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upgrade Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {formatPercentage(metrics.upgradeRate)}
              {metrics.upgradeRate > 0 && (
                <ArrowUpIcon className="h-4 w-4 text-green-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Percentage of users who upgraded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Plan Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Subscriber count by subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.planDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="planName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'subscriberCount') return [formatNumber(value), 'Subscribers'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="subscriberCount" 
                  fill="#8884d8" 
                  name="Subscribers"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Tier Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Tier</CardTitle>
            <CardDescription>
              Total revenue generated per plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.revenueByTier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="planName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="#00C49F" 
                  name="Revenue"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Pie Chart (Optional) */}
      {metrics.planDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>
              Percentage breakdown of subscribers across plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={metrics.planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ planName, percentage }) => `${planName}: ${formatPercentage(percentage)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="subscriberCount"
                >
                  {metrics.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: string, props: any) => [
                    `${formatNumber(value)} subscribers (${formatPercentage(props.payload.percentage)})`,
                    props.payload.planName
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Lifetime Value by Plan Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lifetime Value by Plan</CardTitle>
          <CardDescription>
            Detailed breakdown of revenue and value metrics per subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.lifetimeValueByPlan.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No plan data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead className="text-right">Total Subscribers</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Average Value</TableHead>
                    <TableHead className="text-right">Upgrades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.lifetimeValueByPlan
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .map((plan) => (
                      <TableRow key={plan.planId}>
                        <TableCell className="font-medium">{plan.planName}</TableCell>
                        <TableCell className="text-right">{formatNumber(plan.totalSubscribers)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(plan.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(plan.averageValue)}</TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1">
                            {formatNumber(plan.upgradeCount)}
                            {plan.upgradeCount > 0 && (
                              <ArrowUpIcon className="h-3 w-3 text-blue-600" />
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(metrics.lifetimeValueByPlan.reduce((sum, plan) => sum + plan.totalSubscribers, 0))}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(metrics.lifetimeValueByPlan.reduce((sum, plan) => sum + plan.totalRevenue, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(metrics.averageTransactionValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(metrics.lifetimeValueByPlan.reduce((sum, plan) => sum + plan.upgradeCount, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
