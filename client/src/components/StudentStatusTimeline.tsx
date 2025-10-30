import { useApiQuery } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, Clock, User, Calendar, FileText } from "lucide-react";

interface TimelineEntry {
  id: string;
  action: string;
  description: string;
  previousStatus?: string;
  newStatus: string;
  performedByName: string;
  createdAt: string;
  metadata?: any;
}

interface StudentStatusTimelineProps {
  studentId?: string;
  isOwnTimeline?: boolean;
}

const statusMap = {
  inquiry: { label: "Initial Inquiry", color: "bg-gray-500", icon: Circle },
  converted: { label: "Converted", color: "bg-blue-500", icon: Circle },
  visa_applied: { label: "Visa Applied", color: "bg-yellow-500", icon: Clock },
  visa_approved: { label: "Visa Approved", color: "bg-green-500", icon: CheckCircle },
  departed: { label: "Departed", color: "bg-purple-500", icon: CheckCircle }
};

export default function StudentStatusTimeline({ studentId, isOwnTimeline = false }: StudentStatusTimelineProps) {
  const { data: timeline = [], isLoading } = useApiQuery<TimelineEntry[]>(
    ['/api/student/timeline', studentId || ''],
    `/api/student/timeline/${studentId}`,
    undefined,
    { enabled: !!studentId }
  );

  const { data: currentStatus } = useApiQuery<{ status: string }>(
    ['/api/student/status', studentId || ''],
    `/api/student/status/${studentId}`,
    undefined,
    { enabled: !!studentId }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8" data-testid="timeline-loading">
        <div className="text-lg">Loading timeline...</div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8" data-testid="timeline-empty">
        <div className="text-gray-500">No timeline data available.</div>
      </div>
    );
  }

  return (
    <Card data-testid="student-timeline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {isOwnTimeline ? "Your Journey Timeline" : "Student Progress Timeline"}
        </CardTitle>
        {currentStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Current Status:</span>
            <Badge 
              variant="secondary" 
              className={`${statusMap[currentStatus.status as keyof typeof statusMap]?.color || 'bg-gray-500'} text-white`}
              data-testid={`badge-current-status-${currentStatus.status}`}
            >
              {statusMap[currentStatus.status as keyof typeof statusMap]?.label || currentStatus.status}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-6">
            {timeline.map((entry: TimelineEntry, index: number) => {
              const isLast = index === timeline.length - 1;
              const statusInfo = statusMap[entry.newStatus as keyof typeof statusMap];
              const StatusIcon = statusInfo?.icon || Circle;
              
              return (
                <div key={entry.id} className="relative flex gap-4" data-testid={`timeline-entry-${entry.id}`}>
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${statusInfo?.color || 'bg-gray-500'}`}>
                    <StatusIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Timeline content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900" data-testid={`action-${entry.id}`}>
                          {entry.action}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span data-testid={`date-${entry.id}`}>
                            {new Date(entry.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3" data-testid={`description-${entry.id}`}>
                        {entry.description}
                      </p>
                      
                      {/* Status change indicator */}
                      {entry.previousStatus && entry.previousStatus !== entry.newStatus && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded">
                          <div className="text-sm">
                            <span className="font-medium">Status changed from </span>
                            <Badge variant="outline" data-testid={`previous-status-${entry.id}`}>
                              {statusMap[entry.previousStatus as keyof typeof statusMap]?.label || entry.previousStatus}
                            </Badge>
                            <span className="font-medium"> to </span>
                            <Badge 
                              variant="secondary" 
                              className={`${statusInfo?.color || 'bg-gray-500'} text-white`}
                              data-testid={`new-status-${entry.id}`}
                            >
                              {statusInfo?.label || entry.newStatus}
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {/* Metadata display */}
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mb-3">
                          <details className="group">
                            <summary className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                              <FileText className="w-4 h-4" />
                              Additional Details
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              {Object.entries(entry.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        <span data-testid={`performed-by-${entry.id}`}>
                          {isOwnTimeline && entry.performedByName.includes('admin') 
                            ? 'Phozos Team' 
                            : entry.performedByName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}