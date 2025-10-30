import { Router, Request, Response } from 'express';
import { forumController } from '../controllers/forum.controller';
import { requireAuth, requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { forumImageUpload } from '../middleware/upload';

const router = Router();

// All forum routes require authentication
router.use(requireAuth);

// Get posts (authenticated - required to see personalized data like isLiked)
router.get('/posts', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getAllPosts(req, res)));
router.get('/posts/:id', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getPostById(req as any, res)));
router.get('/posts/:id/analytics', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getPostAnalytics(req as any, res)));

// Post management
router.post('/posts', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.createPost(req, res)));
router.put('/posts/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.updatePost(req, res)));
router.delete('/posts/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.deletePost(req, res)));

// Comments
router.get('/posts/:id/comments', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getComments(req as any, res)));
router.post('/posts/:id/comments', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.createComment(req, res)));

// Interactions
router.post('/posts/:id/like', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.toggleLike(req, res)));
router.post('/posts/:id/save', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.toggleSave(req, res)));
router.get('/saved', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getSavedPosts(req, res)));

// Polls
router.post('/posts/:id/poll/vote/:optionId', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.votePollOption(req, res)));
router.get('/posts/:id/poll/results', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getPollResults(req as any, res)));

// Forum reporting
router.post('/posts/:id/report', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.reportPost(req, res)));

// User votes
router.get('/posts/:id/user-votes', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getUserVotes(req as any, res)));
router.get('/posts/:id/user-vote-status', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getUserVoteStatus(req, res)));

// Forum images
router.post('/upload-images', forumImageUpload.array('images', 5), asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.uploadImages(req, res)));
router.get('/images/:filename', asyncHandler((req: AuthenticatedRequest, res: Response) => forumController.getForumImage(req as any, res)));

export default router;
