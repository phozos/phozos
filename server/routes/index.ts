import { Express, Router, Request, Response, NextFunction } from 'express';
import { createServer, type Server } from 'http';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import universityRoutes from './university.routes';
import applicationRoutes from './application.routes';
import forumRoutes from './forum.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import aiRoutes from './ai.routes';
import eventRoutes from './event.routes';
import counselorRoutes from './counselor.routes';
import chatRoutes from './chat.routes';
import analyticsRoutes from './analytics.routes';
import studentRoutes from './student.routes';
import systemMetricsRoutes from './systemMetrics';
import { createNotificationRoutes } from './notification.routes';
import companyRoutes from './company.routes';
import subscriptionRoutes from './subscription.routes';
import testimonialRoutes from './testimonial.routes';
import systemRoutes from './system.routes';
import { WebSocketService } from '../services/infrastructure/websocket';
import { WebSocketEventHandlers } from '../services/infrastructure/websocket-handlers';
import { adminSecurityService } from '../services/domain/admin';
import { forumService } from '../services/domain/forum.service';
import { healthCheckEndpoint } from '../middleware/database-health';
import { sendError } from '../utils/response';
import { container, TYPES } from '../services/container';

// Maintenance mode middleware
export const checkMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use req.baseUrl + req.path for full path when mounted on sub-router
  const fullPath = req.baseUrl + req.path;
  
  // Skip maintenance check for admin routes, auth endpoints, and frontend auth pages
  if (fullPath.startsWith('/api/admin') || 
      fullPath === '/api/maintenance-status' ||
      fullPath === '/api/auth/login' ||
      fullPath === '/api/auth/student-login' ||
      fullPath === '/api/auth/team-login' ||
      fullPath === '/api/auth/logout' ||
      fullPath === '/api/auth/me' ||
      fullPath === '/api/auth/team-login-visibility' ||
      fullPath === '/auth' ||
      fullPath.startsWith('/auth/') ||
      fullPath === '/dashboard/admin' ||
      fullPath.startsWith('/dashboard/admin/') ||
      req.path.startsWith('/admin') || // When mounted on router, path is /admin not /api/admin
      req.path.startsWith('/auth')) {  // When mounted on router, path is /auth not /api/auth
    return next();
  }

  try {
    const settings = await adminSecurityService.getSecuritySettings();
    const maintenanceMode = settings.find((s: any) => s.settingKey === 'maintenance_mode');
    
    if (maintenanceMode?.settingValue === 'true') {
      return sendError(res, 503, "MAINTENANCE_MODE", "Site is currently under maintenance. Please try again later.", { maintenance: true });
    }
    
    next();
  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    next(); // Allow requests to continue if there's an error
  }
};

export async function registerRoutes(app: Express, httpServer: Server): Promise<Router> {
  // Create dedicated API router
  const apiRouter = Router();

  // Database Health Check Endpoint (before global middleware)
  apiRouter.get('/health', healthCheckEndpoint);

  // Apply global middleware
  apiRouter.use(checkMaintenanceMode);

  // Initialize WebSocket service and handlers via DI container (Phase 5.4)
  const wsService = new WebSocketService(httpServer, forumService);
  const wsHandlers = new WebSocketEventHandlers(wsService, forumService);
  
  // Bind to DI container for centralized access
  container.bind(TYPES.WebSocketService, wsService);
  container.bind(TYPES.WebSocketEventHandlers, wsHandlers);

  // Mount domain routes
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/universities', universityRoutes);
  apiRouter.use('/applications', applicationRoutes);
  apiRouter.use('/forum', forumRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/documents', documentRoutes);
  apiRouter.use('/ai', aiRoutes);
  apiRouter.use('/events', eventRoutes);
  apiRouter.use('/notifications', createNotificationRoutes());
  apiRouter.use('/counselor', counselorRoutes);
  apiRouter.use('/chat', chatRoutes);
  apiRouter.use('/analytics', analyticsRoutes);
  apiRouter.use('/student', studentRoutes);
  apiRouter.use('/system-metrics', systemMetricsRoutes);
  apiRouter.use('/company', companyRoutes);
  apiRouter.use('/subscription', subscriptionRoutes);
  apiRouter.use('/testimonials', testimonialRoutes);
  apiRouter.use('/', systemRoutes);

  return apiRouter;
}

/**
 * Central route registry - exports all modular routes for mounting
 * Following the modular architecture pattern from Phase 3 of the modularization plan.
 */
export function createModularRoutes(): Router {
  const router = Router();

  // Mount domain routes (for backward compatibility)
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/universities', universityRoutes);
  router.use('/applications', applicationRoutes);
  router.use('/forum', forumRoutes);
  router.use('/admin', adminRoutes);
  router.use('/documents', documentRoutes);
  router.use('/ai', aiRoutes);
  router.use('/events', eventRoutes);
  router.use('/counselor', counselorRoutes);
  router.use('/chat', chatRoutes);
  router.use('/analytics', analyticsRoutes);
  router.use('/student', studentRoutes);

  return router;
}

// Export individual route modules for direct use
export {
  authRoutes,
  userRoutes,
  universityRoutes,
  applicationRoutes,
  forumRoutes,
  adminRoutes,
  documentRoutes,
  aiRoutes,
  eventRoutes,
  counselorRoutes,
  chatRoutes,
  analyticsRoutes,
  studentRoutes,
  systemMetricsRoutes,
  companyRoutes,
  subscriptionRoutes,
  testimonialRoutes,
  systemRoutes
};

/**
 * Export WebSocket service and handlers for access in other modules
 * Retrieve from DI container for centralized dependency management (Phase 5.4)
 */
export const getWebSocketService = () => container.get<WebSocketService>(TYPES.WebSocketService);
export const getWebSocketHandlers = () => container.get<WebSocketEventHandlers>(TYPES.WebSocketEventHandlers);
