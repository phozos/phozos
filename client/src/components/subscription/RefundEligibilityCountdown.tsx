import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRefundEligibility } from '@/hooks/useSubscriptionManagement';

interface RefundEligibilityCountdownProps {
  paymentId: string;
  paidAt: string;
}

export function RefundEligibilityCountdown({
  paymentId,
  paidAt,
}: RefundEligibilityCountdownProps) {
  const { data: eligibility, isLoading } = useRefundEligibility(paymentId);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const paymentDate = new Date(paidAt);
      const now = new Date();
      const eligibilityEnd = new Date(paymentDate.getTime() + 48 * 60 * 60 * 1000);
      const remaining = eligibilityEnd.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [paidAt]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Checking eligibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.eligible) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Refund Not Eligible:</strong> {eligibility?.reason || 'Refund window has expired'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Refund Eligibility Window</p>
              <p className="text-xs text-muted-foreground">
                Refunds must be requested within 48 hours of payment
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-600">{timeRemaining}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
