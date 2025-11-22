import { useState } from "react";
import { usePartnerAnalytics } from "@/hooks/partner-api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck,
  UserX,
  TrendingUp, 
  RefreshCw, 
  DollarSign,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface PartnerAnalyticsData {
  systemStats: {
    totalPartners: number;
    verifiedPartners: number;
    pendingPartners: number;
    inactivePartners: number;
    totalReferralsThisMonth: number;
    totalConversionsThisMonth: number;
    totalCommissionsPaidThisMonth: number;
    activeReferralLinks: number;
  };
  topPerformingPartners: Array<{
    id: string;
    companyName: string;
    contactPerson: string;
    totalReferrals: number;
    totalConversions: number;
    conversionRate: number;
    totalCommissionEarned: number;
    isVerified: boolean;
  }>;
  monthlyTrends: Array<{
    month: string;
    referrals: number;
    conversions: number;
    commissions: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PartnerAnalytics() {
  const queryClient = useQueryClient();

  const { data: analytics, isLoading, error, refetch } = usePartnerAnalytics();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/partners/analytics"] });
    await refetch();
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
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
          Failed to load partner analytics. Please try again later.
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
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics || analytics.systemStats.totalPartners === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Partner Analytics</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            There are no partners in the system yet. Analytics will appear once partners register and start referring students.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Partner Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            System-wide overview of partner performance and referral metrics
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

      {/* System-wide KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.systemStats.totalPartners)}</div>
            <div className="flex gap-2 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-green-600" />
                {formatNumber(analytics.systemStats.verifiedPartners)} verified
              </span>
              <span className="flex items-center gap-1">
                <UserX className="h-3 w-3 text-orange-600" />
                {formatNumber(analytics.systemStats.pendingPartners)} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.systemStats.totalReferralsThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Total student referrals in current month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions This Month</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.systemStats.totalConversionsThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Referrals converted to paid subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.systemStats.totalCommissionsPaidThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Total commissions paid this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>
                Referrals and conversions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="referrals" 
                    stroke="#8884d8" 
                    name="Referrals"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#82ca9d" 
                    name="Conversions"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Conversion Funnel Chart */}
          {analytics.conversionFunnel && analytics.conversionFunnel.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  Student journey from click to conversion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.conversionFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={100} fontSize={12} />
                    <Tooltip 
                      formatter={(value: number, _name: string, props: any) => [
                        `${formatNumber(value)} (${formatPercentage(props?.payload?.percentage || 0)})`,
                        'Count'
                      ]}
                    />
                    <Bar dataKey="count" name="Count">
                      {analytics.conversionFunnel.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Performing Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Partners</CardTitle>
          <CardDescription>
            Partners ranked by total conversions and commission earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topPerformingPartners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No partner performance data available yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Referrals</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topPerformingPartners
                    .sort((a: any, b: any) => b.totalConversions - a.totalConversions)
                    .slice(0, 10)
                    .map((partner: any, index: number) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{partner.companyName}</TableCell>
                        <TableCell>{partner.contactPerson}</TableCell>
                        <TableCell className="text-right">{formatNumber(partner.totalReferrals)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatNumber(partner.totalConversions)}</TableCell>
                        <TableCell className="text-right">
                          <span className={partner.conversionRate >= 20 ? "text-green-600 font-medium" : ""}>
                            {formatPercentage(partner.conversionRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(partner.totalCommissionEarned)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.isVerified ? "default" : "secondary"}>
                            {partner.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Referral Links</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(analytics.systemStats.activeReferralLinks)}</p>
              </div>
              <LinkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive Partners</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(analytics.systemStats.inactivePartners)}</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Conversion Rate</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.topPerformingPartners.length > 0
                    ? formatPercentage(
                        analytics.topPerformingPartners.reduce((sum: number, p: any) => sum + p.conversionRate, 0) / 
                        analytics.topPerformingPartners.length
                      )
                    : "0%"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
