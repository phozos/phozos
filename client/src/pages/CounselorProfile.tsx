import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import ProfileOverviewCard from '@/components/profile/ProfileOverviewCard';
import PersonalInfoForm from '@/components/profile/PersonalInfoForm';
import PasswordChangeDialog from '@/components/profile/PasswordChangeDialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Settings, User, Users } from "lucide-react";
import { Link } from "wouter";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function CounselorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        location: '',
        bio: ''
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You must be logged in to view your profile.</p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Ensure counselor access
  if (user.userType !== 'team_member' || user.teamRole !== 'counselor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Counselor Access Required</h1>
          <p className="text-gray-600 mb-4">This page is only accessible to counselor users.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put('/api/users/profile', formData);
      setIsEditing(false);
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        location: '',
        bio: ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/team">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold">Counselor Profile</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview - Left Column */}
          <div className="lg:col-span-1">
            <ProfileOverviewCard 
              user={user} 
              onChangePassword={() => setIsPasswordDialogOpen(true)}
            />
          </div>

          {/* Profile Management - Right Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Profile Management</CardTitle>
                </div>
                <CardDescription>
                  Manage your counselor account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">
                      <User className="h-4 w-4 mr-2" />
                      Personal Information
                    </TabsTrigger>
                    <TabsTrigger value="security">
                      <Shield className="h-4 w-4 mr-2" />
                      Security
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="mt-6">
                    <PersonalInfoForm 
                      user={user}
                      formData={formData}
                      isEditing={isEditing}
                      onFormDataChange={setFormData}
                      onEditToggle={handleEditToggle}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  </TabsContent>
                  
                  <TabsContent value="security" className="mt-6">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Password Security</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Keep your counselor account secure by using a strong password and changing it regularly.
                        </p>
                        <Button 
                          onClick={() => setIsPasswordDialogOpen(true)}
                          variant="outline"
                        >
                          Change Password
                        </Button>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Counselor Role
                        </h3>
                        <p className="text-sm text-gray-600">
                          You have counselor access to the Phozos platform. 
                          You can manage student applications and provide guidance to help students succeed.
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Team Role: {user.teamRole || 'Counselor'}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Password Change Dialog */}
        <PasswordChangeDialog 
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          passwordForm={passwordForm}
          onPasswordFormChange={setPasswordForm}
        />
      </div>
    </div>
  );
}