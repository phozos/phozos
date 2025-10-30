import { useState, useEffect } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStudentAccountId, getStudentProfileId } from "@shared/utils/student-id-helpers";

// Student interface for team dashboard
interface StudentAssignedToCounselor {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  destinationCountry: string | null;
  intakeYear: string | null;
  status: string | null;
  profilePicture: string | null;
  createdAt: Date | null;
  currentEducationLevel: string | null;
  intendedMajor: string | null;
  budgetRange: { min: number; max: number } | null;
  gpa: number | null;
  academicInterests: string[] | null;
  extracurriculars: string[] | null;
  universitiesShortlisted?: number;
  lastActivity?: string;
}
import { 
  Users, 
  FileText, 
  Trophy,
  Bus,
  Plus,
  RefreshCw,
  Download,
  TrendingUp,
  ArrowUp,
  Eye,
  MessageSquare,
  Calendar,
  Bell,
  Settings,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Menu,
  ChevronLeft,
  X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

// Mock team user for demo
const mockTeamUser = {
  id: "team-1",
  firstName: "Maria",
  lastName: "Rodriguez",
  email: "maria.rodriguez@edupath.com",
  userType: "team_member",
  teamRole: "admin",
  profilePicture: null
};

interface DashboardStats {
  activeStudents: number;
  totalApplications: number;
  successRate: number;
  teamMembers: number;
  recentActivity: any[];
}

interface StudentActivity {
  id: string;
  userId: string;
  universityId: string;
  status: string;
  assignedCounselorId?: string;
  lastUpdated: string;
  user?: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  university?: {
    name: string;
    country: string;
  };
}

export default function TeamDashboard() {
  const [user] = useState(mockTeamUser);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();

  // Fetch dashboard analytics
  const { data: dashboardStats, isLoading: statsLoading } = useApiQuery(
    ["/api/analytics/dashboard"],
    '/api/analytics/dashboard',
    undefined,
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  // Fetch students assigned to this counselor
  const { data: assignedStudents = [], isLoading: studentsLoading } = useApiQuery<StudentAssignedToCounselor[]>(
    ["/api/counselor/assigned-students"],
    '/api/counselor/assigned-students',
    undefined,
    { staleTime: 2 * 60 * 1000 } // 2 minutes
  );

  // Fetch team members (using admin/staff endpoint with proper auth)
  const { data: teamMembers = [], isLoading: teamLoading } = useApiQuery(
    ["/api/admin/staff"],
    '/api/admin/staff',
    undefined,
    { 
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Only retry once to avoid excessive requests
    }
  );

  // Fetch recent applications (fallback with graceful error handling)
  const { data: applications = [], isLoading: applicationsLoading } = useApiQuery(
    ["/api/applications/recent"],
    '/api/applications/recent',
    undefined,
    { 
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: false, // Don't retry failed requests for this endpoint
    }
  );

  const stats = dashboardStats || {
    activeStudents: assignedStudents.length,
    totalApplications: assignedStudents.reduce((sum: number, student: StudentAssignedToCounselor) => sum + (student.universitiesShortlisted || 0), 0),
    successRate: 94.5, // This would need to be calculated from actual application outcomes
    teamMembers: Array.isArray(teamMembers) ? teamMembers.length : 0,
    recentActivity: []
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "converted":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "visa_applied":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "visa_approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "departed":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "inquiry":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return CheckCircle;
      case "under_review":
        return Clock;
      case "submitted":
        return FileText;
      case "draft":
        return Eye;
      case "rejected":
        return AlertCircle;
      default:
        return FileText;
    }
  };

  // Action handlers for student management
  
  /**
   * View user profile - uses Account ID (userId)
   * This navigates to the user's account profile page
   */
  const handleViewProfile = (studentId: string) => {
    navigate(`/dashboard/team/student/${studentId}`);
  };

  /**
   * Send message to student - uses Profile ID (id)
   * Messaging is a profile-related operation
   */
  const handleSendMessage = (studentId: string) => {
    toast({
      title: "Send Message", 
      description: `Opening message compose for student ${studentId}`,
    });
    // TODO: Open messaging interface
    console.log("Send message to student:", studentId);
  };

  /**
   * View student applications - uses Profile ID (id)
   * Applications are tied to student profiles
   */
  const handleViewApplications = (studentId: string) => {
    toast({
      title: "View Applications",
      description: `Opening applications for student ${studentId}`,
    });
    // TODO: Navigate to applications page filtered for this student
    console.log("View applications for student:", studentId);
  };

  const handleExportData = () => {
    toast({
      title: "Export Data",
      description: "Downloading student data as CSV",
    });
    console.log("Export student data");
  };

  const handleNewApplication = () => {
    toast({
      title: "New Application", 
      description: "Opening application creation form",
    });
    console.log("Create new application");
  };

  /**
   * Schedule meeting with student - uses Profile ID (id)
   * Meetings are scheduled with student profiles
   */
  const handleScheduleMeeting = (studentId: string) => {
    toast({
      title: "Schedule Meeting",
      description: `Opening meeting scheduler for student ${studentId}`,
    });
    console.log("Schedule meeting with student:", studentId);
  };

  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Students
                </p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.activeStudents}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Applications
                </p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.totalApplications}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">+8% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {stats.successRate}%
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">+2.1% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Bus className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Team Members
                </p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.teamMembers}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 text-sm">+3 new members</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Interactive chart would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Universities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Stanford University", applications: 45, acceptance: "92%" },
                { name: "MIT", applications: 38, acceptance: "89%" },
                { name: "Harvard University", applications: 41, acceptance: "87%" },
                { name: "Oxford University", applications: 32, acceptance: "91%" }
              ].map((uni) => (
                <div key={uni.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{uni.name}</p>
                    <p className="text-xs text-muted-foreground">{uni.applications} applications</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {uni.acceptance}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Refresh handler for student data
  const handleRefreshStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/counselor/assigned-students'] });
    toast({
      title: "Refreshing",
      description: "Updated student data loading...",
    });
  };

  const renderStudentsContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Student Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshStudents}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No students assigned to you yet.</p>
                      <p className="text-sm">Contact your admin to get students assigned.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : assignedStudents.filter((student: StudentAssignedToCounselor) => 
                !searchQuery || 
                `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (student.intendedMajor && student.intendedMajor.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map((student: StudentAssignedToCounselor) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 mr-3">
                        {student.profilePicture ? (
                          <AvatarImage src={student.profilePicture} alt={`${student.firstName} ${student.lastName}`} />
                        ) : (
                          <AvatarFallback>
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-muted-foreground">{student.intendedMajor || 'Not specified'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{student.universitiesShortlisted || 0}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(student.status || 'inquiry')}>
                      {student.status || 'inquiry'}
                    </Badge>
                  </TableCell>
                  <TableCell>You</TableCell>
                  <TableCell>{student.lastActivity || 'No recent activity'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setSelectedTab("applications");
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Applications
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewProfile(getStudentProfileId(student))}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendMessage(getStudentProfileId(student))}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedStudent(student);
                            setSelectedTab("applications");
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Applications
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleScheduleMeeting(getStudentProfileId(student))}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Meeting
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderApplicationsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {selectedStudent ? 
              `${selectedStudent.firstName} ${selectedStudent.lastName}'s Applications` : 
              'Recent Applications'
            }
          </h2>
          <p className="text-muted-foreground">
            {selectedStudent ? 
              'Monitor this student\'s university applications and progress' : 
              'Track all student applications and their status'
            }
          </p>
        </div>
        {selectedStudent && (
          <Button 
            variant="outline" 
            onClick={() => setSelectedStudent(null)}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
        )}
      </div>

      {selectedStudent ? (
        <div className="grid gap-4">
          {/* Student Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {selectedStudent.firstName?.[0]}{selectedStudent.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                  <p className="text-muted-foreground">{selectedStudent.intendedMajor || 'Not specified'}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Application Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Application Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample Application Cards */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Harvard University</h4>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200">In Progress</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Application Deadline: January 1, 2024</p>
                    <p>Status: Essays submitted, awaiting recommendation letters</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                      <span className="text-xs">75%</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Stanford University</h4>
                    <Badge variant="outline" className="text-green-600 border-green-200">Submitted</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Application Deadline: December 15, 2023</p>
                    <p>Status: Complete application submitted</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
                      </div>
                      <span className="text-xs">100%</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">MIT</h4>
                    <Badge variant="outline" className="text-red-600 border-red-200">Not Started</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Application Deadline: January 15, 2024</p>
                    <p>Status: Application not yet started</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                      </div>
                      <span className="text-xs">0%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add University
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Applications</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={handleNewApplication}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: "1",
                  student: "Michael Chen",
                  university: "Stanford University",
                  status: "under_review",
                  submitted: "2024-03-15",
                  deadline: "2024-04-01"
                },
                {
                  id: "2",
                  student: "Emily Rodriguez",
                  university: "MIT",
                  status: "submitted",
                  submitted: "2024-03-14",
                  deadline: "2024-04-15"
                },
                {
                  id: "3",
                  student: "Alex Thompson",
                  university: "Harvard University",
                  status: "draft",
                  submitted: "Not submitted",
                  deadline: "2024-04-30"
                }
              ].map((app) => (
                <div key={app.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.student}</p>
                      <p className="text-sm text-muted-foreground">{app.university}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Deadline: {app.deadline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAnalyticsContent = () => (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>New Applications</span>
                <span>85/100</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span>94.5/95%</span>
              </div>
              <Progress value={99} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Student Satisfaction</span>
                <span>4.8/5.0</span>
              </div>
              <Progress value={96} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Analytics chart would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTeamContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Maria Rodriguez",
                role: "Admin",
                email: "maria@edupath.com",
                status: "active"
              },
              {
                name: "David Wilson",
                role: "Counselor",
                email: "david@edupath.com",
                status: "active"
              },
              {
                name: "Sarah Johnson",
                role: "Counselor",
                email: "sarah@edupath.com",
                status: "active"
              }
            ].map((member, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSelectedContent = () => {
    switch (selectedTab) {
      case "overview":
        return renderOverviewContent();
      case "students":
        return renderStudentsContent();
      case "applications":
        return renderApplicationsContent();
      case "analytics":
        return renderAnalyticsContent();
      case "team":
        return renderTeamContent();
      default:
        return renderOverviewContent();
    }
  };

  if (statsLoading || teamLoading || applicationsLoading || studentsLoading) {
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
      
      <div className="flex h-[calc(100vh-4rem)] pt-20">
        {/* Floating Toggle Button (when sidebar is closed) */}
        {!sidebarOpen && (
          <div className="fixed top-20 left-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              data-testid="button-sidebar-open"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Collapsible Vertical Navigation Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative`}>
          {/* Close Toggle Button (when sidebar is open) */}
          {sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-10 shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              data-testid="button-sidebar-close"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-foreground whitespace-nowrap">Team Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 whitespace-nowrap">Counselor management</p>
          </div>
          
          <nav className="p-4 space-y-2 overflow-y-auto flex-1">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "overview"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-overview"
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Overview
            </button>
            
            <button
              onClick={() => setSelectedTab("students")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "students"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-students"
            >
              <Users className="w-4 h-4 mr-3" />
              Students
            </button>
            
            <button
              onClick={() => setSelectedTab("applications")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "applications"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-applications"
            >
              <FileText className="w-4 h-4 mr-3" />
              Applications
            </button>
            
            <button
              onClick={() => setSelectedTab("analytics")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "analytics"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-analytics"
            >
              <PieChart className="w-4 h-4 mr-3" />
              Analytics
            </button>
            
            <button
              onClick={() => setSelectedTab("team")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "team"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-team"
            >
              <Bus className="w-4 h-4 mr-3" />
              Team
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderSelectedContent()}
        </div>
      </div>
    </div>
  );
}