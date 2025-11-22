import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminRefundRequests,
  useAdminRefundRequest,
  useApproveRefund,
  useRejectRefund,
  useProcessRefundManually,
  useRefundStatus,
} from "@/hooks/useAdminSubscriptionManagement";
import { Loader2, CheckCircle, XCircle, Eye, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RefundManagement() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: "pending",
    userId: "",
    page: 1,
    limit: 20,
  });
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: refundsData, isLoading } = useAdminRefundRequests(filters);
  const { data: selectedRefund } = useAdminRefundRequest(selectedRefundId || "");
  const { data: refundStatus } = useRefundStatus(selectedRefundId || "");
  const approveMutation = useApproveRefund();
  const rejectMutation = useRejectRefund();
  const processManuallyMutation = useProcessRefundManually();

  const handleViewDetails = (id: string) => {
    setSelectedRefundId(id);
    setShowModal(true);
    setAdminNotes("");
  };

  const handleApprove = async () => {
    if (!selectedRefundId) return;
    
    try {
      await approveMutation.mutateAsync({
        id: selectedRefundId,
        adminNotes: adminNotes || undefined,
      });
      toast({
        title: "Success",
        description: "Refund request approved and processing initiated",
      });
      setShowModal(false);
      setSelectedRefundId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve refund",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRefundId || !adminNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Admin notes are required for rejection",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await rejectMutation.mutateAsync({
        id: selectedRefundId,
        adminNotes,
      });
      toast({
        title: "Success",
        description: "Refund request rejected successfully",
      });
      setShowModal(false);
      setSelectedRefundId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject refund",
        variant: "destructive",
      });
    }
  };

  const handleProcessManually = async () => {
    if (!selectedRefundId) return;
    
    try {
      await processManuallyMutation.mutateAsync(selectedRefundId);
      toast({
        title: "Success",
        description: "Manual refund processing triggered",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund manually",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(parseFloat(amount) / 100);
  };

  const isEligibleForRefund = (requestedAt: string) => {
    const requestDate = new Date(requestedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Refund Management</h1>
        <p className="text-muted-foreground">
          Review and process subscription refund requests
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, userId: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Refund Requests
            {refundsData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({refundsData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : refundsData?.refunds?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No refund requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundsData?.refunds?.map((refund: any) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-medium">
                        {refund.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{refund.userId.substring(0, 8)}...</TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(refund.amount)}
                      </TableCell>
                      <TableCell>
                        {isEligibleForRefund(refund.requestedAt) ? (
                          <Badge variant="default">Eligible</Badge>
                        ) : (
                          <Badge variant="destructive">Outside Window</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(refund.status)}</TableCell>
                      <TableCell>
                        {format(new Date(refund.requestedAt), "PPp")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(refund.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
            <DialogDescription>
              Review and take action on this refund request
            </DialogDescription>
          </DialogHeader>
          {selectedRefund ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Refund ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedRefund.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRefund.status)}</div>
                </div>
                <div>
                  <Label className="font-semibold">User ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedRefund.userId}</p>
                </div>
                <div>
                  <Label className="font-semibold">Payment ID</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRefund.paymentId}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Refund Amount</Label>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {formatAmount(selectedRefund.amount)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Eligibility</Label>
                  <div className="mt-1">
                    {isEligibleForRefund(selectedRefund.requestedAt) ? (
                      <Badge variant="default">Within 2-Day Window</Badge>
                    ) : (
                      <Badge variant="destructive">Outside 2-Day Window</Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="font-semibold">Refund Reason</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRefund.reason}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Requested At</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedRefund.requestedAt), "PPpp")}
                  </p>
                </div>
                {selectedRefund.processedAt && (
                  <div>
                    <Label className="font-semibold">Processed At</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedRefund.processedAt), "PPpp")}
                    </p>
                  </div>
                )}
                {selectedRefund.razorpayRefundId && (
                  <div className="col-span-2">
                    <Label className="font-semibold">Razorpay Refund ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedRefund.razorpayRefundId}
                    </p>
                  </div>
                )}
              </div>

              {refundStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Razorpay Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label className="font-semibold">Status</Label>
                        <p className="text-muted-foreground">{refundStatus.status}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Razorpay Status</Label>
                        <p className="text-muted-foreground">
                          {refundStatus.razorpayStatus || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedRefund.status === "pending" && (
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin Notes (Optional for approval, Required for rejection)</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Enter notes about this decision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {selectedRefund.adminNotes && (
                <div className="space-y-2">
                  <Label className="font-semibold">Admin Notes</Label>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    {selectedRefund.adminNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedRefund?.status === "failed" && (
              <Button
                variant="outline"
                onClick={handleProcessManually}
                disabled={processManuallyMutation.isPending}
                className="w-full sm:w-auto"
              >
                {processManuallyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Manually
                  </>
                )}
              </Button>
            )}
            {selectedRefund?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve & Process
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
