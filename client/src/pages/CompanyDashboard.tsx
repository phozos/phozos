import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from '@/hooks/api-hooks';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Eye,
  Edit,
  Settings,
  Award,
  Building,
  Plus,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CompanyStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  engagementRate: number;
  recentPosts: number;
}

export default function CompanyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [companyData, setCompanyData] = useState({
    companyName: user?.companyName || '',
    description: '',
    website: '',
    industry: ''
  });

  // Fetch company stats
  const { data: stats, isLoading: statsLoading } = useApiQuery<CompanyStats>(
    ['/api/company/stats'],
    '/api/company/stats',
    undefined,
    { enabled: !!user }
  );

  // Fetch recent posts
  const { data: recentPosts, isLoading: postsLoading } = useApiQuery(
    ['/api/company/recent-posts'],
    '/api/company/recent-posts',
    undefined,
    { enabled: !!user }
  );

  const updateCompanyMutation = useApiMutation(
    async (data: any) => {
      return await api.patch('/api/company/profile', data);
    },
    {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your company profile has been updated successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setShowEditProfile(false);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update company profile.",
          variant: "destructive",
        });
      }
    }
  );

  const handleUpdateProfile = () => {
    updateCompanyMutation.mutate(companyData);
  };

  if (!user) {
    return null;
  }

  const displayName = user.companyName || `${user.firstName} ${user.lastName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Company Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Award className="w-3 h-3 mr-1" />
                    Premium Company Profile
                  </Badge>
                  <Badge variant="outline">Enhanced Forum Access</Badge>
                </div>
              </div>
            </div>
            
            <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Company Profile</DialogTitle>
                  <DialogDescription>
                    Update your company information and branding
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      value={companyData.companyName}
                      onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                      placeholder="Your company name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={companyData.description}
                      onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                      placeholder="Brief description of your company"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      placeholder="https://yourcompany.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={companyData.industry}
                      onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                      placeholder="Education, Technology, etc."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowEditProfile(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateProfile}
                      disabled={updateCompanyMutation.isPending}
                    >
                      {updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.recentPosts || 0} this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all posts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLikes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total likes received
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reach</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats?.engagementRate || 0)}%</div>
              <p className="text-xs text-muted-foreground">
                Engagement rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Community Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Share updates, insights, and engage with students in the community forum.
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => window.location.href = '/community'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Post
                </Button>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Your Enhanced Privileges:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Unlimited daily posts</li>
                    <li>Photo and media uploads</li>
                    <li>Interactive polls</li>
                    <li>Custom post titles</li>
                    <li>No cooling periods</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Track your community impact and engagement metrics.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This week's posts:</span>
                  <span className="font-medium">{stats?.recentPosts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average engagement:</span>
                  <span className="font-medium">{Math.round(stats?.engagementRate || 0)}%</span>
                </div>
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Forum Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentPosts?.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.slice(0, 5).map((post: any) => (
                  <div key={post.id} className="border-l-4 border-primary pl-4">
                    <h4 className="font-medium">{post.title || post.content.substring(0, 50) + '...'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {post.likesCount} likes • {post.commentsCount} comments • {post.viewsCount} views
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <Button variant="outline" onClick={() => window.location.href = '/community'}>
                  View All Posts
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start engaging with the community by creating your first post.
                </p>
                <Button onClick={() => window.location.href = '/community'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Post
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}