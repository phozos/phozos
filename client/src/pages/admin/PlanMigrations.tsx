import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, Play, Ban, TrendingUp, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface PlanMigration {
  id: string;
  name: string;
  sourcePlanId: string;
  targetPlanId: string;
  migrationType: 'voluntary' | 'mandatory' | 'incentivized';
  startDate: string;
  endDate?: string;
  incentiveType?: 'discount' | 'free_months' | 'feature_upgrade';
  incentiveValue?: any;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  totalEligibleUsers: number;
  migratedUsers: number;
  declinedUsers: number;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  status: string;
}

export default function PlanMigrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sourcePlanId: '',
    targetPlanId: '',
    migrationType: 'voluntary',
    startDate: '',
    endDate: '',
    incentiveType: '',
    incentiveValue: ''
  });

  const { data: migrations, isLoading: loadingMigrations, refetch: refetchMigrations } = useApiQuery<PlanMigration[]>(
    ['admin-migrations', selectedStatus ?? ''],
    `/api/admin/migrations${selectedStatus ? `?status=${selectedStatus}` : ''}`
  );

  const { data: plans, isLoading: loadingPlans } = useApiQuery<SubscriptionPlan[]>(
    ['subscription-plans'],
    '/api/subscriptions/plans'
  );

  const createMigrationMutation = useApiMutation(
    async (payload: any) => api.post('/api/admin/migrations', payload),
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Migration created successfully",
        });
        setIsCreateDialogOpen(false);
        resetForm();
        refetchMigrations();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create migration",
          variant: "destructive",
        });
      }
    }
  );

  const startMigrationMutation = useApiMutation(
    async (id: string) => api.post(`/api/admin/migrations/${id}/start`),
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Migration started successfully",
        });
        refetchMigrations();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to start migration",
          variant: "destructive",
        });
      }
    }
  );

  const cancelMigrationMutation = useApiMutation(
    async ({ id, reason }: { id: string; reason?: string }) => 
      api.post(`/api/admin/migrations/${id}/cancel`, { reason }),
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Migration cancelled successfully",
        });
        refetchMigrations();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to cancel migration",
          variant: "destructive",
        });
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      sourcePlanId: '',
      targetPlanId: '',
      migrationType: 'voluntary',
      startDate: '',
      endDate: '',
      incentiveType: '',
      incentiveValue: ''
    });
  };

  const handleCreateMigration = async () => {
    const payload: any = {
      name: formData.name,
      sourcePlanId: formData.sourcePlanId,
      targetPlanId: formData.targetPlanId,
      migrationType: formData.migrationType,
      startDate: new Date(formData.startDate).toISOString(),
    };

    if (formData.endDate) {
      payload.endDate = new Date(formData.endDate).toISOString();
    }

    if (formData.incentiveType) {
      payload.incentiveType = formData.incentiveType;
      payload.incentiveValue = formData.incentiveValue ? JSON.parse(formData.incentiveValue) : null;
    }

    createMigrationMutation.mutate(payload);
  };

  const handleStartMigration = (id: string) => {
    if (confirm('Are you sure you want to start this migration? Users will be notified.')) {
      startMigrationMutation.mutate(id);
    }
  };

  const handleCancelMigration = (id: string) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      cancelMigrationMutation.mutate({ id, reason });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: 'secondary' as const, icon: AlertTriangle },
      active: { variant: 'default' as const, icon: Play },
      completed: { variant: 'default' as const, icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, icon: XCircle }
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getConversionRate = (migration: PlanMigration) => {
    if (migration.totalEligibleUsers === 0) return 0;
    return Math.round((migration.migratedUsers / migration.totalEligibleUsers) * 100);
  };

  if (user?.teamRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Plan Migrations</h1>
            <p className="text-muted-foreground">Manage user migrations between subscription plans</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Migration</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Plan Migration</DialogTitle>
                <DialogDescription>
                  Set up a new migration to move users from one plan to another
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Migration Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium v1 to v2 Migration"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sourcePlan">Source Plan</Label>
                    <Select
                      value={formData.sourcePlanId}
                      onValueChange={(value) => setFormData({ ...formData, sourcePlanId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans?.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="targetPlan">Target Plan</Label>
                    <Select
                      value={formData.targetPlanId}
                      onValueChange={(value) => setFormData({ ...formData, targetPlanId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans?.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="migrationType">Migration Type</Label>
                  <Select
                    value={formData.migrationType}
                    onValueChange={(value) => setFormData({ ...formData, migrationType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voluntary">Voluntary</SelectItem>
                      <SelectItem value="mandatory">Mandatory</SelectItem>
                      <SelectItem value="incentivized">Incentivized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {(formData.migrationType === 'incentivized') && (
                  <>
                    <div>
                      <Label htmlFor="incentiveType">Incentive Type</Label>
                      <Select
                        value={formData.incentiveType}
                        onValueChange={(value) => setFormData({ ...formData, incentiveType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select incentive" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="free_months">Free Months</SelectItem>
                          <SelectItem value="feature_upgrade">Feature Upgrade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="incentiveValue">Incentive Value (JSON)</Label>
                      <Input
                        id="incentiveValue"
                        value={formData.incentiveValue}
                        onChange={(e) => setFormData({ ...formData, incentiveValue: e.target.value })}
                        placeholder='{"percentage": 20} or {"months": 2}'
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleCreateMigration}
                  disabled={!formData.name || !formData.sourcePlanId || !formData.targetPlanId || !formData.startDate}
                  className="w-full"
                >
                  Create Migration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingMigrations || loadingPlans ? (
          <LoadingSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Active Migrations</CardTitle>
              <CardDescription>Track and manage ongoing plan migrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {migrations && migrations.length > 0 ? (
                    migrations.map((migration) => {
                      const conversionRate = getConversionRate(migration);
                      return (
                        <TableRow key={migration.id}>
                          <TableCell className="font-medium">{migration.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{migration.migrationType}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(migration.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{migration.migratedUsers} / {migration.totalEligibleUsers}</span>
                              </div>
                              <Progress 
                                value={(migration.migratedUsers / migration.totalEligibleUsers) * 100} 
                                className="h-2" 
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="font-semibold">{conversionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(migration.startDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {migration.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleStartMigration(migration.id)}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {migration.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelMigration(migration.id)}
                                >
                                  <Ban className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No migrations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
