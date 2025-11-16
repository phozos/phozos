import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, CreditCard, AlertCircle, History } from 'lucide-react';
import { Link } from 'wouter';
import { SubscriptionOverview } from '@/components/subscription/SubscriptionOverview';
import { CancellationRequestPanel } from '@/components/subscription/CancellationRequestPanel';
import { RefundRequestPanel } from '@/components/subscription/RefundRequestPanel';
import { DisputePanel } from '@/components/subscription/DisputePanel';
import { RequestHistoryTab } from '@/components/subscription/RequestHistoryTab';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import {
  useCancellationRequests,
  useRefundRequests,
} from '@/hooks/useSubscriptionManagement';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SubscriptionManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: subscriptionData, isLoading } = useUserSubscription();
  const { data: cancellationRequests } = useCancellationRequests();
  const { data: refundRequests } = useRefundRequests();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!subscriptionData || !subscriptionData.subscription) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have an active subscription. Please subscribe to a plan to access this page.
            <Link href="/subscription-plans">
              <Button variant="link" className="p-0 ml-2">
                View Plans
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { subscription, plan } = subscriptionData;
  const existingCancellationRequest = cancellationRequests?.find(
    (req) => req.status === 'pending'
  );
  const existingRefundRequest = refundRequests?.find(
    (req) => req.status === 'pending' || req.status === 'processing'
  );

  const payment = undefined as { id: string; paidAt: string; amount: string } | undefined;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage your subscription, request cancellations, refunds, and view request history
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="overview">
            <Shield className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="cancel">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Cancel</span>
          </TabsTrigger>
          <TabsTrigger value="refund">
            <CreditCard className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refund</span>
          </TabsTrigger>
          <TabsTrigger value="dispute">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Dispute</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SubscriptionOverview
            subscription={{
              ...subscription,
              expiresAt: subscription.expiresAt ?? undefined,
            }}
            plan={plan}
            payment={payment}
            onCancelClick={() => setActiveTab('cancel')}
            onRefundClick={() => setActiveTab('refund')}
            onDisputeClick={() => setActiveTab('dispute')}
          />
        </TabsContent>

        <TabsContent value="cancel" className="space-y-6">
          <CancellationRequestPanel
            subscriptionId={subscription.id}
            existingRequest={existingCancellationRequest}
          />
        </TabsContent>

        <TabsContent value="refund" className="space-y-6">
          {payment ? (
            <RefundRequestPanel
              subscriptionId={subscription.id}
              paymentId={payment.id}
              paymentAmount={payment.amount}
              paidAt={payment.paidAt}
              currency={plan?.currency}
              existingRequest={existingRefundRequest}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Payment Found</CardTitle>
                <CardDescription>
                  Unable to find payment information for this subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Payment information is required to request a refund. Please contact support if
                    you believe this is an error.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dispute" className="space-y-6">
          {payment ? (
            <DisputePanel
              subscriptionId={subscription.id}
              paymentId={payment.id}
              paymentAmount={payment.amount}
              currency={plan?.currency}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Payment Found</CardTitle>
                <CardDescription>
                  Unable to find payment information for this subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Payment information is required to file a dispute. Please contact support if
                    you believe this is an error.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <RequestHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
