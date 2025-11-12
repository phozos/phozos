import { useState, useMemo } from "react";
import { useAllPartners, useVerifyPartner, useDeactivatePartner } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  Eye,
  Ban,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Globe,
  TrendingUp,
  UserCheck,
  UserX,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PartnerWithUser } from "@shared/types/partner-types";

type StatusFilter = "all" | "verified" | "pending" | "inactive";

export default function PartnerManagement() {
  const { toast } = useToast();
  const { data: partners = [], isLoading } = useAllPartners();
  const verifyMutation = useVerifyPartner();
  const deactivateMutation = useDeactivatePartner();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithUser | null>(null);
  const [verifyingPartner, setVerifyingPartner] = useState<PartnerWithUser | null>(null);
  const [deactivatingPartner, setDeactivatingPartner] = useState<PartnerWithUser | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      // Status filter
      if (statusFilter === "verified" && !partner.isVerified) return false;
      if (statusFilter === "pending" && partner.isVerified) return false;
      if (statusFilter === "inactive" && partner.isActive) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const companyMatch = partner.companyName?.toLowerCase().includes(query);
        const emailMatch = partner.user.email.toLowerCase().includes(query);
        const contactMatch = partner.contactPerson?.toLowerCase().includes(query);
        return companyMatch || emailMatch || contactMatch;
      }

      return true;
    });
  }, [partners, statusFilter, searchQuery]);

  const handleVerify = async () => {
    if (!verifyingPartner) return;

    verifyMutation.mutate(verifyingPartner.id, {
      onSuccess: () => {
        setVerifyingPartner(null);
      },
    });
  };

  const handleDeactivate = async () => {
    if (!deactivatingPartner) return;

    deactivateMutation.mutate(
      { partnerId: deactivatingPartner.id, reason: deactivationReason },
      {
        onSuccess: () => {
          setDeactivatingPartner(null);
          setDeactivationReason("");
        },
      }
    );
  };

  const getStatusBadge = (partner: PartnerWithUser) => {
    if (!partner.isActive) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="w-3 h-3" />
          Inactive
        </Badge>
      );
    }
    if (partner.isVerified) {
      return (
        <Badge className="bg-green-500 gap-1">
          <CheckCircle className="w-3 h-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  };

  // Stats cards
  const stats = {
    total: partners.length,
    verified: partners.filter((p) => p.isVerified).length,
    pending: partners.filter((p) => !p.isVerified && p.isActive).length,
    inactive: partners.filter((p) => !p.isActive).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppShell />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            Partner Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage partner accounts, verifications, and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Partners</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <Ban className="w-8 h-8 text-red-500" />
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
                    placeholder="Search by company name, email, or contact person..."
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
                    <SelectItem value="all">All Partners</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Partners ({filteredPartners.length})</CardTitle>
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
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Commission Rate</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                              ? "No partners found matching your filters"
                              : "No partners registered yet"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{partner.companyName || "N/A"}</div>
                              <div className="text-sm text-muted-foreground">{partner.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{partner.contactPerson || "N/A"}</div>
                              {partner.phone && (
                                <div className="text-muted-foreground">{partner.phone}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {partner.businessType?.replace(/_/g, " ") || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(partner)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-green-600">
                              {partner.commissionRate}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(partner.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedPartner(partner)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {!partner.isVerified && partner.isActive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setVerifyingPartner(partner)}
                                      className="text-green-600"
                                    >
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Verify Partner
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {partner.isActive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeactivatingPartner(partner)}
                                      className="text-red-600"
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Partner Detail Dialog */}
        <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Partner Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedPartner?.companyName}
              </DialogDescription>
            </DialogHeader>

            {selectedPartner && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedPartner)}
                  <Badge variant="outline" className="gap-1">
                    <DollarSign className="w-3 h-3" />
                    {selectedPartner.commissionRate}% Commission
                  </Badge>
                </div>

                {/* Business Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Company Name</Label>
                      <p className="font-medium">{selectedPartner.companyName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Contact Person</Label>
                      <p className="font-medium">{selectedPartner.contactPerson || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Business Type</Label>
                      <p className="font-medium">
                        {selectedPartner.businessType?.replace(/_/g, " ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {selectedPartner.phone || "N/A"}
                      </p>
                    </div>
                    {selectedPartner.whatsappNumber && (
                      <div>
                        <Label className="text-muted-foreground">WhatsApp</Label>
                        <p className="font-medium">{selectedPartner.whatsappNumber}</p>
                      </div>
                    )}
                    {selectedPartner.website && (
                      <div>
                        <Label className="text-muted-foreground">Website</Label>
                        <p className="font-medium flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          <a
                            href={selectedPartner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {selectedPartner.website}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedPartner.bio && (
                    <div>
                      <Label className="text-muted-foreground">Bio</Label>
                      <p className="text-sm mt-1">{selectedPartner.bio}</p>
                    </div>
                  )}
                </div>

                {/* Account Information */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Account Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedPartner.user.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Status</Label>
                      <p className="font-medium">{selectedPartner.user.accountStatus}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Joined Date</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(selectedPartner.createdAt)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Partner ID</Label>
                      <p className="font-mono text-xs">{selectedPartner.id}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Configuration */}
                {(selectedPartner.payoutMethod || selectedPartner.paypalEmail) && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Payment Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedPartner.payoutMethod && (
                        <div>
                          <Label className="text-muted-foreground">Payout Method</Label>
                          <p className="font-medium capitalize">
                            {selectedPartner.payoutMethod.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {selectedPartner.paypalEmail && (
                        <div>
                          <Label className="text-muted-foreground">PayPal Email</Label>
                          <p className="font-medium">{selectedPartner.paypalEmail}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">Minimum Payout</Label>
                        <p className="font-medium">
                          {formatCurrency(selectedPartner.minimumPayout || 0, "INR")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPartner(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verify Partner Dialog */}
        <AlertDialog open={!!verifyingPartner} onOpenChange={() => setVerifyingPartner(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Verify Partner</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to verify <strong>{verifyingPartner?.companyName}</strong>?
                This will mark them as a verified partner and allow them to earn commissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleVerify}
                className="bg-green-600 hover:bg-green-700"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Partner"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Deactivate Partner Dialog */}
        <AlertDialog
          open={!!deactivatingPartner}
          onOpenChange={() => {
            setDeactivatingPartner(null);
            setDeactivationReason("");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Partner</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to deactivate <strong>{deactivatingPartner?.companyName}</strong>.
                This will prevent them from earning new commissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="reason">Reason for Deactivation *</Label>
              <Textarea
                id="reason"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeactivate}
                className="bg-red-600 hover:bg-red-700"
                disabled={deactivateMutation.isPending || !deactivationReason.trim()}
              >
                {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Partner"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
