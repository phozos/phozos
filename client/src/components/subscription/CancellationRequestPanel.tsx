import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { useCreateCancellationRequest } from '@/hooks/useSubscriptionManagement';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const cancellationSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

type CancellationFormData = z.infer<typeof cancellationSchema>;

interface CancellationRequestPanelProps {
  subscriptionId: string;
  existingRequest?: {
    id: string;
    status: string;
    reason: string;
    requestedAt: string;
  };
}

export function CancellationRequestPanel({
  subscriptionId,
  existingRequest,
}: CancellationRequestPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const createCancellationRequest = useCreateCancellationRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
  });

  const onSubmit = (data: CancellationFormData) => {
    setShowConfirmDialog(true);
  };

  const confirmCancellation = async () => {
    const formData = handleSubmit((data) => {
      createCancellationRequest.mutate(
        {
          subscriptionId,
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

  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Request</CardTitle>
          <CardDescription>You have a pending cancellation request</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Status:</strong> Your cancellation request is pending admin review.
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
          <CardTitle>Request Cancellation</CardTitle>
          <CardDescription>
            Submit a cancellation request for your subscription. This will be reviewed by our team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Cancellation *</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you want to cancel your subscription (minimum 10 characters)"
                rows={5}
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your feedback helps us improve our service. This request will be reviewed by an
                admin.
              </p>
            </div>

            <Button
              type="submit"
              variant="destructive"
              disabled={createCancellationRequest.isPending}
            >
              {createCancellationRequest.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Cancellation Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit a cancellation request? This action will notify our
              team, and they will review your request. You can continue using your subscription
              until it's approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancellation}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
