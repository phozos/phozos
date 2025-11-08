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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Mail, HelpCircle } from "lucide-react";
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
}).refine((data) => data.newPrice !== undefined, {
  message: "New price is required",
  path: ["newPrice"],
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
      newPrice: undefined as any,
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifySubscribers: true,
      changeReason: ""
    }
  });

  const priceUpdateMutation = useCreatePriceVersion();

  const onSubmit = (data: PriceUpdateFormData) => {
    if (!plan) return;
    
    // Validate that the new price is different from the current price
    const currentPrice = parseFloat(plan.price);
    if (data.newPrice === currentPrice) {
      toast({
        title: "Invalid Price Update",
        description: "New price must be different from current price",
        variant: "destructive"
      });
      return;
    }
    
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
  const priceDiff = newPrice && oldPrice ? newPrice - oldPrice : 0;
  const priceChange = newPrice && oldPrice && newPrice !== oldPrice 
    ? ((newPrice - oldPrice) / oldPrice * 100).toFixed(1) 
    : "0";
  const isIncrease = priceDiff > 0;
  const isDecrease = priceDiff < 0;
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

        <TooltipProvider>
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
                      className={
                        newPrice && oldPrice && newPrice !== oldPrice
                          ? isIncrease 
                            ? "border-orange-500 focus-visible:ring-orange-500" 
                            : "border-green-500 focus-visible:ring-green-500"
                          : ""
                      }
                    />
                  </FormControl>
                  {newPrice && oldPrice && newPrice !== oldPrice && (
                    <FormDescription className={isIncrease ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>
                      {isIncrease ? "↑ Increase" : "↓ Decrease"} of {Math.abs(parseFloat(priceChange))}% 
                      ({isIncrease ? "+" : ""}{plan.currency || 'INR'} {Math.abs(priceDiff).toFixed(2)})
                    </FormDescription>
                  )}
                  {newPrice && oldPrice && newPrice === oldPrice && (
                    <FormDescription className="text-yellow-600 dark:text-yellow-400">
                      ⚠️ New price is the same as current price
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
                  <div className="flex items-center gap-2">
                    <FormLabel>Effective Date *</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The date when this new price version becomes active for new subscriptions. Existing subscribers keep their current price (grandfathering). Recommended: Set at least 30 days in advance.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Send notification emails to existing subscribers
                      </FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>If checked, all existing subscribers will receive an email notification about the price update. They will be reassured that their current price is protected (grandfathered) and won't change.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="submit" disabled={priceUpdateMutation.isPending}>
                    {priceUpdateMutation.isPending ? "Creating..." : "Create New Version"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Creates a new price version while preserving existing subscribers' current pricing</p>
                </TooltipContent>
              </Tooltip>
            </DialogFooter>
          </form>
        </Form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
