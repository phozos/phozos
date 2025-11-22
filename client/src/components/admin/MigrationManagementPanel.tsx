import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useMigrations,
  useCreateMigration,
  useStartMigration,
  useCancelMigration,
} from "@/hooks/plan-versioning-hooks";
import { useApiQuery } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, Play, XCircle } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency?: string;
}

interface Migration {
  id: string;
  name: string;
  fromPlanId: string;
  toPlanId: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  targetUserCount: number;
  migratedCount: number;
  scheduledFor: string | null;
  completedAt: string | null;
  createdAt: string;
  fromPlan: { id: string; name: string; };
  toPlan: { id: string; name: string; };
}

const migrationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  fromPlanId: z.string().min(1, "Source plan is required"),
  toPlanId: z.string().min(1, "Target plan is required"),
  scheduledFor: z.string().optional(),
  description: z.string().max(500).optional(),
});

type MigrationFormData = z.infer<typeof migrationSchema>;

function CreateMigrationForm({ 
  plans, 
  onSuccess 
}: { 
  plans: SubscriptionPlan[]; 
  onSuccess: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MigrationFormData>({
    resolver: zodResolver(migrationSchema),
    defaultValues: {
      name: "",
      fromPlanId: "",
      toPlanId: "",
      scheduledFor: "",
      description: "",
    }
  });

  const createMutation = useCreateMigration();

  const onSubmit = (data: MigrationFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        onSuccess();
        toast({ 
          title: "Success", 
          description: "Migration created successfully" 
        });
      }
    });
  };

  const fromPlanId = form.watch("fromPlanId");
  const availableToPlan = plans.filter(p => p.id !== fromPlanId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Migration</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Migration Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Basic to Premium Migration Q1 2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromPlanId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Plan *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source plan..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.currency || 'INR'} {p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toPlanId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Plan *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target plan..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableToPlan.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.currency || 'INR'} {p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduledFor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Leave empty to create as draft
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes about this migration..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Migration"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function MigrationCard({ migration }: { migration: Migration }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startMutation = useStartMigration();
  const cancelMutation = useCancelMigration();

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      draft: { className: "bg-gray-100 text-gray-800", label: "Draft" },
      scheduled: { className: "bg-blue-100 text-blue-800", label: "Scheduled" },
      in_progress: { className: "bg-yellow-100 text-yellow-800", label: "In Progress" },
      completed: { className: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { className: "bg-red-100 text-red-800", label: "Cancelled" }
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleStart = () => {
    startMutation.mutate(migration.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        toast({ 
          title: "Success", 
          description: "Migration started successfully" 
        });
      }
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(migration.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        toast({ 
          title: "Success", 
          description: "Migration cancelled successfully" 
        });
      }
    });
  };

  const progress = migration.targetUserCount > 0
    ? (migration.migratedCount / migration.targetUserCount) * 100
    : 0;

  const canStart = migration.status === 'draft' || migration.status === 'scheduled';
  const canCancel = migration.status === 'draft' || migration.status === 'scheduled' || migration.status === 'in_progress';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{migration.name}</CardTitle>
            <CardDescription>
              {migration.fromPlan.name} → {migration.toPlan.name}
            </CardDescription>
          </div>
          {getStatusBadge(migration.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {migration.migratedCount} / {migration.targetUserCount}
              </span>
            </div>
            <Progress value={progress} />
          </div>

          {migration.scheduledFor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Scheduled for {format(new Date(migration.scheduledFor), 'MMM d, yyyy')}
            </div>
          )}

          {migration.completedAt && (
            <div className="text-sm text-muted-foreground">
              Completed on {format(new Date(migration.completedAt), 'MMM d, yyyy')}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {canStart && (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={startMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MigrationManagementPanel() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: migrations = [], isLoading } = useMigrations();
  const { data: plans = [] } = useApiQuery<SubscriptionPlan[]>(
    ["/api/admin/subscription-plans"],
    '/api/admin/subscription-plans'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plan Migrations</h2>
          <p className="text-muted-foreground">
            Manage subscriber migrations between plans
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Migration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateMigrationForm 
              plans={plans} 
              onSuccess={() => setCreateDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : migrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No migrations created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(migrations as Migration[]).map(migration => (
            <MigrationCard key={migration.id} migration={migration} />
          ))}
        </div>
      )}
    </div>
  );
}
