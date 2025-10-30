import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ('customer' | 'team_member' | 'company_profile')[];
  allowedRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  allowedUserTypes = ['customer', 'team_member', 'company_profile'],
  allowedRoles 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Don't redirect while authentication is still loading
    if (loading) {
      return;
    }

    // User not authenticated - redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // User is authenticated - check permissions
    if (user) {
      // Check user type permissions
      if (!allowedUserTypes.includes(user.userType)) {
        // Redirect to appropriate dashboard
        if (user.userType === 'customer') {
          navigate('/dashboard/student');
        } else if (user.userType === 'company_profile') {
          navigate('/dashboard/company');
        } else if (user.userType === 'team_member' && user.teamRole === 'admin') {
          navigate('/dashboard/admin');
        } else if (user.userType === 'team_member') {
          navigate('/dashboard/team');
        }
        return;
      }

      // Check role permissions for team members (with better validation)
      if (allowedRoles && user.userType === 'team_member') {
        // If teamRole is not yet loaded, wait (prevent premature redirect)
        if (user.teamRole === null || user.teamRole === undefined) {
          console.log('TeamRole not loaded yet, waiting...');
          return;
        }
        
        if (!allowedRoles.includes(user.teamRole)) {
          console.log(`Access denied. Required roles: ${allowedRoles}, User role: ${user.teamRole}`);
          navigate('/dashboard/team');
          return;
        }
      }
    }
  }, [user, loading, navigate, allowedUserTypes, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}