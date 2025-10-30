import { useState, useEffect } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  FileText, 
  Award,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  MessageSquare,
  Eye,
  Target,
  BookOpen,
  Globe,
  GraduationCap,
  Star,
  MapPin,
  DollarSign,
  Zap,
  BarChart3,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Heart,
  Bookmark
} from "lucide-react";
import { Link } from "wouter";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(true);
  
  if (!user) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  // Fetch real student application data
  const { data: applications = [], isLoading: applicationsLoading } = useApiQuery<any[]>(
    ['/api/applications'],
    '/api/applications',
    undefined,
    { enabled: !!user }
  );

  // Fetch real student documents
  const { data: documents = [], isLoading: documentsLoading } = useApiQuery<any[]>(
    ['/api/documents'],
    '/api/documents',
    undefined,
    { enabled: !!user }
  );

  // Fetch AI university recommendations
  const { data: recommendations = [], isLoading: recommendationsLoading } = useApiQuery<any[]>(
    ['/api/recommendations'],
    '/api/recommendations',
    undefined,
    { enabled: !!user }
  );

  // Mock data as fallback for demonstration
  const mockApplications = [
    {
      id: 1,
      university: "Stanford University",
      program: "Computer Science",
      status: "submitted",
      deadline: "2024-01-15",
      progress: 85
    },
    {
      id: 2,
      university: "MIT",
      program: "Electrical Engineering",
      status: "in_review",
      deadline: "2024-02-01",
      progress: 92
    },
    {
      id: 3,
      university: "Harvard University",
      program: "Business Administration",
      status: "draft",
      deadline: "2024-01-30",
      progress: 45
    }
  ];

  const mockDocuments = [
    { id: 1, name: "Transcript", status: "verified", uploadDate: "2024-01-10" },
    { id: 2, name: "IELTS Score", status: "pending", uploadDate: "2024-01-12" },
    { id: 3, name: "Personal Statement", status: "verified", uploadDate: "2024-01-08" }
  ];

  const mockRecommendations = [
    {
      id: 1,
      university: "University of Toronto",
      country: "Canada",
      matchScore: 95,
      program: "Computer Science",
      tuition: "$45,000",
      ranking: "#18 Globally"
    },
    {
      id: 2,
      university: "University of Melbourne",
      country: "Australia", 
      matchScore: 88,
      program: "Data Science",
      tuition: "$42,000",
      ranking: "#33 Globally"
    },
    {
      id: 3,
      university: "ETH Zurich",
      country: "Switzerland",
      matchScore: 82,
      program: "Computer Engineering",
      tuition: "$1,500",
      ranking: "#7 Globally"
    }
  ];





  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white via-amber-50/20 to-orange-50/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
      {/* Optimized Background - Reduced orbs for better performance */}
      <div className="fixed inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-purple-200/40 to-blue-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br from-amber-200/35 to-orange-200/25 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-br from-indigo-200/30 to-purple-200/20 rounded-full blur-xl"></div>
      </div>
      
      {/* Subtle grain texture overlay */}
      <div className="fixed inset-0 opacity-[0.02] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22/%3E%3C/filter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] pointer-events-none"></div>
      
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-8 space-y-8 relative z-10">
        {/* Hero Section with Premium Liquid Glass Effect */}
        <div className="relative group">
          <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[3rem] p-8 md:p-12 text-center overflow-hidden group">
            <div className="relative z-10">
              <div className="animate-fade-in">
                <div className="flex items-center justify-between text-left">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                      Welcome back, {user?.firstName || 'Student'}!
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-2xl">
                      Your journey to international education continues with AI-powered guidance
                    </p>
                    <div className="flex items-center space-x-4">
                      <Badge className="bg-gradient-to-r from-primary to-amber-500 text-white px-4 py-2 shadow-lg">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Student Dashboard
                      </Badge>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 shadow-lg">
                        <Star className="w-4 h-4 mr-2" />
                        Premium Member
                      </Badge>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <Avatar className="w-20 h-20 border-4 border-white/40 shadow-xl">
                      <AvatarImage src={user?.profilePicture || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-primary to-amber-500 text-white text-2xl font-bold">
                        {user?.firstName?.[0] || 'S'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>





        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Application Progress */}
            <div className="relative group">
              <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[2.5rem] p-8 md:p-12 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Application Progress</h2>
                      <p className="text-muted-foreground text-lg">Track your university applications</p>
                    </div>
                    <Button size="lg" className="group relative px-6 py-3 text-lg font-semibold bg-primary hover:bg-primary/90 text-white rounded-[1.25rem] shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                      <Link href="/applications">
                        <span className="relative z-10 flex items-center">
                          <Plus className="mr-2 w-5 h-5" />
                          New Application
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
                {applicationsLoading ? (
                  <div className="space-y-4">
                    <LoadingSkeleton count={3} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(applications.length > 0 ? applications : mockApplications).map((application: any) => (
                    <Card key={application.id} className="group relative liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem]">
                      <CardContent className="relative p-6 z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="relative w-14 h-14 bg-primary rounded-[1.25rem] flex items-center justify-center shadow-[0_4px_16px_0_rgba(31,38,135,0.2)] group-hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.3)] transition-all duration-300">
                              <GraduationCap className="relative z-10 w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">{application.university}</h3>
                              <p className="text-muted-foreground">{application.program}</p>
                            </div>
                          </div>
                          <Badge className={`${
                            application.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            application.status === 'in_review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          } border-0`}>
                            {application.status === 'submitted' ? 'Submitted' :
                             application.status === 'in_review' ? 'In Review' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{application.progress}%</span>
                          </div>
                          <Progress value={application.progress} className="h-2" />
                          <div className="flex items-center justify-between text-sm pt-2">
                            <span className="text-muted-foreground">Deadline: {new Date(application.deadline).toLocaleDateString()}</span>
                            <Button variant="outline" size="sm" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                              View Details <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="relative group">
              <div className="relative liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[2.5rem] p-8 md:p-12 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center mb-2">
                        <Zap className="w-7 h-7 mr-3 text-amber-500" />
                        AI University Recommendations
                      </h2>
                      <p className="text-muted-foreground text-lg">Personalized matches based on your profile</p>
                    </div>
                    <Button variant="outline" size="lg" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] rounded-2xl transition-all duration-300" asChild>
                      <Link href="/universities">
                        <Eye className="w-5 h-5 mr-2" />
                        View All
                      </Link>
                    </Button>
                  </div>
                  <Badge className="absolute -top-4 -right-4 bg-gradient-to-r from-primary to-pink-500 text-white px-4 py-2">
                    <Zap className="w-4 h-4 mr-2" />
                    AI Powered
                  </Badge>
                </div>
                {recommendationsLoading ? (
                  <div className="space-y-4">
                    <LoadingSkeleton count={3} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(recommendations.length > 0 ? recommendations : mockRecommendations).map((recommendation: any) => (
                    <Card key={recommendation.id} className="group relative liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem] hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.12)] transition-all transform hover:-translate-y-1">
                      <CardContent className="relative p-6 z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-primary to-amber-500 rounded-[1.5rem] flex items-center justify-center shadow-[0_4px_16px_0_rgba(31,38,135,0.2)]">
                              <GraduationCap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-semibold text-foreground mb-2">{recommendation.university}</h4>
                              <div className="flex items-center space-x-4 mb-2">
                                <span className="flex items-center text-muted-foreground">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {recommendation.country}
                                </span>
                                <span className="flex items-center text-muted-foreground">
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  {recommendation.program}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center text-muted-foreground">
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  {recommendation.tuition}/year
                                </span>
                                <span className="flex items-center text-muted-foreground">
                                  <Award className="w-4 h-4 mr-1" />
                                  {recommendation.ranking}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2 mb-2">
                              <Star className="w-5 h-5 text-amber-500 fill-current" />
                              <span className="text-2xl font-bold text-primary">{recommendation.matchScore}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">Match Score</p>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                                <Heart className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                                <Bookmark className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="relative group">
              <div className="relative liquid-glass-card dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem] overflow-hidden">
                <div 
                  className="cursor-pointer p-6 hover:bg-white/5 transition-colors duration-200"
                  onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-xl">
                      {isQuickActionsExpanded ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </div>
                {isQuickActionsExpanded && (
                  <div className="px-6 pb-6 max-h-80 overflow-y-auto custom-scrollbar space-y-3">
                    {[
                      { 
                        icon: Calendar, 
                        label: "Schedule Counseling", 
                        href: "/counseling",
                        color: "text-green-600"
                      },
                      { 
                        icon: MessageSquare, 
                        label: "Chat with Counselor", 
                        href: "/student/chat",
                        color: "text-indigo-600"
                      },
                      { 
                        icon: Users, 
                        label: "Join Community", 
                        href: "/community",
                        color: "text-purple-600"
                      },
                      { 
                        icon: BookOpen, 
                        label: "Browse Universities", 
                        href: "/universities",
                        color: "text-amber-600"
                      },
                      { 
                        icon: Settings, 
                        label: "Profile Settings", 
                        href: "/profile",
                        color: "text-gray-600"
                      },
                      { 
                        icon: Bell, 
                        label: "Notifications", 
                        href: "/notifications",
                        color: "text-orange-600"
                      }
                    ].map((action) => (
                      <Button
                        key={action.label}
                        variant="ghost"
                        className="w-full justify-start h-12 minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-[1.25rem] transition-all duration-300"
                        asChild
                      >
                        <Link href={action.href}>
                          <action.icon className={`w-5 h-5 mr-3 ${action.color}`} />
                          <span className="font-medium text-foreground">{action.label}</span>
                          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}