import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { createHttpError } from './error-handler';
import logger from '../utils/logger';

/**
 * Partner Authorization Middleware
 * 
 * Ensures that the authenticated user has partner userType.
 * This middleware should be used after requireAuth middleware.
 */
export const requirePartner = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user) {
    logger.warn('Unauthorized access attempt: no user found in request');
    return next(createHttpError.unauthorized('Authentication required'));
  }

  if (user.userType !== 'partner') {
    logger.warn('Unauthorized access attempt: user is not a partner', {
      userId: user.id,
      userType: user.userType
    });
    return next(createHttpError.forbidden('Access restricted to partners only'));
  }

  next();
};
