import { Router, Request, Response } from 'express';
import { partnerController } from '../controllers/partner.controller';
import { requireAuth } from '../middleware/authentication';
import { requirePartner } from '../middleware/partner-auth.middleware';
import { csrfProtection, csrfTokenProvider, csrfTokenEndpoint } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import rateLimit from 'express-rate-limit';
import { getClientIp } from '../middleware/security';

const router = Router();

/**
 * Partner API Rate Limiter
 * Limits partner requests to 100 per 15-minute window per partner account
 */
const partnerApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this account. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || getClientIp(req);
  }
});

/**
 * Partner Registration Rate Limiter
 * Limits registration attempts to 5 per hour per IP
 */
const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per IP per hour
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req)
});

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * Partner Registration
 * @route POST /api/partner/register
 * @access Public
 * @rateLimit 5 requests per hour per IP
 * @csrf Required
 */
router.post('/register', 
  registrationRateLimit,
  csrfProtection,
  asyncHandler((req: Request, res: Response) => partnerController.registerPartner(req, res))
);

/**
 * CSRF Token Endpoint
 * @route GET /api/partner/csrf-token
 * @access Public
 */
router.get('/csrf-token', 
  csrfTokenProvider,
  asyncHandler(csrfTokenEndpoint)
);

// ============================================================================
// PROTECTED ROUTES (Require Authentication + Partner Role)
// Apply rate limiting to all protected partner routes
// ============================================================================

router.use(requireAuth);
router.use(requirePartner);
router.use(partnerApiLimiter);

/**
 * Get Partner Profile
 * @route GET /api/partner/profile
 * @access Partner
 */
router.get('/profile', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getProfile(req, res))
);

/**
 * Update Partner Profile
 * @route PUT /api/partner/profile
 * @access Partner
 * @csrf Required
 */
router.put('/profile', 
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.updateProfile(req, res))
);

/**
 * Get Dashboard Statistics
 * @route GET /api/partner/dashboard
 * @access Partner
 */
router.get('/dashboard', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getDashboardStats(req, res))
);

// ============================================================================
// REFERRAL LINK MANAGEMENT
// ============================================================================

/**
 * Get All Referral Links
 * @route GET /api/partner/referral-links
 * @access Partner
 */
router.get('/referral-links', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getReferralLinks(req, res))
);

/**
 * Create Referral Link
 * @route POST /api/partner/referral-links
 * @access Partner
 * @csrf Required
 */
router.post('/referral-links', 
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.createReferralLink(req, res))
);

/**
 * Update Referral Link
 * @route PUT /api/partner/referral-links/:linkId
 * @access Partner
 * @csrf Required
 */
router.put('/referral-links/:linkId', 
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.updateReferralLink(req, res))
);

// ============================================================================
// REFERRAL & COMMISSION TRACKING
// ============================================================================

/**
 * Get All Student Referrals
 * @route GET /api/partner/referrals
 * @access Partner
 */
router.get('/referrals', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getReferrals(req, res))
);

/**
 * Get Commission History
 * @route GET /api/partner/commissions
 * @access Partner
 */
router.get('/commissions', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getCommissions(req, res))
);

// ============================================================================
// PAYOUT MANAGEMENT
// ============================================================================

/**
 * Get Payout History
 * @route GET /api/partner/payouts
 * @access Partner
 */
router.get('/payouts', 
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getPayouts(req, res))
);

/**
 * Request Payout
 * @route POST /api/partner/payouts
 * @access Partner
 * @csrf Required
 */
router.post('/payouts', 
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.createPayout(req, res))
);

export default router;
