import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { RequestStatusBadge } from './RequestStatusBadge';

interface SubscriptionOverviewProps {
  subscription: {
    id: string;
    planId: string;
    status: string;
    startedAt: string;
    expiresAt?: string;
    isLifetime?: boolean;
  };
  plan?: {
    id: string;
    name: string;
    price: string;
    currency: string;
    features?: string[];
  };
  payment?: {
    id: string;
    paidAt: string;
    amount: string;
  };
  onCancelClick?: () => void;
  onRefundClick?: () => void;
  onDisputeClick?: () => void;
}

export function SubscriptionOverview({
  subscription,
  plan,
  payment,
  onCancelClick,
  onRefundClick,
  onDisputeClick,
}: SubscriptionOverviewProps) {
  const isActive = subscription.status === 'active';
  const isLifetime = subscription.isLifetime;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Subscription</CardTitle>
          <RequestStatusBadge status={subscription.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Plan</p>
              <p className="text-lg font-semibold">{plan?.name || 'Unknown Plan'}</p>
              {plan && (
                <p className="text-sm text-muted-foreground">
                  {plan.currency} {plan.price}
                  {isLifetime ? ' (Lifetime)' : '/month'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {isLifetime ? 'Activated On' : 'Started On'}
              </p>
              <p className="text-lg font-semibold">
                {format(new Date(subscription.startedAt), 'MMM d, yyyy')}
              </p>
              {!isLifetime && subscription.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Expires: {format(new Date(subscription.expiresAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>

          {payment && (
            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Last Payment</p>
                <p className="text-lg font-semibold">
                  {plan?.currency || '₹'} {payment.amount}
                </p>
                <p className="text-sm text-muted-foreground">
                  Paid on {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          {!isLifetime && subscription.expiresAt && (
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Renewal Status</p>
                <p className="text-lg font-semibold">
                  {isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive ? 'Auto-renews' : 'No auto-renewal'}
                </p>
              </div>
            </div>
          )}
        </div>

        {plan?.features && plan.features.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Included Features</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {plan.features.slice(0, 6).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {isActive && onCancelClick && (
            <Button variant="outline" onClick={onCancelClick}>
              Request Cancellation
            </Button>
          )}
          {payment && onRefundClick && (
            <Button variant="outline" onClick={onRefundClick}>
              Request Refund
            </Button>
          )}
          {payment && onDisputeClick && (
            <Button variant="outline" onClick={onDisputeClick}>
              File Dispute
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
