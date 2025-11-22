/**
 * Webhook Security Middleware
 * 
 * Provides rate limiting for webhook endpoints to protect against DDoS attacks.
 * 
 * SECURITY ARCHITECTURE (Updated November 2025):
 * This module previously included IP whitelisting, which has been deprecated in favor
 * of signature-only verification (industry best practice). The current security model uses:
 * 
 * 1. Rate Limiting (10 req/min per IP) - DDoS protection
 * 2. HMAC Signature Verification - Cryptographic authentication
 * 3. Timestamp Validation - Replay attack prevention
 * 4. Event Deduplication - Duplicate processing prevention
 * 
 * IP whitelisting removed because:
 * - Cloud proxies make IP validation unreliable (Replit, AWS, Heroku)
 * - Requires platform-specific TRUST_PROXY configuration
 * - Not recommended by payment providers (Stripe, Razorpay, PayPal)
 * - Signature verification provides superior cryptographic security
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import { razorpayConfig } from '../config';

/**
 * @deprecated As of November 2025
 * @reason IP whitelisting removed in favor of signature-only verification
 * @see https://razorpay.com/docs/webhooks/ - Recommends signature verification
 * @migration Use HMAC signature verification instead (razorpayService.verifyWebhookSignature)
 * 
 * Normalize IPv6-mapped IPv4 addresses to pure IPv4 format
 * 
 * Converts: ::ffff:3.7.71.51 → 3.7.71.51
 * Preserves: 3.7.71.51 → 3.7.71.51
 * Preserves: 2001:db8::1 → 2001:db8::1 (pure IPv6)
 * 
 * KEPT FOR ROLLBACK CAPABILITY ONLY - Not used in production
 * 
 * @param ip - IP address to normalize
 * @returns Normalized IP address
 */
function normalizeIp(ip: string): string {
  if (!ip) return ip;
  
  // Remove IPv6-mapped IPv4 prefix
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
}

/**
 * @deprecated As of November 2025
 * @reason IP whitelisting is unreliable in cloud proxy environments (Replit, AWS, Heroku)
 * @replacement Use signature-only verification (razorpayService.verifyWebhookSignature)
 * @see WEBHOOK_IP_WHITELIST_REMOVAL_IMPLEMENTATION_PLAN.md for details
 * 
 * IP Whitelist Middleware for Razorpay Webhooks
 * 
 * Validates that webhook requests come from authorized Razorpay IP addresses.
 * Rejects requests from non-whitelisted IPs with 403 Forbidden.
 * 
 * DEPRECATED RATIONALE:
 * - Cloud proxies (Replit, AWS ELB, Heroku) make IP validation fragile
 * - Requires complex TRUST_PROXY configuration that varies by platform
 * - Not recommended by payment providers (Stripe, GitHub, PayPal use signature-only)
 * - HMAC signature verification provides cryptographically superior security
 * 
 * MIGRATION PATH:
 * This function is kept intact for rollback capability but is not used in production routes.
 * All webhook security now relies on:
 * 1. Rate limiting (webhookRateLimit) - DDoS protection
 * 2. Signature verification (controller) - Cryptographic authentication
 * 3. Timestamp validation (controller) - Replay attack prevention
 * 4. Event deduplication (controller) - Duplicate processing prevention
 * 
 * KEPT FOR ROLLBACK CAPABILITY ONLY - Not used in production
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function webhookIpWhitelist(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get client IP from Express (handles X-Forwarded-For when trust proxy is enabled)
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const normalizedIp = normalizeIp(clientIp);
  
  // Get whitelisted IPs from configuration
  const whitelistedIps = razorpayConfig.webhookIps;
  
  // Check if IP is whitelisted
  if (!whitelistedIps.includes(normalizedIp)) {
    logger.warn('Rejected webhook from unauthorized IP', {
      clientIp,
      normalizedIp,
      whitelistedIps,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Webhooks only accepted from Razorpay IPs',
    });
    return;
  }

  // IP is whitelisted, proceed to next middleware
  logger.info('Webhook request from whitelisted IP accepted', {
    clientIp,
    normalizedIp,
    path: req.path,
  });
  
  next();
}

/**
 * Rate Limiting Middleware for Razorpay Webhooks
 * 
 * Limits webhook requests to 10 per minute per IP address
 * to prevent DDoS attacks and webhook spam.
 * 
 * Configuration:
 * - Window: 1 minute (60,000ms)
 * - Max requests: 10 per window per IP
 * - Returns 429 Too Many Requests when limit exceeded
 */
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many webhook requests',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Note: Using default keyGenerator which handles IPv6 correctly via req.ip
  // Express's trust proxy setting ensures req.ip reflects the true client IP
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    
    logger.warn('Webhook rate limit exceeded', {
      clientIp,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Too many webhook requests',
    });
  },
});
