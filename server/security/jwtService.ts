import jwt from 'jsonwebtoken';
import { securityConfig } from '../config/index.js';

/**
 * Simple, Clean JWT Service
 * Does exactly what's needed: sign and verify JWT tokens securely
 * No overengineering, no complex systems - just reliable JWT operations
 * 
 * JWT_SECRET is validated by the config module at startup.
 * The application will not start if JWT_SECRET is missing or invalid.
 */

export interface JwtPayload {
  userId: string;           // Required internal field
  sub?: string;            // Standard JWT subject claim
  userType?: string;
  sessionId?: string;
  iat?: number;            // Standard issued at
  exp?: number;            // Standard expiration
  iss?: string;            // Standard issuer
  aud?: string;            // Standard audience
  [key: string]: any;
}

export interface JwtSignOptions {
  expiresIn?: string;
  audience?: string;
  issuer?: string;
  subject?: string;
}

export interface JwtVerifyOptions {
  audience?: string;
  issuer?: string;
  subject?: string;
  clockTolerance?: number;
  ignoreExpiration?: boolean;
  ignoreNotBefore?: boolean;
}

/**
 * Simple JWT Service - Clean and Reliable
 */
export class JwtService {
  private secret: string;
  private algorithm: jwt.Algorithm = 'HS256';
  private issuer: string = 'edupath-app';
  private audience: string = 'edupath-users';

  constructor() {
    // JWT_SECRET is validated by config module at startup
    this.secret = securityConfig.JWT_SECRET;
  }

  /**
   * Sign a JWT token
   */
  sign(payload: JwtPayload, options: JwtSignOptions = {}): string {
    // Build JWT options object with proper types
    const jwtOptions: any = {
      algorithm: this.algorithm,
      expiresIn: options.expiresIn || '24h',
      issuer: options.issuer || this.issuer,
      audience: options.audience || this.audience
    };

    // Add optional subject if provided
    if (options.subject) jwtOptions.subject = options.subject;

    return jwt.sign(payload, this.secret, jwtOptions);
  }

  /**
   * Verify a JWT token
   */
  verify(token: string, options: JwtVerifyOptions = {}): JwtPayload {
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: [this.algorithm],
      issuer: options.issuer || this.issuer,
      audience: options.audience || this.audience,
      ...options
    };

    return jwt.verify(token, this.secret, verifyOptions) as JwtPayload;
  }

  /**
   * Decode a JWT token without verification (for debugging)
   */
  decode(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if a token is expired without throwing
   */
  isExpired(token: string): boolean {
    try {
      this.verify(token);
      return false;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return true;
      }
      // For other errors (invalid token, etc.), consider it "expired" 
      return true;
    }
  }

  /**
   * Get the current algorithm being used
   */
  getAlgorithm(): string {
    return this.algorithm;
  }

  /**
   * Initialize the service (for compatibility with existing code)
   */
  async initialize(): Promise<void> {
    console.log('🔐 Simple JWT service initialized');
    console.log(`   • Algorithm: ${this.algorithm}`);
    console.log(`   • Secret source: environment`);
  }
}

// Export a singleton instance
export const jwtService = new JwtService();

// Legacy exports for compatibility
export const secureJwtService = jwtService;
export { jwtService as SecureJwtService };