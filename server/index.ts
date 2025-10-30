import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import helmet from "helmet";
import { registerRoutes } from "./routes/index";
import { createServer } from "http";
import { speedLimiter, addIpToRequest } from "./middleware/security";
import { checkMaintenanceMode } from "./routes/index";
import { serveStatic, log } from "./vite-production.js";
import { createDefaultAdmin } from "./admin-setup";
import { performanceMonitor } from "./middleware/performanceMonitor";
import systemMetricsRouter from "./routes/systemMetrics";
// Phase 5: Removed feature flags import - no longer needed
import { csrfTokenProvider, csrfErrorHandler } from "./middleware/csrf";
import { jwtService } from "./security/jwtService";
import { db } from "./db";
import { like, eq } from "drizzle-orm";
import { securitySettings } from "../shared/schema";
import { errorHandler } from "./middleware/error-handler";
import { sendError } from "./utils/response";
import { requireAdmin } from "./middleware/authentication";
import { injectSEOMeta } from "./middleware/seo-meta";

// Phase 1: Centralized configuration module (replaces scattered process.env usage)
import config, { isDev, isProd, featuresConfig, corsConfig, securityConfig } from "./config/index";

// Phase 1 CORS scaffolding: Use centralized config for allowed origins
// This configuration is prepared but not active yet (CORS middleware not enabled)
// Fallback to localhost origins for development environments
const allowedOrigins = config.cors.ALLOWED_ORIGINS.length > 0
  ? config.cors.ALLOWED_ORIGINS
  : ['http://localhost:5000', 'http://localhost:5173'];

const app = express();

// Configure trust proxy for secure IP detection and rate limiting
// Using config value instead of hardcoded 'true' to prevent IP spoofing
app.set('trust proxy', securityConfig.TRUST_PROXY);

// HTTPS Redirect Middleware (Feature flag controlled)
if (featuresConfig.FORCE_HTTPS_REDIRECT) {
  app.use((req, res, next) => {
    // Check X-Forwarded-Proto header (AWS Lightsail sets this)
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Canonical URL Enforcement Middleware (Feature flag controlled)
if (featuresConfig.CANONICAL_URL_ENFORCEMENT) {
  app.use((req, res, next) => {
    const host = req.header('host') || '';
    const url = req.url;
    let shouldRedirect = false;
    let newUrl = url;
    let newHost = host;

    // Enforce non-www (redirect www to non-www)
    if (host.startsWith('www.')) {
      newHost = host.replace('www.', '');
      shouldRedirect = true;
    }

    // Remove trailing slashes (except for root path)
    if (url.length > 1 && url.endsWith('/') && !url.includes('?')) {
      newUrl = url.slice(0, -1);
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      const protocol = req.header('x-forwarded-proto') || 'https';
      res.redirect(301, `${protocol}://${newHost}${newUrl}`);
    } else {
      next();
    }
  });
}

// Apply security headers with helmet
app.use(helmet({
  contentSecurityPolicy: false, // Configure separately if needed
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Phase 2: CORS middleware for cross-origin requests
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  maxAge: corsConfig.CORS_MAX_AGE, // Feature flag: Use centralized CORS config
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add CSRF token provider globally (safe - only adds token generation capability)
app.use(csrfTokenProvider);

// Add performance monitoring middleware
app.use(performanceMonitor.middleware());

// Add request logging middleware (BEFORE routes)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.originalUrl;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isApiRequest = path.startsWith('/api/');
    const isSensitiveRoute = path.startsWith('/api/auth') || path.startsWith('/api/admin');
    const isCorsRequest = !!req.headers.origin;
    
    if (isDev() && isApiRequest) { // Phase 1: Use centralized config helper
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Log CORS headers in development for debugging
      if (isCorsRequest) {
        const corsOrigin = res.getHeader('Access-Control-Allow-Origin');
        const corsCredentials = res.getHeader('Access-Control-Allow-Credentials');
        if (corsOrigin || corsCredentials) {
          logLine += ` [CORS: Origin=${corsOrigin || 'none'}, Credentials=${corsCredentials || 'none'}]`;
        }
      }
      
      // Redact sensitive response data
      if (capturedJsonResponse && !isSensitiveRoute) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      } else if (isSensitiveRoute) {
        logLine += ` :: [REDACTED-AUTH]`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add remaining middleware moved from registerRoutes (BEFORE routes) 
app.use(addIpToRequest);
app.use(speedLimiter);
app.use(checkMaintenanceMode);

// Add production monitoring (feature flag controlled)
if (featuresConfig.MONITORING_ENABLED) {
  import('./middleware/production-monitor').then(({ trackApiCompliance }) => {
    app.use(trackApiCompliance);
    console.log('🏭 Production monitoring enabled: API compliance tracking');
  });
}

// Development-only middleware removed in Phase 5 simplification
// Complex error validation and response validation systems eliminated

// Add system metrics routes (admin access)
app.use('/api/system', systemMetricsRouter);

// Add query analytics routes (admin access)
// Query analytics router removed during Phase 2 simplification

// Add production compliance report endpoint (feature flag controlled)  
if (featuresConfig.COMPLIANCE_REPORT_ENABLED) {
  import('./middleware/production-monitor').then(({ getProductionReport }) => {
    app.get('/api/system/compliance-report', requireAdmin, getProductionReport);
    console.log('🏭 Production compliance report endpoint enabled: /api/system/compliance-report');
  });
}


// Removed overengineered JWT deployment detection and secret generation functions
// These are no longer needed with the simplified JWT service

(async () => {
  // Initialize admin user
  try {
    await createDefaultAdmin();
  } catch (error) {
    console.error("Failed to create default admin:", error);
  }

  // Run post-migration setup
  try {
    const { setupAfterMigration } = await import("./setup-after-migration.js");
    await setupAfterMigration();
  } catch (error) {
    console.error("Failed to run post-migration setup:", error);
  }

  // Seed sample data - DISABLED for clean slate
  // try {
  //   const { seedSampleData } = await import("./seed-data.js");
  //   await seedSampleData();
  // } catch (error) {
  //   console.error("Failed to seed sample data:", error);
  // }

  // Initialize simple JWT service
  try {
    await jwtService.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize JWT service:', error);
    process.exit(1);
  }

  // Initialize DI container with service bindings (Phase 3)
  try {
    const { initializeContainer } = await import('./services/container');
    await initializeContainer();
    console.log('✅ DI Container initialized with all service bindings');
  } catch (error) {
    console.error('❌ Failed to initialize DI container:', error);
    process.exit(1);
  }

  // Log feature flags status for auth simplification project
  // Phase 5: Feature flags removed - no longer needed
  
  // Phase 1: Validate CORS environment configuration using centralized config
  const corsEnabled = config.cors.CORS_ENABLED;
  const allowedOriginsSet = config.cors.ALLOWED_ORIGINS.length > 0;
  const sameSiteNone = config.cookies.COOKIE_SAMESITE === 'none';
  const isHttps = isProd() || process.env.HTTPS === 'true';
  
  if (isDev()) {
    console.log('🌐 CORS Configuration:');
    console.log(`  • CORS Enabled: ${corsEnabled ? 'Yes' : 'No'}`);
    console.log(`  • Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log(`  • CSRF SameSite: ${config.cookies.COOKIE_SAMESITE}`);
    console.log(`  • Cookie Secure: ${config.cookies.COOKIE_SECURE}`);
  }
  
  // Warn about potential misconfigurations
  if (corsEnabled && !allowedOriginsSet) {
    console.warn('⚠️ Warning: CORS_ENABLED=true but ALLOWED_ORIGINS is not set. Using default localhost origins.');
  }
  
  if (sameSiteNone && !isHttps) {
    console.warn('⚠️ Warning: CSRF_COOKIE_SAMESITE=none requires HTTPS. Cookies may be rejected by browsers.');
    console.warn('   Set NODE_ENV=production or ensure you are using HTTPS in your deployment.');
  }
  
  if (corsEnabled && !sameSiteNone && isProd()) {
    console.warn('⚠️ Warning: CORS is enabled but CSRF_COOKIE_SAMESITE is not set to "none".');
    console.warn('   Cross-origin cookies may not work. Set CSRF_COOKIE_SAMESITE=none for split deployments.');
  }
  
  console.log('🚀 Starting application with validated security configuration...');
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Register all routes and get API router
  const apiRouter = await registerRoutes(app, httpServer);
  
  // Mount the dedicated API router before any catch-all routes
  app.use('/api', apiRouter);

  // Add SEO meta tag injection middleware (feature flag controlled)
  // This injects page-specific meta tags for better SEO without full prerendering
  if (featuresConfig.SEO_META_ENABLED) {
    app.use(injectSEOMeta);
    console.log('🔍 SEO meta tag injection middleware enabled');
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDev()) {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Add centralized error handler (must be last middleware)
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
