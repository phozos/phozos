import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCreateRefundRequest } from '@/hooks/useSubscriptionManagement';
import { RefundEligibilityCountdown } from './RefundEligibilityCountdown';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const refundSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

type RefundFormData = z.infer<typeof refundSchema>;

interface RefundRequestPanelProps {
  subscriptionId: string;
  paymentId: string;
  paymentAmount: string;
  paidAt: string;
  currency?: string;
  existingRequest?: {
    id: string;
    status: string;
    amount: string;
    reason: string;
    requestedAt: string;
  };
}

export function RefundRequestPanel({
  subscriptionId,
  paymentId,
  paymentAmount,
  paidAt,
  currency = '₹',
  existingRequest,
}: RefundRequestPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const createRefundRequest = useCreateRefundRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RefundFormData>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      amount: paymentAmount,
    },
  });

  const onSubmit = (data: RefundFormData) => {
    setShowConfirmDialog(true);
  };

  const confirmRefund = async () => {
    const formData = handleSubmit((data) => {
      createRefundRequest.mutate(
        {
          subscriptionId,
          paymentId,
          amount: data.amount,
          reason: data.reason,
        },
        {
          onSuccess: () => {
            reset();
            setShowConfirmDialog(false);
          },
        }
      );
    });

    formData();
  };

  if (existingRequest && existingRequest.status !== 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refund Request</CardTitle>
          <CardDescription>You have an existing refund request</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Status:</strong> {existingRequest.status}
              <br />
              <strong>Amount:</strong> {currency} {existingRequest.amount}
              <br />
              <strong>Requested:</strong>{' '}
              {new Date(existingRequest.requestedAt).toLocaleDateString()}
              <br />
              <strong>Reason:</strong> {existingRequest.reason}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Request Refund</CardTitle>
          <CardDescription>
            Refunds must be requested within 48 hours of payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RefundEligibilityCountdown paymentId={paymentId} paidAt={paidAt} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount *</Label>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">{currency}</span>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  {...register('amount')}
                  className="flex-1"
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum refundable amount: {currency} {paymentAmount}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refund *</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you're requesting a refund (minimum 10 characters)"
                rows={5}
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="destructive"
              disabled={createRefundRequest.isPending}
            >
              {createRefundRequest.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Refund Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to request a refund? This request will be reviewed by our team.
              Please note that refunds are only processed if requested within 48 hours of payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefund}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
