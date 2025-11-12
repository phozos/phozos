import { useState, useMemo } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import {
  useProcessBankPayout,
  useProcessPaypalPayout,
  useCompletePayout,
  useCancelPayout,
} from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  CreditCard,
  DollarSign,
  Building2,
  Mail,
  Ban,
  RefreshCw,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import type { PayoutWithCommissions } from "@shared/types/partner-types";

type StatusFilter = "all" | "pending" | "processing" | "completed" | "failed" | "cancelled";

export default function PayoutProcessing() {
  const { toast } = useToast();
  const { data: payouts = [], isLoading } = useApiQuery<PayoutWithCommissions[]>(
    ["/api/admin/payouts"],
    "/api/admin/payouts",
    undefined,
    { staleTime: 30 * 1000 }
  );

  const processBankMutation = useProcessBankPayout();
  const processPaypalMutation = useProcessPaypalPayout();
  const completeMutation = useCompletePayout();
  const cancelMutation = useCancelPayout();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewingPayout, setViewingPayout] = useState<PayoutWithCommissions | null>(null);
  const [processingPayout, setProcessingPayout] = useState<PayoutWithCommissions | null>(null);
  const [processingMethod, setProcessingMethod] = useState<"bank" | "paypal" | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [completingPayout, setCompletingPayout] = useState<PayoutWithCommissions | null>(null);
  const [cancellingPayout, setCancellingPayout] = useState<PayoutWithCommissions | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // Filter payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      // Status filter
      if (statusFilter !== "all" && payout.status !== statusFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const payoutIdMatch = payout.id.toLowerCase().includes(query);
        return payoutIdMatch;
      }

      return true;
    });
  }, [payouts, statusFilter, searchQuery]);

  const handleProcessPayout = async () => {
    if (!processingPayout || !processingMethod) return;

    const mutation =
      processingMethod === "bank" ? processBankMutation : processPaypalMutation;

    mutation.mutate(
      { payoutId: processingPayout.id, referenceId: transactionReference },
      {
        onSuccess: () => {
          setProcessingPayout(null);
          setProcessingMethod(null);
          setTransactionReference("");
        },
      }
    );
  };

  const handleCompletePayout = async () => {
    if (!completingPayout) return;

    completeMutation.mutate(completingPayout.id, {
      onSuccess: () => {
        setCompletingPayout(null);
      },
    });
  };

  const handleCancelPayout = async () => {
    if (!cancellingPayout) return;

    cancelMutation.mutate(
      { payoutId: cancellingPayout.id, reason: cancellationReason },
      {
        onSuccess: () => {
          setCancellingPayout(null);
          setCancellationReason("");
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500 gap-1">
            <Send className="w-3 h-3" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="gap-1">
            <Ban className="w-3 h-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  // Stats
  const stats = {
    total: payouts.length,
    pending: payouts.filter((p) => p.status === "pending").length,
    processing: payouts.filter((p) => p.status === "processing").length,
    completed: payouts.filter((p) => p.status === "completed").length,
    totalAmount: payouts.reduce((sum, p) => sum + p.payoutAmount, 0),
    pendingAmount: payouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.payoutAmount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppShell />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            Payout Processing
          </h1>
          <p className="text-muted-foreground mt-2">
            Process partner payout requests and manage transactions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Payouts</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.pendingAmount, "INR")}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <Send className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(stats.totalAmount, "INR")}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by payout ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="processing">Processing Only</SelectItem>
                    <SelectItem value="completed">Completed Only</SelectItem>
                    <SelectItem value="failed">Failed Only</SelectItem>
                    <SelectItem value="cancelled">Cancelled Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Payouts ({filteredPayouts.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton type="table" count={5} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Commissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                              ? "No payouts found matching your filters"
                              : "No payout requests yet"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {payout.id.slice(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-green-600">
                              {formatCurrency(payout.payoutAmount, "INR")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {payout.payoutMethod === "bank_transfer" ? (
                                <>
                                  <Building2 className="w-3 h-3" />
                                  Bank
                                </>
                              ) : (
                                <>
                                  <Mail className="w-3 h-3" />
                                  PayPal
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(payout.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(payout.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payout.commissions.length}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingPayout(payout)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {payout.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProcessingPayout(payout);
                                    setProcessingMethod(
                                      payout.payoutMethod === "bank_transfer" ? "bank" : "paypal"
                                    );
                                  }}
                                >
                                  Process
                                </Button>
                              )}
                              {payout.status === "processing" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => setCompletingPayout(payout)}
                                >
                                  Complete
                                </Button>
                              )}
                              {(payout.status === "pending" || payout.status === "processing") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => setCancellingPayout(payout)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Payout Dialog */}
        <Dialog open={!!viewingPayout} onOpenChange={() => setViewingPayout(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
              <DialogDescription>Complete information for this payout request</DialogDescription>
            </DialogHeader>

            {viewingPayout && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">{getStatusBadge(viewingPayout.status)}</div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Payout Amount</Label>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(viewingPayout.payoutAmount, "INR")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payout Method</Label>
                    <p className="font-medium capitalize">
                      {viewingPayout.payoutMethod.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Requested Date</Label>
                    <p className="font-medium">{formatDate(viewingPayout.createdAt)}</p>
                  </div>
                  {viewingPayout.completedAt && (
                    <div>
                      <Label className="text-muted-foreground">Completed Date</Label>
                      <p className="font-medium">{formatDate(viewingPayout.completedAt)}</p>
                    </div>
                  )}
                  {viewingPayout.referenceId && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Transaction Reference</Label>
                      <p className="font-mono text-sm">{viewingPayout.referenceId}</p>
                    </div>
                  )}
                </div>

                {viewingPayout.commissions.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-semibold mb-2 block">
                      Included Commissions ({viewingPayout.commissions.length})
                    </Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {viewingPayout.commissions.map((commission) => (
                        <div
                          key={commission.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{commission.studentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(commission.createdAt)}
                            </p>
                          </div>
                          <p className="font-bold text-green-600">
                            {formatCurrency(commission.commissionAmount, "INR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingPayout.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{viewingPayout.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingPayout(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Payout Dialog */}
        <Dialog
          open={!!processingPayout}
          onOpenChange={() => {
            setProcessingPayout(null);
            setProcessingMethod(null);
            setTransactionReference("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payout</DialogTitle>
              <DialogDescription>
                Enter the transaction details to process this payout
              </DialogDescription>
            </DialogHeader>

            {processingPayout && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">Payout Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(processingPayout.payoutAmount, "INR")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="reference">Transaction Reference / ID *</Label>
                  <Input
                    id="reference"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="Enter transaction reference number..."
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {processingMethod === "bank"
                      ? "Bank transfer reference or UTR number"
                      : "PayPal transaction ID"}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setProcessingPayout(null);
                  setProcessingMethod(null);
                  setTransactionReference("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessPayout}
                disabled={
                  !transactionReference.trim() ||
                  processBankMutation.isPending ||
                  processPaypalMutation.isPending
                }
              >
                {processBankMutation.isPending || processPaypalMutation.isPending
                  ? "Processing..."
                  : "Mark as Processing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Payout Dialog */}
        <AlertDialog open={!!completingPayout} onOpenChange={() => setCompletingPayout(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Payout</AlertDialogTitle>
              <AlertDialogDescription>
                Mark this payout as completed? The partner will receive{" "}
                <strong>{formatCurrency(completingPayout?.payoutAmount || 0, "INR")}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCompletePayout}
                className="bg-green-600 hover:bg-green-700"
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? "Completing..." : "Mark as Completed"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Payout Dialog */}
        <AlertDialog
          open={!!cancellingPayout}
          onOpenChange={() => {
            setCancellingPayout(null);
            setCancellationReason("");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Payout</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to cancel this payout request. Please provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
              <Textarea
                id="cancel-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancellationReason("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelPayout}
                className="bg-red-600 hover:bg-red-700"
                disabled={cancelMutation.isPending || !cancellationReason.trim()}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Payout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
