import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
  status: string;
  timestamp: string;
  label: string;
  description?: string;
}

interface RequestTimelineProps {
  currentStatus: string;
  requestedAt: string;
  processedAt?: string;
  events?: TimelineEvent[];
}

export function RequestTimeline({
  currentStatus,
  requestedAt,
  processedAt,
  events,
}: RequestTimelineProps) {
  const defaultEvents: TimelineEvent[] = events || [
    {
      status: 'pending',
      timestamp: requestedAt,
      label: 'Request Submitted',
      description: 'Your request has been received',
    },
    {
      status: currentStatus,
      timestamp: processedAt || requestedAt,
      label: currentStatus === 'pending' ? 'Under Review' : `Request ${currentStatus}`,
      description:
        currentStatus === 'pending'
          ? 'Waiting for admin review'
          : `Request was ${currentStatus.toLowerCase()}`,
    },
  ];

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Circle className="h-6 w-6 text-gray-300" />;
    }

    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'resolved':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'rejected':
      case 'failed':
      case 'closed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'pending':
      case 'processing':
      case 'investigating':
        return <Clock className="h-6 w-6 text-orange-500 animate-pulse" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Request Timeline</h3>
        <div className="space-y-6">
          {defaultEvents.map((event, index) => {
            const isActive =
              event.status.toLowerCase() === currentStatus.toLowerCase() ||
              index === 0;

            return (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex flex-col items-center">
                  {getStatusIcon(event.status, isActive)}
                  {index < defaultEvents.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-medium ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {event.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
