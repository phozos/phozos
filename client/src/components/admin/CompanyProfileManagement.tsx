import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, type AccountStatus } from "@shared/account-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Building2,
  UserCheck,
  UserX,
  Star,
  Mail,
  Key,
  Copy,
  Shield
} from "lucide-react";
import { PasswordResetDialog } from "./PasswordResetDialog";

interface CompanyProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  accountStatus: string;
  createdAt: string;
  updatedAt?: string;
  companyName?: string;
  temporaryPassword?: string;
}

interface NewCompanyProfile {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  generatePassword: boolean;
}

export default function CompanyProfileManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CompanyProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  // Password Reset Dialog State
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [passwordResetData, setPasswordResetData] = useState<{
    temporaryPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'team_member' | 'customer' | 'company_profile';
  } | null>(null);
  const [editForm, setEditForm] = useState<{firstName: string; lastName: string; email: string; companyName: string}>({firstName: "", lastName: "", email: "", companyName: ""});
  const [newProfile, setNewProfile] = useState<NewCompanyProfile>({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    generatePassword: true // Default to true so users get password by default
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company profiles
  const { 
    data: companyProfiles = [], 
    isLoading: profilesLoading, 
    error: profilesError,
    isError: profilesIsError 
  } = useApiQuery<CompanyProfile[]>(
    ["/api/admin/company-profiles"],
    "/api/admin/company-profiles",
    undefined,
    { staleTime: 30 * 1000 }
  );

  // Create company profile mutation
  const createProfileMutation = useApiMutation(
    async (profileData: NewCompanyProfile) => {
      return await api.post("/api/admin/company-profiles", profileData);
    },
    {
      onSuccess: (data: any) => {
        // API client now auto-unwraps the envelope, so data is the payload directly
        const payload = data;
        
        toast({
          title: "Success",
          description: "Company profile created successfully"
        });
        
        // Show temporary password popup if one was generated - aligned with staff creation flow
        if (payload.temporaryPassword) {
          setPasswordResetData({
            temporaryPassword: payload.temporaryPassword,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            userType: 'company_profile',
          });
          setShowPasswordResetDialog(true);
        }
        
        setShowCreateDialog(false);
        setNewProfile({
          email: "",
          firstName: "",
          lastName: "",
          companyName: "",
          generatePassword: true
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/company-profiles"] });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create company profile",
          variant: "destructive"
        });
      }
    }
  );

  // Update company profile mutation
  const updateProfileMutation = useApiMutation(
    async ({ id, profileData }: { id: string; profileData: Partial<CompanyProfile> }) => {
      return await api.put(`/api/admin/company-profiles/${id}`, profileData);
    },
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Company profile updated successfully"
        });
        setEditingProfile(null);
        setShowEditDialog(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/company-profiles"] });
      },
      onError: (error: any) => {
        toast({
          title: "Error", 
          description: error.message || "Failed to update company profile",
          variant: "destructive"
        });
      }
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useApiMutation(
    async (id: string) => {
      return await api.post(`/api/admin/company-profiles/${id}/reset-password`);
    },
    {
      onSuccess: (data: any, variables) => {
        // Find the profile data for the popup
        const profile = companyProfiles.find(p => p.id === variables);
        if (profile) {
          // Set password reset data for the secure popup dialog
          // API client now auto-unwraps the envelope, so data is the payload directly
          setPasswordResetData({
            temporaryPassword: data.newPassword || data.temporaryPassword,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            userType: 'company_profile',
          });
          
          // Show the secure password reset dialog
          setShowPasswordResetDialog(true);
        }
        
        toast({
          title: "Success",
          description: "Password reset successfully"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive"
        });
      }
    }
  );

  // Delete company profile mutation
  const deleteProfileMutation = useApiMutation(
    async (id: string) => {
      return await api.delete(`/api/admin/company-profiles/${id}`);
    },
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Company profile deleted successfully"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/company-profiles"] });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete company profile", 
          variant: "destructive"
        });
      }
    }
  );

  // Toggle profile status mutation  
  const toggleCompanyStatusMutation = useApiMutation(
    async ({ companyId, status }: { companyId: string; status: AccountStatus }) => {
      return await api.put(`/api/admin/company-profiles/${companyId}/toggle-status`, { status });
    },
    {
      onSuccess: () => {
        toast({
          title: "Status Updated",
          description: "Company profile status has been updated successfully."
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/company-profiles"] });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update company status",
          variant: "destructive"
        });
      }
    }
  );

  const handleCreateSubmit = () => {
    if (!newProfile.email || !newProfile.firstName || !newProfile.lastName || !newProfile.companyName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    createProfileMutation.mutate(newProfile);
  };

  const handleEditClick = (profile: CompanyProfile) => {
    setEditingProfile(profile);
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      companyName: profile.companyName || ""
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = () => {
    if (!editingProfile) return;
    
    if (!editForm.firstName || !editForm.lastName || !editForm.email || !editForm.companyName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (First Name, Last Name, Email, Company Name)",
        variant: "destructive"
      });
      return;
    }
    
    updateProfileMutation.mutate({
      id: editingProfile.id,
      profileData: editForm
    });
  };


  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Password copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Company Profiles</h2>
          <p className="text-muted-foreground">Manage company profiles with special forum privileges</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-company-profile"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Company Profile
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Company Profiles</h3>
                <p className="text-sm text-muted-foreground">
                  {companyProfiles.length} total profiles
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Special Privileges</p>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Forum Premium Access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Company Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="text-center py-8">
              <p>Loading company profiles...</p>
            </div>
          ) : companyProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No company profiles created yet</p>
              <Button 
                className="mt-4" 
                onClick={() => setShowCreateDialog(true)}
              >
                Create First Company Profile
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyProfiles.map((profile: CompanyProfile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Premium Access
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                        <p className="text-sm text-muted-foreground">Contact Person</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{profile.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.accountStatus === "active" ? "default" : "secondary"}>
                        {profile.accountStatus === "active" ? "Active" : 
                         profile.accountStatus === "inactive" ? "Inactive" :
                         profile.accountStatus === "pending_approval" ? "Pending Approval" :
                         profile.accountStatus === "suspended" ? "Suspended" :
                         profile.accountStatus === "rejected" ? "Rejected" : profile.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(profile)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(profile.id)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
                                <DropdownMenuItem
                                  key={value}
                                  onClick={() => toggleCompanyStatusMutation.mutate({ companyId: profile.id, status: value as AccountStatus })}
                                  disabled={profile.accountStatus === value}
                                >
                                  {label}
                                  {profile.accountStatus === value && " (Current)"}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteProfileMutation.mutate(profile.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Company Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Company Profile</DialogTitle>
            <DialogDescription>
              Company profiles have special forum privileges including unlimited posting, photo sharing, and polls.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newProfile.firstName}
                  onChange={(e) => setNewProfile(prev => ({...prev, firstName: e.target.value}))}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newProfile.lastName}
                  onChange={(e) => setNewProfile(prev => ({...prev, lastName: e.target.value}))}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newProfile.email}
                onChange={(e) => setNewProfile(prev => ({...prev, email: e.target.value}))}
                placeholder="john@company.com"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={newProfile.companyName}
                onChange={(e) => setNewProfile(prev => ({...prev, companyName: e.target.value}))}
                placeholder="Acme Corporation"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <input
                  type="checkbox"
                  id="generatePassword"
                  checked={newProfile.generatePassword}
                  onChange={(e) => setNewProfile(prev => ({...prev, generatePassword: e.target.checked}))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="generatePassword" className="font-medium text-blue-900 dark:text-blue-100">
                  🔐 Auto-generate temporary password for login
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                ✅ Recommended: Creates a secure temporary password that will be shown in a popup for you to copy and share with the company.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSubmit}
              disabled={createProfileMutation.isPending}
              data-testid="button-submit-create"
            >
              {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Company Profile</DialogTitle>
            <DialogDescription>
              Update company profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({...prev, firstName: e.target.value}))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({...prev, lastName: e.target.value}))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCompanyName">Company Name *</Label>
              <Input
                id="editCompanyName"
                value={editForm.companyName}
                onChange={(e) => setEditForm(prev => ({...prev, companyName: e.target.value}))}
                placeholder="Acme Corporation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secure Password Reset Dialog */}
      <PasswordResetDialog
        open={showPasswordResetDialog}
        onOpenChange={setShowPasswordResetDialog}
        passwordData={passwordResetData}
      />

    </div>
  );
}