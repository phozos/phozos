// vite.config.ts
import { defineConfig } from "file:///home/runner/workspace/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import runtimeErrorOverlay from "file:///home/runner/workspace/node_modules/@replit/vite-plugin-runtime-error-modal/dist/index.mjs";
import viteImagemin from "file:///home/runner/workspace/node_modules/vite-plugin-imagemin/dist/index.mjs";

// server/config/index.ts
import dotenvFlow from "file:///home/runner/workspace/node_modules/dotenv-flow/lib/dotenv-flow.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "file:///home/runner/workspace/node_modules/zod/index.js";
var __vite_injected_original_import_meta_url = "file:///home/runner/workspace/server/config/index.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
dotenvFlow.config({
  path: resolve(__dirname, "../.."),
  silent: true,
  // Don't throw errors if files don't exist
  node_env: process.env.NODE_ENV || "development"
});
var booleanSchema = z.string().optional().transform((val) => {
  if (!val) return false;
  const normalized = val.toLowerCase().trim();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return false;
});
var commaSeparatedSchema = z.string().optional().transform((val) => {
  if (!val) return [];
  return val.split(",").map((item) => item.trim()).filter(Boolean);
});
var appConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().transform((val) => parseInt(val || "5000", 10))
}).transform((data) => ({
  ...data,
  isDevelopment: data.NODE_ENV === "development",
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test"
}));
var databaseConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});
var securityConfigSchema = z.object({
  JWT_SECRET: z.string().min(64, "JWT_SECRET must be at least 64 characters"),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be at least 32 characters"),
  CSRF_METRICS_ENABLED: booleanSchema,
  // Trust proxy configuration for secure IP detection
  // - false: Don't trust any proxy (direct connection)
  // - 1: Trust first proxy (most common: AWS, Heroku, etc.)
  // - number: Trust N proxies
  TRUST_PROXY: z.string().optional().transform((val) => {
    if (!val || val === "false" || val === "0") return false;
    if (val === "true") return 1;
    const num = parseInt(val, 10);
    return isNaN(num) ? 1 : num;
  })
});
var emailConfigSchema = z.object({
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional()
});
var adminConfigSchema = z.object({
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_IPS: commaSeparatedSchema,
  ADMIN_ALERT_EMAIL: z.string().email().optional()
});
var featuresConfigSchema = z.object({
  SEO_META_ENABLED: booleanSchema,
  FORCE_HTTPS_REDIRECT: booleanSchema,
  CANONICAL_URL_ENFORCEMENT: booleanSchema,
  MONITORING_ENABLED: booleanSchema,
  COMPLIANCE_REPORT_ENABLED: booleanSchema,
  ERROR_DETAILS_ENABLED: booleanSchema,
  ENABLE_USER_CANCELLATION_REQUESTS: booleanSchema,
  ENABLE_REFUND_SYSTEM: booleanSchema,
  ENABLE_DISPUTE_MANAGEMENT: booleanSchema,
  ENABLE_ADMIN_FORCE_REFUND: booleanSchema
});
var loggingConfigSchema = z.object({
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["pretty", "json"]).default("json"),
  LOG_FILE_ENABLED: booleanSchema
});
var corsConfigSchema = z.object({
  CORS_ENABLED: booleanSchema,
  CORS_MAX_AGE: z.string().optional().transform((val) => parseInt(val || "86400", 10)),
  ALLOWED_ORIGINS: commaSeparatedSchema
});
var cookiesConfigSchema = z.object({
  COOKIE_SECURE: booleanSchema,
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("lax"),
  COOKIE_MAX_AGE: z.string().optional().transform((val) => parseInt(val || "604800", 10)),
  // Default 7 days in seconds
  COOKIE_DOMAIN: z.string().optional()
});
var buildConfigSchema = z.object({
  // HMR should be enabled by default for good DX, disable only in prod or on Replit
  HMR_ENABLED: z.string().optional().transform((val) => {
    if (!val) return process.env.REPL_ID ? false : true;
    const normalized = val.toLowerCase().trim();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
    return true;
  }),
  IMAGE_OPTIMIZATION_ENABLED: booleanSchema,
  CARTOGRAPHER_ENABLED: z.string().optional().transform((val) => {
    if (!val) return process.env.REPL_ID !== void 0;
    const normalized = val.toLowerCase().trim();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
    return false;
  })
});
var razorpayConfigSchema = z.object({
  keyId: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  keySecret: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  webhookSecret: z.string().min(1, "RAZORPAY_WEBHOOK_SECRET is required"),
  /**
   * @deprecated As of November 2025
   * @reason IP whitelisting removed in favor of signature-only verification
   * @see WEBHOOK_IP_WHITELIST_REMOVAL_IMPLEMENTATION_PLAN.md
   * 
   * Kept for backward compatibility and rollback capability.
   * Not used in production webhook validation.
   */
  webhookIps: commaSeparatedSchema.transform((ips) => {
    if (ips.length === 0) {
      return ["3.7.71.51", "3.7.71.52", "3.7.71.53"];
    }
    return ips;
  })
});
var alertingConfigSchema = z.object({
  ENABLE_FAILED_PAYMENT_ALERTS: booleanSchema,
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal(""))
});
var configSchema = z.object({
  app: appConfigSchema,
  database: databaseConfigSchema,
  security: securityConfigSchema,
  email: emailConfigSchema,
  admin: adminConfigSchema,
  features: featuresConfigSchema,
  logging: loggingConfigSchema,
  cors: corsConfigSchema,
  cookies: cookiesConfigSchema,
  build: buildConfigSchema,
  razorpay: razorpayConfigSchema,
  alerting: alertingConfigSchema
});
function validateConfiguration() {
  try {
    const rawConfig = {
      app: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL
      },
      security: {
        JWT_SECRET: process.env.JWT_SECRET,
        CSRF_SECRET: process.env.CSRF_SECRET,
        CSRF_METRICS_ENABLED: process.env.CSRF_METRICS_ENABLED,
        TRUST_PROXY: process.env.TRUST_PROXY
      },
      email: {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL
      },
      admin: {
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        ADMIN_IPS: process.env.ADMIN_IPS,
        ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL
      },
      features: {
        SEO_META_ENABLED: process.env.SEO_META_ENABLED,
        FORCE_HTTPS_REDIRECT: process.env.FORCE_HTTPS_REDIRECT,
        CANONICAL_URL_ENFORCEMENT: process.env.CANONICAL_URL_ENFORCEMENT,
        MONITORING_ENABLED: process.env.MONITORING_ENABLED,
        COMPLIANCE_REPORT_ENABLED: process.env.COMPLIANCE_REPORT_ENABLED,
        ERROR_DETAILS_ENABLED: process.env.ERROR_DETAILS_ENABLED,
        ENABLE_USER_CANCELLATION_REQUESTS: process.env.ENABLE_USER_CANCELLATION_REQUESTS,
        ENABLE_REFUND_SYSTEM: process.env.ENABLE_REFUND_SYSTEM,
        ENABLE_DISPUTE_MANAGEMENT: process.env.ENABLE_DISPUTE_MANAGEMENT,
        ENABLE_ADMIN_FORCE_REFUND: process.env.ENABLE_ADMIN_FORCE_REFUND
      },
      logging: {
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FORMAT: process.env.LOG_FORMAT,
        LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED
      },
      cors: {
        CORS_ENABLED: process.env.CORS_ENABLED,
        CORS_MAX_AGE: process.env.CORS_MAX_AGE,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
      },
      cookies: {
        COOKIE_SECURE: process.env.COOKIE_SECURE,
        COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
        COOKIE_MAX_AGE: process.env.COOKIE_MAX_AGE,
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
      },
      build: {
        HMR_ENABLED: process.env.HMR_ENABLED,
        IMAGE_OPTIMIZATION_ENABLED: process.env.IMAGE_OPTIMIZATION_ENABLED,
        CARTOGRAPHER_ENABLED: process.env.CARTOGRAPHER_ENABLED
      },
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
        webhookIps: process.env.RAZORPAY_WEBHOOK_IPS
      },
      alerting: {
        ENABLE_FAILED_PAYMENT_ALERTS: process.env.ENABLE_FAILED_PAYMENT_ALERTS,
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL
      }
    };
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("\n\u274C Configuration Validation Failed\n");
      console.error("The following environment variables are missing or invalid:\n");
      const errorsBySection = {};
      for (const issue of error.errors) {
        const section = issue.path[0];
        const field = issue.path.slice(1).join(".");
        const message = issue.message;
        if (!errorsBySection[section]) {
          errorsBySection[section] = [];
        }
        errorsBySection[section].push(`  \u2022 ${field}: ${message}`);
      }
      for (const [section, errors] of Object.entries(errorsBySection)) {
        console.error(`[${section.toUpperCase()}]`);
        errors.forEach((err) => console.error(err));
        console.error("");
      }
      console.error("Please check your .env file and ensure all required variables are set correctly.");
      console.error("Refer to .env.example for the expected format.\n");
      process.exit(1);
    }
    throw error;
  }
}
var validatedConfig = validateConfiguration();
var config = validatedConfig;
var appConfig = config.app;
var databaseConfig = config.database;
var securityConfig = config.security;
var emailConfig = config.email;
var adminConfig = config.admin;
var featuresConfig = config.features;
var loggingConfig = config.logging;
var corsConfig = config.cors;
var cookiesConfig = config.cookies;
var buildConfig = config.build;
var razorpayConfig = config.razorpay;
var alertingConfig = config.alerting;

// vite.config.ts
var __vite_injected_original_dirname = "/home/runner/workspace";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...buildConfig.CARTOGRAPHER_ENABLED ? [
      await import("file:///home/runner/workspace/node_modules/@replit/vite-plugin-cartographer/dist/index.mjs").then(
        (m) => m.cartographer()
      )
    ] : [],
    // Image optimization - only runs during production builds to keep dev builds fast
    // Reduces image file sizes by 30-50% and improves Core Web Vitals (LCP, CLS)
    ...buildConfig.IMAGE_OPTIMIZATION_ENABLED ? [
      viteImagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false
        },
        optipng: {
          optimizationLevel: 7
        },
        mozjpeg: {
          quality: 80
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4
        },
        svgo: {
          plugins: [
            {
              name: "removeViewBox",
              active: false
            }
          ]
        },
        webp: {
          quality: 85
        }
      })
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "client", "src"),
      "@shared": path.resolve(__vite_injected_original_dirname, "shared"),
      "@assets": path.resolve(__vite_injected_original_dirname, "attached_assets")
    }
  },
  root: path.resolve(__vite_injected_original_dirname, "client"),
  publicDir: "public",
  build: {
    outDir: path.resolve(__vite_injected_original_dirname, "dist/public"),
    emptyOutDir: true,
    copyPublicDir: true,
    sourcemap: false,
    // Code splitting optimization for better LCP and FID
    // Manual chunking reduces initial bundle size and improves load performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - loaded on every page
          "vendor": ["react", "react-dom"],
          // UI component libraries - lazy loaded when needed
          "ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select"
          ],
          // Data fetching library - used across most features
          "query": ["@tanstack/react-query"]
        }
      },
      onwarn(warning, warn) {
        if (warning.code === "SOURCEMAP_ERROR") return;
        warn(warning);
      }
    }
  },
  esbuild: {
    logLevel: "error",
    logOverride: {
      "unsupported-source-map-comment": "silent"
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    // HMR and WebSocket configuration - disable when HMR_ENABLED is false
    ...buildConfig.HMR_ENABLED ? {} : { hmr: false, ws: false }
  },
  // Disable client-side refresh in Replit environment
  ...process.env.REPL_ID && {
    define: {
      "import.meta.hot": "undefined"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2VydmVyL2NvbmZpZy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHJ1bnRpbWVFcnJvck92ZXJsYXkgZnJvbSBcIkByZXBsaXQvdml0ZS1wbHVnaW4tcnVudGltZS1lcnJvci1tb2RhbFwiO1xuaW1wb3J0IHZpdGVJbWFnZW1pbiBmcm9tIFwidml0ZS1wbHVnaW4taW1hZ2VtaW5cIjtcbmltcG9ydCB7IGJ1aWxkQ29uZmlnIH0gZnJvbSBcIi4vc2VydmVyL2NvbmZpZy9pbmRleC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBydW50aW1lRXJyb3JPdmVybGF5KCksXG4gICAgLi4uKGJ1aWxkQ29uZmlnLkNBUlRPR1JBUEhFUl9FTkFCTEVEXG4gICAgICA/IFtcbiAgICAgICAgICBhd2FpdCBpbXBvcnQoXCJAcmVwbGl0L3ZpdGUtcGx1Z2luLWNhcnRvZ3JhcGhlclwiKS50aGVuKChtKSA9PlxuICAgICAgICAgICAgbS5jYXJ0b2dyYXBoZXIoKSxcbiAgICAgICAgICApLFxuICAgICAgICBdXG4gICAgICA6IFtdKSxcbiAgICAvLyBJbWFnZSBvcHRpbWl6YXRpb24gLSBvbmx5IHJ1bnMgZHVyaW5nIHByb2R1Y3Rpb24gYnVpbGRzIHRvIGtlZXAgZGV2IGJ1aWxkcyBmYXN0XG4gICAgLy8gUmVkdWNlcyBpbWFnZSBmaWxlIHNpemVzIGJ5IDMwLTUwJSBhbmQgaW1wcm92ZXMgQ29yZSBXZWIgVml0YWxzIChMQ1AsIENMUylcbiAgICAuLi4oYnVpbGRDb25maWcuSU1BR0VfT1BUSU1JWkFUSU9OX0VOQUJMRURcbiAgICAgID8gW1xuICAgICAgICAgIHZpdGVJbWFnZW1pbih7XG4gICAgICAgICAgICBnaWZzaWNsZToge1xuICAgICAgICAgICAgICBvcHRpbWl6YXRpb25MZXZlbDogNyxcbiAgICAgICAgICAgICAgaW50ZXJsYWNlZDogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3B0aXBuZzoge1xuICAgICAgICAgICAgICBvcHRpbWl6YXRpb25MZXZlbDogNyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtb3pqcGVnOiB7XG4gICAgICAgICAgICAgIHF1YWxpdHk6IDgwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBuZ3F1YW50OiB7XG4gICAgICAgICAgICAgIHF1YWxpdHk6IFswLjgsIDAuOV0sXG4gICAgICAgICAgICAgIHNwZWVkOiA0LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN2Z286IHtcbiAgICAgICAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6ICdyZW1vdmVWaWV3Qm94JyxcbiAgICAgICAgICAgICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3ZWJwOiB7XG4gICAgICAgICAgICAgIHF1YWxpdHk6IDg1LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXVxuICAgICAgOiBbXSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImNsaWVudFwiLCBcInNyY1wiKSxcbiAgICAgIFwiQHNoYXJlZFwiOiBwYXRoLnJlc29sdmUoaW1wb3J0Lm1ldGEuZGlybmFtZSwgXCJzaGFyZWRcIiksXG4gICAgICBcIkBhc3NldHNcIjogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwiYXR0YWNoZWRfYXNzZXRzXCIpLFxuICAgIH0sXG4gIH0sXG4gIHJvb3Q6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImNsaWVudFwiKSxcbiAgcHVibGljRGlyOiAncHVibGljJyxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcImRpc3QvcHVibGljXCIpLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIGNvcHlQdWJsaWNEaXI6IHRydWUsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAvLyBDb2RlIHNwbGl0dGluZyBvcHRpbWl6YXRpb24gZm9yIGJldHRlciBMQ1AgYW5kIEZJRFxuICAgIC8vIE1hbnVhbCBjaHVua2luZyByZWR1Y2VzIGluaXRpYWwgYnVuZGxlIHNpemUgYW5kIGltcHJvdmVzIGxvYWQgcGVyZm9ybWFuY2VcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gQ29yZSBSZWFjdCBsaWJyYXJpZXMgLSBsb2FkZWQgb24gZXZlcnkgcGFnZVxuICAgICAgICAgICd2ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgIC8vIFVJIGNvbXBvbmVudCBsaWJyYXJpZXMgLSBsYXp5IGxvYWRlZCB3aGVuIG5lZWRlZFxuICAgICAgICAgICd1aSc6IFtcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnXG4gICAgICAgICAgXSxcbiAgICAgICAgICAvLyBEYXRhIGZldGNoaW5nIGxpYnJhcnkgLSB1c2VkIGFjcm9zcyBtb3N0IGZlYXR1cmVzXG4gICAgICAgICAgJ3F1ZXJ5JzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgb253YXJuKHdhcm5pbmcsIHdhcm4pIHtcbiAgICAgICAgLy8gU3VwcHJlc3Mgc291cmNlIG1hcCB3YXJuaW5nc1xuICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSAnU09VUkNFTUFQX0VSUk9SJykgcmV0dXJuO1xuICAgICAgICB3YXJuKHdhcm5pbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZXNidWlsZDoge1xuICAgIGxvZ0xldmVsOiAnZXJyb3InLFxuICAgIGxvZ092ZXJyaWRlOiB7XG4gICAgICAndW5zdXBwb3J0ZWQtc291cmNlLW1hcC1jb21tZW50JzogJ3NpbGVudCdcbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxuICAgIHBvcnQ6IDUwMDAsXG4gICAgZnM6IHtcbiAgICAgIHN0cmljdDogdHJ1ZSxcbiAgICAgIGRlbnk6IFtcIioqLy4qXCJdLFxuICAgIH0sXG4gICAgLy8gSE1SIGFuZCBXZWJTb2NrZXQgY29uZmlndXJhdGlvbiAtIGRpc2FibGUgd2hlbiBITVJfRU5BQkxFRCBpcyBmYWxzZVxuICAgIC4uLihidWlsZENvbmZpZy5ITVJfRU5BQkxFRCA/IHt9IDogeyBobXI6IGZhbHNlLCB3czogZmFsc2UgfSksXG4gIH0sXG4gIC8vIERpc2FibGUgY2xpZW50LXNpZGUgcmVmcmVzaCBpbiBSZXBsaXQgZW52aXJvbm1lbnRcbiAgLi4uKHByb2Nlc3MuZW52LlJFUExfSUQgJiYge1xuICAgIGRlZmluZToge1xuICAgICAgJ2ltcG9ydC5tZXRhLmhvdCc6ICd1bmRlZmluZWQnLFxuICAgIH0sXG4gIH0pLFxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL2NvbmZpZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvY29uZmlnL2luZGV4LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL2NvbmZpZy9pbmRleC50c1wiOy8qKlxuICogUHJvZHVjdGlvbi1SZWFkeSBDb25maWd1cmF0aW9uIE1vZHVsZVxuICogXG4gKiBQcm92aWRlcyBjZW50cmFsaXplZCwgdHlwZS1zYWZlIGNvbmZpZ3VyYXRpb24gbWFuYWdlbWVudCB3aXRoOlxuICogLSBMYXllcmVkIGVudmlyb25tZW50IHZhcmlhYmxlIGxvYWRpbmcgKC5lbnYsIC5lbnYubG9jYWwsIC5lbnYuZGV2ZWxvcG1lbnQsIC5lbnYucHJvZHVjdGlvbilcbiAqIC0gWm9kIHNjaGVtYSB2YWxpZGF0aW9uIHdpdGggY29tcHJlaGVuc2l2ZSBlcnJvciByZXBvcnRpbmdcbiAqIC0gVHlwZS1zYWZlIGV4cG9ydHMgd2l0aCBubyAnYW55JyB0eXBlc1xuICogLSBIZWxwZXIgZnVuY3Rpb25zIGZvciBlbnZpcm9ubWVudCBkZXRlY3Rpb25cbiAqIC0gU2Vuc2libGUgZGVmYXVsdHMgYW5kIHByb3BlciB0eXBlIGNvZXJjaW9uXG4gKiBcbiAqIEBtb2R1bGUgY29uZmlnXG4gKi9cblxuaW1wb3J0IGRvdGVudkZsb3cgZnJvbSAnZG90ZW52LWZsb3cnO1xuaW1wb3J0IHsgcmVzb2x2ZSwgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcblxuLy8gR2V0IF9fZGlybmFtZSBlcXVpdmFsZW50IGluIEVTIG1vZHVsZXNcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG4vKipcbiAqIExvYWQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpdGggYXV0b21hdGljIGxheWVyZWQgY29uZmlndXJhdGlvbiBzdXBwb3J0IHZpYSBkb3RlbnYtZmxvd1xuICogXG4gKiBMb2FkaW5nIG9yZGVyIChsYXRlciBmaWxlcyBvdmVycmlkZSBlYXJsaWVyIG9uZXMpOlxuICogMS4gLmVudiAoY29tbWl0dGVkIGRlZmF1bHRzKVxuICogMi4gLmVudi5sb2NhbCAobG9jYWwgb3ZlcnJpZGVzLCBnaXRpZ25vcmVkKVxuICogMy4gLmVudi57Tk9ERV9FTlZ9IChlbnZpcm9ubWVudC1zcGVjaWZpYywgZS5nLiwgLmVudi5kZXZlbG9wbWVudCwgLmVudi5wcm9kdWN0aW9uKVxuICogNC4gLmVudi57Tk9ERV9FTlZ9LmxvY2FsIChlbnZpcm9ubWVudC1zcGVjaWZpYyBsb2NhbCBvdmVycmlkZXMsIGdpdGlnbm9yZWQpXG4gKiBcbiAqIGRvdGVudi1mbG93IGF1dG9tYXRpY2FsbHkgaGFuZGxlcyB0aGlzIGxheWVyaW5nIGFuZCByZXNwZWN0cyB0aGUgTk9ERV9FTlYgdmFyaWFibGUuXG4gKi9cbmRvdGVudkZsb3cuY29uZmlnKHtcbiAgcGF0aDogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpLFxuICBzaWxlbnQ6IHRydWUsIC8vIERvbid0IHRocm93IGVycm9ycyBpZiBmaWxlcyBkb24ndCBleGlzdFxuICBub2RlX2VudjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50Jyxcbn0pO1xuXG4vKipcbiAqIEhlbHBlciB0byBwYXJzZSBib29sZWFuIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQWNjZXB0czogJ3RydWUnLCAnMScsICd5ZXMnIGFzIHRydWU7ICdmYWxzZScsICcwJywgJ25vJyBhcyBmYWxzZVxuICovXG5jb25zdCBib29sZWFuU2NoZW1hID0gelxuICAuc3RyaW5nKClcbiAgLm9wdGlvbmFsKClcbiAgLnRyYW5zZm9ybSgodmFsKSA9PiB7XG4gICAgaWYgKCF2YWwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBub3JtYWxpemVkID0gdmFsLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgIGlmIChbJ3RydWUnLCAnMScsICd5ZXMnXS5pbmNsdWRlcyhub3JtYWxpemVkKSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKFsnZmFsc2UnLCAnMCcsICdubyddLmluY2x1ZGVzKG5vcm1hbGl6ZWQpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuLyoqXG4gKiBIZWxwZXIgdG8gcGFyc2UgY29tbWEtc2VwYXJhdGVkIHN0cmluZyBsaXN0c1xuICovXG5jb25zdCBjb21tYVNlcGFyYXRlZFNjaGVtYSA9IHpcbiAgLnN0cmluZygpXG4gIC5vcHRpb25hbCgpXG4gIC50cmFuc2Zvcm0oKHZhbCkgPT4ge1xuICAgIGlmICghdmFsKSByZXR1cm4gW107XG4gICAgcmV0dXJuIHZhbC5zcGxpdCgnLCcpLm1hcCgoaXRlbSkgPT4gaXRlbS50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcbiAgfSk7XG5cbi8qKlxuICogQXBwbGljYXRpb24gY29uZmlndXJhdGlvbiBzY2hlbWFcbiAqL1xuY29uc3QgYXBwQ29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBOT0RFX0VOVjogei5lbnVtKFsnZGV2ZWxvcG1lbnQnLCAncHJvZHVjdGlvbicsICd0ZXN0J10pLmRlZmF1bHQoJ2RldmVsb3BtZW50JyksXG4gIFBPUlQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKS50cmFuc2Zvcm0oKHZhbCkgPT4gcGFyc2VJbnQodmFsIHx8ICc1MDAwJywgMTApKSxcbn0pLnRyYW5zZm9ybSgoZGF0YSkgPT4gKHtcbiAgLi4uZGF0YSxcbiAgaXNEZXZlbG9wbWVudDogZGF0YS5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyxcbiAgaXNQcm9kdWN0aW9uOiBkYXRhLk5PREVfRU5WID09PSAncHJvZHVjdGlvbicsXG4gIGlzVGVzdDogZGF0YS5OT0RFX0VOViA9PT0gJ3Rlc3QnLFxufSkpO1xuXG4vKipcbiAqIERhdGFiYXNlIGNvbmZpZ3VyYXRpb24gc2NoZW1hXG4gKi9cbmNvbnN0IGRhdGFiYXNlQ29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBEQVRBQkFTRV9VUkw6IHouc3RyaW5nKCkubWluKDEsICdEQVRBQkFTRV9VUkwgaXMgcmVxdWlyZWQnKSxcbn0pO1xuXG4vKipcbiAqIFNlY3VyaXR5IGNvbmZpZ3VyYXRpb24gc2NoZW1hXG4gKi9cbmNvbnN0IHNlY3VyaXR5Q29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBKV1RfU0VDUkVUOiB6LnN0cmluZygpLm1pbig2NCwgJ0pXVF9TRUNSRVQgbXVzdCBiZSBhdCBsZWFzdCA2NCBjaGFyYWN0ZXJzJyksXG4gIENTUkZfU0VDUkVUOiB6LnN0cmluZygpLm1pbigzMiwgJ0NTUkZfU0VDUkVUIG11c3QgYmUgYXQgbGVhc3QgMzIgY2hhcmFjdGVycycpLFxuICBDU1JGX01FVFJJQ1NfRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbiAgLy8gVHJ1c3QgcHJveHkgY29uZmlndXJhdGlvbiBmb3Igc2VjdXJlIElQIGRldGVjdGlvblxuICAvLyAtIGZhbHNlOiBEb24ndCB0cnVzdCBhbnkgcHJveHkgKGRpcmVjdCBjb25uZWN0aW9uKVxuICAvLyAtIDE6IFRydXN0IGZpcnN0IHByb3h5IChtb3N0IGNvbW1vbjogQVdTLCBIZXJva3UsIGV0Yy4pXG4gIC8vIC0gbnVtYmVyOiBUcnVzdCBOIHByb3hpZXNcbiAgVFJVU1RfUFJPWFk6IHpcbiAgICAuc3RyaW5nKClcbiAgICAub3B0aW9uYWwoKVxuICAgIC50cmFuc2Zvcm0oKHZhbCkgPT4ge1xuICAgICAgaWYgKCF2YWwgfHwgdmFsID09PSAnZmFsc2UnIHx8IHZhbCA9PT0gJzAnKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAodmFsID09PSAndHJ1ZScpIHJldHVybiAxOyAvLyBDb252ZXJ0ICd0cnVlJyB0byBzYWZlIHZhbHVlIG9mIDFcbiAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgcmV0dXJuIGlzTmFOKG51bSkgPyAxIDogbnVtOyAvLyBEZWZhdWx0IHRvIDEgaWYgaW52YWxpZFxuICAgIH0pLFxufSk7XG5cbi8qKlxuICogRW1haWwgY29uZmlndXJhdGlvbiBzY2hlbWFcbiAqL1xuY29uc3QgZW1haWxDb25maWdTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIFNFTkRHUklEX0FQSV9LRVk6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgU0VOREdSSURfRlJPTV9FTUFJTDogei5zdHJpbmcoKS5lbWFpbCgpLm9wdGlvbmFsKCksXG59KTtcblxuLyoqXG4gKiBBZG1pbiBjb25maWd1cmF0aW9uIHNjaGVtYVxuICovXG5jb25zdCBhZG1pbkNvbmZpZ1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgQURNSU5fUEFTU1dPUkQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgQURNSU5fSVBTOiBjb21tYVNlcGFyYXRlZFNjaGVtYSxcbiAgQURNSU5fQUxFUlRfRU1BSUw6IHouc3RyaW5nKCkuZW1haWwoKS5vcHRpb25hbCgpLFxufSk7XG5cbi8qKlxuICogRmVhdHVyZSBmbGFncyBjb25maWd1cmF0aW9uIHNjaGVtYVxuICovXG5jb25zdCBmZWF0dXJlc0NvbmZpZ1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgU0VPX01FVEFfRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbiAgRk9SQ0VfSFRUUFNfUkVESVJFQ1Q6IGJvb2xlYW5TY2hlbWEsXG4gIENBTk9OSUNBTF9VUkxfRU5GT1JDRU1FTlQ6IGJvb2xlYW5TY2hlbWEsXG4gIE1PTklUT1JJTkdfRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbiAgQ09NUExJQU5DRV9SRVBPUlRfRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbiAgRVJST1JfREVUQUlMU19FTkFCTEVEOiBib29sZWFuU2NoZW1hLFxuICBFTkFCTEVfVVNFUl9DQU5DRUxMQVRJT05fUkVRVUVTVFM6IGJvb2xlYW5TY2hlbWEsXG4gIEVOQUJMRV9SRUZVTkRfU1lTVEVNOiBib29sZWFuU2NoZW1hLFxuICBFTkFCTEVfRElTUFVURV9NQU5BR0VNRU5UOiBib29sZWFuU2NoZW1hLFxuICBFTkFCTEVfQURNSU5fRk9SQ0VfUkVGVU5EOiBib29sZWFuU2NoZW1hLFxufSk7XG5cbi8qKlxuICogTG9nZ2luZyBjb25maWd1cmF0aW9uIHNjaGVtYVxuICovXG5jb25zdCBsb2dnaW5nQ29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBMT0dfTEVWRUw6IHouZW51bShbJ2Vycm9yJywgJ3dhcm4nLCAnaW5mbycsICdkZWJ1ZyddKS5kZWZhdWx0KCdpbmZvJyksXG4gIExPR19GT1JNQVQ6IHouZW51bShbJ3ByZXR0eScsICdqc29uJ10pLmRlZmF1bHQoJ2pzb24nKSxcbiAgTE9HX0ZJTEVfRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbn0pO1xuXG4vKipcbiAqIENPUlMgY29uZmlndXJhdGlvbiBzY2hlbWFcbiAqL1xuY29uc3QgY29yc0NvbmZpZ1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgQ09SU19FTkFCTEVEOiBib29sZWFuU2NoZW1hLFxuICBDT1JTX01BWF9BR0U6IHouc3RyaW5nKCkub3B0aW9uYWwoKS50cmFuc2Zvcm0oKHZhbCkgPT4gcGFyc2VJbnQodmFsIHx8ICc4NjQwMCcsIDEwKSksXG4gIEFMTE9XRURfT1JJR0lOUzogY29tbWFTZXBhcmF0ZWRTY2hlbWEsXG59KTtcblxuLyoqXG4gKiBDb29raWUgY29uZmlndXJhdGlvbiBzY2hlbWEgKFBoYXNlIDM6IEh0dHBPbmx5IENvb2tpZXMpXG4gKi9cbmNvbnN0IGNvb2tpZXNDb25maWdTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIENPT0tJRV9TRUNVUkU6IGJvb2xlYW5TY2hlbWEsXG4gIENPT0tJRV9TQU1FU0lURTogei5lbnVtKFsnc3RyaWN0JywgJ2xheCcsICdub25lJ10pLmRlZmF1bHQoJ2xheCcpLFxuICBDT09LSUVfTUFYX0FHRTogei5zdHJpbmcoKS5vcHRpb25hbCgpLnRyYW5zZm9ybSgodmFsKSA9PiBwYXJzZUludCh2YWwgfHwgJzYwNDgwMCcsIDEwKSksIC8vIERlZmF1bHQgNyBkYXlzIGluIHNlY29uZHNcbiAgQ09PS0lFX0RPTUFJTjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxufSk7XG5cbi8qKlxuICogQnVpbGQgY29uZmlndXJhdGlvbiBzY2hlbWFcbiAqIENvbnRyb2xzIFZpdGUgYnVpbGQtdGltZSBhbmQgZGV2ZWxvcG1lbnQgZmVhdHVyZXNcbiAqL1xuY29uc3QgYnVpbGRDb25maWdTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIC8vIEhNUiBzaG91bGQgYmUgZW5hYmxlZCBieSBkZWZhdWx0IGZvciBnb29kIERYLCBkaXNhYmxlIG9ubHkgaW4gcHJvZCBvciBvbiBSZXBsaXRcbiAgSE1SX0VOQUJMRUQ6IHpcbiAgICAuc3RyaW5nKClcbiAgICAub3B0aW9uYWwoKVxuICAgIC50cmFuc2Zvcm0oKHZhbCkgPT4ge1xuICAgICAgaWYgKCF2YWwpIHJldHVybiBwcm9jZXNzLmVudi5SRVBMX0lEID8gZmFsc2UgOiB0cnVlOyAvLyBEZWZhdWx0IHRydWUsIGZhbHNlIG9uIFJlcGxpdFxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IHZhbC50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICAgIGlmIChbJ3RydWUnLCAnMScsICd5ZXMnXS5pbmNsdWRlcyhub3JtYWxpemVkKSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoWydmYWxzZScsICcwJywgJ25vJ10uaW5jbHVkZXMobm9ybWFsaXplZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pLFxuICBJTUFHRV9PUFRJTUlaQVRJT05fRU5BQkxFRDogYm9vbGVhblNjaGVtYSxcbiAgQ0FSVE9HUkFQSEVSX0VOQUJMRUQ6IHpcbiAgICAuc3RyaW5nKClcbiAgICAub3B0aW9uYWwoKVxuICAgIC50cmFuc2Zvcm0oKHZhbCkgPT4ge1xuICAgICAgaWYgKCF2YWwpIHJldHVybiBwcm9jZXNzLmVudi5SRVBMX0lEICE9PSB1bmRlZmluZWQ7IC8vIEF1dG8tZW5hYmxlIG9uIFJlcGxpdFxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IHZhbC50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICAgIGlmIChbJ3RydWUnLCAnMScsICd5ZXMnXS5pbmNsdWRlcyhub3JtYWxpemVkKSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoWydmYWxzZScsICcwJywgJ25vJ10uaW5jbHVkZXMobm9ybWFsaXplZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KSxcbn0pO1xuXG4vKipcbiAqIFJhem9ycGF5IGNvbmZpZ3VyYXRpb24gc2NoZW1hXG4gKi9cbmNvbnN0IHJhem9ycGF5Q29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBrZXlJZDogei5zdHJpbmcoKS5taW4oMSwgJ1JBWk9SUEFZX0tFWV9JRCBpcyByZXF1aXJlZCcpLFxuICBrZXlTZWNyZXQ6IHouc3RyaW5nKCkubWluKDEsICdSQVpPUlBBWV9LRVlfU0VDUkVUIGlzIHJlcXVpcmVkJyksXG4gIHdlYmhvb2tTZWNyZXQ6IHouc3RyaW5nKCkubWluKDEsICdSQVpPUlBBWV9XRUJIT09LX1NFQ1JFVCBpcyByZXF1aXJlZCcpLFxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgQXMgb2YgTm92ZW1iZXIgMjAyNVxuICAgKiBAcmVhc29uIElQIHdoaXRlbGlzdGluZyByZW1vdmVkIGluIGZhdm9yIG9mIHNpZ25hdHVyZS1vbmx5IHZlcmlmaWNhdGlvblxuICAgKiBAc2VlIFdFQkhPT0tfSVBfV0hJVEVMSVNUX1JFTU9WQUxfSU1QTEVNRU5UQVRJT05fUExBTi5tZFxuICAgKiBcbiAgICogS2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBhbmQgcm9sbGJhY2sgY2FwYWJpbGl0eS5cbiAgICogTm90IHVzZWQgaW4gcHJvZHVjdGlvbiB3ZWJob29rIHZhbGlkYXRpb24uXG4gICAqL1xuICB3ZWJob29rSXBzOiBjb21tYVNlcGFyYXRlZFNjaGVtYS50cmFuc2Zvcm0oKGlwcykgPT4ge1xuICAgIC8vIERlZmF1bHQgdG8gUmF6b3JwYXkncyBvZmZpY2lhbCB3ZWJob29rIElQIGFkZHJlc3NlcyBpZiBub3QgY29uZmlndXJlZFxuICAgIGlmIChpcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gWyczLjcuNzEuNTEnLCAnMy43LjcxLjUyJywgJzMuNy43MS41MyddO1xuICAgIH1cbiAgICByZXR1cm4gaXBzO1xuICB9KSxcbn0pO1xuXG4vKipcbiAqIEFsZXJ0aW5nIGNvbmZpZ3VyYXRpb24gc2NoZW1hXG4gKi9cbmNvbnN0IGFsZXJ0aW5nQ29uZmlnU2NoZW1hID0gei5vYmplY3Qoe1xuICBFTkFCTEVfRkFJTEVEX1BBWU1FTlRfQUxFUlRTOiBib29sZWFuU2NoZW1hLFxuICBTTEFDS19XRUJIT09LX1VSTDogei5zdHJpbmcoKS51cmwoKS5vcHRpb25hbCgpLm9yKHoubGl0ZXJhbCgnJykpLFxufSk7XG5cbi8qKlxuICogQ29tcGxldGUgY29uZmlndXJhdGlvbiBzY2hlbWEgY29tYmluaW5nIGFsbCBzZWN0aW9uc1xuICovXG5jb25zdCBjb25maWdTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGFwcDogYXBwQ29uZmlnU2NoZW1hLFxuICBkYXRhYmFzZTogZGF0YWJhc2VDb25maWdTY2hlbWEsXG4gIHNlY3VyaXR5OiBzZWN1cml0eUNvbmZpZ1NjaGVtYSxcbiAgZW1haWw6IGVtYWlsQ29uZmlnU2NoZW1hLFxuICBhZG1pbjogYWRtaW5Db25maWdTY2hlbWEsXG4gIGZlYXR1cmVzOiBmZWF0dXJlc0NvbmZpZ1NjaGVtYSxcbiAgbG9nZ2luZzogbG9nZ2luZ0NvbmZpZ1NjaGVtYSxcbiAgY29yczogY29yc0NvbmZpZ1NjaGVtYSxcbiAgY29va2llczogY29va2llc0NvbmZpZ1NjaGVtYSxcbiAgYnVpbGQ6IGJ1aWxkQ29uZmlnU2NoZW1hLFxuICByYXpvcnBheTogcmF6b3JwYXlDb25maWdTY2hlbWEsXG4gIGFsZXJ0aW5nOiBhbGVydGluZ0NvbmZpZ1NjaGVtYSxcbn0pO1xuXG4vKipcbiAqIFZhbGlkYXRlIGFuZCBwYXJzZSBjb25maWd1cmF0aW9uIHdpdGggY29tcHJlaGVuc2l2ZSBlcnJvciByZXBvcnRpbmdcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVDb25maWd1cmF0aW9uKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHJhd0NvbmZpZyA9IHtcbiAgICAgIGFwcDoge1xuICAgICAgICBOT0RFX0VOVjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYsXG4gICAgICAgIFBPUlQ6IHByb2Nlc3MuZW52LlBPUlQsXG4gICAgICB9LFxuICAgICAgZGF0YWJhc2U6IHtcbiAgICAgICAgREFUQUJBU0VfVVJMOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwsXG4gICAgICB9LFxuICAgICAgc2VjdXJpdHk6IHtcbiAgICAgICAgSldUX1NFQ1JFVDogcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVCxcbiAgICAgICAgQ1NSRl9TRUNSRVQ6IHByb2Nlc3MuZW52LkNTUkZfU0VDUkVULFxuICAgICAgICBDU1JGX01FVFJJQ1NfRU5BQkxFRDogcHJvY2Vzcy5lbnYuQ1NSRl9NRVRSSUNTX0VOQUJMRUQsXG4gICAgICAgIFRSVVNUX1BST1hZOiBwcm9jZXNzLmVudi5UUlVTVF9QUk9YWSxcbiAgICAgIH0sXG4gICAgICBlbWFpbDoge1xuICAgICAgICBTRU5ER1JJRF9BUElfS0VZOiBwcm9jZXNzLmVudi5TRU5ER1JJRF9BUElfS0VZLFxuICAgICAgICBTRU5ER1JJRF9GUk9NX0VNQUlMOiBwcm9jZXNzLmVudi5TRU5ER1JJRF9GUk9NX0VNQUlMLFxuICAgICAgfSxcbiAgICAgIGFkbWluOiB7XG4gICAgICAgIEFETUlOX1BBU1NXT1JEOiBwcm9jZXNzLmVudi5BRE1JTl9QQVNTV09SRCxcbiAgICAgICAgQURNSU5fSVBTOiBwcm9jZXNzLmVudi5BRE1JTl9JUFMsXG4gICAgICAgIEFETUlOX0FMRVJUX0VNQUlMOiBwcm9jZXNzLmVudi5BRE1JTl9BTEVSVF9FTUFJTCxcbiAgICAgIH0sXG4gICAgICBmZWF0dXJlczoge1xuICAgICAgICBTRU9fTUVUQV9FTkFCTEVEOiBwcm9jZXNzLmVudi5TRU9fTUVUQV9FTkFCTEVELFxuICAgICAgICBGT1JDRV9IVFRQU19SRURJUkVDVDogcHJvY2Vzcy5lbnYuRk9SQ0VfSFRUUFNfUkVESVJFQ1QsXG4gICAgICAgIENBTk9OSUNBTF9VUkxfRU5GT1JDRU1FTlQ6IHByb2Nlc3MuZW52LkNBTk9OSUNBTF9VUkxfRU5GT1JDRU1FTlQsXG4gICAgICAgIE1PTklUT1JJTkdfRU5BQkxFRDogcHJvY2Vzcy5lbnYuTU9OSVRPUklOR19FTkFCTEVELFxuICAgICAgICBDT01QTElBTkNFX1JFUE9SVF9FTkFCTEVEOiBwcm9jZXNzLmVudi5DT01QTElBTkNFX1JFUE9SVF9FTkFCTEVELFxuICAgICAgICBFUlJPUl9ERVRBSUxTX0VOQUJMRUQ6IHByb2Nlc3MuZW52LkVSUk9SX0RFVEFJTFNfRU5BQkxFRCxcbiAgICAgICAgRU5BQkxFX1VTRVJfQ0FOQ0VMTEFUSU9OX1JFUVVFU1RTOiBwcm9jZXNzLmVudi5FTkFCTEVfVVNFUl9DQU5DRUxMQVRJT05fUkVRVUVTVFMsXG4gICAgICAgIEVOQUJMRV9SRUZVTkRfU1lTVEVNOiBwcm9jZXNzLmVudi5FTkFCTEVfUkVGVU5EX1NZU1RFTSxcbiAgICAgICAgRU5BQkxFX0RJU1BVVEVfTUFOQUdFTUVOVDogcHJvY2Vzcy5lbnYuRU5BQkxFX0RJU1BVVEVfTUFOQUdFTUVOVCxcbiAgICAgICAgRU5BQkxFX0FETUlOX0ZPUkNFX1JFRlVORDogcHJvY2Vzcy5lbnYuRU5BQkxFX0FETUlOX0ZPUkNFX1JFRlVORCxcbiAgICAgIH0sXG4gICAgICBsb2dnaW5nOiB7XG4gICAgICAgIExPR19MRVZFTDogcHJvY2Vzcy5lbnYuTE9HX0xFVkVMLFxuICAgICAgICBMT0dfRk9STUFUOiBwcm9jZXNzLmVudi5MT0dfRk9STUFULFxuICAgICAgICBMT0dfRklMRV9FTkFCTEVEOiBwcm9jZXNzLmVudi5MT0dfRklMRV9FTkFCTEVELFxuICAgICAgfSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgQ09SU19FTkFCTEVEOiBwcm9jZXNzLmVudi5DT1JTX0VOQUJMRUQsXG4gICAgICAgIENPUlNfTUFYX0FHRTogcHJvY2Vzcy5lbnYuQ09SU19NQVhfQUdFLFxuICAgICAgICBBTExPV0VEX09SSUdJTlM6IHByb2Nlc3MuZW52LkFMTE9XRURfT1JJR0lOUyxcbiAgICAgIH0sXG4gICAgICBjb29raWVzOiB7XG4gICAgICAgIENPT0tJRV9TRUNVUkU6IHByb2Nlc3MuZW52LkNPT0tJRV9TRUNVUkUsXG4gICAgICAgIENPT0tJRV9TQU1FU0lURTogcHJvY2Vzcy5lbnYuQ09PS0lFX1NBTUVTSVRFLFxuICAgICAgICBDT09LSUVfTUFYX0FHRTogcHJvY2Vzcy5lbnYuQ09PS0lFX01BWF9BR0UsXG4gICAgICAgIENPT0tJRV9ET01BSU46IHByb2Nlc3MuZW52LkNPT0tJRV9ET01BSU4sXG4gICAgICB9LFxuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgSE1SX0VOQUJMRUQ6IHByb2Nlc3MuZW52LkhNUl9FTkFCTEVELFxuICAgICAgICBJTUFHRV9PUFRJTUlaQVRJT05fRU5BQkxFRDogcHJvY2Vzcy5lbnYuSU1BR0VfT1BUSU1JWkFUSU9OX0VOQUJMRUQsXG4gICAgICAgIENBUlRPR1JBUEhFUl9FTkFCTEVEOiBwcm9jZXNzLmVudi5DQVJUT0dSQVBIRVJfRU5BQkxFRCxcbiAgICAgIH0sXG4gICAgICByYXpvcnBheToge1xuICAgICAgICBrZXlJZDogcHJvY2Vzcy5lbnYuUkFaT1JQQVlfS0VZX0lELFxuICAgICAgICBrZXlTZWNyZXQ6IHByb2Nlc3MuZW52LlJBWk9SUEFZX0tFWV9TRUNSRVQsXG4gICAgICAgIHdlYmhvb2tTZWNyZXQ6IHByb2Nlc3MuZW52LlJBWk9SUEFZX1dFQkhPT0tfU0VDUkVULFxuICAgICAgICB3ZWJob29rSXBzOiBwcm9jZXNzLmVudi5SQVpPUlBBWV9XRUJIT09LX0lQUyxcbiAgICAgIH0sXG4gICAgICBhbGVydGluZzoge1xuICAgICAgICBFTkFCTEVfRkFJTEVEX1BBWU1FTlRfQUxFUlRTOiBwcm9jZXNzLmVudi5FTkFCTEVfRkFJTEVEX1BBWU1FTlRfQUxFUlRTLFxuICAgICAgICBTTEFDS19XRUJIT09LX1VSTDogcHJvY2Vzcy5lbnYuU0xBQ0tfV0VCSE9PS19VUkwsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gY29uZmlnU2NoZW1hLnBhcnNlKHJhd0NvbmZpZyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2Ygei5ab2RFcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXFxuXHUyNzRDIENvbmZpZ3VyYXRpb24gVmFsaWRhdGlvbiBGYWlsZWRcXG4nKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1RoZSBmb2xsb3dpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFyZSBtaXNzaW5nIG9yIGludmFsaWQ6XFxuJyk7XG4gICAgICBcbiAgICAgIGNvbnN0IGVycm9yc0J5U2VjdGlvbjogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge307XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgaXNzdWUgb2YgZXJyb3IuZXJyb3JzKSB7XG4gICAgICAgIGNvbnN0IHNlY3Rpb24gPSBpc3N1ZS5wYXRoWzBdIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgZmllbGQgPSBpc3N1ZS5wYXRoLnNsaWNlKDEpLmpvaW4oJy4nKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGlzc3VlLm1lc3NhZ2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWVycm9yc0J5U2VjdGlvbltzZWN0aW9uXSkge1xuICAgICAgICAgIGVycm9yc0J5U2VjdGlvbltzZWN0aW9uXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBlcnJvcnNCeVNlY3Rpb25bc2VjdGlvbl0ucHVzaChgICBcdTIwMjIgJHtmaWVsZH06ICR7bWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZm9yIChjb25zdCBbc2VjdGlvbiwgZXJyb3JzXSBvZiBPYmplY3QuZW50cmllcyhlcnJvcnNCeVNlY3Rpb24pKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFske3NlY3Rpb24udG9VcHBlckNhc2UoKX1dYCk7XG4gICAgICAgIGVycm9ycy5mb3JFYWNoKGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCcnKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIGNoZWNrIHlvdXIgLmVudiBmaWxlIGFuZCBlbnN1cmUgYWxsIHJlcXVpcmVkIHZhcmlhYmxlcyBhcmUgc2V0IGNvcnJlY3RseS4nKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1JlZmVyIHRvIC5lbnYuZXhhbXBsZSBmb3IgdGhlIGV4cGVjdGVkIGZvcm1hdC5cXG4nKTtcbiAgICAgIFxuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgICBcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlZCBjb25maWd1cmF0aW9uIG9iamVjdFxuICovXG5jb25zdCB2YWxpZGF0ZWRDb25maWcgPSB2YWxpZGF0ZUNvbmZpZ3VyYXRpb24oKTtcblxuLyoqXG4gKiBUeXBlLXNhZmUgY29uZmlndXJhdGlvbiBvYmplY3RcbiAqL1xuZXhwb3J0IHR5cGUgQ29uZmlnID0gei5pbmZlcjx0eXBlb2YgY29uZmlnU2NoZW1hPjtcbmV4cG9ydCB0eXBlIEFwcENvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGFwcENvbmZpZ1NjaGVtYT47XG5leHBvcnQgdHlwZSBEYXRhYmFzZUNvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGRhdGFiYXNlQ29uZmlnU2NoZW1hPjtcbmV4cG9ydCB0eXBlIFNlY3VyaXR5Q29uZmlnID0gei5pbmZlcjx0eXBlb2Ygc2VjdXJpdHlDb25maWdTY2hlbWE+O1xuZXhwb3J0IHR5cGUgRW1haWxDb25maWcgPSB6LmluZmVyPHR5cGVvZiBlbWFpbENvbmZpZ1NjaGVtYT47XG5leHBvcnQgdHlwZSBBZG1pbkNvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGFkbWluQ29uZmlnU2NoZW1hPjtcbmV4cG9ydCB0eXBlIEZlYXR1cmVzQ29uZmlnID0gei5pbmZlcjx0eXBlb2YgZmVhdHVyZXNDb25maWdTY2hlbWE+O1xuZXhwb3J0IHR5cGUgTG9nZ2luZ0NvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGxvZ2dpbmdDb25maWdTY2hlbWE+O1xuZXhwb3J0IHR5cGUgQ29yc0NvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGNvcnNDb25maWdTY2hlbWE+O1xuZXhwb3J0IHR5cGUgQ29va2llc0NvbmZpZyA9IHouaW5mZXI8dHlwZW9mIGNvb2tpZXNDb25maWdTY2hlbWE+O1xuZXhwb3J0IHR5cGUgQnVpbGRDb25maWcgPSB6LmluZmVyPHR5cGVvZiBidWlsZENvbmZpZ1NjaGVtYT47XG5leHBvcnQgdHlwZSBSYXpvcnBheUNvbmZpZyA9IHouaW5mZXI8dHlwZW9mIHJhem9ycGF5Q29uZmlnU2NoZW1hPjtcbmV4cG9ydCB0eXBlIEFsZXJ0aW5nQ29uZmlnID0gei5pbmZlcjx0eXBlb2YgYWxlcnRpbmdDb25maWdTY2hlbWE+O1xuXG4vKipcbiAqIE1haW4gY29uZmlndXJhdGlvbiBvYmplY3Qgd2l0aCBhbGwgc2VjdGlvbnNcbiAqL1xuY29uc3QgY29uZmlnOiBDb25maWcgPSB2YWxpZGF0ZWRDb25maWc7XG5cbi8qKlxuICogSW5kaXZpZHVhbCBjb25maWd1cmF0aW9uIHNlY3Rpb25zIGZvciBjb252ZW5pZW5jZVxuICovXG5leHBvcnQgY29uc3QgYXBwQ29uZmlnOiBBcHBDb25maWcgPSBjb25maWcuYXBwO1xuZXhwb3J0IGNvbnN0IGRhdGFiYXNlQ29uZmlnOiBEYXRhYmFzZUNvbmZpZyA9IGNvbmZpZy5kYXRhYmFzZTtcbmV4cG9ydCBjb25zdCBzZWN1cml0eUNvbmZpZzogU2VjdXJpdHlDb25maWcgPSBjb25maWcuc2VjdXJpdHk7XG5leHBvcnQgY29uc3QgZW1haWxDb25maWc6IEVtYWlsQ29uZmlnID0gY29uZmlnLmVtYWlsO1xuZXhwb3J0IGNvbnN0IGFkbWluQ29uZmlnOiBBZG1pbkNvbmZpZyA9IGNvbmZpZy5hZG1pbjtcbmV4cG9ydCBjb25zdCBmZWF0dXJlc0NvbmZpZzogRmVhdHVyZXNDb25maWcgPSBjb25maWcuZmVhdHVyZXM7XG5leHBvcnQgY29uc3QgbG9nZ2luZ0NvbmZpZzogTG9nZ2luZ0NvbmZpZyA9IGNvbmZpZy5sb2dnaW5nO1xuZXhwb3J0IGNvbnN0IGNvcnNDb25maWc6IENvcnNDb25maWcgPSBjb25maWcuY29ycztcbmV4cG9ydCBjb25zdCBjb29raWVzQ29uZmlnOiBDb29raWVzQ29uZmlnID0gY29uZmlnLmNvb2tpZXM7XG5leHBvcnQgY29uc3QgYnVpbGRDb25maWc6IEJ1aWxkQ29uZmlnID0gY29uZmlnLmJ1aWxkO1xuZXhwb3J0IGNvbnN0IHJhem9ycGF5Q29uZmlnOiBSYXpvcnBheUNvbmZpZyA9IGNvbmZpZy5yYXpvcnBheTtcbmV4cG9ydCBjb25zdCBhbGVydGluZ0NvbmZpZzogQWxlcnRpbmdDb25maWcgPSBjb25maWcuYWxlcnRpbmc7XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIHJ1bm5pbmcgaW4gZGV2ZWxvcG1lbnQgbW9kZVxuICogQHJldHVybnMgdHJ1ZSBpZiBOT0RFX0VOViBpcyAnZGV2ZWxvcG1lbnQnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RldigpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbmZpZy5hcHAuaXNEZXZlbG9wbWVudDtcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2hlY2sgaWYgcnVubmluZyBpbiBwcm9kdWN0aW9uIG1vZGVcbiAqIEByZXR1cm5zIHRydWUgaWYgTk9ERV9FTlYgaXMgJ3Byb2R1Y3Rpb24nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2QoKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb25maWcuYXBwLmlzUHJvZHVjdGlvbjtcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2hlY2sgaWYgcnVubmluZyBpbiB0ZXN0IG1vZGVcbiAqIEByZXR1cm5zIHRydWUgaWYgTk9ERV9FTlYgaXMgJ3Rlc3QnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Rlc3QoKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb25maWcuYXBwLmlzVGVzdDtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IGV4cG9ydCAtIGNvbXBsZXRlIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNvbmZpZztcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1AsU0FBUyxvQkFBb0I7QUFDalIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixPQUFPLHlCQUF5QjtBQUNoQyxPQUFPLGtCQUFrQjs7O0FDU3pCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsU0FBUyxlQUFlO0FBQ2pDLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsU0FBUztBQWhCd0osSUFBTSwyQ0FBMkM7QUFtQjNOLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFVBQVU7QUFhcEMsV0FBVyxPQUFPO0FBQUEsRUFDaEIsTUFBTSxRQUFRLFdBQVcsT0FBTztBQUFBLEVBQ2hDLFFBQVE7QUFBQTtBQUFBLEVBQ1IsVUFBVSxRQUFRLElBQUksWUFBWTtBQUNw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
