import { 
  AccountId, 
  StudentProfileId, 
  toAccountId, 
  toStudentProfileId,
  isValidUUID 
} from '../types/branded-ids';

/**
 * Minimal interface for objects containing student identifiers.
 * Allows helpers to work with any object structure that has the required ID fields.
 */
interface StudentIdentifiers {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Extracts and validates the user account ID from a student object.
 * This ID represents the user's account and should be used for authentication-related operations
 * like toggling account status, resetting passwords, etc.
 * 
 * @param student - The student object containing user details
 * @returns The validated user account ID (userId) as a branded AccountId type
 * @throws {Error} If userId is missing or invalid
 */
export function getStudentAccountId(student: StudentIdentifiers): AccountId {
  if (!student.userId) {
    throw new Error(
      `Student account ID (userId) is missing for student: ${student.firstName || 'Unknown'} ${student.lastName || ''} (${student.email || 'no email'})`
    );
  }
  
  if (!isValidUUID(student.userId)) {
    throw new Error(
      `Invalid student account ID (userId): ${student.userId}. Must be a valid UUID.`
    );
  }
  
  return toAccountId(student.userId);
}

/**
 * Extracts and validates the student profile ID from a student object.
 * This ID represents the student's profile record and should be used for profile-related operations
 * like viewing profile details, updating profile information, etc.
 * 
 * @param student - The student object containing user details
 * @returns The validated student profile ID (id) as a branded StudentProfileId type
 * @throws {Error} If id is missing or invalid
 */
export function getStudentProfileId(student: StudentIdentifiers): StudentProfileId {
  if (!student.id) {
    throw new Error(
      `Student profile ID (id) is missing for student: ${student.firstName || 'Unknown'} ${student.lastName || ''} (${student.email || 'no email'})`
    );
  }
  
  if (!isValidUUID(student.id)) {
    throw new Error(
      `Invalid student profile ID (id): ${student.id}. Must be a valid UUID.`
    );
  }
  
  return toStudentProfileId(student.id);
}
