import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../security/jwtService';
import { userRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/auth';
import { createHttpError } from './error-handler';
import type { UserType, TeamRole } from '@shared/role-constants';
import logger from '../utils/logger';

/**
 * Unified JWT Authentication Middleware
 * Single, secure authentication system with role-based authorization
 * Provides JWT verification and user-based access control
 */

// Helper function removed - logic inlined directly in authorizeUnified for complete unification

// Legacy authenticateToken function removed - replaced with unified authorize() system

// Unified Authorization System

interface AuthorizationRule {
  userTypes?: UserType[];
  teamRoles?: TeamRole[];
  requiresAuth?: boolean;
}

/**
 * Unified authorization middleware
 * Single, flexible function for all authentication and authorization needs
 */
export function authorize(rules: AuthorizationRule = { requiresAuth: true }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    return authorizeUnified(req, res, next, rules);
  };
}

/**
 * Core authorization logic with inlined JWT authentication
 */
async function authorizeUnified(
  req: Request, 
  res: Response, 
  next: NextFunction, 
  rules: AuthorizationRule
): Promise<Response | void> {
  try {
    // Skip auth if not required
    if (!rules.requiresAuth) {
      return next();
    }

    // Perform JWT authentication (inlined logic)
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createHttpError.unauthorized('Authorization header with Bearer token required');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Use JWT service for token verification
    const decoded = jwtService.verify(token);
    
    // Extract user ID from token with fallback for multiple field names
    const userId = decoded.userId || decoded.sub || decoded.id;
    
    if (!userId || typeof userId !== 'string') {
      logger.warn('JWT token missing valid user identifier');
      throw createHttpError.unauthorized('Invalid token format');
    }

    // Fetch user data to validate token is still valid
    const user = await userRepository.findById(userId);
    
    if (!user) {
      logger.warn('User not found for token', { userId });
      throw createHttpError.unauthorized('User not found');
    }

    // Attach user to request object for downstream middleware/routes
    (req as AuthenticatedRequest).user = user;
    
    // User authenticated successfully
    
    // Apply authorization rules
    return applyAuthorizationRules(req, res, next, rules);
    
  } catch (error) {
    return next(error);
  }
}

/**
 * Apply authorization rules to authenticated user
 */
function applyAuthorizationRules(
  req: Request, 
  res: Response, 
  next: NextFunction, 
  rules: AuthorizationRule
): Response | void {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  
  if (!user && rules.requiresAuth) {
    return next(createHttpError.unauthorized('Authentication required'));
  }
  
  if (!user) {
    return next(); // No user required, continue
  }

  // Check user type restrictions
  if (rules.userTypes && !rules.userTypes.includes(user.userType as UserType)) {
    logger.warn('Unauthorized access attempt: user type restriction', { 
      userId: user.id,
      userType: user.userType, 
      requiredTypes: rules.userTypes 
    });
    return next(createHttpError.forbidden('Access denied'));
  }
  
  // Check team role restrictions (only for team members)
  if (rules.teamRoles && user.userType === 'team_member') {
    if (!user.teamRole || !rules.teamRoles.includes(user.teamRole as TeamRole)) {
      logger.warn('Unauthorized access attempt: team role restriction', { 
        userId: user.id,
        teamRole: user.teamRole, 
        requiredRoles: rules.teamRoles 
      });
      return next(createHttpError.forbidden('Insufficient role permissions'));
    }
  }
  
  // User authorized successfully
  next();
}

// Role-specific middleware (direct middleware exports - no factory pattern)
export const requireAuth = authorize({ requiresAuth: true });
export const requireAdmin = authorize({ requiresAuth: true, userTypes: ['team_member'], teamRoles: ['admin'] });
export const requireTeamMember = authorize({ requiresAuth: true, userTypes: ['team_member'] });
export const requireCustomer = authorize({ requiresAuth: true, userTypes: ['customer'] });
export const requireCompanyProfile = authorize({ requiresAuth: true, userTypes: ['company_profile'] });

