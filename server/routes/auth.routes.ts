import { Router, Request, Response } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection, csrfTokenProvider, csrfTokenEndpoint } from '../middleware/csrf';
import { loginRateLimit, registrationRateLimit } from '../middleware/security';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Student registration - Public route with CSRF protection
router.post('/student-register', 
  registrationRateLimit,
  csrfProtection,
  asyncHandler((req: Request, res: Response) => authController.registerStudent(req, res))
);

// Student login - Public route with CSRF protection
router.post('/student-login', 
  loginRateLimit,
  csrfProtection,
  asyncHandler((req: Request, res: Response) => authController.loginStudent(req, res))
);

// Team login - Public route with CSRF protection
router.post('/team-login', 
  csrfProtection,
  asyncHandler((req: Request, res: Response) => authController.loginTeam(req, res))
);

// Logout - Protected route
router.post('/logout', 
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => authController.logout(req, res))
);

// Get current user - Protected route
router.get('/me', 
  requireAuth,
  asyncHandler((req: AuthenticatedRequest, res: Response) => authController.me(req, res))
);

// CSRF token endpoint - Public route
router.get('/csrf-token', 
  csrfTokenProvider,
  asyncHandler(csrfTokenEndpoint)
);

// Team login visibility - Public route
router.get('/team-login-visibility', 
  asyncHandler((req: Request, res: Response) => authController.getTeamLoginVisibility(req, res))
);

// Staff Invitation Routes - Public routes
router.get('/staff-invite/:token', 
  asyncHandler((req: Request, res: Response) => authController.viewStaffInvite(req, res))
);

router.post('/register-staff', 
  registrationRateLimit,
  csrfProtection,
  asyncHandler((req: Request, res: Response) => authController.registerStaff(req, res))
);

export default router;
