import { useState } from "react";
import { useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Bell, Send, Mail, MessageSquare, AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface NotificationCenterProps {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

const predefinedMessages = [
  {
    category: "Documents",
    templates: [
      { title: "Document Missing", message: "We noticed that some required documents are missing from your application. Please upload the following documents at your earliest convenience." },
      { title: "Document Review Required", message: "Your uploaded documents have been reviewed. Please check the feedback and resubmit if necessary." },
      { title: "Document Approved", message: "Great news! Your documents have been approved and are ready for submission." }
    ]
  },
  {
    category: "University Selection",
    templates: [
      { title: "Finalize University List", message: "Please review and finalize your university shortlist. The application deadlines are approaching." },
      { title: "New University Suggestion", message: "Based on your profile, we have added some new university suggestions to your shortlist. Please review them." },
      { title: "Application Deadline Reminder", message: "This is a reminder that the application deadline for your selected universities is approaching. Please ensure all requirements are met." }
    ]
  },
  {
    category: "Application Process",
    templates: [
      { title: "Visa Form Update Needed", message: "Please update your visa application form with the latest information and submit the required documents." },
      { title: "Interview Preparation", message: "Your university interview has been scheduled. Please prepare according to the guidelines we have shared." },
      { title: "Application Status Update", message: "There has been an update to your application status. Please check your dashboard for details." }
    ]
  },
  {
    category: "General",
    templates: [
      { title: "Consultation Reminder", message: "This is a reminder about your upcoming consultation session. Please be available at the scheduled time." },
      { title: "Profile Update Required", message: "Please update your student profile with the latest academic and personal information." },
      { title: "Payment Reminder", message: "A payment is due for your application services. Please check the payment section for details." }
    ]
  }
];

export default function NotificationCenter({ studentId, studentName, studentEmail }: NotificationCenterProps) {
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendNotificationMutation = useApiMutation(
    async (notificationData: any) => {
      return await api.post('/api/counselor/send-notification', {
        studentId,
        ...notificationData
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-notifications', studentId] });
        setIsNotificationDialogOpen(false);
        resetForm();
        toast({
          title: "Notification sent",
          description: `Notification has been sent to ${studentName}${sendEmail ? ' via email' : ''}.`
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to send notification",
          variant: "destructive"
        });
      }
    }
  );

  const resetForm = () => {
    setSelectedTemplate(null);
    setCustomMessage("");
    setMessageTitle("");
    setSendEmail(true);
    setSendInApp(true);
    setPriority("medium");
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setMessageTitle(template.title);
    setCustomMessage(template.message);
  };

  const handleSendNotification = () => {
    if (!messageTitle || !customMessage) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and message.",
        variant: "destructive"
      });
      return;
    }

    sendNotificationMutation.mutate({
      title: messageTitle,
      message: customMessage,
      priority,
      sendEmail,
      sendInApp,
      studentEmail: sendEmail ? studentEmail : undefined
    });
  };

  const getPriorityColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🔔 Notifications - {studentName}
          </span>
          <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Notification to {studentName}</DialogTitle>
                <DialogDescription>
                  Send a notification that will appear in the student's dashboard and optionally via email.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Quick Templates */}
                <div>
                  <Label className="text-base font-semibold">Quick Templates</Label>
                  <p className="text-sm text-gray-600 mb-3">Choose from predefined message templates</p>
                  
                  <div className="space-y-4">
                    {predefinedMessages.map((category) => (
                      <div key={category.category}>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">{category.category}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {category.templates.map((template, index) => (
                            <Button
                              key={index}
                              variant={selectedTemplate === template ? "default" : "outline"}
                              className="justify-start h-auto p-3"
                              onClick={() => handleTemplateSelect(template)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{template.title}</div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {template.message.substring(0, 100)}...
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Custom Message */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Customize Message</Label>
                  
                  <div>
                    <Label htmlFor="messageTitle">Message Title</Label>
                    <Input
                      id="messageTitle"
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                      placeholder="Enter notification title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customMessage">Message Content</Label>
                    <Textarea
                      id="customMessage"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Enter your custom message here..."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Low Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span>Medium Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span>High Priority</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Delivery Options */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Delivery Options</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendInApp"
                        checked={sendInApp}
                        onCheckedChange={(checked) => setSendInApp(checked as boolean)}
                      />
                      <Label htmlFor="sendInApp" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Send as in-app notification
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendEmail"
                        checked={sendEmail}
                        onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                      />
                      <Label htmlFor="sendEmail" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send email to {studentEmail}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {messageTitle && customMessage && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Preview</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={getPriorityColor(priority)}>
                            {getPriorityIcon(priority)}
                          </span>
                          <span className="font-medium">{messageTitle}</span>
                          <Badge variant="outline" className={getPriorityColor(priority)}>
                            {priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{customMessage}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {sendInApp && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              In-app notification
                            </div>
                          )}
                          {sendEmail && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Email notification
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendNotification}
                  disabled={!messageTitle || !customMessage || (!sendInApp && !sendEmail) || sendNotificationMutation.isPending}
                >
                  {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Send notifications and messages to your assigned students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Notification Center</p>
            <p className="text-sm">Send targeted messages to keep students informed and engaged</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 text-left">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  Quick Templates
                </h4>
                <p className="text-sm text-gray-600">
                  Use predefined templates for common scenarios like document requests, deadline reminders, and status updates.
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4" />
                  Multi-channel Delivery
                </h4>
                <p className="text-sm text-gray-600">
                  Send notifications both in-app and via email to ensure students receive important updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}