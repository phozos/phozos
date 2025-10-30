/**
 * Account Status Constants and Utilities
 * 
 * Centralized definitions for account status values and helper functions
 * Used across backend and frontend for consistent status management
 */

export const ACCOUNT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING_APPROVAL: 'pending_approval',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected'
} as const;

export type AccountStatus = typeof ACCOUNT_STATUSES[keyof typeof ACCOUNT_STATUSES];

export const VALID_ACCOUNT_STATUSES: readonly AccountStatus[] = Object.values(ACCOUNT_STATUSES);

/**
 * Status display labels for UI
 */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  [ACCOUNT_STATUSES.ACTIVE]: 'Active',
  [ACCOUNT_STATUSES.INACTIVE]: 'Inactive',
  [ACCOUNT_STATUSES.PENDING_APPROVAL]: 'Pending Approval',
  [ACCOUNT_STATUSES.SUSPENDED]: 'Suspended',
  [ACCOUNT_STATUSES.REJECTED]: 'Rejected'
};

/**
 * Status colors for UI badges
 */
export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  [ACCOUNT_STATUSES.ACTIVE]: 'bg-green-500',
  [ACCOUNT_STATUSES.INACTIVE]: 'bg-gray-500',
  [ACCOUNT_STATUSES.PENDING_APPROVAL]: 'bg-yellow-500',
  [ACCOUNT_STATUSES.SUSPENDED]: 'bg-red-500',
  [ACCOUNT_STATUSES.REJECTED]: 'bg-red-700'
};

/**
 * Validate if a status value is valid
 */
export function isValidAccountStatus(status: string): status is AccountStatus {
  return VALID_ACCOUNT_STATUSES.includes(status as AccountStatus);
}

/**
 * Get display label for a status
 */
export function getAccountStatusLabel(status: AccountStatus): string {
  return ACCOUNT_STATUS_LABELS[status] || status;
}

/**
 * Get color class for a status
 */
export function getAccountStatusColor(status: AccountStatus): string {
  return ACCOUNT_STATUS_COLORS[status] || 'bg-gray-500';
}
