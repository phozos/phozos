/**
 * Unified TypeScript types for client-server communication
 * 
 * SAFETY NOTE: This file contains type-only exports to avoid runtime coupling
 * between client and server. Use `import type` when importing from this file.
 */

import type { UserType, TeamRole } from './role-constants';

/**
 * Unified User type - consolidates all user properties from database schema
 * with safe defaults for backward compatibility
 */
export type User = {
  id: string;
  email: string;
  firstName: string;  // Keep as required for backward compatibility
  lastName: string;   // Keep as required for backward compatibility
  companyName?: string | null;  // Key missing field that was causing TypeScript errors
  userType: UserType;
  teamRole?: TeamRole | null;
  profilePicture?: string | null;
  accountStatus?: 'active' | 'inactive' | 'pending_approval' | 'suspended' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  verificationToken?: string | null;
  verificationTokenExpires?: string | null;
  failedLoginAttempts?: number;
  accountLockedAt?: string | null;
  coolingPeriodBypassedAt?: string | null;
  coolingPeriodBypassedBy?: string | null;
};

/**
 * Unified StudentProfile type - matches database schema structure
 * Consolidates all student profile properties with proper nesting
 */
export type StudentProfile = {
  id: string;
  userId: string;
  firstName: string;  // For backward compatibility - derived from linked user
  lastName: string;   // For backward compatibility - derived from linked user  
  email: string;      // For backward compatibility - derived from linked user
  phone?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  currentEducationLevel?: string | null;  // Missing field that causes errors
  institutionName?: string | null;        // Missing field that causes errors
  gpa?: number | null;
  academicScoringType?: 'gpa' | 'percentage' | 'grade';
  intendedMajor?: string | null;
  preferredCountries?: string[] | null;
  destinationCountry?: string | null;
  intakeYear?: string | null;
  status: string;
  assignedCounselorId?: string | null;
  academicInterests?: string[] | null;    // Missing field that causes errors
  extracurriculars?: string[] | null;
  createdAt: string;
  updatedAt?: string | null;
  lastActivity?: string | null;
  
  // Nested objects matching database schema
  personalDetails?: {
    gender?: string | null;
    nationality?: string | null;
    whatsappNumber?: string | null;
    permanentAddress?: string | null;
    address?: string | null;              // Property that should be nested
    city?: string | null;                 // Property that should be nested
    country?: string | null;              // Property that should be nested
    passportFirstName?: string | null;
    passportLastName?: string | null;
    passportNumber?: string | null;
    passportExpiry?: string | null;
  } | null;
  
  academicDetails?: {
    highestQualification?: string | null;
    academicYear?: string | null;
    academicGaps?: string | null;
  } | null;
  
  workDetails?: {
    jobTitle?: string | null;
    companyName?: string | null;
    workDuration?: string | null;
    employmentStatus?: string | null;
    jobResponsibilities?: string | null;
  } | null;
  
  testScores?: {
    sat?: number | null;
    act?: number | null;
    gre?: number | null;
    gmat?: number | null;
    toefl?: number | null;
    ielts?: number | null;
    englishTestScore?: string | null;
    englishBandScores?: string | null;
    englishTestDate?: string | null;
    standardizedTestScore?: string | null;
    standardizedTestDate?: string | null;
    planToRetake?: boolean | null;
  } | null;
  
  studyPreferences?: {
    preferredCountries?: string[] | null;
    preferredIntake?: string | null;
    programLevel?: string | null;
    countryChoiceReason?: string | null;
    studyGoals?: string | null;
  } | null;
  
  universityPreferences?: {
    preferredUniversities?: string | null;
    preferredLocation?: string | null;
    institutionType?: string | null;
    campusPreference?: string | null;
  } | null;
  
  financialInfo?: {
    estimatedBudget?: string | null;
    fundingSource?: string | null;
    loanRequired?: boolean | null;
    financialConstraints?: string | null;
  } | null;
  
  visaHistory?: {
    previousVisaApplications?: string | null;
    visaOutcomes?: string | null;
    travelHistory?: string | null;
    immigrationIssues?: string | null;
  } | null;
  
  familyDetails?: {
    fatherDetails?: string | null;
    motherDetails?: string | null;
    fatherName?: string | null;
    fatherOccupation?: string | null;
    motherName?: string | null;
    motherOccupation?: string | null;
    familyIncome?: string | null;
    familyMembers?: string | null;
    relativesAbroad?: string | null;
    sponsor?: string | null;
    emergencyContact?: string | null;     // Property that should be in familyDetails
    siblings?: string | null;
  } | null;
  
  additionalInfo?: {
    careerGoals?: string | null;
    specialNeeds?: string | null;
    preferredLanguage?: string | null;
    referralSource?: string | null;
    applicationUrgency?: string | null;
    importantDeadlines?: string | null;
  } | null;
  
  // Extended properties for backward compatibility
  budgetRange?: { min: number; max: number } | null;
  workExperience?: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }> | null;
  familyInfo?: {
    fatherName?: string | null;
    motherName?: string | null;
    fatherOccupation?: string | null;
    motherOccupation?: string | null;
    familyIncome?: number | null;
    siblings?: number | null;
  } | null;
  educationHistory?: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    gpa?: number | null;
    percentage?: number | null;
  }> | null;
};