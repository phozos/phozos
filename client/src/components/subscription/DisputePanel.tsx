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
import { useCreateDispute } from '@/hooks/useSubscriptionManagement';
import { DisputeTypeSelector } from './DisputeTypeSelector';
import { Loader2 } from 'lucide-react';

const disputeSchema = z.object({
  type: z.enum(['chargeback', 'dispute']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000),
});

type DisputeFormData = z.infer<typeof disputeSchema>;

interface DisputePanelProps {
  subscriptionId: string;
  paymentId: string;
  paymentAmount: string;
  currency?: string;
}

export function DisputePanel({
  subscriptionId,
  paymentId,
  paymentAmount,
  currency = '₹',
}: DisputePanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [disputeType, setDisputeType] = useState<'chargeback' | 'dispute'>('dispute');
  const createDispute = useCreateDispute();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DisputeFormData>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      type: 'dispute',
      amount: paymentAmount,
    },
  });

  const handleTypeChange = (type: 'chargeback' | 'dispute') => {
    setDisputeType(type);
    setValue('type', type);
  };

  const onSubmit = (data: DisputeFormData) => {
    setShowConfirmDialog(true);
  };

  const confirmDispute = async () => {
    const formData = handleSubmit((data) => {
      createDispute.mutate(
        {
          subscriptionId,
          paymentId,
          type: data.type,
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>File Dispute</CardTitle>
          <CardDescription>
            Raise a dispute or chargeback for your subscription payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <DisputeTypeSelector value={disputeType} onChange={handleTypeChange} />

            <div className="space-y-2">
              <Label htmlFor="amount">Disputed Amount *</Label>
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
                Original payment amount: {currency} {paymentAmount}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Dispute *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide detailed information about your dispute (minimum 10 characters)"
                rows={6}
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Be specific about the issue. Include any relevant transaction IDs, dates, or
                supporting information.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Important Information</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>All disputes are reviewed within 3-5 business days</li>
                <li>You may be asked to provide additional documentation</li>
                <li>
                  {disputeType === 'chargeback'
                    ? 'Chargebacks may affect your ability to make future purchases'
                    : 'Our support team will contact you to resolve the issue'}
                </li>
              </ul>
            </div>

            <Button type="submit" variant="destructive" disabled={createDispute.isPending}>
              {createDispute.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Dispute'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {disputeType === 'chargeback' ? 'Chargeback' : 'Dispute'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disputeType === 'chargeback'
                ? 'Are you sure you want to file a chargeback? This is a serious action that will be reviewed by both our team and your payment provider. False chargebacks may affect your account status.'
                : 'Are you sure you want to file this dispute? Our team will review your case and work with you to resolve the issue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDispute}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
