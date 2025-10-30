import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Shield, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function StaffInvite() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    teamRole: "counselor" as "admin" | "counselor"
  });

  // Extract token from URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const urlToken = pathParts[pathParts.length - 1];
    if (urlToken) {
      setToken(urlToken);
      validateInvitationToken(urlToken);
    }
  }, []);

  const validateInvitationToken = async (inviteToken: string) => {
    try {
      await api.get(`/api/staff-invite/${inviteToken}`);
      setIsValidToken(true);
    } catch (error) {
      setIsValidToken(false);
      setError("Invalid or expired invitation link");
    }
  };

  const handleStaffRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.post("/api/auth/register-staff", {
        ...formData,
        invitationToken: token
      });
      
      // Auto-login after successful registration
      login(data.user);
      
      // Navigate to appropriate dashboard
      if (formData.teamRole === "admin") {
        navigate("/dashboard/admin");
      } else {
        navigate("/dashboard/team");
      }

    } catch (error: any) {
      setError(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Join Phozos Team</CardTitle>
          <CardDescription>
            Create your staff account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Invitation validated successfully! Please create your account below.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleStaffRegistration} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your work email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamRole">Role</Label>
              <select
                id="teamRole"
                value={formData.teamRole}
                onChange={(e) => setFormData({...formData, teamRole: e.target.value as "admin" | "counselor"})}
                className="w-full p-2 border border-input rounded-md bg-background"
                required
              >
                <option value="counselor">Counselor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground"
              >
                ← Back to home
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}