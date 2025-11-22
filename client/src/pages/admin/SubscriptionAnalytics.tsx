import { useState } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import { Link } from "wouter";

interface SubscriptionMetrics {
  activeSubscriptionsByPlan: Array<{
    planId: string;
    planName: string;
    count: number;
    percentage: number;
  }>;
  totalActive: number;
  totalExpired: number;
  totalCancelled: number;
  totalPending: number;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  totalRevenue: number;
  averageTransactionValue: number;
  revenueByPlan: Array<{
    planId: string;
    planName: string;
    revenue: number;
    subscriptionCount: number;
  }>;
}

interface ChurnMetrics {
  churnRate: number;
  cancellationsThisMonth: number;
  cancellationsLastMonth: number;
  retentionRate: number;
  totalActiveStart: number;
  totalActiveEnd: number;
}

interface PaymentMetrics {
  paymentSuccessRate: number;
  totalPaymentAttempts: number;
  failedPaymentCount: number;
  failedPaymentAmount: number;
  gracePeriodRecoveryRate: number;
  recentFailures: number;
}

interface UpgradeDowngradeMetrics {
  upgradesThisMonth: number;
  downgradesThisMonth: number;
  upgradesLastMonth: number;
  downgradesLastMonth: number;
  upgradeRate: number;
  downgradeRate: number;
  netUpgrades: number;
  upgradesByPlan: Array<{
    fromPlan: string;
    toPlan: string;
    count: number;
  }>;
}

interface MonthlyGrowth {
  month: string;
  year: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  netGrowth: number;
  revenue: number;
}

interface SubscriptionAnalyticsData {
  subscriptions: SubscriptionMetrics;
  churn: ChurnMetrics;
  payments: PaymentMetrics;
  upgradesDowngrades: UpgradeDowngradeMetrics;
}

interface SubscriptionGrowthData {
  monthlyGrowth: MonthlyGrowth[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export default function SubscriptionAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>("overview");

  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  const { data: analyticsData, isLoading: analyticsLoading } = useApiQuery<SubscriptionAnalyticsData>(
    ["/api/admin/analytics/subscriptions"],
    '/api/admin/analytics/subscriptions',
    undefined,
    { enabled: !authLoading && isAdmin }
  );

  const { data: revenueData, isLoading: revenueLoading } = useApiQuery<RevenueMetrics>(
    ["/api/admin/analytics/revenue"],
    '/api/admin/analytics/revenue',
    undefined,
    { enabled: !authLoading && isAdmin }
  );

  const { data: growthData, isLoading: growthLoading } = useApiQuery<SubscriptionGrowthData>(
    ["/api/admin/analytics/growth"],
    '/api/admin/analytics/growth',
    undefined,
    { enabled: !authLoading && isAdmin }
  );

  if (authLoading) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppShell />
        <div className="container mx-auto p-6 pt-24">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const isLoading = analyticsLoading || revenueLoading || growthLoading;

  const subscriptions = analyticsData?.subscriptions;
  const churn = analyticsData?.churn;
  const payments = analyticsData?.payments;
  const upgradesDowngrades = analyticsData?.upgradesDowngrades;
  const revenue = revenueData;
  const growth = growthData?.monthlyGrowth || [];

  const pieChartData = subscriptions?.activeSubscriptionsByPlan.map((item) => ({
    name: item.planName,
    value: item.count,
  })) || [];

  const revenueByPlanData = revenue?.revenueByPlan.map((item) => ({
    name: item.planName,
    revenue: item.revenue,
    subscriptions: item.subscriptionCount,
  })) || [];

  const growthChartData = growth.slice(-6).map((item) => ({
    month: `${item.month.substring(0, 3)} ${item.year}`,
    newSubscriptions: item.newSubscriptions,
    cancellations: item.cancelledSubscriptions,
    netGrowth: item.netGrowth,
    revenue: item.revenue,
  }));

  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscription Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into subscription performance, revenue, and growth metrics
            </p>
          </div>
          <Link href="/dashboard/admin">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <Activity className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="growth">
                <TrendingUp className="w-4 h-4 mr-2" />
                Growth
              </TabsTrigger>
              <TabsTrigger value="performance">
                <BarChart3 className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptions?.totalActive || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscriptions?.totalPending || 0} pending
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expired</CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptions?.totalExpired || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expired subscriptions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptions?.totalCancelled || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total cancellations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(churn?.retentionRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current month retention
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Subscriptions by Plan</CardTitle>
                    <CardDescription>Distribution of subscribers across plans</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pieChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No subscription data available
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      {subscriptions?.activeSubscriptionsByPlan.map((plan, index) => (
                        <div key={plan.planId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm">{plan.planName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{plan.count}</span>
                            <Badge variant="secondary">{formatPercentage(plan.percentage)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Churn & Retention Metrics</CardTitle>
                    <CardDescription>Monthly subscription churn analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Churn Rate</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-red-500">
                            {formatPercentage(churn?.churnRate || 0)}
                          </span>
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Retention Rate</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-500">
                            {formatPercentage(churn?.retentionRate || 0)}
                          </span>
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cancellations This Month</span>
                        <span className="font-medium">{churn?.cancellationsThisMonth || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cancellations Last Month</span>
                        <span className="font-medium">{churn?.cancellationsLastMonth || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active Start of Month</span>
                        <span className="font-medium">{churn?.totalActiveStart || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active End of Month</span>
                        <span className="font-medium">{churn?.totalActiveEnd || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">MRR</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenue?.mrr || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Monthly Recurring Revenue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ARR</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenue?.arr || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Annual Recurring Revenue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenue?.totalRevenue || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All-time revenue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenue?.averageTransactionValue || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average transaction value
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Plan</CardTitle>
                  <CardDescription>Revenue distribution and subscription counts per plan</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueByPlanData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={revenueByPlanData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'revenue') {
                              return [formatCurrency(value), 'Revenue'];
                            }
                            return [value, 'Subscriptions'];
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" />
                        <Bar yAxisId="right" dataKey="subscriptions" fill="#10b981" name="Subscriptions" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      No revenue data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Details by Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {revenue?.revenueByPlan.map((plan, index) => (
                        <div key={plan.planId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium">{plan.planName}</p>
                              <p className="text-sm text-muted-foreground">
                                {plan.subscriptionCount} {plan.subscriptionCount === 1 ? 'subscription' : 'subscriptions'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(plan.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Performance</CardTitle>
                    <CardDescription>Payment success and failure metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-500">
                          {formatPercentage(payments?.paymentSuccessRate || 0)}
                        </span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Payment Attempts</span>
                        <span className="font-medium">{payments?.totalPaymentAttempts || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Failed Payments</span>
                        <span className="font-medium text-red-500">{payments?.failedPaymentCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Failed Amount</span>
                        <span className="font-medium text-red-500">
                          {formatCurrency(payments?.failedPaymentAmount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Grace Period Recovery</span>
                        <span className="font-medium text-green-500">
                          {formatPercentage(payments?.gracePeriodRecoveryRate || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Recent Failures</span>
                        <Badge variant="destructive">{payments?.recentFailures || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="growth" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Growth Trend</CardTitle>
                  <CardDescription>6-month subscription growth and revenue trajectory</CardDescription>
                </CardHeader>
                <CardContent>
                  {growthChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={growthChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value: any, name: string) => {
                            if (name === 'revenue') {
                              return [formatCurrency(value), 'Revenue'];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="newSubscriptions"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="New Subscriptions"
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cancellations"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Cancellations"
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="netGrowth"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Net Growth"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Revenue"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      No growth data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3">
                {growth.slice(-3).reverse().map((monthData, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {monthData.month} {monthData.year}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">New Subscriptions</span>
                        <Badge variant="default" className="bg-green-500">
                          +{monthData.newSubscriptions}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cancellations</span>
                        <Badge variant="destructive">-{monthData.cancelledSubscriptions}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Net Growth</span>
                        <Badge
                          variant={monthData.netGrowth >= 0 ? "default" : "destructive"}
                          className={monthData.netGrowth >= 0 ? "bg-blue-500" : ""}
                        >
                          {monthData.netGrowth >= 0 ? '+' : ''}{monthData.netGrowth}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Revenue</span>
                        <span className="font-bold">{formatCurrency(monthData.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Active Total</span>
                        <span className="font-medium">{monthData.activeSubscriptions}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upgrades This Month</CardTitle>
                    <ArrowUpCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {upgradesDowngrades?.upgradesThisMonth || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {upgradesDowngrades?.upgradesLastMonth || 0} last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Downgrades This Month</CardTitle>
                    <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {upgradesDowngrades?.downgradesThisMonth || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {upgradesDowngrades?.downgradesLastMonth || 0} last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Upgrades</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {upgradesDowngrades?.netUpgrades || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrades minus downgrades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upgrade Rate</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(upgradesDowngrades?.upgradeRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Downgrade rate: {formatPercentage(upgradesDowngrades?.downgradeRate || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upgrade/Downgrade Flow</CardTitle>
                    <CardDescription>Plan change patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upgradesDowngrades?.upgradesByPlan && upgradesDowngrades.upgradesByPlan.length > 0 ? (
                        upgradesDowngrades.upgradesByPlan.map((flow, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{flow.fromPlan}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-sm font-medium">{flow.toPlan}</span>
                            </div>
                            <Badge variant="secondary">{flow.count} changes</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No upgrade/downgrade data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Issue Alerts</CardTitle>
                    <CardDescription>Recent payment failures requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payments && payments.recentFailures > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-900">
                              {payments.recentFailures} Recent Failed Payments
                            </p>
                            <p className="text-sm text-red-700">
                              Total failed amount: {formatCurrency(payments.failedPaymentAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Failed Payment Count</span>
                            <span className="font-medium">{payments.failedPaymentCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Grace Period Recoveries</span>
                            <span className="font-medium text-green-600">
                              {formatPercentage(payments.gracePeriodRecoveryRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-900">All Payments Processing Successfully</p>
                          <p className="text-sm text-green-700">No recent payment issues detected</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
