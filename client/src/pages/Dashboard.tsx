import { useState, useEffect } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Award,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  MessageSquare,
  Upload,
  Eye,
  Target,
  BookOpen,
  Globe
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) {
    return <LoadingSkeleton type="card" count={3} />;
  }
  const { notifications, unreadCount } = useNotifications(user.id);

  // Fetch user's applications
  const { data: applications = [], isLoading: applicationsLoading } = useApiQuery(
    ["/api/applications"],
    '/api/applications',
    undefined,
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!user,
    }
  );

  // Fetch user's documents
  const { data: documents = [], isLoading: documentsLoading } = useApiQuery(
    ["/api/documents"],
    '/api/documents',
    undefined,
    { 
      staleTime: 5 * 60 * 1000,
      enabled: !!user,
    }
  );

  // Fetch AI matches
  const { data: aiMatches = [], isLoading: matchesLoading } = useApiQuery(
    ["/api/ai/matches"],
    '/api/ai/matches',
    undefined,
    { 
      staleTime: 10 * 60 * 1000, // 10 minutes
      enabled: !!user,
    }
  );

  const stats = [
    {
      title: "Active Applications",
      value: Array.isArray(applications) ? applications.length : 0,
      change: "+2 this month",
      changeType: "positive" as const,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Documents Uploaded",
      value: Array.isArray(documents) ? documents.length : 0,
      change: "+3 this week",
      changeType: "positive" as const,
      icon: Upload,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20"
    },
    {
      title: "University Matches",
      value: Array.isArray(aiMatches) ? aiMatches.length : 0,
      change: "Updated today",
      changeType: "neutral" as const,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20"
    },
    {
      title: "Success Rate",
      value: "87%",
      change: "+5% improvement",
      changeType: "positive" as const,
      icon: Award,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "application_submitted",
      title: "Application Submitted",
      description: "Stanford University - Computer Science",
      time: "2 hours ago",
      icon: CheckCircle,
      iconColor: "text-green-600",
      status: "success"
    },
    {
      id: 2,
      type: "document_uploaded",
      title: "Document Uploaded",
      description: "Transcript - University of California",
      time: "1 day ago",
      icon: Upload,
      iconColor: "text-blue-600",
      status: "info"
    },
    {
      id: 3,
      type: "deadline_reminder",
      title: "Deadline Approaching",
      description: "MIT Application - Due in 5 days",
      time: "2 days ago",
      icon: AlertCircle,
      iconColor: "text-amber-600",
      status: "warning"
    },
    {
      id: 4,
      type: "ai_match",
      title: "New AI Match",
      description: "Harvard University - 94% compatibility",
      time: "3 days ago",
      icon: Target,
      iconColor: "text-purple-600",
      status: "info"
    }
  ];

  const applicationProgress = {
    total: 12,
    completed: 8,
    percentage: 67
  };

  if (applicationsLoading || documentsLoading || matchesLoading) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-muted-foreground">
            Track your progress and manage your university applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <div className="flex items-center">
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' :
                    'text-muted-foreground'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Application Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Application Progress</CardTitle>
                  <Button size="sm" asChild>
                    <Link href="/applications">
                      <Plus className="w-4 h-4 mr-2" />
                      New Application
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Overview */}
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {applicationProgress.completed}/{applicationProgress.total} completed
                    </span>
                  </div>
                  <Progress value={applicationProgress.percentage} className="h-2" />
                </div>

                {/* Recent Activities */}
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg border bg-card">
                      <div className={`p-2 rounded-full bg-muted`}>
                        <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI University Recommendations</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/universities">
                      <Eye className="w-4 h-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(aiMatches) ? aiMatches.slice(0, 3) : []).map((match: any) => (
                    <div key={match.id} className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary to-amber-500 rounded-lg"></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">University Match</h4>
                        <p className="text-sm text-muted-foreground">Match Score: {match.matchScore}%</p>
                      </div>
                      <Badge variant="secondary">
                        {parseFloat(match.matchScore) > 90 ? "Excellent" : 
                         parseFloat(match.matchScore) > 80 ? "Good" : "Fair"} Match
                      </Badge>
                    </div>
                  ))}
                  
                  {(!Array.isArray(aiMatches) || aiMatches.length === 0) && (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground mb-2">No AI matches yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Complete your profile to get personalized university recommendations
                      </p>
                      <Button asChild>
                        <Link href="/profile">Complete Profile</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { 
                    icon: Upload, 
                    label: "Upload Documents", 
                    href: "/documents",
                    color: "text-blue-600" 
                  },
                  { 
                    icon: Calendar, 
                    label: "Schedule Counseling", 
                    href: "/counseling",
                    color: "text-green-600" 
                  },
                  { 
                    icon: MessageSquare, 
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
                    icon: Globe, 
                    label: "Visa Information", 
                    href: "/visa-guide",
                    color: "text-teal-600" 
                  }
                ].map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className={`w-5 h-5 mr-3 ${action.color}`} />
                      <span>{action.label}</span>
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((notification: any) => (
                    <div key={notification.id} className="p-3 rounded-lg border bg-card">
                      <h4 className="text-sm font-medium text-foreground">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  {notifications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent notifications
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Success Prediction */}
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Success Prediction</h3>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">87%</div>
                <p className="text-white/80 text-sm">
                  Predicted admission success rate based on your profile
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/analytics">View Detailed Analytics</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
