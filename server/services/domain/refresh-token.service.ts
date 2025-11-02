import * as crypto from 'crypto';
import { db } from '../../db';
import { refreshTokens } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

/**
 * Refresh Token Service
 * 
 * Handles secure refresh token management following OAuth 2.0 and OWASP best practices:
 * - Tokens are hashed before storage (never store plaintext)
 * - Token rotation on each refresh (prevents token theft/replay attacks)
 * - 30-day expiration with cleanup of expired tokens
 * - Device and IP tracking for security auditing
 */
export class RefreshTokenService {
  /**
   * Generate a secure random refresh token (40 bytes = 80 hex characters)
   */
  generateToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Hash token using SHA-256 for secure storage
   * Never store plaintext tokens in the database
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create and store a new refresh token
   * 
   * @param userId - User ID to associate with the token
   * @param token - The plaintext token to hash and store
   * @param deviceInfo - Optional device/user-agent information
   * @param ipAddress - Optional IP address for security tracking
   */
  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
      deviceInfo,
      ipAddress
    });
  }

  /**
   * Validate a refresh token and rotate it (issue a new one)
   * 
   * Token rotation is a security best practice that:
   * - Invalidates the old token immediately after use
   * - Issues a new token for the next refresh
   * - Detects token theft (if both old and new tokens are used)
   * 
   * @param token - The plaintext token to validate
   * @returns Object with userId and new token, or null if invalid/expired
   */
  async validateAndRotate(token: string): Promise<{ userId: string; newToken: string } | null> {
    const tokenHash = this.hashToken(token);

    // Find the token in the database
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .limit(1);

    if (!storedToken) {
      // Token not found or already revoked
      return null;
    }

    // Check if token has expired
    if (new Date() > storedToken.expiresAt) {
      // Token expired - revoke it
      await this.revokeToken(tokenHash);
      return null;
    }

    // ROTATION: Immediately revoke the old token
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    // Generate and store a new token
    const newToken = this.generateToken();
    await this.createRefreshToken(storedToken.userId, newToken);

    // Update last used timestamp on the old token record (for auditing)
    await db
      .update(refreshTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(refreshTokens.id, storedToken.id));

    return {
      userId: storedToken.userId,
      newToken
    };
  }

  /**
   * Revoke a specific refresh token (e.g., on logout)
   * 
   * @param tokenHash - The hashed token to revoke
   */
  async revokeToken(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * 
   * @param userId - The user ID whose tokens should be revoked
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  /**
   * Clean up expired refresh tokens from the database
   * Should be run periodically (e.g., daily cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now));
  }
}

// Export singleton instance
export const refreshTokenService = new RefreshTokenService();
