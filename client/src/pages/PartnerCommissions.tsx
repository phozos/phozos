import { useState } from "react";
import { usePendingCommissions, useCommissionHistory } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Clock, CheckCircle, XCircle, User, CreditCard } from "lucide-react";
import { format } from "date-fns";
import type { CommissionWithDetails } from "@shared/types/partner-types";
import { SEO } from "@/components/SEO";

export default function PartnerCommissions() {
  const { data: pendingCommissions = [], isLoading: pendingLoading } = usePendingCommissions();
  const { data: commissionHistory = [], isLoading: historyLoading } = useCommissionHistory();
  const [activeTab, setActiveTab] = useState("pending");

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { 
        label: "Pending", 
        variant: "secondary", 
        icon: <Clock className="w-3 h-3 mr-1" /> 
      },
      approved: { 
        label: "Approved", 
        variant: "default", 
        icon: <CheckCircle className="w-3 h-3 mr-1" /> 
      },
      paid: { 
        label: "Paid", 
        variant: "default", 
        icon: <CheckCircle className="w-3 h-3 mr-1" /> 
      },
      rejected: { 
        label: "Rejected", 
        variant: "destructive", 
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

  const CommissionTable = ({ commissions, isLoading }: { commissions: CommissionWithDetails[], isLoading: boolean }) => {
    if (isLoading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    if (commissions.length === 0) {
      return (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No commissions found</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Subscription Plan</TableHead>
            <TableHead>Payment Amount</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Approved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission) => (
            <TableRow key={commission.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {commission.referral?.studentName || 'N/A'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  Subscription
                </div>
              </TableCell>
              <TableCell>
                ₹{commission.payment?.amount?.toLocaleString('en-IN') || 0}
              </TableCell>
              <TableCell>
                <div className="font-semibold text-green-600">
                  ₹{(typeof commission.commissionAmount === 'number' ? commission.commissionAmount : 0).toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {commission.commissionRate}% rate
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(commission.status)}</TableCell>
              <TableCell>
                {commission.createdAt ? format(new Date(commission.createdAt), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                {commission.approvedAt ? format(new Date(commission.approvedAt), 'MMM d, yyyy') : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const totalPending = pendingCommissions.reduce(
    (sum, c) => sum + (typeof c.commissionAmount === 'number' ? c.commissionAmount : 0), 
    0
  );
  
  const totalEarned = commissionHistory
    .filter(c => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + (typeof c.commissionAmount === 'number' ? c.commissionAmount : 0), 0);

  return (
    <>
      <SEO 
        title="Commissions - Partner Dashboard"
        description="View and track your commission earnings"
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
        <AppShell />
        
        <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-600" />
              Commissions
            </h1>
            <p className="text-muted-foreground mt-2">
              View pending and approved commissions from your referrals
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Pending Commissions
                    </p>
                    <p className="text-3xl font-bold text-amber-600">
                      ₹{totalPending.toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pendingCommissions.length} pending approval
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Total Earned
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{totalEarned.toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All approved commissions
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Commission Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="pending">
                    Pending ({pendingCommissions.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History ({commissionHistory.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="mt-6">
                  <CommissionTable commissions={pendingCommissions} isLoading={pendingLoading} />
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                  <CommissionTable commissions={commissionHistory} isLoading={historyLoading} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
