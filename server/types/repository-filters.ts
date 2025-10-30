export interface UniversityFilters {
  country?: string;
  minWorldRanking?: number;
  maxWorldRanking?: number;
  tier?: 'general' | 'top500' | 'top200' | 'top100' | 'ivy_league';
  isActive?: boolean;
}

export interface ForumPostFilters {
  category?: string;
  search?: string;
  authorId?: string;
  isPinned?: boolean;
}

export interface ApplicationFilters {
  userId?: string;
  universityId?: string;
  status?: "draft" | "submitted" | "under_review" | "accepted" | "rejected" | "waitlisted" | null;
}

export interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  type?: "application_update" | "document_reminder" | "message" | "system" | "deadline";
}

export interface EventFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  isActive?: boolean;
}

export interface AIMatchingFilters {
  userId?: string;
  universityId?: string;
  minScore?: number;
  maxScore?: number;
}

export interface DocumentFilters {
  userId?: string;
  applicationId?: string;
  documentType?: string;
  status?: string;
}

export interface ChatFilters {
  studentId?: string;
  counselorId?: string;
  isActive?: boolean;
}

export interface PaymentFilters {
  userId?: string;
  gateway?: string;
  status?: string;
  isActive?: boolean;
}

export interface SubscriptionPlanFilters {
  isActive?: boolean;
  planType?: string;
}

export interface UserSubscriptionFilters {
  userId?: string;
  planId?: string;
  status?: "active" | "expired" | "cancelled" | "pending";
}

export interface TestimonialFilters {
  userId?: string;
  isApproved?: boolean;
  isFeatured?: boolean;
}

export interface ForumReportFilters {
  postId?: string;
  reporterUserId?: string;
  reviewedByUserId?: string;
  status?: string;
}

export interface StudentTimelineFilters {
  studentId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UserFilters {
  email?: string;
  userType?: "customer" | "team_member" | "company_profile";
  teamRole?: "admin" | "counselor" | null;
  accountStatus?: "active" | "inactive" | "pending_approval" | "suspended" | "rejected";
}

export interface StudentProfileFilters {
  userId?: string;
  status?: string;
  assignedCounselorId?: string | null;
  nationality?: string;
  destinationCountry?: string;
}

export interface CourseFilters {
  universityId?: string;
  degree?: string;
  field?: string;
  isActive?: boolean;
}

export interface ForumCommentFilters {
  postId?: string;
  userId?: string;
  parentId?: string | null;
}
