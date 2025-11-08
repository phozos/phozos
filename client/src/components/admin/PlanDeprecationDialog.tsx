import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDeprecatePlan } from "@/hooks/plan-versioning-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency?: string;
  isActive: boolean;
}

interface PlanDeprecationDialogProps {
  plan: SubscriptionPlan | null;
  availablePlans: SubscriptionPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const deprecationSchema = z.object({
  successorPlanId: z.string().nullable(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
  createMigration: z.boolean().default(false),
  notifySubscribers: z.boolean().default(true)
});

type DeprecationFormData = z.infer<typeof deprecationSchema>;

export default function PlanDeprecationDialog({ 
  plan, 
  availablePlans, 
  open, 
  onOpenChange, 
  onSuccess 
}: PlanDeprecationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DeprecationFormData>({
    resolver: zodResolver(deprecationSchema),
    defaultValues: {
      successorPlanId: null,
      reason: "",
      createMigration: false,
      notifySubscribers: true
    }
  });

  const deprecationMutation = useDeprecatePlan();

  const onSubmit = (data: DeprecationFormData) => {
    if (!plan) return;
    
    deprecationMutation.mutate(
      { 
        planId: plan.id, 
        data 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
          onSuccess?.();
          onOpenChange(false);
          toast({ 
            title: "Success", 
            description: "Plan deprecated successfully" 
          });
        }
      }
    );
  };

  if (!plan) return null;

  const successorOptions = availablePlans.filter(p => p.id !== plan.id && p.isActive);
  const hasSuccessor = !!form.watch("successorPlanId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Deprecate Plan
          </DialogTitle>
          <DialogDescription>
            Mark {plan.name} as deprecated. Existing subscribers can continue, but new subscriptions will be blocked.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Deprecating a plan will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Block new subscriptions to this plan</li>
                  <li>Allow existing subscribers to continue</li>
                  <li>Mark the plan as deprecated in analytics</li>
                  {form.watch("createMigration") && <li>Create a migration workflow to successor plan</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="successorPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Successor Plan (Optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a replacement plan..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {successorOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {p.currency || 'INR'} {p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Recommended replacement plan for existing subscribers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Deprecation *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Replacing with new tier structure to better align with customer needs..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be logged and may be shown to subscribers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasSuccessor && (
              <FormField
                control={form.control}
                name="createMigration"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Create migration workflow to successor plan
                      </FormLabel>
                      <FormDescription>
                        Allows you to plan and execute subscriber migrations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notifySubscribers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Notify existing subscribers about deprecation
                    </FormLabel>
                    <FormDescription>
                      Sends email notification with deprecation details
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={deprecationMutation.isPending}
              >
                {deprecationMutation.isPending ? "Deprecating..." : "Deprecate Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
