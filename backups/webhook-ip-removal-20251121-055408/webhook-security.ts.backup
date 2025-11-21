/**
 * Webhook Security Middleware
 * 
 * Provides IP whitelisting and rate limiting for webhook endpoints
 * to protect against DDoS attacks and unauthorized access.
 * 
 * CRITICAL: Handles IPv6-mapped IPv4 addresses from proxies
 * Production webhooks arrive through proxies (Nginx, AWS ALB) which
 * expose IPs as IPv6-mapped format (::ffff:3.7.71.51 instead of 3.7.71.51).
 * This middleware normalizes all IPs before validation to prevent false rejections.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import { razorpayConfig } from '../config';

/**
 * Normalize IPv6-mapped IPv4 addresses to pure IPv4 format
 * 
 * Converts: ::ffff:3.7.71.51 → 3.7.71.51
 * Preserves: 3.7.71.51 → 3.7.71.51
 * Preserves: 2001:db8::1 → 2001:db8::1 (pure IPv6)
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
 * IP Whitelist Middleware for Razorpay Webhooks
 * 
 * Validates that webhook requests come from authorized Razorpay IP addresses.
 * Rejects requests from non-whitelisted IPs with 403 Forbidden.
 * 
 * SECURITY: Uses Express's req.ip for IP validation
 * - Express automatically handles X-Forwarded-For when trust proxy is enabled
 * - Prevents IP spoofing attacks (manual header parsing removed)
 * - Normalizes IPv6-mapped IPv4 addresses (::ffff:3.7.71.51 → 3.7.71.51)
 * - Validates against Razorpay's official webhook IP ranges
 * 
 * REQUIRES: Express trust proxy must be enabled (app.set('trust proxy', true))
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
