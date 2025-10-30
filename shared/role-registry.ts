import { z } from 'zod';
import { USER_TYPES, TEAM_ROLES } from './role-constants';

export const USER_TYPE_REGISTRY = {
  customer: {
    value: 'customer' as const,
    label: 'Student',
    canHaveTeamRole: false,
  },
  team_member: {
    value: 'team_member' as const,
    label: 'Staff Member',
    canHaveTeamRole: true,
    assignableRoles: ['admin', 'counselor'] as const,
  },
  company_profile: {
    value: 'company_profile' as const,
    label: 'Company',
    canHaveTeamRole: false,
  },
} as const;

export const TEAM_ROLE_REGISTRY = {
  admin: {
    value: 'admin' as const,
    label: 'Administrator',
    description: 'Full system access and management capabilities',
  },
  counselor: {
    value: 'counselor' as const,
    label: 'Counselor',
    description: 'Student guidance and counseling capabilities',
  },
} as const;

export const CreateStaffRequestSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamRole: z.enum(['admin', 'counselor']),
  department: z.string().optional(),
});

export type CreateStaffRequest = z.infer<typeof CreateStaffRequestSchema>;

export function getTeamRoleOptions() {
  return Object.values(TEAM_ROLE_REGISTRY);
}

export function getUserTypeLabel(userType: string): string {
  const entry = USER_TYPE_REGISTRY[userType as keyof typeof USER_TYPE_REGISTRY];
  return entry?.label || 'User';
}

export function getTeamRoleLabel(teamRole: string): string {
  const entry = TEAM_ROLE_REGISTRY[teamRole as keyof typeof TEAM_ROLE_REGISTRY];
  return entry?.label || 'Team Member';
}

export function isValidTeamRole(role: string): role is 'admin' | 'counselor' {
  return role === 'admin' || role === 'counselor';
}
