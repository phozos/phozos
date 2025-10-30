import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileOverviewCard from "@/components/profile/ProfileOverviewCard";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import PasswordChangeDialog from "@/components/profile/PasswordChangeDialog";

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
    location: "",
    bio: ""
  });
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleSave = async () => {
    try {
      await api.put('/api/users/profile', formData);
      setIsEditing(false);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      location: "",
      bio: ""
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and personal information
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Overview */}
          <div className="md:col-span-1">
            <ProfileOverviewCard 
              user={user}
              onChangePassword={() => setShowPasswordDialog(true)}
              showAccountStats={true}
            />
          </div>

          {/* Profile Details */}
          <div className="md:col-span-2">
            <PersonalInfoForm
              user={user}
              formData={formData}
              isEditing={isEditing}
              onFormDataChange={setFormData}
              onEditToggle={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>

      {/* Password Change Dialog */}
      <PasswordChangeDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        passwordForm={passwordForm}
        onPasswordFormChange={setPasswordForm}
      />

      <Footer />
    </div>
  );
}