import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Upload,
  MessageSquare,
  Target,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock user for demo
const mockUser = {
  id: "user-1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  userType: "customer"
};

interface Application {
  id: string;
  universityId: string;
  courseId?: string;
  status: string;
  submittedAt?: string;
  deadlineDate?: string;
  lastUpdated: string;
  notes?: string;
  applicationData?: {
    personalStatement?: string;
    essays?: Array<{ question: string; answer: string }>;
  };
  university?: {
    name: string;
    country: string;
    city: string;
  };
  course?: {
    name: string;
    degree: string;
  };
}

const statusConfig = {
  draft: { 
    label: "Draft", 
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: Edit 
  },
  submitted: { 
    label: "Submitted", 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: CheckCircle 
  },
  under_review: { 
    label: "Under Review", 
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Clock 
  },
  accepted: { 
    label: "Accepted", 
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle 
  },
  rejected: { 
    label: "Rejected", 
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: AlertCircle 
  },
  waitlisted: { 
    label: "Waitlisted", 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    icon: Clock 
  },
};

export default function Applications() {
  const [user] = useState(mockUser);
  const [selectedTab, setSelectedTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch applications
  const { data: applications = [], isLoading } = useApiQuery<Application[]>(
    ["/api/applications"],
    '/api/applications',
    undefined,
    { staleTime: 2 * 60 * 1000 } // 2 minutes
  );

  // Delete application mutation
  const deleteApplicationMutation = useApiMutation(
    async (applicationId: string) => {
      return api.delete(`/api/applications/${applicationId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        toast({
          title: "Application deleted",
          description: "Your application has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete application",
          variant: "destructive",
        });
      },
    }
  );

  const filterApplications = (apps: Application[]) => {
    if (selectedTab === "all") return apps;
    return apps.filter(app => app.status === selectedTab);
  };

  const getStatusCounts = () => {
    return {
      all: applications.length,
      draft: applications.filter((app: Application) => app.status === "draft").length,
      submitted: applications.filter((app: Application) => app.status === "submitted").length,
      under_review: applications.filter((app: Application) => app.status === "under_review").length,
      accepted: applications.filter((app: Application) => app.status === "accepted").length,
      rejected: applications.filter((app: Application) => app.status === "rejected").length,
      waitlisted: applications.filter((app: Application) => app.status === "waitlisted").length,
    };
  };

  const getProgressStats = () => {
    const total = applications.length;
    const completed = applications.filter((app: Application) => 
      ["submitted", "under_review", "accepted", "rejected", "waitlisted"].includes(app.status)
    ).length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const statusCounts = getStatusCounts();
  const progressStats = getProgressStats();
  const filteredApplications = filterApplications(applications);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Applications
            </h1>
            <p className="text-muted-foreground">
              Track and manage your university applications
            </p>
          </div>
          <Button asChild>
            <Link href="/universities">
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Applications
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statusCounts.all}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Submitted
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statusCounts.submitted + statusCounts.under_review}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Accepted
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statusCounts.accepted}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statusCounts.all > 0 ? Math.round((statusCounts.accepted / statusCounts.all) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressStats.completed}/{progressStats.total} completed
              </span>
            </div>
            <Progress value={progressStats.percentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
                <TabsTrigger value="submitted">Submitted ({statusCounts.submitted})</TabsTrigger>
                <TabsTrigger value="under_review">Under Review ({statusCounts.under_review})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({statusCounts.accepted})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab}>
                <div className="space-y-4">
                  {filteredApplications.map((application: Application) => {
                    const statusInfo = statusConfig[application.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo.icon;
                    const daysUntilDeadline = application.deadlineDate ? 
                      getDaysUntilDeadline(application.deadlineDate) : null;

                    return (
                      <Card key={application.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* University and Course */}
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-r from-primary to-amber-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {application.university?.name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {application.university?.name || "University Name"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {application.course?.name} • {application.course?.degree}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {application.university?.city}, {application.university?.country}
                                  </p>
                                </div>
                              </div>

                              {/* Status and Timeline */}
                              <div className="flex items-center space-x-4 mb-4">
                                <Badge className={statusInfo.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                                
                                {application.submittedAt && (
                                  <span className="text-sm text-muted-foreground">
                                    Submitted {new Date(application.submittedAt).toLocaleDateString()}
                                  </span>
                                )}
                                
                                {daysUntilDeadline && daysUntilDeadline > 0 && (
                                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {daysUntilDeadline} days left
                                  </Badge>
                                )}
                                
                                {daysUntilDeadline && daysUntilDeadline <= 0 && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Deadline passed
                                  </Badge>
                                )}
                              </div>

                              {/* Notes */}
                              {application.notes && (
                                <p className="text-sm text-muted-foreground mb-4">
                                  {application.notes}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              
                              {application.status === "draft" && (
                                <Button size="sm">
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                              
                              <Button variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-1" />
                                Documents
                              </Button>
                              
                              <Button variant="outline" size="sm">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Notes
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Application</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this application? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => deleteApplicationMutation.mutate(application.id)}
                                      disabled={deleteApplicationMutation.isPending}
                                    >
                                      {deleteApplicationMutation.isPending ? "Deleting..." : "Delete"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Empty State */}
                  {filteredApplications.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {selectedTab === "all" ? "No applications yet" : `No ${selectedTab} applications`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {selectedTab === "all" 
                          ? "Start your journey by creating your first application"
                          : `You don't have any ${selectedTab} applications at the moment`
                        }
                      </p>
                      {selectedTab === "all" && (
                        <Button asChild>
                          <Link href="/universities">
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Application
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
