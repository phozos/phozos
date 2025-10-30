import { Router, Response } from 'express';
import { counselorController } from '../controllers/counselor.controller';
import { requireAuth, requireTeamMember } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require team member authentication
router.use(requireAuth);
router.use(requireTeamMember);

// Get assigned students
router.get('/assigned-students', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getAssignedStudents(req, res)
));

// Get counselor stats
router.get('/stats', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStats(req, res)
));

// Student documents
router.get('/student-documents/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStudentDocuments(req, res)
));

// Student profile
router.get('/student-profile/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStudentProfile(req, res)
));

router.get('/student/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStudentProfile(req, res)
));

router.put('/update-student-profile/:studentId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.updateStudentProfile(req, res)
));

// Student universities
router.get('/student-universities/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStudentUniversities(req, res)
));

// Follow-ups
router.get('/followups/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getFollowUps(req, res)
));

router.post('/followups/:studentId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.createFollowUp(req, res)
));

// Chat messages
router.get('/chat/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getChatMessages(req, res)
));

router.post('/chat/:studentId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.sendChatMessage(req, res)
));

// Student subscription
router.get('/student-subscription/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  counselorController.getStudentSubscription(req, res)
));

// Placeholder routes - to be implemented
router.post('/upload-document/:studentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement document upload with multer
  res.status(501).json({ 
    success: false, 
    error: { code: 'NOT_IMPLEMENTED', message: 'Document upload not yet implemented' } 
  });
}));

router.post('/send-notification', csrfProtection, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement notification sending
  res.status(501).json({ 
    success: false, 
    error: { code: 'NOT_IMPLEMENTED', message: 'Send notification not yet implemented' } 
  });
}));

router.post('/add-university-to-shortlist', csrfProtection, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement university shortlist
  res.status(501).json({ 
    success: false, 
    error: { code: 'NOT_IMPLEMENTED', message: 'Add to shortlist not yet implemented' } 
  });
}));

router.post('/finalize-universities', csrfProtection, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement finalize universities
  res.status(501).json({ 
    success: false, 
    error: { code: 'NOT_IMPLEMENTED', message: 'Finalize universities not yet implemented' } 
  });
}));

router.put('/update-university-notes', csrfProtection, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // TODO: Implement update university notes
  res.status(501).json({ 
    success: false, 
    error: { code: 'NOT_IMPLEMENTED', message: 'Update university notes not yet implemented' } 
  });
}));

export default router;
