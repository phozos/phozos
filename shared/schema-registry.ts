/**
 * Centralized Endpoint-to-Schema Registry
 * 
 * This registry maps API endpoints to their corresponding response schemas,
 * enabling automatic validation and development warnings for missing schemas.
 */

import { z } from "zod";
import {
  // User & Auth schemas
  GetUserResponseSchema,
  GetUsersResponseSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  RefreshTokenResponseSchema,
  
  // Student Profile schemas
  GetStudentProfileResponseSchema,
  GetStudentsResponseSchema,
  UpdateStudentProfileResponseSchema,
  
  // University schemas
  GetUniversityResponseSchema,
  GetUniversitiesResponseSchema,
  SearchUniversitiesResponseSchema,
  CreateUniversityResponseSchema,
  UpdateUniversityResponseSchema,
  
  // Course schemas
  GetCourseResponseSchema,
  GetCoursesResponseSchema,
  
  // Application schemas
  GetApplicationResponseSchema,
  GetApplicationsResponseSchema,
  CreateApplicationResponseSchema,
  UpdateApplicationResponseSchema,
  
  // Document schemas
  GetDocumentResponseSchema,
  GetDocumentsResponseSchema,
  CreateDocumentResponseSchema,
  UpdateDocumentResponseSchema,
  
  // Forum schemas
  GetForumPostResponseSchema,
  GetForumPostsResponseSchema,
  CreateForumPostResponseSchema,
  GetForumCommentsResponseSchema,
  CreateForumCommentResponseSchema,
  
  // Notification schemas
  GetNotificationsResponseSchema,
  GetUnreadCountResponseSchema,
  
  // Subscription schemas
  GetSubscriptionResponseSchema,
  
  // Event schemas
  GetEventResponseSchema,
  GetEventsResponseSchema,
  
  // Testimonial schemas
  GetTestimonialsResponseSchema,
  
  // Chat schemas
  GetChatMessagesResponseSchema,
  SendChatMessageResponseSchema,
  
  // AI Matching schemas
  GetRecommendationsResponseSchema,
  
  // Dashboard schemas
  GetDashboardStatsResponseSchema,
  
  // Analytics schemas
  GetAnalyticsResponseSchema,
  
  // Simple schemas
  MessageResponseSchema,
  EmptySuccessSchema
} from "./response-schemas";

// Type for endpoint registry entries
interface EndpointRegistryEntry {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  dataSchema: z.ZodSchema<any>;
  description?: string;
}

// Centralized endpoint-to-schema mapping
export const ENDPOINT_SCHEMA_REGISTRY: Record<string, EndpointRegistryEntry> = {
  // ============================================================================
  // AUTHENTICATION & USER ENDPOINTS
  // ============================================================================
  
  // Auth endpoints
  'POST /api/auth/login': {
    method: 'POST',
    dataSchema: LoginResponseSchema,
    description: 'User login with credentials'
  },
  
  'POST /api/auth/register': {
    method: 'POST',
    dataSchema: RegisterResponseSchema,
    description: 'User registration'
  },
  
  'GET /api/auth/me': {
    method: 'GET',
    dataSchema: GetUserResponseSchema,
    description: 'Get current authenticated user'
  },
  
  'POST /api/auth/refresh': {
    method: 'POST',
    dataSchema: RefreshTokenResponseSchema,
    description: 'Refresh authentication token'
  },
  
  'POST /api/auth/logout': {
    method: 'POST',
    dataSchema: EmptySuccessSchema,
    description: 'User logout'
  },
  
  'GET /api/auth/csrf-token': {
    method: 'GET',
    dataSchema: z.object({ csrfToken: z.string() }),
    description: 'Get CSRF token'
  },
  
  // User endpoints
  'GET /api/users': {
    method: 'GET',
    dataSchema: GetUsersResponseSchema,
    description: 'Get all users (admin only)'
  },
  
  'GET /api/users/:id': {
    method: 'GET',
    dataSchema: GetUserResponseSchema,
    description: 'Get user by ID'
  },
  
  // ============================================================================
  // STUDENT PROFILE ENDPOINTS
  // ============================================================================
  
  'GET /api/students': {
    method: 'GET',
    dataSchema: GetStudentsResponseSchema,
    description: 'Get all students'
  },
  
  'GET /api/students/:id': {
    method: 'GET',
    dataSchema: GetStudentProfileResponseSchema,
    description: 'Get student profile by ID'
  },
  
  'PUT /api/students/:id': {
    method: 'PUT',
    dataSchema: UpdateStudentProfileResponseSchema,
    description: 'Update student profile'
  },
  
  'GET /api/profile': {
    method: 'GET',
    dataSchema: GetStudentProfileResponseSchema,
    description: 'Get current user profile'
  },
  
  'PUT /api/profile': {
    method: 'PUT',
    dataSchema: UpdateStudentProfileResponseSchema,
    description: 'Update current user profile'
  },
  
  // ============================================================================
  // UNIVERSITY & COURSE ENDPOINTS
  // ============================================================================
  
  'GET /api/universities': {
    method: 'GET',
    dataSchema: GetUniversitiesResponseSchema,
    description: 'Get all universities'
  },
  
  'GET /api/admin/universities': {
    method: 'GET',
    dataSchema: GetUniversitiesResponseSchema,
    description: 'Get all universities (admin view)'
  },
  
  'GET /api/universities/:id': {
    method: 'GET',
    dataSchema: GetUniversityResponseSchema,
    description: 'Get university by ID'
  },
  
  'POST /api/universities': {
    method: 'POST',
    dataSchema: CreateUniversityResponseSchema,
    description: 'Create new university'
  },
  
  'PUT /api/universities/:id': {
    method: 'PUT',
    dataSchema: UpdateUniversityResponseSchema,
    description: 'Update university'
  },
  
  'GET /api/universities/search': {
    method: 'GET',
    dataSchema: SearchUniversitiesResponseSchema,
    description: 'Search universities'
  },
  
  'GET /api/universities/:id/courses': {
    method: 'GET',
    dataSchema: GetCoursesResponseSchema,
    description: 'Get courses for university'
  },
  
  'GET /api/courses/:id': {
    method: 'GET',
    dataSchema: GetCourseResponseSchema,
    description: 'Get course by ID'
  },
  
  // ============================================================================
  // APPLICATION ENDPOINTS
  // ============================================================================
  
  'GET /api/applications': {
    method: 'GET',
    dataSchema: GetApplicationsResponseSchema,
    description: 'Get user applications'
  },
  
  'GET /api/applications/:id': {
    method: 'GET',
    dataSchema: GetApplicationResponseSchema,
    description: 'Get application by ID'
  },
  
  'POST /api/applications': {
    method: 'POST',
    dataSchema: CreateApplicationResponseSchema,
    description: 'Create new application'
  },
  
  'PUT /api/applications/:id': {
    method: 'PUT',
    dataSchema: UpdateApplicationResponseSchema,
    description: 'Update application'
  },
  
  // ============================================================================
  // DOCUMENT ENDPOINTS
  // ============================================================================
  
  'GET /api/documents': {
    method: 'GET',
    dataSchema: GetDocumentsResponseSchema,
    description: 'Get user documents'
  },
  
  'GET /api/documents/:id': {
    method: 'GET',
    dataSchema: GetDocumentResponseSchema,
    description: 'Get document by ID'
  },
  
  'POST /api/documents': {
    method: 'POST',
    dataSchema: CreateDocumentResponseSchema,
    description: 'Upload new document'
  },
  
  'PUT /api/documents/:id': {
    method: 'PUT',
    dataSchema: UpdateDocumentResponseSchema,
    description: 'Update document'
  },
  
  // ============================================================================
  // FORUM ENDPOINTS
  // ============================================================================
  
  'GET /api/forum/posts': {
    method: 'GET',
    dataSchema: GetForumPostsResponseSchema,
    description: 'Get forum posts'
  },
  
  'GET /api/forum/posts/:id': {
    method: 'GET',
    dataSchema: GetForumPostResponseSchema,
    description: 'Get forum post by ID'
  },
  
  'POST /api/forum/posts': {
    method: 'POST',
    dataSchema: CreateForumPostResponseSchema,
    description: 'Create forum post'
  },
  
  'GET /api/forum/posts/:id/comments': {
    method: 'GET',
    dataSchema: GetForumCommentsResponseSchema,
    description: 'Get post comments'
  },
  
  'POST /api/forum/posts/:id/comments': {
    method: 'POST',
    dataSchema: CreateForumCommentResponseSchema,
    description: 'Create post comment'
  },
  
  // ============================================================================
  // NOTIFICATION ENDPOINTS
  // ============================================================================
  
  'GET /api/notifications': {
    method: 'GET',
    dataSchema: GetNotificationsResponseSchema,
    description: 'Get user notifications'
  },
  
  'GET /api/notifications/unread-count': {
    method: 'GET',
    dataSchema: GetUnreadCountResponseSchema,
    description: 'Get unread notification count'
  },
  
  // ============================================================================
  // SUBSCRIPTION ENDPOINTS
  // ============================================================================
  
  'GET /api/subscription': {
    method: 'GET',
    dataSchema: GetSubscriptionResponseSchema,
    description: 'Get user subscription'
  },
  
  // ============================================================================
  // EVENT ENDPOINTS
  // ============================================================================
  
  'GET /api/events': {
    method: 'GET',
    dataSchema: GetEventsResponseSchema,
    description: 'Get events'
  },
  
  'GET /api/events/:id': {
    method: 'GET',
    dataSchema: GetEventResponseSchema,
    description: 'Get event by ID'
  },
  
  // ============================================================================
  // TESTIMONIAL ENDPOINTS
  // ============================================================================
  
  'GET /api/testimonials': {
    method: 'GET',
    dataSchema: GetTestimonialsResponseSchema,
    description: 'Get testimonials'
  },
  
  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================
  
  'GET /api/chat/messages': {
    method: 'GET',
    dataSchema: GetChatMessagesResponseSchema,
    description: 'Get chat messages'
  },
  
  'POST /api/chat/messages': {
    method: 'POST',
    dataSchema: SendChatMessageResponseSchema,
    description: 'Send chat message'
  },
  
  // ============================================================================
  // AI MATCHING ENDPOINTS
  // ============================================================================
  
  'GET /api/recommendations': {
    method: 'GET',
    dataSchema: GetRecommendationsResponseSchema,
    description: 'Get AI university recommendations'
  },
  
  // ============================================================================
  // DASHBOARD & ANALYTICS ENDPOINTS
  // ============================================================================
  
  'GET /api/dashboard/stats': {
    method: 'GET',
    dataSchema: GetDashboardStatsResponseSchema,
    description: 'Get dashboard statistics'
  },
  
  'GET /api/analytics': {
    method: 'GET',
    dataSchema: GetAnalyticsResponseSchema,
    description: 'Get analytics data'
  }
};

// ============================================================================
// REGISTRY UTILITY FUNCTIONS
// ============================================================================

/**
 * Get schema for a specific endpoint
 */
export function getSchemaForEndpoint(method: string, url: string): z.ZodSchema<any> | null {
  // Normalize the endpoint key
  const endpointKey = `${method.toUpperCase()} ${url}`;
  
  // Try exact match first
  const exactEntry = ENDPOINT_SCHEMA_REGISTRY[endpointKey];
  if (exactEntry) {
    return exactEntry.dataSchema;
  }
  
  // Try pattern matching for parameterized routes
  for (const [pattern, entry] of Object.entries(ENDPOINT_SCHEMA_REGISTRY)) {
    if (pattern.includes(':') && matchesPattern(method, url, pattern)) {
      return entry.dataSchema;
    }
  }
  
  return null;
}

/**
 * Check if a URL matches a parameterized pattern
 */
function matchesPattern(method: string, url: string, pattern: string): boolean {
  const [patternMethod, patternPath] = pattern.split(' ');
  
  if (method.toUpperCase() !== patternMethod) {
    return false;
  }
  
  const urlParts = url.split('/');
  const patternParts = patternPath.split('/');
  
  if (urlParts.length !== patternParts.length) {
    return false;
  }
  
  for (let i = 0; i < urlParts.length; i++) {
    const urlPart = urlParts[i];
    const patternPart = patternParts[i];
    
    // If pattern part starts with :, it's a parameter - accept any value
    if (patternPart.startsWith(':')) {
      continue;
    }
    
    // Otherwise, parts must match exactly
    if (urlPart !== patternPart) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get all registered endpoints
 */
export function getAllEndpoints(): string[] {
  return Object.keys(ENDPOINT_SCHEMA_REGISTRY);
}

/**
 * Check if an endpoint has a registered schema
 */
export function hasSchemaForEndpoint(method: string, url: string): boolean {
  return getSchemaForEndpoint(method, url) !== null;
}

/**
 * Get endpoints missing schemas (for development warnings)
 */
export function getMissingSchemaEndpoints(usedEndpoints: Array<{ method: string; url: string }>): string[] {
  return usedEndpoints
    .filter(endpoint => !hasSchemaForEndpoint(endpoint.method, endpoint.url))
    .map(endpoint => `${endpoint.method} ${endpoint.url}`);
}

/**
 * Development helper: log all registered endpoints
 */
export function logRegisteredEndpoints(): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('📋 Registered API Endpoints');
    for (const [endpoint, entry] of Object.entries(ENDPOINT_SCHEMA_REGISTRY)) {
      console.log(`${endpoint} - ${entry.description || 'No description'}`);
    }
    console.groupEnd();
  }
}