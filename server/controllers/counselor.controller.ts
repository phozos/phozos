import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES, container } from '../services/container';
import { ICounselorAssignmentService } from '../services/domain/counselor-assignment.service';
import { ICounselorDashboardService } from '../services/domain/counselor-dashboard.service';
import { IChatService } from '../services/domain/chat.service';
import { ISubscriptionService } from '../services/domain/subscription.service';
import { IUserSubscriptionService } from '../services/domain/user-subscription.service';
import { IUserProfileService } from '../services/domain/user-profile.service';
import { IApplicationService } from '../services/domain/application.service';
import { IDocumentService } from '../services/domain/document.service';
import { IStudentRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { WebSocketService } from '../services/infrastructure/websocket';

// Validation schemas
const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000)
});

const createFollowUpSchema = z.object({
  note: z.string().min(1),
  type: z.string().min(1)
});

const updateStudentProfileSchema = z.object({
  phone: z.string().optional(),
  nationality: z.string().optional(),
  destinationCountry: z.string().optional(),
  intakeYear: z.string().optional(),
  currentEducationLevel: z.string().optional(),
  intendedMajor: z.string().optional(),
  budgetRange: z.object({ min: z.number(), max: z.number() }).optional().nullable(),
  gpa: z.union([z.number(), z.string()]).optional().nullable(),
  testScores: z.record(z.any()).optional().nullable(),
  academicInterests: z.array(z.string()).optional(),
  extracurriculars: z.array(z.any()).optional(),
  workExperience: z.array(z.any()).optional(),
  dateOfBirth: z.string().optional().nullable(),
  academicScoringType: z.enum(['gpa', 'percentage', 'grade']).optional().nullable(),
  institutionName: z.string().optional().nullable(),
  // Nested objects
  personalDetails: z.record(z.any()).optional().nullable(),
  academicDetails: z.record(z.any()).optional().nullable(),
  workDetails: z.record(z.any()).optional().nullable(),
  studyPreferences: z.record(z.any()).optional().nullable(),
  universityPreferences: z.record(z.any()).optional().nullable(),
  financialInfo: z.record(z.any()).optional().nullable(),
  visaHistory: z.record(z.any()).optional().nullable(),
  familyDetails: z.record(z.any()).optional().nullable(),
  additionalInfo: z.record(z.any()).optional().nullable()
});

/**
 * Counselor Controller
 * 
 * Handles counselor-specific operations including student management, chat, and dashboard.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class CounselorController
 * @extends {BaseController}
 */
export class CounselorController extends BaseController {
  /**
   * Get all students assigned to the authenticated counselor
   * 
   * @route GET /api/counselor/students
   * @access Protected (Counselors only)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted list of assigned students
   * 
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getAssignedStudents(req: AuthenticatedRequest, res: Response) {
    try {
      const counselorId = this.getUserId(req);
      const counselorDashboardService = getService<ICounselorDashboardService>(TYPES.ICounselorDashboardService);
      const formattedStudents = await counselorDashboardService.getAssignedStudentsFormatted(counselorId);
      return this.sendSuccess(res, formattedStudents);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getAssignedStudents');
    }
  }

  /**
   * Get counselor dashboard statistics
   * 
   * @route GET /api/counselor/stats
   * @access Protected (Counselors only)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns counselor dashboard statistics
   * 
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const counselorDashboardService = getService<ICounselorDashboardService>(TYPES.ICounselorDashboardService);
      const stats = await counselorDashboardService.getCounselorStats();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getStats');
    }
  }

  /**
   * Get documents for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/documents
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of student's documents
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      
      const counselorDashboardService = getService<ICounselorDashboardService>(TYPES.ICounselorDashboardService);
      const documents = await counselorDashboardService.getStudentDocumentsWithAccess(counselorId, studentId);
      return this.sendSuccess(res, documents);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getStudentDocuments');
    }
  }

  /**
   * Get profile information for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/profile
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student profile
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      
      const counselorAssignmentService = getService<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, 'ACCESS_DENIED', 'Access denied to this student');
      }
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const flattenedProfile = await userProfileService.getStudentProfileFlat(studentId);
      
      return this.sendSuccess(res, flattenedProfile);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getStudentProfile');
    }
  }

  /**
   * Update profile information for a specific student
   * 
   * @route PUT /api/counselor/students/:studentId/profile
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor, student ID, and profile updates
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async updateStudentProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const validatedData = updateStudentProfileSchema.parse(req.body);
      
      const counselorAssignmentService = getService<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, 'ACCESS_DENIED', 'Access denied to this student');
      }
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const profile = await userProfileService.getStudentProfileFlat(studentId);
      
      const updated = await userProfileService.updateStudentProfile(profile.userId, validatedData as any);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'CounselorController.updateStudentProfile');
    }
  }

  /**
   * Get university applications shortlist for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/universities
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of student's university applications
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentUniversities(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      
      const counselorAssignmentService = getService<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, 'ACCESS_DENIED', 'Access denied to this student');
      }
      
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const applications = await applicationService.getApplicationsByUser(studentId);
      return this.sendSuccess(res, applications);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getStudentUniversities');
    }
  }

  /**
   * Get follow-up notes for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/follow-ups
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of follow-up notes
   * 
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async getFollowUps(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      
      if (user.userType !== 'team_member') {
        return this.sendError(res, 403, 'TEAM_MEMBER_ACCESS_REQUIRED', 'Team member access required');
      }
      
      const followUps: any[] = [];
      return this.sendSuccess(res, followUps);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getFollowUps');
    }
  }

  /**
   * Create a new follow-up note for a student
   * 
   * @route POST /api/counselor/students/:studentId/follow-ups
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member, student ID, and follow-up data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created follow-up note
   * 
   * @example
   * // Request body:
   * {
   *   "note": "Follow up on university application status",
   *   "type": "application_check"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async createFollowUp(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      const validatedData = createFollowUpSchema.parse(req.body);
      
      if (user.userType !== 'team_member') {
        return this.sendError(res, 403, 'TEAM_MEMBER_ACCESS_REQUIRED', 'Team member access required');
      }
      
      const newFollowUp = {
        id: Date.now().toString(),
        studentId,
        counselorId: user.id,
        note: validatedData.note,
        type: validatedData.type,
        createdAt: new Date().toISOString()
      };
      
      return this.sendSuccess(res, newFollowUp);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'CounselorController.createFollowUp');
    }
  }

  /**
   * Get chat message history with a specific student
   * 
   * @route GET /api/counselor/students/:studentId/chat
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted chat messages
   * 
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async getChatMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      
      if (user.userType !== 'team_member') {
        return this.sendError(res, 403, 'AUTH_FORBIDDEN', 'Team member access required');
      }
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const profile = await userProfileService.getStudentProfileFlat(studentId);
      
      const counselorId = user.id;
      const chatService = getService<IChatService>(TYPES.IChatService);
      const messages = await chatService.getChatMessages(profile.userId, counselorId);
      const formattedMessages = chatService.formatCounselorChatMessages(messages);
      
      return this.sendSuccess(res, formattedMessages);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getChatMessages');
    }
  }

  /**
   * Send a chat message to a specific student
   * 
   * @route POST /api/counselor/students/:studentId/chat
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member, student ID, and message
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created message
   * 
   * @example
   * // Request body:
   * {
   *   "message": "I've reviewed your application documents"
   * }
   * 
   * @throws {422} Validation error if message is invalid
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async sendChatMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      const { message } = sendMessageSchema.parse(req.body);
      
      if (user.userType !== 'team_member') {
        return this.sendError(res, 403, 'AUTH_FORBIDDEN', 'Team member access required');
      }
      
      const cleanMessage = message.trim();
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const profile = await userProfileService.getStudentProfileFlat(studentId);
      
      const chatService = getService<IChatService>(TYPES.IChatService);
      const newMessage = await chatService.createChatMessage({
        studentId: profile.userId,
        counselorId: user.id,
        senderId: user.id,
        message: cleanMessage,
        isRead: false
      });
      const counselorResponse = chatService.formatCounselorChatMessageResponse(newMessage);
      
      // Broadcast message via WebSocket with role-specific payloads
      const wsService = container.get<WebSocketService>(TYPES.WebSocketService);
      const studentResponse = chatService.formatChatMessageResponse(newMessage, 'counselor');
      
      // Send counselor-formatted message to counselor
      await wsService.sendToUser(user.id, {
        type: 'chat_message',
        data: counselorResponse,
        timestamp: new Date().toISOString()
      });
      
      // Send student-formatted message to student
      await wsService.sendToUser(profile.userId, {
        type: 'chat_message',
        data: studentResponse,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📨 Broadcast chat message from counselor ${user.id} to student ${profile.userId}`);
      
      return this.sendSuccess(res, counselorResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'CounselorController.sendChatMessage');
    }
  }

  /**
   * Get subscription information for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/subscription
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student's subscription details
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const assignment = await subscriptionService.getCounselorStudentAssignment(counselorId, studentId);
      if (!assignment) {
        return this.sendError(res, 403, 'ACCESS_DENIED', 'Access denied');
      }
      
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.getCurrentSubscription(studentId);
      return this.sendSuccess(res, subscription || null);
    } catch (error) {
      return this.handleError(res, error, 'CounselorController.getStudentSubscription');
    }
  }

}

export const counselorController = new CounselorController();
