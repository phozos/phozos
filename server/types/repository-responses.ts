import { AccountId, StudentProfileId } from '@shared/types/branded-ids';

export interface TestScores {
  sat?: number;
  act?: number;
  gre?: number;
  gmat?: number;
  toefl?: number;
  ielts?: number;
  englishTestScore?: string;
  englishBandScores?: string;
  englishTestDate?: string;
  standardizedTestScore?: string;
  standardizedTestDate?: string;
  planToRetake?: boolean;
}

export interface WorkExperience {
  company: string;
  position: string;
  duration: string;
  description: string;
}

export interface PollOptionStored {
  id: string;
  text: string;
}

export interface UserBasic {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profilePicture: string | null;
  userType: string;
  companyName: string | null;
}

export interface CounselorBasic {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface StudentWithUserDetails {
  id: StudentProfileId;
  userId: AccountId;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  destinationCountry: string | null;
  intakeYear: string | null;
  status: string | null;
  profilePicture: string | null;
  createdAt: Date | null;
  currentEducationLevel: string | null;
  intendedMajor: string | null;
  budgetRange: { min: number; max: number } | null;
  gpa: number | null;
  testScores: TestScores | null;
  academicInterests: string[] | null;
  extracurriculars: string[] | null;
  workExperience: WorkExperience[] | null;
  accountStatus: "active" | "inactive" | "pending_approval" | "suspended" | "rejected";
  assignedCounselorId: string | null;
  assignedCounselor: CounselorBasic | null;
}

export interface StudentAssignedToCounselor {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  destinationCountry: string | null;
  intakeYear: string | null;
  status: string | null;
  profilePicture: string | null;
  createdAt: Date | null;
  currentEducationLevel: string | null;
  intendedMajor: string | null;
  budgetRange: { min: number; max: number } | null;
  gpa: number | null;
  testScores: TestScores | null;
  academicInterests: string[] | null;
  extracurriculars: string[] | null;
  workExperience: WorkExperience[] | null;
}

export interface ApplicationWithUniversity {
  id: string;
  userId: string;
  universityId: string;
  courseId: string | null;
  status: string | null;
  submittedAt: Date | null;
  deadlineDate: Date | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  universityName: string | null;
  universityCountry: string | null;
  universityWorldRanking: number | null;
  universityWebsite: string | null;
}

export interface SubscriptionPlanBasic {
  id: string;
  name: string;
  price: string;
  currency: string;
}

export interface UserBasicForSubscription {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface SubscriptionWithPlan {
  subscription: {
    id: string;
    userId: string;
    planId: string;
    status: string;
    startedAt: Date | null;
    expiresAt: Date | null;
    paymentReference: string | null;
    autoRenew: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  plan: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    currency: string;
    logo: string | null;
    features: string[];
    maxUniversities: number;
    maxCountries: number;
    universityTier: string;
    aiMatching: boolean | null;
    unlimitedApplications: boolean | null;
    prioritySupport: boolean | null;
    applicationTracking: boolean | null;
    collaborationTools: boolean | null;
    advancedAnalytics: boolean | null;
    dedicatedAccountManager: boolean | null;
    customIntegrations: boolean | null;
    revenueSharePercentage: string | null;
    stripeProductId: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | null;
}

export interface SubscriptionWithDetails {
  subscription: {
    id: string;
    userId: string;
    planId: string;
    status: string;
    startedAt: Date | null;
    expiresAt: Date | null;
    paymentReference: string | null;
    autoRenew: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  user: UserBasicForSubscription | null;
  plan: SubscriptionPlanBasic | null;
}

export interface ForumPostWithUser {
  id: string;
  authorId: string;
  title: string | null;
  content: string;
  category: 'general' | 'uk_study' | 'visa_tips' | 'ielts_prep' | 'usa_study' | 'canada_study' | 'australia_study' | null;
  tags: string[] | null;
  images: string[] | null;
  pollOptions: PollOptionStored[] | null;
  pollQuestion: string | null;
  pollEndsAt: Date | null;
  isEdited: boolean | null;
  editedAt: Date | null;
  isModerated: boolean | null;
  moderatedAt: Date | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  reportCount?: number;
  isHiddenByReports?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  isLiked?: boolean;
  isSaved?: boolean;
  moderatorId?: string | null;
  hiddenAt?: Date | null;
  canBeRestoredUntil?: Date | null;
  user: UserBasic | null;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollResults {
  question: string | null;
  options: PollOption[];
  totalVotes: number;
  endsAt: Date | null;
}

export interface PollVoteWithUser {
  id: string;
  userId: string;
  optionId: string;
  createdAt: Date | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  } | null;
}

export interface PostAnalytics {
  likes: Array<{
    id: string;
    postId: string | null;
    authorId: string;
    createdAt: Date | null;
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
    userType: string | null;
    companyName: string | null;
  }>;
  comments: Array<{
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: Date | null;
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  }>;
  saves: Array<{
    id: string;
    postId: string | null;
    authorId: string;
    createdAt: Date | null;
  }>;
}

export interface SavedPostWithDetails {
  id: string | null;
  authorId: string | null;
  title: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  images: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  savedAt: Date | null;
  likesCount: number | null;
  commentsCount: number | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePicture: string | null;
    userType: string | null;
    companyName: string | null;
  } | null;
}

export interface CompanyRecentPost {
  id: string;
  title: string | null;
  content: string | null;
  viewsCount: number;
  createdAt: Date | null;
  likesCount: number;
  commentsCount: number;
}
