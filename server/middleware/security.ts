import { Request, Response, NextFunction, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { db } from "../db";
import { users, securitySettings, securityEvents, User } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
// Phase 5: Removed complex database tracking (ipRegistrationLimits, loginAttempts)
// Kept minimal imports for remaining essential functions
import { sendError } from '../utils/response';
// Phase 5: Removed feature flags import - no longer needed
import logger from '../utils/logger';

// Phase 5: Secure client IP helper - prevents spoofing attacks
export function getClientIp(req: Request): string {
  // Use Express req.ip which respects trust proxy settings
  // This prevents x-forwarded-for spoofing attacks
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
}

// Rate limiting for student registration (5 per hour per IP)
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    error: "Too many registration attempts from this IP. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => {
    // Skip rate limiting for admin IPs if needed
    const adminIps = process.env.ADMIN_IPS?.split(',') || [];
    return adminIps.includes(getClientIp(req));
  }
});

// Phase 5: Secure rate limiting for login attempts (replaces database locking)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Stricter rate limiting - replaces complex database locks
  message: {
    error: "Too many login attempts from this IP. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req), // Now uses secure IP detection
  skipSuccessfulRequests: true, // Allow successful requests to not count against limit
});

// Slow down repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  validate: { delayMs: false }
});

// Phase 5 Simplification: Removed complex database-backed IP registration limits
// The existing registrationRateLimit (memory-based) already handles IP limiting effectively

// Phase 5 Simplification: Removed complex database registration tracking
// The existing registrationRateLimit middleware handles this more efficiently

// Phase 5 Simplification: Removed complex database login attempt tracking
// The existing loginRateLimit middleware provides effective IP-based protection

// Phase 5 Simplification: Removed complex account locking system
// IP-based rate limiting provides effective protection without database complexity

// Check cooling period for new accounts
export async function isInCoolingPeriod(user: User): Promise<boolean> {
  logger.info('Checking cooling period', { 
    userId: user.id, 
    userType: user.userType 
  });
  
  // Company profiles are always exempt from cooling period
  if (user.userType === 'company_profile') {
    logger.info('Company profile exempted from cooling period', { userId: user.id });
    return false;
  }
  
  if (user.coolingPeriodBypassedAt) {
    logger.info('Cooling period bypassed by admin', { userId: user.id });
    return false; // Admin bypassed cooling period
  }

  // Check if admin has disabled the cooling period
  try {
    const [setting] = await db
      .select()
      .from(securitySettings)
      .where(eq(securitySettings.settingKey, 'forum_cooling_period_enabled'));
    
    logger.debug('Cooling period setting', { settingValue: setting?.settingValue });
    
    if (setting && setting.settingValue === 'false') {
      logger.info('Cooling period disabled by admin', { userId: user.id });
      return false; // Admin disabled cooling period
    }
  } catch (error) {
    logger.error('Error checking cooling period setting', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    // Continue with default behavior if database error
  }

  const accountAge = Date.now() - new Date(user.createdAt ?? new Date()).getTime();
  const coolingPeriod = 60 * 60 * 1000; // 1 hour in milliseconds
  
  logger.debug('Cooling period calculation', { 
    userId: user.id,
    accountAgeMinutes: accountAge / 1000 / 60, 
    coolingPeriodMinutes: coolingPeriod / 1000 / 60 
  });
  
  const inCoolingPeriod = accountAge < coolingPeriod;
  logger.info('Cooling period check result', { 
    userId: user.id,
    inCoolingPeriod 
  });
  
  return inCoolingPeriod;
}

// Admin bypass cooling period
export async function bypassCoolingPeriod(studentId: string, adminId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        coolingPeriodBypassedAt: new Date(),
        coolingPeriodBypassedBy: adminId
      })
      .where(eq(users.id, studentId));

    await logSecurityEvent(studentId, 'cooling_period_bypassed', null, null, {
      bypassedBy: adminId,
      bypassedAt: new Date()
    });
  } catch (error) {
    logger.error('Error bypassing cooling period', { 
      studentId, 
      adminId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

// Log security events
export async function logSecurityEvent(
  userId: string | null,
  eventType: string,
  ipAddress: string | null,
  userAgent: string | null,
  details?: any
) {
  try {
    await db
      .insert(securityEvents)
      .values({
        userId,
        eventType,
        ipAddress,
        userAgent,
        details,
        createdAt: new Date()
      });
  } catch (error) {
    logger.error('Error logging security event', { 
      userId,
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Middleware to add IP to request
export const addIpToRequest: RequestHandler = (req, res, next) => {
  req.clientIp = getClientIp(req);
  next();
}