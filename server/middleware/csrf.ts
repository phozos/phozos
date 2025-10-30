/**
 * CSRF Protection Middleware - OWASP 2025 Compliant
 * 
 * Implements HMAC-signed double-submit cookie pattern with session binding.
 * 
 * Features:
 * - HMAC-SHA256 signed tokens for cryptographic verification
 * - Session binding to prevent token reuse across users
 * - Timing-safe signature comparison to prevent timing attacks
 * - Resistant to subdomain cookie injection attacks
 * - Performance optimized with minimal overhead
 * 
 * Token Format: randomValue.signature
 * Signature: HMAC-SHA256(randomValue.sessionId, CSRF_SECRET)
 * 
 * Configuration:
 * - CSRF_SECRET: Required secret for HMAC signing (min 32 chars) - from securityConfig
 * - CSRF_METRICS_ENABLED: Optional metrics tracking - from securityConfig
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { sendSuccess, sendError } from '../utils/response';
import { jwtService } from '../security/jwtService';
import { securityConfig, cookiesConfig, isDev } from '../config/index.js';
import logger from '../utils/logger';
import { hashSessionId } from '../utils/logger-sanitizers';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
      session?: any;
    }
  }
}

// CSRF Metrics Interface
interface CSRFMetrics {
  tokensGenerated: number;
  validationSuccesses: number;
  validationFailures: number;
  oldTokensDetected: number;
  sessionMismatches: number;
  lastReset: number;
}

// CSRF Configuration
interface CSRFConfig {
  secret?: string;
  tokenLength: number;
  metricsEnabled: boolean;
  cookie: {
    key: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  headerName: string;
  bodyField: string;
}

const defaultConfig: CSRFConfig = {
  tokenLength: 32,
  metricsEnabled: securityConfig.CSRF_METRICS_ENABLED,
  cookie: {
    key: '_csrf',
    httpOnly: false, // Frontend needs to read this for double-submit pattern
    sameSite: cookiesConfig.COOKIE_SAMESITE,
    secure: cookiesConfig.COOKIE_SECURE,
    maxAge: 3600000 // 1 hour
  },
  headerName: 'x-csrf-token',
  bodyField: '_csrf'
};

/**
 * Helper function to extract session ID from request
 * Returns userId from JWT if authenticated, otherwise 'unauthenticated'
 * 
 * SECURITY: This function VERIFIES the JWT signature before extracting the userId.
 * Unauthenticated or invalid JWTs are rejected and treated as 'unauthenticated'.
 */
function getSessionIdFromRequest(req: Request): string {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return 'unauthenticated';
    }
    
    // Verify JWT and extract userId from verified payload
    const token = authHeader.substring(7);
    const verified = jwtService.verify(token);
    
    // Extract userId (with fallbacks)
    const userId = verified?.userId || verified?.sub;
    
    return userId || 'unauthenticated';
  } catch (error) {
    // If JWT verification fails (invalid signature, expired, etc.), treat as unauthenticated
    logger.warn('JWT verification failed in CSRF session extraction', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return 'unauthenticated';
  }
}

export class CSRFTokenManager {
  public config: CSRFConfig;
  private secret: string;
  private metrics: CSRFMetrics;

  constructor(config?: Partial<CSRFConfig>) {
    this.config = { ...defaultConfig, ...config };
    
    // Initialize metrics
    this.metrics = {
      tokensGenerated: 0,
      validationSuccesses: 0,
      validationFailures: 0,
      oldTokensDetected: 0,
      sessionMismatches: 0,
      lastReset: Date.now()
    };
    
    // CSRF_SECRET is validated by config module at startup
    this.secret = config?.secret || securityConfig.CSRF_SECRET;
    
    // Start periodic metrics logging if enabled
    if (this.config.metricsEnabled) {
      this.startMetricsLogging();
    }
  }
  
  /**
   * Performance-optimized timing-safe string comparison
   * Uses Buffer.allocUnsafe for better performance (safe since we fill it immediately)
   * 
   * @param a - First hex string
   * @param b - Second hex string
   * @returns true if strings are equal in constant time
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    try {
      const bufferA = Buffer.allocUnsafe(a.length / 2);
      const bufferB = Buffer.allocUnsafe(b.length / 2);
      
      bufferA.write(a, 'hex');
      bufferB.write(b, 'hex');
      
      return timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }
  
  /**
   * Get current CSRF metrics
   * @returns Copy of current metrics
   */
  public getMetrics(): CSRFMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Reset CSRF metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      tokensGenerated: 0,
      validationSuccesses: 0,
      validationFailures: 0,
      oldTokensDetected: 0,
      sessionMismatches: 0,
      lastReset: Date.now()
    };
  }
  
  /**
   * Start periodic metrics logging (development only)
   */
  private startMetricsLogging(): void {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.metrics.lastReset) / 1000);
      const totalValidations = this.metrics.validationSuccesses + this.metrics.validationFailures;
      const failureRate = totalValidations > 0 
        ? ((this.metrics.validationFailures / totalValidations) * 100).toFixed(2)
        : '0.00';
      
      logger.info('CSRF Metrics', {
        uptimeSeconds: uptime,
        tokensGenerated: this.metrics.tokensGenerated,
        validationSuccesses: this.metrics.validationSuccesses,
        validationFailures: this.metrics.validationFailures,
        failureRatePercent: failureRate,
        oldTokensDetected: this.metrics.oldTokensDetected,
        sessionMismatches: this.metrics.sessionMismatches
      });
    }, 300000); // Log every 5 minutes
  }

  /**
   * Generate a cryptographically secure HMAC-signed CSRF token
   * 
   * Token format: randomValue.signature
   * Signature: HMAC-SHA256(randomValue.sessionId, secret)
   * 
   * @param sessionId - Session identifier (userId from JWT), defaults to 'unauthenticated'
   * @returns HMAC-signed token in format: random.signature
   */
  generateToken(sessionId: string = 'unauthenticated'): string {
    const start = this.config.metricsEnabled ? Date.now() : 0;
    
    // Generate random value
    const randomValue = randomBytes(this.config.tokenLength).toString('hex');
    
    // Create HMAC signature: HMAC-SHA256(randomValue.sessionId, secret)
    const message = `${randomValue}.${sessionId}`;
    const signature = createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');
    
    // Return token in format: randomValue.signature
    const token = `${randomValue}.${signature}`;
    
    // Track metrics
    if (this.config.metricsEnabled) {
      this.metrics.tokensGenerated++;
    }
    
    // Performance monitoring
    if (this.config.metricsEnabled && start > 0) {
      const duration = Date.now() - start;
      if (duration > 1) {
        logger.debug('CSRF token generated', { durationMs: duration });
      }
    }
    
    return token;
  }

  /**
   * Validate HMAC-signed CSRF token
   * 
   * @param token - Token to validate in format: randomValue.signature
   * @param sessionId - Session identifier (userId from JWT), defaults to 'unauthenticated'
   * @returns true if token is valid and matches session
   */
  validateToken(token: string, sessionId: string = 'unauthenticated'): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length === 0) {
      return false;
    }

    try {
      // Parse token format: randomValue.signature
      const parts = token.split('.');
      if (parts.length !== 2) {
        return false;
      }
      
      const [randomValue, providedSignature] = parts;
      
      // Validate parts are hex strings
      if (!/^[0-9a-f]+$/i.test(randomValue) || !/^[0-9a-f]+$/i.test(providedSignature)) {
        return false;
      }
      
      // Recompute expected signature
      const message = `${randomValue}.${sessionId}`;
      const expectedSignature = createHmac('sha256', this.secret)
        .update(message)
        .digest('hex');
      
      // Use optimized timing-safe comparison
      return this.timingSafeCompare(providedSignature, expectedSignature);
    } catch (error) {
      logger.error('CSRF token validation error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Get token from request (header or body)
   */
  getTokenFromRequest(req: Request): string | null {
    // Check header first (preferred method)
    const headerToken = req.headers[this.config.headerName] as string;
    if (headerToken) {
      return headerToken;
    }

    // Check body field as fallback
    const bodyToken = req.body?.[this.config.bodyField];
    if (bodyToken) {
      return bodyToken;
    }

    return null;
  }
}

// Create global instance
const csrfManager = new CSRFTokenManager();

/**
 * Middleware to add CSRF token generation capability to request
 */
export const csrfTokenProvider = (req: Request, res: Response, next: NextFunction): void => {
  req.csrfToken = () => {
    // Extract session ID from request (userId or 'unauthenticated')
    const sessionId = getSessionIdFromRequest(req);
    
    // Generate token with session binding
    const token = csrfManager.generateToken(sessionId);
    
    // Set cookie with centralized configuration
    res.cookie(defaultConfig.cookie.key, token, {
      httpOnly: false, // Frontend needs to read this for double-submit pattern
      sameSite: cookiesConfig.COOKIE_SAMESITE,
      secure: cookiesConfig.COOKIE_SECURE,
      path: '/',
      maxAge: defaultConfig.cookie.maxAge
    });
    
    return token;
  };
  
  next();
};

/**
 * Middleware to validate CSRF tokens
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): Response | void => {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = csrfManager.getTokenFromRequest(req);
  const cookieToken = req.cookies?.[defaultConfig.cookie.key];

  // Double-submit cookie pattern validation
  if (!token || !cookieToken) {
    logger.warn('CSRF validation failed: Missing tokens', { 
      hasHeaderOrBodyToken: !!token, 
      hasCookieToken: !!cookieToken 
    });
    
    // Track failure metrics
    if (csrfManager.config.metricsEnabled) {
      csrfManager['metrics'].validationFailures++;
    }
    
    return sendError(res, 403, 'CSRF_TOKEN_MISSING', 'CSRF token missing');
  }

  // Validate double-submit pattern (token must match cookie)
  if (token !== cookieToken) {
    logger.warn('CSRF validation failed: Token/cookie mismatch');
    
    // Track failure metrics
    if (csrfManager.config.metricsEnabled) {
      csrfManager['metrics'].validationFailures++;
    }
    
    return sendError(res, 403, 'CSRF_TOKEN_MISMATCH', 'CSRF token mismatch');
  }

  // Extract session ID from request
  const sessionId = getSessionIdFromRequest(req);
  
  // Validate HMAC signature and session binding
  const isValid = csrfManager.validateToken(token, sessionId);
  
  if (!isValid) {
    logger.warn('CSRF validation failed: Invalid signature or session mismatch', { 
      sessionHash: hashSessionId(sessionId) 
    });
    
    // Track failure and session mismatch metrics
    if (csrfManager.config.metricsEnabled) {
      csrfManager['metrics'].validationFailures++;
      csrfManager['metrics'].sessionMismatches++;
    }
    
    return sendError(res, 403, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token signature or session mismatch');
  }

  // Track success metrics
  if (csrfManager.config.metricsEnabled) {
    csrfManager['metrics'].validationSuccesses++;
  }

  logger.info('CSRF validation successful', { 
    sessionHash: hashSessionId(sessionId) 
  });
  next();
};

/**
 * Route handler to provide CSRF token to frontend with enhanced validation
 */
export const csrfTokenEndpoint = (req: Request, res: Response): Response | void => {
  try {
    // Check if token generation function is available
    if (!req.csrfToken || typeof req.csrfToken !== 'function') {
      logger.error('CSRF token generator not available on request object');
      return sendError(res, 500, 'CSRF_SERVICE_UNAVAILABLE', 'CSRF token generation service is not available');
    }

    const token = req.csrfToken();
    
    // Validate generated token before sending
    if (!token || typeof token !== 'string' || token.length === 0) {
      logger.error('Generated CSRF token is invalid or empty');
      return sendError(res, 500, 'CSRF_GENERATION_ERROR', 'Failed to generate valid CSRF token');
    }

    // Validate format: should contain dot separator for HMAC-signed tokens
    if (!token.includes('.')) {
      logger.error('Generated CSRF token has invalid format (missing signature)');
      return sendError(res, 500, 'CSRF_FORMAT_ERROR', 'Generated CSRF token has invalid format');
    }

    // Extract session ID for logging
    const sessionId = getSessionIdFromRequest(req);
    
    logger.info('CSRF token generated and validated successfully', {
      authenticated: sessionId !== 'unauthenticated',
      sessionHash: sessionId !== 'unauthenticated' ? hashSessionId(sessionId) : null
    });
    
    // Enhanced response with additional context for debugging
    const response: any = {
      csrfToken: token,
      timestamp: Date.now()
    };

    // Add development debugging information
    if (isDev()) {
      response.environment = 'development';
      response.tokenLength = token.length;
      response.sessionHash = sessionId !== 'unauthenticated' ? hashSessionId(sessionId) : 'unauthenticated';
      response.debug = {
        cookieSet: true,
        headerRequired: 'x-csrf-token',
        sessionBound: true,
        hmacSigned: true
      };
    }

    return sendSuccess(res, response);
  } catch (error: any) {
    logger.error('CSRF token endpoint error', { 
      error: error.message || 'Unknown error',
      code: error.code
    });
    
    // Provide more specific error information
    const errorMessage = error.message || 'Internal server error occurred during CSRF token generation';
    const errorCode = error.code || 'CSRF_INTERNAL_ERROR';
    
    return sendError(res, 500, errorCode, errorMessage);
  }
};

/**
 * Error handler for CSRF-related errors
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): Response | void => {
  if (err && err.code === 'CSRF_ERROR') {
    logger.warn('CSRF error caught by error handler', { error: err.message });
    return sendError(res, 403, 'CSRF_ERROR', err.message || 'CSRF validation failed');
  }
  
  next(err);
};

export { csrfManager };
