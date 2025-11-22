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
  useAdminDisputes,
  useAdminDispute,
  useAssignDispute,
  useInvestigateDispute,
  useResolveDispute,
  useAddDisputeEvidence,
} from "@/hooks/useAdminSubscriptionManagement";
import { Loader2, Eye, Filter, UserPlus, Search, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function DisputeManagement() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: "open",
    userId: "",
    page: 1,
    limit: 20,
  });
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [assignedAdminId, setAssignedAdminId] = useState("");
  const [resolution, setResolution] = useState("");
  const [evidence, setEvidence] = useState("");

  const { data: disputesData, isLoading } = useAdminDisputes(filters);
  const { data: selectedDispute } = useAdminDispute(selectedDisputeId || "");
  const assignMutation = useAssignDispute();
  const investigateMutation = useInvestigateDispute();
  const resolveMutation = useResolveDispute();
  const addEvidenceMutation = useAddDisputeEvidence();

  const handleViewDetails = (id: string) => {
    setSelectedDisputeId(id);
    setShowModal(true);
    setAssignedAdminId("");
    setResolution("");
    setEvidence("");
  };

  const handleAssign = async () => {
    if (!selectedDisputeId || !assignedAdminId.trim()) {
      toast({
        title: "Validation Error",
        description: "Admin ID is required for assignment",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await assignMutation.mutateAsync({
        id: selectedDisputeId,
        assignedAdminId,
      });
      toast({
        title: "Success",
        description: "Dispute assigned successfully",
      });
      setAssignedAdminId("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign dispute",
        variant: "destructive",
      });
    }
  };

  const handleInvestigate = async () => {
    if (!selectedDisputeId) return;
    
    try {
      await investigateMutation.mutateAsync(selectedDisputeId);
      toast({
        title: "Success",
        description: "Dispute escalated to investigation",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to escalate dispute",
        variant: "destructive",
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedDisputeId || !resolution.trim()) {
      toast({
        title: "Validation Error",
        description: "Resolution details are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await resolveMutation.mutateAsync({
        id: selectedDisputeId,
        resolution,
      });
      toast({
        title: "Success",
        description: "Dispute resolved successfully",
      });
      setShowModal(false);
      setSelectedDisputeId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedDisputeId || !evidence.trim()) {
      toast({
        title: "Validation Error",
        description: "Evidence is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addEvidenceMutation.mutateAsync({
        id: selectedDisputeId,
        evidence: { note: evidence, timestamp: new Date().toISOString() },
      });
      toast({
        title: "Success",
        description: "Evidence added successfully",
      });
      setEvidence("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add evidence",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      open: { variant: "secondary", label: "Open" },
      investigating: { variant: "default", label: "Investigating" },
      resolved: { variant: "default", label: "Resolved" },
      closed: { variant: "outline", label: "Closed" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { variant: any; label: string }> = {
      payment_issue: { variant: "destructive", label: "Payment Issue" },
      service_quality: { variant: "secondary", label: "Service Quality" },
      billing_dispute: { variant: "default", label: "Billing Dispute" },
      unauthorized_charge: { variant: "destructive", label: "Unauthorized Charge" },
      other: { variant: "outline", label: "Other" },
    };
    const config = typeConfig[type] || { variant: "outline", label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dispute Management</h1>
        <p className="text-muted-foreground">
          Manage and resolve subscription-related disputes
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
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
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
            Disputes
            {disputesData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({disputesData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : disputesData?.disputes?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No disputes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputesData?.disputes?.map((dispute: any) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-medium">
                        {dispute.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{dispute.userId.substring(0, 8)}...</TableCell>
                      <TableCell>{getTypeBadge(dispute.type)}</TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell>
                        {dispute.assignedTo ? (
                          <span className="text-sm">{dispute.assignedTo.substring(0, 8)}...</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(dispute.createdAt), "PPp")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(dispute.id)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Review and manage this dispute
            </DialogDescription>
          </DialogHeader>
          {selectedDispute ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Dispute ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedDispute.id}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Type</Label>
                    <div className="mt-1">{getTypeBadge(selectedDispute.type)}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">User ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedDispute.userId}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Payment ID</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedDispute.paymentId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="font-semibold">Assigned To</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedDispute.assignedTo || "Unassigned"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="font-semibold">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDispute.description}
                    </p>
                  </div>
                  <div>
                    <Label className="font-semibold">Created At</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedDispute.createdAt), "PPpp")}
                    </p>
                  </div>
                  {selectedDispute.resolvedAt && (
                    <div>
                      <Label className="font-semibold">Resolved At</Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedDispute.resolvedAt), "PPpp")}
                      </p>
                    </div>
                  )}
                </div>

                {selectedDispute.resolution && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Resolution</Label>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      {selectedDispute.resolution}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                {selectedDispute.status === "open" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Assign Dispute
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="assignedAdmin">Admin ID</Label>
                        <Input
                          id="assignedAdmin"
                          placeholder="Enter admin user ID"
                          value={assignedAdminId}
                          onChange={(e) => setAssignedAdminId(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleAssign}
                        disabled={assignMutation.isPending}
                        className="w-full"
                      >
                        {assignMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {(selectedDispute.status === "open" || selectedDispute.status === "investigating") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Escalate to Investigation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={handleInvestigate}
                        disabled={investigateMutation.isPending}
                        variant="outline"
                        className="w-full"
                      >
                        {investigateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Escalating...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Escalate to Investigation
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {(selectedDispute.status === "open" || selectedDispute.status === "investigating") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve Dispute
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="resolution">Resolution Details</Label>
                        <Textarea
                          id="resolution"
                          placeholder="Enter resolution details and outcome..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={handleResolve}
                        disabled={resolveMutation.isPending}
                        className="w-full"
                      >
                        {resolveMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Resolve Dispute
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Add Evidence/Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="evidence">Evidence or Notes</Label>
                      <Textarea
                        id="evidence"
                        placeholder="Add evidence, investigation notes, or relevant information..."
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleAddEvidence}
                      disabled={addEvidenceMutation.isPending}
                      className="w-full"
                    >
                      {addEvidenceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Add Evidence
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Evidence Trail</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedDispute.evidence.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">{item.note}</p>
                            {item.timestamp && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(item.timestamp), "PPpp")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
