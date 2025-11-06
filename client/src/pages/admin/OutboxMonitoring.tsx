import { useState, useEffect } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "recharts";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Search,
  XCircle,
  Database,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface OutboxMetrics {
  outbox_pending_events: number;
  outbox_processing_lag: number;
  outbox_dlq_count: number;
  outbox_retry_count: number;
  outbox_throughput: number;
  worker_health: boolean;
}

interface OutboxEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  eventType: string;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: any;
  status: string;
  retries: number;
  nextRetryAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface OutboxEventsResponse {
  events: OutboxEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function OutboxMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [previousDlqCount, setPreviousDlqCount] = useState<number>(0);
  const [dlqIncreaseDetected, setDlqIncreaseDetected] = useState<boolean>(false);

  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useApiQuery<OutboxMetrics>(
    ["/api/admin/outbox/metrics"],
    '/api/admin/outbox/metrics',
    undefined,
    { 
      enabled: !authLoading && isAdmin,
      refetchInterval: 5000,
    }
  );

  const eventsQueryParams = new URLSearchParams();
  if (statusFilter !== 'all') eventsQueryParams.set('status', statusFilter);
  if (searchQuery) eventsQueryParams.set('search', searchQuery);
  eventsQueryParams.set('page', page.toString());
  eventsQueryParams.set('limit', '20');

  const eventsUrl = `/api/admin/outbox/events?${eventsQueryParams.toString()}`;

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useApiQuery<OutboxEventsResponse>(
    ["/api/admin/outbox/events", statusFilter, searchQuery, page],
    eventsUrl,
    undefined,
    { enabled: !authLoading && isAdmin }
  );

  const retryMutation = useApiMutation<{ message: string }, string>(
    async (eventId: string) => {
      const response = await api.post(`/api/admin/outbox/events/${eventId}/retry`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Event queued for retry",
        });
        refetchEvents();
        refetchMetrics();
      },
    }
  );

  const deleteMutation = useApiMutation<{ message: string }, string>(
    async (eventId: string) => {
      const response = await api.delete(`/api/admin/outbox/events/${eventId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Event deleted successfully",
        });
        refetchEvents();
        refetchMetrics();
      },
    }
  );

  useEffect(() => {
    if (metricsData && previousDlqCount > 0) {
      const increase = metricsData.outbox_dlq_count - previousDlqCount;
      if (increase >= 10) {
        setDlqIncreaseDetected(true);
        setTimeout(() => setDlqIncreaseDetected(false), 30000);
      }
    }
    if (metricsData) {
      setPreviousDlqCount(metricsData.outbox_dlq_count);
    }
  }, [metricsData?.outbox_dlq_count]);

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

  const isLoading = metricsLoading;
  const metrics = metricsData;

  const hasHighPending = (metrics?.outbox_pending_events || 0) > 1000;
  const hasHighLag = (metrics?.outbox_processing_lag || 0) > 60;
  const hasDlqIncrease = dlqIncreaseDetected;

  const statusChartData = [
    { name: 'Pending', value: metrics?.outbox_pending_events || 0, color: COLORS[2] },
    { name: 'DLQ', value: metrics?.outbox_dlq_count || 0, color: COLORS[3] },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Outbox Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and manage the subscription audit outbox event queue
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {(hasHighPending || hasHighLag || hasDlqIncrease) && (
                <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <AlertTriangle className="w-5 h-5" />
                      Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {hasHighPending && (
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span>High pending events: {metrics?.outbox_pending_events} events waiting</span>
                      </div>
                    )}
                    {hasHighLag && (
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <Clock className="w-4 h-4" />
                        <span>Processing lag: {metrics?.outbox_processing_lag}s since oldest event</span>
                      </div>
                    )}
                    {hasDlqIncrease && (
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <TrendingUp className="w-4 h-4" />
                        <span>DLQ increased by 10+ events recently</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Worker Health</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {metrics?.worker_health ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-2xl font-bold text-green-500">Running</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-2xl font-bold text-red-500">Stopped</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Events</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.outbox_pending_events || 0}</div>
                    <p className="text-xs text-muted-foreground">Events awaiting processing</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Processing Lag</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.outbox_processing_lag || 0}s</div>
                    <p className="text-xs text-muted-foreground">Time since oldest pending</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">DLQ Count</CardTitle>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">{metrics?.outbox_dlq_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Failed events</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Retry Count (1h)</CardTitle>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.outbox_retry_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Retries in last hour</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.outbox_throughput || 0}</div>
                    <p className="text-xs text-muted-foreground">Events/min (last hour)</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Status</CardTitle>
                  <CardDescription>Current distribution of events</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6">
                        {statusChartData.map((entry, index) => (
                          <cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Outbox Events</CardTitle>
                  <CardDescription>View and manage outbox events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by subscription or user ID..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                          }}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed (DLQ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {eventsLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Event Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Subscription ID</TableHead>
                              <TableHead>Retries</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Error</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {eventsData?.events && eventsData.events.length > 0 ? (
                              eventsData.events.map((event) => (
                                <TableRow key={event.id}>
                                  <TableCell className="font-medium">{event.eventType}</TableCell>
                                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                                  <TableCell className="font-mono text-xs">{event.userId.substring(0, 8)}...</TableCell>
                                  <TableCell className="font-mono text-xs">{event.subscriptionId.substring(0, 8)}...</TableCell>
                                  <TableCell>{event.retries}</TableCell>
                                  <TableCell className="text-xs">
                                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate text-xs text-red-500">
                                    {event.errorMessage || '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {event.status === 'failed' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => retryMutation.mutate(event.id)}
                                            disabled={retryMutation.isPending}
                                          >
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Retry
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                              if (confirm('Are you sure you want to delete this event?')) {
                                                deleteMutation.mutate(event.id);
                                              }
                                            }}
                                            disabled={deleteMutation.isPending}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  No events found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {eventsData?.pagination && eventsData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Page {eventsData.pagination.page} of {eventsData.pagination.totalPages} ({eventsData.pagination.total} total events)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page + 1)}
                              disabled={page === eventsData.pagination.totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
