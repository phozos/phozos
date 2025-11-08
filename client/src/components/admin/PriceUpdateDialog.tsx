import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreatePriceVersion } from "@/hooks/plan-versioning-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Mail } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionPlan {
  id: string;
  basePlanId?: string;
  name: string;
  price: string;
  currency?: string;
}

interface PriceUpdateDialogProps {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const priceUpdateSchema = z.object({
  newPrice: z.number().positive("Price must be positive"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  notifySubscribers: z.boolean().default(true),
  changeReason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

type PriceUpdateFormData = z.infer<typeof priceUpdateSchema>;

export default function PriceUpdateDialog({ 
  plan, 
  open, 
  onOpenChange, 
  onSuccess 
}: PriceUpdateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PriceUpdateFormData>({
    resolver: zodResolver(priceUpdateSchema),
    defaultValues: {
      newPrice: plan ? parseFloat(plan.price) : 0,
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifySubscribers: true,
      changeReason: ""
    }
  });

  const priceUpdateMutation = useCreatePriceVersion();

  const onSubmit = (data: PriceUpdateFormData) => {
    if (!plan) return;
    
    priceUpdateMutation.mutate(
      { 
        basePlanId: plan.basePlanId || plan.id, 
        data 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
          onSuccess?.();
          onOpenChange(false);
          toast({ 
            title: "Success", 
            description: "Price update scheduled successfully" 
          });
        }
      }
    );
  };

  if (!plan) return null;

  const oldPrice = parseFloat(plan.price);
  const newPrice = form.watch("newPrice");
  const priceChange = newPrice && oldPrice ? ((newPrice - oldPrice) / oldPrice * 100).toFixed(1) : "0";
  const effectiveDate = form.watch("effectiveDate");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Plan Price</DialogTitle>
          <DialogDescription>
            Create a new version of {plan.name} with updated pricing
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-2xl font-bold">{plan.currency || 'INR'} {plan.price}</div>
            </div>

            <FormField
              control={form.control}
              name="newPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Price *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter new price"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  {newPrice && oldPrice && (
                    <FormDescription>
                      {newPrice > oldPrice ? "Increase" : "Decrease"} of {Math.abs(parseFloat(priceChange))}%
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    New subscribers will see the new price from this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Price adjustment due to increased operational costs..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be logged in the audit trail
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Notification Preview</AlertTitle>
              <AlertDescription className="mt-2 p-4 bg-muted rounded-md space-y-2">
                <div>
                  <strong>Subject:</strong>{" "}
                  {newPrice > oldPrice
                    ? `Price Update Notice: ${plan.name}`
                    : `Price Reduction: ${plan.name}`}
                </div>
                <div className="text-sm leading-relaxed">
                  We're writing to inform you of an upcoming price change for your{" "}
                  <strong>{plan.name}</strong> subscription. Effective{" "}
                  <strong>
                    {effectiveDate ? format(new Date(effectiveDate), 'MMM d, yyyy') : 'TBD'}
                  </strong>, 
                  the price will {newPrice > oldPrice ? "increase" : "decrease"} from{" "}
                  <strong>{plan.currency || 'INR'} {plan.price}</strong> to{" "}
                  <strong>{plan.currency || 'INR'} {newPrice || '0'}</strong>.
                </div>
                <div className="text-sm font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  Your current pricing of {plan.currency || 'INR'} {plan.price} is grandfathered and will NOT change.
                </div>
              </AlertDescription>
            </Alert>

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
                      Send notification emails to existing subscribers
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={priceUpdateMutation.isPending}>
                {priceUpdateMutation.isPending ? "Creating..." : "Create New Version"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
