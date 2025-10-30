import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Edit, Save, X } from "lucide-react";

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
}

interface PersonalInfoFormProps {
  user: User;
  formData: FormData;
  isEditing: boolean;
  onFormDataChange: (data: FormData) => void;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export default function PersonalInfoForm({
  user,
  formData,
  isEditing,
  onFormDataChange,
  onEditToggle,
  onSave,
  onCancel
}: PersonalInfoFormProps) {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await onSave();
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={onCancel} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={onEditToggle} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <div className="mt-1">
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => onFormDataChange({ ...formData, firstName: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{user.firstName}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <div className="mt-1">
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => onFormDataChange({ ...formData, lastName: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{user.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="mt-1">
              <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="mt-1">
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
                />
              ) : (
                <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{formData.phone || "Not provided"}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="mt-1">
              {isEditing ? (
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => onFormDataChange({ ...formData, location: e.target.value })}
                />
              ) : (
                <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{formData.location || "Not provided"}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <div className="mt-1">
              {isEditing ? (
                <textarea
                  id="bio"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => onFormDataChange({ ...formData, bio: e.target.value })}
                />
              ) : (
                <div className="min-h-[80px] px-3 py-2 border rounded-md bg-muted">
                  <span>{formData.bio || "No bio provided"}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings Card - Static for now */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">
                Keep your account secure with a strong password
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}