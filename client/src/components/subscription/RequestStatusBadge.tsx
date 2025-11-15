import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface RequestStatusBadgeProps {
  status: string;
  type?: 'cancellation' | 'refund' | 'dispute';
}

export function RequestStatusBadge({ status, type = 'cancellation' }: RequestStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        };
      case 'approved':
        return {
          label: 'Approved',
          variant: 'success' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'secondary' as const,
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        };
      case 'processing':
        return {
          label: 'Processing',
          variant: 'default' as const,
          icon: Clock,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        };
      case 'completed':
        return {
          label: 'Completed',
          variant: 'success' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
      case 'failed':
        return {
          label: 'Failed',
          variant: 'destructive' as const,
          icon: AlertCircle,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
      case 'open':
        return {
          label: 'Open',
          variant: 'default' as const,
          icon: AlertCircle,
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        };
      case 'investigating':
        return {
          label: 'Investigating',
          variant: 'default' as const,
          icon: Clock,
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        };
      case 'resolved':
        return {
          label: 'Resolved',
          variant: 'success' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
      case 'closed':
        return {
          label: 'Closed',
          variant: 'secondary' as const,
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
