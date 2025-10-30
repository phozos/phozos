import { Request } from 'express';
import { User } from '@shared/schema';

// Base authenticated request - user guaranteed to exist
export interface AuthenticatedRequest extends Request {
  user: User;
}

// Pre-authentication request - user may not exist yet
export interface PreAuthRequest extends Request {
  user?: User;
}

// Request with IP tracking (for pre-auth middleware)
export interface RequestWithIP extends Request {
  clientIp: string;
}

// Security request with IP tracking
export interface SecurityAuthRequest extends AuthenticatedRequest {
  clientIp: string;
}