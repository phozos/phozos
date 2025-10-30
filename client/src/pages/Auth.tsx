import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Users, Shield, Eye, EyeOff, AlertTriangle, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import MathCaptcha from "@/components/MathCaptcha";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { SEO } from "@/components/SEO";

// Interface for security settings to ensure proper typing
interface SecuritySettings {
  visible?: boolean;
  secretCode?: string;
}

export default function Auth() {
  const [location, navigate] = useLocation();
  const { login, getCsrfToken } = useAuth();
  const [loginType, setLoginType] = useState<"student" | "admin" | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mathChallenge, setMathChallenge] = useState<string>("");
  const [mathAnswer, setMathAnswer] = useState<string>("");
  const [formStartTime, setFormStartTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Handle phone number validation and country detection
  const handlePhoneChange = (phoneNumber: string) => {
    setFormData({...formData, phone: phoneNumber});
    
    if (phoneNumber.length === 0) {
      setPhoneCountry(null);
      setPhoneValid(null);
      return;
    }
    
    try {
      // Check if phone number is valid
      const isValid = isValidPhoneNumber(phoneNumber);
      setPhoneValid(isValid);
      
      if (isValid) {
        const phoneObj = parsePhoneNumber(phoneNumber);
        const countryName = getCountryName(phoneObj?.country);
        setPhoneCountry(countryName);
      } else {
        setPhoneCountry(null);
      }
    } catch (error) {
      setPhoneValid(false);
      setPhoneCountry(null);
    }
  };

  // Get country name from country code
  const getCountryName = (countryCode: string | undefined): string | null => {
    if (!countryCode) return null;
    
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'IN': 'India',
      'GB': 'United Kingdom', 
      'AU': 'Australia',
      'CA': 'Canada',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'CN': 'China',
      'JP': 'Japan',
      'KR': 'South Korea',
      'RU': 'Russia',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'ZA': 'South Africa',
      'KE': 'Kenya',
      'GH': 'Ghana',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'BD': 'Bangladesh',
      'PK': 'Pakistan',
      'NP': 'Nepal',
      'LK': 'Sri Lanka'
    };
    
    return countryNames[countryCode] || countryCode;
  };

  // Query security settings to check team login visibility
  const { data: securitySettings, isLoading: securityLoading } = useApiQuery<SecuritySettings>(
    ['/api/auth/team-login-visibility'],
    '/api/auth/team-login-visibility',
    undefined,
    {
      staleTime: 1 * 60 * 1000, // 1 minute - reduced to get fresh data
      refetchOnMount: true, // Always refetch when component mounts
    }
  );

  // Check if team login should be visible
  const isTeamLoginVisible = (): boolean => {
    // Don't show anything while loading
    if (securityLoading) return false;
    
    // Properly type the security settings to avoid unknown type issues
    const settings = securitySettings as SecuritySettings | undefined;
    
    const isVisibleByDefault = settings?.visible === true;
    const secretCode = settings?.secretCode || 'edupath-admin-2025';
    const isVisibleBySecret = searchQuery.toLowerCase() === secretCode.toLowerCase();
    return isVisibleByDefault || isVisibleBySecret;
  };

  // Check URL parameters for admin access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'admin') {
      setLoginType('admin');
    }
  }, [location]);

  const handleStudentAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Ensure CSRF token is available before making request
    console.log('🔒 Attempting to get CSRF token for student registration...');
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      console.error('🔒 Failed to get CSRF token for student registration');
      setError("Unable to establish secure connection. This may be due to network issues or browser restrictions. Please try: 1) Refreshing the page, 2) Clearing browser cache, or 3) Using a different browser.");
      setIsLoading(false);
      return;
    }
    console.log('🔒 CSRF token obtained successfully for student registration');
    
    const endpoint = isSignup ? "/api/auth/student-register" : "/api/auth/student-login";
    
    // For signup, include anti-spam data
    const payload = isSignup 
      ? { 
          ...formData, 
          mathChallenge,
          mathAnswer,
          formStartTime: formStartTime.toString(),
          honeypot: "" // Hidden field for bot detection
        } 
      : { email: formData.email, password: formData.password };
    
    // Validate math answer for signup
    if (isSignup && (!mathAnswer || mathAnswer.trim() === "")) {
      setError("Please solve the math problem");
      setIsLoading(false);
      return;
    }
    
    // Validate phone number for signup
    if (isSignup && formData.phone && !phoneValid) {
      setError("Please enter a valid phone number with country code");
      setIsLoading(false);
      return;
    }
    
    try {
      const data = await api.post(endpoint, payload) as any;
      
      if (isSignup) {
        // Registration successful - show message and switch to login
        setError(null);
        alert(data.message || "Registration successful! Please login.");
        setIsSignup(false);
        setFormData({ email: formData.email, password: "", firstName: "", lastName: "", phone: "" });
        setPhoneCountry(null);
        setPhoneValid(null);
        setMathAnswer("");
        setFormStartTime(Date.now());
      } else {
        // Login successful - await proper state synchronization
        // API client now auto-unwraps the envelope, so data is the payload directly
        try {
          await login(data.user, data.token);
          
          // Show cooling period message if applicable
          if (data.coolingPeriod) {
            alert("Login successful! Note: Community posting is restricted for the first hour.");
          }
          
          // Navigate after login state is properly set
          navigate("/dashboard/student");
        } catch (error) {
          console.error('Login state setup failed:', error);
          setError('Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error("Student auth error:", error);
      setError("Network error. Please try again.");
      if (isSignup) {
        setMathAnswer("");
        setFormStartTime(Date.now());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Ensure CSRF token is available before making request
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setError("Unable to establish secure connection. This may be due to network issues or browser restrictions. Please try: 1) Refreshing the page, 2) Clearing browser cache, or 3) Using a different browser.");
      setIsLoading(false);
      return;
    }
    
    try {
      // API client now auto-unwraps the envelope, so we get the login response directly
      const response = await api.post("/api/auth/team-login", {
        email: formData.email,
        password: formData.password,
      }) as any;
      
      // Wait for login state to be properly set
      await login(response.user, response.token);
      
      // Navigate based on role after login completion
      if (response.user.teamRole === "admin") {
        navigate("/dashboard/admin");
      } else {
        navigate("/dashboard/team");
      }
    } catch (error) {
      console.error("Team login error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToMain = () => {
    setLoginType(null);
    setIsSignup(false);
    setFormData({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  };

  // Main login selection screen
  if (!loginType) {
    return (
      <>
        <SEO
          title="Login & Sign Up - Phozos Study Abroad"
          description="Join Phozos Study Abroad to start your international education journey."
          canonical="/auth"
          noindex={true}
        />
        
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Back to Home Button */}
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>

          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-amber-500 rounded-2xl flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to Phozos</h1>
            <p className="text-muted-foreground">Choose how you'd like to sign in</p>
          </div>

          {/* Login Options */}
          <div className="space-y-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-accent/50"
              onClick={() => setLoginType("student")}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Student Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign in or get started with your student journey
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Login - conditionally shown based on security settings */}
            {Boolean(isTeamLoginVisible()) && (
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-accent/50"
                onClick={() => setLoginType("admin")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Team Access</h3>
                      <p className="text-sm text-muted-foreground">
                        Staff and counselor login
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secret Search Input - only show if team login is not visible by default */}
            {Boolean(securitySettings && !(securitySettings as SecuritySettings)?.visible) && (
              <div className="pt-4">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-center bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  // Student Authentication (Email/Password)
  if (loginType === "student") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Back to Home Button */}
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-amber-500 rounded-xl flex items-center justify-center mx-auto">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl">
                {isSignup ? "Get Started - Create Account" : "Sign In to Your Account"}
              </CardTitle>
              <CardDescription>
                {isSignup ? "Create your student account to begin your education journey" : "Welcome back! Sign in to access your dashboard"}
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleStudentAuth} className="space-y-4">
              {isSignup && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
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
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>
              )}

              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890 (include country code)"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`pl-10 ${
                        phoneValid === true ? 'border-green-500 focus:border-green-500' : 
                        phoneValid === false ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                      required
                    />
                  </div>
                  
                  {phoneCountry && phoneValid && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Phone number from {phoneCountry}</span>
                    </div>
                  )}
                  
                  {phoneValid === false && formData.phone.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Please include country code (e.g., +1, +44, +91)</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Include country code so counselors can contact you easily
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={isSignup ? "Enter Gmail or Outlook email" : "Enter your email"}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
                {isSignup && (
                  <p className="text-xs text-muted-foreground">
                    Only @gmail.com and @outlook.com emails are accepted
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignup ? "Create a password" : "Enter your password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={isSignup ? 8 : undefined}
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
                {isSignup && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              {isSignup && (
                <>
                  <MathCaptcha
                    onVerify={(challenge, answer) => {
                      setMathChallenge(challenge);
                      setMathAnswer(answer);
                    }}
                    onAnswerChange={setMathAnswer}
                  />
                  {/* Hidden honeypot field for bot detection */}
                  <input 
                    type="text" 
                    name="honeypot" 
                    style={{ display: 'none' }} 
                    tabIndex={-1} 
                    autoComplete="off" 
                  />
                </>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || (isSignup && !mathAnswer.trim())}>
                {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
              </Button>
            </form>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm"
              >
                {isSignup ? "Already have an account? Sign in" : "New to Phozos? Get started"}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Admin Login (Hidden access)
  if (loginType === "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Back to Home Button */}
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Admin Access</CardTitle>
              <CardDescription>
                Secure administrator login
              </CardDescription>
            </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleTeamLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your admin email"
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
                    placeholder="Enter your password"
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return null;
}