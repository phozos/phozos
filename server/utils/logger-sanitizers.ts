/**
 * Logger Sanitization Utilities
 * 
 * Provides functions to redact sensitive data from logs to prevent
 * security vulnerabilities and privacy violations.
 */

import { createHash } from 'crypto';

/**
 * Sensitive field patterns to redact
 */
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurity'
];

/**
 * Email regex for masking
 */
const EMAIL_REGEX = /^([a-zA-Z0-9])([^@]*)(@.+)$/;

/**
 * Sanitize log data by redacting sensitive fields
 * Handles nested objects recursively
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data with sensitive fields redacted
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle non-object types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  // Clone object to avoid mutating original
  const sanitized = { ...data };

  // Redact sensitive fields
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Mask email addresses
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.email = maskEmail(sanitized.email);
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Sanitize HTTP headers by redacting Authorization and sensitive headers
 * 
 * @param headers - HTTP headers object
 * @returns Sanitized headers
 */
export function sanitizeHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const sanitized = { ...headers };

  // Redact authorization headers
  if (sanitized.authorization) {
    sanitized.authorization = sanitized.authorization.startsWith('Bearer ')
      ? 'Bearer [REDACTED]'
      : '[REDACTED]';
  }

  if (sanitized.Authorization) {
    sanitized.Authorization = sanitized.Authorization.startsWith('Bearer ')
      ? 'Bearer [REDACTED]'
      : '[REDACTED]';
  }

  // Redact cookies
  if (sanitized.cookie) {
    sanitized.cookie = '[REDACTED]';
  }

  if (sanitized.Cookie) {
    sanitized.Cookie = '[REDACTED]';
  }

  // Redact API keys
  if (sanitized['x-api-key']) {
    sanitized['x-api-key'] = '[REDACTED]';
  }

  return sanitized;
}

/**
 * Mask email address by showing only first character and domain
 * Example: john.doe@example.com -> j***@example.com
 * 
 * @param email - Email address to mask
 * @returns Masked email address
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return email;
  }

  const match = email.match(EMAIL_REGEX);
  if (!match) {
    return email; // Return as-is if not a valid email format
  }

  return `${match[1]}***${match[3]}`;
}

/**
 * Hash session ID for secure logging
 * 
 * @param sessionId - Session ID to hash
 * @returns First 16 characters of SHA256 hash
 */
export function hashSessionId(sessionId: string): string {
  if (!sessionId || typeof sessionId !== 'string') {
    return '[INVALID_SESSION]';
  }

  return createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Sanitize request body by removing sensitive fields
 * 
 * @param body - Request body object
 * @returns Sanitized body
 */
export function sanitizeBody(body: any): any {
  return sanitizeLogData(body);
}
