import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'customer' | 'team_member' | 'company_profile';
  teamRole?: string | null;
  profilePicture?: string | null;
  accountStatus?: "active" | "inactive" | "pending_approval" | "suspended" | "rejected";
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

interface ProfileOverviewCardProps {
  user: User;
  onChangePassword: () => void;
  showAccountStats?: boolean;
}

export default function ProfileOverviewCard({ 
  user, 
  onChangePassword, 
  showAccountStats = true 
}: ProfileOverviewCardProps) {
  const getInitials = () => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const getUserTypeLabel = () => {
    if (user.userType === 'customer') return 'Student';
    if (user.userType === 'team_member') {
      return user.teamRole === 'admin' ? 'Administrator' : 'Team Member';
    }
    if (user.userType === 'company_profile') return 'Company Profile';
    return 'User';
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.profilePicture || ""} />
              <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>

            <Badge variant="secondary" className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              {getUserTypeLabel()}
            </Badge>

            <div className="w-full space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={onChangePassword}
              >
                <Shield className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Stats */}
      {showAccountStats && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Account Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last login</span>
              <span className="font-medium">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account status</span>
              <Badge variant={user.accountStatus === "active" ? "default" : "secondary"}>
                {user.accountStatus === "active" ? "Active" : 
                 user.accountStatus === "inactive" ? "Inactive" :
                 user.accountStatus === "pending_approval" ? "Pending Approval" :
                 user.accountStatus === "suspended" ? "Suspended" :
                 user.accountStatus === "rejected" ? "Rejected" : "Unknown"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}