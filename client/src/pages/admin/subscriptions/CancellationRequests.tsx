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
  useAdminCancellationRequests,
  useAdminCancellationRequest,
  useApproveCancellation,
  useRejectCancellation,
} from "@/hooks/useAdminSubscriptionManagement";
import { Loader2, CheckCircle, XCircle, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CancellationRequests() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: "pending",
    userId: "",
    page: 1,
    limit: 20,
  });
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requestsData, isLoading } = useAdminCancellationRequests(filters);
  const { data: selectedRequest } = useAdminCancellationRequest(selectedRequestId || "");
  const approveMutation = useApproveCancellation();
  const rejectMutation = useRejectCancellation();

  const handleViewDetails = (id: string) => {
    setSelectedRequestId(id);
    setShowModal(true);
    setAdminNotes("");
  };

  const handleApprove = async () => {
    if (!selectedRequestId) return;
    
    try {
      await approveMutation.mutateAsync({
        id: selectedRequestId,
        adminNotes: adminNotes || undefined,
      });
      toast({
        title: "Success",
        description: "Cancellation request approved successfully",
      });
      setShowModal(false);
      setSelectedRequestId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequestId || !adminNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Admin notes are required for rejection",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await rejectMutation.mutateAsync({
        id: selectedRequestId,
        adminNotes,
      });
      toast({
        title: "Success",
        description: "Cancellation request rejected successfully",
      });
      setShowModal(false);
      setSelectedRequestId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cancellation Requests</h1>
        <p className="text-muted-foreground">
          Review and manage user subscription cancellation requests
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
            Cancellation Requests
            {requestsData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({requestsData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requestsData?.requests?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No cancellation requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsData?.requests?.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{request.userId.substring(0, 8)}...</TableCell>
                      <TableCell>{request.subscriptionId.substring(0, 8)}...</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {request.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {format(new Date(request.requestedAt), "PPp")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cancellation Request Details</DialogTitle>
            <DialogDescription>
              Review and take action on this cancellation request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Request ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="font-semibold">User ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.userId}</p>
                </div>
                <div>
                  <Label className="font-semibold">Subscription ID</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.subscriptionId}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="font-semibold">Cancellation Reason</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRequest.reason}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Requested At</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedRequest.requestedAt), "PPpp")}
                  </p>
                </div>
                {selectedRequest.processedAt && (
                  <div>
                    <Label className="font-semibold">Processed At</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedRequest.processedAt), "PPpp")}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.status === "pending" && (
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

              {selectedRequest.adminNotes && (
                <div className="space-y-2">
                  <Label className="font-semibold">Admin Notes</Label>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    {selectedRequest.adminNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
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
                      Approve
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
