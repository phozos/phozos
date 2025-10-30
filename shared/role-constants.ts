/**
 * Role Constants - Single Source of Truth
 * 
 * Centralized role definitions to maintain consistency across the entire stack.
 * These constants must match the database enum definitions in shared/schema.ts
 */

export const USER_TYPES = ['customer', 'team_member', 'company_profile'] as const;
export const TEAM_ROLES = ['admin', 'counselor'] as const;

export type UserType = typeof USER_TYPES[number];
export type TeamRole = typeof TEAM_ROLES[number];

// Role validation utilities
export const isValidUserType = (value: string): value is UserType => {
  return USER_TYPES.includes(value as UserType);
};

export const isValidTeamRole = (value: string): value is TeamRole => {
  return TEAM_ROLES.includes(value as TeamRole);
};

// Authorization helpers
export const isAdmin = (userType: UserType, teamRole: TeamRole | null): boolean => {
  return userType === 'team_member' && teamRole === 'admin';
};

export const isCounselor = (userType: UserType, teamRole: TeamRole | null): boolean => {
  return userType === 'team_member' && teamRole === 'counselor';
};

export const isTeamMember = (userType: UserType): boolean => {
  return userType === 'team_member';
};