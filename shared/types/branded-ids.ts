/**
 * Branded types for student IDs to prevent mixing account IDs and profile IDs
 * 
 * AccountId - Represents a user's account ID from the users table
 * StudentProfileId - Represents a student's profile ID from the students table
 */

export type AccountId = string & { readonly __brand: 'AccountId' };
export type StudentProfileId = string & { readonly __brand: 'StudentProfileId' };

/**
 * UUID validation regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks if a string is a valid UUID format
 * @param id - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Type guard to check if a value is an AccountId
 * Note: Due to TypeScript's structural typing, this only validates the format,
 * not the actual brand. Use this for runtime validation.
 * 
 * @param value - The value to check
 * @returns true if the value appears to be a valid AccountId
 */
export function isAccountId(value: unknown): value is AccountId {
  return typeof value === 'string' && isValidUUID(value);
}

/**
 * Type guard to check if a value is a StudentProfileId
 * Note: Due to TypeScript's structural typing, this only validates the format,
 * not the actual brand. Use this for runtime validation.
 * 
 * @param value - The value to check
 * @returns true if the value appears to be a valid StudentProfileId
 */
export function isStudentProfileId(value: unknown): value is StudentProfileId {
  return typeof value === 'string' && isValidUUID(value);
}

/**
 * Creates an AccountId branded type from a string
 * @param id - The raw string ID
 * @returns AccountId branded type
 * @throws {Error} If the ID is not a valid UUID format
 */
export function toAccountId(id: string): AccountId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid AccountId format: ${id}. Must be a valid UUID.`);
  }
  return id as AccountId;
}

/**
 * Safely creates an AccountId branded type from a string, returning null if invalid
 * @param id - The raw string ID
 * @returns AccountId branded type or null if invalid
 */
export function toAccountIdSafe(id: string): AccountId | null {
  try {
    return toAccountId(id);
  } catch {
    return null;
  }
}

/**
 * Creates a StudentProfileId branded type from a string
 * @param id - The raw string ID
 * @returns StudentProfileId branded type
 * @throws {Error} If the ID is not a valid UUID format
 */
export function toStudentProfileId(id: string): StudentProfileId {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid StudentProfileId format: ${id}. Must be a valid UUID.`);
  }
  return id as StudentProfileId;
}

/**
 * Safely creates a StudentProfileId branded type from a string, returning null if invalid
 * @param id - The raw string ID
 * @returns StudentProfileId branded type or null if invalid
 */
export function toStudentProfileIdSafe(id: string): StudentProfileId | null {
  try {
    return toStudentProfileId(id);
  } catch {
    return null;
  }
}

/**
 * Unwraps a branded ID to a plain string
 * Useful when you need to pass the ID to external libraries or APIs
 * 
 * @param id - The branded ID
 * @returns The plain string value
 */
export function unwrapId(id: AccountId | StudentProfileId): string {
  return id as string;
}
