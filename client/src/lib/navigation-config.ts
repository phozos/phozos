/**
 * Navigation Configuration
 * 
 * Centralized navigation paths for all user types and roles.
 * This ensures consistency between route definitions and navigation links,
 * preventing 404 errors.
 */

export type UserType = 'customer' | 'team_member' | 'company_profile';
export type TeamRole = 'admin' | 'counselor' | null;

interface User {
  userType: UserType;
  teamRole?: TeamRole;
}

/**
 * Navigation path configuration for different user types and roles
 */
export const NAVIGATION_PATHS = {
  profile: {
    customer: '/profile',
    company_profile: '/dashboard/company/profile',
    admin: '/dashboard/admin/profile',
    counselor: '/dashboard/counselor/profile',
  },
  dashboard: {
    customer: '/dashboard/student',
    company_profile: '/dashboard/company',
    admin: '/dashboard/admin',
    counselor: '/dashboard/team',
    team_member: '/dashboard/team',
  },
} as const;

/**
 * Get the profile page path for a user based on their type and role
 * 
 * @param user - User object with userType and optional teamRole
 * @returns Profile page path for the user
 * 
 * @example
 * getProfilePath({ userType: 'customer' }) // Returns '/profile'
 * getProfilePath({ userType: 'team_member', teamRole: 'admin' }) // Returns '/dashboard/admin/profile'
 */
export function getProfilePath(user: User | null): string {
  if (!user) return '/profile';
  
  if (user.userType === 'customer') {
    return NAVIGATION_PATHS.profile.customer;
  }
  
  if (user.userType === 'company_profile') {
    return NAVIGATION_PATHS.profile.company_profile;
  }
  
  if (user.userType === 'team_member') {
    if (user.teamRole === 'admin') {
      return NAVIGATION_PATHS.profile.admin;
    }
    if (user.teamRole === 'counselor') {
      return NAVIGATION_PATHS.profile.counselor;
    }
  }
  
  return '/profile';
}

/**
 * Get the dashboard path for a user based on their type and role
 * 
 * @param user - User object with userType and optional teamRole
 * @returns Dashboard path for the user
 * 
 * @example
 * getDashboardPath({ userType: 'customer' }) // Returns '/dashboard/student'
 * getDashboardPath({ userType: 'team_member', teamRole: 'admin' }) // Returns '/dashboard/admin'
 */
export function getDashboardPath(user: User | null): string {
  if (!user) return '/';
  
  if (user.userType === 'customer') {
    return NAVIGATION_PATHS.dashboard.customer;
  }
  
  if (user.userType === 'company_profile') {
    return NAVIGATION_PATHS.dashboard.company_profile;
  }
  
  if (user.userType === 'team_member') {
    if (user.teamRole === 'admin') {
      return NAVIGATION_PATHS.dashboard.admin;
    }
    if (user.teamRole === 'counselor') {
      return NAVIGATION_PATHS.dashboard.counselor;
    }
    return NAVIGATION_PATHS.dashboard.team_member;
  }
  
  return '/';
}
