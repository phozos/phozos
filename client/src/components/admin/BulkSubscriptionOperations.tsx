import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  Users,
  GitBranch,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileDown,
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  tierLevel: number;
}

interface BulkOperationResult {
  userId: string;
  email: string;
  success: boolean;
  error?: string;
}

interface BulkMigrationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: BulkOperationResult[];
}

interface BulkCancellationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: BulkOperationResult[];
}

interface BulkSubscriptionOperationsProps {
  plans: SubscriptionPlan[];
}

// Validation schemas
const bulkMigrationSchema = z.object({
  sourcePlanId: z.string().uuid("Invalid source plan ID"),
  targetPlanId: z.string().uuid("Invalid target plan ID"),
  userIds: z
    .string()
    .min(1, "User IDs are required")
    .transform((val) => val.split(/[\n,]/).map((id) => id.trim()).filter(Boolean))
    .refine(
      (ids) => ids.length > 0,
      "At least one user ID is required"
    )
    .refine(
      (ids) => ids.length <= 100,
      "Maximum 100 users can be migrated at once"
    )
    .refine(
      (ids) => ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)),
      "All user IDs must be valid UUIDs"
    ),
}).refine((data) => data.sourcePlanId !== data.targetPlanId, {
  message: "Source and target plans must be different",
  path: ["targetPlanId"],
});

const bulkCancellationSchema = z.object({
  userIds: z
    .string()
    .min(1, "User IDs are required")
    .transform((val) => val.split(/[\n,]/).map((id) => id.trim()).filter(Boolean))
    .refine(
      (ids) => ids.length > 0,
      "At least one user ID is required"
    )
    .refine(
      (ids) => ids.length <= 100,
      "Maximum 100 users can be cancelled at once"
    )
    .refine(
      (ids) => ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)),
      "All user IDs must be valid UUIDs"
    ),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must not exceed 500 characters"),
});

const exportSchema = z.object({
  planId: z.string().optional(),
  status: z.string().optional(),
  format: z.literal("csv").default("csv"),
});

type BulkMigrationFormData = z.infer<typeof bulkMigrationSchema>;
type BulkCancellationFormData = z.infer<typeof bulkCancellationSchema>;
type ExportFormData = z.infer<typeof exportSchema>;

export default function BulkSubscriptionOperations({ plans }: BulkSubscriptionOperationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [migrationResults, setMigrationResults] = useState<BulkMigrationResult | null>(null);
  const [cancellationResults, setCancellationResults] = useState<BulkCancellationResult | null>(null);
  const [migrationConfirmDialog, setMigrationConfirmDialog] = useState(false);
  const [cancellationConfirmDialog, setCancellationConfirmDialog] = useState(false);
  const [pendingMigrationData, setPendingMigrationData] = useState<any>(null);
  const [pendingCancellationData, setPendingCancellationData] = useState<any>(null);

  // Migration form
  const migrationForm = useForm<BulkMigrationFormData>({
    resolver: zodResolver(bulkMigrationSchema),
    defaultValues: {
      sourcePlanId: "",
      targetPlanId: "",
      userIds: "",
    },
  });

  // Cancellation form
  const cancellationForm = useForm<BulkCancellationFormData>({
    resolver: zodResolver(bulkCancellationSchema),
    defaultValues: {
      userIds: "",
      reason: "",
    },
  });

  // Export form
  const exportForm = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      planId: "",
      status: "",
      format: "csv",
    },
  });

  // Mutations
  const migrationMutation = useApiMutation(
    async (data: { sourcePlanId: string; targetPlanId: string; userIds: string[] }) =>
      api.post("/api/admin/subscriptions/bulk-migrate", data),
    {
      onSuccess: (data: BulkMigrationResult) => {
        setMigrationResults(data);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
        toast({
          title: "Migration Complete",
          description: `${data.successful} successful, ${data.failed} failed out of ${data.totalProcessed} users`,
        });
        migrationForm.reset();
      },
    }
  );

  const cancellationMutation = useApiMutation(
    async (data: { userIds: string[]; reason: string }) =>
      api.post("/api/admin/subscriptions/bulk-cancel", data),
    {
      onSuccess: (data: BulkCancellationResult) => {
        setCancellationResults(data);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
        toast({
          title: "Cancellation Complete",
          description: `${data.successful} successful, ${data.failed} failed out of ${data.totalProcessed} users`,
        });
        cancellationForm.reset();
      },
    }
  );

  const exportMutation = useApiMutation(
    async (data: ExportFormData) => {
      const params = new URLSearchParams();
      if (data.planId) params.append("planId", data.planId);
      if (data.status) params.append("status", data.status);
      params.append("format", data.format);

      const response = await fetch(`/api/admin/subscriptions/export?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    },
    {
      onSuccess: () => {
        toast({
          title: "Export Complete",
          description: "Subscriber data has been downloaded",
        });
      },
    }
  );

  // Form handlers
  const onMigrationSubmit = (data: BulkMigrationFormData) => {
    setPendingMigrationData(data);
    setMigrationConfirmDialog(true);
  };

  const confirmMigration = () => {
    if (pendingMigrationData) {
      migrationMutation.mutate(pendingMigrationData);
      setMigrationConfirmDialog(false);
      setPendingMigrationData(null);
    }
  };

  const onCancellationSubmit = (data: BulkCancellationFormData) => {
    setPendingCancellationData(data);
    setCancellationConfirmDialog(true);
  };

  const confirmCancellation = () => {
    if (pendingCancellationData) {
      cancellationMutation.mutate(pendingCancellationData);
      setCancellationConfirmDialog(false);
      setPendingCancellationData(null);
    }
  };

  const onExportSubmit = (data: ExportFormData) => {
    exportMutation.mutate(data);
  };

  // Helper to parse CSV file
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      // Remove header if present
      const userIds = lines
        .filter((line) => !line.toLowerCase().includes("user") && !line.toLowerCase().includes("id"))
        .join("\n");
      field.onChange(userIds);
    };
    reader.readAsText(file);
  };

  const sourcePlan = plans.find((p) => p.id === migrationForm.watch("sourcePlanId"));
  const targetPlan = plans.find((p) => p.id === migrationForm.watch("targetPlanId"));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Operations</h2>
        <p className="text-muted-foreground">
          Perform bulk operations on subscriptions for administrative tasks
        </p>
      </div>

      <Tabs defaultValue="migration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="migration">
            <GitBranch className="h-4 w-4 mr-2" />
            Migration
          </TabsTrigger>
          <TabsTrigger value="cancellation">
            <XCircle className="h-4 w-4 mr-2" />
            Cancellation
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* Migration Tab */}
        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Migration</CardTitle>
              <CardDescription>
                Migrate multiple users from one subscription plan to another
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This will update all active subscriptions for the selected users from the
                  source plan to the target plan. Make sure you have selected the correct
                  plans before proceeding.
                </AlertDescription>
              </Alert>

              <Form {...migrationForm}>
                <form onSubmit={migrationForm.handleSubmit(onMigrationSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={migrationForm.control}
                      name="sourcePlanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Plan *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} ({plan.currency} {plan.price})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={migrationForm.control}
                      name="targetPlanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Plan *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} ({plan.currency} {plan.price})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {sourcePlan && targetPlan && sourcePlan.id !== targetPlan.id && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <div className="font-medium">{sourcePlan.name}</div>
                          <div className="text-muted-foreground">
                            {sourcePlan.currency} {sourcePlan.price}
                          </div>
                        </div>
                        <GitBranch className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{targetPlan.name}</div>
                          <div className="text-muted-foreground">
                            {targetPlan.currency} {targetPlan.price}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={migrationForm.control}
                    name="userIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User IDs *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter user IDs (one per line or comma-separated)&#10;e.g.&#10;123e4567-e89b-12d3-a456-426614174000&#10;223e4567-e89b-12d3-a456-426614174001"
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter up to 100 user IDs, one per line or comma-separated. Or{" "}
                          <label className="text-primary cursor-pointer hover:underline">
                            upload CSV file
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, field)}
                            />
                          </label>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={migrationMutation.isPending}
                    className="w-full"
                  >
                    {migrationMutation.isPending ? (
                      <>Processing Migration...</>
                    ) : (
                      <>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Migrate Users
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {migrationMutation.isPending && (
                <div className="mt-4">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing migration in batches...
                  </p>
                </div>
              )}

              {migrationResults && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Migration Results</div>
                      <div className="text-xs text-muted-foreground">
                        {migrationResults.successful} successful, {migrationResults.failed} failed
                      </div>
                    </div>
                    <Badge variant={migrationResults.failed === 0 ? "default" : "destructive"}>
                      {Math.round(
                        (migrationResults.successful / migrationResults.totalProcessed) * 100
                      )}
                      % Success Rate
                    </Badge>
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {migrationResults.results.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {result.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {result.userId}
                            </TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell className="text-red-600 text-xs">
                              {result.error || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancellation Tab */}
        <TabsContent value="cancellation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Cancellation</CardTitle>
              <CardDescription>
                Cancel active subscriptions for multiple users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action will cancel all active subscriptions for the selected users.
                  This operation cannot be undone. Make sure you have entered the correct
                  user IDs and reason for cancellation.
                </AlertDescription>
              </Alert>

              <Form {...cancellationForm}>
                <form onSubmit={cancellationForm.handleSubmit(onCancellationSubmit)} className="space-y-4">
                  <FormField
                    control={cancellationForm.control}
                    name="userIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User IDs *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter user IDs (one per line or comma-separated)&#10;e.g.&#10;123e4567-e89b-12d3-a456-426614174000&#10;223e4567-e89b-12d3-a456-426614174001"
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter up to 100 user IDs, one per line or comma-separated. Or{" "}
                          <label className="text-primary cursor-pointer hover:underline">
                            upload CSV file
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, field)}
                            />
                          </label>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={cancellationForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Reason *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter reason for bulk cancellation (e.g., Policy violation, Service termination, etc.)"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a clear reason for cancellation (10-500 characters)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={cancellationMutation.isPending}
                    className="w-full"
                  >
                    {cancellationMutation.isPending ? (
                      <>Processing Cancellation...</>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Subscriptions
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {cancellationMutation.isPending && (
                <div className="mt-4">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing cancellations in batches...
                  </p>
                </div>
              )}

              {cancellationResults && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Cancellation Results</div>
                      <div className="text-xs text-muted-foreground">
                        {cancellationResults.successful} successful, {cancellationResults.failed}{" "}
                        failed
                      </div>
                    </div>
                    <Badge
                      variant={cancellationResults.failed === 0 ? "default" : "destructive"}
                    >
                      {Math.round(
                        (cancellationResults.successful / cancellationResults.totalProcessed) * 100
                      )}
                      % Success Rate
                    </Badge>
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cancellationResults.results.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {result.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {result.userId}
                            </TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell className="text-red-600 text-xs">
                              {result.error || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Subscribers</CardTitle>
              <CardDescription>
                Download subscriber data as CSV for analysis or backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...exportForm}>
                <form onSubmit={exportForm.handleSubmit(onExportSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={exportForm.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Filter (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="All plans" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">All plans</SelectItem>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Filter by specific subscription plan
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={exportForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Filter (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">All statuses</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Filter by subscription status
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Alert>
                    <FileDown className="h-4 w-4" />
                    <AlertTitle>Export Format</AlertTitle>
                    <AlertDescription>
                      The CSV file will include: User ID, Email, Name, Plan Name, Price,
                      Status, Started At, Expires At, Amount Paid, and more.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    disabled={exportMutation.isPending}
                    className="w-full"
                  >
                    {exportMutation.isPending ? (
                      <>Generating Export...</>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Migration Confirmation Dialog */}
      <AlertDialog open={migrationConfirmDialog} onOpenChange={setMigrationConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Migration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to migrate{" "}
                <strong>
                  {pendingMigrationData?.userIds?.length || 0} user(s)
                </strong>{" "}
                from <strong>{sourcePlan?.name}</strong> to{" "}
                <strong>{targetPlan?.name}</strong>.
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This will update all active subscriptions for these users. The operation
                  will be processed in batches for safety.
                </AlertDescription>
              </Alert>
              <p className="text-sm">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMigration}>
              Yes, Migrate Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancellationConfirmDialog} onOpenChange={setCancellationConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Bulk Cancellation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to cancel subscriptions for{" "}
                <strong>
                  {pendingCancellationData?.userIds?.length || 0} user(s)
                </strong>
                .
              </p>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This action cannot be undone.</strong> All active subscriptions
                  for the selected users will be cancelled immediately.
                </AlertDescription>
              </Alert>
              <div className="bg-muted p-3 rounded-md text-sm">
                <strong>Reason:</strong> {pendingCancellationData?.reason}
              </div>
              <p className="text-sm">Are you absolutely sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancellation}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Subscriptions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
