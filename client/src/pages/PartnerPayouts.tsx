import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePayoutHistory, useRequestPayout, usePendingCommissions } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Wallet, Plus, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { PayoutWithCommissions } from "@shared/types/partner-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";

const payoutRequestSchema = z.object({
  payoutMethod: z.enum(["bank_transfer", "paypal"], {
    required_error: "Please select a payout method",
  }),
  notes: z.string().max(500).optional(),
});

type PayoutRequestForm = z.infer<typeof payoutRequestSchema>;

export default function PartnerPayouts() {
  const { data: payouts = [], isLoading } = usePayoutHistory();
  const { data: pendingCommissions = [] } = usePendingCommissions();
  const requestPayoutMutation = useRequestPayout();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const form = useForm<PayoutRequestForm>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: {
      payoutMethod: "bank_transfer",
      notes: "",
    },
  });

  const approvedCommissions = pendingCommissions.filter(c => c.status === 'approved');
  const availableAmount = approvedCommissions.reduce(
    (sum, c) => sum + (c.commissionAmount || 0),
    0
  );
  const minPayoutAmount = 1000;

  const handleRequestPayout = async (data: PayoutRequestForm) => {
    const commissionIds = approvedCommissions.map(c => c.id);
    
    requestPayoutMutation.mutate(
      {
        commissionIds,
        payoutMethod: data.payoutMethod,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          setRequestDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { 
        label: "Pending", 
        variant: "secondary", 
        icon: <Clock className="w-3 h-3 mr-1" /> 
      },
      processing: { 
        label: "Processing", 
        variant: "default", 
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 
      },
      completed: { 
        label: "Completed", 
        variant: "default", 
        icon: <CheckCircle className="w-3 h-3 mr-1" /> 
      },
      failed: { 
        label: "Failed", 
        variant: "destructive", 
        icon: <XCircle className="w-3 h-3 mr-1" /> 
      },
      cancelled: { 
        label: "Cancelled", 
        variant: "outline", 
        icon: <XCircle className="w-3 h-3 mr-1" /> 
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <SEO 
        title="Payouts - Partner Dashboard"
        description="Request payouts and track payment history"
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
        <AppShell />
        
        <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Wallet className="w-8 h-8 mr-3 text-purple-600" />
                Payouts
              </h1>
              <p className="text-muted-foreground mt-2">
                Request payouts and track payment history
              </p>
            </div>
            <Button 
              onClick={() => setRequestDialogOpen(true)}
              disabled={availableAmount < minPayoutAmount}
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Available for Payout
                  </p>
                  <p className="text-4xl font-bold text-purple-600">
                    ₹{availableAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {approvedCommissions.length} approved commissions
                  </p>
                  {availableAmount < minPayoutAmount && (
                    <p className="text-sm text-amber-600 mt-2">
                      Minimum payout amount: ₹{minPayoutAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Wallet className="w-12 h-12 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No payout requests yet</p>
                  <p className="text-sm text-muted-foreground">
                    Request your first payout when you have approved commissions
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Commissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {payout.id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            ₹{payout.amount?.toLocaleString('en-IN') || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payout.payoutMethod === 'bank_transfer' ? 'Bank Transfer' : 'PayPal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payout.commissions?.length || 0} commissions
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          {payout.requestedAt ? format(new Date(payout.requestedAt), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {payout.completedAt ? format(new Date(payout.completedAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
              <DialogDescription>
                Submit a payout request for your approved commissions
              </DialogDescription>
            </DialogHeader>
            
            {availableAmount < minPayoutAmount ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Minimum payout amount is ₹{minPayoutAmount.toLocaleString('en-IN')}. 
                  You currently have ₹{availableAmount.toLocaleString('en-IN')} available.
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRequestPayout)} className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Amount to withdraw:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{availableAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From {approvedCommissions.length} approved commission{approvedCommissions.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="payoutMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payout Method *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payout method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how you want to receive payment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional information..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertDescription className="text-sm">
                      Your payout request will be reviewed by our team. Processing typically takes 3-5 business days.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={requestPayoutMutation.isPending}>
                      {requestPayoutMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
