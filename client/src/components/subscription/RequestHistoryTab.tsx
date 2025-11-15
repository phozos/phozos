import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RequestStatusBadge } from './RequestStatusBadge';
import { RequestTimeline } from './RequestTimeline';
import { format } from 'date-fns';
import {
  useCancellationRequests,
  useRefundRequests,
  useDisputes,
} from '@/hooks/useSubscriptionManagement';
import { Loader2, FileX } from 'lucide-react';

export function RequestHistoryTab() {
  const {
    data: cancellationRequests,
    isLoading: loadingCancellations,
  } = useCancellationRequests();
  const { data: refundRequests, isLoading: loadingRefunds } = useRefundRequests();
  const { data: disputes, isLoading: loadingDisputes } = useDisputes();

  if (loadingCancellations || loadingRefunds || loadingDisputes) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileX className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <Tabs defaultValue="cancellations" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="cancellations">
          Cancellations
          {cancellationRequests && cancellationRequests.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {cancellationRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="refunds">
          Refunds
          {refundRequests && refundRequests.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {refundRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="disputes">
          Disputes
          {disputes && disputes.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {disputes.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cancellations" className="space-y-4 mt-6">
        {!cancellationRequests || cancellationRequests.length === 0 ? (
          <EmptyState message="No cancellation requests found" />
        ) : (
          cancellationRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Cancellation Request</CardTitle>
                  <RequestStatusBadge status={request.status} type="cancellation" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">
                      {format(new Date(request.requestedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {request.processedAt && (
                    <div>
                      <p className="text-muted-foreground">Processed</p>
                      <p className="font-medium">
                        {format(new Date(request.processedAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{request.reason}</p>
                </div>
                {request.adminNotes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes</p>
                    <p className="text-sm text-muted-foreground">{request.adminNotes}</p>
                  </div>
                )}
                <RequestTimeline
                  currentStatus={request.status}
                  requestedAt={request.requestedAt}
                  processedAt={request.processedAt}
                />
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="refunds" className="space-y-4 mt-6">
        {!refundRequests || refundRequests.length === 0 ? (
          <EmptyState message="No refund requests found" />
        ) : (
          refundRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Refund Request</CardTitle>
                  <RequestStatusBadge status={request.status} type="refund" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">
                      {request.currency} {request.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">
                      {format(new Date(request.requestedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                {request.razorpayRefundId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Razorpay Refund ID</p>
                    <p className="text-sm font-mono">{request.razorpayRefundId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{request.reason}</p>
                </div>
                {request.adminNotes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes</p>
                    <p className="text-sm text-muted-foreground">{request.adminNotes}</p>
                  </div>
                )}
                <RequestTimeline
                  currentStatus={request.status}
                  requestedAt={request.requestedAt}
                  processedAt={request.processedAt}
                />
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="disputes" className="space-y-4 mt-6">
        {!disputes || disputes.length === 0 ? (
          <EmptyState message="No disputes found" />
        ) : (
          disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {dispute.type === 'chargeback' ? 'Chargeback' : 'Dispute'}
                  </CardTitle>
                  <RequestStatusBadge status={dispute.status} type="dispute" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">
                      {dispute.currency} {dispute.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Filed</p>
                    <p className="font-medium">
                      {format(new Date(dispute.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                {dispute.razorpayDisputeId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Razorpay Dispute ID</p>
                    <p className="text-sm font-mono">{dispute.razorpayDisputeId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{dispute.reason}</p>
                </div>
                {dispute.resolution && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Resolution</p>
                    <p className="text-sm">{dispute.resolution}</p>
                    {dispute.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved on {format(new Date(dispute.resolvedAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                )}
                {dispute.adminNotes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes</p>
                    <p className="text-sm text-muted-foreground">{dispute.adminNotes}</p>
                  </div>
                )}
                <RequestTimeline
                  currentStatus={dispute.status}
                  requestedAt={dispute.createdAt}
                  processedAt={dispute.resolvedAt}
                />
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
