import { useState, useMemo } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { useApproveCommissions, useRejectCommissions } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  DollarSign,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import type { CommissionWithDetails } from "@shared/types/partner-types";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function CommissionManagement() {
  const { toast } = useToast();
  const { data: commissions = [], isLoading } = useApiQuery<CommissionWithDetails[]>(
    ["/api/admin/commissions"],
    "/api/admin/commissions",
    undefined,
    { staleTime: 30 * 1000 }
  );

  const approveMutation = useApproveCommissions();
  const rejectMutation = useRejectCommissions();

  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewingCommission, setViewingCommission] = useState<CommissionWithDetails | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      // Status filter
      if (statusFilter !== "all" && commission.status !== statusFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const studentMatch = commission.referral.studentName.toLowerCase().includes(query);
        return studentMatch;
      }

      return true;
    });
  }, [commissions, statusFilter, searchQuery]);

  const pendingCommissions = filteredCommissions.filter((c) => c.status === "pending");

  // Selection handlers
  const toggleSelection = (commissionId: string) => {
    const newSelection = new Set(selectedCommissions);
    if (newSelection.has(commissionId)) {
      newSelection.delete(commissionId);
    } else {
      newSelection.add(commissionId);
    }
    setSelectedCommissions(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCommissions.size === pendingCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(pendingCommissions.map((c) => c.id)));
    }
  };

  const handleBulkApprove = async () => {
    const commissionIds = Array.from(selectedCommissions);
    approveMutation.mutate(
      { commissionIds },
      {
        onSuccess: () => {
          setSelectedCommissions(new Set());
          setShowApproveDialog(false);
        },
      }
    );
  };

  const handleBulkReject = async () => {
    const commissionIds = Array.from(selectedCommissions);
    rejectMutation.mutate(
      { commissionIds, reason: rejectReason },
      {
        onSuccess: () => {
          setSelectedCommissions(new Set());
          setShowRejectDialog(false);
          setRejectReason("");
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-blue-500 gap-1">
            <DollarSign className="w-3 h-3" />
            Paid
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Calendar className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  // Stats
  const stats = {
    total: commissions.length,
    pending: commissions.filter((c) => c.status === "pending").length,
    approved: commissions.filter((c) => c.status === "approved").length,
    rejected: commissions.filter((c) => c.status === "rejected").length,
    totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
    pendingAmount: commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.commissionAmount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppShell />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            Commission Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and approve partner commissions for student referrals
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
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
                <Calendar className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(stats.totalAmount, "INR")}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedCommissions.size > 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {selectedCommissions.size} commission{selectedCommissions.size > 1 ? "s" : ""}{" "}
                  selected
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCommissions(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject ({selectedCommissions.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve ({selectedCommissions.size})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name..."
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
                    <SelectItem value="approved">Approved Only</SelectItem>
                    <SelectItem value="rejected">Rejected Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Commissions ({filteredCommissions.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
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
                      {statusFilter === "all" || statusFilter === "pending" ? (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              pendingCommissions.length > 0 &&
                              selectedCommissions.size === pendingCommissions.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      ) : (
                        <TableHead className="w-12"></TableHead>
                      )}
                      <TableHead>Student</TableHead>
                      <TableHead>Payment Amount</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                              ? "No commissions found matching your filters"
                              : "No commissions to review yet"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {commission.status === "pending" && (
                              <Checkbox
                                checked={selectedCommissions.has(commission.id)}
                                onCheckedChange={() => toggleSelection(commission.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{commission.referral.studentName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {formatCurrency(commission.payment.amount, "INR")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-green-600">
                              {formatCurrency(commission.commissionAmount, "INR")}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(commission.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(commission.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {commission.approvedAt ? formatDate(commission.approvedAt) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingCommission(commission)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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

        {/* Commission Detail Dialog */}
        <Dialog open={!!viewingCommission} onOpenChange={() => setViewingCommission(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Commission Details</DialogTitle>
              <DialogDescription>
                Complete information for this commission
              </DialogDescription>
            </DialogHeader>

            {viewingCommission && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(viewingCommission.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Student Name</Label>
                    <p className="font-medium">{viewingCommission.referral.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Referral Status</Label>
                    <p className="font-medium capitalize">{viewingCommission.referral.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Amount</Label>
                    <p className="font-medium">
                      {formatCurrency(viewingCommission.payment.amount, "INR")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Commission Amount</Label>
                    <p className="font-bold text-green-600">
                      {formatCurrency(viewingCommission.commissionAmount, "INR")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Date</Label>
                    <p className="font-medium">{formatDate(viewingCommission.payment.paidAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created Date</Label>
                    <p className="font-medium">{formatDate(viewingCommission.createdAt)}</p>
                  </div>
                  {viewingCommission.approvedAt && (
                    <div>
                      <Label className="text-muted-foreground">Approved Date</Label>
                      <p className="font-medium">{formatDate(viewingCommission.approvedAt)}</p>
                    </div>
                  )}
                </div>

                {viewingCommission.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{viewingCommission.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingCommission(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Approve Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Commissions</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to approve <strong>{selectedCommissions.size}</strong> commission
                {selectedCommissions.size > 1 ? "s" : ""}. This action will mark them as approved
                and they will become eligible for payout.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending
                  ? "Approving..."
                  : `Approve ${selectedCommissions.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Reject Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Commissions</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to reject <strong>{selectedCommissions.size}</strong> commission
                {selectedCommissions.size > 1 ? "s" : ""}. Please provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="reject-reason">Reason for Rejection *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-700"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? "Rejecting..." : `Reject ${selectedCommissions.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
