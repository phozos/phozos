import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

/**
 * Audit logger middleware for tracking all operations on sensitive resources
 * Implements comprehensive audit trail as per REMEDIATION_PLAN.md P2.3
 */
export const auditLogger = (resourceType: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    let responseBody: any;
    res.send = function(data: any) {
      responseBody = data;
      return originalSend.call(this, data);
    };
    
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        // Correct admin detection: Check teamRole instead of userType
        const isAdmin = req.user?.teamRole === 'admin' || req.user?.teamRole === 'staff';
        
        await db.insert(auditLogs).values({
          userId: req.user?.id,
          adminId: isAdmin ? req.user.id : null,
          action: getActionFromMethod(req.method),
          resourceType,
          resourceId: req.params.id || req.params.planId || req.params.migrationId,
          changes: sanitizeRequestBody(req.body), // Sanitize sensitive data
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
          userAgent: req.headers['user-agent'],
          requestMethod: req.method,
          requestPath: req.path,
          success,
          errorMessage: success ? null : JSON.stringify(responseBody),
          createdAt: new Date()
        });
        
        logger.debug('Audit log recorded', {
          resourceType,
          action: getActionFromMethod(req.method),
          duration: `${duration}ms`,
          success
        });
      } catch (error) {
        logger.error('Failed to write audit log', { error });
        // Don't block request on audit log failure
      }
    });
    
    next();
  };
};

/**
 * Sanitize request body to remove sensitive fields before logging
 * Prevents PII/credential leakage in audit logs
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
    'bankAccount'
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

function getActionFromMethod(method: string): string {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    case 'GET': return 'read';
    default: return 'unknown';
  }
}
