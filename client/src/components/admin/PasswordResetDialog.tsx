import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Eye, EyeOff, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwordData: {
    temporaryPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'team_member' | 'customer' | 'company_profile';
  } | null;
}

export function PasswordResetDialog({ 
  open, 
  onOpenChange, 
  passwordData 
}: PasswordResetDialogProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const handleCopyPassword = async () => {
    if (!passwordData?.temporaryPassword) return;
    
    try {
      await navigator.clipboard.writeText(passwordData.temporaryPassword);
      setCopied(true);
      setPasswordCopied(true); // Track that password has been copied at least once
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = passwordData.temporaryPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setPasswordCopied(true); // Track that password has been copied at least once
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'team_member':
        return 'Staff Member';
      case 'customer':
        return 'Student';
      case 'company_profile':
        return 'Company Profile';
      default:
        return 'User';
    }
  };

  const handleClose = () => {
    setCopied(false);
    setShowPassword(false);
    setPasswordCopied(false); // Reset password copied state
    onOpenChange(false);
  };

  // Check if current user is an admin
  const isCurrentUserAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';
  
  // Determine if Done button should be disabled
  const isDoneButtonDisabled = isCurrentUserAdmin && !passwordCopied;

  if (!passwordData) return null;

  // Handle dialog close attempts - block unauthorized closing for admins
  const handleDialogOpenChange = (nextOpen: boolean) => {
    // If trying to close and admin hasn't copied password, prevent closing
    if (!nextOpen && isDoneButtonDisabled) {
      return; // Block the close attempt
    }
    
    // Otherwise allow normal close behavior
    if (!nextOpen) {
      handleClose();
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleDialogOpenChange}
    >
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          // Prevent Escape key from closing if admin hasn't copied password
          if (isDoneButtonDisabled) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent overlay click from closing if admin hasn't copied password
          if (isDoneButtonDisabled) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-green-600" />
            <DialogTitle className="text-lg font-semibold">
              Password Reset Successful
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            New temporary password generated for{" "}
            <span className="font-medium text-foreground">
              {passwordData.firstName} {passwordData.lastName}
            </span>{" "}
            ({getUserTypeLabel(passwordData.userType)})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium text-muted-foreground">
                EMAIL
              </Label>
              <span className="text-sm font-medium">{passwordData.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium text-muted-foreground">
                USER TYPE
              </Label>
              <span className="text-sm font-medium">
                {getUserTypeLabel(passwordData.userType)}
              </span>
            </div>
          </div>

          {/* Password Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">New Temporary Password</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.temporaryPassword}
                  readOnly
                  className="pr-10 font-mono text-sm bg-background border-2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyPassword}
                className={cn(
                  "flex items-center gap-2 min-w-[100px]",
                  copied 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 This password is temporary and should be changed after first login.
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-800">
                  Security Notice
                </p>
                <p className="text-xs text-yellow-700">
                  Share this password securely with the user. The password is encrypted in the database and can only be viewed once during reset.
                </p>
                {isDoneButtonDisabled && (
                  <p className="text-xs text-red-700 font-medium mt-2">
                    🔒 You must copy the password before closing this dialog.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCopyPassword}
            className="flex-1 sm:flex-none"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Password
          </Button>
          <Button 
            onClick={handleClose}
            disabled={isDoneButtonDisabled}
            className={cn(
              "flex-1 sm:flex-none",
              isDoneButtonDisabled && "opacity-50 cursor-not-allowed"
            )}
            title={isDoneButtonDisabled ? "Please copy the password first before closing" : undefined}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}