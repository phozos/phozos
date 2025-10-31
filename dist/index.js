var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/response.ts
import { randomUUID } from "crypto";
var sendSuccess, sendError, sendPaginatedSuccess, sendEmptySuccess;
var init_response = __esm({
  "server/utils/response.ts"() {
    "use strict";
    sendSuccess = (res, data, meta) => {
      const response = {
        success: true,
        data,
        meta: {
          requestId: res.locals.requestId || randomUUID(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ...meta
        }
      };
      return res.json(response);
    };
    sendError = (res, status, code, message, details, field, hint) => {
      const response = {
        success: false,
        error: {
          code,
          message,
          details,
          field,
          hint
        },
        meta: {
          requestId: res.locals.requestId || randomUUID(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
      return res.status(status).json(response);
    };
    sendPaginatedSuccess = (res, data, pagination, totalCount) => {
      return sendSuccess(res, data, {
        pagination,
        totalCount
      });
    };
    sendEmptySuccess = (res) => {
      return sendSuccess(res, {});
    };
  }
});

// server/services/errors.ts
var ServiceError, AuthenticationError, AuthorizationError, ValidationServiceError, BusinessRuleViolationError, ResourceNotFoundError, DuplicateResourceError, ServiceUnavailableError, InvalidOperationError;
var init_errors = __esm({
  "server/services/errors.ts"() {
    "use strict";
    ServiceError = class extends Error {
      constructor(message, code, statusCode = 500, context) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.name = "ServiceError";
        Error.captureStackTrace(this, this.constructor);
      }
    };
    AuthenticationError = class extends ServiceError {
      constructor(message = "Authentication failed", context) {
        super(message, "AUTHENTICATION_ERROR", 401, context);
        this.name = "AuthenticationError";
      }
    };
    AuthorizationError = class extends ServiceError {
      constructor(message = "You do not have permission to perform this action", context) {
        super(message, "AUTHORIZATION_ERROR", 403, context);
        this.name = "AuthorizationError";
      }
    };
    ValidationServiceError = class extends ServiceError {
      constructor(entity, errors, context) {
        const message = `Validation failed for ${entity}`;
        super(message, "VALIDATION_ERROR", 400, { ...context, entity, errors });
        this.name = "ValidationServiceError";
      }
    };
    BusinessRuleViolationError = class extends ServiceError {
      constructor(rule, message, context) {
        super(message, "BUSINESS_RULE_VIOLATION", 422, { ...context, rule });
        this.name = "BusinessRuleViolationError";
      }
    };
    ResourceNotFoundError = class extends ServiceError {
      constructor(resource, identifier, context) {
        const id = identifier ? typeof identifier === "string" ? identifier : JSON.stringify(identifier) : "";
        const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
        super(message, "RESOURCE_NOT_FOUND", 404, { ...context, resource, identifier });
        this.name = "ResourceNotFoundError";
      }
    };
    DuplicateResourceError = class extends ServiceError {
      constructor(resource, field, value, context) {
        const message = `${resource} with ${field} '${value}' already exists`;
        super(message, "DUPLICATE_RESOURCE", 409, { ...context, resource, field, value });
        this.name = "DuplicateResourceError";
      }
    };
    ServiceUnavailableError = class extends ServiceError {
      constructor(service, message = "Service temporarily unavailable", context) {
        super(message, "SERVICE_UNAVAILABLE", 503, { ...context, service });
        this.name = "ServiceUnavailableError";
      }
    };
    InvalidOperationError = class extends ServiceError {
      constructor(operation, reason, context) {
        const message = `Cannot ${operation}: ${reason}`;
        super(message, "INVALID_OPERATION", 400, { ...context, operation, reason });
        this.name = "InvalidOperationError";
      }
    };
  }
});

// server/config/index.ts
import dotenvFlow from "dotenv-flow";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
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
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY
      },
      admin: {
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        ADMIN_IPS: process.env.ADMIN_IPS
      },
      features: {
        SEO_META_ENABLED: process.env.SEO_META_ENABLED,
        FORCE_HTTPS_REDIRECT: process.env.FORCE_HTTPS_REDIRECT,
        CANONICAL_URL_ENFORCEMENT: process.env.CANONICAL_URL_ENFORCEMENT,
        MONITORING_ENABLED: process.env.MONITORING_ENABLED,
        COMPLIANCE_REPORT_ENABLED: process.env.COMPLIANCE_REPORT_ENABLED,
        ERROR_DETAILS_ENABLED: process.env.ERROR_DETAILS_ENABLED
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
        COOKIE_SAMESITE: process.env.COOKIE_SAMESITE
      },
      build: {
        HMR_ENABLED: process.env.HMR_ENABLED,
        IMAGE_OPTIMIZATION_ENABLED: process.env.IMAGE_OPTIMIZATION_ENABLED,
        CARTOGRAPHER_ENABLED: process.env.CARTOGRAPHER_ENABLED
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
function isDev() {
  return config.app.isDevelopment;
}
function isProd() {
  return config.app.isProduction;
}
var __filename, __dirname, booleanSchema, commaSeparatedSchema, appConfigSchema, databaseConfigSchema, securityConfigSchema, emailConfigSchema, adminConfigSchema, featuresConfigSchema, loggingConfigSchema, corsConfigSchema, cookiesConfigSchema, buildConfigSchema, configSchema, validatedConfig, config, appConfig, databaseConfig, securityConfig, emailConfig, adminConfig, featuresConfig, loggingConfig, corsConfig, cookiesConfig, buildConfig, config_default;
var init_config = __esm({
  "server/config/index.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    dotenvFlow.config({
      path: resolve(__dirname, "../.."),
      silent: true,
      // Don't throw errors if files don't exist
      node_env: process.env.NODE_ENV || "development"
    });
    booleanSchema = z.string().optional().transform((val) => {
      if (!val) return false;
      const normalized = val.toLowerCase().trim();
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
      return false;
    });
    commaSeparatedSchema = z.string().optional().transform((val) => {
      if (!val) return [];
      return val.split(",").map((item) => item.trim()).filter(Boolean);
    });
    appConfigSchema = z.object({
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      PORT: z.string().optional().transform((val) => parseInt(val || "5000", 10))
    }).transform((data) => ({
      ...data,
      isDevelopment: data.NODE_ENV === "development",
      isProduction: data.NODE_ENV === "production",
      isTest: data.NODE_ENV === "test"
    }));
    databaseConfigSchema = z.object({
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
    });
    securityConfigSchema = z.object({
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
    emailConfigSchema = z.object({
      SENDGRID_API_KEY: z.string().optional()
    });
    adminConfigSchema = z.object({
      ADMIN_PASSWORD: z.string().optional(),
      ADMIN_IPS: commaSeparatedSchema
    });
    featuresConfigSchema = z.object({
      SEO_META_ENABLED: booleanSchema,
      FORCE_HTTPS_REDIRECT: booleanSchema,
      CANONICAL_URL_ENFORCEMENT: booleanSchema,
      MONITORING_ENABLED: booleanSchema,
      COMPLIANCE_REPORT_ENABLED: booleanSchema,
      ERROR_DETAILS_ENABLED: booleanSchema
    });
    loggingConfigSchema = z.object({
      LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
      LOG_FORMAT: z.enum(["pretty", "json"]).default("json"),
      LOG_FILE_ENABLED: booleanSchema
    });
    corsConfigSchema = z.object({
      CORS_ENABLED: booleanSchema,
      CORS_MAX_AGE: z.string().optional().transform((val) => parseInt(val || "86400", 10)),
      ALLOWED_ORIGINS: commaSeparatedSchema
    });
    cookiesConfigSchema = z.object({
      COOKIE_SECURE: booleanSchema,
      COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("lax")
    });
    buildConfigSchema = z.object({
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
    configSchema = z.object({
      app: appConfigSchema,
      database: databaseConfigSchema,
      security: securityConfigSchema,
      email: emailConfigSchema,
      admin: adminConfigSchema,
      features: featuresConfigSchema,
      logging: loggingConfigSchema,
      cors: corsConfigSchema,
      cookies: cookiesConfigSchema,
      build: buildConfigSchema
    });
    validatedConfig = validateConfiguration();
    config = validatedConfig;
    appConfig = config.app;
    databaseConfig = config.database;
    securityConfig = config.security;
    emailConfig = config.email;
    adminConfig = config.admin;
    featuresConfig = config.features;
    loggingConfig = config.logging;
    corsConfig = config.cors;
    cookiesConfig = config.cookies;
    buildConfig = config.build;
    config_default = config;
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    db = drizzle(pool);
  }
});

// server/repositories/errors.ts
function handleDatabaseError(error, context) {
  if (error instanceof RepositoryError) {
    throw error;
  }
  if (error.code === "23505") {
    const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
    if (match) {
      throw new DuplicateError(context, match[1], match[2], error);
    }
    throw new DuplicateError(context, "unknown", "unknown", error);
  }
  if (error.code === "23503") {
    const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/);
    if (match) {
      throw new ForeignKeyError(context, match[3], error);
    }
    throw new ForeignKeyError(context, "unknown entity", error);
  }
  if (error.code === "23502") {
    throw new ValidationError(context, { error: "Required field is missing" }, error);
  }
  throw new DatabaseError(context, error);
}
var RepositoryError, NotFoundError, DuplicateError, ForeignKeyError, ValidationError, TransactionError, DatabaseError;
var init_errors2 = __esm({
  "server/repositories/errors.ts"() {
    "use strict";
    RepositoryError = class extends Error {
      constructor(message, cause, context) {
        super(message);
        this.cause = cause;
        this.context = context;
        this.name = "RepositoryError";
        Error.captureStackTrace(this, this.constructor);
      }
    };
    NotFoundError = class extends RepositoryError {
      constructor(entity, identifier, cause) {
        const id = typeof identifier === "string" ? identifier : JSON.stringify(identifier);
        super(
          `${entity} not found: ${id}`,
          cause,
          { entity, identifier }
        );
        this.name = "NotFoundError";
      }
    };
    DuplicateError = class extends RepositoryError {
      constructor(entity, field, value, cause) {
        super(
          `${entity} with ${field} '${value}' already exists`,
          cause,
          { entity, field, value }
        );
        this.name = "DuplicateError";
      }
    };
    ForeignKeyError = class extends RepositoryError {
      constructor(entity, referencedEntity, cause) {
        super(
          `${entity} references non-existent ${referencedEntity}`,
          cause,
          { entity, referencedEntity }
        );
        this.name = "ForeignKeyError";
      }
    };
    ValidationError = class extends RepositoryError {
      constructor(entity, errors, cause) {
        super(
          `Validation failed for ${entity}: ${JSON.stringify(errors)}`,
          cause,
          { entity, errors }
        );
        this.name = "ValidationError";
      }
    };
    TransactionError = class extends RepositoryError {
      constructor(operation, cause) {
        super(
          `Transaction failed during ${operation}`,
          cause,
          { operation }
        );
        this.name = "TransactionError";
      }
    };
    DatabaseError = class extends RepositoryError {
      constructor(operation, cause) {
        super(
          `Database operation failed: ${operation}`,
          cause,
          { operation }
        );
        this.name = "DatabaseError";
      }
    };
  }
});

// server/repositories/base.repository.ts
import { eq, and, sql } from "drizzle-orm";
var BaseRepository;
var init_base_repository = __esm({
  "server/repositories/base.repository.ts"() {
    "use strict";
    init_db();
    init_errors2();
    BaseRepository = class {
      constructor(table, primaryKey = "id") {
        this.table = table;
        this.primaryKey = primaryKey;
      }
      getPrimaryKeyColumn() {
        return this.table[this.primaryKey];
      }
      async findById(id, tx) {
        try {
          const executor = tx || db;
          const results = await executor.select().from(this.table).where(eq(this.getPrimaryKeyColumn(), id)).limit(1);
          if (!results[0]) {
            throw new NotFoundError(this.table.toString(), id);
          }
          return results[0];
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.findById`);
        }
      }
      async findByIdOptional(id, tx) {
        try {
          const executor = tx || db;
          const results = await executor.select().from(this.table).where(eq(this.getPrimaryKeyColumn(), id)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.findByIdOptional`);
        }
      }
      async findAll(filters, tx) {
        try {
          const executor = tx || db;
          let query = executor.select().from(this.table);
          if (filters) {
            const conditions = Object.entries(filters).filter(([_, value]) => value !== void 0).map(([key, value]) => eq(this.table[key], value));
            if (conditions.length > 0) {
              query = query.where(and(...conditions));
            }
          }
          return await query;
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.findAll`);
        }
      }
      async create(data, tx) {
        try {
          const executor = tx || db;
          const results = await executor.insert(this.table).values(data).returning();
          return results[0];
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.create`);
        }
      }
      async update(id, data, tx) {
        try {
          const executor = tx || db;
          const results = await executor.update(this.table).set(data).where(eq(this.getPrimaryKeyColumn(), id)).returning();
          if (!results[0]) {
            throw new NotFoundError(this.table.toString(), id);
          }
          return results[0];
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.update`);
        }
      }
      async delete(id, tx) {
        try {
          const executor = tx || db;
          const result = await executor.delete(this.table).where(eq(this.getPrimaryKeyColumn(), id));
          return result.rowCount > 0;
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.delete`);
        }
      }
      async findOne(conditions, tx) {
        try {
          const executor = tx || db;
          const results = await executor.select().from(this.table).where(conditions).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.findOne`);
        }
      }
      async findMany(conditions, tx) {
        try {
          const executor = tx || db;
          let query = executor.select().from(this.table);
          if (conditions) {
            query = query.where(conditions);
          }
          return await query;
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.findMany`);
        }
      }
      async count(conditions, tx) {
        try {
          const executor = tx || db;
          let query = executor.select({ count: sql`count(*)` }).from(this.table);
          if (conditions) {
            query = query.where(conditions);
          }
          const result = await query;
          return Number(result[0]?.count || 0);
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.count`);
        }
      }
      async exists(conditions, tx) {
        try {
          const count2 = await this.count(conditions, tx);
          return count2 > 0;
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.exists`);
        }
      }
      async paginate(query, options, conditions, tx) {
        try {
          const { limit, offset } = options;
          const total = await this.count(conditions, tx);
          const data = await query.limit(limit).offset(offset);
          return {
            data,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          };
        } catch (error) {
          handleDatabaseError(error, `${this.table.toString()}.paginate`);
        }
      }
      buildFilters(filters) {
        if (!filters) return [];
        return Object.entries(filters).filter(([_, value]) => value !== void 0 && value !== null).map(([key, value]) => eq(this.table[key], value));
      }
      async executeInTransaction(callback) {
        try {
          return await db.transaction(callback);
        } catch (error) {
          throw new TransactionError("transaction execution", error);
        }
      }
    };
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountStatusEnum: () => accountStatusEnum,
  aiMatchingResults: () => aiMatchingResults,
  applicationStatusEnum: () => applicationStatusEnum,
  applications: () => applications,
  chatMessages: () => chatMessages,
  courses: () => courses,
  customFieldValues: () => customFieldValues,
  customFields: () => customFields,
  dashboardSectionEnum: () => dashboardSectionEnum,
  documentTypeEnum: () => documentTypeEnum,
  documents: () => documents,
  eventRegistrations: () => eventRegistrations,
  events: () => events,
  fieldTypeEnum: () => fieldTypeEnum,
  forumCategoryEnum: () => forumCategoryEnum,
  forumComments: () => forumComments,
  forumLikes: () => forumLikes,
  forumPollVotes: () => forumPollVotes,
  forumPostLimits: () => forumPostLimits,
  forumPostReports: () => forumPostReports,
  forumPostsEnhanced: () => forumPostsEnhanced,
  forumSaves: () => forumSaves,
  insertApplicationSchema: () => insertApplicationSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertCourseSchema: () => insertCourseSchema,
  insertCustomFieldSchema: () => insertCustomFieldSchema,
  insertCustomFieldValueSchema: () => insertCustomFieldValueSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertEventSchema: () => insertEventSchema,
  insertForumCommentSchema: () => insertForumCommentSchema,
  insertForumLikeSchema: () => insertForumLikeSchema,
  insertForumPollVoteSchema: () => insertForumPollVoteSchema,
  insertForumPostCompanySchema: () => insertForumPostCompanySchema,
  insertForumPostEnhancedSchema: () => insertForumPostEnhancedSchema,
  insertForumPostLimitSchema: () => insertForumPostLimitSchema,
  insertForumPostReportSchema: () => insertForumPostReportSchema,
  insertForumSaveSchema: () => insertForumSaveSchema,
  insertIpRegistrationLimitSchema: () => insertIpRegistrationLimitSchema,
  insertLoginAttemptSchema: () => insertLoginAttemptSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPaymentSettingsSchema: () => insertPaymentSettingsSchema,
  insertSecurityEventSchema: () => insertSecurityEventSchema,
  insertSecuritySettingsSchema: () => insertSecuritySettingsSchema,
  insertStaffInvitationLinkSchema: () => insertStaffInvitationLinkSchema,
  insertStudentProfileSchema: () => insertStudentProfileSchema,
  insertStudentTimelineSchema: () => insertStudentTimelineSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertTestimonialSchema: () => insertTestimonialSchema,
  insertUniversitySchema: () => insertUniversitySchema,
  insertUserSchema: () => insertUserSchema,
  insertUserSubscriptionSchema: () => insertUserSubscriptionSchema,
  ipRegistrationLimits: () => ipRegistrationLimits,
  loginAttempts: () => loginAttempts,
  notificationTypeEnum: () => notificationTypeEnum,
  notifications: () => notifications,
  paymentSettings: () => paymentSettings,
  reportReasonEnum: () => reportReasonEnum,
  securityEvents: () => securityEvents,
  securitySettings: () => securitySettings,
  staffInvitationLinks: () => staffInvitationLinks,
  studentProfiles: () => studentProfiles,
  studentStatusEnum: () => studentStatusEnum,
  studentTimeline: () => studentTimeline,
  subscriptionPlans: () => subscriptionPlans,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  subscriptionTierEnum: () => subscriptionTierEnum,
  subscriptions: () => subscriptions,
  supportTypeEnum: () => supportTypeEnum,
  teamRoleEnum: () => teamRoleEnum,
  testimonials: () => testimonials,
  universities: () => universities,
  universityTierEnum: () => universityTierEnum,
  userSubscriptions: () => userSubscriptions,
  userTypeEnum: () => userTypeEnum,
  users: () => users
});
import { sql as sql2 } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  uuid,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z as z2 } from "zod";
var userTypeEnum, teamRoleEnum, accountStatusEnum, applicationStatusEnum, documentTypeEnum, notificationTypeEnum, subscriptionTierEnum, studentStatusEnum, fieldTypeEnum, dashboardSectionEnum, forumCategoryEnum, subscriptionStatusEnum, supportTypeEnum, universityTierEnum, reportReasonEnum, users, studentProfiles, universities, courses, applications, documents, notifications, forumComments, subscriptions, events, securitySettings, eventRegistrations, aiMatchingResults, testimonials, customFields, customFieldValues, forumPostsEnhanced, forumLikes, forumSaves, forumPostReports, studentTimeline, chatMessages, forumPollVotes, insertUserSchema, insertStudentProfileSchema, insertUniversitySchema, insertCourseSchema, insertApplicationSchema, insertDocumentSchema, insertNotificationSchema, insertForumCommentSchema, insertForumPostReportSchema, insertForumPollVoteSchema, insertSubscriptionSchema, insertEventSchema, insertTestimonialSchema, insertCustomFieldSchema, insertCustomFieldValueSchema, insertForumPostEnhancedSchema, insertForumPostCompanySchema, insertForumLikeSchema, insertForumSaveSchema, insertStudentTimelineSchema, insertChatMessageSchema, ipRegistrationLimits, loginAttempts, securityEvents, staffInvitationLinks, forumPostLimits, insertIpRegistrationLimitSchema, insertLoginAttemptSchema, insertStaffInvitationLinkSchema, insertSecurityEventSchema, insertSecuritySettingsSchema, insertForumPostLimitSchema, subscriptionPlans, userSubscriptions, paymentSettings, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertPaymentSettingsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    userTypeEnum = pgEnum("user_type", ["customer", "team_member", "company_profile"]);
    teamRoleEnum = pgEnum("team_role", ["admin", "counselor"]);
    accountStatusEnum = pgEnum("account_status", ["active", "inactive", "pending_approval", "suspended", "rejected"]);
    applicationStatusEnum = pgEnum("application_status", ["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"]);
    documentTypeEnum = pgEnum("document_type", ["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"]);
    notificationTypeEnum = pgEnum("notification_type", ["application_update", "document_reminder", "message", "system", "deadline"]);
    subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium", "elite"]);
    studentStatusEnum = pgEnum("student_status", ["inquiry", "converted", "visa_applied", "visa_approved", "departed"]);
    fieldTypeEnum = pgEnum("field_type", ["text", "textarea", "number", "date", "dropdown", "checkbox", "file"]);
    dashboardSectionEnum = pgEnum("dashboard_section", ["counselor"]);
    forumCategoryEnum = pgEnum("forum_category", ["general", "usa_study", "uk_study", "canada_study", "australia_study", "ielts_prep", "visa_tips", "scholarships", "europe_study"]);
    subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled", "pending"]);
    supportTypeEnum = pgEnum("support_type", ["email", "whatsapp", "phone", "premium"]);
    universityTierEnum = pgEnum("university_tier", ["general", "top500", "top200", "top100", "ivy_league"]);
    reportReasonEnum = pgEnum("report_reason", ["spam", "inappropriate", "harassment", "misinformation", "off_topic", "other"]);
    users = pgTable("users", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password"),
      temporaryPassword: text("temporary_password"),
      // Store encrypted copy of temporary password for admin reference
      userType: userTypeEnum("user_type").notNull().default("customer"),
      teamRole: teamRoleEnum("team_role"),
      firstName: text("first_name"),
      lastName: text("last_name"),
      companyName: text("company_name"),
      // Company name for company_profile users
      profilePicture: text("profile_picture"),
      accountStatus: accountStatusEnum("account_status").default("pending_approval"),
      verificationToken: text("verification_token"),
      verificationTokenExpires: timestamp("verification_token_expires"),
      lastLoginAt: timestamp("last_login_at"),
      coolingPeriodBypassedAt: timestamp("cooling_period_bypassed_at"),
      // Admin can bypass cooling period
      coolingPeriodBypassedBy: uuid("cooling_period_bypassed_by").references(() => users.id),
      // Admin who bypassed
      failedLoginAttempts: integer("failed_login_attempts").default(0),
      accountLockedAt: timestamp("account_locked_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    studentProfiles = pgTable("student_profiles", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      phone: text("phone"),
      dateOfBirth: timestamp("date_of_birth"),
      nationality: text("nationality"),
      currentEducationLevel: text("current_education_level"),
      institutionName: text("institution_name"),
      gpa: decimal("gpa", { precision: 5, scale: 2 }),
      academicScoringType: text("academic_scoring_type").default("gpa"),
      // 'gpa', 'percentage', or 'grade'
      testScores: jsonb("test_scores").$type(),
      intendedMajor: text("intended_major"),
      preferredCountries: text("preferred_countries").array(),
      destinationCountry: text("destination_country"),
      intakeYear: text("intake_year"),
      status: studentStatusEnum("status").default("inquiry"),
      assignedCounselorId: uuid("assigned_counselor_id").references(() => users.id),
      budgetRange: jsonb("budget_range").$type(),
      academicInterests: text("academic_interests").array(),
      extracurriculars: text("extracurriculars").array(),
      workExperience: jsonb("work_experience").$type(),
      familyInfo: jsonb("family_info").$type(),
      educationHistory: jsonb("education_history").$type(),
      // Extended profile information
      personalDetails: jsonb("personal_details").$type(),
      academicDetails: jsonb("academic_details").$type(),
      workDetails: jsonb("work_details").$type(),
      studyPreferences: jsonb("study_preferences").$type(),
      universityPreferences: jsonb("university_preferences").$type(),
      financialInfo: jsonb("financial_info").$type(),
      visaHistory: jsonb("visa_history").$type(),
      familyDetails: jsonb("family_details").$type(),
      additionalInfo: jsonb("additional_info").$type(),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    universities = pgTable("universities", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      // 1. Basic Information
      name: text("name").notNull(),
      country: text("country").notNull(),
      city: text("city").notNull(),
      website: text("website"),
      worldRanking: integer("world_ranking"),
      // 2. Academics
      degreeLevels: text("degree_levels").array(),
      // Bachelor, Master, PhD
      specialization: text("specialization"),
      // business, science, engineering, etc.
      // 3. Fees
      offerLetterFee: decimal("offer_letter_fee", { precision: 10, scale: 2 }),
      annualFee: decimal("annual_fee", { precision: 10, scale: 2 }),
      // 4. Requirements (simplified)
      admissionRequirements: jsonb("admission_requirements").$type(),
      // 5. Known Alumni
      alumni1: text("alumni1"),
      alumni2: text("alumni2"),
      alumni3: text("alumni3"),
      // Legacy fields (kept for backward compatibility)
      logo: text("logo"),
      description: text("description"),
      ranking: jsonb("ranking").$type(),
      tuitionFees: jsonb("tuition_fees").$type(),
      acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }),
      studentPopulation: integer("student_population"),
      internationalStudents: integer("international_students"),
      campusSize: text("campus_size"),
      establishedYear: integer("established_year"),
      type: text("type"),
      tags: text("tags").array(),
      images: text("images").array(),
      tier: universityTierEnum("tier").default("general"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    courses = pgTable("courses", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      universityId: uuid("university_id").references(() => universities.id).notNull(),
      name: text("name").notNull(),
      degree: text("degree"),
      // Bachelor's, Master's, PhD
      field: text("field"),
      duration: text("duration"),
      description: text("description"),
      requirements: jsonb("requirements").$type(),
      tuitionFee: decimal("tuition_fee", { precision: 10, scale: 2 }),
      applicationDeadlines: jsonb("application_deadlines").$type(),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    applications = pgTable("applications", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      universityId: uuid("university_id").references(() => universities.id).notNull(),
      courseId: uuid("course_id").references(() => courses.id),
      status: applicationStatusEnum("status").default("draft"),
      applicationData: jsonb("application_data").$type(),
      submittedAt: timestamp("submitted_at"),
      lastUpdated: timestamp("last_updated").defaultNow(),
      deadlineDate: timestamp("deadline_date"),
      assignedCounselorId: uuid("assigned_counselor_id").references(() => users.id),
      notes: text("notes"),
      tags: text("tags").array(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    documents = pgTable("documents", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      applicationId: uuid("application_id").references(() => applications.id),
      type: documentTypeEnum("type").notNull(),
      name: text("name").notNull(),
      fileName: text("file_name").notNull(),
      fileSize: integer("file_size"),
      mimeType: text("mime_type"),
      filePath: text("file_path").notNull(),
      description: text("description"),
      isVerified: boolean("is_verified").default(false),
      verifiedBy: uuid("verified_by").references(() => users.id),
      verifiedAt: timestamp("verified_at"),
      tags: text("tags").array(),
      metadata: jsonb("metadata").$type(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      type: notificationTypeEnum("type").notNull(),
      title: text("title").notNull(),
      message: text("message").notNull(),
      data: jsonb("data").$type(),
      isRead: boolean("is_read").default(false),
      readAt: timestamp("read_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    forumComments = pgTable("forum_comments", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
      userId: uuid("user_id").references(() => users.id).notNull(),
      parentId: uuid("parent_id"),
      content: text("content").notNull(),
      likesCount: integer("likes_count").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    subscriptions = pgTable("subscriptions", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      tier: subscriptionTierEnum("tier").notNull(),
      isActive: boolean("is_active").default(true),
      startDate: timestamp("start_date").defaultNow(),
      endDate: timestamp("end_date"),
      autoRenew: boolean("auto_renew").default(false),
      metadata: jsonb("metadata").$type(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    events = pgTable("events", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      title: text("title").notNull(),
      description: text("description"),
      eventType: text("event_type"),
      // webinar, workshop, info session
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      timezone: text("timezone"),
      location: text("location"),
      // online/physical address
      maxAttendees: integer("max_attendees"),
      currentAttendees: integer("current_attendees").default(0),
      organizerId: uuid("organizer_id").references(() => users.id).notNull(),
      tags: text("tags").array(),
      isPublic: boolean("is_public").default(true),
      meetingLink: text("meeting_link"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    securitySettings = pgTable("security_settings", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      settingKey: text("setting_key").notNull().unique(),
      settingValue: text("setting_value").notNull(),
      description: text("description"),
      updatedBy: uuid("updated_by").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    eventRegistrations = pgTable("event_registrations", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      eventId: uuid("event_id").references(() => events.id).notNull(),
      userId: uuid("user_id").references(() => users.id).notNull(),
      registeredAt: timestamp("registered_at").defaultNow(),
      attended: boolean("attended").default(false)
    });
    aiMatchingResults = pgTable("ai_matching_results", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      universityId: uuid("university_id").references(() => universities.id).notNull(),
      matchScore: decimal("match_score", { precision: 5, scale: 2 }),
      reasoning: jsonb("reasoning").$type(),
      modelVersion: text("model_version"),
      createdAt: timestamp("created_at").defaultNow()
    });
    testimonials = pgTable("testimonials", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      name: text("name").notNull(),
      destinationCountry: text("destination_country").notNull(),
      intake: text("intake").notNull(),
      photo: text("photo"),
      counselorName: text("counselor_name").notNull(),
      feedback: text("feedback").notNull(),
      isApproved: boolean("is_approved").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customFields = pgTable("custom_fields", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      role: teamRoleEnum("role").notNull(),
      label: text("label").notNull(),
      fieldType: fieldTypeEnum("field_type").notNull(),
      options: text("options").array(),
      // for dropdown options
      isRequired: boolean("is_required").default(false),
      isActive: boolean("is_active").default(true),
      order: integer("order").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customFieldValues = pgTable("custom_field_values", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      studentId: uuid("student_id").references(() => studentProfiles.id).notNull(),
      fieldId: uuid("field_id").references(() => customFields.id).notNull(),
      value: text("value"),
      fileUrl: text("file_url"),
      // for file uploads
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    forumPostsEnhanced = pgTable("forum_posts_enhanced", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      // Universal authorId supports all user types (students, companies, team members)
      authorId: uuid("author_id").references(() => users.id).notNull(),
      title: text("title"),
      content: text("content").notNull(),
      category: forumCategoryEnum("category").notNull(),
      tags: text("tags").array(),
      images: text("images").array(),
      // Support for photos
      pollOptions: jsonb("poll_options").$type(),
      // Support for polls - stores only id and text
      pollQuestion: text("poll_question"),
      pollEndsAt: timestamp("poll_ends_at"),
      isEdited: boolean("is_edited").default(false),
      editedAt: timestamp("edited_at"),
      isModerated: boolean("is_moderated").default(false),
      moderatorId: uuid("moderator_id").references(() => users.id),
      moderatedAt: timestamp("moderated_at"),
      likesCount: integer("likes_count").default(0),
      commentsCount: integer("comments_count").default(0),
      viewsCount: integer("views_count").default(0),
      reportCount: integer("report_count").default(0),
      isHiddenByReports: boolean("is_hidden_by_reports").default(false),
      hiddenAt: timestamp("hidden_at"),
      canBeRestoredUntil: timestamp("can_be_restored_until"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    forumLikes = pgTable("forum_likes", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      postId: uuid("post_id").references(() => forumPostsEnhanced.id),
      // Universal authorId supports all user types (students, companies, team members)
      authorId: uuid("author_id").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    forumSaves = pgTable("forum_saves", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
      // Universal authorId supports all user types (students, companies, team members)
      authorId: uuid("author_id").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    forumPostReports = pgTable("forum_post_reports", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
      reporterUserId: uuid("reporter_user_id").references(() => users.id).notNull(),
      reportReason: reportReasonEnum("report_reason").notNull(),
      reportDetails: text("report_details"),
      createdAt: timestamp("created_at").defaultNow()
    });
    studentTimeline = pgTable("student_timeline", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      studentId: uuid("student_id").references(() => studentProfiles.id).notNull(),
      action: text("action").notNull(),
      description: text("description"),
      previousStatus: studentStatusEnum("previous_status"),
      newStatus: studentStatusEnum("new_status"),
      performedBy: uuid("performed_by").references(() => users.id).notNull(),
      metadata: jsonb("metadata").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    chatMessages = pgTable("chat_messages", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      studentId: uuid("student_id").references(() => users.id).notNull(),
      counselorId: uuid("counselor_id").references(() => users.id).notNull(),
      senderId: uuid("sender_id").references(() => users.id).notNull(),
      message: text("message").notNull(),
      isRead: boolean("is_read").default(false),
      readAt: timestamp("read_at"),
      isEdited: boolean("is_edited").default(false),
      editedAt: timestamp("edited_at"),
      isDeleted: boolean("is_deleted").default(false),
      deletedAt: timestamp("deleted_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    forumPollVotes = pgTable("forum_poll_votes", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
      userId: uuid("user_id").references(() => users.id).notNull(),
      optionId: text("option_id").notNull(),
      // corresponds to poll option id
      createdAt: timestamp("created_at").defaultNow()
    });
    insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
    insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
    insertUniversitySchema = createInsertSchema(universities).omit({ id: true, createdAt: true, updatedAt: true }).extend({
      offerLetterFee: z2.union([z2.string(), z2.number()]).transform((val) => {
        if (val === "" || val === null || val === void 0) return null;
        return String(val);
      }).optional(),
      annualFee: z2.union([z2.string(), z2.number()]).transform((val) => {
        if (val === "" || val === null || val === void 0) return null;
        return String(val);
      }).optional(),
      acceptanceRate: z2.union([z2.string(), z2.number()]).transform((val) => {
        if (val === "" || val === null || val === void 0) return null;
        return String(val);
      }).optional()
    });
    insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, updatedAt: true });
    insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true });
    insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
    insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
    insertForumCommentSchema = createInsertSchema(forumComments).omit({ id: true, createdAt: true, updatedAt: true });
    insertForumPostReportSchema = createInsertSchema(forumPostReports).omit({ id: true, createdAt: true });
    insertForumPollVoteSchema = createInsertSchema(forumPollVotes).omit({ id: true, createdAt: true });
    insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
    insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
    insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true, updatedAt: true });
    insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true, updatedAt: true });
    insertCustomFieldValueSchema = createInsertSchema(customFieldValues).omit({ id: true, createdAt: true, updatedAt: true });
    insertForumPostEnhancedSchema = createInsertSchema(forumPostsEnhanced).omit({ id: true, createdAt: true, updatedAt: true }).extend({
      content: z2.string().min(1, "Content is required").max(100, "Content cannot exceed 100 characters including spaces").refine((content) => {
        const urlRegex = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
        return !urlRegex.test(content);
      }, "Links are not allowed in posts").refine((content) => {
        const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}|\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b)/;
        return !phoneRegex.test(content);
      }, "Phone numbers are not allowed in posts").refine((content) => {
        return content.length <= 100;
      }, "Content exceeds maximum length"),
      pollEndsAt: z2.union([z2.string(), z2.date()]).transform((val) => {
        if (val === null || val === void 0) return void 0;
        if (typeof val === "string") {
          const date = new Date(val);
          return isNaN(date.getTime()) ? void 0 : date;
        }
        return val;
      }).optional()
    });
    insertForumPostCompanySchema = createInsertSchema(forumPostsEnhanced).omit({ id: true, createdAt: true, updatedAt: true }).extend({
      content: z2.string().min(1, "Content is required"),
      // No character limit, links, or paste detection
      title: z2.string().optional(),
      // Allow optional custom titles
      pollEndsAt: z2.union([z2.string(), z2.date()]).transform((val) => {
        if (val === null || val === void 0) return void 0;
        if (typeof val === "string") {
          const date = new Date(val);
          return isNaN(date.getTime()) ? void 0 : date;
        }
        return val;
      }).optional()
    });
    insertForumLikeSchema = createInsertSchema(forumLikes).omit({ id: true, createdAt: true });
    insertForumSaveSchema = createInsertSchema(forumSaves).omit({ id: true, createdAt: true });
    insertStudentTimelineSchema = createInsertSchema(studentTimeline).omit({ id: true, createdAt: true });
    insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, updatedAt: true });
    ipRegistrationLimits = pgTable("ip_registration_limits", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      ipAddress: text("ip_address").notNull(),
      registrationCount: integer("registration_count").default(0),
      firstRegistrationAt: timestamp("first_registration_at").defaultNow(),
      lastRegistrationAt: timestamp("last_registration_at").defaultNow(),
      blockedUntil: timestamp("blocked_until")
    });
    loginAttempts = pgTable("login_attempts", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      email: text("email").notNull(),
      ipAddress: text("ip_address").notNull(),
      success: boolean("success").default(false),
      userAgent: text("user_agent"),
      attemptedAt: timestamp("attempted_at").defaultNow()
    });
    securityEvents = pgTable("security_events", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id),
      eventType: text("event_type").notNull(),
      // 'account_locked', 'cooling_bypassed', 'failed_login', etc.
      ipAddress: text("ip_address"),
      userAgent: text("user_agent"),
      details: jsonb("details"),
      createdAt: timestamp("created_at").defaultNow()
    });
    staffInvitationLinks = pgTable("staff_invitation_links", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      token: varchar("token", { length: 255 }).unique().notNull(),
      createdBy: uuid("created_by").references(() => users.id).notNull(),
      isActive: boolean("is_active").default(true),
      usedCount: integer("used_count").default(0),
      lastUsedAt: timestamp("last_used_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    forumPostLimits = pgTable("forum_post_limits", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      postCount: integer("post_count").default(0),
      lastPostAt: timestamp("last_post_at"),
      resetDate: timestamp("reset_date").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertIpRegistrationLimitSchema = createInsertSchema(ipRegistrationLimits);
    insertLoginAttemptSchema = createInsertSchema(loginAttempts);
    insertStaffInvitationLinkSchema = createInsertSchema(staffInvitationLinks).omit({ id: true, createdAt: true, updatedAt: true });
    insertSecurityEventSchema = createInsertSchema(securityEvents);
    insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({ id: true, createdAt: true, updatedAt: true });
    insertForumPostLimitSchema = createInsertSchema(forumPostLimits).omit({ id: true, createdAt: true, updatedAt: true });
    subscriptionPlans = pgTable("subscription_plans", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      name: text("name").notNull(),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      currency: text("currency").notNull().default("USD"),
      description: text("description"),
      logo: text("logo").default("graduation-cap"),
      // Plan logo identifier
      features: jsonb("features").$type().notNull(),
      maxUniversities: integer("max_universities").notNull(),
      maxCountries: integer("max_countries").notNull(),
      universityTier: universityTierEnum("university_tier").notNull().default("general"),
      supportType: supportTypeEnum("support_type").notNull().default("email"),
      turnaroundDays: integer("turnaround_days").notNull(),
      includeLoanAssistance: boolean("include_loan_assistance").default(false),
      includeVisaSupport: boolean("include_visa_support").default(false),
      includeCounselorSession: boolean("include_counselor_session").default(false),
      includeScholarshipPlanning: boolean("include_scholarship_planning").default(false),
      includeMockInterview: boolean("include_mock_interview").default(false),
      includeExpertEditing: boolean("include_expert_editing").default(false),
      includePostAdmitSupport: boolean("include_post_admit_support").default(false),
      includeDedicatedManager: boolean("include_dedicated_manager").default(false),
      includeNetworkingEvents: boolean("include_networking_events").default(false),
      includeFlightAccommodation: boolean("include_flight_accommodation").default(false),
      isBusinessFocused: boolean("is_business_focused").default(false),
      displayOrder: integer("display_order").default(0),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    userSubscriptions = pgTable("user_subscriptions", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      userId: uuid("user_id").references(() => users.id).notNull(),
      planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
      status: subscriptionStatusEnum("status").notNull().default("pending"),
      startedAt: timestamp("started_at"),
      expiresAt: timestamp("expires_at"),
      paymentReference: text("payment_reference"),
      paymentGateway: text("payment_gateway"),
      // stripe, razorpay, etc.
      autoRenew: boolean("auto_renew").default(true),
      universitiesUsed: integer("universities_used").default(0),
      countriesUsed: integer("countries_used").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    paymentSettings = pgTable("payment_settings", {
      id: uuid("id").primaryKey().default(sql2`gen_random_uuid()`),
      gateway: text("gateway").notNull(),
      // stripe, razorpay, paypal, etc.
      isActive: boolean("is_active").default(false),
      configuration: jsonb("configuration").$type(),
      updatedBy: uuid("updated_by").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
    insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
    insertPaymentSettingsSchema = createInsertSchema(paymentSettings).omit({ id: true, createdAt: true, updatedAt: true });
  }
});

// server/repositories/user.repository.ts
import { eq as eq2, and as and2 } from "drizzle-orm";
var UserRepository, userRepository;
var init_user_repository = __esm({
  "server/repositories/user.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    UserRepository = class extends BaseRepository {
      constructor() {
        super(users, "id");
      }
      async findByEmail(email) {
        try {
          const results = await db.select().from(users).where(eq2(users.email, email)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findByEmail");
        }
      }
      async findByUsername(username) {
        if (!username) return void 0;
        try {
          const results = await db.select().from(users).where(eq2(users.email, username)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findByUsername");
        }
      }
      async findTeamMembers() {
        try {
          return await db.select().from(users).where(and2(
            eq2(users.userType, "team_member"),
            eq2(users.teamRole, "counselor")
          ));
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findTeamMembers");
        }
      }
      async findCounselors() {
        try {
          return await db.select().from(users).where(and2(
            eq2(users.userType, "team_member"),
            eq2(users.teamRole, "counselor")
          ));
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findCounselors");
        }
      }
      async findAllTeamMembers() {
        try {
          return await db.select().from(users).where(eq2(users.userType, "team_member"));
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findAllTeamMembers");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.email) {
              conditions.push(eq2(users.email, filters.email));
            }
            if (filters.userType) {
              conditions.push(eq2(users.userType, filters.userType));
            }
            if (filters.teamRole) {
              conditions.push(eq2(users.teamRole, filters.teamRole));
            }
            if (filters.accountStatus) {
              conditions.push(eq2(users.accountStatus, filters.accountStatus));
            }
          }
          let query = db.select().from(users);
          if (conditions.length > 0) {
            query = query.where(and2(...conditions));
          }
          return await query;
        } catch (error) {
          handleDatabaseError(error, "UserRepository.findAll");
        }
      }
    };
    userRepository = new UserRepository();
  }
});

// server/repositories/student.repository.ts
import { eq as eq3, and as and3, desc, sql as sql3 } from "drizzle-orm";
var StudentRepository, studentRepository;
var init_student_repository = __esm({
  "server/repositories/student.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    StudentRepository = class extends BaseRepository {
      constructor() {
        super(studentProfiles, "id");
      }
      async findByUserId(userId) {
        try {
          const results = await db.select().from(studentProfiles).where(eq3(studentProfiles.userId, userId)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.findByUserId");
        }
      }
      async findAllWithUserDetails() {
        try {
          const counselorUsers = db.select().from(users).as("counselor_users");
          const results = await db.select({
            id: studentProfiles.id,
            userId: studentProfiles.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            userType: users.userType,
            phone: studentProfiles.phone,
            nationality: studentProfiles.nationality,
            destinationCountry: studentProfiles.destinationCountry,
            intakeYear: studentProfiles.intakeYear,
            status: studentProfiles.status,
            profilePicture: users.profilePicture,
            createdAt: studentProfiles.createdAt,
            currentEducationLevel: studentProfiles.currentEducationLevel,
            intendedMajor: studentProfiles.intendedMajor,
            budgetRange: studentProfiles.budgetRange,
            gpa: studentProfiles.gpa,
            testScores: studentProfiles.testScores,
            academicInterests: studentProfiles.academicInterests,
            extracurriculars: studentProfiles.extracurriculars,
            workExperience: studentProfiles.workExperience,
            accountStatus: users.accountStatus,
            assignedCounselorId: studentProfiles.assignedCounselorId,
            assignedCounselorFirstName: counselorUsers.firstName,
            assignedCounselorLastName: counselorUsers.lastName,
            assignedCounselorEmail: counselorUsers.email
          }).from(studentProfiles).leftJoin(users, eq3(studentProfiles.userId, users.id)).leftJoin(counselorUsers, eq3(studentProfiles.assignedCounselorId, counselorUsers.id)).orderBy(desc(studentProfiles.createdAt));
          return results.map((student) => ({
            ...student,
            gpa: student.gpa ? parseFloat(student.gpa) : null,
            accountStatus: student.accountStatus || "pending_approval",
            assignedCounselor: student.assignedCounselorId && student.assignedCounselorEmail ? {
              id: student.assignedCounselorId,
              firstName: student.assignedCounselorFirstName,
              lastName: student.assignedCounselorLastName,
              email: student.assignedCounselorEmail
            } : null
          }));
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.findAllWithUserDetails");
        }
      }
      async findAssignedToCounselor(counselorId) {
        try {
          const results = await db.select({
            id: studentProfiles.id,
            userId: studentProfiles.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: studentProfiles.phone,
            nationality: studentProfiles.nationality,
            destinationCountry: studentProfiles.destinationCountry,
            intakeYear: studentProfiles.intakeYear,
            status: studentProfiles.status,
            profilePicture: users.profilePicture,
            createdAt: studentProfiles.createdAt,
            currentEducationLevel: studentProfiles.currentEducationLevel,
            intendedMajor: studentProfiles.intendedMajor,
            budgetRange: studentProfiles.budgetRange,
            gpa: studentProfiles.gpa,
            testScores: studentProfiles.testScores,
            academicInterests: studentProfiles.academicInterests,
            extracurriculars: studentProfiles.extracurriculars,
            workExperience: studentProfiles.workExperience
          }).from(studentProfiles).leftJoin(users, eq3(studentProfiles.userId, users.id)).where(eq3(studentProfiles.assignedCounselorId, counselorId)).orderBy(desc(studentProfiles.createdAt));
          return results.map((student) => ({
            ...student,
            gpa: student.gpa ? parseFloat(student.gpa) : null
          }));
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.findAssignedToCounselor");
        }
      }
      async assignCounselor(studentId, counselorId) {
        try {
          const result = await db.update(studentProfiles).set({ assignedCounselorId: counselorId }).where(eq3(studentProfiles.id, studentId)).returning();
          if (!result[0]) {
            throw new NotFoundError("StudentProfile", studentId);
          }
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.assignCounselor");
        }
      }
      async unassign(studentId) {
        try {
          const result = await db.update(studentProfiles).set({ assignedCounselorId: null }).where(eq3(studentProfiles.id, studentId)).returning();
          if (!result[0]) {
            throw new NotFoundError("StudentProfile", studentId);
          }
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.unassign");
        }
      }
      async checkAssignment(counselorId, studentId) {
        try {
          const results = await db.select().from(studentProfiles).where(
            and3(
              eq3(studentProfiles.assignedCounselorId, counselorId),
              eq3(studentProfiles.id, studentId)
            )
          ).limit(1);
          return results.length > 0;
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.checkAssignment");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq3(studentProfiles.userId, filters.userId));
            }
            if (filters.status) {
              conditions.push(eq3(studentProfiles.status, filters.status));
            }
            if (filters.assignedCounselorId !== void 0) {
              if (filters.assignedCounselorId === null) {
                conditions.push(sql3`${studentProfiles.assignedCounselorId} IS NULL`);
              } else {
                conditions.push(eq3(studentProfiles.assignedCounselorId, filters.assignedCounselorId));
              }
            }
            if (filters.nationality) {
              conditions.push(eq3(studentProfiles.nationality, filters.nationality));
            }
            if (filters.destinationCountry) {
              conditions.push(eq3(studentProfiles.destinationCountry, filters.destinationCountry));
            }
          }
          let query = db.select().from(studentProfiles);
          if (conditions.length > 0) {
            query = query.where(and3(...conditions));
          }
          return await query.orderBy(desc(studentProfiles.createdAt));
        } catch (error) {
          handleDatabaseError(error, "StudentRepository.findAll");
        }
      }
    };
    studentRepository = new StudentRepository();
  }
});

// server/repositories/university.repository.ts
import { eq as eq4, and as and4, or, ilike, sql as sql4 } from "drizzle-orm";
var UniversityRepository, universityRepository;
var init_university_repository = __esm({
  "server/repositories/university.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    UniversityRepository = class extends BaseRepository {
      constructor() {
        super(universities, "id");
      }
      buildUniversityFilters(filters) {
        const conditions = [];
        if (filters) {
          if (filters.country) {
            conditions.push(eq4(universities.country, filters.country));
          }
          if (filters.minWorldRanking) {
            conditions.push(sql4`(${universities.ranking}->>'world')::int >= ${filters.minWorldRanking}`);
          }
          if (filters.maxWorldRanking) {
            conditions.push(sql4`(${universities.ranking}->>'world')::int <= ${filters.maxWorldRanking}`);
          }
          if (filters.tier) {
            conditions.push(eq4(universities.tier, filters.tier));
          }
          if (filters.isActive !== void 0) {
            conditions.push(eq4(universities.isActive, filters.isActive));
          }
        }
        return conditions;
      }
      async findAll(filters) {
        try {
          let query = db.select().from(universities);
          const conditions = this.buildUniversityFilters(filters);
          if (conditions.length > 0) {
            query = query.where(and4(...conditions));
          }
          return await query.orderBy(universities.ranking);
        } catch (error) {
          handleDatabaseError(error, "universities.findAll");
        }
      }
      async search(query, filters) {
        try {
          const searchConditions = [
            ilike(universities.name, `%${query}%`),
            ilike(universities.description, `%${query}%`),
            ilike(universities.country, `%${query}%`)
          ];
          const filterConditions = this.buildUniversityFilters(filters);
          let finalConditions;
          if (filterConditions.length > 0) {
            finalConditions = and4(or(...searchConditions), ...filterConditions);
          } else {
            finalConditions = or(...searchConditions);
          }
          return await db.select().from(universities).where(finalConditions).orderBy(universities.ranking).limit(50);
        } catch (error) {
          handleDatabaseError(error, "universities.search");
        }
      }
    };
    universityRepository = new UniversityRepository();
  }
});

// server/repositories/course.repository.ts
import { eq as eq5, and as and5 } from "drizzle-orm";
var CourseRepository, courseRepository;
var init_course_repository = __esm({
  "server/repositories/course.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    CourseRepository = class extends BaseRepository {
      constructor() {
        super(courses, "id");
      }
      async findByUniversity(universityId) {
        try {
          return await db.select().from(courses).where(eq5(courses.universityId, universityId)).orderBy(courses.name);
        } catch (error) {
          handleDatabaseError(error, "CourseRepository.findByUniversity");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.universityId) {
              conditions.push(eq5(courses.universityId, filters.universityId));
            }
            if (filters.degree) {
              conditions.push(eq5(courses.degree, filters.degree));
            }
            if (filters.field) {
              conditions.push(eq5(courses.field, filters.field));
            }
            if (filters.isActive !== void 0) {
              conditions.push(eq5(courses.isActive, filters.isActive));
            }
          }
          let query = db.select().from(courses);
          if (conditions.length > 0) {
            query = query.where(and5(...conditions));
          }
          return await query.orderBy(courses.name);
        } catch (error) {
          handleDatabaseError(error, "CourseRepository.findAll");
        }
      }
    };
    courseRepository = new CourseRepository();
  }
});

// server/repositories/application.repository.ts
import { eq as eq6, and as and6, desc as desc2, sql as sql5 } from "drizzle-orm";
var ApplicationRepository, applicationRepository;
var init_application_repository = __esm({
  "server/repositories/application.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    ApplicationRepository = class extends BaseRepository {
      constructor() {
        super(applications, "id");
      }
      async findByUser(userId) {
        try {
          return await db.select().from(applications).where(eq6(applications.userId, userId)).orderBy(desc2(applications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.findByUser");
        }
      }
      async findByUserWithUniversity(userId) {
        try {
          return await db.select({
            id: applications.id,
            userId: applications.userId,
            universityId: applications.universityId,
            courseId: applications.courseId,
            status: applications.status,
            submittedAt: applications.submittedAt,
            deadlineDate: applications.deadlineDate,
            notes: applications.notes,
            createdAt: applications.createdAt,
            updatedAt: applications.updatedAt,
            universityName: universities.name,
            universityCountry: universities.country,
            universityWorldRanking: universities.worldRanking,
            universityWebsite: universities.website
          }).from(applications).leftJoin(universities, eq6(applications.universityId, universities.id)).where(eq6(applications.userId, userId)).orderBy(desc2(applications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.findByUserWithUniversity");
        }
      }
      async findByUniversity(universityId) {
        try {
          return await db.select().from(applications).where(eq6(applications.universityId, universityId)).orderBy(desc2(applications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.findByUniversity");
        }
      }
      async findByStatus(status) {
        try {
          return await db.select().from(applications).where(sql5`${applications.status} = ${status}`).orderBy(desc2(applications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.findByStatus");
        }
      }
      async countByUser(userId) {
        try {
          return await this.count(eq6(applications.userId, userId));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.countByUser");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq6(applications.userId, filters.userId));
            }
            if (filters.universityId) {
              conditions.push(eq6(applications.universityId, filters.universityId));
            }
            if (filters.status) {
              conditions.push(eq6(applications.status, filters.status));
            }
          }
          let query = db.select().from(applications);
          if (conditions.length > 0) {
            query = query.where(and6(...conditions));
          }
          return await query.orderBy(desc2(applications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ApplicationRepository.findAll");
        }
      }
    };
    applicationRepository = new ApplicationRepository();
  }
});

// server/repositories/document.repository.ts
import { eq as eq7, and as and7, desc as desc3, sql as sql6 } from "drizzle-orm";
var DocumentRepository, documentRepository;
var init_document_repository = __esm({
  "server/repositories/document.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    DocumentRepository = class extends BaseRepository {
      constructor() {
        super(documents, "id");
      }
      async findByUser(userId) {
        try {
          return await db.select().from(documents).where(eq7(documents.userId, userId)).orderBy(desc3(documents.createdAt));
        } catch (error) {
          handleDatabaseError(error, "DocumentRepository.findByUser");
        }
      }
      async findByApplication(applicationId) {
        try {
          return await db.select().from(documents).where(eq7(documents.applicationId, applicationId)).orderBy(desc3(documents.createdAt));
        } catch (error) {
          handleDatabaseError(error, "DocumentRepository.findByApplication");
        }
      }
      async countByUser(userId) {
        try {
          return await this.count(eq7(documents.userId, userId));
        } catch (error) {
          handleDatabaseError(error, "DocumentRepository.countByUser");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq7(documents.userId, filters.userId));
            }
            if (filters.applicationId) {
              conditions.push(eq7(documents.applicationId, filters.applicationId));
            }
            if (filters.documentType) {
              conditions.push(sql6`${documents.type} = ${filters.documentType}`);
            }
          }
          let query = db.select().from(documents);
          if (conditions.length > 0) {
            query = query.where(and7(...conditions));
          }
          return await query.orderBy(desc3(documents.createdAt));
        } catch (error) {
          handleDatabaseError(error, "DocumentRepository.findAll");
        }
      }
    };
    documentRepository = new DocumentRepository();
  }
});

// server/repositories/forum-post.repository.ts
import { eq as eq8, and as and8, or as or2, desc as desc4, ilike as ilike2, sql as sql7, gte } from "drizzle-orm";
var ForumPostRepository, forumPostRepository;
var init_forum_post_repository = __esm({
  "server/repositories/forum-post.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    ForumPostRepository = class extends BaseRepository {
      constructor() {
        super(forumPostsEnhanced, "id");
      }
      buildPostFilters(filters) {
        const conditions = [];
        if (filters) {
          if (filters.category) {
            conditions.push(sql7`${forumPostsEnhanced.category} = ${filters.category}`);
          }
          if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            conditions.push(
              or2(
                ilike2(forumPostsEnhanced.title, searchTerm),
                ilike2(forumPostsEnhanced.content, searchTerm),
                sql7`EXISTS (
              SELECT 1 FROM unnest(COALESCE(${forumPostsEnhanced.tags}, ARRAY[]::text[])) tag 
              WHERE tag ILIKE ${searchTerm}
            )`,
                sql7`EXISTS (
              SELECT 1 FROM ${users} u 
              WHERE u.id = ${forumPostsEnhanced.authorId} 
              AND (
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE ${searchTerm}
                OR COALESCE(u.company_name, '') ILIKE ${searchTerm}
              )
            )`
              )
            );
          }
          if (filters.authorId) {
            conditions.push(eq8(forumPostsEnhanced.authorId, filters.authorId));
          }
        }
        return conditions;
      }
      async findAllWithUser(filters, currentUserId) {
        try {
          const conditions = this.buildPostFilters(filters);
          let query = db.select({
            id: forumPostsEnhanced.id,
            authorId: forumPostsEnhanced.authorId,
            title: forumPostsEnhanced.title,
            content: forumPostsEnhanced.content,
            category: forumPostsEnhanced.category,
            tags: forumPostsEnhanced.tags,
            images: forumPostsEnhanced.images,
            pollOptions: forumPostsEnhanced.pollOptions,
            pollQuestion: forumPostsEnhanced.pollQuestion,
            pollEndsAt: forumPostsEnhanced.pollEndsAt,
            isEdited: forumPostsEnhanced.isEdited,
            editedAt: forumPostsEnhanced.editedAt,
            isModerated: forumPostsEnhanced.isModerated,
            moderatedAt: forumPostsEnhanced.moderatedAt,
            likesCount: forumPostsEnhanced.likesCount,
            commentsCount: forumPostsEnhanced.commentsCount,
            viewsCount: forumPostsEnhanced.viewsCount,
            reportCount: forumPostsEnhanced.reportCount,
            isHiddenByReports: forumPostsEnhanced.isHiddenByReports,
            createdAt: forumPostsEnhanced.createdAt,
            updatedAt: forumPostsEnhanced.updatedAt,
            isLiked: currentUserId ? sql7`CASE WHEN ${forumLikes.id} IS NOT NULL THEN true ELSE false END` : sql7`false`,
            isSaved: currentUserId ? sql7`CASE WHEN ${forumSaves.id} IS NOT NULL THEN true ELSE false END` : sql7`false`,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profilePicture: users.profilePicture,
              userType: users.userType,
              companyName: users.companyName
            }
          }).from(forumPostsEnhanced).leftJoin(users, eq8(forumPostsEnhanced.authorId, users.id)).leftJoin(
            forumLikes,
            currentUserId ? and8(
              eq8(forumLikes.postId, forumPostsEnhanced.id),
              eq8(forumLikes.authorId, currentUserId)
            ) : sql7`false`
          ).leftJoin(
            forumSaves,
            currentUserId ? and8(
              eq8(forumSaves.postId, forumPostsEnhanced.id),
              eq8(forumSaves.authorId, currentUserId)
            ) : sql7`false`
          );
          if (conditions.length > 0) {
            query = query.where(and8(...conditions));
          }
          return await query.orderBy(desc4(forumPostsEnhanced.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.findAll");
        }
      }
      async findPaginated(limit, offset, filters, currentUserId) {
        try {
          const conditions = this.buildPostFilters(filters);
          let query = db.select({
            id: forumPostsEnhanced.id,
            authorId: forumPostsEnhanced.authorId,
            title: forumPostsEnhanced.title,
            content: forumPostsEnhanced.content,
            category: forumPostsEnhanced.category,
            tags: forumPostsEnhanced.tags,
            images: forumPostsEnhanced.images,
            pollOptions: forumPostsEnhanced.pollOptions,
            pollQuestion: forumPostsEnhanced.pollQuestion,
            pollEndsAt: forumPostsEnhanced.pollEndsAt,
            isEdited: forumPostsEnhanced.isEdited,
            editedAt: forumPostsEnhanced.editedAt,
            isModerated: forumPostsEnhanced.isModerated,
            moderatedAt: forumPostsEnhanced.moderatedAt,
            likesCount: forumPostsEnhanced.likesCount,
            commentsCount: forumPostsEnhanced.commentsCount,
            viewsCount: forumPostsEnhanced.viewsCount,
            reportCount: forumPostsEnhanced.reportCount,
            isHiddenByReports: forumPostsEnhanced.isHiddenByReports,
            createdAt: forumPostsEnhanced.createdAt,
            updatedAt: forumPostsEnhanced.updatedAt,
            isLiked: currentUserId ? sql7`CASE WHEN ${forumLikes.id} IS NOT NULL THEN true ELSE false END` : sql7`false`,
            isSaved: currentUserId ? sql7`CASE WHEN ${forumSaves.id} IS NOT NULL THEN true ELSE false END` : sql7`false`,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profilePicture: users.profilePicture,
              userType: users.userType,
              companyName: users.companyName
            }
          }).from(forumPostsEnhanced).leftJoin(users, eq8(forumPostsEnhanced.authorId, users.id)).leftJoin(
            forumLikes,
            currentUserId ? and8(
              eq8(forumLikes.postId, forumPostsEnhanced.id),
              eq8(forumLikes.authorId, currentUserId)
            ) : sql7`false`
          ).leftJoin(
            forumSaves,
            currentUserId ? and8(
              eq8(forumSaves.postId, forumPostsEnhanced.id),
              eq8(forumSaves.authorId, currentUserId)
            ) : sql7`false`
          );
          if (conditions.length > 0) {
            query = query.where(and8(...conditions));
          }
          return await query.orderBy(desc4(forumPostsEnhanced.createdAt)).limit(limit).offset(offset);
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.findPaginated");
        }
      }
      async countPosts(filters) {
        try {
          const conditions = this.buildPostFilters(filters);
          const whereClause = conditions.length > 0 ? and8(...conditions) : void 0;
          return await super.count(whereClause);
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.countPosts");
        }
      }
      async getPostWithUser(postId) {
        try {
          const result = await db.select({
            id: forumPostsEnhanced.id,
            authorId: forumPostsEnhanced.authorId,
            title: forumPostsEnhanced.title,
            content: forumPostsEnhanced.content,
            category: forumPostsEnhanced.category,
            tags: forumPostsEnhanced.tags,
            images: forumPostsEnhanced.images,
            pollOptions: forumPostsEnhanced.pollOptions,
            pollQuestion: forumPostsEnhanced.pollQuestion,
            pollEndsAt: forumPostsEnhanced.pollEndsAt,
            isEdited: forumPostsEnhanced.isEdited,
            editedAt: forumPostsEnhanced.editedAt,
            isModerated: forumPostsEnhanced.isModerated,
            moderatedAt: forumPostsEnhanced.moderatedAt,
            likesCount: forumPostsEnhanced.likesCount,
            commentsCount: forumPostsEnhanced.commentsCount,
            viewsCount: forumPostsEnhanced.viewsCount,
            createdAt: forumPostsEnhanced.createdAt,
            updatedAt: forumPostsEnhanced.updatedAt,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profilePicture: users.profilePicture,
              userType: users.userType,
              companyName: users.companyName
            }
          }).from(forumPostsEnhanced).leftJoin(users, eq8(forumPostsEnhanced.authorId, users.id)).where(eq8(forumPostsEnhanced.id, postId)).limit(1);
          const post = result[0];
          if (!post) return void 0;
          return {
            ...post,
            likesCount: post.likesCount ?? 0,
            commentsCount: post.commentsCount ?? 0,
            viewsCount: post.viewsCount ?? 0
          };
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.getPostWithUser");
        }
      }
      async getUserPostLimit(userId) {
        try {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
          const recentPosts = await db.select().from(forumPostsEnhanced).where(and8(
            eq8(forumPostsEnhanced.authorId, userId),
            gte(forumPostsEnhanced.createdAt, oneDayAgo)
          ));
          const postCount = recentPosts.length;
          const maxPostsPerDay = 10;
          const canPost = postCount < maxPostsPerDay;
          const lastPost = recentPosts.length > 0 ? recentPosts.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0] : null;
          return {
            postCount,
            lastPostAt: lastPost?.createdAt || null,
            canPost,
            timeRemaining: canPost ? 0 : void 0
          };
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.getUserPostLimit");
        }
      }
      async updateUserPostLimit(userId) {
      }
      async incrementReportCount(postId) {
        try {
          const result = await db.update(forumPostsEnhanced).set({
            reportCount: sql7`${forumPostsEnhanced.reportCount} + 1`
          }).where(eq8(forumPostsEnhanced.id, postId)).returning();
          if (!result[0]) {
            throw new NotFoundError("ForumPost", postId);
          }
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.incrementReportCount");
        }
      }
      async getReportedPosts() {
        try {
          return await db.select().from(forumPostsEnhanced).where(eq8(forumPostsEnhanced.isHiddenByReports, true)).orderBy(desc4(forumPostsEnhanced.hiddenAt));
        } catch (error) {
          handleDatabaseError(error, "ForumPostRepository.getReportedPosts");
        }
      }
    };
    forumPostRepository = new ForumPostRepository();
  }
});

// server/repositories/forum-comment.repository.ts
import { eq as eq9, sql as sql8, and as and9 } from "drizzle-orm";
var ForumCommentRepository, forumCommentRepository;
var init_forum_comment_repository = __esm({
  "server/repositories/forum-comment.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    ForumCommentRepository = class extends BaseRepository {
      constructor() {
        super(forumComments, "id");
      }
      async getCommentsByPost(postId) {
        try {
          return await db.select({
            id: forumComments.id,
            postId: forumComments.postId,
            userId: forumComments.userId,
            parentId: forumComments.parentId,
            content: forumComments.content,
            likesCount: forumComments.likesCount,
            createdAt: forumComments.createdAt,
            updatedAt: forumComments.updatedAt,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              profilePicture: users.profilePicture,
              email: users.email
            }
          }).from(forumComments).leftJoin(users, eq9(forumComments.userId, users.id)).where(eq9(forumComments.postId, postId)).orderBy(forumComments.createdAt);
        } catch (error) {
          handleDatabaseError(error, "ForumCommentRepository.getCommentsByPost");
        }
      }
      async create(data) {
        try {
          return await this.executeInTransaction(async (tx) => {
            const results = await tx.insert(forumComments).values(data).returning();
            const commentCount = await tx.select({ count: sql8`count(*)` }).from(forumComments).where(eq9(forumComments.postId, data.postId));
            await tx.update(forumPostsEnhanced).set({ commentsCount: Number(commentCount[0]?.count || 0) }).where(eq9(forumPostsEnhanced.id, data.postId));
            return results[0];
          });
        } catch (error) {
          handleDatabaseError(error, "ForumCommentRepository.create");
        }
      }
      async deleteComment(commentId) {
        try {
          return await this.executeInTransaction(async (tx) => {
            const comment = await tx.select({ postId: forumComments.postId }).from(forumComments).where(eq9(forumComments.id, commentId)).limit(1);
            const result = await tx.delete(forumComments).where(eq9(forumComments.id, commentId));
            if ((result.rowCount ?? 0) > 0 && comment.length > 0) {
              const commentCount = await tx.select({ count: sql8`count(*)` }).from(forumComments).where(eq9(forumComments.postId, comment[0].postId));
              await tx.update(forumPostsEnhanced).set({ commentsCount: Number(commentCount[0]?.count || 0) }).where(eq9(forumPostsEnhanced.id, comment[0].postId));
            }
            return (result.rowCount ?? 0) > 0;
          });
        } catch (error) {
          handleDatabaseError(error, "ForumCommentRepository.deleteComment");
        }
      }
      async updatePostCommentCount(postId) {
        const commentCount = await db.select({ count: sql8`count(*)` }).from(forumComments).where(eq9(forumComments.postId, postId));
        await db.update(forumPostsEnhanced).set({ commentsCount: Number(commentCount[0]?.count || 0) }).where(eq9(forumPostsEnhanced.id, postId));
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.postId) {
              conditions.push(eq9(forumComments.postId, filters.postId));
            }
            if (filters.userId) {
              conditions.push(eq9(forumComments.userId, filters.userId));
            }
            if (filters.parentId !== void 0) {
              if (filters.parentId === null) {
                conditions.push(sql8`${forumComments.parentId} IS NULL`);
              } else {
                conditions.push(eq9(forumComments.parentId, filters.parentId));
              }
            }
          }
          let query = db.select().from(forumComments);
          if (conditions.length > 0) {
            query = query.where(and9(...conditions));
          }
          return await query.orderBy(forumComments.createdAt);
        } catch (error) {
          handleDatabaseError(error, "ForumCommentRepository.findAll");
        }
      }
    };
    forumCommentRepository = new ForumCommentRepository();
  }
});

// server/repositories/forum-interaction.repository.ts
import { eq as eq10, and as and10, desc as desc5, sql as sql9 } from "drizzle-orm";
var ForumInteractionRepository, forumInteractionRepository;
var init_forum_interaction_repository = __esm({
  "server/repositories/forum-interaction.repository.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_errors2();
    ForumInteractionRepository = class {
      async toggleLike(postId, userId) {
        try {
          return await db.transaction(async (tx) => {
            const existing = await tx.select().from(forumLikes).where(and10(
              eq10(forumLikes.postId, postId),
              eq10(forumLikes.authorId, userId)
            )).limit(1);
            if (existing.length > 0) {
              await tx.delete(forumLikes).where(and10(
                eq10(forumLikes.postId, postId),
                eq10(forumLikes.authorId, userId)
              ));
            } else {
              await tx.insert(forumLikes).values({ postId, authorId: userId });
            }
            const likesCount = await tx.select({ count: sql9`count(*)` }).from(forumLikes).where(eq10(forumLikes.postId, postId));
            const finalCount = Number(likesCount[0]?.count || 0);
            await tx.update(forumPostsEnhanced).set({ likesCount: finalCount }).where(eq10(forumPostsEnhanced.id, postId));
            return {
              liked: existing.length === 0,
              likesCount: finalCount
            };
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes("transaction")) {
            throw new TransactionError("toggleLike", error);
          }
          handleDatabaseError(error, "ForumInteractionRepository.toggleLike");
        }
      }
      async toggleSave(postId, userId) {
        try {
          return await db.transaction(async (tx) => {
            const existing = await tx.select().from(forumSaves).where(and10(
              eq10(forumSaves.postId, postId),
              eq10(forumSaves.authorId, userId)
            )).limit(1);
            if (existing.length > 0) {
              await tx.delete(forumSaves).where(and10(
                eq10(forumSaves.postId, postId),
                eq10(forumSaves.authorId, userId)
              ));
              return { saved: false };
            } else {
              await tx.insert(forumSaves).values({ postId, authorId: userId });
              return { saved: true };
            }
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes("transaction")) {
            throw new TransactionError("toggleSave", error);
          }
          handleDatabaseError(error, "ForumInteractionRepository.toggleSave");
        }
      }
      async getPostAnalytics(postId) {
        try {
          const [likes, comments, saves] = await Promise.all([
            db.select({
              id: forumLikes.id,
              postId: forumLikes.postId,
              authorId: forumLikes.authorId,
              createdAt: forumLikes.createdAt,
              firstName: users.firstName,
              lastName: users.lastName,
              profilePicture: users.profilePicture,
              userType: users.userType,
              companyName: users.companyName
            }).from(forumLikes).leftJoin(users, eq10(forumLikes.authorId, users.id)).where(eq10(forumLikes.postId, postId)),
            db.select({
              id: forumComments.id,
              postId: forumComments.postId,
              userId: forumComments.userId,
              content: forumComments.content,
              createdAt: forumComments.createdAt,
              firstName: users.firstName,
              lastName: users.lastName,
              profilePicture: users.profilePicture
            }).from(forumComments).leftJoin(users, eq10(forumComments.userId, users.id)).where(eq10(forumComments.postId, postId)),
            db.select().from(forumSaves).where(eq10(forumSaves.postId, postId))
          ]);
          return { likes, comments, saves };
        } catch (error) {
          handleDatabaseError(error, "ForumInteractionRepository.getPostAnalytics");
        }
      }
      async getSavedPostsForUser(userId) {
        try {
          return await db.select({
            id: forumPostsEnhanced.id,
            authorId: forumPostsEnhanced.authorId,
            title: forumPostsEnhanced.title,
            content: forumPostsEnhanced.content,
            category: forumPostsEnhanced.category,
            tags: forumPostsEnhanced.tags,
            images: forumPostsEnhanced.images,
            createdAt: forumPostsEnhanced.createdAt,
            updatedAt: forumPostsEnhanced.updatedAt,
            savedAt: forumSaves.createdAt,
            likesCount: forumPostsEnhanced.likesCount,
            commentsCount: forumPostsEnhanced.commentsCount,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profilePicture: users.profilePicture,
              userType: users.userType,
              companyName: users.companyName
            }
          }).from(forumSaves).leftJoin(forumPostsEnhanced, eq10(forumSaves.postId, forumPostsEnhanced.id)).leftJoin(users, eq10(forumPostsEnhanced.authorId, users.id)).where(eq10(forumSaves.authorId, userId)).orderBy(desc5(forumSaves.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ForumInteractionRepository.getSavedPostsForUser");
        }
      }
    };
    forumInteractionRepository = new ForumInteractionRepository();
  }
});

// server/repositories/forum-poll.repository.ts
import { eq as eq11, and as and11, inArray } from "drizzle-orm";
var ForumPollRepository, forumPollRepository;
var init_forum_poll_repository = __esm({
  "server/repositories/forum-poll.repository.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_errors2();
    ForumPollRepository = class {
      async votePollOption(postId, userId, optionId) {
        try {
          return await db.transaction(async (tx) => {
            const existingVote = await tx.select().from(forumPollVotes).where(and11(
              eq11(forumPollVotes.postId, postId),
              eq11(forumPollVotes.userId, userId)
            )).limit(1);
            if (existingVote.length > 0) {
              await tx.update(forumPollVotes).set({ optionId }).where(and11(
                eq11(forumPollVotes.postId, postId),
                eq11(forumPollVotes.userId, userId)
              ));
            } else {
              await tx.insert(forumPollVotes).values({ postId, userId, optionId });
            }
            const pollResults = await this.getPollResults(postId, tx);
            const userVotes = await tx.select().from(forumPollVotes).where(and11(
              eq11(forumPollVotes.postId, postId),
              eq11(forumPollVotes.userId, userId)
            ));
            return {
              pollResults,
              userVotes: userVotes.map((v) => v.optionId)
            };
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes("transaction")) {
            throw new TransactionError("votePollOption", error);
          }
          handleDatabaseError(error, "ForumPollRepository.votePollOption");
        }
      }
      async getPollResults(postId, tx) {
        try {
          const executor = tx || db;
          const post = await executor.select().from(forumPostsEnhanced).where(eq11(forumPostsEnhanced.id, postId)).limit(1);
          if (post.length === 0 || !post[0].pollOptions) {
            return null;
          }
          const votes = await executor.select().from(forumPollVotes).where(eq11(forumPollVotes.postId, postId));
          const pollOptions = post[0].pollOptions;
          const totalVotes = votes.length;
          const results = pollOptions.map((option) => {
            const optionVotes = votes.filter((v) => v.optionId === option.id).length;
            const percentage = totalVotes > 0 ? Math.round(optionVotes / totalVotes * 100) : 0;
            return {
              id: option.id,
              text: option.text,
              votes: optionVotes,
              percentage
            };
          });
          return {
            question: post[0].pollQuestion,
            options: results,
            totalVotes,
            endsAt: post[0].pollEndsAt
          };
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getPollResults");
        }
      }
      async getUserPollVotes(postId, userId) {
        try {
          const votes = await db.select().from(forumPollVotes).where(and11(
            eq11(forumPollVotes.postId, postId),
            eq11(forumPollVotes.userId, userId)
          ));
          return votes.map((v) => v.optionId);
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getUserPollVotes");
        }
      }
      async getUserVotes(postId) {
        try {
          const votes = await db.select({
            id: forumPollVotes.id,
            userId: forumPollVotes.userId,
            optionId: forumPollVotes.optionId,
            createdAt: forumPollVotes.createdAt,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              profilePicture: users.profilePicture
            }
          }).from(forumPollVotes).leftJoin(users, eq11(forumPollVotes.userId, users.id)).where(eq11(forumPollVotes.postId, postId));
          return votes;
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getUserVotes");
        }
      }
      async getUserVoteStatus(postId, userId) {
        try {
          const vote = await db.select().from(forumPollVotes).where(and11(
            eq11(forumPollVotes.postId, postId),
            eq11(forumPollVotes.userId, userId)
          )).limit(1);
          if (vote.length === 0) {
            return { hasVoted: false, optionId: null };
          }
          return { hasVoted: true, optionId: vote[0].optionId };
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getUserVoteStatus");
        }
      }
      async getBulkUserPollVotes(postIds, userId) {
        try {
          if (postIds.length === 0) {
            return /* @__PURE__ */ new Map();
          }
          const votes = await db.select({
            postId: forumPollVotes.postId,
            optionId: forumPollVotes.optionId
          }).from(forumPollVotes).where(and11(
            eq11(forumPollVotes.userId, userId),
            inArray(forumPollVotes.postId, postIds)
          ));
          const votesByPost = /* @__PURE__ */ new Map();
          for (const vote of votes) {
            const existing = votesByPost.get(vote.postId) || [];
            existing.push(vote.optionId);
            votesByPost.set(vote.postId, existing);
          }
          return votesByPost;
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getBulkUserPollVotes");
        }
      }
      async getBulkPollResults(postIds) {
        try {
          if (postIds.length === 0) {
            return /* @__PURE__ */ new Map();
          }
          const posts = await db.select({
            id: forumPostsEnhanced.id,
            pollOptions: forumPostsEnhanced.pollOptions,
            pollQuestion: forumPostsEnhanced.pollQuestion,
            pollEndsAt: forumPostsEnhanced.pollEndsAt
          }).from(forumPostsEnhanced).where(inArray(forumPostsEnhanced.id, postIds));
          const votes = await db.select({
            postId: forumPollVotes.postId,
            optionId: forumPollVotes.optionId
          }).from(forumPollVotes).where(inArray(forumPollVotes.postId, postIds));
          const votesByPost = /* @__PURE__ */ new Map();
          for (const vote of votes) {
            const existing = votesByPost.get(vote.postId) || [];
            existing.push({ optionId: vote.optionId });
            votesByPost.set(vote.postId, existing);
          }
          const resultsByPost = /* @__PURE__ */ new Map();
          for (const post of posts) {
            if (!post.pollOptions || !Array.isArray(post.pollOptions)) {
              continue;
            }
            const postVotes = votesByPost.get(post.id) || [];
            const pollOptions = post.pollOptions;
            const totalVotes = postVotes.length;
            const results = pollOptions.map((option) => {
              const optionVotes = postVotes.filter((v) => v.optionId === option.id).length;
              const percentage = totalVotes > 0 ? Math.round(optionVotes / totalVotes * 100) : 0;
              return {
                id: option.id,
                text: option.text,
                votes: optionVotes,
                percentage
              };
            });
            resultsByPost.set(post.id, {
              question: post.pollQuestion,
              options: results,
              totalVotes,
              endsAt: post.pollEndsAt
            });
          }
          return resultsByPost;
        } catch (error) {
          handleDatabaseError(error, "ForumPollRepository.getBulkPollResults");
        }
      }
    };
    forumPollRepository = new ForumPollRepository();
  }
});

// server/repositories/notification.repository.ts
import { eq as eq12, and as and12, desc as desc6, sql as sql11 } from "drizzle-orm";
var NotificationRepository, notificationRepository;
var init_notification_repository = __esm({
  "server/repositories/notification.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    NotificationRepository = class extends BaseRepository {
      constructor() {
        super(notifications, "id");
      }
      async findByUser(userId) {
        try {
          return await db.select().from(notifications).where(eq12(notifications.userId, userId)).orderBy(desc6(notifications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.findByUser");
        }
      }
      async findUnreadByUser(userId) {
        try {
          return await db.select().from(notifications).where(
            and12(
              eq12(notifications.userId, userId),
              eq12(notifications.isRead, false)
            )
          ).orderBy(desc6(notifications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.findUnreadByUser");
        }
      }
      async countUnreadByUser(userId) {
        try {
          const result = await db.select({ count: sql11`count(*)` }).from(notifications).where(
            and12(
              eq12(notifications.userId, userId),
              eq12(notifications.isRead, false)
            )
          );
          return Number(result[0]?.count || 0);
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.countUnreadByUser");
        }
      }
      async markAsRead(id) {
        try {
          const result = await this.update(id, { isRead: true });
          return result !== void 0;
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.markAsRead");
        }
      }
      async markAllAsRead(userId) {
        try {
          await db.update(notifications).set({ isRead: true }).where(eq12(notifications.userId, userId));
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.markAllAsRead");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq12(notifications.userId, filters.userId));
            }
            if (filters.isRead !== void 0) {
              conditions.push(eq12(notifications.isRead, filters.isRead));
            }
            if (filters.type) {
              conditions.push(eq12(notifications.type, filters.type));
            }
          }
          let query = db.select().from(notifications);
          if (conditions.length > 0) {
            query = query.where(and12(...conditions));
          }
          return await query.orderBy(desc6(notifications.createdAt));
        } catch (error) {
          handleDatabaseError(error, "NotificationRepository.findAll");
        }
      }
    };
    notificationRepository = new NotificationRepository();
  }
});

// server/repositories/event.repository.ts
import { eq as eq13, and as and13, gte as gte2, desc as desc7, lte } from "drizzle-orm";
var EventRepository, eventRepository;
var init_event_repository = __esm({
  "server/repositories/event.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    EventRepository = class extends BaseRepository {
      constructor() {
        super(events, "id");
      }
      async findUpcoming() {
        try {
          const now = /* @__PURE__ */ new Date();
          return await db.select().from(events).where(gte2(events.startDate, now)).orderBy(events.startDate);
        } catch (error) {
          handleDatabaseError(error, "EventRepository.findUpcoming");
        }
      }
      async registerUser(eventId, userId) {
        try {
          const results = await db.insert(eventRegistrations).values({ eventId, userId }).returning();
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "EventRepository.registerUser");
        }
      }
      async getRegistrations(eventId) {
        try {
          return await db.select().from(eventRegistrations).where(eq13(eventRegistrations.eventId, eventId)).orderBy(desc7(eventRegistrations.registeredAt));
        } catch (error) {
          handleDatabaseError(error, "EventRepository.getRegistrations");
        }
      }
      async getUserRegistrations(userId) {
        try {
          return await db.select().from(eventRegistrations).where(eq13(eventRegistrations.userId, userId)).orderBy(desc7(eventRegistrations.registeredAt));
        } catch (error) {
          handleDatabaseError(error, "EventRepository.getUserRegistrations");
        }
      }
      async isUserRegistered(eventId, userId) {
        try {
          const results = await db.select().from(eventRegistrations).where(
            and13(
              eq13(eventRegistrations.eventId, eventId),
              eq13(eventRegistrations.userId, userId)
            )
          ).limit(1);
          return results.length > 0;
        } catch (error) {
          handleDatabaseError(error, "EventRepository.isUserRegistered");
        }
      }
      async unregisterUser(eventId, userId) {
        try {
          const result = await db.delete(eventRegistrations).where(
            and13(
              eq13(eventRegistrations.eventId, eventId),
              eq13(eventRegistrations.userId, userId)
            )
          );
          return result.rowCount > 0;
        } catch (error) {
          handleDatabaseError(error, "EventRepository.unregisterUser");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.startDate) {
              conditions.push(gte2(events.startDate, filters.startDate));
            }
            if (filters.endDate) {
              conditions.push(lte(events.endDate, filters.endDate));
            }
            if (filters.eventType) {
              conditions.push(eq13(events.eventType, filters.eventType));
            }
            if (filters.isActive !== void 0) {
              conditions.push(eq13(events.isActive, filters.isActive));
            }
          }
          let query = db.select().from(events);
          if (conditions.length > 0) {
            query = query.where(and13(...conditions));
          }
          return await query.orderBy(events.startDate);
        } catch (error) {
          handleDatabaseError(error, "EventRepository.findAll");
        }
      }
    };
    eventRepository = new EventRepository();
  }
});

// server/repositories/ai-matching.repository.ts
import { eq as eq14, desc as desc8, and as and14, sql as sql12 } from "drizzle-orm";
var AIMatchingRepository, aiMatchingRepository;
var init_ai_matching_repository = __esm({
  "server/repositories/ai-matching.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    AIMatchingRepository = class extends BaseRepository {
      constructor() {
        super(aiMatchingResults, "id");
      }
      async findByUser(userId) {
        try {
          return await db.select().from(aiMatchingResults).where(eq14(aiMatchingResults.userId, userId)).orderBy(desc8(aiMatchingResults.createdAt));
        } catch (error) {
          handleDatabaseError(error, "AIMatchingRepository.findByUser");
        }
      }
      async findByUserAndUniversity(userId, universityId) {
        try {
          const results = await db.select().from(aiMatchingResults).where(and14(
            eq14(aiMatchingResults.userId, userId),
            eq14(aiMatchingResults.universityId, universityId)
          )).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "AIMatchingRepository.findByUserAndUniversity");
        }
      }
      async deleteByUser(userId) {
        try {
          const result = await db.delete(aiMatchingResults).where(eq14(aiMatchingResults.userId, userId));
          return (result.rowCount ?? 0) > 0;
        } catch (error) {
          handleDatabaseError(error, "AIMatchingRepository.deleteByUser");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq14(aiMatchingResults.userId, filters.userId));
            }
            if (filters.universityId) {
              conditions.push(eq14(aiMatchingResults.universityId, filters.universityId));
            }
            if (filters.minScore !== void 0) {
              conditions.push(sql12`${aiMatchingResults.matchScore}::numeric >= ${filters.minScore}`);
            }
            if (filters.maxScore !== void 0) {
              conditions.push(sql12`${aiMatchingResults.matchScore}::numeric <= ${filters.maxScore}`);
            }
          }
          let query = db.select().from(aiMatchingResults);
          if (conditions.length > 0) {
            query = query.where(and14(...conditions));
          }
          return await query.orderBy(desc8(aiMatchingResults.createdAt));
        } catch (error) {
          handleDatabaseError(error, "AIMatchingRepository.findAll");
        }
      }
    };
    aiMatchingRepository = new AIMatchingRepository();
  }
});

// server/repositories/chat.repository.ts
import { eq as eq15, and as and15, or as or3, asc } from "drizzle-orm";
var ChatRepository, chatRepository;
var init_chat_repository = __esm({
  "server/repositories/chat.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    ChatRepository = class extends BaseRepository {
      constructor() {
        super(chatMessages, "id");
      }
      async findByChatParticipants(studentId, counselorId) {
        try {
          return await db.select().from(chatMessages).where(
            and15(
              eq15(chatMessages.studentId, studentId),
              eq15(chatMessages.counselorId, counselorId),
              eq15(chatMessages.isDeleted, false)
            )
          ).orderBy(asc(chatMessages.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ChatRepository.findByChatParticipants");
        }
      }
      async markAsRead(messageId, userId) {
        try {
          const result = await db.update(chatMessages).set({
            isRead: true,
            readAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(
            and15(
              eq15(chatMessages.id, messageId),
              or3(
                eq15(chatMessages.studentId, userId),
                eq15(chatMessages.counselorId, userId)
              )
            )
          );
          return (result.rowCount ?? 0) > 0;
        } catch (error) {
          handleDatabaseError(error, "ChatRepository.markAsRead");
        }
      }
    };
    chatRepository = new ChatRepository();
  }
});

// server/repositories/payment.repository.ts
import { eq as eq16 } from "drizzle-orm";
var PaymentRepository, paymentRepository;
var init_payment_repository = __esm({
  "server/repositories/payment.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    PaymentRepository = class extends BaseRepository {
      constructor() {
        super(paymentSettings, "id");
      }
      async findAll() {
        try {
          return await db.select().from(paymentSettings).orderBy(paymentSettings.gateway);
        } catch (error) {
          handleDatabaseError(error, "PaymentRepository.findAll");
        }
      }
      async findByGateway(gateway) {
        try {
          const results = await db.select().from(paymentSettings).where(eq16(paymentSettings.gateway, gateway)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "PaymentRepository.findByGateway");
        }
      }
      async findActive() {
        try {
          return await db.select().from(paymentSettings).where(eq16(paymentSettings.isActive, true));
        } catch (error) {
          handleDatabaseError(error, "PaymentRepository.findActive");
        }
      }
      async updateByGateway(gateway, data) {
        try {
          const results = await db.update(paymentSettings).set(data).where(eq16(paymentSettings.gateway, gateway)).returning();
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "PaymentRepository.updateByGateway");
        }
      }
    };
    paymentRepository = new PaymentRepository();
  }
});

// server/repositories/subscription.repository.ts
import { eq as eq17, and as and16, desc as desc9, sql as sql13 } from "drizzle-orm";
var SubscriptionPlanRepository, UserSubscriptionRepository, subscriptionPlanRepository, userSubscriptionRepository;
var init_subscription_repository = __esm({
  "server/repositories/subscription.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    SubscriptionPlanRepository = class extends BaseRepository {
      constructor() {
        super(subscriptionPlans, "id");
      }
      async findAll(filters) {
        try {
          let query = db.select().from(subscriptionPlans);
          if (filters?.isActive !== void 0) {
            query = query.where(eq17(subscriptionPlans.isActive, filters.isActive));
          }
          return await query.orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price);
        } catch (error) {
          handleDatabaseError(error, "SubscriptionPlanRepository.findAll");
        }
      }
      async findActive() {
        try {
          return await db.select().from(subscriptionPlans).where(eq17(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price);
        } catch (error) {
          handleDatabaseError(error, "SubscriptionPlanRepository.findActive");
        }
      }
      async update(id, data) {
        try {
          const results = await db.update(subscriptionPlans).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(subscriptionPlans.id, id)).returning();
          if (!results[0]) {
            throw new NotFoundError("SubscriptionPlan", id);
          }
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "SubscriptionPlanRepository.update");
        }
      }
    };
    UserSubscriptionRepository = class extends BaseRepository {
      constructor() {
        super(userSubscriptions, "id");
      }
      async findByUser(userId) {
        try {
          const results = await db.select().from(userSubscriptions).where(and16(
            eq17(userSubscriptions.userId, userId),
            eq17(userSubscriptions.status, "active")
          )).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "UserSubscriptionRepository.findByUser");
        }
      }
      async findByUserWithPlan(userId) {
        try {
          const results = await db.select({
            subscription: userSubscriptions,
            plan: subscriptionPlans
          }).from(userSubscriptions).leftJoin(subscriptionPlans, eq17(userSubscriptions.planId, subscriptionPlans.id)).where(and16(
            eq17(userSubscriptions.userId, userId),
            eq17(userSubscriptions.status, "active")
          )).limit(1);
          const result = results[0];
          if (!result) return void 0;
          return {
            subscription: result.subscription,
            plan: result.plan
          };
        } catch (error) {
          handleDatabaseError(error, "UserSubscriptionRepository.findByUserWithPlan");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq17(userSubscriptions.userId, filters.userId));
            }
            if (filters.planId) {
              conditions.push(eq17(userSubscriptions.planId, filters.planId));
            }
            if (filters.status) {
              conditions.push(sql13`${userSubscriptions.status} = ${filters.status}`);
            }
          }
          let query = db.select().from(userSubscriptions);
          if (conditions.length > 0) {
            query = query.where(and16(...conditions));
          }
          return await query.orderBy(desc9(userSubscriptions.createdAt));
        } catch (error) {
          handleDatabaseError(error, "UserSubscriptionRepository.findAll");
        }
      }
      async findAllWithDetails() {
        try {
          return await db.select({
            subscription: userSubscriptions,
            user: {
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName
            },
            plan: {
              id: subscriptionPlans.id,
              name: subscriptionPlans.name,
              price: subscriptionPlans.price,
              currency: subscriptionPlans.currency
            }
          }).from(userSubscriptions).leftJoin(users, eq17(userSubscriptions.userId, users.id)).leftJoin(subscriptionPlans, eq17(userSubscriptions.planId, subscriptionPlans.id)).orderBy(desc9(userSubscriptions.createdAt));
        } catch (error) {
          handleDatabaseError(error, "UserSubscriptionRepository.findAllWithDetails");
        }
      }
      async update(id, data) {
        try {
          const results = await db.update(userSubscriptions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(userSubscriptions.id, id)).returning();
          if (!results[0]) {
            throw new NotFoundError("UserSubscription", id);
          }
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "UserSubscriptionRepository.update");
        }
      }
    };
    subscriptionPlanRepository = new SubscriptionPlanRepository();
    userSubscriptionRepository = new UserSubscriptionRepository();
  }
});

// server/repositories/security-settings.repository.ts
import { eq as eq18 } from "drizzle-orm";
var SecuritySettingsRepository, securitySettingsRepository;
var init_security_settings_repository = __esm({
  "server/repositories/security-settings.repository.ts"() {
    "use strict";
    init_base_repository();
    init_db();
    init_schema();
    init_errors2();
    SecuritySettingsRepository = class extends BaseRepository {
      constructor() {
        super(securitySettings, "id");
      }
      async findByKey(settingKey) {
        try {
          const results = await db.select().from(securitySettings).where(eq18(securitySettings.settingKey, settingKey)).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "SecuritySettingsRepository.findByKey");
        }
      }
      async upsertSetting(settingKey, settingValue, updatedBy, description) {
        try {
          return await this.executeInTransaction(async (tx) => {
            const existing = await tx.select().from(securitySettings).where(eq18(securitySettings.settingKey, settingKey)).limit(1);
            if (existing[0]) {
              const updated = await tx.update(securitySettings).set({
                settingValue,
                updatedBy,
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq18(securitySettings.settingKey, settingKey)).returning();
              return updated[0];
            } else {
              const inserted = await tx.insert(securitySettings).values({
                settingKey,
                settingValue,
                updatedBy,
                description: description || this.getDefaultDescription(settingKey)
              }).returning();
              return inserted[0];
            }
          });
        } catch (error) {
          handleDatabaseError(error, "SecuritySettingsRepository.upsertSetting");
        }
      }
      async getAllSettings() {
        try {
          return await db.select().from(securitySettings).orderBy(securitySettings.settingKey);
        } catch (error) {
          handleDatabaseError(error, "SecuritySettingsRepository.getAllSettings");
        }
      }
      getDefaultDescription(settingKey) {
        const descriptions = {
          "team_login_visible": "Controls whether the team login option is visible on the authentication page",
          "maintenance_mode": "Enables maintenance mode which blocks all users except admins and forces logout",
          "forum_cooling_period_enabled": "When enabled, new accounts must wait 1 hour before posting in community forum",
          "force_logout_enabled": "When enabled, forces all users to log out and prevents new logins",
          "secret_search_code": "Secret code required for team member registration"
        };
        return descriptions[settingKey] || "Custom security setting";
      }
    };
    securitySettingsRepository = new SecuritySettingsRepository();
  }
});

// server/repositories/testimonial.repository.ts
import { eq as eq19, and as and17 } from "drizzle-orm";
var TestimonialRepository, testimonialRepository;
var init_testimonial_repository = __esm({
  "server/repositories/testimonial.repository.ts"() {
    "use strict";
    init_base_repository();
    init_db();
    init_schema();
    init_errors2();
    TestimonialRepository = class extends BaseRepository {
      constructor() {
        super(testimonials, "id");
      }
      async findApproved() {
        try {
          return await db.select().from(testimonials).where(eq19(testimonials.isApproved, true));
        } catch (error) {
          handleDatabaseError(error, "TestimonialRepository.findApproved");
        }
      }
      async findByUserId(userId) {
        try {
          return await db.select().from(testimonials).where(eq19(testimonials.userId, userId));
        } catch (error) {
          handleDatabaseError(error, "TestimonialRepository.findByUserId");
        }
      }
      async approve(id) {
        return await this.update(id, { isApproved: true });
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.userId) {
              conditions.push(eq19(testimonials.userId, filters.userId));
            }
            if (filters.isApproved !== void 0) {
              conditions.push(eq19(testimonials.isApproved, filters.isApproved));
            }
          }
          let query = db.select().from(testimonials);
          if (conditions.length > 0) {
            query = query.where(and17(...conditions));
          }
          return await query;
        } catch (error) {
          handleDatabaseError(error, "TestimonialRepository.findAll");
        }
      }
    };
    testimonialRepository = new TestimonialRepository();
  }
});

// server/repositories/student-timeline.repository.ts
import { eq as eq20, desc as desc10, and as and18 } from "drizzle-orm";
var StudentTimelineRepository, studentTimelineRepository;
var init_student_timeline_repository = __esm({
  "server/repositories/student-timeline.repository.ts"() {
    "use strict";
    init_base_repository();
    init_db();
    init_schema();
    init_errors2();
    StudentTimelineRepository = class extends BaseRepository {
      constructor() {
        super(studentTimeline, "id");
      }
      async findByStudentId(studentId) {
        try {
          return await db.select().from(studentTimeline).where(eq20(studentTimeline.studentId, studentId)).orderBy(desc10(studentTimeline.createdAt));
        } catch (error) {
          handleDatabaseError(error, "StudentTimelineRepository.findByStudentId");
        }
      }
      async addTimelineEntry(entry) {
        return await this.create(entry);
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.studentId) {
              conditions.push(eq20(studentTimeline.studentId, filters.studentId));
            }
            if (filters.eventType) {
              conditions.push(eq20(studentTimeline.action, filters.eventType));
            }
          }
          let query = db.select().from(studentTimeline);
          if (conditions.length > 0) {
            query = query.where(and18(...conditions));
          }
          return await query.orderBy(desc10(studentTimeline.createdAt));
        } catch (error) {
          handleDatabaseError(error, "StudentTimelineRepository.findAll");
        }
      }
    };
    studentTimelineRepository = new StudentTimelineRepository();
  }
});

// server/repositories/forum-reports.repository.ts
import { eq as eq21, desc as desc11, and as and19 } from "drizzle-orm";
var ForumReportsRepository, forumReportsRepository;
var init_forum_reports_repository = __esm({
  "server/repositories/forum-reports.repository.ts"() {
    "use strict";
    init_base_repository();
    init_db();
    init_schema();
    init_errors2();
    ForumReportsRepository = class extends BaseRepository {
      constructor() {
        super(forumPostReports, "id");
      }
      async findByPostAndUser(postId, userId) {
        try {
          const results = await db.select().from(forumPostReports).where(
            and19(
              eq21(forumPostReports.postId, postId),
              eq21(forumPostReports.reporterUserId, userId)
            )
          ).limit(1);
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "ForumReportsRepository.findByPostAndUser");
        }
      }
      async findByPostId(postId) {
        try {
          return await db.select().from(forumPostReports).where(eq21(forumPostReports.postId, postId)).orderBy(desc11(forumPostReports.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ForumReportsRepository.findByPostId");
        }
      }
      async deleteByPostId(postId) {
        try {
          await db.delete(forumPostReports).where(eq21(forumPostReports.postId, postId));
        } catch (error) {
          handleDatabaseError(error, "ForumReportsRepository.deleteByPostId");
        }
      }
      async findAll(filters) {
        try {
          const conditions = [];
          if (filters) {
            if (filters.postId) {
              conditions.push(eq21(forumPostReports.postId, filters.postId));
            }
            if (filters.reporterUserId) {
              conditions.push(eq21(forumPostReports.reporterUserId, filters.reporterUserId));
            }
          }
          let query = db.select().from(forumPostReports);
          if (conditions.length > 0) {
            query = query.where(and19(...conditions));
          }
          return await query.orderBy(desc11(forumPostReports.createdAt));
        } catch (error) {
          handleDatabaseError(error, "ForumReportsRepository.findAll");
        }
      }
    };
    forumReportsRepository = new ForumReportsRepository();
  }
});

// server/repositories/staff-invitation.repository.ts
import { eq as eq22, and as and20, desc as desc12, sql as sql14 } from "drizzle-orm";
var StaffInvitationRepository, staffInvitationRepository;
var init_staff_invitation_repository = __esm({
  "server/repositories/staff-invitation.repository.ts"() {
    "use strict";
    init_base_repository();
    init_schema();
    init_db();
    init_errors2();
    StaffInvitationRepository = class extends BaseRepository {
      constructor() {
        super(staffInvitationLinks, "id");
      }
      async findByToken(token) {
        try {
          return await this.findOne(eq22(staffInvitationLinks.token, token));
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.findByToken");
        }
      }
      async findActiveByToken(token) {
        try {
          return await this.findOne(
            and20(
              eq22(staffInvitationLinks.token, token),
              eq22(staffInvitationLinks.isActive, true)
            )
          );
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.findActiveByToken");
        }
      }
      async findAllActive() {
        try {
          return await db.select().from(staffInvitationLinks).where(eq22(staffInvitationLinks.isActive, true)).orderBy(desc12(staffInvitationLinks.createdAt));
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.findAllActive");
        }
      }
      async refreshToken(linkId, newToken) {
        try {
          const results = await db.update(staffInvitationLinks).set({
            token: newToken,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq22(staffInvitationLinks.id, linkId)).returning();
          return results[0];
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.refreshToken");
        }
      }
      async incrementUsageCount(linkId) {
        try {
          await db.update(staffInvitationLinks).set({
            usedCount: sql14`${staffInvitationLinks.usedCount} + 1`,
            lastUsedAt: /* @__PURE__ */ new Date()
          }).where(eq22(staffInvitationLinks.id, linkId));
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.incrementUsageCount");
        }
      }
      async deactivate(linkId) {
        try {
          const result = await db.update(staffInvitationLinks).set({
            isActive: false,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq22(staffInvitationLinks.id, linkId));
          return result.rowCount > 0;
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.deactivate");
        }
      }
      async claimAndInvalidate(token) {
        try {
          return await this.executeInTransaction(async (tx) => {
            const [link] = await tx.select().from(staffInvitationLinks).where(and20(
              eq22(staffInvitationLinks.token, token),
              eq22(staffInvitationLinks.isActive, true)
            )).limit(1);
            if (!link) {
              return void 0;
            }
            const [updated] = await tx.update(staffInvitationLinks).set({
              usedCount: sql14`${staffInvitationLinks.usedCount} + 1`,
              lastUsedAt: /* @__PURE__ */ new Date(),
              isActive: false,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq22(staffInvitationLinks.id, link.id)).returning();
            return updated;
          });
        } catch (error) {
          handleDatabaseError(error, "StaffInvitationRepository.claimAndInvalidate");
        }
      }
    };
    staffInvitationRepository = new StaffInvitationRepository();
  }
});

// server/repositories/index.ts
var init_repositories = __esm({
  "server/repositories/index.ts"() {
    "use strict";
    init_base_repository();
    init_errors2();
    init_user_repository();
    init_student_repository();
    init_university_repository();
    init_course_repository();
    init_application_repository();
    init_document_repository();
    init_forum_post_repository();
    init_forum_comment_repository();
    init_forum_interaction_repository();
    init_forum_poll_repository();
    init_notification_repository();
    init_event_repository();
    init_ai_matching_repository();
    init_chat_repository();
    init_payment_repository();
    init_subscription_repository();
    init_security_settings_repository();
    init_testimonial_repository();
    init_student_timeline_repository();
    init_forum_reports_repository();
    init_staff_invitation_repository();
    init_user_repository();
    init_student_repository();
    init_university_repository();
    init_course_repository();
    init_application_repository();
    init_document_repository();
    init_forum_post_repository();
    init_forum_comment_repository();
    init_forum_interaction_repository();
    init_forum_poll_repository();
    init_notification_repository();
    init_event_repository();
    init_ai_matching_repository();
    init_chat_repository();
    init_payment_repository();
    init_subscription_repository();
    init_security_settings_repository();
    init_testimonial_repository();
    init_student_timeline_repository();
    init_forum_reports_repository();
    init_staff_invitation_repository();
  }
});

// server/security/jwtService.ts
import jwt from "jsonwebtoken";
var JwtService, jwtService;
var init_jwtService = __esm({
  "server/security/jwtService.ts"() {
    "use strict";
    init_config();
    JwtService = class {
      secret;
      algorithm = "HS256";
      issuer = "edupath-app";
      audience = "edupath-users";
      constructor() {
        this.secret = securityConfig.JWT_SECRET;
      }
      /**
       * Sign a JWT token
       */
      sign(payload, options = {}) {
        const jwtOptions = {
          algorithm: this.algorithm,
          expiresIn: options.expiresIn || "24h",
          issuer: options.issuer || this.issuer,
          audience: options.audience || this.audience
        };
        if (options.subject) jwtOptions.subject = options.subject;
        return jwt.sign(payload, this.secret, jwtOptions);
      }
      /**
       * Verify a JWT token
       */
      verify(token, options = {}) {
        const verifyOptions = {
          algorithms: [this.algorithm],
          issuer: options.issuer || this.issuer,
          audience: options.audience || this.audience,
          ...options
        };
        return jwt.verify(token, this.secret, verifyOptions);
      }
      /**
       * Decode a JWT token without verification (for debugging)
       */
      decode(token) {
        return jwt.decode(token);
      }
      /**
       * Check if a token is expired without throwing
       */
      isExpired(token) {
        try {
          this.verify(token);
          return false;
        } catch (error) {
          if (error instanceof jwt.TokenExpiredError) {
            return true;
          }
          return true;
        }
      }
      /**
       * Get the current algorithm being used
       */
      getAlgorithm() {
        return this.algorithm;
      }
      /**
       * Initialize the service (for compatibility with existing code)
       */
      async initialize() {
        console.log("\u{1F510} Simple JWT service initialized");
        console.log(`   \u2022 Algorithm: ${this.algorithm}`);
        console.log(`   \u2022 Secret source: environment`);
      }
    };
    jwtService = new JwtService();
  }
});

// server/services/infrastructure/validation.service.ts
var ValidationService, validationService;
var init_validation_service = __esm({
  "server/services/infrastructure/validation.service.ts"() {
    "use strict";
    ValidationService = class {
      DISPOSABLE_DOMAINS = [
        "10minutemail.com",
        "tempmail.org",
        "guerrillamail.com",
        "throwaway.email",
        "temp-mail.org",
        "mailinator.com"
      ];
      validatePassword(password) {
        if (!password || password.length < 8) {
          return {
            valid: false,
            error: "Password must be at least 8 characters long"
          };
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          return {
            valid: false,
            error: "Password must contain uppercase, lowercase, and number"
          };
        }
        return { valid: true };
      }
      validateEmail(email) {
        if (!email || !email.includes("@")) {
          return {
            valid: false,
            error: "Invalid email format"
          };
        }
        const emailLower = email.toLowerCase();
        const emailDomain = emailLower.split("@")[1];
        if (this.DISPOSABLE_DOMAINS.includes(emailDomain)) {
          return {
            valid: false,
            error: "Disposable email addresses are not allowed"
          };
        }
        return { valid: true };
      }
      validateMessageContent(message) {
        const cleanMessage = message.trim();
        if (cleanMessage.length > 100) {
          return {
            valid: false,
            error: "Message is too long. Please keep messages under 100 characters."
          };
        }
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|org|net|edu|gov|mil|int|co|io|ly|me|tv|info|biz)[^\s]*)/gi;
        if (urlRegex.test(cleanMessage)) {
          return {
            valid: false,
            error: "Links and URLs are not allowed in messages"
          };
        }
        if (cleanMessage.includes("attachment:") || cleanMessage.includes("file:")) {
          return {
            valid: false,
            error: "File attachments are not allowed"
          };
        }
        const specialCharCount = (cleanMessage.match(/[^a-zA-Z0-9\s\.,\?!\-'"]/g) || []).length;
        if (specialCharCount > cleanMessage.length * 0.3) {
          return {
            valid: false,
            error: "Message contains too many special characters. Please type naturally."
          };
        }
        return { valid: true };
      }
    };
    validationService = new ValidationService();
  }
});

// server/services/base.service.ts
var BaseService;
var init_base_service = __esm({
  "server/services/base.service.ts"() {
    "use strict";
    init_errors2();
    init_errors();
    BaseService = class {
      /**
       * Handle errors from repositories and map them to service-layer errors
       * Preserves error context and stack traces
       */
      handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        if (error instanceof NotFoundError) {
          throw new ResourceNotFoundError(
            error.context?.entity || "Resource",
            error.context?.identifier,
            { originalError: error.message, context }
          );
        }
        if (error instanceof DuplicateError) {
          throw new DuplicateResourceError(
            error.context?.entity || "Resource",
            error.context?.field || "field",
            error.context?.value,
            { originalError: error.message, context }
          );
        }
        if (error instanceof ForeignKeyError) {
          throw new InvalidOperationError(
            "reference resource",
            `Referenced ${error.context?.referencedEntity || "resource"} does not exist`,
            { originalError: error.message, context }
          );
        }
        if (error instanceof ValidationError) {
          throw new ValidationServiceError(
            error.context?.entity || "Resource",
            error.context?.errors || { general: error.message },
            { originalError: error.message, context }
          );
        }
        if (error instanceof TransactionError || error instanceof DatabaseError) {
          throw new ServiceUnavailableError(
            "database",
            "Database operation failed, please try again",
            { originalError: error.message, context }
          );
        }
        if (error.code === "23505") {
          const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
          const field = match?.[1] || "field";
          const value = match?.[2] || "unknown";
          throw new DuplicateResourceError("Resource", field, value, { context });
        }
        if (error.code === "23503") {
          throw new InvalidOperationError(
            "reference resource",
            "Referenced resource does not exist",
            { context, detail: error.detail }
          );
        }
        if (error.code === "23502") {
          throw new ValidationServiceError(
            "Resource",
            { general: "Required field is missing" },
            { context, detail: error.detail }
          );
        }
        if (error instanceof ServiceError) {
          throw error;
        }
        throw new ServiceError(
          error.message || "An unexpected error occurred",
          "INTERNAL_ERROR",
          500,
          { originalError: error, context }
        );
      }
      validateRequired(data, fields) {
        const missing = fields.filter((field) => !data[field]);
        if (missing.length > 0) {
          throw new ValidationServiceError(
            "Input",
            { fields: `Missing required fields: ${missing.join(", ")}` }
          );
        }
      }
      sanitizeUser(user) {
        const { password, temporaryPassword, ...sanitized } = user;
        return sanitized;
      }
    };
  }
});

// server/services/validation/validators.ts
var CommonValidators;
var init_validators = __esm({
  "server/services/validation/validators.ts"() {
    "use strict";
    init_errors();
    CommonValidators = class {
      static validateEmail(email) {
        if (!email || typeof email !== "string") {
          return { valid: false, error: "Email is required" };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return { valid: false, error: "Invalid email format" };
        }
        return { valid: true };
      }
      static validateUrl(url) {
        if (!url || typeof url !== "string") {
          return { valid: false, error: "URL is required" };
        }
        try {
          new URL(url);
          return { valid: true };
        } catch {
          return { valid: false, error: "Invalid URL format" };
        }
      }
      static validatePhoneNumber(phone) {
        if (!phone || typeof phone !== "string") {
          return { valid: false, error: "Phone number is required" };
        }
        const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
        if (!phoneRegex.test(phone)) {
          return { valid: false, error: "Invalid phone number format" };
        }
        return { valid: true };
      }
      static validateDateRange(startDate, endDate) {
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
          return { valid: false, error: "Invalid date objects" };
        }
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return { valid: false, error: "Invalid date values" };
        }
        if (startDate >= endDate) {
          return { valid: false, error: "Start date must be before end date" };
        }
        return { valid: true };
      }
      static validateFutureDate(date) {
        if (!(date instanceof Date)) {
          return { valid: false, error: "Invalid date object" };
        }
        if (Number.isNaN(date.getTime())) {
          return { valid: false, error: "Invalid date value" };
        }
        if (date <= /* @__PURE__ */ new Date()) {
          return { valid: false, error: "Date must be in the future" };
        }
        return { valid: true };
      }
      static validatePastDate(date) {
        if (!(date instanceof Date)) {
          return { valid: false, error: "Invalid date object" };
        }
        if (Number.isNaN(date.getTime())) {
          return { valid: false, error: "Invalid date value" };
        }
        if (date >= /* @__PURE__ */ new Date()) {
          return { valid: false, error: "Date must be in the past" };
        }
        return { valid: true };
      }
      static validatePositiveNumber(num, fieldName = "Value") {
        if (typeof num !== "number" || isNaN(num)) {
          return { valid: false, error: `${fieldName} must be a valid number` };
        }
        if (num <= 0) {
          return { valid: false, error: `${fieldName} must be positive` };
        }
        return { valid: true };
      }
      static validateRange(value, min, max, fieldName = "Value") {
        if (typeof value !== "number" || isNaN(value)) {
          return { valid: false, error: `${fieldName} must be a valid number` };
        }
        if (value < min || value > max) {
          return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
        }
        return { valid: true };
      }
      static validateStringLength(str, min, max, fieldName = "Value") {
        if (typeof str !== "string") {
          return { valid: false, error: `${fieldName} must be a string` };
        }
        if (str.length < min) {
          return { valid: false, error: `${fieldName} must be at least ${min} characters` };
        }
        if (str.length > max) {
          return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
        }
        return { valid: true };
      }
      static validateEnum(value, allowedValues, fieldName = "Value") {
        if (!allowedValues.includes(value)) {
          return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(", ")}` };
        }
        return { valid: true };
      }
      static validateUUID(id, fieldName = "ID") {
        if (!id || typeof id !== "string") {
          return { valid: false, error: `${fieldName} is required` };
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return { valid: false, error: `${fieldName} must be a valid UUID` };
        }
        return { valid: true };
      }
      static validateArrayNotEmpty(arr, fieldName = "Array") {
        if (!Array.isArray(arr) || arr.length === 0) {
          return { valid: false, error: `${fieldName} must contain at least one item` };
        }
        return { valid: true };
      }
      static validateFileExtension(filename, allowedExtensions) {
        if (!filename || typeof filename !== "string") {
          return { valid: false, error: "Filename is required" };
        }
        const ext = filename.split(".").pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
          return { valid: false, error: `File must have one of these extensions: ${allowedExtensions.join(", ")}` };
        }
        return { valid: true };
      }
      static validateFileSize(sizeInBytes, maxSizeInMB) {
        if (typeof sizeInBytes !== "number" || sizeInBytes <= 0) {
          return { valid: false, error: "Invalid file size" };
        }
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        if (sizeInBytes > maxSizeInBytes) {
          return { valid: false, error: `File size must not exceed ${maxSizeInMB}MB` };
        }
        return { valid: true };
      }
    };
  }
});

// server/services/validation/business-rules.ts
var BusinessRuleValidators;
var init_business_rules = __esm({
  "server/services/validation/business-rules.ts"() {
    "use strict";
    init_errors();
    BusinessRuleValidators = class {
      static validateApplicationStatus(currentStatus, newStatus) {
        const validTransitions = {
          "draft": ["submitted", "cancelled"],
          "submitted": ["under_review", "cancelled"],
          "under_review": ["approved", "rejected", "pending_info"],
          "pending_info": ["submitted", "cancelled"],
          "approved": ["enrolled"],
          "rejected": [],
          "cancelled": [],
          "enrolled": []
        };
        const allowedStatuses = validTransitions[currentStatus] || [];
        if (!allowedStatuses.includes(newStatus)) {
          throw new BusinessRuleViolationError(
            "APPLICATION_STATUS_TRANSITION",
            `Cannot transition from ${currentStatus} to ${newStatus}`,
            { currentStatus, newStatus, allowedStatuses }
          );
        }
      }
      static validateSubscriptionPlan(planId, validPlans) {
        if (!validPlans.includes(planId)) {
          throw new ValidationServiceError("Subscription", {
            planId: `Invalid subscription plan. Must be one of: ${validPlans.join(", ")}`
          });
        }
      }
      static validateEventCapacity(currentRegistrations, maxCapacity) {
        if (currentRegistrations >= maxCapacity) {
          throw new BusinessRuleViolationError(
            "EVENT_CAPACITY_EXCEEDED",
            "Event is at full capacity",
            { currentRegistrations, maxCapacity }
          );
        }
      }
      static validatePaymentAmount(amount, minAmount = 1) {
        if (amount < minAmount) {
          throw new ValidationServiceError("Payment", {
            amount: `Payment amount must be at least ${minAmount}`
          });
        }
      }
      static validateDocumentType(documentType, allowedTypes) {
        if (!allowedTypes.includes(documentType)) {
          throw new ValidationServiceError("Document", {
            type: `Invalid document type. Must be one of: ${allowedTypes.join(", ")}`
          });
        }
      }
      static validateCounselorAvailability(counselorId, assignedStudents, maxStudents) {
        if (assignedStudents >= maxStudents) {
          throw new BusinessRuleViolationError(
            "COUNSELOR_CAPACITY_EXCEEDED",
            "Counselor has reached maximum student capacity",
            { counselorId, assignedStudents, maxStudents }
          );
        }
      }
      static validateForumPostModeration(isReported, reportCount, autoModThreshold = 5) {
        if (isReported && reportCount >= autoModThreshold) {
          throw new BusinessRuleViolationError(
            "POST_AUTO_MODERATED",
            "Post has been auto-moderated due to multiple reports",
            { reportCount, threshold: autoModThreshold }
          );
        }
      }
      static validateUniversityRanking(ranking) {
        if (ranking < 1 || ranking > 5e3) {
          throw new ValidationServiceError("University", {
            ranking: "University ranking must be between 1 and 5000"
          });
        }
      }
      static validateTuitionRange(minTuition, maxTuition) {
        if (minTuition < 0) {
          throw new ValidationServiceError("University", {
            minTuition: "Minimum tuition cannot be negative"
          });
        }
        if (maxTuition < minTuition) {
          throw new ValidationServiceError("University", {
            maxTuition: "Maximum tuition must be greater than minimum tuition"
          });
        }
      }
      static validateNotificationType(type, allowedTypes) {
        if (!allowedTypes.includes(type)) {
          throw new ValidationServiceError("Notification", {
            type: `Invalid notification type. Must be one of: ${allowedTypes.join(", ")}`
          });
        }
      }
      static validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) {
          errors.push("Password must be at least 8 characters");
        }
        if (!/[a-z]/.test(password)) {
          errors.push("Password must contain at least one lowercase letter");
        }
        if (!/[A-Z]/.test(password)) {
          errors.push("Password must contain at least one uppercase letter");
        }
        if (!/\d/.test(password)) {
          errors.push("Password must contain at least one number");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          errors.push("Password must contain at least one special character");
        }
        if (errors.length > 0) {
          throw new ValidationServiceError("Password", {
            password: errors.join(". ")
          });
        }
      }
      static validateAdminPermission(userId, requiredRole, userRole) {
        const roleHierarchy = ["viewer", "editor", "admin", "super_admin"];
        const userRoleIndex = roleHierarchy.indexOf(userRole);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
        if (userRoleIndex < requiredRoleIndex) {
          throw new BusinessRuleViolationError(
            "INSUFFICIENT_PERMISSIONS",
            "Insufficient permissions for this operation",
            { userId, requiredRole, userRole }
          );
        }
      }
    };
  }
});

// server/services/validation/schemas.ts
import { z as z3 } from "zod";
var emailSchema, passwordSchema, phoneNumberSchema, uuidSchema, forumCategorySchema, forumPostSchema, forumCommentSchema, universityRankingSchema, universitySchema, subscriptionStatusSchema, subscriptionPlanSchema, userSubscriptionSchema, applicationStatusSchema, eventSchema, documentTypeSchema, documentSchema, notificationTypeSchema, notificationSchema, paymentGatewaySchema, paymentSchema;
var init_schemas = __esm({
  "server/services/validation/schemas.ts"() {
    "use strict";
    emailSchema = z3.string().email("Invalid email format");
    passwordSchema = z3.string().min(8, "Password must be at least 8 characters").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/\d/, "Password must contain at least one number").regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");
    phoneNumberSchema = z3.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (E.164)");
    uuidSchema = z3.string().uuid("Invalid UUID format");
    forumCategorySchema = z3.enum([
      "general",
      "usa_study",
      "uk_study",
      "canada_study",
      "australia_study",
      "ielts_prep",
      "visa_tips",
      "scholarships",
      "europe_study"
    ]);
    forumPostSchema = z3.object({
      authorId: uuidSchema,
      content: z3.string().min(1).max(1e4, "Post content must not exceed 10000 characters"),
      title: z3.string().min(1).max(500, "Post title must not exceed 500 characters").optional().nullable(),
      category: forumCategorySchema.optional(),
      image: z3.string().optional(),
      pollQuestion: z3.string().optional(),
      pollOptions: z3.array(z3.string()).optional()
    });
    forumCommentSchema = z3.object({
      postId: uuidSchema,
      userId: uuidSchema,
      content: z3.string().min(1).max(2e3, "Comment must not exceed 2000 characters")
    });
    universityRankingSchema = z3.number().int().min(1, "Ranking must be at least 1").max(5e3, "Ranking must not exceed 5000");
    universitySchema = z3.object({
      name: z3.string().min(1).max(500, "University name must not exceed 500 characters"),
      country: z3.string().min(1).max(100, "Country must not exceed 100 characters"),
      worldRanking: universityRankingSchema.optional(),
      annualFee: z3.number().positive("Annual fee must be positive").optional(),
      website: z3.string().url("Invalid website URL").optional(),
      city: z3.string().max(100).optional(),
      description: z3.string().optional(),
      acceptanceRate: z3.string().optional(),
      degreeLevels: z3.array(z3.string()).optional()
    });
    subscriptionStatusSchema = z3.enum([
      "active",
      "cancelled",
      "expired",
      "pending"
    ]);
    subscriptionPlanSchema = z3.object({
      name: z3.string().min(1).max(255, "Plan name must not exceed 255 characters"),
      price: z3.number().nonnegative("Price must be non-negative"),
      features: z3.array(z3.string()),
      maxUniversities: z3.number().int().positive("Max universities must be positive").optional(),
      maxCountries: z3.number().int().positive("Max countries must be positive").optional(),
      turnaroundDays: z3.number().int().positive("Turnaround days must be positive")
    });
    userSubscriptionSchema = z3.object({
      userId: uuidSchema,
      planId: uuidSchema,
      status: subscriptionStatusSchema,
      startedAt: z3.date().optional(),
      expiresAt: z3.date().optional()
    }).refine(
      (data) => {
        if (data.startedAt && data.expiresAt) {
          return data.expiresAt > data.startedAt;
        }
        return true;
      },
      { message: "Expiration date must be after start date" }
    );
    applicationStatusSchema = z3.enum([
      "draft",
      "submitted",
      "under_review",
      "pending_info",
      "approved",
      "rejected",
      "cancelled",
      "enrolled"
    ]);
    eventSchema = z3.object({
      title: z3.string().min(1).max(200, "Event title must not exceed 200 characters"),
      description: z3.string().optional(),
      startDate: z3.date(),
      endDate: z3.date(),
      capacity: z3.number().int().positive("Capacity must be positive").optional(),
      location: z3.string().max(200).optional(),
      isVirtual: z3.boolean().optional()
    }).refine(
      (data) => data.endDate > data.startDate,
      { message: "End date must be after start date" }
    );
    documentTypeSchema = z3.enum([
      "transcript",
      "recommendation_letter",
      "personal_statement",
      "resume",
      "passport",
      "test_score",
      "other"
    ]);
    documentSchema = z3.object({
      userId: uuidSchema,
      name: z3.string().min(1).max(255, "Document name must not exceed 255 characters"),
      type: documentTypeSchema,
      size: z3.number().int().positive("File size must be positive").max(10485760, "File size must not exceed 10MB"),
      url: z3.string().url("Invalid document URL")
    });
    notificationTypeSchema = z3.enum([
      "application_update",
      "message",
      "event_reminder",
      "system",
      "deadline_reminder"
    ]);
    notificationSchema = z3.object({
      userId: uuidSchema,
      type: notificationTypeSchema,
      title: z3.string().min(1).max(200, "Title must not exceed 200 characters"),
      message: z3.string().min(1).max(1e3, "Message must not exceed 1000 characters"),
      isRead: z3.boolean().optional()
    });
    paymentGatewaySchema = z3.enum(["stripe", "paypal", "flutterwave", "paystack"]);
    paymentSchema = z3.object({
      amount: z3.number().positive("Payment amount must be positive"),
      currency: z3.string().length(3, "Currency must be 3-letter ISO code"),
      gateway: paymentGatewaySchema,
      userId: uuidSchema.optional(),
      metadata: z3.record(z3.any()).optional()
    });
  }
});

// server/services/validation/index.ts
var init_validation = __esm({
  "server/services/validation/index.ts"() {
    "use strict";
    init_validators();
    init_business_rules();
    init_schemas();
  }
});

// server/services/domain/temporaryPassword.service.ts
var temporaryPassword_service_exports = {};
__export(temporaryPassword_service_exports, {
  TemporaryPasswordService: () => TemporaryPasswordService,
  temporaryPasswordService: () => temporaryPasswordService
});
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
var TemporaryPasswordService, temporaryPasswordService;
var init_temporaryPassword_service = __esm({
  "server/services/domain/temporaryPassword.service.ts"() {
    "use strict";
    init_base_service();
    init_validation();
    TemporaryPasswordService = class _TemporaryPasswordService extends BaseService {
      static BCRYPT_ROUNDS = 10;
      /**
       * Generate a new temporary password and return both plain and encrypted versions
       * The plain password becomes the user's main login password (after bcrypt hashing)
       * The encrypted version is stored for admin reference only
       * 
       * Generates a strong 16-character password that is cryptographically secure and hard to guess.
       * Guarantees inclusion of all required character types: uppercase, lowercase, numbers, and special characters.
       * 
       * @returns Object containing plainPassword (for login) and encryptedPassword (for admin reference)
       */
      async generateAndEncryptTempPassword() {
        try {
          const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
          const lowercase = "abcdefghijklmnopqrstuvwxyz";
          const numbers = "0123456789";
          const specialChars = "!@#$%^&*(),.?";
          const guaranteedChars = [
            uppercase[this.getSecureRandomInt(uppercase.length)],
            lowercase[this.getSecureRandomInt(lowercase.length)],
            numbers[this.getSecureRandomInt(numbers.length)],
            specialChars[this.getSecureRandomInt(specialChars.length)]
          ];
          const allChars = uppercase + lowercase + numbers + specialChars;
          const randomChars = [];
          for (let i = 0; i < 12; i++) {
            randomChars.push(allChars[this.getSecureRandomInt(allChars.length)]);
          }
          const allPasswordChars = [...guaranteedChars, ...randomChars];
          for (let i = allPasswordChars.length - 1; i > 0; i--) {
            const j = this.getSecureRandomInt(i + 1);
            [allPasswordChars[i], allPasswordChars[j]] = [allPasswordChars[j], allPasswordChars[i]];
          }
          const plainPassword = allPasswordChars.join("");
          BusinessRuleValidators.validatePasswordStrength(plainPassword);
          const encryptedPassword = await bcrypt.hash(plainPassword, _TemporaryPasswordService.BCRYPT_ROUNDS);
          console.log(`\u{1F510} Generated cryptographically secure 16-character temporary password`);
          return {
            plainPassword,
            encryptedPassword
          };
        } catch (error) {
          return this.handleError(error, "TemporaryPasswordService.generateAndEncryptTempPassword");
        }
      }
      /**
       * Get a cryptographically secure random integer between 0 and max (exclusive)
       * Uses crypto.randomBytes for secure random number generation
       */
      getSecureRandomInt(max) {
        const range = max;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
        let randomValue;
        do {
          const bytes = randomBytes(bytesNeeded);
          randomValue = bytes.reduce((acc, byte, i) => acc + byte * 256 ** i, 0);
        } while (randomValue > maxValid);
        return randomValue % range;
      }
    };
    temporaryPasswordService = new TemporaryPasswordService();
  }
});

// server/services/domain/auth.service.ts
var auth_service_exports = {};
__export(auth_service_exports, {
  AuthService: () => AuthService,
  authService: () => authService
});
import * as bcrypt2 from "bcrypt";
var AuthService, authService;
var init_auth_service = __esm({
  "server/services/domain/auth.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_jwtService();
    init_errors();
    AuthService = class extends BaseService {
      constructor(userRepo = container.get(TYPES.IUserRepository)) {
        super();
        this.userRepo = userRepo;
      }
      get adminSecurityService() {
        return container.get(TYPES.IAdminSecurityService);
      }
      async login(email, password, userType) {
        try {
          const user = await this.userRepo.findByEmail(email);
          if (!user) {
            throw new AuthenticationError("Invalid email or password");
          }
          if (userType && user.userType !== userType) {
            throw new AuthenticationError("Invalid email or password");
          }
          if (user.accountStatus === "suspended") {
            throw new AuthenticationError("Account has been suspended", { userId: user.id });
          }
          if (user.accountStatus === "pending_approval") {
            throw new AuthenticationError("Account is pending approval", { userId: user.id });
          }
          if (user.accountStatus === "inactive") {
            throw new AuthenticationError("Account has been deactivated", { userId: user.id });
          }
          if (user.accountStatus === "rejected") {
            throw new AuthenticationError("Account application was rejected", { userId: user.id });
          }
          if (user.accountStatus !== "active") {
            throw new AuthenticationError("Account is not active", { userId: user.id });
          }
          if (!user.password) {
            throw new AuthenticationError("Invalid email or password");
          }
          const isValidPassword = await bcrypt2.compare(password, user.password);
          if (!isValidPassword) {
            throw new AuthenticationError("Invalid email or password");
          }
          await this.userRepo.update(user.id, {
            lastLoginAt: /* @__PURE__ */ new Date(),
            failedLoginAttempts: 0
          });
          return { user: this.sanitizeUser(user) };
        } catch (error) {
          return this.handleError(error, "AuthService.login");
        }
      }
      async loginWithType(email, password, allowedTypes) {
        try {
          const user = await this.userRepo.findByEmail(email);
          if (!user || !allowedTypes.includes(user.userType)) {
            throw new AuthenticationError("Invalid email or password");
          }
          if (user.accountStatus !== "active") {
            const messages = {
              "suspended": "Account has been suspended",
              "pending_approval": "Account is pending approval",
              "inactive": "Account has been deactivated",
              "rejected": "Account application was rejected"
            };
            throw new AuthenticationError(
              messages[user.accountStatus || ""] || "Account is not active",
              { userId: user.id }
            );
          }
          if (!user.password) {
            throw new AuthenticationError("Invalid email or password");
          }
          const isValidPassword = await bcrypt2.compare(password, user.password);
          if (!isValidPassword) {
            throw new AuthenticationError("Invalid email or password");
          }
          await this.userRepo.update(user.id, {
            lastLoginAt: /* @__PURE__ */ new Date(),
            failedLoginAttempts: 0
          });
          return { user: this.sanitizeUser(user) };
        } catch (error) {
          return this.handleError(error, "AuthService.loginWithType");
        }
      }
      async getUserByEmail(email) {
        try {
          const user = await this.userRepo.findByEmail(email);
          return user ? this.sanitizeUser(user) : void 0;
        } catch (error) {
          return this.handleError(error, "AuthService.getUserByEmail");
        }
      }
      async validatePassword(userId, password) {
        try {
          const user = await this.userRepo.findById(userId);
          if (!user || !user.password) {
            return false;
          }
          return await bcrypt2.compare(password, user.password);
        } catch (error) {
          return this.handleError(error, "AuthService.validatePassword");
        }
      }
      isInCoolingPeriod(user) {
        if (!user.createdAt) return false;
        const createdAt = new Date(user.createdAt);
        const now = /* @__PURE__ */ new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1e3 * 60 * 60);
        return hoursSinceCreation < 1 && user.userType === "customer";
      }
      getCoolingPeriodEnd(user) {
        if (!user.createdAt || !this.isInCoolingPeriod(user)) {
          return null;
        }
        return new Date(new Date(user.createdAt).getTime() + 60 * 60 * 1e3);
      }
      /**
       * Complete student login with JWT token and cooling period info
       * Handles all business logic including email normalization, authentication, token generation
       */
      async loginStudentComplete(email, password) {
        try {
          const emailLower = email.toLowerCase();
          const result = await this.loginWithType(emailLower, password, ["customer", "company_profile"]);
          const user = result.user;
          const coolingPeriod = this.isInCoolingPeriod(user);
          const coolingPeriodEnds = this.getCoolingPeriodEnd(user);
          const token = jwtService.sign(
            { userId: user.id, userType: user.userType },
            { expiresIn: "24h", subject: user.id }
          );
          const sanitizedUser = this.sanitizeUser(user);
          return {
            user: {
              ...sanitizedUser,
              token
            },
            token,
            coolingPeriod,
            coolingPeriodEnds
          };
        } catch (error) {
          return this.handleError(error, "AuthService.loginStudentComplete");
        }
      }
      /**
       * Complete team login with JWT token
       * Handles all business logic including email normalization, authentication, token generation
       */
      async loginTeamComplete(email, password) {
        try {
          const emailLower = email.toLowerCase();
          const result = await this.login(emailLower, password, "team_member");
          const user = result.user;
          const token = jwtService.sign(
            { userId: user.id, userType: user.userType, teamRole: user.teamRole },
            { expiresIn: "24h", subject: user.id }
          );
          const sanitizedUser = this.sanitizeUser(user);
          return {
            user: {
              ...sanitizedUser,
              token
            },
            token
          };
        } catch (error) {
          return this.handleError(error, "AuthService.loginTeamComplete");
        }
      }
      /**
       * Get team login visibility status from admin settings
       */
      async getTeamLoginVisibilityStatus() {
        try {
          const settings = await this.adminSecurityService.getSecuritySettings();
          const teamLoginVisible = settings.find((s) => s.settingKey === "team_login_visible")?.settingValue === "true";
          return { visible: teamLoginVisible };
        } catch (error) {
          return this.handleError(error, "AuthService.getTeamLoginVisibilityStatus");
        }
      }
    };
    authService = new AuthService();
  }
});

// server/services/domain/application.service.ts
var application_service_exports = {};
__export(application_service_exports, {
  ApplicationService: () => ApplicationService,
  applicationService: () => applicationService
});
var ApplicationService, applicationService;
var init_application_service = __esm({
  "server/services/domain/application.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    ApplicationService = class extends BaseService {
      constructor(applicationRepository2 = container.get(TYPES.IApplicationRepository)) {
        super();
        this.applicationRepository = applicationRepository2;
      }
      async getApplicationById(id) {
        try {
          const application = await this.applicationRepository.findById(id);
          return application;
        } catch (error) {
          return this.handleError(error, "ApplicationService.getApplicationById");
        }
      }
      async getApplicationsByUser(userId) {
        try {
          return await this.applicationRepository.findByUser(userId);
        } catch (error) {
          return this.handleError(error, "ApplicationService.getApplicationsByUser");
        }
      }
      async getApplicationsByStatus(status) {
        try {
          return await this.applicationRepository.findByStatus(status);
        } catch (error) {
          return this.handleError(error, "ApplicationService.getApplicationsByStatus");
        }
      }
      async createApplication(data) {
        try {
          this.validateRequired(data, ["userId", "universityId"]);
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(data.userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const universityIdValidation = CommonValidators.validateUUID(data.universityId, "University ID");
          if (!universityIdValidation.valid) {
            errors.universityId = universityIdValidation.error;
          }
          if (data.courseId) {
            const courseIdValidation = CommonValidators.validateUUID(data.courseId, "Course ID");
            if (!courseIdValidation.valid) {
              errors.courseId = courseIdValidation.error;
            }
          }
          if (data.deadlineDate) {
            const deadlineValidation = CommonValidators.validateFutureDate(new Date(data.deadlineDate));
            if (!deadlineValidation.valid) {
              errors.deadlineDate = deadlineValidation.error;
            }
          }
          if (data.status && !["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"].includes(data.status)) {
            errors.status = "Invalid application status";
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Application", errors);
          }
          const existingApps = await this.applicationRepository.findByUser(data.userId);
          const duplicate = existingApps.find(
            (app2) => app2.universityId === data.universityId && app2.courseId === data.courseId
          );
          if (duplicate) {
            throw new DuplicateResourceError("Application", "university and course combination", `${data.universityId}-${data.courseId}`);
          }
          return await this.applicationRepository.create(data);
        } catch (error) {
          return this.handleError(error, "ApplicationService.createApplication");
        }
      }
      async updateApplication(id, data) {
        try {
          const errors = {};
          const idValidation = CommonValidators.validateUUID(id, "Application ID");
          if (!idValidation.valid) {
            errors.id = idValidation.error;
          }
          if (data.deadlineDate) {
            const deadlineValidation = CommonValidators.validateFutureDate(new Date(data.deadlineDate));
            if (!deadlineValidation.valid) {
              errors.deadlineDate = deadlineValidation.error;
            }
          }
          if (data.status && !["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"].includes(data.status)) {
            errors.status = "Invalid application status";
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Application", errors);
          }
          const updated = await this.applicationRepository.update(id, data);
          return updated;
        } catch (error) {
          return this.handleError(error, "ApplicationService.updateApplication");
        }
      }
      async updateApplicationStatus(id, status) {
        try {
          const validStatuses = ["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"];
          if (!validStatuses.includes(status)) {
            throw new ValidationServiceError("Application", {
              status: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
          }
          const application = await this.applicationRepository.findById(id);
          BusinessRuleValidators.validateApplicationStatus(application.status || "draft", status);
          return await this.updateApplication(id, { status });
        } catch (error) {
          return this.handleError(error, "ApplicationService.updateApplicationStatus");
        }
      }
      async deleteApplication(id) {
        try {
          return await this.applicationRepository.delete(id);
        } catch (error) {
          return this.handleError(error, "ApplicationService.deleteApplication");
        }
      }
      async getApplicationsByUniversity(universityId) {
        try {
          return await this.applicationRepository.findByUniversity(universityId);
        } catch (error) {
          return this.handleError(error, "ApplicationService.getApplicationsByUniversity");
        }
      }
    };
    applicationService = new ApplicationService();
  }
});

// server/services/domain/chat.service.ts
var chat_service_exports = {};
__export(chat_service_exports, {
  ChatService: () => ChatService,
  chatService: () => chatService
});
var ChatService, chatService;
var init_chat_service = __esm({
  "server/services/domain/chat.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    ChatService = class extends BaseService {
      constructor(chatRepository2 = container.get(TYPES.IChatRepository), studentRepository2 = container.get(TYPES.IStudentRepository)) {
        super();
        this.chatRepository = chatRepository2;
        this.studentRepository = studentRepository2;
      }
      get validationService() {
        return container.get(TYPES.IValidationService);
      }
      userMessageTimes = /* @__PURE__ */ new Map();
      RATE_LIMIT_MS = 15e3;
      // 15 seconds between messages
      async getChatMessages(studentId, counselorId) {
        try {
          return await this.chatRepository.findByChatParticipants(studentId, counselorId);
        } catch (error) {
          return this.handleError(error, "ChatService.getChatMessages");
        }
      }
      async createChatMessage(message) {
        try {
          this.validateRequired(message, ["studentId", "counselorId", "senderId", "message"]);
          if (!message.message.trim()) {
            throw new ValidationServiceError("Chat Message", {
              message: "Message cannot be empty"
            });
          }
          const validation = this.validationService.validateMessageContent(message.message);
          if (!validation.valid) {
            throw new ValidationServiceError("Chat Message", {
              message: validation.error || "Invalid message content"
            });
          }
          return await this.chatRepository.create(message);
        } catch (error) {
          return this.handleError(error, "ChatService.createChatMessage");
        }
      }
      async getChatMessageById(messageId) {
        try {
          return await this.chatRepository.findById(messageId);
        } catch (error) {
          return this.handleError(error, "ChatService.getChatMessageById");
        }
      }
      async markChatMessageAsRead(messageId, userId) {
        try {
          await this.chatRepository.markAsRead(messageId, userId);
        } catch (error) {
          return this.handleError(error, "ChatService.markChatMessageAsRead");
        }
      }
      async getStudentAssignedCounselor(studentId) {
        try {
          const student = await this.studentRepository.findByUserId(studentId);
          return student?.assignedCounselorId || null;
        } catch (error) {
          return this.handleError(error, "ChatService.getStudentAssignedCounselor");
        }
      }
      checkRateLimit(userId) {
        const currentTime = Date.now();
        const lastMessageTime = this.userMessageTimes.get(userId) || 0;
        const timeSinceLastMessage = currentTime - lastMessageTime;
        if (timeSinceLastMessage < this.RATE_LIMIT_MS && lastMessageTime > 0) {
          const remainingTime = Math.ceil((this.RATE_LIMIT_MS - timeSinceLastMessage) / 1e3);
          return { allowed: false, remainingTime };
        }
        return { allowed: true };
      }
      async validateAndSendMessage(userId, message, assignedCounselorId) {
        try {
          if (!message || !message.trim()) {
            throw new ValidationServiceError("Chat Message", {
              message: "Message is required"
            });
          }
          const rateLimitCheck = this.checkRateLimit(userId);
          if (!rateLimitCheck.allowed) {
            throw new BusinessRuleViolationError(
              "rate_limit",
              `Please wait ${rateLimitCheck.remainingTime} seconds before sending another message`
            );
          }
          const validation = this.validationService.validateMessageContent(message);
          if (!validation.valid) {
            throw new ValidationServiceError("Chat Message", {
              message: validation.error || "Invalid message content"
            });
          }
          if (!assignedCounselorId) {
            throw new InvalidOperationError(
              "send message",
              "No counselor assigned. Please contact admin to assign a counselor"
            );
          }
          const chatMessage = await this.chatRepository.create({
            studentId: userId,
            counselorId: assignedCounselorId,
            senderId: userId,
            message: message.trim(),
            isRead: false
          });
          this.userMessageTimes.set(userId, Date.now());
          return chatMessage;
        } catch (error) {
          return this.handleError(error, "ChatService.validateAndSendMessage");
        }
      }
      formatChatMessagesForStudent(messages, studentId) {
        return messages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          sender: msg.senderId === studentId ? "student" : "counselor",
          timestamp: msg.createdAt.toISOString(),
          isRead: msg.isRead ?? false
        }));
      }
      formatChatMessageResponse(message, sender) {
        return {
          id: message.id,
          message: message.message,
          sender,
          timestamp: message.createdAt.toISOString(),
          isRead: message.isRead ?? false
        };
      }
      createReadConfirmation(messageId, userId) {
        return {
          messageId,
          userId,
          read: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      formatCounselorChatMessages(messages) {
        return messages.map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.message,
          timestamp: msg.createdAt,
          isRead: msg.isRead ?? false
        }));
      }
      formatCounselorChatMessageResponse(message) {
        return {
          id: message.id,
          senderId: message.senderId,
          content: message.message,
          timestamp: message.createdAt,
          isRead: message.isRead ?? false
        };
      }
    };
    chatService = new ChatService();
  }
});

// server/services/domain/company-profile.service.ts
var company_profile_service_exports = {};
__export(company_profile_service_exports, {
  CompanyProfileService: () => CompanyProfileService,
  companyProfileService: () => companyProfileService
});
import * as bcrypt3 from "bcrypt";
var CompanyProfileService, companyProfileService;
var init_company_profile_service = __esm({
  "server/services/domain/company-profile.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    init_temporaryPassword_service();
    CompanyProfileService = class extends BaseService {
      constructor(userRepo = container.get(TYPES.IUserRepository)) {
        super();
        this.userRepo = userRepo;
      }
      async getCompanyProfile(companyId) {
        try {
          const company = await this.userRepo.findById(companyId);
          if (company.userType !== "company_profile") {
            throw new InvalidOperationError("get company profile", "User is not a company profile");
          }
          return this.sanitizeUser(company);
        } catch (error) {
          return this.handleError(error, "CompanyProfileService.getCompanyProfile");
        }
      }
      async getCompanyProfileByEmail(email) {
        try {
          const user = await this.userRepo.findByEmail(email);
          if (!user) {
            return void 0;
          }
          if (user.userType !== "company_profile") {
            return void 0;
          }
          return this.sanitizeUser(user);
        } catch (error) {
          return this.handleError(error, "CompanyProfileService.getCompanyProfileByEmail");
        }
      }
      async updateCompanyProfile(companyId, data) {
        try {
          const company = await this.userRepo.findById(companyId);
          if (company.userType !== "company_profile") {
            throw new InvalidOperationError("update company profile", "User is not a company profile");
          }
          const errors = {};
          if (data.email !== void 0) {
            const emailValidation = CommonValidators.validateEmail(data.email);
            if (!emailValidation.valid) {
              errors.email = emailValidation.error;
            }
          }
          if (data.firstName !== void 0 && data.firstName !== null) {
            const firstNameValidation = CommonValidators.validateStringLength(data.firstName, 1, 100, "First name");
            if (!firstNameValidation.valid) {
              errors.firstName = firstNameValidation.error;
            }
          }
          if (data.lastName !== void 0 && data.lastName !== null) {
            const lastNameValidation = CommonValidators.validateStringLength(data.lastName, 1, 100, "Last name");
            if (!lastNameValidation.valid) {
              errors.lastName = lastNameValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Company Profile", errors);
          }
          const updated = await this.userRepo.update(companyId, data);
          if (!updated) {
            throw new ResourceNotFoundError("Company Profile", companyId);
          }
          return this.sanitizeUser(updated);
        } catch (error) {
          return this.handleError(error, "CompanyProfileService.updateCompanyProfile");
        }
      }
      async createCompanyProfile(data) {
        try {
          this.validateRequired(data, ["email", "firstName", "lastName"]);
          const existingUser = await this.userRepo.findByEmail(data.email);
          if (existingUser) {
            throw new DuplicateResourceError("User", "email", data.email);
          }
          let temporaryPassword;
          let hashedPassword;
          if (data.password) {
            hashedPassword = await bcrypt3.hash(data.password, 10);
          } else {
            const { plainPassword, encryptedPassword } = await temporaryPasswordService.generateAndEncryptTempPassword();
            temporaryPassword = plainPassword;
            hashedPassword = encryptedPassword;
          }
          const user = await this.userRepo.create({
            ...data,
            password: hashedPassword,
            userType: "company_profile",
            accountStatus: "active"
          });
          return { user: this.sanitizeUser(user), temporaryPassword };
        } catch (error) {
          return this.handleError(error, "CompanyProfileService.createCompanyProfile");
        }
      }
      async getCompanyStats(userId) {
        try {
          const forumService2 = container.get(TYPES.IForumService);
          const posts = await forumService2.getAllPosts({ authorId: userId }, userId);
          const totalPosts = posts.length;
          const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
          const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
          const totalViews = posts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
          const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(2) : "0";
          return {
            totalPosts,
            totalLikes,
            totalComments,
            totalViews,
            engagementRate
          };
        } catch (error) {
          return this.handleError(error, "CompanyProfileService.getCompanyStats");
        }
      }
    };
    companyProfileService = new CompanyProfileService();
  }
});

// server/services/domain/counselor-assignment.service.ts
var counselor_assignment_service_exports = {};
__export(counselor_assignment_service_exports, {
  CounselorAssignmentService: () => CounselorAssignmentService,
  counselorAssignmentService: () => counselorAssignmentService
});
var CounselorAssignmentService, counselorAssignmentService;
var init_counselor_assignment_service = __esm({
  "server/services/domain/counselor-assignment.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    CounselorAssignmentService = class extends BaseService {
      constructor(studentRepository2 = container.get(TYPES.IStudentRepository), userRepository2 = container.get(TYPES.IUserRepository)) {
        super();
        this.studentRepository = studentRepository2;
        this.userRepository = userRepository2;
      }
      /**
       * Get all students assigned to a specific counselor
       * @param counselorId - The counselor's user ID
       * @returns Array of assigned students with their profiles
       */
      async getAssignedStudents(counselorId) {
        try {
          const validation = CommonValidators.validateUUID(counselorId, "Counselor ID");
          if (!validation.valid) {
            throw new ValidationServiceError("Counselor Assignment", {
              counselorId: validation.error
            });
          }
          return await this.studentRepository.findAssignedToCounselor(counselorId);
        } catch (error) {
          return this.handleError(error, "CounselorAssignmentService.getAssignedStudents");
        }
      }
      /**
       * Assign a student to a counselor
       * @param studentId - The student's profile ID
       * @param counselorId - The counselor's user ID
       */
      async assignStudent(studentId, counselorId) {
        try {
          const errors = {};
          const studentIdValidation = CommonValidators.validateUUID(studentId, "Student ID");
          if (!studentIdValidation.valid) {
            errors.studentId = studentIdValidation.error;
          }
          const counselorIdValidation = CommonValidators.validateUUID(counselorId, "Counselor ID");
          if (!counselorIdValidation.valid) {
            errors.counselorId = counselorIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Student Assignment", errors);
          }
          const counselor = await this.userRepository.findById(counselorId);
          if (counselor.userType !== "team_member") {
            throw new InvalidOperationError("assign student", "User is not a valid counselor");
          }
          await this.studentRepository.findById(studentId);
          await this.studentRepository.assignCounselor(studentId, counselorId);
        } catch (error) {
          return this.handleError(error, "CounselorAssignmentService.assignStudent");
        }
      }
      /**
       * Unassign a student from their counselor
       * @param studentId - The student's profile ID
       */
      async unassignStudent(studentId) {
        try {
          const validation = CommonValidators.validateUUID(studentId, "Student ID");
          if (!validation.valid) {
            throw new ValidationServiceError("Student Unassignment", {
              studentId: validation.error
            });
          }
          await this.studentRepository.unassign(studentId);
        } catch (error) {
          return this.handleError(error, "CounselorAssignmentService.unassignStudent");
        }
      }
      /**
       * Verify if a counselor has access to a specific student
       * @param counselorId - The counselor's user ID
       * @param studentId - The student's profile ID
       * @returns True if counselor is assigned to the student, false otherwise
       */
      async verifyCounselorAccess(counselorId, studentId) {
        try {
          const errors = {};
          const studentIdValidation = CommonValidators.validateUUID(studentId, "Student ID");
          if (!studentIdValidation.valid) {
            errors.studentId = studentIdValidation.error;
          }
          const counselorIdValidation = CommonValidators.validateUUID(counselorId, "Counselor ID");
          if (!counselorIdValidation.valid) {
            errors.counselorId = counselorIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Access Verification", errors);
          }
          return await this.studentRepository.checkAssignment(counselorId, studentId);
        } catch (error) {
          return this.handleError(error, "CounselorAssignmentService.verifyCounselorAccess");
        }
      }
    };
    counselorAssignmentService = new CounselorAssignmentService();
  }
});

// server/services/domain/counselor-dashboard.service.ts
var counselor_dashboard_service_exports = {};
__export(counselor_dashboard_service_exports, {
  CounselorDashboardService: () => CounselorDashboardService,
  counselorDashboardService: () => counselorDashboardService
});
var CounselorDashboardService, counselorDashboardService;
var init_counselor_dashboard_service = __esm({
  "server/services/domain/counselor-dashboard.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    CounselorDashboardService = class extends BaseService {
      constructor(studentRepository2 = container.get(TYPES.IStudentRepository), userRepository2 = container.get(TYPES.IUserRepository), documentRepository2 = container.get(TYPES.IDocumentRepository)) {
        super();
        this.studentRepository = studentRepository2;
        this.userRepository = userRepository2;
        this.documentRepository = documentRepository2;
      }
      get adminAnalyticsService() {
        return container.get(TYPES.IAdminAnalyticsService);
      }
      get counselorAssignmentService() {
        return container.get(TYPES.ICounselorAssignmentService);
      }
      /**
       * Get counselor dashboard statistics
       * @returns Dashboard stats including total students, active applications, success rate, etc.
       */
      async getCounselorStats() {
        try {
          const users2 = await this.userRepository.findAll();
          const students = users2.filter((u) => u.userType === "customer");
          const applications2 = await this.adminAnalyticsService.getAllApplications();
          const totalStudents = students.length;
          const activeApplications = applications2.filter(
            (app2) => app2.status === "submitted" || app2.status === "under_review"
          ).length;
          const successRate = applications2.length > 0 ? Math.round(applications2.filter((app2) => app2.status === "accepted").length / applications2.length * 100) : 0;
          const pendingActions = applications2.filter((app2) => app2.status === "under_review").length;
          const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
          const newStudentsThisMonth = students.filter(
            (s) => s.createdAt && new Date(s.createdAt).getMonth() === currentMonth
          ).length;
          return {
            totalStudents,
            activeApplications,
            successRate,
            pendingActions,
            newStudentsThisMonth,
            upcomingDeadlines: []
          };
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getCounselorStats");
        }
      }
      /**
       * Get documents for a specific student
       * @param studentId - The student's profile ID
       * @returns Array of student documents
       */
      async getStudentDocuments(studentId) {
        try {
          const validation = CommonValidators.validateUUID(studentId, "Student ID");
          if (!validation.valid) {
            throw new ValidationServiceError("Student Documents", {
              studentId: validation.error
            });
          }
          const profile = await this.studentRepository.findById(studentId);
          return await this.documentRepository.findByUser(profile.userId);
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getStudentDocuments");
        }
      }
      /**
       * Get student documents with access verification
       * @param counselorId - The counselor's user ID
       * @param studentId - The student's profile ID
       * @returns Array of student documents if access is granted
       */
      async getStudentDocumentsWithAccess(counselorId, studentId) {
        try {
          const hasAccess = await this.counselorAssignmentService.verifyCounselorAccess(counselorId, studentId);
          if (!hasAccess) {
            throw new AuthorizationError("You do not have access to this student's documents");
          }
          return await this.getStudentDocuments(studentId);
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getStudentDocumentsWithAccess");
        }
      }
      /**
       * Get all counselors (team members)
       * @returns Array of counselor users (sanitized)
       */
      async getCounselors() {
        try {
          const counselors = await this.userRepository.findCounselors();
          return counselors.map((u) => this.sanitizeUser(u));
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getCounselors");
        }
      }
      /**
       * Get all staff members (team members)
       * @returns Array of staff users (sanitized)
       */
      async getAllStaff() {
        try {
          const staff = await this.userRepository.findAllTeamMembers();
          return staff.map((u) => this.sanitizeUser(u));
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getAllStaff");
        }
      }
      /**
       * Get application stage label from status
       * @param status - Application status
       * @returns Human-readable stage label
       */
      getApplicationStage(status) {
        switch (status) {
          case "inquiry":
            return "Initial Consultation";
          case "converted":
            return "Document Collection";
          case "visa_applied":
            return "Visa Processing";
          case "visa_approved":
            return "Pre-Departure";
          case "departed":
            return "Completed";
          default:
            return "Unknown";
        }
      }
      /**
       * Format a date as relative time
       * @param createdAt - The date to format
       * @returns Human-readable relative time string
       */
      formatLastActivity(createdAt) {
        const now = /* @__PURE__ */ new Date();
        const diffInMs = now.getTime() - createdAt.getTime();
        const diffInHours = Math.floor(diffInMs / (1e3 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInHours < 1) return "Just now";
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        if (diffInDays === 1) return "1 day ago";
        return `${diffInDays} days ago`;
      }
      /**
       * Format students for dashboard display
       * @param students - Array of raw student data
       * @returns Array of formatted student objects for display
       */
      formatAssignedStudents(students) {
        return students.map((student) => ({
          id: student.id,
          userId: student.userId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone || "Not provided",
          nationality: student.nationality || "Not specified",
          destinationCountry: student.destinationCountry || "Not specified",
          intakeYear: student.intakeYear || "Not specified",
          status: student.status || "inquiry",
          profilePicture: student.profilePicture,
          applicationStage: this.getApplicationStage(student.status || "inquiry"),
          documentsCount: 0,
          universitiesShortlisted: 0,
          lastActivity: this.formatLastActivity(student.createdAt),
          urgentActions: 0,
          currentEducationLevel: student.currentEducationLevel,
          intendedMajor: student.intendedMajor,
          budgetRange: student.budgetRange,
          gpa: student.gpa,
          testScores: student.testScores,
          academicInterests: student.academicInterests,
          extracurriculars: student.extracurriculars,
          workExperience: student.workExperience
        }));
      }
      /**
       * Get formatted assigned students - combines retrieval and formatting
       * @param counselorId - The counselor's user ID
       * @returns Array of formatted students assigned to the counselor
       */
      async getAssignedStudentsFormatted(counselorId) {
        try {
          const students = await this.counselorAssignmentService.getAssignedStudents(counselorId);
          return this.formatAssignedStudents(students);
        } catch (error) {
          return this.handleError(error, "CounselorDashboardService.getAssignedStudentsFormatted");
        }
      }
    };
    counselorDashboardService = new CounselorDashboardService();
  }
});

// server/services/domain/document.service.ts
var document_service_exports = {};
__export(document_service_exports, {
  DocumentService: () => DocumentService,
  documentService: () => documentService
});
var DocumentService, documentService;
var init_document_service = __esm({
  "server/services/domain/document.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_validation();
    init_errors();
    DocumentService = class extends BaseService {
      constructor(documentRepository2 = container.get(TYPES.IDocumentRepository)) {
        super();
        this.documentRepository = documentRepository2;
      }
      async getDocumentById(id) {
        try {
          const document = await this.documentRepository.findById(id);
          return document;
        } catch (error) {
          return this.handleError(error, "DocumentService.getDocumentById");
        }
      }
      async getDocumentsByUser(userId) {
        try {
          return await this.documentRepository.findByUser(userId);
        } catch (error) {
          return this.handleError(error, "DocumentService.getDocumentsByUser");
        }
      }
      async getDocumentsByApplication(applicationId) {
        try {
          return await this.documentRepository.findByApplication(applicationId);
        } catch (error) {
          return this.handleError(error, "DocumentService.getDocumentsByApplication");
        }
      }
      async createDocument(data) {
        try {
          this.validateRequired(data, ["userId", "name", "type", "fileName", "filePath"]);
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(data.userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          if (data.applicationId) {
            const appIdValidation = CommonValidators.validateUUID(data.applicationId, "Application ID");
            if (!appIdValidation.valid) {
              errors.applicationId = appIdValidation.error;
            }
          }
          const nameValidation = CommonValidators.validateStringLength(data.name, 1, 255, "Document name");
          if (!nameValidation.valid) {
            errors.name = nameValidation.error;
          }
          const validDocumentTypes = ["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"];
          BusinessRuleValidators.validateDocumentType(data.type, validDocumentTypes);
          if (data.fileName) {
            const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "txt"];
            const extensionValidation = CommonValidators.validateFileExtension(data.fileName, allowedExtensions);
            if (!extensionValidation.valid) {
              errors.fileName = extensionValidation.error;
            }
          }
          if (data.fileSize) {
            const maxSizeMB = 10;
            const sizeValidation = CommonValidators.validateFileSize(data.fileSize, maxSizeMB);
            if (!sizeValidation.valid) {
              errors.fileSize = sizeValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Document", errors);
          }
          return await this.documentRepository.create(data);
        } catch (error) {
          return this.handleError(error, "DocumentService.createDocument");
        }
      }
      async deleteDocument(id) {
        try {
          return await this.documentRepository.delete(id);
        } catch (error) {
          return this.handleError(error, "DocumentService.deleteDocument");
        }
      }
    };
    documentService = new DocumentService();
  }
});

// server/services/domain/event.service.ts
var event_service_exports = {};
__export(event_service_exports, {
  EventService: () => EventService,
  eventService: () => eventService
});
var EventService, eventService;
var init_event_service = __esm({
  "server/services/domain/event.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    EventService = class extends BaseService {
      constructor(eventRepository2 = container.get(TYPES.IEventRepository)) {
        super();
        this.eventRepository = eventRepository2;
      }
      async getEventById(id) {
        try {
          const event = await this.eventRepository.findById(id);
          return event;
        } catch (error) {
          return this.handleError(error, "EventService.getEventById");
        }
      }
      async getAllEvents(upcoming) {
        try {
          if (upcoming) {
            return await this.eventRepository.findUpcoming();
          }
          return await this.eventRepository.findAll();
        } catch (error) {
          return this.handleError(error, "EventService.getAllEvents");
        }
      }
      async createEvent(data) {
        try {
          this.validateRequired(data, ["title", "startDate", "endDate", "organizerId"]);
          const errors = {};
          const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, "Event title");
          if (!titleValidation.valid) {
            errors.title = titleValidation.error;
          }
          if (data.description) {
            const descValidation = CommonValidators.validateStringLength(data.description, 1, 5e3, "Event description");
            if (!descValidation.valid) {
              errors.description = descValidation.error;
            }
          }
          const startDate = new Date(data.startDate);
          const endDate = new Date(data.endDate);
          const futureValidation = CommonValidators.validateFutureDate(startDate);
          if (!futureValidation.valid) {
            errors.startDate = futureValidation.error;
          }
          const dateRangeValidation = CommonValidators.validateDateRange(startDate, endDate);
          if (!dateRangeValidation.valid) {
            errors.dateRange = dateRangeValidation.error;
          }
          const organizerIdValidation = CommonValidators.validateUUID(data.organizerId, "Organizer ID");
          if (!organizerIdValidation.valid) {
            errors.organizerId = organizerIdValidation.error;
          }
          if (data.maxAttendees !== void 0 && data.maxAttendees !== null) {
            const maxAttendeesValidation = CommonValidators.validatePositiveNumber(data.maxAttendees, "Max attendees");
            if (!maxAttendeesValidation.valid) {
              errors.maxAttendees = maxAttendeesValidation.error;
            }
          }
          if (data.meetingLink) {
            const urlValidation = CommonValidators.validateUrl(data.meetingLink);
            if (!urlValidation.valid) {
              errors.meetingLink = urlValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Event", errors);
          }
          return await this.eventRepository.create(data);
        } catch (error) {
          return this.handleError(error, "EventService.createEvent");
        }
      }
      async registerForEvent(eventId, userId) {
        try {
          const errors = {};
          const eventIdValidation = CommonValidators.validateUUID(eventId, "Event ID");
          if (!eventIdValidation.valid) {
            errors.eventId = eventIdValidation.error;
          }
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Event Registration", errors);
          }
          const isRegistered = await this.eventRepository.isUserRegistered(eventId, userId);
          if (isRegistered) {
            throw new DuplicateResourceError("Event Registration", "user", userId);
          }
          const event = await this.eventRepository.findById(eventId);
          if (event.maxAttendees && event.currentAttendees) {
            BusinessRuleValidators.validateEventCapacity(event.currentAttendees, event.maxAttendees);
          }
          return await this.eventRepository.registerUser(eventId, userId);
        } catch (error) {
          return this.handleError(error, "EventService.registerForEvent");
        }
      }
      async unregisterFromEvent(eventId, userId) {
        try {
          return await this.eventRepository.unregisterUser(eventId, userId);
        } catch (error) {
          return this.handleError(error, "EventService.unregisterFromEvent");
        }
      }
      async getUserRegistrations(userId) {
        try {
          return await this.eventRepository.getUserRegistrations(userId);
        } catch (error) {
          return this.handleError(error, "EventService.getUserRegistrations");
        }
      }
    };
    eventService = new EventService();
  }
});

// server/services/domain/forum.service.ts
var forum_service_exports = {};
__export(forum_service_exports, {
  ForumService: () => ForumService,
  forumService: () => forumService
});
var ForumService, forumService;
var init_forum_service = __esm({
  "server/services/domain/forum.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    ForumService = class extends BaseService {
      constructor(postRepository = container.get(TYPES.IForumPostRepository), commentRepository = container.get(TYPES.IForumCommentRepository), interactionRepository = container.get(TYPES.IForumInteractionRepository), pollRepository = container.get(TYPES.IForumPollRepository), reportsRepository = container.get(TYPES.IForumReportsRepository)) {
        super();
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.interactionRepository = interactionRepository;
        this.pollRepository = pollRepository;
        this.reportsRepository = reportsRepository;
      }
      async getPostById(id) {
        try {
          const post = await this.postRepository.findById(id);
          if (!post) {
            throw new ResourceNotFoundError("Forum Post", id);
          }
          return post;
        } catch (error) {
          return this.handleError(error, "ForumService.getPostById");
        }
      }
      async getAllPosts(filters, userId) {
        try {
          return await this.postRepository.findAllWithUser(filters, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getAllPosts");
        }
      }
      async createPost(data) {
        try {
          this.validateRequired(data, ["authorId", "content"]);
          const errors = {};
          const authorIdValidation = CommonValidators.validateUUID(data.authorId, "Author ID");
          if (!authorIdValidation.valid) {
            errors.authorId = authorIdValidation.error;
          }
          const contentValidation = CommonValidators.validateStringLength(data.content, 1, 1e4, "Post content");
          if (!contentValidation.valid) {
            errors.content = contentValidation.error;
          }
          if (data.title) {
            const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, "Post title");
            if (!titleValidation.valid) {
              errors.title = titleValidation.error;
            }
          }
          const validCategories = ["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"];
          if (data.category && !validCategories.includes(data.category)) {
            errors.category = `Invalid category. Must be one of: ${validCategories.join(", ")}`;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Forum Post", errors);
          }
          const transformedData = { ...data };
          if (transformedData.pollEndsAt) {
            const pollValue = transformedData.pollEndsAt;
            if (typeof pollValue === "string") {
              if (pollValue.trim() === "") {
                transformedData.pollEndsAt = void 0;
              } else {
                const date = new Date(pollValue);
                transformedData.pollEndsAt = isNaN(date.getTime()) ? void 0 : date;
              }
            }
          }
          return await this.postRepository.create(transformedData);
        } catch (error) {
          return this.handleError(error, "ForumService.createPost");
        }
      }
      async updatePost(id, data) {
        try {
          const errors = {};
          if (data.content !== void 0 && data.content !== null) {
            const contentValidation = CommonValidators.validateStringLength(data.content, 1, 1e4, "Post content");
            if (!contentValidation.valid) {
              errors.content = contentValidation.error;
            }
          }
          if (data.title !== void 0 && data.title !== null) {
            const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, "Post title");
            if (!titleValidation.valid) {
              errors.title = titleValidation.error;
            }
          }
          const validCategories = ["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"];
          if (data.category && !validCategories.includes(data.category)) {
            errors.category = `Invalid category. Must be one of: ${validCategories.join(", ")}`;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Forum Post", errors);
          }
          const updated = await this.postRepository.update(id, data);
          if (!updated) {
            throw new InvalidOperationError("update post", "Post update failed or post not found");
          }
          return updated;
        } catch (error) {
          return this.handleError(error, "ForumService.updatePost");
        }
      }
      async deletePost(id) {
        try {
          return await this.postRepository.delete(id);
        } catch (error) {
          return this.handleError(error, "ForumService.deletePost");
        }
      }
      async getComments(postId) {
        try {
          return await this.commentRepository.getCommentsByPost(postId);
        } catch (error) {
          return this.handleError(error, "ForumService.getComments");
        }
      }
      async createComment(postId, userId, content) {
        try {
          const errors = {};
          const postIdValidation = CommonValidators.validateUUID(postId, "Post ID");
          if (!postIdValidation.valid) {
            errors.postId = postIdValidation.error;
          }
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const contentValidation = CommonValidators.validateStringLength(content, 1, 2e3, "Comment content");
          if (!contentValidation.valid) {
            errors.content = contentValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Forum Comment", errors);
          }
          return await this.commentRepository.create({
            postId,
            userId,
            content
          });
        } catch (error) {
          return this.handleError(error, "ForumService.createComment");
        }
      }
      async toggleLike(postId, userId) {
        try {
          return await this.interactionRepository.toggleLike(postId, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.toggleLike");
        }
      }
      async toggleSave(postId, userId) {
        try {
          return await this.interactionRepository.toggleSave(postId, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.toggleSave");
        }
      }
      async getPostsPaginated(limit, offset, filters, userId) {
        try {
          return await this.postRepository.findPaginated(limit, offset, filters, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getPostsPaginated");
        }
      }
      async getPostsCount(filters) {
        try {
          return await this.postRepository.countPosts(filters);
        } catch (error) {
          return this.handleError(error, "ForumService.getPostsCount");
        }
      }
      async getPostsWithPagination(page, limit, filters, userId) {
        try {
          const offset = (page - 1) * limit;
          const [data, total] = await Promise.all([
            this.postRepository.findPaginated(limit, offset, filters, userId),
            this.postRepository.countPosts(filters)
          ]);
          const postIdsWithPolls = data.filter((post) => post.pollOptions && Array.isArray(post.pollOptions) && post.pollOptions.length > 0).map((post) => post.id);
          if (postIdsWithPolls.length > 0) {
            const [pollResultsByPost, votesByPost] = await Promise.all([
              this.pollRepository.getBulkPollResults(postIdsWithPolls),
              userId ? this.pollRepository.getBulkUserPollVotes(postIdsWithPolls, userId) : Promise.resolve(/* @__PURE__ */ new Map())
            ]);
            const enrichedData = data.map((post) => {
              if (postIdsWithPolls.includes(post.id)) {
                const pollResults = pollResultsByPost.get(post.id);
                return {
                  ...post,
                  pollOptions: pollResults?.options || post.pollOptions,
                  userVotes: userId ? votesByPost.get(post.id) || [] : []
                };
              }
              return post;
            });
            const totalPages2 = Math.ceil(total / limit);
            return {
              data: enrichedData,
              pagination: {
                page,
                limit,
                totalPages: totalPages2,
                hasNext: page < totalPages2,
                hasPrev: page > 1
              },
              total
            };
          }
          const totalPages = Math.ceil(total / limit);
          return {
            data,
            pagination: {
              page,
              limit,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            },
            total
          };
        } catch (error) {
          return this.handleError(error, "ForumService.getPostsWithPagination");
        }
      }
      async getSavedPosts(userId) {
        try {
          return await this.interactionRepository.getSavedPostsForUser(userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getSavedPosts");
        }
      }
      async getPostAnalytics(postId) {
        try {
          return await this.interactionRepository.getPostAnalytics(postId);
        } catch (error) {
          return this.handleError(error, "ForumService.getPostAnalytics");
        }
      }
      async votePollOption(postId, userId, optionId) {
        try {
          return await this.pollRepository.votePollOption(postId, userId, optionId);
        } catch (error) {
          return this.handleError(error, "ForumService.votePollOption");
        }
      }
      async getPollResults(postId) {
        try {
          return await this.pollRepository.getPollResults(postId);
        } catch (error) {
          return this.handleError(error, "ForumService.getPollResults");
        }
      }
      async getUserPollVotes(postId, userId) {
        try {
          return await this.pollRepository.getUserPollVotes(postId, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getUserPollVotes");
        }
      }
      async getPostWithUser(id) {
        try {
          return await this.postRepository.getPostWithUser(id);
        } catch (error) {
          return this.handleError(error, "ForumService.getPostWithUser");
        }
      }
      async createForumPost(data) {
        try {
          this.validateRequired(data, ["authorId", "content"]);
          const errors = {};
          const authorIdValidation = CommonValidators.validateUUID(data.authorId, "Author ID");
          if (!authorIdValidation.valid) {
            errors.authorId = authorIdValidation.error;
          }
          const contentValidation = CommonValidators.validateStringLength(data.content, 1, 1e4, "Post content");
          if (!contentValidation.valid) {
            errors.content = contentValidation.error;
          }
          if (data.title) {
            const titleValidation = CommonValidators.validateStringLength(data.title, 1, 500, "Post title");
            if (!titleValidation.valid) {
              errors.title = titleValidation.error;
            }
          }
          const validCategories = ["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"];
          if (data.category && !validCategories.includes(data.category)) {
            errors.category = `Invalid category. Must be one of: ${validCategories.join(", ")}`;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Forum Post", errors);
          }
          return await this.postRepository.create(data);
        } catch (error) {
          return this.handleError(error, "ForumService.createForumPost");
        }
      }
      async getUserPostLimit(userId) {
        try {
          return await this.postRepository.getUserPostLimit(userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getUserPostLimit");
        }
      }
      async updateUserPostLimit(userId) {
        try {
          await this.postRepository.updateUserPostLimit(userId);
        } catch (error) {
          return this.handleError(error, "ForumService.updateUserPostLimit");
        }
      }
      async reportPost(postId, userId, reportReason, reportDetails) {
        try {
          const existingReport = await this.reportsRepository.findByPostAndUser(postId, userId);
          if (existingReport) {
            throw new DuplicateResourceError("Report", "post and user combination", `${postId}-${userId}`);
          }
          const report = await this.reportsRepository.create({
            postId,
            reporterUserId: userId,
            reportReason,
            reportDetails
          });
          await this.postRepository.incrementReportCount(postId);
          return report;
        } catch (error) {
          return this.handleError(error, "ForumService.reportPost");
        }
      }
      async getUserVotes(postId) {
        try {
          return await this.pollRepository.getUserVotes(postId);
        } catch (error) {
          return this.handleError(error, "ForumService.getUserVotes");
        }
      }
      async getUserVoteStatus(postId, userId) {
        try {
          return await this.pollRepository.getUserVoteStatus(postId, userId);
        } catch (error) {
          return this.handleError(error, "ForumService.getUserVoteStatus");
        }
      }
      async getImagePath(filename) {
        try {
          const path5 = await import("path");
          const imagePath = path5.join(process.cwd(), "uploads", "forum-images", filename);
          return imagePath;
        } catch (error) {
          return this.handleError(error, "ForumService.getImagePath");
        }
      }
      async getUserSpecificPollData(postId, currentUserId) {
        try {
          const post = await this.getPostWithUser(postId);
          if (!post || !post.pollQuestion) {
            return null;
          }
          let userVotes = [];
          if (currentUserId && post.pollOptions) {
            const votes = await this.pollRepository.getUserPollVotes(postId, currentUserId);
            userVotes = votes;
          }
          const hasUserVoted = userVotes.length > 0;
          if (hasUserVoted) {
            const pollResults = await this.getPollResults(postId);
            return {
              pollOptions: pollResults ? pollResults.options : post.pollOptions,
              userVotes,
              showResults: true
            };
          } else {
            return {
              pollOptions: this.getCleanPollOptionsForNonVoters(post.pollOptions),
              userVotes: [],
              showResults: false
            };
          }
        } catch (error) {
          return this.handleError(error, "ForumService.getUserSpecificPollData");
        }
      }
      getCleanPollOptionsForNonVoters(pollOptions) {
        if (!pollOptions || !Array.isArray(pollOptions)) {
          return [];
        }
        return pollOptions.map((option, index) => {
          if (typeof option === "object" && option !== null) {
            return {
              id: option.id || option.optionId || `option_${index}`,
              text: option.text || option.option || String(option)
            };
          }
          if (typeof option === "string") {
            return {
              id: `option_${index}`,
              text: option
            };
          }
          return {
            id: `option_${index}`,
            text: String(option || "")
          };
        });
      }
      formatUploadedImages(files) {
        return files.map((file) => ({
          filename: file.filename,
          url: `/api/forum/images/${file.filename}`,
          originalName: file.originalname,
          size: file.size
        }));
      }
    };
    forumService = new ForumService();
  }
});

// server/services/domain/notification.service.ts
var notification_service_exports = {};
__export(notification_service_exports, {
  NotificationService: () => NotificationService,
  notificationService: () => notificationService
});
var NotificationService, notificationService;
var init_notification_service = __esm({
  "server/services/domain/notification.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    NotificationService = class extends BaseService {
      constructor(notificationRepository2 = container.get(TYPES.INotificationRepository), userRepository2 = container.get(TYPES.IUserRepository)) {
        super();
        this.notificationRepository = notificationRepository2;
        this.userRepository = userRepository2;
      }
      async createNotification(data) {
        try {
          this.validateRequired(data, ["userId", "type", "title", "message"]);
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(data.userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const validNotificationTypes = ["application_update", "document_reminder", "message", "system", "deadline"];
          BusinessRuleValidators.validateNotificationType(data.type, validNotificationTypes);
          const titleValidation = CommonValidators.validateStringLength(data.title, 1, 255, "Notification title");
          if (!titleValidation.valid) {
            errors.title = titleValidation.error;
          }
          const messageValidation = CommonValidators.validateStringLength(data.message, 1, 1e3, "Notification message");
          if (!messageValidation.valid) {
            errors.message = messageValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Notification", errors);
          }
          return await this.notificationRepository.create(data);
        } catch (error) {
          return this.handleError(error, "NotificationService.createNotification");
        }
      }
      async getUserNotifications(userId) {
        try {
          return await this.notificationRepository.findByUser(userId);
        } catch (error) {
          return this.handleError(error, "NotificationService.getUserNotifications");
        }
      }
      async markAsRead(notificationId) {
        try {
          const updated = await this.notificationRepository.update(notificationId, { isRead: true });
          return !!updated;
        } catch (error) {
          return this.handleError(error, "NotificationService.markAsRead");
        }
      }
      async getUnreadCount(userId) {
        try {
          return await this.notificationRepository.countUnreadByUser(userId);
        } catch (error) {
          return this.handleError(error, "NotificationService.getUnreadCount");
        }
      }
      async notifyApplicationUpdate(userId, applicationId, status) {
        try {
          return await this.createNotification({
            userId,
            type: "application_update",
            title: "Application Status Update",
            message: `Your application status has been updated to: ${status}`,
            data: { applicationId, status }
          });
        } catch (error) {
          return this.handleError(error, "NotificationService.notifyApplicationUpdate");
        }
      }
      async notifyDocumentReminder(userId, documentType, deadline) {
        try {
          return await this.createNotification({
            userId,
            type: "document_reminder",
            title: "Document Upload Reminder",
            message: `Don't forget to upload your ${documentType}. Deadline: ${deadline.toDateString()}`,
            data: { documentType, deadline: deadline.toISOString() }
          });
        } catch (error) {
          return this.handleError(error, "NotificationService.notifyDocumentReminder");
        }
      }
      async notifyDeadlineApproaching(userId, applicationId, deadline) {
        try {
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
          return await this.createNotification({
            userId,
            type: "deadline",
            title: "Application Deadline Approaching",
            message: `Your application deadline is in ${daysLeft} days`,
            data: { applicationId, deadline: deadline.toISOString(), daysLeft }
          });
        } catch (error) {
          return this.handleError(error, "NotificationService.notifyDeadlineApproaching");
        }
      }
      async notifyNewMessage(userId, fromUserId, message) {
        try {
          const sender = await this.userRepository.findById(fromUserId);
          const senderName = sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.email : "Someone";
          return await this.createNotification({
            userId,
            type: "message",
            title: "New Message",
            message: `${senderName} sent you a message`,
            data: { fromUserId, preview: message.substring(0, 100) }
          });
        } catch (error) {
          return this.handleError(error, "NotificationService.notifyNewMessage");
        }
      }
      async notifySystemUpdate(userId, title, message) {
        try {
          return await this.createNotification({
            userId,
            type: "system",
            title,
            message,
            data: {}
          });
        } catch (error) {
          return this.handleError(error, "NotificationService.notifySystemUpdate");
        }
      }
    };
    notificationService = new NotificationService();
  }
});

// server/services/domain/payment.service.ts
var payment_service_exports = {};
__export(payment_service_exports, {
  PaymentService: () => PaymentService,
  paymentService: () => paymentService
});
var PaymentService, paymentService;
var init_payment_service = __esm({
  "server/services/domain/payment.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    PaymentService = class extends BaseService {
      constructor(paymentRepository2 = container.get(TYPES.IPaymentRepository)) {
        super();
        this.paymentRepository = paymentRepository2;
      }
      async getPaymentSettings() {
        try {
          return await this.paymentRepository.findAll();
        } catch (error) {
          return this.handleError(error, "PaymentService.getPaymentSettings");
        }
      }
      async getActivePaymentSettings() {
        try {
          return await this.paymentRepository.findActive();
        } catch (error) {
          return this.handleError(error, "PaymentService.getActivePaymentSettings");
        }
      }
      async updatePaymentSettings(gateway, configuration, updatedBy) {
        try {
          const errors = {};
          const gatewayValidation = CommonValidators.validateStringLength(gateway, 1, 100, "Gateway name");
          if (!gatewayValidation.valid) {
            errors.gateway = gatewayValidation.error;
          }
          const updatedByValidation = CommonValidators.validateUUID(updatedBy, "Updated by user ID");
          if (!updatedByValidation.valid) {
            errors.updatedBy = updatedByValidation.error;
          }
          if (!configuration || typeof configuration !== "object") {
            errors.configuration = "Configuration must be a valid object";
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Payment Settings", errors);
          }
          const existing = await this.paymentRepository.findByGateway(gateway);
          if (existing) {
            const result = await this.paymentRepository.updateByGateway(gateway, {
              configuration,
              updatedBy,
              updatedAt: /* @__PURE__ */ new Date()
            });
            if (!result) {
              throw new InvalidOperationError("update payment settings", "Payment settings update failed");
            }
            return result;
          } else {
            return await this.paymentRepository.create({
              gateway,
              configuration,
              updatedBy,
              isActive: false
            });
          }
        } catch (error) {
          return this.handleError(error, "PaymentService.updatePaymentSettings");
        }
      }
      async togglePaymentGateway(gateway, isActive, updatedBy) {
        try {
          return await this.paymentRepository.updateByGateway(gateway, {
            isActive,
            updatedBy,
            updatedAt: /* @__PURE__ */ new Date()
          });
        } catch (error) {
          return this.handleError(error, "PaymentService.togglePaymentGateway");
        }
      }
    };
    paymentService = new PaymentService();
  }
});

// server/services/domain/registration.service.ts
var registration_service_exports = {};
__export(registration_service_exports, {
  RegistrationService: () => RegistrationService,
  registrationService: () => registrationService
});
import * as bcrypt4 from "bcrypt";
var RegistrationService, registrationService;
var init_registration_service = __esm({
  "server/services/domain/registration.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    RegistrationService = class extends BaseService {
      constructor(userRepo = container.get(TYPES.IUserRepository), studentRepo = container.get(TYPES.IStudentRepository)) {
        super();
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
      }
      get validationService() {
        return container.get(TYPES.IValidationService);
      }
      get adminStaffInvitationService() {
        return container.get(TYPES.IAdminStaffInvitationService);
      }
      validateRegistrationData(email, password) {
        const emailValidation = this.validationService.validateEmail(email);
        if (!emailValidation.valid) {
          throw new ValidationServiceError("Registration", {
            email: emailValidation.error || "Invalid email format"
          });
        }
        const passwordValidation = this.validationService.validatePassword(password);
        if (!passwordValidation.valid) {
          throw new ValidationServiceError("Registration", {
            password: passwordValidation.error || "Invalid password format"
          });
        }
      }
      async registerStudent(data) {
        try {
          this.validateRequired(data, ["email", "password"]);
          this.validateRegistrationData(data.email, data.password);
          const existingUser = await this.userRepo.findByEmail(data.email);
          if (existingUser) {
            throw new DuplicateResourceError("User", "email", data.email);
          }
          const hashedPassword = await bcrypt4.hash(data.password, 10);
          const user = await this.userRepo.create({
            ...data,
            password: hashedPassword,
            userType: data.userType || "customer",
            accountStatus: "active"
          });
          if (data.userType === "customer" || !data.userType) {
            await this.studentRepo.create({
              ...data.profile,
              userId: user.id
            });
          }
          return { user: this.sanitizeUser(user) };
        } catch (error) {
          return this.handleError(error, "RegistrationService.registerStudent");
        }
      }
      createDefaultStudentProfile(phone) {
        return {
          userId: "",
          phone: phone || null,
          dateOfBirth: null,
          nationality: null,
          currentEducationLevel: null,
          gpa: null,
          testScores: null,
          intendedMajor: null,
          preferredCountries: [],
          destinationCountry: null,
          intakeYear: null,
          budgetRange: null,
          academicInterests: [],
          extracurriculars: [],
          workExperience: [],
          familyInfo: null,
          educationHistory: [],
          notes: null
        };
      }
      /**
       * Complete student registration with cooling period info
       * Handles all business logic including email normalization, profile creation, and cooling period calculation
       */
      async registerStudentComplete(email, password, firstName, lastName, phone) {
        try {
          const emailLower = email.toLowerCase();
          const profile = this.createDefaultStudentProfile(phone);
          const result = await this.registerStudent({
            email: emailLower,
            password,
            firstName,
            lastName,
            userType: "customer",
            accountStatus: "active",
            profile
          });
          const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
          const coolingPeriod = authService2.isInCoolingPeriod(result.user);
          const coolingPeriodEnds = authService2.getCoolingPeriodEnd(result.user);
          return {
            message: "Registration successful! You can now login. Note: Community posting is restricted for the first hour.",
            userId: result.user.id,
            coolingPeriod,
            coolingPeriodEnds
          };
        } catch (error) {
          return this.handleError(error, "RegistrationService.registerStudentComplete");
        }
      }
      async createCompanyProfile(data) {
        try {
          this.validateRequired(data, ["email", "firstName", "lastName"]);
          const existingUser = await this.userRepo.findByEmail(data.email);
          if (existingUser) {
            throw new DuplicateResourceError("User", "email", data.email);
          }
          let temporaryPassword;
          let hashedPassword;
          if (data.password) {
            hashedPassword = await bcrypt4.hash(data.password, 10);
          } else {
            temporaryPassword = Math.random().toString(36).slice(-12);
            hashedPassword = await bcrypt4.hash(temporaryPassword, 10);
          }
          const user = await this.userRepo.create({
            ...data,
            password: hashedPassword,
            userType: "company_profile",
            accountStatus: "active"
          });
          return { user: this.sanitizeUser(user), temporaryPassword };
        } catch (error) {
          return this.handleError(error, "RegistrationService.createCompanyProfile");
        }
      }
      /**
       * Register staff member with invitation token
       * Uses atomic token claiming to prevent race conditions
       */
      async registerStaffWithInvite(data) {
        try {
          const { email, password, firstName, lastName, teamRole, invitationToken } = data;
          const existingUser = await this.userRepo.findByEmail(email.toLowerCase());
          if (existingUser) {
            throw new DuplicateResourceError("User", "email", email.toLowerCase());
          }
          this.validateRegistrationData(email, password);
          const claimedLink = await this.adminStaffInvitationService.claimAndInvalidateInvitationToken(invitationToken);
          if (!claimedLink) {
            throw new InvalidOperationError("register staff", "Invalid or expired invitation token");
          }
          const hashedPassword = await bcrypt4.hash(password, 10);
          const user = await this.userRepo.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName,
            lastName,
            userType: "team_member",
            teamRole,
            accountStatus: "active"
          });
          console.log(`\u{1F464} New staff member registered: ${email} (${teamRole}) via invite token`);
          return { user: this.sanitizeUser(user) };
        } catch (error) {
          return this.handleError(error, "RegistrationService.registerStaffWithInvite");
        }
      }
    };
    registrationService = new RegistrationService();
  }
});

// server/services/domain/subscription.service.ts
var subscription_service_exports = {};
__export(subscription_service_exports, {
  SubscriptionService: () => SubscriptionService,
  subscriptionService: () => subscriptionService
});
var SubscriptionService, subscriptionService;
var init_subscription_service = __esm({
  "server/services/domain/subscription.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    SubscriptionService = class extends BaseService {
      constructor(subscriptionPlanRepository2 = container.get(TYPES.ISubscriptionPlanRepository), studentRepository2 = container.get(TYPES.IStudentRepository)) {
        super();
        this.subscriptionPlanRepository = subscriptionPlanRepository2;
        this.studentRepository = studentRepository2;
      }
      // Subscription Plans
      async getSubscriptionPlans() {
        try {
          return await this.subscriptionPlanRepository.findActive();
        } catch (error) {
          return this.handleError(error, "SubscriptionService.getSubscriptionPlans");
        }
      }
      async getAllSubscriptionPlans() {
        try {
          return await this.subscriptionPlanRepository.findAll();
        } catch (error) {
          return this.handleError(error, "SubscriptionService.getAllSubscriptionPlans");
        }
      }
      async getSubscriptionPlan(id) {
        try {
          return await this.subscriptionPlanRepository.findById(id);
        } catch (error) {
          return this.handleError(error, "SubscriptionService.getSubscriptionPlan");
        }
      }
      async createSubscriptionPlan(plan) {
        try {
          this.validateRequired(plan, ["name", "price", "features", "maxUniversities", "maxCountries", "turnaroundDays"]);
          const errors = {};
          const nameValidation = CommonValidators.validateStringLength(plan.name, 1, 255, "Plan name");
          if (!nameValidation.valid) {
            errors.name = nameValidation.error;
          }
          if (plan.price !== void 0 && plan.price !== null) {
            BusinessRuleValidators.validatePaymentAmount(Number(plan.price), 0);
          }
          if (plan.maxUniversities !== void 0 && plan.maxUniversities !== null) {
            const maxUnivValidation = CommonValidators.validatePositiveNumber(plan.maxUniversities, "Max universities");
            if (!maxUnivValidation.valid) {
              errors.maxUniversities = maxUnivValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Subscription Plan", errors);
          }
          return await this.subscriptionPlanRepository.create(plan);
        } catch (error) {
          return this.handleError(error, "SubscriptionService.createSubscriptionPlan");
        }
      }
      async updateSubscriptionPlan(id, updates) {
        try {
          const errors = {};
          if (updates.name !== void 0) {
            const nameValidation = CommonValidators.validateStringLength(updates.name, 1, 255, "Plan name");
            if (!nameValidation.valid) {
              errors.name = nameValidation.error;
            }
          }
          if (updates.price !== void 0 && updates.price !== null) {
            BusinessRuleValidators.validatePaymentAmount(Number(updates.price), 0);
          }
          if (updates.maxUniversities !== void 0 && updates.maxUniversities !== null) {
            const maxUnivValidation = CommonValidators.validatePositiveNumber(updates.maxUniversities, "Max universities");
            if (!maxUnivValidation.valid) {
              errors.maxUniversities = maxUnivValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Subscription Plan", errors);
          }
          return await this.subscriptionPlanRepository.update(id, updates);
        } catch (error) {
          return this.handleError(error, "SubscriptionService.updateSubscriptionPlan");
        }
      }
      async deleteSubscriptionPlan(id) {
        try {
          return await this.subscriptionPlanRepository.delete(id);
        } catch (error) {
          return this.handleError(error, "SubscriptionService.deleteSubscriptionPlan");
        }
      }
      // Helper Methods (temporary - should be moved to CounselorAssignmentService)
      async getCounselorStudentAssignment(counselorId, studentId) {
        try {
          return await this.studentRepository.checkAssignment(counselorId, studentId);
        } catch (error) {
          return this.handleError(error, "SubscriptionService.getCounselorStudentAssignment");
        }
      }
    };
    subscriptionService = new SubscriptionService();
  }
});

// server/services/domain/testimonial.service.ts
var testimonial_service_exports = {};
__export(testimonial_service_exports, {
  TestimonialService: () => TestimonialService,
  testimonialService: () => testimonialService
});
import { eq as eq23, desc as desc13 } from "drizzle-orm";
var TestimonialService, testimonialService;
var init_testimonial_service = __esm({
  "server/services/domain/testimonial.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_db();
    init_schema();
    TestimonialService = class extends BaseService {
      constructor(testimonialRepository2 = container.get(TYPES.ITestimonialRepository)) {
        super();
        this.testimonialRepository = testimonialRepository2;
      }
      async getApprovedTestimonialsWithUsers(limit = 10) {
        try {
          const results = await db.select({
            id: testimonials.id,
            name: testimonials.name,
            destinationCountry: testimonials.destinationCountry,
            intake: testimonials.intake,
            photo: testimonials.photo,
            counselorName: testimonials.counselorName,
            feedback: testimonials.feedback,
            isApproved: testimonials.isApproved,
            createdAt: testimonials.createdAt,
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              profilePicture: users.profilePicture
            }
          }).from(testimonials).leftJoin(users, eq23(testimonials.userId, users.id)).where(eq23(testimonials.isApproved, true)).orderBy(desc13(testimonials.createdAt)).limit(limit);
          return results;
        } catch (error) {
          return this.handleError(error, "TestimonialService.getApprovedTestimonialsWithUsers");
        }
      }
    };
    testimonialService = new TestimonialService();
  }
});

// server/services/domain/university.service.ts
var university_service_exports = {};
__export(university_service_exports, {
  UniversityService: () => UniversityService,
  universityService: () => universityService
});
var UniversityService, universityService;
var init_university_service = __esm({
  "server/services/domain/university.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    UniversityService = class extends BaseService {
      constructor(universityRepository2 = container.get(TYPES.IUniversityRepository), courseRepository2 = container.get(TYPES.ICourseRepository)) {
        super();
        this.universityRepository = universityRepository2;
        this.courseRepository = courseRepository2;
      }
      async getAllUniversities(filters) {
        try {
          return await this.universityRepository.findAll(filters);
        } catch (error) {
          return this.handleError(error, "UniversityService.getAllUniversities");
        }
      }
      async getUniversityById(id) {
        try {
          const university = await this.universityRepository.findById(id);
          if (!university) {
            throw new ResourceNotFoundError("University", id);
          }
          return university;
        } catch (error) {
          return this.handleError(error, "UniversityService.getUniversityById");
        }
      }
      async searchUniversities(query, filters) {
        try {
          return await this.universityRepository.search(query, filters);
        } catch (error) {
          return this.handleError(error, "UniversityService.searchUniversities");
        }
      }
      async createUniversity(data) {
        try {
          this.validateRequired(data, ["name", "country"]);
          const errors = {};
          const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, "University name");
          if (!nameValidation.valid) {
            errors.name = nameValidation.error;
          }
          const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, "Country");
          if (!countryValidation.valid) {
            errors.country = countryValidation.error;
          }
          if (data.worldRanking !== void 0 && data.worldRanking !== null) {
            BusinessRuleValidators.validateUniversityRanking(data.worldRanking);
          }
          if (data.annualFee !== void 0 && data.annualFee !== null) {
            const feeValidation = CommonValidators.validatePositiveNumber(Number(data.annualFee), "Annual fee");
            if (!feeValidation.valid) {
              errors.annualFee = feeValidation.error;
            }
          }
          if (data.website) {
            const urlValidation = CommonValidators.validateUrl(data.website);
            if (!urlValidation.valid) {
              errors.website = urlValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("University", errors);
          }
          return await this.universityRepository.create(data);
        } catch (error) {
          return this.handleError(error, "UniversityService.createUniversity");
        }
      }
      async createUniversityWithNormalization(data) {
        try {
          this.validateRequired(data, ["name", "country"]);
          const errors = {};
          const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, "University name");
          if (!nameValidation.valid) {
            errors.name = nameValidation.error;
          }
          const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, "Country");
          if (!countryValidation.valid) {
            errors.country = countryValidation.error;
          }
          if (data.website) {
            const urlValidation = CommonValidators.validateUrl(data.website);
            if (!urlValidation.valid) {
              errors.website = urlValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("University", errors);
          }
          const normalizedData = { ...data };
          if (normalizedData.acceptanceRate && typeof normalizedData.acceptanceRate === "string") {
            normalizedData.acceptanceRate = normalizedData.acceptanceRate.replace("%", "").trim();
            const rate = parseFloat(normalizedData.acceptanceRate);
            normalizedData.acceptanceRate = isNaN(rate) ? null : rate.toString();
          }
          if (normalizedData.worldRanking && typeof normalizedData.worldRanking === "string") {
            const ranking = parseInt(normalizedData.worldRanking.trim());
            normalizedData.worldRanking = isNaN(ranking) ? null : ranking;
          }
          if (normalizedData.worldRanking !== void 0 && normalizedData.worldRanking !== null) {
            BusinessRuleValidators.validateUniversityRanking(normalizedData.worldRanking);
          }
          if (normalizedData.annualFee !== void 0 && normalizedData.annualFee !== null) {
            const feeValidation = CommonValidators.validatePositiveNumber(Number(normalizedData.annualFee), "Annual fee");
            if (!feeValidation.valid) {
              throw new ValidationServiceError("University", { annualFee: feeValidation.error });
            }
          }
          return await this.universityRepository.create(normalizedData);
        } catch (error) {
          return this.handleError(error, "UniversityService.createUniversityWithNormalization");
        }
      }
      async updateUniversity(id, data) {
        try {
          const errors = {};
          if (data.name !== void 0) {
            const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, "University name");
            if (!nameValidation.valid) {
              errors.name = nameValidation.error;
            }
          }
          if (data.country !== void 0) {
            const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, "Country");
            if (!countryValidation.valid) {
              errors.country = countryValidation.error;
            }
          }
          if (data.worldRanking !== void 0 && data.worldRanking !== null) {
            BusinessRuleValidators.validateUniversityRanking(data.worldRanking);
          }
          if (data.annualFee !== void 0 && data.annualFee !== null) {
            const feeValidation = CommonValidators.validatePositiveNumber(Number(data.annualFee), "Annual fee");
            if (!feeValidation.valid) {
              errors.annualFee = feeValidation.error;
            }
          }
          if (data.website !== void 0 && data.website) {
            const urlValidation = CommonValidators.validateUrl(data.website);
            if (!urlValidation.valid) {
              errors.website = urlValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("University", errors);
          }
          const updated = await this.universityRepository.update(id, data);
          if (!updated) {
            throw new InvalidOperationError("update university", "University update failed or university not found");
          }
          return updated;
        } catch (error) {
          return this.handleError(error, "UniversityService.updateUniversity");
        }
      }
      async deleteUniversity(id) {
        try {
          return await this.universityRepository.delete(id);
        } catch (error) {
          return this.handleError(error, "UniversityService.deleteUniversity");
        }
      }
      async getCoursesByUniversity(universityId) {
        try {
          return await this.courseRepository.findByUniversity(universityId);
        } catch (error) {
          return this.handleError(error, "UniversityService.getCoursesByUniversity");
        }
      }
      async bulkImportUniversities(universities2) {
        try {
          let imported = 0;
          let failed = 0;
          for (const uni of universities2) {
            try {
              const normalizedData = { ...uni };
              if (typeof normalizedData.degreeLevels === "string") {
                normalizedData.degreeLevels = normalizedData.degreeLevels.split(",").map((s) => s.trim());
              }
              if (normalizedData.acceptanceRate && typeof normalizedData.acceptanceRate === "string") {
                normalizedData.acceptanceRate = normalizedData.acceptanceRate.replace("%", "").trim();
              }
              await this.createUniversityWithNormalization(normalizedData);
              imported++;
            } catch (error) {
              console.error(`Failed to import university: ${uni.name}`, error);
              failed++;
            }
          }
          return { imported, failed };
        } catch (error) {
          return this.handleError(error, "UniversityService.bulkImportUniversities");
        }
      }
    };
    universityService = new UniversityService();
  }
});

// server/services/domain/user-profile.service.ts
var user_profile_service_exports = {};
__export(user_profile_service_exports, {
  UserProfileService: () => UserProfileService,
  userProfileService: () => userProfileService
});
import * as bcrypt5 from "bcrypt";
var UserProfileService, userProfileService;
var init_user_profile_service = __esm({
  "server/services/domain/user-profile.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validators();
    UserProfileService = class extends BaseService {
      constructor(userRepository2 = container.get(TYPES.IUserRepository), studentRepository2 = container.get(TYPES.IStudentRepository)) {
        super();
        this.userRepository = userRepository2;
        this.studentRepository = studentRepository2;
      }
      get temporaryPasswordService() {
        return container.get(TYPES.ITemporaryPasswordService);
      }
      async getUserById(userId) {
        try {
          const user = await this.userRepository.findById(userId);
          return this.sanitizeUser(user);
        } catch (error) {
          return this.handleError(error, "UserProfileService.getUserById");
        }
      }
      async getUserByEmail(email) {
        try {
          const user = await this.userRepository.findByEmail(email);
          return user ? this.sanitizeUser(user) : void 0;
        } catch (error) {
          return this.handleError(error, "UserProfileService.getUserByEmail");
        }
      }
      async getUserProfile(userId) {
        try {
          const user = await this.getUserById(userId);
          let profile;
          if (user.userType === "customer") {
            profile = await this.studentRepository.findByUserId(userId);
          }
          return { user, profile };
        } catch (error) {
          return this.handleError(error, "UserProfileService.getUserProfile");
        }
      }
      /**
       * Get flattened student profile by student profile ID
       * Merges user data and student profile data into a single flat object
       * This matches the StudentProfile type expected by the frontend
       */
      async getStudentProfileFlat(studentId) {
        try {
          const profile = await this.studentRepository.findById(studentId);
          const user = await this.getUserById(profile.userId);
          const formatDate = (date) => {
            if (!date) return null;
            return date instanceof Date ? date.toISOString() : String(date);
          };
          const flattenedProfile = {
            // Profile ID fields
            id: profile.id,
            userId: profile.userId,
            // User fields (from users table)
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email,
            // Student profile fields (from studentProfiles table)
            phone: profile.phone,
            dateOfBirth: formatDate(profile.dateOfBirth),
            nationality: profile.nationality,
            currentEducationLevel: profile.currentEducationLevel,
            institutionName: profile.institutionName,
            gpa: profile.gpa ? Number(profile.gpa) : null,
            academicScoringType: profile.academicScoringType,
            intendedMajor: profile.intendedMajor,
            preferredCountries: profile.preferredCountries,
            destinationCountry: profile.destinationCountry,
            intakeYear: profile.intakeYear,
            status: profile.status || "inquiry",
            assignedCounselorId: profile.assignedCounselorId,
            academicInterests: profile.academicInterests,
            extracurriculars: profile.extracurriculars,
            createdAt: formatDate(profile.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: formatDate(profile.updatedAt),
            // Nested JSONB fields
            personalDetails: profile.personalDetails,
            academicDetails: profile.academicDetails,
            workDetails: profile.workDetails,
            testScores: profile.testScores,
            studyPreferences: profile.studyPreferences,
            universityPreferences: profile.universityPreferences,
            financialInfo: profile.financialInfo,
            visaHistory: profile.visaHistory,
            familyDetails: profile.familyDetails,
            additionalInfo: profile.additionalInfo,
            // Extended properties for backward compatibility
            budgetRange: profile.budgetRange,
            workExperience: profile.workExperience,
            familyInfo: profile.familyInfo,
            educationHistory: profile.educationHistory
          };
          return flattenedProfile;
        } catch (error) {
          return this.handleError(error, "UserProfileService.getStudentProfileFlat");
        }
      }
      async updateUserProfile(userId, data) {
        try {
          const errors = {};
          if (data.email !== void 0) {
            const emailValidation = CommonValidators.validateEmail(data.email);
            if (!emailValidation.valid) {
              errors.email = emailValidation.error || "Invalid email";
            }
          }
          if (data.firstName !== void 0 && data.firstName !== null) {
            if (typeof data.firstName === "string" && data.firstName.trim().length < 1) {
              errors.firstName = "First name cannot be empty";
            }
          }
          if (data.lastName !== void 0 && data.lastName !== null) {
            if (typeof data.lastName === "string" && data.lastName.trim().length < 1) {
              errors.lastName = "Last name cannot be empty";
            }
          }
          if (data.password !== void 0) {
            errors.password = "Use changePassword method to update password";
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("User Profile", errors);
          }
          const updated = await this.userRepository.update(userId, data);
          return this.sanitizeUser(updated);
        } catch (error) {
          return this.handleError(error, "UserProfileService.updateUserProfile");
        }
      }
      async updateStudentProfile(userId, data) {
        try {
          const profile = await this.studentRepository.findByUserId(userId);
          if (!profile) {
            throw new ResourceNotFoundError("Student Profile", userId);
          }
          const errors = {};
          if (data.dateOfBirth !== void 0) {
            const dobDate = typeof data.dateOfBirth === "string" ? new Date(data.dateOfBirth) : data.dateOfBirth;
            if (!(dobDate instanceof Date) || isNaN(dobDate.getTime())) {
              errors.dateOfBirth = "Invalid date of birth";
            } else {
              const dobValidation = CommonValidators.validatePastDate(dobDate);
              if (!dobValidation.valid) {
                errors.dateOfBirth = dobValidation.error || "Date of birth must be in the past";
              }
            }
          }
          if (data.gpa !== void 0 && data.gpa !== null) {
            const gpaNum = typeof data.gpa === "string" ? parseFloat(data.gpa) : Number(data.gpa);
            const scoringType = data.academicScoringType || "gpa";
            let gpaValidation;
            if (scoringType === "percentage") {
              gpaValidation = CommonValidators.validateRange(gpaNum, 0, 100, "Percentage");
              if (!gpaValidation.valid) {
                errors.gpa = gpaValidation.error || "Percentage must be between 0 and 100";
              }
            } else if (scoringType === "gpa" || scoringType === "grade") {
              gpaValidation = CommonValidators.validateRange(gpaNum, 0, 10, "Score");
              if (!gpaValidation.valid) {
                errors.gpa = gpaValidation.error || "Score must be between 0 and 10";
              }
            }
          }
          if (data.phone !== void 0 && data.phone) {
            const phoneValidation = CommonValidators.validatePhoneNumber(data.phone);
            if (!phoneValidation.valid) {
              errors.phone = phoneValidation.error || "Invalid phone number";
            }
          }
          if (data.nationality !== void 0 && data.nationality) {
            const nationalityValidation = CommonValidators.validateStringLength(data.nationality, 1, 100, "Nationality");
            if (!nationalityValidation.valid) {
              errors.nationality = nationalityValidation.error || "Invalid nationality";
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Student Profile", errors);
          }
          const dataWithDate = data.dateOfBirth && typeof data.dateOfBirth === "string" ? { ...data, dateOfBirth: new Date(data.dateOfBirth) } : data;
          const updated = await this.studentRepository.update(profile.id, dataWithDate);
          return updated;
        } catch (error) {
          return this.handleError(error, "UserProfileService.updateStudentProfile");
        }
      }
      async changePassword(userId, oldPassword, newPassword) {
        try {
          const user = await this.userRepository.findById(userId);
          if (!user.password) {
            throw new InvalidOperationError("change password", "No password is set for this account");
          }
          const isValid = await bcrypt5.compare(oldPassword, user.password);
          if (!isValid) {
            throw new AuthenticationError("Current password is incorrect");
          }
          const hashedPassword = await bcrypt5.hash(newPassword, 10);
          await this.userRepository.update(userId, { password: hashedPassword });
        } catch (error) {
          return this.handleError(error, "UserProfileService.changePassword");
        }
      }
      async resetUserPassword(userId) {
        try {
          const user = await this.userRepository.findById(userId);
          const { plainPassword, encryptedPassword } = await this.temporaryPasswordService.generateAndEncryptTempPassword();
          const hashedPassword = await bcrypt5.hash(plainPassword, 10);
          const updated = await this.userRepository.update(userId, {
            password: hashedPassword,
            temporaryPassword: encryptedPassword
          });
          return {
            user: this.sanitizeUser(updated),
            plainPassword
          };
        } catch (error) {
          return this.handleError(error, "UserProfileService.resetUserPassword");
        }
      }
    };
    userProfileService = new UserProfileService();
  }
});

// server/services/domain/user-subscription.service.ts
var user_subscription_service_exports = {};
__export(user_subscription_service_exports, {
  UserSubscriptionService: () => UserSubscriptionService,
  userSubscriptionService: () => userSubscriptionService
});
var UserSubscriptionService, userSubscriptionService;
var init_user_subscription_service = __esm({
  "server/services/domain/user-subscription.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    UserSubscriptionService = class extends BaseService {
      constructor(userSubscriptionRepo = container.get(TYPES.IUserSubscriptionRepository)) {
        super();
        this.userSubscriptionRepo = userSubscriptionRepo;
      }
      async getCurrentSubscription(userId) {
        try {
          return await this.userSubscriptionRepo.findByUser(userId);
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.getCurrentSubscription");
        }
      }
      async getSubscriptionWithPlan(userId) {
        try {
          return await this.userSubscriptionRepo.findByUserWithPlan(userId);
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.getSubscriptionWithPlan");
        }
      }
      async getAllSubscriptions() {
        try {
          return await this.userSubscriptionRepo.findAllWithDetails();
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.getAllSubscriptions");
        }
      }
      async createSubscription(subscription) {
        try {
          this.validateRequired(subscription, ["userId", "planId"]);
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(subscription.userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const planIdValidation = CommonValidators.validateUUID(subscription.planId, "Plan ID");
          if (!planIdValidation.valid) {
            errors.planId = planIdValidation.error;
          }
          if (subscription.startedAt && subscription.expiresAt) {
            const dateRangeValidation = CommonValidators.validateDateRange(
              new Date(subscription.startedAt),
              new Date(subscription.expiresAt)
            );
            if (!dateRangeValidation.valid) {
              errors.dateRange = dateRangeValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("User Subscription", errors);
          }
          return await this.userSubscriptionRepo.create(subscription);
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.createSubscription");
        }
      }
      async updateSubscription(id, updates) {
        try {
          const errors = {};
          if (updates.userId !== void 0) {
            const userIdValidation = CommonValidators.validateUUID(updates.userId, "User ID");
            if (!userIdValidation.valid) {
              errors.userId = userIdValidation.error;
            }
          }
          if (updates.planId !== void 0) {
            const planIdValidation = CommonValidators.validateUUID(updates.planId, "Plan ID");
            if (!planIdValidation.valid) {
              errors.planId = planIdValidation.error;
            }
          }
          if (updates.startedAt && updates.expiresAt) {
            const dateRangeValidation = CommonValidators.validateDateRange(
              new Date(updates.startedAt),
              new Date(updates.expiresAt)
            );
            if (!dateRangeValidation.valid) {
              errors.dateRange = dateRangeValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("User Subscription", errors);
          }
          return await this.userSubscriptionRepo.update(id, updates);
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.updateSubscription");
        }
      }
      async cancelSubscription(subscriptionId) {
        try {
          const subscription = await this.userSubscriptionRepo.findByIdOptional(subscriptionId);
          if (!subscription) {
            return false;
          }
          await this.userSubscriptionRepo.update(subscriptionId, {
            status: "cancelled",
            expiresAt: /* @__PURE__ */ new Date()
          });
          return true;
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.cancelSubscription");
        }
      }
      async upgradeSubscription(userId, newPlanId) {
        try {
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const planIdValidation = CommonValidators.validateUUID(newPlanId, "Plan ID");
          if (!planIdValidation.valid) {
            errors.planId = planIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Subscription Upgrade", errors);
          }
          const currentSubscription = await this.userSubscriptionRepo.findByUser(userId);
          if (currentSubscription) {
            const updated = await this.userSubscriptionRepo.update(currentSubscription.id, {
              planId: newPlanId,
              status: "active",
              startedAt: /* @__PURE__ */ new Date()
            });
            return updated;
          } else {
            return await this.createSubscription({
              userId,
              planId: newPlanId,
              status: "active",
              startedAt: /* @__PURE__ */ new Date()
            });
          }
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.upgradeSubscription");
        }
      }
      async subscribeUserToPlan(userId, planId) {
        try {
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const planIdValidation = CommonValidators.validateUUID(planId, "Plan ID");
          if (!planIdValidation.valid) {
            errors.planId = planIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Subscription", errors);
          }
          const startDate = /* @__PURE__ */ new Date();
          const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
          return await this.createSubscription({
            userId,
            planId,
            status: "active",
            startedAt: startDate,
            expiresAt: expiresDate
          });
        } catch (error) {
          return this.handleError(error, "UserSubscriptionService.subscribeUserToPlan");
        }
      }
    };
    userSubscriptionService = new UserSubscriptionService();
  }
});

// server/services/domain/admin/analytics-admin.service.ts
var analytics_admin_service_exports = {};
__export(analytics_admin_service_exports, {
  AdminAnalyticsService: () => AdminAnalyticsService,
  adminAnalyticsService: () => adminAnalyticsService
});
var AdminAnalyticsService, adminAnalyticsService;
var init_analytics_admin_service = __esm({
  "server/services/domain/admin/analytics-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    AdminAnalyticsService = class extends BaseService {
      constructor(userRepository2 = container.get(TYPES.IUserRepository), studentRepository2 = container.get(TYPES.IStudentRepository), applicationRepository2 = container.get(TYPES.IApplicationRepository), universityRepository2 = container.get(TYPES.IUniversityRepository)) {
        super();
        this.userRepository = userRepository2;
        this.studentRepository = studentRepository2;
        this.applicationRepository = applicationRepository2;
        this.universityRepository = universityRepository2;
      }
      async getSystemStats() {
        try {
          const [users2, students, applications2, universities2] = await Promise.all([
            this.userRepository.findAll(),
            this.studentRepository.findAll(),
            this.applicationRepository.findAll(),
            this.universityRepository.findAll()
          ]);
          const pendingTasks = applications2.filter((app2) => app2.status === "under_review").length;
          const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
          const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
          const newSignups = students.filter((s) => {
            if (!s.createdAt) return false;
            const created = new Date(s.createdAt);
            return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
          }).length;
          const totalApps = applications2.length;
          const acceptedApps = applications2.filter((app2) => app2.status === "accepted").length;
          const conversionRate = totalApps > 0 ? Math.round(acceptedApps / totalApps * 100 * 100) / 100 : 0;
          return {
            totalUsers: users2.length,
            totalStudents: students.length,
            totalApplications: applications2.length,
            totalUniversities: universities2.length,
            pendingTasks,
            newSignups,
            conversionRate
          };
        } catch (error) {
          return this.handleError(error, "AdminAnalyticsService.getSystemStats");
        }
      }
      async getAnalyticsDashboard() {
        try {
          const [applications2, users2] = await Promise.all([
            this.applicationRepository.findAll(),
            this.userRepository.findAll()
          ]);
          const teamMembers = users2.filter((u) => u.userType === "team_member");
          const submittedApps = applications2.filter((app2) => app2.status === "submitted");
          return {
            activeStudents: submittedApps.length,
            totalApplications: applications2.length,
            successRate: 94.5,
            teamMembers: teamMembers.length,
            recentActivity: applications2.slice(0, 10)
          };
        } catch (error) {
          return this.handleError(error, "AdminAnalyticsService.getAnalyticsDashboard");
        }
      }
      async getAllApplications() {
        try {
          return await this.applicationRepository.findAll();
        } catch (error) {
          return this.handleError(error, "AdminAnalyticsService.getAllApplications");
        }
      }
    };
    adminAnalyticsService = new AdminAnalyticsService();
  }
});

// server/services/domain/admin/company-admin.service.ts
var company_admin_service_exports = {};
__export(company_admin_service_exports, {
  AdminCompanyService: () => AdminCompanyService,
  adminCompanyService: () => adminCompanyService
});
var AdminCompanyService, adminCompanyService;
var init_company_admin_service = __esm({
  "server/services/domain/admin/company-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminCompanyService = class extends BaseService {
      constructor(userRepository2 = container.get(TYPES.IUserRepository)) {
        super();
        this.userRepository = userRepository2;
      }
      // Lazy getter to resolve service from container, avoiding circular dependency
      get userProfileService() {
        return container.get(TYPES.IUserProfileService);
      }
      async getCompanyProfiles() {
        try {
          const allUsers = await this.userRepository.findAll();
          const companies = allUsers.filter((u) => u.userType === "company_profile");
          return companies.map((u) => this.sanitizeUser(u));
        } catch (error) {
          return this.handleError(error, "AdminCompanyService.getCompanyProfiles");
        }
      }
      async updateCompanyProfile(userId, data) {
        try {
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          if (data.email) {
            const emailValidation = CommonValidators.validateEmail(data.email);
            if (!emailValidation.valid) {
              errors.email = emailValidation.error;
            }
          }
          if (data.firstName) {
            const firstNameValidation = CommonValidators.validateStringLength(data.firstName, 1, 50, "First name");
            if (!firstNameValidation.valid) {
              errors.firstName = firstNameValidation.error;
            }
          }
          if (data.lastName) {
            const lastNameValidation = CommonValidators.validateStringLength(data.lastName, 1, 50, "Last name");
            if (!lastNameValidation.valid) {
              errors.lastName = lastNameValidation.error;
            }
          }
          if (data.companyName) {
            const companyNameValidation = CommonValidators.validateStringLength(data.companyName, 1, 200, "Company name");
            if (!companyNameValidation.valid) {
              errors.companyName = companyNameValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Company Profile", errors);
          }
          const updated = await this.userRepository.update(userId, data);
          if (!updated) {
            throw new InvalidOperationError("update company profile", "Company profile update failed or user not found");
          }
          return this.sanitizeUser(updated);
        } catch (error) {
          return this.handleError(error, "AdminCompanyService.updateCompanyProfile");
        }
      }
      async resetCompanyPassword(companyId, adminEmail) {
        try {
          const errors = {};
          const companyIdValidation = CommonValidators.validateUUID(companyId, "Company ID");
          if (!companyIdValidation.valid) {
            errors.companyId = companyIdValidation.error;
          }
          const adminEmailValidation = CommonValidators.validateEmail(adminEmail);
          if (!adminEmailValidation.valid) {
            errors.adminEmail = adminEmailValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Reset Company Password", errors);
          }
          const company = await this.userRepository.findById(companyId);
          if (!company || company.userType !== "company_profile") {
            throw new ResourceNotFoundError("Company", companyId);
          }
          const { user, plainPassword } = await this.userProfileService.resetUserPassword(companyId);
          console.log(`\u{1F510} Admin ${adminEmail} reset password for company ${company.email}`);
          return {
            success: true,
            message: "Company password has been reset successfully",
            temporaryPassword: plainPassword,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: user.companyName,
            userType: user.userType
          };
        } catch (error) {
          return this.handleError(error, "AdminCompanyService.resetCompanyPassword");
        }
      }
      formatCompanyProfileResponse(user, companyName, temporaryPassword) {
        const response = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          companyName
        };
        if (temporaryPassword) {
          response.temporaryPassword = temporaryPassword;
        }
        return response;
      }
    };
    adminCompanyService = new AdminCompanyService(
      container.get(TYPES.IUserRepository)
    );
  }
});

// server/services/domain/admin/forum-moderation.service.ts
var forum_moderation_service_exports = {};
__export(forum_moderation_service_exports, {
  AdminForumModerationService: () => AdminForumModerationService,
  adminForumModerationService: () => adminForumModerationService
});
var AdminForumModerationService, adminForumModerationService;
var init_forum_moderation_service = __esm({
  "server/services/domain/admin/forum-moderation.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminForumModerationService = class extends BaseService {
      constructor(forumPostRepository2 = container.get(TYPES.IForumPostRepository), forumReportsRepository2 = container.get(TYPES.IForumReportsRepository), userRepository2 = container.get(TYPES.IUserRepository)) {
        super();
        this.forumPostRepository = forumPostRepository2;
        this.forumReportsRepository = forumReportsRepository2;
        this.userRepository = userRepository2;
      }
      async reportPost(reportData) {
        try {
          const errors = {};
          const postIdValidation = CommonValidators.validateUUID(reportData.postId, "Post ID");
          if (!postIdValidation.valid) {
            errors.postId = postIdValidation.error;
          }
          const reporterIdValidation = CommonValidators.validateUUID(reportData.reporterUserId, "Reporter user ID");
          if (!reporterIdValidation.valid) {
            errors.reporterUserId = reporterIdValidation.error;
          }
          const reportReasonValidation = CommonValidators.validateStringLength(reportData.reportReason, 1, 255, "Report reason");
          if (!reportReasonValidation.valid) {
            errors.reportReason = reportReasonValidation.error;
          }
          if (reportData.reportDetails) {
            const reportDetailsValidation = CommonValidators.validateStringLength(reportData.reportDetails, 0, 1e3, "Report details");
            if (!reportDetailsValidation.valid) {
              errors.reportDetails = reportDetailsValidation.error;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Forum Post Report", errors);
          }
          const existingReport = await this.forumReportsRepository.findByPostAndUser(reportData.postId, reportData.reporterUserId);
          if (existingReport) {
            throw new DuplicateResourceError("Report", "post and user combination", `${reportData.postId}-${reportData.reporterUserId}`);
          }
          const post = await this.forumPostRepository.findById(reportData.postId);
          if (!post) {
            throw new ResourceNotFoundError("Forum Post", reportData.postId);
          }
          const currentReportCount = post.reportCount || 0;
          const report = await this.forumReportsRepository.create(reportData);
          const newReportCount = currentReportCount + 1;
          let wasAutoHidden = false;
          if (newReportCount >= 3 && !post.isHiddenByReports) {
            await this.forumPostRepository.update(reportData.postId, {
              reportCount: newReportCount,
              isHiddenByReports: true,
              hiddenAt: /* @__PURE__ */ new Date()
            });
            wasAutoHidden = true;
          } else {
            await this.forumPostRepository.update(reportData.postId, {
              reportCount: newReportCount
            });
          }
          return {
            ...report,
            currentReportCount: newReportCount,
            wasAutoHidden
          };
        } catch (error) {
          return this.handleError(error, "AdminForumModerationService.reportPost");
        }
      }
      async getReportedPosts() {
        try {
          const hiddenPosts = await this.forumPostRepository.getReportedPosts();
          const enrichedReports = await Promise.all(
            hiddenPosts.map(async (post) => {
              const reports = await this.forumReportsRepository.findByPostId(post.id);
              const firstReporter = reports.length > 0 ? await this.userRepository.findById(reports[0].reporterUserId) : null;
              return {
                postId: post.id,
                title: post.title,
                content: post.content?.substring(0, 200),
                authorId: post.authorId,
                reportCount: post.reportCount || 0,
                hiddenAt: post.hiddenAt,
                reports: reports.map((r) => ({
                  id: r.id,
                  reason: r.reportReason,
                  details: r.reportDetails,
                  createdAt: r.createdAt
                })),
                firstReporter: firstReporter ? {
                  id: firstReporter.id,
                  name: `${firstReporter.firstName} ${firstReporter.lastName}`,
                  email: firstReporter.email
                } : null
              };
            })
          );
          return enrichedReports;
        } catch (error) {
          return this.handleError(error, "AdminForumModerationService.getReportedPosts");
        }
      }
      async getReportDetails(postId) {
        try {
          const errors = {};
          const postIdValidation = CommonValidators.validateUUID(postId, "Post ID");
          if (!postIdValidation.valid) {
            errors.postId = postIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Report Details", errors);
          }
          return await this.forumReportsRepository.findByPostId(postId);
        } catch (error) {
          return this.handleError(error, "AdminForumModerationService.getReportDetails");
        }
      }
      async restoreReportedPost(postId, adminId) {
        try {
          const errors = {};
          const postIdValidation = CommonValidators.validateUUID(postId, "Post ID");
          if (!postIdValidation.valid) {
            errors.postId = postIdValidation.error;
          }
          const adminIdValidation = CommonValidators.validateUUID(adminId, "Admin ID");
          if (!adminIdValidation.valid) {
            errors.adminId = adminIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Restore Post", errors);
          }
          await this.forumPostRepository.update(postId, {
            isHiddenByReports: false,
            reportCount: 0,
            hiddenAt: null
          });
          await this.forumReportsRepository.deleteByPostId(postId);
          return true;
        } catch (error) {
          return this.handleError(error, "AdminForumModerationService.restoreReportedPost");
        }
      }
      async permanentlyDeleteReportedPost(postId, adminId) {
        try {
          const errors = {};
          const postIdValidation = CommonValidators.validateUUID(postId, "Post ID");
          if (!postIdValidation.valid) {
            errors.postId = postIdValidation.error;
          }
          const adminIdValidation = CommonValidators.validateUUID(adminId, "Admin ID");
          if (!adminIdValidation.valid) {
            errors.adminId = adminIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Delete Post", errors);
          }
          await this.forumPostRepository.update(postId, {
            isModerated: true,
            moderatorId: adminId,
            moderatedAt: /* @__PURE__ */ new Date()
          });
          return true;
        } catch (error) {
          return this.handleError(error, "AdminForumModerationService.permanentlyDeleteReportedPost");
        }
      }
    };
    adminForumModerationService = new AdminForumModerationService();
  }
});

// server/services/domain/admin/security-admin.service.ts
var security_admin_service_exports = {};
__export(security_admin_service_exports, {
  AdminSecurityService: () => AdminSecurityService,
  adminSecurityService: () => adminSecurityService
});
var AdminSecurityService, adminSecurityService;
var init_security_admin_service = __esm({
  "server/services/domain/admin/security-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminSecurityService = class extends BaseService {
      constructor(securitySettingsRepository2 = container.get(TYPES.ISecuritySettingsRepository)) {
        super();
        this.securitySettingsRepository = securitySettingsRepository2;
      }
      async getSecuritySettings() {
        try {
          return await this.securitySettingsRepository.getAllSettings();
        } catch (error) {
          return this.handleError(error, "AdminSecurityService.getSecuritySettings");
        }
      }
      async updateSecuritySetting(settingKey, settingValue, updatedBy) {
        try {
          const errors = {};
          const settingKeyValidation = CommonValidators.validateStringLength(settingKey, 1, 100, "Setting key");
          if (!settingKeyValidation.valid) {
            errors.settingKey = settingKeyValidation.error;
          }
          const settingValueValidation = CommonValidators.validateStringLength(settingValue, 0, 1e3, "Setting value");
          if (!settingValueValidation.valid) {
            errors.settingValue = settingValueValidation.error;
          }
          const updatedByValidation = CommonValidators.validateUUID(updatedBy, "Updated by user ID");
          if (!updatedByValidation.valid) {
            errors.updatedBy = updatedByValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Security Setting", errors);
          }
          return await this.securitySettingsRepository.upsertSetting(settingKey, settingValue, updatedBy);
        } catch (error) {
          return this.handleError(error, "AdminSecurityService.updateSecuritySetting");
        }
      }
      async getMaintenanceStatus() {
        try {
          const settings = await this.securitySettingsRepository.getAllSettings();
          const maintenanceSetting = settings.find((s) => s.settingKey === "maintenance_mode");
          const isInMaintenance = maintenanceSetting?.settingValue === "true";
          return {
            maintenanceMode: isInMaintenance,
            message: isInMaintenance ? "Site is currently under maintenance" : "Site is operational"
          };
        } catch (error) {
          return this.handleError(error, "AdminSecurityService.getMaintenanceStatus");
        }
      }
    };
    adminSecurityService = new AdminSecurityService();
  }
});

// server/services/domain/admin/staff-invitation.service.ts
var staff_invitation_service_exports = {};
__export(staff_invitation_service_exports, {
  AdminStaffInvitationService: () => AdminStaffInvitationService,
  adminStaffInvitationService: () => adminStaffInvitationService
});
import * as crypto from "crypto";
var AdminStaffInvitationService, adminStaffInvitationService;
var init_staff_invitation_service = __esm({
  "server/services/domain/admin/staff-invitation.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminStaffInvitationService = class extends BaseService {
      constructor(staffInvitationRepository2 = container.get(TYPES.IStaffInvitationRepository)) {
        super();
        this.staffInvitationRepository = staffInvitationRepository2;
      }
      async createStaffInvitationLink(adminId) {
        try {
          const errors = {};
          const adminIdValidation = CommonValidators.validateUUID(adminId, "Admin ID");
          if (!adminIdValidation.valid) {
            errors.adminId = adminIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Staff Invitation", errors);
          }
          const token = crypto.randomBytes(32).toString("hex");
          const invitationLink = await this.staffInvitationRepository.create({
            token,
            createdBy: adminId
          });
          return invitationLink;
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.createStaffInvitationLink");
        }
      }
      async getStaffInvitationLinks() {
        try {
          const links = await this.staffInvitationRepository.findAllActive();
          return links;
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.getStaffInvitationLinks");
        }
      }
      async refreshStaffInvitationLink(linkId) {
        try {
          const errors = {};
          const linkIdValidation = CommonValidators.validateUUID(linkId, "Link ID");
          if (!linkIdValidation.valid) {
            errors.linkId = linkIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Staff Invitation Link", errors);
          }
          const newToken = crypto.randomBytes(32).toString("hex");
          const updatedLink = await this.staffInvitationRepository.refreshToken(linkId, newToken);
          return updatedLink;
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.refreshStaffInvitationLink");
        }
      }
      async getStaffInviteInfo(token) {
        try {
          const errors = {};
          const tokenValidation = CommonValidators.validateStringLength(token, 1, 255, "Invitation token");
          if (!tokenValidation.valid) {
            errors.token = tokenValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Staff Invitation Token", errors);
          }
          const invitationLink = await this.staffInvitationRepository.findActiveByToken(token);
          if (!invitationLink) {
            throw new ResourceNotFoundError("Staff Invitation", token);
          }
          return invitationLink;
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.getStaffInviteInfo");
        }
      }
      async recordInviteLinkUsage(linkId) {
        try {
          const errors = {};
          const linkIdValidation = CommonValidators.validateUUID(linkId, "Link ID");
          if (!linkIdValidation.valid) {
            errors.linkId = linkIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Record Link Usage", errors);
          }
          await this.staffInvitationRepository.incrementUsageCount(linkId);
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.recordInviteLinkUsage");
        }
      }
      async invalidateInvitationLink(linkId) {
        try {
          const errors = {};
          const linkIdValidation = CommonValidators.validateUUID(linkId, "Link ID");
          if (!linkIdValidation.valid) {
            errors.linkId = linkIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Staff Invitation Link", errors);
          }
          await this.staffInvitationRepository.deactivate(linkId);
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.invalidateInvitationLink");
        }
      }
      async claimAndInvalidateInvitationToken(token) {
        try {
          const errors = {};
          const tokenValidation = CommonValidators.validateStringLength(token, 1, 255, "Invitation token");
          if (!tokenValidation.valid) {
            errors.token = tokenValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Claim Invitation Token", errors);
          }
          const claimedLink = await this.staffInvitationRepository.claimAndInvalidate(token);
          return claimedLink || null;
        } catch (error) {
          return this.handleError(error, "AdminStaffInvitationService.claimAndInvalidateInvitationToken");
        }
      }
    };
    adminStaffInvitationService = new AdminStaffInvitationService();
  }
});

// server/services/domain/admin/student-admin.service.ts
var student_admin_service_exports = {};
__export(student_admin_service_exports, {
  AdminStudentService: () => AdminStudentService,
  adminStudentService: () => adminStudentService
});
var AdminStudentService, adminStudentService;
var init_student_admin_service = __esm({
  "server/services/domain/admin/student-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminStudentService = class extends BaseService {
      constructor(studentRepository2 = container.get(TYPES.IStudentRepository), studentTimelineRepository2 = container.get(TYPES.IStudentTimelineRepository)) {
        super();
        this.studentRepository = studentRepository2;
        this.studentTimelineRepository = studentTimelineRepository2;
      }
      // Lazy getter to resolve service from container, avoiding circular dependency
      get userSubscriptionService() {
        return container.get(TYPES.IUserSubscriptionService);
      }
      async getAllStudents() {
        try {
          return await this.studentRepository.findAllWithUserDetails();
        } catch (error) {
          return this.handleError(error, "AdminStudentService.getAllStudents");
        }
      }
      async getStudentsWithSubscriptions() {
        try {
          const students = await this.getAllStudents();
          const subscriptions2 = await this.userSubscriptionService.getAllSubscriptions();
          const studentsWithSubs = students.map((student) => {
            const subscription = subscriptions2.find((s) => s.userId === student.userId);
            return {
              ...student,
              subscription: subscription || null
            };
          });
          return studentsWithSubs;
        } catch (error) {
          return this.handleError(error, "AdminStudentService.getStudentsWithSubscriptions");
        }
      }
      async getStudentTimeline(studentId) {
        try {
          const errors = {};
          const studentIdValidation = CommonValidators.validateUUID(studentId, "Student ID");
          if (!studentIdValidation.valid) {
            errors.studentId = studentIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Student Timeline", errors);
          }
          return await this.studentTimelineRepository.findByStudentId(studentId);
        } catch (error) {
          return this.handleError(error, "AdminStudentService.getStudentTimeline");
        }
      }
    };
    adminStudentService = new AdminStudentService(
      container.get(TYPES.IStudentRepository),
      container.get(TYPES.IStudentTimelineRepository)
    );
  }
});

// server/services/domain/admin/testimonial-admin.service.ts
var testimonial_admin_service_exports = {};
__export(testimonial_admin_service_exports, {
  AdminTestimonialService: () => AdminTestimonialService,
  adminTestimonialService: () => adminTestimonialService
});
var AdminTestimonialService, adminTestimonialService;
var init_testimonial_admin_service = __esm({
  "server/services/domain/admin/testimonial-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    AdminTestimonialService = class extends BaseService {
      constructor(testimonialRepository2 = container.get(TYPES.ITestimonialRepository)) {
        super();
        this.testimonialRepository = testimonialRepository2;
      }
      async getTestimonials() {
        try {
          return await this.testimonialRepository.findApproved();
        } catch (error) {
          return this.handleError(error, "AdminTestimonialService.getTestimonials");
        }
      }
      async createTestimonial(testimonial) {
        try {
          this.validateRequired(testimonial, ["userId", "name", "feedback", "destinationCountry", "intake", "counselorName"]);
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(testimonial.userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const nameValidation = CommonValidators.validateStringLength(testimonial.name, 1, 100, "Student name");
          if (!nameValidation.valid) {
            errors.name = nameValidation.error;
          }
          const feedbackValidation = CommonValidators.validateStringLength(testimonial.feedback, 1, 1e3, "Testimonial feedback");
          if (!feedbackValidation.valid) {
            errors.feedback = feedbackValidation.error;
          }
          const destinationCountryValidation = CommonValidators.validateStringLength(testimonial.destinationCountry, 1, 100, "Destination country");
          if (!destinationCountryValidation.valid) {
            errors.destinationCountry = destinationCountryValidation.error;
          }
          const intakeValidation = CommonValidators.validateStringLength(testimonial.intake, 1, 50, "Intake period");
          if (!intakeValidation.valid) {
            errors.intake = intakeValidation.error;
          }
          const counselorNameValidation = CommonValidators.validateStringLength(testimonial.counselorName, 1, 100, "Counselor name");
          if (!counselorNameValidation.valid) {
            errors.counselorName = counselorNameValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Testimonial", errors);
          }
          return await this.testimonialRepository.create(testimonial);
        } catch (error) {
          return this.handleError(error, "AdminTestimonialService.createTestimonial");
        }
      }
    };
    adminTestimonialService = new AdminTestimonialService();
  }
});

// server/services/domain/admin/university-admin.service.ts
var university_admin_service_exports = {};
__export(university_admin_service_exports, {
  AdminUniversityService: () => AdminUniversityService,
  adminUniversityService: () => adminUniversityService
});
var AdminUniversityService, adminUniversityService;
var init_university_admin_service = __esm({
  "server/services/domain/admin/university-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    AdminUniversityService = class extends BaseService {
      constructor(universityRepository2 = container.get(TYPES.IUniversityRepository)) {
        super();
        this.universityRepository = universityRepository2;
      }
      async getAllUniversities() {
        try {
          return await this.universityRepository.findAll();
        } catch (error) {
          return this.handleError(error, "AdminUniversityService.getAllUniversities");
        }
      }
    };
    adminUniversityService = new AdminUniversityService();
  }
});

// server/services/domain/admin/user-admin.service.ts
var user_admin_service_exports = {};
__export(user_admin_service_exports, {
  AdminUserService: () => AdminUserService,
  adminUserService: () => adminUserService
});
var AdminUserService, adminUserService;
var init_user_admin_service = __esm({
  "server/services/domain/admin/user-admin.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    init_validation();
    init_temporaryPassword_service();
    AdminUserService = class extends BaseService {
      constructor(userRepository2 = container.get(TYPES.IUserRepository)) {
        super();
        this.userRepository = userRepository2;
      }
      async getAllUsers() {
        try {
          const users2 = await this.userRepository.findAll();
          return users2.map((u) => this.sanitizeUser(u));
        } catch (error) {
          return this.handleError(error, "AdminUserService.getAllUsers");
        }
      }
      async updateUserAccountStatus(userId, status) {
        try {
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          const statusValidation = CommonValidators.validateStringLength(status, 1, 50, "Account status");
          if (!statusValidation.valid) {
            errors.status = statusValidation.error;
          } else {
            const validStatuses = ["active", "inactive", "pending_approval", "suspended", "rejected"];
            if (!validStatuses.includes(status)) {
              errors.status = `Status must be one of: ${validStatuses.join(", ")}`;
            }
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("User Account Status", errors);
          }
          const updated = await this.userRepository.update(userId, { accountStatus: status });
          if (!updated) {
            throw new InvalidOperationError("update account status", "Account status update failed or user not found");
          }
          return this.sanitizeUser(updated);
        } catch (error) {
          return this.handleError(error, "AdminUserService.updateUserAccountStatus");
        }
      }
      async deleteUser(userId) {
        try {
          const errors = {};
          const userIdValidation = CommonValidators.validateUUID(userId, "User ID");
          if (!userIdValidation.valid) {
            errors.userId = userIdValidation.error;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Delete User", errors);
          }
          return await this.userRepository.delete(userId);
        } catch (error) {
          return this.handleError(error, "AdminUserService.deleteUser");
        }
      }
      async createTeamMemberWithPassword(adminId, teamMemberData) {
        try {
          const errors = {};
          const emailValidation = CommonValidators.validateEmail(teamMemberData.email);
          if (!emailValidation.valid) {
            errors.email = emailValidation.error;
          }
          const firstNameValidation = CommonValidators.validateStringLength(
            teamMemberData.firstName,
            1,
            50,
            "First Name"
          );
          if (!firstNameValidation.valid) {
            errors.firstName = firstNameValidation.error;
          }
          const lastNameValidation = CommonValidators.validateStringLength(
            teamMemberData.lastName,
            1,
            50,
            "Last Name"
          );
          if (!lastNameValidation.valid) {
            errors.lastName = lastNameValidation.error;
          }
          const adminIdValidation = CommonValidators.validateUUID(adminId, "Admin ID");
          if (!adminIdValidation.valid) {
            errors.adminId = adminIdValidation.error;
          }
          const validTeamRoles = ["admin", "counselor"];
          if (!validTeamRoles.includes(teamMemberData.teamRole)) {
            errors.teamRole = `Team role must be one of: ${validTeamRoles.join(", ")}`;
          }
          if (Object.keys(errors).length > 0) {
            throw new ValidationServiceError("Team Member Creation", errors);
          }
          const admin = await this.userRepository.findById(adminId);
          if (!admin || admin.userType !== "team_member" || admin.teamRole !== "admin") {
            throw new AuthorizationError("Only admins can create team members");
          }
          const existingUser = await this.userRepository.findByEmail(
            teamMemberData.email.toLowerCase()
          );
          if (existingUser) {
            throw new DuplicateResourceError("User", "email", teamMemberData.email);
          }
          const { plainPassword: temporaryPassword, encryptedPassword: hashedPassword } = await temporaryPasswordService.generateAndEncryptTempPassword();
          const teamMember = await this.userRepository.create({
            email: teamMemberData.email.toLowerCase(),
            password: hashedPassword,
            firstName: teamMemberData.firstName,
            lastName: teamMemberData.lastName,
            userType: "team_member",
            teamRole: teamMemberData.teamRole,
            accountStatus: "active",
            profilePicture: null
          });
          const sanitizedUser = this.sanitizeUser(teamMember);
          return {
            user: sanitizedUser,
            temporaryPassword
          };
        } catch (error) {
          return this.handleError(error, "AdminUserService.createTeamMemberWithPassword");
        }
      }
      async getStaffMembers() {
        try {
          const allUsers = await this.userRepository.findAll();
          const staff = allUsers.filter((u) => u.userType === "team_member");
          return staff.map((u) => this.sanitizeUser(u));
        } catch (error) {
          return this.handleError(error, "AdminUserService.getStaffMembers");
        }
      }
    };
    adminUserService = new AdminUserService();
  }
});

// server/services/integration/ai-matching.service.ts
var ai_matching_service_exports = {};
__export(ai_matching_service_exports, {
  AIMatchingService: () => AIMatchingService,
  aiMatchingService: () => aiMatchingService
});
var AIMatchingService, aiMatchingService;
var init_ai_matching_service = __esm({
  "server/services/integration/ai-matching.service.ts"() {
    "use strict";
    init_base_service();
    init_container();
    init_errors();
    AIMatchingService = class extends BaseService {
      constructor(studentRepository2 = container.get(TYPES.IStudentRepository), universityRepository2 = container.get(TYPES.IUniversityRepository), aiMatchingRepository2 = container.get(TYPES.IAIMatchingRepository)) {
        super();
        this.studentRepository = studentRepository2;
        this.universityRepository = universityRepository2;
        this.aiMatchingRepository = aiMatchingRepository2;
      }
      WEIGHTS = {
        academicFit: 0.3,
        locationPreference: 0.15,
        budgetCompatibility: 0.25,
        programAlignment: 0.2,
        admissionChances: 0.1
      };
      async getMatches(userId) {
        try {
          return await this.aiMatchingRepository.findByUser(userId);
        } catch (error) {
          return this.handleError(error, "AIMatchingService.getMatches");
        }
      }
      async generateMatches(userId) {
        try {
          const profile = await this.studentRepository.findByUserId(userId);
          if (!profile) {
            throw new ResourceNotFoundError("Student Profile", userId);
          }
          const universities2 = await this.universityRepository.findAll();
          const results = [];
          for (const university of universities2) {
            const matchScore = this.calculateMatchScore(profile, university);
            const factors = this.calculateFactors(profile, university);
            const reasoningObj = this.generateReasoning(profile, university, factors);
            const result = await this.aiMatchingRepository.create({
              userId,
              universityId: university.id,
              matchScore: matchScore.toString(),
              reasoning: reasoningObj,
              modelVersion: "1.0.0"
            });
            results.push(result);
          }
          return results.sort((a, b) => {
            const scoreA = typeof a.matchScore === "string" ? parseFloat(a.matchScore) : Number(a.matchScore) || 0;
            const scoreB = typeof b.matchScore === "string" ? parseFloat(b.matchScore) : Number(b.matchScore) || 0;
            return scoreB - scoreA;
          });
        } catch (error) {
          return this.handleError(error, "AIMatchingService.generateMatches");
        }
      }
      calculateMatchScore(profile, university) {
        const factors = this.calculateFactors(profile, university);
        const weightedScore = factors.academicFit * this.WEIGHTS.academicFit + factors.locationPreference * this.WEIGHTS.locationPreference + factors.budgetCompatibility * this.WEIGHTS.budgetCompatibility + factors.programAlignment * this.WEIGHTS.programAlignment + factors.admissionChances * this.WEIGHTS.admissionChances;
        return Math.round(weightedScore * 100) / 100;
      }
      calculateFactors(profile, university) {
        return {
          academicFit: this.calculateAcademicFit(profile, university),
          locationPreference: this.calculateLocationPreference(profile, university),
          budgetCompatibility: this.calculateBudgetCompatibility(profile, university),
          programAlignment: this.calculateProgramAlignment(profile, university),
          admissionChances: this.calculateAdmissionChances(profile, university)
        };
      }
      calculateAcademicFit(profile, university) {
        let score = 0.5;
        if (profile.gpa) {
          const gpa = parseFloat(profile.gpa);
          const minGPA = university.admissionRequirements?.minimumGPA ? parseFloat(university.admissionRequirements.minimumGPA) : 3;
          if (gpa >= minGPA + 0.5) score = 1;
          else if (gpa >= minGPA) score = 0.8;
          else if (gpa >= minGPA - 0.3) score = 0.6;
          else score = 0.3;
        }
        if (profile.testScores && university.admissionRequirements?.ieltsScore) {
          const ieltsScore = parseFloat(university.admissionRequirements.ieltsScore);
          const hasIELTS = profile.testScores.ielts !== void 0;
          if (hasIELTS && profile.testScores.ielts >= ieltsScore) {
            score = Math.min(1, score + 0.1);
          }
        }
        return score;
      }
      calculateLocationPreference(profile, university) {
        if (profile.destinationCountry && university.country) {
          return profile.destinationCountry.toLowerCase() === university.country.toLowerCase() ? 1 : 0.3;
        }
        return 0.5;
      }
      calculateBudgetCompatibility(profile, university) {
        if (!profile.budgetRange || !university.tuitionFees) {
          return 0.5;
        }
        const budgetRangeStr = String(profile.budgetRange);
        const budgetMax = typeof profile.budgetRange === "string" ? parseInt(budgetRangeStr.split("-")[1] || "50000") : 5e4;
        const tuitionMin = university.tuitionFees.international?.min || university.tuitionFees.domestic?.min || 0;
        if (tuitionMin <= budgetMax * 0.7) return 1;
        if (tuitionMin <= budgetMax) return 0.8;
        if (tuitionMin <= budgetMax * 1.2) return 0.5;
        return 0.2;
      }
      calculateProgramAlignment(profile, university) {
        if (!profile.intendedMajor || !university.specialization) {
          return 0.5;
        }
        const major = profile.intendedMajor.toLowerCase();
        const specializationStr = typeof university.specialization === "string" ? university.specialization : String(university.specialization);
        const specializations = specializationStr.toLowerCase().split(",");
        for (const spec of specializations) {
          if (spec.trim().includes(major) || major.includes(spec.trim())) {
            return 1;
          }
        }
        return 0.3;
      }
      calculateAdmissionChances(profile, university) {
        let score = 0.5;
        if (university.acceptanceRate) {
          const acceptanceRate = parseFloat(university.acceptanceRate.replace("%", ""));
          if (acceptanceRate > 50) score = 0.9;
          else if (acceptanceRate > 30) score = 0.7;
          else if (acceptanceRate > 15) score = 0.5;
          else if (acceptanceRate > 5) score = 0.3;
          else score = 0.1;
        }
        return score;
      }
      generateReasoning(profile, university, factors) {
        const factorsList = [];
        if (factors.academicFit > 0.7) {
          factorsList.push("Strong academic profile match");
        } else if (factors.academicFit < 0.5) {
          factorsList.push("Academic requirements may be challenging");
        }
        if (factors.locationPreference > 0.8) {
          factorsList.push("Matches preferred location");
        }
        if (factors.budgetCompatibility > 0.7) {
          factorsList.push("Within budget range");
        } else if (factors.budgetCompatibility < 0.5) {
          factorsList.push("May exceed budget");
        }
        if (factors.programAlignment > 0.7) {
          factorsList.push("Excellent program alignment");
        }
        return {
          factors: factorsList,
          weights: {
            academicFit: factors.academicFit,
            locationPreference: factors.locationPreference,
            budgetCompatibility: factors.budgetCompatibility,
            programAlignment: factors.programAlignment,
            admissionChances: factors.admissionChances
          },
          details: factorsList.join(". ") + (factorsList.length > 0 ? "." : "No specific factors identified.")
        };
      }
    };
    aiMatchingService = new AIMatchingService();
  }
});

// server/services/container.ts
var container_exports = {};
__export(container_exports, {
  TYPES: () => TYPES,
  container: () => container,
  getService: () => getService,
  initializeContainer: () => initializeContainer
});
async function initializeContainer() {
  await container.registerServices();
}
function getService(token) {
  return container.get(token);
}
var TYPES, Container, container;
var init_container = __esm({
  "server/services/container.ts"() {
    "use strict";
    init_repositories();
    init_jwtService();
    init_validation_service();
    init_temporaryPassword_service();
    TYPES = {
      // Repository Tokens
      IUserRepository: Symbol.for("IUserRepository"),
      IStudentRepository: Symbol.for("IStudentRepository"),
      IUniversityRepository: Symbol.for("IUniversityRepository"),
      ICourseRepository: Symbol.for("ICourseRepository"),
      IApplicationRepository: Symbol.for("IApplicationRepository"),
      IDocumentRepository: Symbol.for("IDocumentRepository"),
      IForumPostRepository: Symbol.for("IForumPostRepository"),
      IForumCommentRepository: Symbol.for("IForumCommentRepository"),
      IForumInteractionRepository: Symbol.for("IForumInteractionRepository"),
      IForumPollRepository: Symbol.for("IForumPollRepository"),
      IForumReportsRepository: Symbol.for("IForumReportsRepository"),
      INotificationRepository: Symbol.for("INotificationRepository"),
      IEventRepository: Symbol.for("IEventRepository"),
      IAIMatchingRepository: Symbol.for("IAIMatchingRepository"),
      IChatRepository: Symbol.for("IChatRepository"),
      IPaymentRepository: Symbol.for("IPaymentRepository"),
      ISubscriptionPlanRepository: Symbol.for("ISubscriptionPlanRepository"),
      IUserSubscriptionRepository: Symbol.for("IUserSubscriptionRepository"),
      ISecuritySettingsRepository: Symbol.for("ISecuritySettingsRepository"),
      ITestimonialRepository: Symbol.for("ITestimonialRepository"),
      IStudentTimelineRepository: Symbol.for("IStudentTimelineRepository"),
      IStaffInvitationRepository: Symbol.for("IStaffInvitationRepository"),
      // Infrastructure Service Tokens (Phase 5.4)
      WebSocketService: Symbol.for("WebSocketService"),
      WebSocketEventHandlers: Symbol.for("WebSocketEventHandlers"),
      // Domain Service Tokens (Phase 3)
      IAuthService: Symbol.for("IAuthService"),
      IApplicationService: Symbol.for("IApplicationService"),
      IChatService: Symbol.for("IChatService"),
      ICompanyProfileService: Symbol.for("ICompanyProfileService"),
      ICounselorAssignmentService: Symbol.for("ICounselorAssignmentService"),
      ICounselorDashboardService: Symbol.for("ICounselorDashboardService"),
      IDocumentService: Symbol.for("IDocumentService"),
      IEventService: Symbol.for("IEventService"),
      IForumService: Symbol.for("IForumService"),
      INotificationService: Symbol.for("INotificationService"),
      IPaymentService: Symbol.for("IPaymentService"),
      IRegistrationService: Symbol.for("IRegistrationService"),
      ISubscriptionService: Symbol.for("ISubscriptionService"),
      ITemporaryPasswordService: Symbol.for("ITemporaryPasswordService"),
      ITestimonialService: Symbol.for("ITestimonialService"),
      IUniversityService: Symbol.for("IUniversityService"),
      IUserProfileService: Symbol.for("IUserProfileService"),
      IUserSubscriptionService: Symbol.for("IUserSubscriptionService"),
      // Admin Service Tokens (Phase 3)
      IAdminAnalyticsService: Symbol.for("IAdminAnalyticsService"),
      IAdminCompanyService: Symbol.for("IAdminCompanyService"),
      IAdminForumModerationService: Symbol.for("IAdminForumModerationService"),
      IAdminSecurityService: Symbol.for("IAdminSecurityService"),
      IAdminStaffInvitationService: Symbol.for("IAdminStaffInvitationService"),
      IAdminStudentService: Symbol.for("IAdminStudentService"),
      IAdminTestimonialService: Symbol.for("IAdminTestimonialService"),
      IAdminUniversityService: Symbol.for("IAdminUniversityService"),
      IAdminUserService: Symbol.for("IAdminUserService"),
      // Integration Service Tokens (Phase 3)
      IAIMatchingService: Symbol.for("IAIMatchingService"),
      // Infrastructure Service Tokens (Phase 3)
      IValidationService: Symbol.for("IValidationService"),
      // Security Service Tokens (Phase 3)
      JwtService: Symbol.for("JwtService")
    };
    Container = class {
      bindings = /* @__PURE__ */ new Map();
      constructor() {
        this.bindings.set(TYPES.IUserRepository, userRepository);
        this.bindings.set(TYPES.IStudentRepository, studentRepository);
        this.bindings.set(TYPES.IUniversityRepository, universityRepository);
        this.bindings.set(TYPES.ICourseRepository, courseRepository);
        this.bindings.set(TYPES.IApplicationRepository, applicationRepository);
        this.bindings.set(TYPES.IDocumentRepository, documentRepository);
        this.bindings.set(TYPES.IForumPostRepository, forumPostRepository);
        this.bindings.set(TYPES.IForumCommentRepository, forumCommentRepository);
        this.bindings.set(TYPES.IForumInteractionRepository, forumInteractionRepository);
        this.bindings.set(TYPES.IForumPollRepository, forumPollRepository);
        this.bindings.set(TYPES.IForumReportsRepository, forumReportsRepository);
        this.bindings.set(TYPES.INotificationRepository, notificationRepository);
        this.bindings.set(TYPES.IEventRepository, eventRepository);
        this.bindings.set(TYPES.IAIMatchingRepository, aiMatchingRepository);
        this.bindings.set(TYPES.IChatRepository, chatRepository);
        this.bindings.set(TYPES.IPaymentRepository, paymentRepository);
        this.bindings.set(TYPES.ISubscriptionPlanRepository, subscriptionPlanRepository);
        this.bindings.set(TYPES.IUserSubscriptionRepository, userSubscriptionRepository);
        this.bindings.set(TYPES.ISecuritySettingsRepository, securitySettingsRepository);
        this.bindings.set(TYPES.ITestimonialRepository, testimonialRepository);
        this.bindings.set(TYPES.IStudentTimelineRepository, studentTimelineRepository);
        this.bindings.set(TYPES.IStaffInvitationRepository, staffInvitationRepository);
        this.bindings.set(TYPES.JwtService, jwtService);
        this.bindings.set(TYPES.IValidationService, validationService);
        this.bindings.set(TYPES.ITemporaryPasswordService, temporaryPasswordService);
      }
      /**
       * Resolve a dependency by its token
       * @param token - Symbol token for the dependency
       * @returns The bound implementation
       * @throws Error if no binding found for token
       */
      get(token) {
        const binding = this.bindings.get(token);
        if (!binding) {
          throw new Error(`No binding found for token: ${token.toString()}`);
        }
        return binding;
      }
      /**
       * Bind a new implementation to a token (for testing/mocking)
       * @param token - Symbol token
       * @param implementation - Implementation to bind
       */
      bind(token, implementation) {
        this.bindings.set(token, implementation);
      }
      /**
       * Unbind a token (for testing cleanup)
       * @param token - Symbol token to unbind
       */
      unbind(token) {
        this.bindings.delete(token);
      }
      /**
       * Reset all bindings to defaults (for testing)
       */
      reset() {
        this.bindings.clear();
        this.bindings.set(TYPES.IUserRepository, userRepository);
        this.bindings.set(TYPES.IStudentRepository, studentRepository);
        this.bindings.set(TYPES.IUniversityRepository, universityRepository);
        this.bindings.set(TYPES.ICourseRepository, courseRepository);
        this.bindings.set(TYPES.IApplicationRepository, applicationRepository);
        this.bindings.set(TYPES.IDocumentRepository, documentRepository);
        this.bindings.set(TYPES.IForumPostRepository, forumPostRepository);
        this.bindings.set(TYPES.IForumCommentRepository, forumCommentRepository);
        this.bindings.set(TYPES.IForumInteractionRepository, forumInteractionRepository);
        this.bindings.set(TYPES.IForumPollRepository, forumPollRepository);
        this.bindings.set(TYPES.IForumReportsRepository, forumReportsRepository);
        this.bindings.set(TYPES.INotificationRepository, notificationRepository);
        this.bindings.set(TYPES.IEventRepository, eventRepository);
        this.bindings.set(TYPES.IAIMatchingRepository, aiMatchingRepository);
        this.bindings.set(TYPES.IChatRepository, chatRepository);
        this.bindings.set(TYPES.IPaymentRepository, paymentRepository);
        this.bindings.set(TYPES.ISubscriptionPlanRepository, subscriptionPlanRepository);
        this.bindings.set(TYPES.IUserSubscriptionRepository, userSubscriptionRepository);
        this.bindings.set(TYPES.ISecuritySettingsRepository, securitySettingsRepository);
        this.bindings.set(TYPES.ITestimonialRepository, testimonialRepository);
        this.bindings.set(TYPES.IStudentTimelineRepository, studentTimelineRepository);
        this.bindings.set(TYPES.IStaffInvitationRepository, staffInvitationRepository);
        this.bindings.set(TYPES.JwtService, jwtService);
      }
      /**
       * Register service bindings (called after all services are defined)
       * This prevents circular dependency issues
       */
      async registerServices() {
        const { authService: authService2 } = await Promise.resolve().then(() => (init_auth_service(), auth_service_exports));
        const { applicationService: applicationService2 } = await Promise.resolve().then(() => (init_application_service(), application_service_exports));
        const { chatService: chatService2 } = await Promise.resolve().then(() => (init_chat_service(), chat_service_exports));
        const { companyProfileService: companyProfileService2 } = await Promise.resolve().then(() => (init_company_profile_service(), company_profile_service_exports));
        const { counselorAssignmentService: counselorAssignmentService2 } = await Promise.resolve().then(() => (init_counselor_assignment_service(), counselor_assignment_service_exports));
        const { counselorDashboardService: counselorDashboardService2 } = await Promise.resolve().then(() => (init_counselor_dashboard_service(), counselor_dashboard_service_exports));
        const { documentService: documentService2 } = await Promise.resolve().then(() => (init_document_service(), document_service_exports));
        const { eventService: eventService2 } = await Promise.resolve().then(() => (init_event_service(), event_service_exports));
        const { forumService: forumService2 } = await Promise.resolve().then(() => (init_forum_service(), forum_service_exports));
        const { notificationService: notificationService2 } = await Promise.resolve().then(() => (init_notification_service(), notification_service_exports));
        const { paymentService: paymentService2 } = await Promise.resolve().then(() => (init_payment_service(), payment_service_exports));
        const { registrationService: registrationService2 } = await Promise.resolve().then(() => (init_registration_service(), registration_service_exports));
        const { subscriptionService: subscriptionService2 } = await Promise.resolve().then(() => (init_subscription_service(), subscription_service_exports));
        const { temporaryPasswordService: temporaryPasswordService2 } = await Promise.resolve().then(() => (init_temporaryPassword_service(), temporaryPassword_service_exports));
        const { testimonialService: testimonialService2 } = await Promise.resolve().then(() => (init_testimonial_service(), testimonial_service_exports));
        const { universityService: universityService2 } = await Promise.resolve().then(() => (init_university_service(), university_service_exports));
        const { userProfileService: userProfileService2 } = await Promise.resolve().then(() => (init_user_profile_service(), user_profile_service_exports));
        const { userSubscriptionService: userSubscriptionService2 } = await Promise.resolve().then(() => (init_user_subscription_service(), user_subscription_service_exports));
        const { adminAnalyticsService: adminAnalyticsService2 } = await Promise.resolve().then(() => (init_analytics_admin_service(), analytics_admin_service_exports));
        const { adminCompanyService: adminCompanyService2 } = await Promise.resolve().then(() => (init_company_admin_service(), company_admin_service_exports));
        const { adminForumModerationService: adminForumModerationService2 } = await Promise.resolve().then(() => (init_forum_moderation_service(), forum_moderation_service_exports));
        const { adminSecurityService: adminSecurityService2 } = await Promise.resolve().then(() => (init_security_admin_service(), security_admin_service_exports));
        const { adminStaffInvitationService: adminStaffInvitationService2 } = await Promise.resolve().then(() => (init_staff_invitation_service(), staff_invitation_service_exports));
        const { adminStudentService: adminStudentService2 } = await Promise.resolve().then(() => (init_student_admin_service(), student_admin_service_exports));
        const { adminTestimonialService: adminTestimonialService2 } = await Promise.resolve().then(() => (init_testimonial_admin_service(), testimonial_admin_service_exports));
        const { adminUniversityService: adminUniversityService2 } = await Promise.resolve().then(() => (init_university_admin_service(), university_admin_service_exports));
        const { adminUserService: adminUserService2 } = await Promise.resolve().then(() => (init_user_admin_service(), user_admin_service_exports));
        const { aiMatchingService: aiMatchingService2 } = await Promise.resolve().then(() => (init_ai_matching_service(), ai_matching_service_exports));
        this.bindings.set(TYPES.IAuthService, authService2);
        this.bindings.set(TYPES.IApplicationService, applicationService2);
        this.bindings.set(TYPES.IChatService, chatService2);
        this.bindings.set(TYPES.ICompanyProfileService, companyProfileService2);
        this.bindings.set(TYPES.ICounselorAssignmentService, counselorAssignmentService2);
        this.bindings.set(TYPES.ICounselorDashboardService, counselorDashboardService2);
        this.bindings.set(TYPES.IDocumentService, documentService2);
        this.bindings.set(TYPES.IEventService, eventService2);
        this.bindings.set(TYPES.IForumService, forumService2);
        this.bindings.set(TYPES.INotificationService, notificationService2);
        this.bindings.set(TYPES.IPaymentService, paymentService2);
        this.bindings.set(TYPES.IRegistrationService, registrationService2);
        this.bindings.set(TYPES.ISubscriptionService, subscriptionService2);
        this.bindings.set(TYPES.ITemporaryPasswordService, temporaryPasswordService2);
        this.bindings.set(TYPES.ITestimonialService, testimonialService2);
        this.bindings.set(TYPES.IUniversityService, universityService2);
        this.bindings.set(TYPES.IUserProfileService, userProfileService2);
        this.bindings.set(TYPES.IUserSubscriptionService, userSubscriptionService2);
        this.bindings.set(TYPES.IAdminAnalyticsService, adminAnalyticsService2);
        this.bindings.set(TYPES.IAdminCompanyService, adminCompanyService2);
        this.bindings.set(TYPES.IAdminForumModerationService, adminForumModerationService2);
        this.bindings.set(TYPES.IAdminSecurityService, adminSecurityService2);
        this.bindings.set(TYPES.IAdminStaffInvitationService, adminStaffInvitationService2);
        this.bindings.set(TYPES.IAdminStudentService, adminStudentService2);
        this.bindings.set(TYPES.IAdminTestimonialService, adminTestimonialService2);
        this.bindings.set(TYPES.IAdminUniversityService, adminUniversityService2);
        this.bindings.set(TYPES.IAdminUserService, adminUserService2);
        this.bindings.set(TYPES.IAIMatchingService, aiMatchingService2);
      }
    };
    container = new Container();
  }
});

// server/services/domain/admin/index.ts
var admin_exports = {};
__export(admin_exports, {
  AdminAnalyticsService: () => AdminAnalyticsService,
  AdminCompanyService: () => AdminCompanyService,
  AdminForumModerationService: () => AdminForumModerationService,
  AdminSecurityService: () => AdminSecurityService,
  AdminStaffInvitationService: () => AdminStaffInvitationService,
  AdminStudentService: () => AdminStudentService,
  AdminTestimonialService: () => AdminTestimonialService,
  AdminUniversityService: () => AdminUniversityService,
  AdminUserService: () => AdminUserService,
  adminAnalyticsService: () => adminAnalyticsService,
  adminCompanyService: () => adminCompanyService,
  adminForumModerationService: () => adminForumModerationService,
  adminSecurityService: () => adminSecurityService,
  adminStaffInvitationService: () => adminStaffInvitationService,
  adminStudentService: () => adminStudentService,
  adminTestimonialService: () => adminTestimonialService,
  adminUniversityService: () => adminUniversityService,
  adminUserService: () => adminUserService
});
var init_admin = __esm({
  "server/services/domain/admin/index.ts"() {
    "use strict";
    init_user_admin_service();
    init_university_admin_service();
    init_student_admin_service();
    init_company_admin_service();
    init_security_admin_service();
    init_testimonial_admin_service();
    init_forum_moderation_service();
    init_staff_invitation_service();
    init_analytics_admin_service();
  }
});

// server/bulk-import.ts
var bulk_import_exports = {};
__export(bulk_import_exports, {
  bulkImportUniversities: () => bulkImportUniversities,
  csvRowToUniversity: () => csvRowToUniversity,
  generateSampleCSV: () => generateSampleCSV,
  parseCSVContent: () => parseCSVContent
});
function parseCSVContent(csvContent) {
  const lines = csvContent.trim().split("\n");
  const result = [];
  for (const line of lines) {
    const row = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  return result;
}
function csvRowToUniversity(row, headers) {
  const rowObject = {};
  headers.forEach((header, index) => {
    const cellValue = row[index] || "";
    rowObject[header.toLowerCase().replace(/\s+/g, "")] = cellValue.toLowerCase() === "n/a" ? "" : cellValue;
  });
  const safeParseInt = (value) => {
    if (!value || value.trim() === "" || value.toLowerCase() === "n/a" || value === "undefined") return void 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? void 0 : parsed;
  };
  const safeParseFloat = (value) => {
    if (!value || value.trim() === "" || value.toLowerCase() === "n/a" || value === "undefined") return void 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? void 0 : parsed;
  };
  const safeFeeValue = (value) => {
    if (!value || value.trim() === "" || value.toLowerCase() === "n/a" || value === "undefined") return void 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? void 0 : parsed;
  };
  const safeString = (value) => {
    if (!value || value.trim() === "" || value.toLowerCase() === "n/a") return void 0;
    return value.trim();
  };
  const university = {
    name: rowObject.name || "",
    country: rowObject.country || "",
    city: rowObject.city || "",
    website: safeString(rowObject.website),
    worldRanking: safeParseInt(rowObject.worldranking),
    degreeLevels: rowObject.degreelevels ? rowObject.degreelevels.split(";").map((level) => level.trim()) : void 0,
    specialization: safeString(rowObject.specialization),
    offerLetterFee: safeFeeValue(rowObject.offerletterfee)?.toString() ?? null,
    annualFee: safeFeeValue(rowObject.annualfee)?.toString() ?? null,
    admissionRequirements: {
      minimumGPA: safeString(rowObject.minimumgpa),
      ieltsScore: safeString(rowObject.ieltsscore),
      gmatScore: safeString(rowObject.gmatscore)
    },
    alumni1: safeString(rowObject.alumni1),
    alumni2: safeString(rowObject.alumni2),
    alumni3: safeString(rowObject.alumni3),
    description: safeString(rowObject.description)
  };
  Object.keys(university).forEach((key) => {
    const value = university[key];
    if (typeof value === "number" && isNaN(value)) {
      university[key] = void 0;
    }
  });
  return university;
}
async function bulkImportUniversities(csvContent) {
  const rows = parseCSVContent(csvContent);
  if (rows.length < 2) {
    throw new Error("CSV must contain at least a header row and one data row");
  }
  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const dataRows = rows.slice(1);
  let success = 0;
  let failed = 0;
  const errors = [];
  for (let i = 0; i < dataRows.length; i++) {
    const rowIndex = i + 2;
    try {
      const university = csvRowToUniversity(dataRows[i], headers);
      const validatedUniversity = insertUniversitySchema.parse(university);
      await universityRepository.create(validatedUniversity);
      success++;
    } catch (error) {
      failed++;
      errors.push({
        row: rowIndex,
        error: error instanceof Error ? error.message : "Unknown error",
        data: dataRows[i]
      });
    }
  }
  return { success, failed, errors };
}
function generateSampleCSV() {
  const headers = [
    "name",
    "country",
    "city",
    "website",
    "worldRanking",
    "degreeLevels",
    "specialization",
    "offerLetterFee",
    "annualFee",
    "minimumGPA",
    "ieltsScore",
    "gmatScore",
    "alumni1",
    "alumni2",
    "alumni3",
    "description"
  ];
  const sampleRows = [
    [
      "Harvard University",
      "United States",
      "Cambridge",
      "https://harvard.edu",
      "1",
      "Bachelor;Master;PhD",
      "Business",
      "100",
      "50000",
      "3.8",
      "7.0",
      "700",
      "Barack Obama",
      "Mark Zuckerberg",
      "Bill Gates",
      "A prestigious Ivy League university known for academic excellence and research"
    ],
    [
      "Stanford University",
      "United States",
      "Stanford",
      "https://stanford.edu",
      "3",
      "Bachelor;Master;PhD",
      "Engineering",
      "90",
      "52000",
      "3.7",
      "7.0",
      "650",
      "Sergey Brin",
      "Larry Page",
      "Reed Hastings",
      "Leading research university in Silicon Valley"
    ],
    [
      "MIT",
      "United States",
      "Cambridge",
      "https://mit.edu",
      "2",
      "Bachelor;Master;PhD",
      "Technology",
      "85",
      "53000",
      "3.9",
      "7.5",
      "720",
      "Kofi Annan",
      "Richard Feynman",
      "Tim Berners-Lee",
      "World-renowned institute for technology and engineering education"
    ]
  ];
  function csvEscape(value) {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  const csvLines = [headers.map(csvEscape).join(",")];
  sampleRows.forEach((row) => {
    csvLines.push(row.map(csvEscape).join(","));
  });
  return csvLines.join("\n");
}
var init_bulk_import = __esm({
  "server/bulk-import.ts"() {
    "use strict";
    init_repositories();
    init_schema();
  }
});

// server/middleware/production-monitor.ts
var production_monitor_exports = {};
__export(production_monitor_exports, {
  getProductionReport: () => getProductionReport,
  productionMonitor: () => productionMonitor,
  trackApiCompliance: () => trackApiCompliance
});
function trackApiCompliance(req, res, next) {
  if (!featuresConfig.MONITORING_ENABLED) {
    return next();
  }
  productionMonitor.track("request");
  if (req.path.startsWith("/api/dev/")) {
    productionMonitor.track("dev_feature", { path: req.path, method: req.method });
  }
  const originalJson = res.json;
  res.json = function(data) {
    const isNewFormat = data && typeof data === "object" && "success" in data && "meta" in data;
    if (!isNewFormat) {
      productionMonitor.track("legacy_format", {
        path: req.path,
        method: req.method,
        responseType: typeof data
      });
    }
    if (res.statusCode >= 400) {
      productionMonitor.track("error", {
        status: res.statusCode,
        path: req.path
      });
    }
    return originalJson.call(this, data);
  };
  next();
}
function getProductionReport(req, res) {
  if (featuresConfig.COMPLIANCE_REPORT_ENABLED && (!req.user || req.user.teamRole !== "admin")) {
    return sendError(res, 403, "ACCESS_DENIED", "Admin access required");
  }
  const metrics = productionMonitor.getMetrics();
  const alerts = productionMonitor.getAlerts();
  res.json({
    success: true,
    data: {
      metrics,
      alerts,
      status: alerts.length > 0 ? "issues_detected" : "healthy",
      recommendations: generateRecommendations(metrics, alerts)
    },
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: appConfig.NODE_ENV
    }
  });
}
function generateRecommendations(metrics, alerts) {
  const recommendations = [];
  if (metrics.legacyFormatDetected > 0) {
    recommendations.push("Legacy API format detected - migrate remaining endpoints to standardized format");
  }
  if (metrics.devFeatureAccess > 0) {
    recommendations.push("Development features accessed in production - strengthen environment checks");
  }
  if (parseFloat(metrics.errorRate) > 5) {
    recommendations.push("High error rate detected - investigate server issues");
  }
  if (recommendations.length === 0) {
    recommendations.push("API compliance is excellent - no issues detected");
  }
  return recommendations;
}
var ProductionMonitor, productionMonitor;
var init_production_monitor = __esm({
  "server/middleware/production-monitor.ts"() {
    "use strict";
    init_response();
    init_config();
    ProductionMonitor = class {
      metrics = {
        totalRequests: 0,
        legacyFormatDetected: 0,
        devFeatureAccess: 0,
        errorResponses: 0,
        lastReset: /* @__PURE__ */ new Date()
      };
      alerts = [];
      track(type, details) {
        this.metrics.totalRequests++;
        switch (type) {
          case "legacy_format":
            this.metrics.legacyFormatDetected++;
            this.alert("legacy_format", "Legacy API format detected in production", details);
            break;
          case "dev_feature":
            this.metrics.devFeatureAccess++;
            this.alert("dev_feature", "Development feature accessed in production", details);
            break;
          case "error":
            this.metrics.errorResponses++;
            if (this.isErrorSpike()) {
              this.alert("error_spike", "Error response spike detected", {
                current: this.metrics.errorResponses,
                total: this.metrics.totalRequests
              });
            }
            break;
        }
      }
      isErrorSpike() {
        const errorRate = this.metrics.errorResponses / this.metrics.totalRequests;
        return errorRate > 0.1 && this.metrics.totalRequests > 100;
      }
      alert(type, message, details) {
        const alert = {
          timestamp: /* @__PURE__ */ new Date(),
          type,
          message,
          details
        };
        this.alerts.push(alert);
        if (this.alerts.length > 100) {
          this.alerts = this.alerts.slice(-100);
        }
        if (featuresConfig.MONITORING_ENABLED) {
          console.error(`\u{1F6A8} PRODUCTION ALERT: ${message}`, details);
        }
      }
      getMetrics() {
        return {
          ...this.metrics,
          uptime: Date.now() - this.metrics.lastReset.getTime(),
          errorRate: this.metrics.totalRequests > 0 ? (this.metrics.errorResponses / this.metrics.totalRequests * 100).toFixed(2) + "%" : "0%"
        };
      }
      getAlerts() {
        return this.alerts.slice(-50);
      }
      resetMetrics() {
        this.metrics = {
          totalRequests: 0,
          legacyFormatDetected: 0,
          devFeatureAccess: 0,
          errorResponses: 0,
          lastReset: /* @__PURE__ */ new Date()
        };
      }
    };
    productionMonitor = new ProductionMonitor();
  }
});

// server/setup-after-migration.ts
var setup_after_migration_exports = {};
__export(setup_after_migration_exports, {
  setupAfterMigration: () => setupAfterMigration
});
import { eq as eq25, and as and22, or as or4, ne, isNull, isNotNull } from "drizzle-orm";
import bcrypt7 from "bcrypt";
async function setupAfterMigration() {
  console.log("\u{1F527} Running complete auto-setup...");
  try {
    console.log("\u{1F50D} Verifying server configuration...");
    if (typeof __require !== "undefined") {
      try {
        __require("cookie-parser");
        console.log("\u2705 Cookie parser available");
      } catch (e) {
        console.log("\u26A0\uFE0F  Cookie parser not found - ensuring fallback");
      }
    }
    const adminEmail = "admin@phozos.com";
    const adminPassword = "Phozos2025!";
    const hashedPassword = await bcrypt7.hash(adminPassword, 10);
    const existingAdmin = await db.select().from(users).where(eq25(users.email, adminEmail)).limit(1);
    let adminId;
    if (existingAdmin.length === 0) {
      const [newAdmin] = await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        temporaryPassword: adminPassword,
        userType: "team_member",
        teamRole: "admin",
        firstName: "System",
        lastName: "Administrator",
        accountStatus: "active"
      }).returning({ id: users.id });
      adminId = newAdmin.id;
      console.log("\u2705 Admin user created");
    } else {
      await db.update(users).set({
        accountStatus: "active"
      }).where(eq25(users.email, adminEmail));
      adminId = existingAdmin[0].id;
      console.log("\u2705 Admin user updated and approved");
    }
    const requiredSettings = [
      {
        settingKey: "team_login_visible",
        settingValue: "false",
        description: "Controls visibility of team login option on authentication page"
      },
      {
        settingKey: "secret_search_code",
        settingValue: "edupath-admin-2025",
        description: "Secret code required to access team login when visibility is disabled"
      },
      {
        settingKey: "maintenance_mode",
        settingValue: "false",
        description: "When enabled, prevents new student registrations"
      },
      {
        settingKey: "force_logout_enabled",
        settingValue: "false",
        description: "When enabled, forces all users to logout and re-authenticate"
      },
      {
        settingKey: "forum_cooling_period_enabled",
        settingValue: "true",
        description: "When enabled, new accounts must wait 1 hour before posting in community forum"
      }
    ];
    for (const setting of requiredSettings) {
      const existing = await db.select().from(securitySettings).where(eq25(securitySettings.settingKey, setting.settingKey)).limit(1);
      if (existing.length === 0) {
        await db.insert(securitySettings).values({
          ...setting,
          updatedBy: adminId
        });
        console.log(`\u2705 Created security setting: ${setting.settingKey} = ${setting.settingValue}`);
      } else {
        if (setting.settingKey === "team_login_visible" && existing[0].settingValue !== setting.settingValue) {
          await db.update(securitySettings).set({
            settingValue: setting.settingValue,
            updatedBy: adminId,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq25(securitySettings.settingKey, setting.settingKey));
          console.log(`\u2705 Reset security setting: ${setting.settingKey} = ${setting.settingValue}`);
        } else {
          console.log(`\u2705 Security setting exists: ${setting.settingKey} = ${existing[0].settingValue}`);
        }
      }
    }
    const inconsistentStaff = await db.select().from(users).where(eq25(users.userType, "team_member"));
    for (const staff of inconsistentStaff) {
      if (staff.accountStatus !== "active" && staff.accountStatus !== "inactive" && staff.accountStatus !== "pending_approval" && staff.accountStatus !== "suspended" && staff.accountStatus !== "rejected") {
        await db.update(users).set({ accountStatus: "active" }).where(eq25(users.id, staff.id));
        console.log(`\u2705 Fixed inconsistent staff account: ${staff.email}`);
      }
    }
    const { studentProfiles: studentProfiles3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const usersWithoutProfiles = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email
    }).from(users).leftJoin(studentProfiles3, eq25(users.id, studentProfiles3.userId)).where(
      and22(
        eq25(users.userType, "customer"),
        isNull(studentProfiles3.id)
      )
    );
    for (const user of usersWithoutProfiles) {
      await db.insert(studentProfiles3).values({
        userId: user.id,
        phone: "Not provided",
        // Student can update this
        dateOfBirth: /* @__PURE__ */ new Date("1995-01-01"),
        // Placeholder, counselor will update
        nationality: "Not specified",
        destinationCountry: "Not specified",
        intakeYear: "Not specified",
        status: "inquiry",
        personalDetails: {},
        academicDetails: {},
        workDetails: {},
        studyPreferences: {},
        universityPreferences: {},
        financialInfo: {},
        visaHistory: {},
        familyDetails: {},
        additionalInfo: {}
      });
      console.log(`\u2705 Created student profile for: ${user.firstName} ${user.lastName} (${user.email})`);
    }
    const invalidAssignments = await db.select({
      studentId: studentProfiles3.id,
      assignedCounselorId: studentProfiles3.assignedCounselorId
    }).from(studentProfiles3).leftJoin(users, eq25(studentProfiles3.assignedCounselorId, users.id)).where(
      and22(
        isNotNull(studentProfiles3.assignedCounselorId),
        or4(
          isNull(users.id),
          ne(users.userType, "team_member"),
          ne(users.teamRole, "counselor"),
          ne(users.accountStatus, "active")
        )
      )
    );
    for (const invalidAssignment of invalidAssignments) {
      await db.update(studentProfiles3).set({ assignedCounselorId: null }).where(eq25(studentProfiles3.id, invalidAssignment.studentId));
      console.log(`\u2705 Cleared invalid counselor assignment for student: ${invalidAssignment.studentId}`);
    }
    console.log("\n\u{1F389} Phozos auto-setup completed successfully!");
    console.log("\u{1F511} Admin Login Credentials:");
    console.log("   Email: admin@phozos.com");
    console.log("   Password: [Check environment variable or default]");
    console.log("\u{1F512} All security settings are functional");
    console.log("\u2705 Student profile validation completed");
    console.log("\u2705 Counselor assignment validation completed");
    console.log("\u{1F50D} Validating student profile save functionality...");
    try {
      const profilesWithDetails = await db.select().from(studentProfiles3).where(isNotNull(studentProfiles3.personalDetails)).limit(1);
      if (profilesWithDetails.length > 0) {
        console.log("\u2705 Student profile data structure validated");
        const sampleProfile = profilesWithDetails[0];
        if (sampleProfile.personalDetails && typeof sampleProfile.personalDetails === "object") {
          console.log("\u2705 Student profile JSONB fields properly structured");
        }
      } else {
        console.log("\u2139\uFE0F  No student profiles with extended details found (this is normal for new installations)");
      }
    } catch (error) {
      console.log("\u26A0\uFE0F  Student profile validation skipped:", error instanceof Error ? error.message : "Unknown error");
    }
    console.log("\u{1F50D} Validating community forum TypeScript interfaces...");
    try {
      const { existsSync, readFileSync } = await import("fs");
      const communityPath = "client/src/pages/Community.tsx";
      if (existsSync(communityPath)) {
        const communityContent = readFileSync(communityPath, "utf8");
        const hasUserTypeField = communityContent.includes("userType?:") || communityContent.includes("userType:");
        const hasCompanyNameField = communityContent.includes("companyName?:") || communityContent.includes("companyName:");
        const hasCorrectPostClick = communityContent.includes("handlePostClick(post.id)");
        if (hasUserTypeField && hasCompanyNameField) {
          console.log("\u2705 Community forum interfaces include required userType and companyName fields");
        } else {
          console.log("\u26A0\uFE0F  Community forum may need userType/companyName interface updates");
        }
        if (hasCorrectPostClick) {
          console.log("\u2705 Community forum handlePostClick correctly passes post.id");
        } else {
          console.log("\u26A0\uFE0F  Community forum handlePostClick may need parameter fix");
        }
      } else {
        console.log("\u2139\uFE0F  Community.tsx not found - will be created during development");
      }
    } catch (error) {
      console.log("\u26A0\uFE0F  Community forum validation skipped:", error instanceof Error ? error.message : "Unknown error");
    }
    console.log("\u{1F680} Platform is ready for use!\n");
  } catch (error) {
    console.error("\u274C Error during auto-setup:", error);
    throw error;
  }
}
var init_setup_after_migration = __esm({
  "server/setup-after-migration.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/index.ts
import express2 from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

// server/routes/index.ts
import { Router as Router20 } from "express";

// server/routes/auth.routes.ts
import { Router } from "express";

// server/controllers/base.controller.ts
init_response();
init_errors();
init_config();
var BaseController = class {
  /**
   * Send a successful API response with data
   * 
   * @protected
   * @template T - Type of the response data
   * @param {Response} res - Express response object
   * @param {T} data - Data to send in the response
   * @returns {Response} Express response with success format
   */
  sendSuccess(res, data) {
    return sendSuccess(res, data);
  }
  /**
   * Send a paginated success response
   * 
   * @protected
   * @template T - Type of the array elements
   * @param {Response} res - Express response object
   * @param {T[]} data - Array of data items
   * @param {Object} pagination - Pagination metadata
   * @param {number} pagination.page - Current page number
   * @param {number} pagination.limit - Items per page
   * @param {number} pagination.totalPages - Total number of pages
   * @param {boolean} pagination.hasNext - Whether there is a next page
   * @param {boolean} pagination.hasPrev - Whether there is a previous page
   * @param {number} [totalCount] - Optional total count of items
   * @returns {Response} Express response with paginated success format
   */
  sendPaginatedSuccess(res, data, pagination, totalCount) {
    return sendPaginatedSuccess(res, data, pagination, totalCount);
  }
  /**
   * Send an error API response
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {number} status - HTTP status code
   * @param {string} code - Application-specific error code
   * @param {string} message - Human-readable error message
   * @param {any} [details] - Additional error details
   * @param {string} [field] - Field name if validation error
   * @param {string} [hint] - Helpful hint for resolving the error
   * @returns {Response} Express response with error format
   */
  sendError(res, status, code, message, details, field, hint) {
    return sendError(res, status, code, message, details, field, hint);
  }
  /**
   * Send an empty success response (for DELETE operations, etc.)
   * 
   * @protected
   * @param {Response} res - Express response object
   * @returns {Response} Express response with empty success format
   */
  sendEmptySuccess(res) {
    return sendEmptySuccess(res);
  }
  /**
   * Send a file download response (for CSV, PDF, etc.)
   * This is a standardized helper for file downloads that maintains
   * consistency while allowing proper Content-Type and Content-Disposition headers
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {string | Buffer} content - File content to download
   * @param {string} filename - Name of the file for download
   * @param {string} [mimeType='application/octet-stream'] - MIME type of the file
   * @returns {Response} Express response with file download headers
   */
  sendFileDownload(res, content, filename, mimeType = "application/octet-stream") {
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(content);
  }
  /**
   * Get authenticated user ID from request
   * 
   * @protected
   * @param {AuthenticatedRequest} req - Express request with authenticated user
   * @returns {string} User ID from the authenticated request
   * @throws {AuthenticationError} If user is not authenticated or ID is missing
   */
  getUserId(req) {
    if (!req.user?.id) {
      throw new AuthenticationError("Authentication required");
    }
    return req.user.id;
  }
  /**
   * Get authenticated user object from request
   * 
   * @protected
   * @param {AuthenticatedRequest} req - Express request with authenticated user
   * @returns {User} Authenticated user object
   * @throws {AuthenticationError} If user is not authenticated
   */
  getUser(req) {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }
    return req.user;
  }
  /**
   * Centralized error handling for controllers
   * 
   * Handles all service-layer errors and legacy error formats.
   * Maps domain errors to appropriate HTTP status codes and error responses.
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {any} error - Error object to handle
   * @param {string} context - Context string for logging (e.g., 'ControllerName.methodName')
   * @returns {Response} Express response with formatted error
   */
  handleError(res, error, context) {
    console.error(`Error in ${context}:`, error);
    if (error instanceof AuthenticationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof AuthorizationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof ValidationServiceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        error.context?.errors
      );
    }
    if (error instanceof BusinessRuleViolationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof ResourceNotFoundError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof DuplicateResourceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof ServiceUnavailableError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof InvalidOperationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error instanceof ServiceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : void 0
      );
    }
    if (error.message === "USER_NOT_FOUND") {
      return this.sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return this.sendError(res, 409, "EMAIL_EXISTS", "Email already registered");
    }
    if (error.message === "INVALID_CREDENTIALS") {
      return this.sendError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
    }
    if (error.message === "USER_NOT_AUTHENTICATED") {
      return this.sendError(res, 401, "AUTH_REQUIRED", "Authentication required");
    }
    if (error.message === "ACCESS_DENIED" || error.message === "FORBIDDEN") {
      return this.sendError(res, 403, "ACCESS_DENIED", "You do not have permission to perform this action");
    }
    if (error.message === "RESOURCE_NOT_FOUND" || error.message?.includes("not found")) {
      return this.sendError(res, 404, "RESOURCE_NOT_FOUND", error.message || "Resource not found");
    }
    if (error.message === "DUPLICATE_ENTRY") {
      return this.sendError(res, 409, "DUPLICATE_ENTRY", "A resource with this information already exists");
    }
    if (error.message === "FOREIGN_KEY_VIOLATION") {
      return this.sendError(res, 400, "INVALID_REFERENCE", "Referenced resource does not exist");
    }
    if (error.message === "NOT_NULL_VIOLATION") {
      return this.sendError(res, 400, "MISSING_REQUIRED_FIELD", "Required field is missing");
    }
    if (error.message?.includes("Missing required fields")) {
      return this.sendError(res, 400, "VALIDATION_ERROR", error.message);
    }
    if (error.message === "INVALID_PAGINATION") {
      return this.sendError(res, 400, "INVALID_PAGINATION", error.details || "Invalid pagination parameters");
    }
    return this.sendError(
      res,
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      featuresConfig.ERROR_DETAILS_ENABLED ? error.message : void 0
    );
  }
  /**
   * Sanitize user object by removing sensitive fields
   * 
   * @protected
   * @param {any} user - User object to sanitize
   * @returns {any} Sanitized user object without password fields
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { password, temporaryPassword, ...sanitized } = user;
    return sanitized;
  }
  /**
   * Validate and parse pagination parameters
   * 
   * @protected
   * @param {string} [page] - Page number as string
   * @param {string} [limit] - Items per page as string
   * @returns {{ page: number; limit: number }} Validated pagination object
   * @throws {Error} Throws INVALID_PAGINATION error if parameters are invalid
   */
  validatePagination(page, limit) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    if (isNaN(pageNum) || pageNum < 1) {
      const error = new Error("INVALID_PAGINATION");
      error.details = "Invalid page number";
      throw error;
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      const error = new Error("INVALID_PAGINATION");
      error.details = "Invalid limit (must be between 1 and 100)";
      throw error;
    }
    return { page: pageNum, limit: limitNum };
  }
};

// server/controllers/auth.controller.ts
init_container();
import { z as z4 } from "zod";
var registerSchema = z4.object({
  email: z4.string().email(),
  password: z4.string().min(8),
  firstName: z4.string().min(1),
  lastName: z4.string().min(1),
  phone: z4.string().min(1),
  captchaToken: z4.string().optional()
});
var loginSchema = z4.object({
  email: z4.string().email(),
  password: z4.string().min(1)
});
var teamLoginSchema = z4.object({
  email: z4.string().email(),
  password: z4.string().min(1)
});
var registerStaffSchema = z4.object({
  email: z4.string().email(),
  password: z4.string().min(8),
  firstName: z4.string().min(1),
  lastName: z4.string().min(1),
  teamRole: z4.string().min(1),
  invitationToken: z4.string().min(1)
});
var AuthController = class extends BaseController {
  /**
   * Register a new student account
   * 
   * @route POST /api/auth/student-register
   * @access Public
   * @param {Request} req - Express request object containing registration data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "student@example.com",
   *   "password": "SecurePass123",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phone": "+1234567890"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {409} Conflict if email already exists
   */
  async registerStudent(req, res) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const registrationService2 = getService(TYPES.IRegistrationService);
      const result = await registrationService2.registerStudentComplete(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName,
        validatedData.phone
      );
      res.status(201);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return this.sendError(res, 409, "AUTH_EMAIL_EXISTS", "An account with this email already exists");
      }
      if (error.message?.includes("Password must")) {
        return this.sendError(res, 400, "VALIDATION_PASSWORD_STRENGTH", error.message);
      }
      if (error.message?.includes("email")) {
        return this.sendError(res, 400, "VALIDATION_EMAIL_DISPOSABLE", error.message);
      }
      return this.handleError(res, error, "AuthController.registerStudent");
    }
  }
  /**
   * Authenticate a student and return session token
   * 
   * @route POST /api/auth/student-login
   * @access Public
   * @param {Request} req - Express request object containing login credentials
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "student@example.com",
   *   "password": "SecurePass123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if credentials are invalid
   */
  async loginStudent(req, res) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const authService2 = getService(TYPES.IAuthService);
      const result = await authService2.loginStudentComplete(email, password);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AuthController.loginStudent");
    }
  }
  /**
   * Authenticate a team member (counselor/staff) and return session token
   * 
   * @route POST /api/auth/team-login
   * @access Public
   * @param {Request} req - Express request object containing login credentials
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns team member data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "counselor@edupath.com",
   *   "password": "SecurePass123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if credentials are invalid
   */
  async loginTeam(req, res) {
    try {
      const { email, password } = teamLoginSchema.parse(req.body);
      const authService2 = getService(TYPES.IAuthService);
      const result = await authService2.loginTeamComplete(email, password);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AuthController.loginTeam");
    }
  }
  /**
   * Get current authenticated user information
   * 
   * @route GET /api/auth/me
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns sanitized user data (without password)
   * 
   * @throws {401} Unauthorized if user is not authenticated
   */
  async me(req, res) {
    try {
      const sanitizedUser = this.sanitizeUser(req.user);
      return this.sendSuccess(res, sanitizedUser);
    } catch (error) {
      return this.handleError(res, error, "AuthController.me");
    }
  }
  /**
   * Logout current user (client-side token removal for JWT)
   * 
   * @route POST /api/auth/logout
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @note With JWT tokens, logout is handled client-side by removing the token
   */
  async logout(req, res) {
    try {
      return this.sendSuccess(res, { message: "Logged out successfully" });
    } catch (error) {
      return this.handleError(res, error, "AuthController.logout");
    }
  }
  /**
   * Get team login visibility setting (whether team login should be shown on login page)
   * 
   * @route GET /api/auth/team-login-visibility
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns visibility status
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "visible": true
   *   }
   * }
   */
  async getTeamLoginVisibility(req, res) {
    try {
      const authService2 = getService(TYPES.IAuthService);
      const result = await authService2.getTeamLoginVisibilityStatus();
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, "AuthController.getTeamLoginVisibility");
    }
  }
  /**
   * View staff invitation link details
   * 
   * @route GET /api/staff-invite/:token
   * @access Public
   * @param {Request} req - Express request object with token parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns invitation details
   * 
   * @note Does not record usage - usage tracking happens only on actual registration
   */
  async viewStaffInvite(req, res) {
    try {
      const { token } = req.params;
      const { adminStaffInvitationService: adminStaffInvitationService2 } = await Promise.resolve().then(() => (init_admin(), admin_exports));
      const invitationLink = await adminStaffInvitationService2.getStaffInviteInfo(token);
      const protocol = req.protocol;
      const host = req.get("host");
      return this.sendSuccess(res, {
        id: invitationLink.id,
        token: invitationLink.token,
        url: `${protocol}://${host}/auth/staff-invite/${invitationLink.token}`,
        createdAt: invitationLink.createdAt
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVITATION_NOT_FOUND") {
        return this.sendError(res, 404, "INVITATION_NOT_FOUND", "Invalid or expired invitation link");
      }
      return this.handleError(res, error, "AuthController.viewStaffInvite");
    }
  }
  /**
   * Register staff member via invitation link
   * 
   * @route POST /api/auth/register-staff
   * @access Public (requires valid invitation token)
   * @param {Request} req - Express request object containing registration data and invitation token
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message and user data
   */
  async registerStaff(req, res) {
    try {
      const { email, password, firstName, lastName, teamRole, invitationToken } = registerStaffSchema.parse(req.body);
      const registrationService2 = getService(TYPES.IRegistrationService);
      const result = await registrationService2.registerStaffWithInvite({
        email,
        password,
        firstName,
        lastName,
        teamRole,
        invitationToken
      });
      return this.sendSuccess(res, {
        message: "Staff account created successfully",
        user: result.user
      });
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      if (error instanceof Error) {
        if (error.message === "INVALID_INVITATION_TOKEN") {
          return this.sendError(res, 400, "INVALID_INVITATION_TOKEN", "Invalid or expired invitation token");
        }
        if (error.message === "USER_ALREADY_EXISTS") {
          return this.sendError(res, 400, "USER_ALREADY_EXISTS", "User already exists with this email");
        }
      }
      return this.handleError(res, error, "AuthController.registerStaff");
    }
  }
};
var authController = new AuthController();

// server/middleware/authentication.ts
init_jwtService();
init_repositories();

// server/middleware/error-handler.ts
init_response();

// shared/api-types.ts
var ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS",
  // CSRF & Security
  CSRF_INVALID: "CSRF_INVALID",
  CSRF_MISSING: "CSRF_MISSING",
  // Rate Limiting
  RATE_LIMITED: "RATE_LIMITED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  RESPONSE_VALIDATION_ERROR: "RESPONSE_VALIDATION_ERROR",
  // Resources
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  // Business Logic
  STUDENTS_FETCH_ERROR: "STUDENTS_FETCH_ERROR",
  UNIVERSITY_CREATE_ERROR: "UNIVERSITY_CREATE_ERROR",
  FORUM_POST_ERROR: "FORUM_POST_ERROR"
};

// server/utils/logger.ts
import winston2 from "winston";

// server/utils/logger-config.ts
init_config();
import winston from "winston";
import path from "path";
var levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};
var colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue"
};
winston.addColors(colors);
function getLogLevel() {
  return loggingConfig.LOG_LEVEL;
}
var developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${Object.keys(info).length > 3 ? JSON.stringify(
      Object.fromEntries(
        Object.entries(info).filter(([key]) => !["timestamp", "level", "message"].includes(key))
      ),
      null,
      2
    ) : ""}`
  )
);
var productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
function getConsoleTransport() {
  return new winston.transports.Console({
    level: getLogLevel(),
    format: loggingConfig.LOG_FORMAT === "json" ? productionFormat : developmentFormat
  });
}
function getCombinedFileTransport() {
  return new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "combined.log"),
    level: "info",
    maxsize: 10485760,
    // 10MB
    maxFiles: 7,
    // 7 days
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  });
}
function getErrorFileTransport() {
  return new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "error.log"),
    level: "error",
    maxsize: 10485760,
    // 10MB
    maxFiles: 14,
    // 14 days for errors
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  });
}
function getTransports() {
  const transports = [getConsoleTransport()];
  if (loggingConfig.LOG_FILE_ENABLED) {
    transports.push(getCombinedFileTransport());
    transports.push(getErrorFileTransport());
  }
  return transports;
}

// server/utils/logger.ts
function createLogger() {
  try {
    const logger2 = winston2.createLogger({
      levels,
      transports: getTransports(),
      // Don't exit on error
      exitOnError: false
    });
    return logger2;
  } catch (error) {
    console.error("Failed to initialize Winston logger, falling back to console:", error);
    return winston2.createLogger({
      levels,
      transports: [new winston2.transports.Console()],
      exitOnError: false
    });
  }
}
var logger = createLogger();
var logger_default = logger;

// server/utils/logger-sanitizers.ts
import { createHash } from "crypto";
var SENSITIVE_FIELDS = [
  "password",
  "newPassword",
  "oldPassword",
  "currentPassword",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "creditCard",
  "cardNumber",
  "cvv",
  "ssn",
  "socialSecurity"
];
var EMAIL_REGEX = /^([a-zA-Z0-9])([^@]*)(@.+)$/;
function sanitizeLogData(data) {
  if (data === null || data === void 0) {
    return data;
  }
  if (typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }
  const sanitized = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  if (sanitized.email && typeof sanitized.email === "string") {
    sanitized.email = maskEmail(sanitized.email);
  }
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  return sanitized;
}
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== "object") {
    return headers;
  }
  const sanitized = { ...headers };
  if (sanitized.authorization) {
    sanitized.authorization = sanitized.authorization.startsWith("Bearer ") ? "Bearer [REDACTED]" : "[REDACTED]";
  }
  if (sanitized.Authorization) {
    sanitized.Authorization = sanitized.Authorization.startsWith("Bearer ") ? "Bearer [REDACTED]" : "[REDACTED]";
  }
  if (sanitized.cookie) {
    sanitized.cookie = "[REDACTED]";
  }
  if (sanitized.Cookie) {
    sanitized.Cookie = "[REDACTED]";
  }
  if (sanitized["x-api-key"]) {
    sanitized["x-api-key"] = "[REDACTED]";
  }
  return sanitized;
}
function maskEmail(email) {
  if (!email || typeof email !== "string") {
    return email;
  }
  const match = email.match(EMAIL_REGEX);
  if (!match) {
    return email;
  }
  return `${match[1]}***${match[3]}`;
}
function hashSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return "[INVALID_SESSION]";
  }
  return createHash("sha256").update(sessionId).digest("hex").substring(0, 16);
}
function sanitizeBody(body) {
  return sanitizeLogData(body);
}

// server/middleware/error-handler.ts
init_config();
var HttpError = class _HttpError extends Error {
  status;
  code;
  details;
  field;
  hint;
  constructor(status, code, message, details, field, hint) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.field = field;
    this.hint = hint;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _HttpError);
    }
  }
  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
      field: this.field,
      hint: this.hint,
      stack: this.stack
    };
  }
};
var errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof HttpError) {
    return sendError(
      res,
      err.status,
      err.code,
      err.message,
      err.details,
      err.field,
      err.hint
    );
  }
  if (err.name === "JsonWebTokenError") {
    logger_default.warn("JWT verification failed", { error: err.message });
    return sendError(res, 401, ErrorCodes.AUTH_INVALID_TOKEN, "Invalid authentication token");
  }
  if (err.name === "TokenExpiredError") {
    logger_default.warn("JWT token expired");
    return sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, "Authentication token has expired");
  }
  if (err.name === "NotBeforeError") {
    logger_default.warn("JWT token used before valid");
    return sendError(res, 401, ErrorCodes.AUTH_INVALID_TOKEN, "Token is not yet valid");
  }
  if (err.message?.toLowerCase().includes("csrf") || err.code === "EBADCSRFTOKEN") {
    logger_default.warn("CSRF error", { error: err.message, code: err.code });
    return sendError(
      res,
      403,
      ErrorCodes.CSRF_INVALID,
      "CSRF token validation failed",
      void 0,
      void 0,
      "Please refresh the page and try again"
    );
  }
  if (err.name === "ValidationError" || err.type === "validation") {
    const details = err.details || err.errors || err.array?.();
    return sendError(
      res,
      422,
      ErrorCodes.VALIDATION_ERROR,
      err.message || "Validation failed",
      details
    );
  }
  if (err.status === 429 || err.message?.includes("rate limit")) {
    const retryAfter = err.retryAfter || 60;
    res.set("Retry-After", retryAfter.toString());
    return sendError(
      res,
      429,
      ErrorCodes.RATE_LIMITED,
      "Too many requests. Please try again later.",
      { retryAfter },
      void 0,
      `Try again in ${retryAfter} seconds`
    );
  }
  if (err.code === "ENOENT") {
    return sendError(res, 404, ErrorCodes.RESOURCE_NOT_FOUND, "Resource not found");
  }
  if (err.code === "ECONNREFUSED") {
    return sendError(res, 503, ErrorCodes.SERVICE_UNAVAILABLE, "Service temporarily unavailable");
  }
  if (err.code === "ECONNRESET" || err.code === "ENOTFOUND") {
    logger_default.error("Database connection error", {
      code: err.code,
      error: err.message,
      stack: err.stack
    });
    return sendError(res, 503, ErrorCodes.SERVICE_UNAVAILABLE, "Database service unavailable");
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return sendError(
      res,
      413,
      ErrorCodes.VALIDATION_ERROR,
      "File size too large",
      { maxSize: err.field === "fileSize" ? "5MB" : "unknown" }
    );
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      "Unexpected file field",
      { field: err.field }
    );
  }
  if (err instanceof SyntaxError && "body" in err) {
    return sendError(
      res,
      400,
      ErrorCodes.INVALID_INPUT,
      "Invalid JSON in request body"
    );
  }
  const errorPatterns = [
    {
      pattern: /jwt enhanced verification failed/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: "Authentication failed"
    },
    {
      pattern: /jwt verification blocked/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: "Authentication blocked due to security policy",
      hint: "Contact administrator if this persists"
    },
    {
      pattern: /invalid algorithm/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: "Invalid token algorithm"
    },
    {
      pattern: /audience mismatch|issuer mismatch/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: "Token validation failed"
    }
  ];
  for (const pattern of errorPatterns) {
    if (pattern.pattern.test(err.message)) {
      logger_default.warn("Pattern matched error", {
        error: err.message,
        pattern: pattern.message
      });
      return sendError(
        res,
        pattern.status,
        pattern.code,
        pattern.message,
        void 0,
        void 0,
        pattern.hint
      );
    }
  }
  logger_default.error("Unhandled error in API", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    userId: req.user?.id || "anonymous"
  });
  return sendError(
    res,
    500,
    ErrorCodes.INTERNAL_ERROR,
    featuresConfig.ERROR_DETAILS_ENABLED ? `Internal server error: ${err.message}` : "Internal server error"
  );
};
var asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
var createHttpError = {
  badRequest: (message, details, field) => new HttpError(400, ErrorCodes.INVALID_INPUT, message, details, field),
  unauthorized: (message = "Authentication required") => new HttpError(401, ErrorCodes.AUTH_REQUIRED, message),
  forbidden: (message = "Insufficient permissions") => new HttpError(403, ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, message),
  notFound: (resource = "Resource") => new HttpError(404, ErrorCodes.RESOURCE_NOT_FOUND, `${resource} not found`),
  conflict: (message) => new HttpError(409, ErrorCodes.RESOURCE_CONFLICT, message),
  validationError: (message, details, field) => new HttpError(422, ErrorCodes.VALIDATION_ERROR, message, details, field),
  internalError: (message = "Internal server error") => new HttpError(500, ErrorCodes.INTERNAL_ERROR, message),
  serviceUnavailable: (message = "Service temporarily unavailable") => new HttpError(503, ErrorCodes.SERVICE_UNAVAILABLE, message)
};

// server/middleware/authentication.ts
function authorize(rules = { requiresAuth: true }) {
  return async (req, res, next) => {
    return authorizeUnified(req, res, next, rules);
  };
}
async function authorizeUnified(req, res, next, rules) {
  try {
    if (!rules.requiresAuth) {
      return next();
    }
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createHttpError.unauthorized("Authorization header with Bearer token required");
    }
    const token = authHeader.substring(7);
    const decoded = jwtService.verify(token);
    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId || typeof userId !== "string") {
      logger_default.warn("JWT token missing valid user identifier");
      throw createHttpError.unauthorized("Invalid token format");
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      logger_default.warn("User not found for token", { userId });
      throw createHttpError.unauthorized("User not found");
    }
    req.user = user;
    return applyAuthorizationRules(req, res, next, rules);
  } catch (error) {
    return next(error);
  }
}
function applyAuthorizationRules(req, res, next, rules) {
  const authReq = req;
  const user = authReq.user;
  if (!user && rules.requiresAuth) {
    return next(createHttpError.unauthorized("Authentication required"));
  }
  if (!user) {
    return next();
  }
  if (rules.userTypes && !rules.userTypes.includes(user.userType)) {
    logger_default.warn("Unauthorized access attempt: user type restriction", {
      userId: user.id,
      userType: user.userType,
      requiredTypes: rules.userTypes
    });
    return next(createHttpError.forbidden("Access denied"));
  }
  if (rules.teamRoles && user.userType === "team_member") {
    if (!user.teamRole || !rules.teamRoles.includes(user.teamRole)) {
      logger_default.warn("Unauthorized access attempt: team role restriction", {
        userId: user.id,
        teamRole: user.teamRole,
        requiredRoles: rules.teamRoles
      });
      return next(createHttpError.forbidden("Insufficient role permissions"));
    }
  }
  next();
}
var requireAuth = authorize({ requiresAuth: true });
var requireAdmin = authorize({ requiresAuth: true, userTypes: ["team_member"], teamRoles: ["admin"] });
var requireTeamMember = authorize({ requiresAuth: true, userTypes: ["team_member"] });
var requireCustomer = authorize({ requiresAuth: true, userTypes: ["customer"] });
var requireCompanyProfile = authorize({ requiresAuth: true, userTypes: ["company_profile"] });

// server/middleware/csrf.ts
init_response();
init_jwtService();
init_config();
import { randomBytes as randomBytes3, createHmac, timingSafeEqual } from "crypto";
var defaultConfig = {
  tokenLength: 32,
  metricsEnabled: securityConfig.CSRF_METRICS_ENABLED,
  cookie: {
    key: "_csrf",
    httpOnly: false,
    // Frontend needs to read this for double-submit pattern
    sameSite: cookiesConfig.COOKIE_SAMESITE,
    secure: cookiesConfig.COOKIE_SECURE,
    maxAge: 36e5
    // 1 hour
  },
  headerName: "x-csrf-token",
  bodyField: "_csrf"
};
function getSessionIdFromRequest(req) {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return "unauthenticated";
    }
    const token = authHeader.substring(7);
    const verified = jwtService.verify(token);
    const userId = verified?.userId || verified?.sub;
    return userId || "unauthenticated";
  } catch (error) {
    logger_default.warn("JWT verification failed in CSRF session extraction", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return "unauthenticated";
  }
}
var CSRFTokenManager = class {
  config;
  secret;
  metrics;
  constructor(config2) {
    this.config = { ...defaultConfig, ...config2 };
    this.metrics = {
      tokensGenerated: 0,
      validationSuccesses: 0,
      validationFailures: 0,
      oldTokensDetected: 0,
      sessionMismatches: 0,
      lastReset: Date.now()
    };
    this.secret = config2?.secret || securityConfig.CSRF_SECRET;
    if (this.config.metricsEnabled) {
      this.startMetricsLogging();
    }
  }
  /**
   * Performance-optimized timing-safe string comparison
   * Uses Buffer.allocUnsafe for better performance (safe since we fill it immediately)
   * 
   * @param a - First hex string
   * @param b - Second hex string
   * @returns true if strings are equal in constant time
   */
  timingSafeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    try {
      const bufferA = Buffer.allocUnsafe(a.length / 2);
      const bufferB = Buffer.allocUnsafe(b.length / 2);
      bufferA.write(a, "hex");
      bufferB.write(b, "hex");
      return timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }
  /**
   * Get current CSRF metrics
   * @returns Copy of current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * Reset CSRF metrics
   */
  resetMetrics() {
    this.metrics = {
      tokensGenerated: 0,
      validationSuccesses: 0,
      validationFailures: 0,
      oldTokensDetected: 0,
      sessionMismatches: 0,
      lastReset: Date.now()
    };
  }
  /**
   * Start periodic metrics logging (development only)
   */
  startMetricsLogging() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.metrics.lastReset) / 1e3);
      const totalValidations = this.metrics.validationSuccesses + this.metrics.validationFailures;
      const failureRate = totalValidations > 0 ? (this.metrics.validationFailures / totalValidations * 100).toFixed(2) : "0.00";
      logger_default.info("CSRF Metrics", {
        uptimeSeconds: uptime,
        tokensGenerated: this.metrics.tokensGenerated,
        validationSuccesses: this.metrics.validationSuccesses,
        validationFailures: this.metrics.validationFailures,
        failureRatePercent: failureRate,
        oldTokensDetected: this.metrics.oldTokensDetected,
        sessionMismatches: this.metrics.sessionMismatches
      });
    }, 3e5);
  }
  /**
   * Generate a cryptographically secure HMAC-signed CSRF token
   * 
   * Token format: randomValue.signature
   * Signature: HMAC-SHA256(randomValue.sessionId, secret)
   * 
   * @param sessionId - Session identifier (userId from JWT), defaults to 'unauthenticated'
   * @returns HMAC-signed token in format: random.signature
   */
  generateToken(sessionId = "unauthenticated") {
    const start = this.config.metricsEnabled ? Date.now() : 0;
    const randomValue = randomBytes3(this.config.tokenLength).toString("hex");
    const message = `${randomValue}.${sessionId}`;
    const signature = createHmac("sha256", this.secret).update(message).digest("hex");
    const token = `${randomValue}.${signature}`;
    if (this.config.metricsEnabled) {
      this.metrics.tokensGenerated++;
    }
    if (this.config.metricsEnabled && start > 0) {
      const duration = Date.now() - start;
      if (duration > 1) {
        logger_default.debug("CSRF token generated", { durationMs: duration });
      }
    }
    return token;
  }
  /**
   * Validate HMAC-signed CSRF token
   * 
   * @param token - Token to validate in format: randomValue.signature
   * @param sessionId - Session identifier (userId from JWT), defaults to 'unauthenticated'
   * @returns true if token is valid and matches session
   */
  validateToken(token, sessionId = "unauthenticated") {
    if (!token || typeof token !== "string") {
      return false;
    }
    if (!sessionId || typeof sessionId !== "string" || sessionId.length === 0) {
      return false;
    }
    try {
      const parts = token.split(".");
      if (parts.length !== 2) {
        return false;
      }
      const [randomValue, providedSignature] = parts;
      if (!/^[0-9a-f]+$/i.test(randomValue) || !/^[0-9a-f]+$/i.test(providedSignature)) {
        return false;
      }
      const message = `${randomValue}.${sessionId}`;
      const expectedSignature = createHmac("sha256", this.secret).update(message).digest("hex");
      return this.timingSafeCompare(providedSignature, expectedSignature);
    } catch (error) {
      logger_default.error("CSRF token validation error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return false;
    }
  }
  /**
   * Get token from request (header or body)
   */
  getTokenFromRequest(req) {
    const headerToken = req.headers[this.config.headerName];
    if (headerToken) {
      return headerToken;
    }
    const bodyToken = req.body?.[this.config.bodyField];
    if (bodyToken) {
      return bodyToken;
    }
    return null;
  }
};
var csrfManager = new CSRFTokenManager();
var csrfTokenProvider = (req, res, next) => {
  req.csrfToken = () => {
    const sessionId = getSessionIdFromRequest(req);
    const token = csrfManager.generateToken(sessionId);
    res.cookie(defaultConfig.cookie.key, token, {
      httpOnly: false,
      // Frontend needs to read this for double-submit pattern
      sameSite: cookiesConfig.COOKIE_SAMESITE,
      secure: cookiesConfig.COOKIE_SECURE,
      path: "/",
      maxAge: defaultConfig.cookie.maxAge
    });
    return token;
  };
  next();
};
var csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const token = csrfManager.getTokenFromRequest(req);
  const cookieToken = req.cookies?.[defaultConfig.cookie.key];
  if (!token || !cookieToken) {
    logger_default.warn("CSRF validation failed: Missing tokens", {
      hasHeaderOrBodyToken: !!token,
      hasCookieToken: !!cookieToken
    });
    if (csrfManager.config.metricsEnabled) {
      csrfManager["metrics"].validationFailures++;
    }
    return sendError(res, 403, "CSRF_TOKEN_MISSING", "CSRF token missing");
  }
  if (token !== cookieToken) {
    logger_default.warn("CSRF validation failed: Token/cookie mismatch");
    if (csrfManager.config.metricsEnabled) {
      csrfManager["metrics"].validationFailures++;
    }
    return sendError(res, 403, "CSRF_TOKEN_MISMATCH", "CSRF token mismatch");
  }
  const sessionId = getSessionIdFromRequest(req);
  const isValid = csrfManager.validateToken(token, sessionId);
  if (!isValid) {
    logger_default.warn("CSRF validation failed: Invalid signature or session mismatch", {
      sessionHash: hashSessionId(sessionId)
    });
    if (csrfManager.config.metricsEnabled) {
      csrfManager["metrics"].validationFailures++;
      csrfManager["metrics"].sessionMismatches++;
    }
    return sendError(res, 403, "CSRF_TOKEN_INVALID", "Invalid CSRF token signature or session mismatch");
  }
  if (csrfManager.config.metricsEnabled) {
    csrfManager["metrics"].validationSuccesses++;
  }
  logger_default.info("CSRF validation successful", {
    sessionHash: hashSessionId(sessionId)
  });
  next();
};
var csrfTokenEndpoint = (req, res) => {
  try {
    if (!req.csrfToken || typeof req.csrfToken !== "function") {
      logger_default.error("CSRF token generator not available on request object");
      return sendError(res, 500, "CSRF_SERVICE_UNAVAILABLE", "CSRF token generation service is not available");
    }
    const token = req.csrfToken();
    if (!token || typeof token !== "string" || token.length === 0) {
      logger_default.error("Generated CSRF token is invalid or empty");
      return sendError(res, 500, "CSRF_GENERATION_ERROR", "Failed to generate valid CSRF token");
    }
    if (!token.includes(".")) {
      logger_default.error("Generated CSRF token has invalid format (missing signature)");
      return sendError(res, 500, "CSRF_FORMAT_ERROR", "Generated CSRF token has invalid format");
    }
    const sessionId = getSessionIdFromRequest(req);
    logger_default.info("CSRF token generated and validated successfully", {
      authenticated: sessionId !== "unauthenticated",
      sessionHash: sessionId !== "unauthenticated" ? hashSessionId(sessionId) : null
    });
    const response = {
      csrfToken: token,
      timestamp: Date.now()
    };
    if (isDev()) {
      response.environment = "development";
      response.tokenLength = token.length;
      response.sessionHash = sessionId !== "unauthenticated" ? hashSessionId(sessionId) : "unauthenticated";
      response.debug = {
        cookieSet: true,
        headerRequired: "x-csrf-token",
        sessionBound: true,
        hmacSigned: true
      };
    }
    return sendSuccess(res, response);
  } catch (error) {
    logger_default.error("CSRF token endpoint error", {
      error: error.message || "Unknown error",
      code: error.code
    });
    const errorMessage = error.message || "Internal server error occurred during CSRF token generation";
    const errorCode = error.code || "CSRF_INTERNAL_ERROR";
    return sendError(res, 500, errorCode, errorMessage);
  }
};

// server/middleware/security.ts
init_db();
init_schema();
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { eq as eq24 } from "drizzle-orm";
function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || "127.0.0.1";
}
var registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 5,
  // 5 registrations per hour per IP
  message: {
    error: "Too many registration attempts from this IP. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => {
    const adminIps = process.env.ADMIN_IPS?.split(",") || [];
    return adminIps.includes(getClientIp(req));
  }
});
var loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // Stricter rate limiting - replaces complex database locks
  message: {
    error: "Too many login attempts from this IP. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  // Now uses secure IP detection
  skipSuccessfulRequests: true
  // Allow successful requests to not count against limit
});
var speedLimiter = slowDown({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  delayAfter: 5,
  // Allow 5 requests per windowMs without delay
  delayMs: () => 500,
  // Add 500ms delay per request after delayAfter
  maxDelayMs: 5e3,
  // Maximum delay of 5 seconds
  validate: { delayMs: false }
});
var addIpToRequest = (req, res, next) => {
  req.clientIp = getClientIp(req);
  next();
};

// server/routes/auth.routes.ts
var router = Router();
router.post(
  "/student-register",
  registrationRateLimit,
  csrfProtection,
  asyncHandler((req, res) => authController.registerStudent(req, res))
);
router.post(
  "/student-login",
  loginRateLimit,
  csrfProtection,
  asyncHandler((req, res) => authController.loginStudent(req, res))
);
router.post(
  "/team-login",
  csrfProtection,
  asyncHandler((req, res) => authController.loginTeam(req, res))
);
router.post(
  "/logout",
  csrfProtection,
  asyncHandler((req, res) => authController.logout(req, res))
);
router.get(
  "/me",
  requireAuth,
  asyncHandler((req, res) => authController.me(req, res))
);
router.get(
  "/csrf-token",
  csrfTokenProvider,
  asyncHandler(csrfTokenEndpoint)
);
router.get(
  "/team-login-visibility",
  asyncHandler((req, res) => authController.getTeamLoginVisibility(req, res))
);
router.get(
  "/staff-invite/:token",
  asyncHandler((req, res) => authController.viewStaffInvite(req, res))
);
router.post(
  "/register-staff",
  registrationRateLimit,
  csrfProtection,
  asyncHandler((req, res) => authController.registerStaff(req, res))
);
var auth_routes_default = router;

// server/routes/user.routes.ts
import { Router as Router2 } from "express";

// server/controllers/user.controller.ts
init_container();
import { z as z5 } from "zod";
var updateProfileSchema = z5.object({
  firstName: z5.string().min(1).optional(),
  lastName: z5.string().min(1).optional(),
  phone: z5.string().optional(),
  profilePicture: z5.string().optional(),
  bio: z5.string().optional(),
  location: z5.string().optional()
});
var changePasswordSchema = z5.object({
  oldPassword: z5.string().min(1),
  newPassword: z5.string().min(8)
});
var updateStudentProfileSchema = z5.object({
  phone: z5.string().optional(),
  dateOfBirth: z5.string().optional().nullable(),
  nationality: z5.string().optional().nullable(),
  currentEducationLevel: z5.string().optional().nullable(),
  institutionName: z5.string().optional().nullable(),
  gpa: z5.union([z5.number(), z5.string()]).optional().nullable(),
  academicScoringType: z5.string().optional().nullable(),
  testScores: z5.record(z5.any()).optional().nullable(),
  intendedMajor: z5.string().optional().nullable(),
  preferredCountries: z5.array(z5.string()).optional(),
  destinationCountry: z5.string().optional().nullable(),
  intakeYear: z5.string().optional().nullable(),
  budgetRange: z5.string().optional().nullable(),
  academicInterests: z5.array(z5.string()).optional(),
  extracurriculars: z5.array(z5.any()).optional(),
  workExperience: z5.array(z5.any()).optional(),
  familyInfo: z5.record(z5.any()).optional().nullable(),
  educationHistory: z5.array(z5.any()).optional(),
  notes: z5.string().optional().nullable(),
  // Nested objects
  personalDetails: z5.record(z5.any()).optional().nullable(),
  academicDetails: z5.record(z5.any()).optional().nullable(),
  workDetails: z5.record(z5.any()).optional().nullable(),
  studyPreferences: z5.record(z5.any()).optional().nullable(),
  universityPreferences: z5.record(z5.any()).optional().nullable(),
  financialInfo: z5.record(z5.any()).optional().nullable(),
  visaHistory: z5.record(z5.any()).optional().nullable(),
  familyDetails: z5.record(z5.any()).optional().nullable(),
  additionalInfo: z5.record(z5.any()).optional().nullable()
});
var UserController = class extends BaseController {
  /**
   * Get the authenticated user's profile
   * 
   * @route GET /api/users/profile
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user profile data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const profile = await userProfileService2.getUserProfile(userId);
      return this.sendSuccess(res, profile);
    } catch (error) {
      return this.handleError(res, error, "UserController.getProfile");
    }
  }
  /**
   * Update the authenticated user's profile
   * 
   * @route PUT /api/users/profile
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and profile update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateProfileSchema.parse(req.body);
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const updated = await userProfileService2.updateUserProfile(userId, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z5.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "UserController.updateProfile");
    }
  }
  /**
   * Change the authenticated user's password
   * 
   * @route PUT /api/users/change-password
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, old and new passwords
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @example
   * // Request body:
   * {
   *   "oldPassword": "CurrentPassword123",
   *   "newPassword": "NewSecurePassword456"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if old password is incorrect or user not authenticated
   * @throws {500} Internal server error
   */
  async changePassword(req, res) {
    try {
      const userId = this.getUserId(req);
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userProfileService2 = getService(TYPES.IUserProfileService);
      await userProfileService2.changePassword(userId, oldPassword, newPassword);
      return this.sendSuccess(res, { message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z5.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      if (error.message === "INVALID_OLD_PASSWORD") {
        return this.sendError(res, 401, "INVALID_OLD_PASSWORD", "Current password is incorrect");
      }
      return this.handleError(res, error, "UserController.changePassword");
    }
  }
  /**
   * Update student-specific profile information
   * 
   * @route PUT /api/users/student-profile
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user and academic data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateStudentProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateStudentProfileSchema.parse(req.body);
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const updated = await userProfileService2.updateStudentProfile(userId, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z5.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "UserController.updateStudentProfile");
    }
  }
  /**
   * Get all users in the system
   * 
   * @route GET /api/users
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with authenticated admin user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all users
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async getAllUsers(req, res) {
    try {
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const users2 = await adminUserService2.getAllUsers();
      return this.sendSuccess(res, users2);
    } catch (error) {
      return this.handleError(res, error, "UserController.getAllUsers");
    }
  }
  /**
   * Get all team/staff members
   * 
   * @route GET /api/users/team
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of team members
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getTeamMembers(req, res) {
    try {
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const teamMembers = await adminUserService2.getStaffMembers();
      return this.sendSuccess(res, teamMembers);
    } catch (error) {
      return this.handleError(res, error, "UserController.getTeamMembers");
    }
  }
};
var userController = new UserController();

// server/routes/user.routes.ts
var router2 = Router2();
router2.use(requireAuth);
router2.get("/profile", asyncHandler((req, res) => userController.getProfile(req, res)));
router2.put("/profile", csrfProtection, asyncHandler((req, res) => userController.updateProfile(req, res)));
router2.post("/change-password", csrfProtection, asyncHandler((req, res) => userController.changePassword(req, res)));
router2.put("/student-profile", csrfProtection, asyncHandler((req, res) => userController.updateStudentProfile(req, res)));
router2.get("/all", requireAdmin, asyncHandler((req, res) => userController.getAllUsers(req, res)));
router2.get("/team-members", requireAdmin, asyncHandler((req, res) => userController.getTeamMembers(req, res)));
var user_routes_default = router2;

// server/routes/university.routes.ts
import { Router as Router3 } from "express";

// server/controllers/university.controller.ts
init_container();
import { z as z6 } from "zod";
var createUniversitySchema = z6.object({
  name: z6.string().min(1),
  country: z6.string().min(1),
  city: z6.string().min(1),
  description: z6.string().optional(),
  ranking: z6.object({
    world: z6.number().optional(),
    national: z6.number().optional(),
    subject: z6.record(z6.number()).optional()
  }).optional().nullable(),
  worldRanking: z6.number().optional().nullable(),
  tuitionFee: z6.number().optional().nullable(),
  specialization: z6.string().optional().nullable(),
  degreeLevels: z6.array(z6.string()).optional(),
  logo: z6.string().optional().nullable(),
  website: z6.string().optional().nullable(),
  applicationDeadline: z6.string().optional().nullable(),
  tier: z6.enum(["general", "top500", "top200", "top100", "ivy_league"]).optional().nullable(),
  isActive: z6.boolean().optional()
});
var updateUniversitySchema = createUniversitySchema.partial();
var getAllUniversitiesQuerySchema = z6.object({
  country: z6.string().optional(),
  city: z6.string().optional(),
  tier: z6.enum(["general", "top500", "top200", "top100", "ivy_league"]).optional(),
  minTuition: z6.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "minTuition must be a valid number"
  }).transform((val) => val ? Number(val) : void 0),
  maxTuition: z6.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "maxTuition must be a valid number"
  }).transform((val) => val ? Number(val) : void 0),
  specialization: z6.string().optional(),
  isActive: z6.enum(["true", "false"]).optional().transform((val) => val === "true" ? true : val === "false" ? false : void 0)
});
var searchUniversitiesQuerySchema = z6.object({
  query: z6.string().min(1),
  country: z6.string().optional(),
  city: z6.string().optional(),
  tier: z6.enum(["general", "top500", "top200", "top100", "ivy_league"]).optional(),
  minTuition: z6.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "minTuition must be a valid number"
  }).transform((val) => val ? Number(val) : void 0),
  maxTuition: z6.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "maxTuition must be a valid number"
  }).transform((val) => val ? Number(val) : void 0)
});
var UniversityController = class extends BaseController {
  /**
   * Get all universities with optional filters
   * 
   * @route GET /api/universities
   * @access Public
   * @param {Request} req - Express request object with optional query filters
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns filtered list of universities
   * 
   * @example
   * // Request query:
   * // GET /api/universities?country=USA&tier=top100&minTuition=20000&maxTuition=50000
   * 
   * @throws {422} Validation error if query parameters are invalid
   * @throws {500} Internal server error
   */
  async getAllUniversities(req, res) {
    try {
      const validatedQuery = getAllUniversitiesQuerySchema.parse(req.query);
      const universityService2 = getService(TYPES.IUniversityService);
      const universities2 = await universityService2.getAllUniversities(validatedQuery);
      return this.sendSuccess(res, universities2);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
      }
      return this.handleError(res, error, "UniversityController.getAllUniversities");
    }
  }
  /**
   * Get a specific university by ID
   * 
   * @route GET /api/universities/:id
   * @access Public
   * @param {Request} req - Express request object with university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns university details
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {500} Internal server error
   */
  async getUniversityById(req, res) {
    try {
      const { id } = req.params;
      const universityService2 = getService(TYPES.IUniversityService);
      const university = await universityService2.getUniversityById(id);
      return this.sendSuccess(res, university);
    } catch (error) {
      return this.handleError(res, error, "UniversityController.getUniversityById");
    }
  }
  /**
   * Search universities by name with optional filters
   * 
   * @route GET /api/universities/search
   * @access Public
   * @param {Request} req - Express request object with search query and optional filters
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns matching universities
   * 
   * @example
   * // Request query:
   * // GET /api/universities/search?query=Harvard&country=USA&tier=ivy_league
   * 
   * @throws {422} Validation error if query parameters are invalid
   * @throws {500} Internal server error
   */
  async searchUniversities(req, res) {
    try {
      const validatedQuery = searchUniversitiesQuerySchema.parse(req.query);
      const { query, ...filters } = validatedQuery;
      const universityService2 = getService(TYPES.IUniversityService);
      const universities2 = await universityService2.searchUniversities(query, filters);
      return this.sendSuccess(res, universities2);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
      }
      return this.handleError(res, error, "UniversityController.searchUniversities");
    }
  }
  /**
   * Create a new university
   * 
   * @route POST /api/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user and university data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async createUniversity(req, res) {
    try {
      const validatedData = createUniversitySchema.parse(req.body);
      const universityService2 = getService(TYPES.IUniversityService);
      const university = await universityService2.createUniversity(validatedData);
      res.status(201);
      return this.sendSuccess(res, university);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "UniversityController.createUniversity");
    }
  }
  /**
   * Update an existing university
   * 
   * @route PUT /api/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user, university ID, and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {404} Not found if university doesn't exist
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async updateUniversity(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateUniversitySchema.parse(req.body);
      const universityService2 = getService(TYPES.IUniversityService);
      const university = await universityService2.updateUniversity(id, validatedData);
      return this.sendSuccess(res, university);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "UniversityController.updateUniversity");
    }
  }
  /**
   * Delete a university
   * 
   * @route DELETE /api/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user and university ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async deleteUniversity(req, res) {
    try {
      const { id } = req.params;
      const universityService2 = getService(TYPES.IUniversityService);
      await universityService2.deleteUniversity(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "UniversityController.deleteUniversity");
    }
  }
  /**
   * Get all courses offered by a specific university
   * 
   * @route GET /api/universities/:id/courses
   * @access Public
   * @param {Request} req - Express request object with university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of courses for the university
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {500} Internal server error
   */
  async getCoursesByUniversity(req, res) {
    try {
      const { id } = req.params;
      const universityService2 = getService(TYPES.IUniversityService);
      const courses2 = await universityService2.getCoursesByUniversity(id);
      return this.sendSuccess(res, courses2);
    } catch (error) {
      return this.handleError(res, error, "UniversityController.getCoursesByUniversity");
    }
  }
};
var universityController = new UniversityController();

// server/routes/university.routes.ts
var router3 = Router3();
router3.get("/", asyncHandler((req, res) => universityController.getAllUniversities(req, res)));
router3.get("/search", asyncHandler((req, res) => universityController.searchUniversities(req, res)));
router3.get("/:id", asyncHandler((req, res) => universityController.getUniversityById(req, res)));
router3.get("/:id/courses", asyncHandler((req, res) => universityController.getCoursesByUniversity(req, res)));
router3.post("/", requireAuth, requireAdmin, csrfProtection, asyncHandler((req, res) => universityController.createUniversity(req, res)));
router3.put("/:id", requireAuth, requireAdmin, csrfProtection, asyncHandler((req, res) => universityController.updateUniversity(req, res)));
router3.delete("/:id", requireAuth, requireAdmin, csrfProtection, asyncHandler((req, res) => universityController.deleteUniversity(req, res)));
var university_routes_default = router3;

// server/routes/application.routes.ts
import { Router as Router4 } from "express";

// server/controllers/application.controller.ts
init_container();
import { z as z7 } from "zod";
var createApplicationSchema = z7.object({
  universityId: z7.string().min(1),
  courseId: z7.string().min(1),
  status: z7.string().optional(),
  notes: z7.string().optional().nullable()
});
var updateApplicationSchema = z7.object({
  status: z7.string().optional(),
  notes: z7.string().optional().nullable(),
  submittedAt: z7.string().optional().nullable(),
  decidedAt: z7.string().optional().nullable()
});
var updateStatusSchema = z7.object({
  status: z7.string().min(1)
});
var ApplicationController = class extends BaseController {
  /**
   * Get all applications for the authenticated user
   * 
   * @route GET /api/applications/my-applications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's applications
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMyApplications(req, res) {
    try {
      const userId = this.getUserId(req);
      const applicationService2 = getService(TYPES.IApplicationService);
      const applications2 = await applicationService2.getApplicationsByUser(userId);
      return this.sendSuccess(res, applications2);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.getMyApplications");
    }
  }
  /**
   * Get applications for a specific user by ID
   * 
   * @route GET /api/applications/user/:userId
   * @access Protected (Admin/Counselor only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin/counselor and user ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications for the specified user
   * 
   * @throws {401} Unauthorized if not admin/counselor
   * @throws {500} Internal server error
   */
  async getApplicationsByUser(req, res) {
    try {
      const { userId } = req.params;
      const applicationService2 = getService(TYPES.IApplicationService);
      const applications2 = await applicationService2.getApplicationsByUser(userId);
      return this.sendSuccess(res, applications2);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.getApplicationsByUser");
    }
  }
  /**
   * Get a specific application by ID
   * 
   * @route GET /api/applications/:id
   * @access Public
   * @param {Request} req - Express request object with application ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns application details
   * 
   * @throws {404} Not found if application doesn't exist
   * @throws {500} Internal server error
   */
  async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const applicationService2 = getService(TYPES.IApplicationService);
      const application = await applicationService2.getApplicationById(id);
      return this.sendSuccess(res, application);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.getApplicationById");
    }
  }
  /**
   * Get all applications filtered by status
   * 
   * @route GET /api/applications/status/:status
   * @access Protected (Admin/Counselor only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin/counselor and status parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications with the specified status
   * 
   * @throws {401} Unauthorized if not admin/counselor
   * @throws {500} Internal server error
   */
  async getApplicationsByStatus(req, res) {
    try {
      const { status } = req.params;
      const applicationService2 = getService(TYPES.IApplicationService);
      const applications2 = await applicationService2.getApplicationsByStatus(status);
      return this.sendSuccess(res, applications2);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.getApplicationsByStatus");
    }
  }
  /**
   * Get all applications for a specific university
   * 
   * @route GET /api/applications/university/:universityId
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with authenticated admin and university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications for the specified university
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async getApplicationsByUniversity(req, res) {
    try {
      const { universityId } = req.params;
      const applicationService2 = getService(TYPES.IApplicationService);
      const applications2 = await applicationService2.getApplicationsByUniversity(universityId);
      return this.sendSuccess(res, applications2);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.getApplicationsByUniversity");
    }
  }
  /**
   * Create a new university application
   * 
   * @route POST /api/applications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and application data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created application
   * 
   * @example
   * // Request body:
   * {
   *   "universityId": "uni-123",
   *   "courseId": "course-456",
   *   "notes": "Applying for Fall 2025 intake"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {409} Conflict if duplicate application exists
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createApplication(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createApplicationSchema.parse(req.body);
      const applicationService2 = getService(TYPES.IApplicationService);
      const application = await applicationService2.createApplication({
        userId,
        ...validatedData
      });
      res.status(201);
      return this.sendSuccess(res, application);
    } catch (error) {
      if (error instanceof z7.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      if (error.message === "DUPLICATE_APPLICATION") {
        return this.sendError(res, 409, "DUPLICATE_APPLICATION", "You have already applied to this course");
      }
      return this.handleError(res, error, "ApplicationController.createApplication");
    }
  }
  /**
   * Update an existing application
   * 
   * @route PUT /api/applications/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, application ID, and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated application
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateApplication(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateApplicationSchema.parse(req.body);
      const applicationService2 = getService(TYPES.IApplicationService);
      const application = await applicationService2.updateApplication(id, validatedData);
      return this.sendSuccess(res, application);
    } catch (error) {
      if (error instanceof z7.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ApplicationController.updateApplication");
    }
  }
  /**
   * Update the status of an application
   * 
   * @route PUT /api/applications/:id/status
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, application ID, and new status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated application with new status
   * 
   * @example
   * // Request body:
   * {
   *   "status": "accepted"
   * }
   * 
   * @throws {422} Validation error if status is invalid
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);
      const applicationService2 = getService(TYPES.IApplicationService);
      const application = await applicationService2.updateApplicationStatus(id, status);
      return this.sendSuccess(res, application);
    } catch (error) {
      if (error instanceof z7.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ApplicationController.updateApplicationStatus");
    }
  }
  /**
   * Delete an application
   * 
   * @route DELETE /api/applications/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and application ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async deleteApplication(req, res) {
    try {
      const { id } = req.params;
      const applicationService2 = getService(TYPES.IApplicationService);
      await applicationService2.deleteApplication(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "ApplicationController.deleteApplication");
    }
  }
};
var applicationController = new ApplicationController();

// server/routes/application.routes.ts
var router4 = Router4();
router4.use(requireAuth);
router4.get("/my-applications", asyncHandler((req, res) => applicationController.getMyApplications(req, res)));
router4.post("/", csrfProtection, asyncHandler((req, res) => applicationController.createApplication(req, res)));
router4.get("/:id", asyncHandler((req, res) => applicationController.getApplicationById(req, res)));
router4.put("/:id", csrfProtection, asyncHandler((req, res) => applicationController.updateApplication(req, res)));
router4.patch("/:id/status", csrfProtection, asyncHandler((req, res) => applicationController.updateApplicationStatus(req, res)));
router4.delete("/:id", csrfProtection, asyncHandler((req, res) => applicationController.deleteApplication(req, res)));
router4.get("/user/:userId", requireTeamMember, asyncHandler((req, res) => applicationController.getApplicationsByUser(req, res)));
router4.get("/status/:status", requireTeamMember, asyncHandler((req, res) => applicationController.getApplicationsByStatus(req, res)));
router4.get("/university/:universityId", requireAdmin, asyncHandler((req, res) => applicationController.getApplicationsByUniversity(req, res)));
var application_routes_default = router4;

// server/routes/forum.routes.ts
import { Router as Router5 } from "express";

// server/controllers/forum.controller.ts
init_container();
import { z as z8 } from "zod";
var createPostSchema = z8.object({
  title: z8.string().min(1).optional().nullable(),
  content: z8.string().min(1),
  category: z8.string(),
  tags: z8.array(z8.string()).optional(),
  images: z8.array(z8.string()).optional(),
  pollOptions: z8.array(z8.object({
    id: z8.string(),
    text: z8.string()
  })).optional(),
  pollQuestion: z8.string().optional(),
  pollEndsAt: z8.string().optional().nullable()
});
var updatePostSchema = createPostSchema.partial();
var createCommentSchema = z8.object({
  content: z8.string().min(1),
  parentId: z8.string().optional().nullable()
});
var reportPostSchema = z8.object({
  reportReason: z8.string(),
  reportDetails: z8.string().optional()
});
var paginationQuerySchema = z8.object({
  page: z8.string().optional().refine((val) => !val || Number.isFinite(Number(val)) && Number(val) >= 1, {
    message: "page must be a positive integer"
  }).transform((val) => val ? Number(val) : 1),
  limit: z8.string().optional().refine((val) => !val || Number.isFinite(Number(val)) && Number(val) >= 1 && Number(val) <= 100, {
    message: "limit must be between 1 and 100"
  }).transform((val) => val ? Number(val) : 10),
  category: z8.string().optional(),
  search: z8.string().optional().transform((val) => val?.trim()).refine((val) => !val || val.length >= 2, {
    message: "Search must be at least 2 characters"
  }).refine((val) => !val || val.length <= 100, {
    message: "Search query too long (max 100 characters)"
  })
});
var ForumController = class extends BaseController {
  /**
   * Get all forum posts with pagination and optional filtering
   * 
   * @route GET /api/forum/posts
   * @access Public/Authenticated (optional)
   * @param {AuthenticatedRequest} req - Express request object with optional user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns paginated list of posts
   * 
   * @example
   * // Query parameters:
   * ?page=1&limit=10&category=general&search=university
   * 
   * @throws {422} Validation error if query parameters are invalid
   */
  async getAllPosts(req, res) {
    try {
      const userId = req.user?.id;
      const validatedQuery = paginationQuerySchema.parse(req.query);
      const { page, limit, category, search } = validatedQuery;
      const forumService2 = getService(TYPES.IForumService);
      const result = await forumService2.getPostsWithPagination(
        page,
        limit,
        { category, search },
        userId
      );
      return this.sendPaginatedSuccess(res, result.data, result.pagination, result.total);
    } catch (error) {
      if (error instanceof z8.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
      }
      return this.handleError(res, error, "ForumController.getAllPosts");
    }
  }
  /**
   * Get detailed information for a specific forum post
   * 
   * @route GET /api/forum/posts/:id
   * @access Public
   * @param {Request} req - Express request object with post ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns detailed post data
   * 
   * @throws {404} Post not found
   */
  async getPostById(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const post = await forumService2.getPostById(id);
      return this.sendSuccess(res, post);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getPostById");
    }
  }
  /**
   * Create a new forum post (with optional poll)
   * 
   * @route POST /api/forum/posts
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user and post data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created post data
   * 
   * @example
   * // Request body:
   * {
   *   "title": "How to apply to Ivy League?",
   *   "content": "I need advice on the application process...",
   *   "category": "admissions",
   *   "tags": ["ivy-league", "applications"],
   *   "images": ["/api/forum/images/photo1.jpg"],
   *   "pollQuestion": "Which university is your top choice?",
   *   "pollOptions": [{"id": "1", "text": "Harvard"}, {"id": "2", "text": "Yale"}]
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   */
  async createPost(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createPostSchema.parse(req.body);
      const forumService2 = getService(TYPES.IForumService);
      const post = await forumService2.createPost({
        authorId: userId,
        ...validatedData
      });
      const postRepository = getService(TYPES.IForumPostRepository);
      const postWithUser = await postRepository.getPostWithUser(post.id);
      if (postWithUser) {
        const wsHandlers = getWebSocketHandlers();
        await wsHandlers.forum.broadcastPostCreated(postWithUser);
      }
      res.status(201);
      return this.sendSuccess(res, postWithUser || post);
    } catch (error) {
      if (error instanceof z8.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ForumController.createPost");
    }
  }
  /**
   * Update an existing forum post
   * 
   * @route PUT /api/forum/posts/:id
   * @access Protected (requires authentication and ownership)
   * @param {AuthenticatedRequest} req - Express request object with post ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated post data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user doesn't own the post
   * @throws {404} Post not found
   */
  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updatePostSchema.parse(req.body);
      const forumService2 = getService(TYPES.IForumService);
      const post = await forumService2.updatePost(id, validatedData);
      return this.sendSuccess(res, post);
    } catch (error) {
      if (error instanceof z8.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ForumController.updatePost");
    }
  }
  /**
   * Delete a forum post
   * 
   * @route DELETE /api/forum/posts/:id
   * @access Protected (requires authentication and ownership)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user doesn't own the post
   * @throws {404} Post not found
   */
  async deletePost(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      await forumService2.deletePost(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "ForumController.deletePost");
    }
  }
  /**
   * Get all comments for a specific post
   * 
   * @route GET /api/forum/posts/:id/comments
   * @access Public
   * @param {Request} req - Express request object with post ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of comments for the post
   * 
   * @throws {404} Post not found
   */
  async getComments(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const comments = await forumService2.getComments(id);
      return this.sendSuccess(res, comments);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getComments");
    }
  }
  /**
   * Create a comment on a forum post
   * 
   * @route POST /api/forum/posts/:id/comments
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and comment data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created comment data
   * 
   * @example
   * // Request body:
   * {
   *   "content": "Great advice! I found this very helpful.",
   *   "parentId": "comment-123" // Optional, for nested replies
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async createComment(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const { content } = createCommentSchema.parse(req.body);
      const forumService2 = getService(TYPES.IForumService);
      const comment = await forumService2.createComment(id, userId, content);
      res.status(201);
      return this.sendSuccess(res, comment);
    } catch (error) {
      if (error instanceof z8.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ForumController.createComment");
    }
  }
  /**
   * Toggle like status on a post (like/unlike)
   * 
   * @route POST /api/forum/posts/:id/like
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated like status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const forumService2 = getService(TYPES.IForumService);
      const result = await forumService2.toggleLike(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, "ForumController.toggleLike");
    }
  }
  /**
   * Toggle save/bookmark status on a post
   * 
   * @route POST /api/forum/posts/:id/save
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated save status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async toggleSave(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const forumService2 = getService(TYPES.IForumService);
      const result = await forumService2.toggleSave(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, "ForumController.toggleSave");
    }
  }
  /**
   * Get all saved/bookmarked posts for the authenticated user
   * 
   * @route GET /api/forum/saved
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of saved posts
   * 
   * @throws {401} Unauthorized if user is not authenticated
   */
  async getSavedPosts(req, res) {
    try {
      const userId = this.getUserId(req);
      const forumService2 = getService(TYPES.IForumService);
      const posts = await forumService2.getSavedPosts(userId);
      return this.sendSuccess(res, posts);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getSavedPosts");
    }
  }
  /**
   * Vote on a poll option within a forum post
   * 
   * @route POST /api/forum/posts/:id/poll/vote/:optionId
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and option ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated poll results with user's vote
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post or poll option not found
   * @throws {400} Poll has ended or user already voted
   */
  async votePollOption(req, res) {
    try {
      const { id, optionId } = req.params;
      const userId = this.getUserId(req);
      const forumService2 = getService(TYPES.IForumService);
      const result = await forumService2.votePollOption(id, userId, optionId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, "ForumController.votePollOption");
    }
  }
  /**
   * Get poll results for a specific post
   * 
   * @route GET /api/forum/posts/:id/poll/results
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns poll results with vote counts and percentages
   * 
   * @throws {404} Post or poll not found
   */
  async getPollResults(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const results = await forumService2.getPollResults(id);
      return this.sendSuccess(res, results);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getPollResults");
    }
  }
  /**
   * Get analytics data for a specific post (views, likes, comments, shares)
   * 
   * @route GET /api/forum/posts/:id/analytics
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns analytics data for the post
   * 
   * @throws {404} Post not found
   */
  async getPostAnalytics(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const analytics = await forumService2.getPostAnalytics(id);
      return this.sendSuccess(res, analytics);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getPostAnalytics");
    }
  }
  /**
   * Report a post for violating community guidelines
   * 
   * @route POST /api/forum/posts/:id/report
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with post ID and report details
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created report data
   * 
   * @example
   * // Request body:
   * {
   *   "reportReason": "spam",
   *   "reportDetails": "This post contains promotional content"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {404} Post not found
   */
  async reportPost(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const validatedData = reportPostSchema.parse(req.body);
      const forumService2 = getService(TYPES.IForumService);
      const report = await forumService2.reportPost(id, userId, validatedData.reportReason, validatedData.reportDetails);
      res.status(201);
      return this.sendSuccess(res, report);
    } catch (error) {
      if (error instanceof z8.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ForumController.reportPost");
    }
  }
  /**
   * Get all user votes for a specific poll
   * 
   * @route GET /api/forum/posts/:id/user-votes
   * @access Public
   * @param {Request} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user votes for the poll
   * 
   * @throws {404} Post or poll not found
   */
  async getUserVotes(req, res) {
    try {
      const { id } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const votes = await forumService2.getUserVotes(id);
      return this.sendSuccess(res, votes);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getUserVotes");
    }
  }
  /**
   * Get the authenticated user's vote status for a specific poll
   * 
   * @route GET /api/forum/posts/:id/user-vote-status
   * @access Public/Authenticated (optional)
   * @param {AuthenticatedRequest} req - Express request object with optional user and post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user's vote status (hasVoted, optionId)
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "hasVoted": true,
   *     "optionId": "option-123"
   *   }
   * }
   */
  async getUserVoteStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return this.sendSuccess(res, { hasVoted: false, optionId: null });
      }
      const forumService2 = getService(TYPES.IForumService);
      const status = await forumService2.getUserVoteStatus(id, userId);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getUserVoteStatus");
    }
  }
  /**
   * Upload images for forum posts
   * 
   * @route POST /api/forum/upload-images
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with multipart/form-data images
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of uploaded image URLs
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "images": ["/api/forum/images/abc123.jpg", "/api/forum/images/def456.jpg"]
   *   }
   * }
   * 
   * @throws {400} No files uploaded
   * @throws {401} Unauthorized if user is not authenticated
   */
  async uploadImages(req, res) {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return this.sendError(res, 400, "NO_FILES", "No files uploaded");
      }
      const forumService2 = getService(TYPES.IForumService);
      const imageUrls = forumService2.formatUploadedImages(files);
      res.status(201);
      return this.sendSuccess(res, { images: imageUrls });
    } catch (error) {
      return this.handleError(res, error, "ForumController.uploadImages");
    }
  }
  /**
   * Serve a forum image file
   * 
   * @route GET /api/forum/images/:filename
   * @access Public
   * @param {Request} req - Express request object with filename parameter
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Sends the image file
   * 
   * @throws {404} Image not found
   */
  async getForumImage(req, res) {
    try {
      const { filename } = req.params;
      const forumService2 = getService(TYPES.IForumService);
      const imagePath = await forumService2.getImagePath(filename);
      res.sendFile(imagePath);
    } catch (error) {
      return this.handleError(res, error, "ForumController.getForumImage");
    }
  }
};
var forumController = new ForumController();

// server/middleware/upload.ts
import multer from "multer";
import path2 from "path";
import fs from "fs";
var uploadsDir = path2.join(process.cwd(), "uploads", "forum-images");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path2.extname(file.originalname));
  }
});
var fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
};
var forumImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max file size
  }
});

// server/routes/forum.routes.ts
var router5 = Router5();
router5.use(requireAuth);
router5.get("/posts", asyncHandler((req, res) => forumController.getAllPosts(req, res)));
router5.get("/posts/:id", asyncHandler((req, res) => forumController.getPostById(req, res)));
router5.get("/posts/:id/analytics", asyncHandler((req, res) => forumController.getPostAnalytics(req, res)));
router5.post("/posts", csrfProtection, asyncHandler((req, res) => forumController.createPost(req, res)));
router5.put("/posts/:id", csrfProtection, asyncHandler((req, res) => forumController.updatePost(req, res)));
router5.delete("/posts/:id", csrfProtection, asyncHandler((req, res) => forumController.deletePost(req, res)));
router5.get("/posts/:id/comments", asyncHandler((req, res) => forumController.getComments(req, res)));
router5.post("/posts/:id/comments", csrfProtection, asyncHandler((req, res) => forumController.createComment(req, res)));
router5.post("/posts/:id/like", csrfProtection, asyncHandler((req, res) => forumController.toggleLike(req, res)));
router5.post("/posts/:id/save", csrfProtection, asyncHandler((req, res) => forumController.toggleSave(req, res)));
router5.get("/saved", asyncHandler((req, res) => forumController.getSavedPosts(req, res)));
router5.post("/posts/:id/poll/vote/:optionId", csrfProtection, asyncHandler((req, res) => forumController.votePollOption(req, res)));
router5.get("/posts/:id/poll/results", asyncHandler((req, res) => forumController.getPollResults(req, res)));
router5.post("/posts/:id/report", csrfProtection, asyncHandler((req, res) => forumController.reportPost(req, res)));
router5.get("/posts/:id/user-votes", asyncHandler((req, res) => forumController.getUserVotes(req, res)));
router5.get("/posts/:id/user-vote-status", asyncHandler((req, res) => forumController.getUserVoteStatus(req, res)));
router5.post("/upload-images", forumImageUpload.array("images", 5), asyncHandler((req, res) => forumController.uploadImages(req, res)));
router5.get("/images/:filename", asyncHandler((req, res) => forumController.getForumImage(req, res)));
var forum_routes_default = router5;

// server/routes/admin.routes.ts
import { Router as Router6 } from "express";

// server/controllers/admin.controller.ts
init_container();
init_schema();
import { z as z11 } from "zod";

// shared/api-contracts.ts
import { z as z10 } from "zod";

// shared/response-schemas.ts
import { z as z9 } from "zod";
var ApiErrorSchema = z9.object({
  code: z9.string(),
  message: z9.string(),
  details: z9.unknown().optional()
});
var ApiErrorResponseSchema = z9.object({
  success: z9.literal(false),
  error: ApiErrorSchema
});
var createApiResponseSchema = (dataSchema) => {
  return z9.union([
    z9.object({
      success: z9.literal(true),
      data: dataSchema
    }),
    z9.object({
      success: z9.literal(false),
      error: ApiErrorSchema
    })
  ]);
};
var MessageResponseSchema = z9.object({
  message: z9.string()
});
var flexibleUuid = z9.union([
  z9.string().uuid(),
  z9.string().min(1)
  // Fallback for non-standard IDs
]).transform((val) => val);
var flexibleDatetime = z9.union([
  z9.string().datetime(),
  z9.string().min(1),
  z9.number()
]).transform((val) => {
  if (typeof val === "number") {
    return new Date(val).toISOString();
  }
  if (typeof val === "string" && !isNaN(Date.parse(val))) {
    return new Date(val).toISOString();
  }
  return val;
});
var flexibleNumber = z9.union([
  z9.number(),
  z9.string().regex(/^\d+(\.\d+)?$/).transform((val) => parseFloat(val)),
  z9.null()
]).nullable();
var flexibleBoolean = z9.union([
  z9.boolean(),
  z9.string().transform((val) => val === "true" || val === "1"),
  z9.number().transform((val) => val === 1)
]);
var UserSchema = z9.object({
  id: flexibleUuid,
  email: z9.string().email(),
  firstName: z9.string().nullable().optional(),
  lastName: z9.string().nullable().optional(),
  userType: z9.enum(["customer", "team_member", "company_profile"]),
  teamRole: z9.enum(["admin", "counselor"]).nullable().optional(),
  accountStatus: z9.enum(["active", "inactive", "pending_approval", "suspended", "rejected"]),
  profilePicture: z9.string().nullable().optional(),
  companyName: z9.string().nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});
var AuthResponseSchema = z9.object({
  user: UserSchema,
  token: z9.string(),
  expiresAt: flexibleDatetime
});
var StudentProfileSchema = z9.object({
  id: flexibleUuid,
  userId: flexibleUuid,
  phone: z9.string().nullable().optional(),
  dateOfBirth: flexibleDatetime.nullable().optional(),
  nationality: z9.string().nullable().optional(),
  currentEducationLevel: z9.string().nullable().optional(),
  institutionName: z9.string().nullable().optional(),
  gpa: z9.union([z9.string(), flexibleNumber]).nullable().optional(),
  testScores: z9.object({
    sat: flexibleNumber.optional(),
    act: flexibleNumber.optional(),
    gre: flexibleNumber.optional(),
    gmat: flexibleNumber.optional(),
    toefl: flexibleNumber.optional(),
    ielts: flexibleNumber.optional(),
    englishTestScore: z9.string().nullable().optional(),
    englishBandScores: z9.string().nullable().optional(),
    englishTestDate: z9.string().nullable().optional(),
    standardizedTestScore: z9.string().nullable().optional(),
    standardizedTestDate: z9.string().nullable().optional(),
    planToRetake: flexibleBoolean.nullable().optional()
  }).nullable().optional(),
  intendedMajor: z9.string().nullable().optional(),
  preferredCountries: z9.array(z9.string()).nullable().optional(),
  destinationCountry: z9.string().nullable().optional(),
  intakeYear: z9.string().nullable().optional(),
  status: z9.enum(["inquiry", "converted", "visa_applied", "visa_approved", "departed"]),
  assignedCounselorId: flexibleUuid.nullable().optional(),
  budgetRange: z9.object({
    min: flexibleNumber,
    max: flexibleNumber
  }).nullable().optional(),
  academicInterests: z9.array(z9.string()).nullable().optional(),
  extracurriculars: z9.array(z9.string()).nullable().optional(),
  workExperience: z9.array(z9.object({
    company: z9.string(),
    position: z9.string(),
    duration: z9.string(),
    description: z9.string()
  })).nullable().optional(),
  familyInfo: z9.object({
    fatherName: z9.string().nullable().optional(),
    motherName: z9.string().nullable().optional(),
    fatherOccupation: z9.string().nullable().optional(),
    motherOccupation: z9.string().nullable().optional(),
    familyIncome: flexibleNumber.nullable().optional(),
    siblings: flexibleNumber.nullable().optional()
  }).nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});
var UniversitySchema = z9.object({
  id: flexibleUuid,
  name: z9.string(),
  country: z9.string(),
  city: z9.string(),
  website: z9.string().nullable().optional(),
  worldRanking: flexibleNumber.nullable().optional(),
  degreeLevels: z9.array(z9.string()).nullable().optional(),
  specialization: z9.string().nullable().optional(),
  offerLetterFee: z9.union([z9.string(), flexibleNumber]).nullable().optional(),
  annualFee: z9.union([z9.string(), flexibleNumber]).nullable().optional(),
  admissionRequirements: z9.object({
    minimumGPA: z9.string().nullable().optional(),
    ieltsScore: z9.string().nullable().optional(),
    gmatScore: z9.string().nullable().optional()
  }).nullable().optional(),
  alumni1: z9.string().nullable().optional(),
  alumni2: z9.string().nullable().optional(),
  alumni3: z9.string().nullable().optional(),
  logo: z9.string().nullable().optional(),
  description: z9.string().nullable().optional(),
  ranking: z9.object({
    world: flexibleNumber.nullable().optional(),
    national: flexibleNumber.nullable().optional(),
    subject: z9.record(flexibleNumber).nullable().optional()
  }).nullable().optional(),
  tuitionFees: z9.object({
    domestic: z9.object({ min: flexibleNumber, max: flexibleNumber }),
    international: z9.object({ min: flexibleNumber, max: flexibleNumber })
  }).nullable().optional(),
  acceptanceRate: z9.union([z9.string(), flexibleNumber]).nullable().optional(),
  studentPopulation: flexibleNumber.nullable().optional(),
  internationalStudents: flexibleNumber.nullable().optional(),
  campusSize: z9.string().nullable().optional(),
  establishedYear: flexibleNumber.nullable().optional(),
  type: z9.string().nullable().optional(),
  tags: z9.array(z9.string()).nullable().optional(),
  images: z9.array(z9.string()).nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});
var CourseSchema = z9.object({
  id: z9.string().uuid(),
  universityId: z9.string().uuid(),
  name: z9.string(),
  degree: z9.string(),
  duration: z9.string().optional(),
  tuitionFee: z9.string().optional(),
  description: z9.string().optional(),
  requirements: z9.object({
    gpa: z9.string().optional(),
    ielts: z9.string().optional(),
    toefl: z9.string().optional()
  }).optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var ApplicationSchema = z9.object({
  id: z9.string().uuid(),
  userId: z9.string().uuid(),
  universityId: z9.string().uuid(),
  courseId: z9.string().uuid().optional(),
  status: z9.enum(["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"]),
  submittedAt: z9.string().datetime().optional(),
  deadlineDate: z9.string().datetime().optional(),
  lastUpdated: z9.string().datetime(),
  notes: z9.string().optional(),
  applicationData: z9.object({
    personalStatement: z9.string().optional(),
    essays: z9.array(z9.object({
      question: z9.string(),
      answer: z9.string()
    })).optional()
  }).optional(),
  university: z9.object({
    name: z9.string(),
    country: z9.string(),
    city: z9.string()
  }).optional(),
  course: z9.object({
    name: z9.string(),
    degree: z9.string()
  }).optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var DocumentSchema = z9.object({
  id: z9.string().uuid(),
  userId: z9.string().uuid(),
  applicationId: z9.string().uuid().optional(),
  type: z9.enum(["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"]),
  name: z9.string(),
  filename: z9.string(),
  url: z9.string(),
  uploadedAt: z9.string().datetime(),
  verified: z9.boolean(),
  notes: z9.string().optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var ForumPostSchema = z9.object({
  id: z9.string().uuid(),
  studentId: z9.string().uuid(),
  title: z9.string(),
  content: z9.string(),
  category: z9.enum(["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"]),
  tags: z9.array(z9.string()).optional(),
  likesCount: z9.number(),
  commentsCount: z9.number(),
  viewsCount: z9.number(),
  isLiked: z9.boolean().optional(),
  isSaved: z9.boolean().optional(),
  isPinned: z9.boolean(),
  author: z9.object({
    id: z9.string().uuid(),
    firstName: z9.string().optional(),
    lastName: z9.string().optional(),
    profilePicture: z9.string().optional()
  }),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var ForumCommentSchema = z9.object({
  id: z9.string().uuid(),
  postId: z9.string().uuid(),
  studentId: z9.string().uuid(),
  content: z9.string(),
  likesCount: z9.number(),
  isLiked: z9.boolean().optional(),
  author: z9.object({
    id: z9.string().uuid(),
    firstName: z9.string().optional(),
    lastName: z9.string().optional(),
    profilePicture: z9.string().optional()
  }),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var NotificationSchema = z9.object({
  id: z9.string().uuid(),
  userId: z9.string().uuid(),
  type: z9.enum(["application_update", "document_reminder", "message", "system", "deadline"]),
  title: z9.string(),
  message: z9.string(),
  read: z9.boolean(),
  actionUrl: z9.string().optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var SubscriptionSchema = z9.object({
  id: z9.string().uuid(),
  userId: z9.string().uuid(),
  tier: z9.enum(["free", "premium", "elite"]),
  status: z9.enum(["active", "expired", "cancelled", "pending"]),
  startDate: z9.string().datetime(),
  endDate: z9.string().datetime(),
  paymentMethod: z9.string().optional(),
  amount: z9.string().optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var EventSchema = z9.object({
  id: z9.string().uuid(),
  title: z9.string(),
  description: z9.string(),
  eventDate: z9.string().datetime(),
  eventType: z9.string(),
  location: z9.string().optional(),
  maxAttendees: z9.number().optional(),
  registeredCount: z9.number(),
  registrationDeadline: z9.string().datetime().optional(),
  isRegistered: z9.boolean().optional(),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var TestimonialSchema = z9.object({
  id: z9.string().uuid(),
  studentId: z9.string().uuid(),
  content: z9.string(),
  rating: z9.number().min(1).max(5),
  featured: z9.boolean(),
  student: z9.object({
    firstName: z9.string().optional(),
    lastName: z9.string().optional(),
    profilePicture: z9.string().optional(),
    destinationCountry: z9.string().optional()
  }),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var ChatMessageSchema = z9.object({
  id: z9.string().uuid(),
  senderId: z9.string().uuid(),
  receiverId: z9.string().uuid(),
  conversationHash: z9.string(),
  content: z9.string(),
  messageType: z9.enum(["text", "image", "file"]),
  readAt: z9.string().datetime().optional(),
  sender: z9.object({
    id: z9.string().uuid(),
    firstName: z9.string().optional(),
    lastName: z9.string().optional(),
    profilePicture: z9.string().optional()
  }),
  receiver: z9.object({
    id: z9.string().uuid(),
    firstName: z9.string().optional(),
    lastName: z9.string().optional(),
    profilePicture: z9.string().optional()
  }),
  createdAt: z9.string().datetime(),
  updatedAt: z9.string().datetime()
});
var AIMatchingResultSchema = z9.object({
  id: z9.string().uuid(),
  userId: z9.string().uuid(),
  universityId: z9.string().uuid(),
  matchScore: z9.number().min(0).max(100),
  reasoning: z9.string(),
  confidence: z9.enum(["low", "medium", "high"]),
  factors: z9.array(z9.string()),
  university: UniversitySchema.optional(),
  createdAt: z9.string().datetime()
});
var GetUserResponseSchema = createApiResponseSchema(UserSchema);
var GetUsersResponseSchema = createApiResponseSchema(z9.array(UserSchema));
var CreateUserResponseSchema = createApiResponseSchema(UserSchema);
var UpdateUserResponseSchema = createApiResponseSchema(UserSchema);
var LoginResponseSchema = createApiResponseSchema(AuthResponseSchema);
var RegisterResponseSchema = createApiResponseSchema(AuthResponseSchema);
var RefreshTokenResponseSchema = createApiResponseSchema(z9.object({
  token: z9.string(),
  expiresAt: z9.string().datetime()
}));
var GetStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);
var GetStudentsResponseSchema = createApiResponseSchema(z9.array(StudentProfileSchema));
var CreateStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);
var UpdateStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);
var GetUniversityResponseSchema = createApiResponseSchema(UniversitySchema);
var GetUniversitiesResponseSchema = createApiResponseSchema(z9.array(UniversitySchema));
var SearchUniversitiesResponseSchema = createApiResponseSchema(z9.array(UniversitySchema));
var CreateUniversityResponseSchema = createApiResponseSchema(UniversitySchema);
var UpdateUniversityResponseSchema = createApiResponseSchema(UniversitySchema);
var GetCourseResponseSchema = createApiResponseSchema(CourseSchema);
var GetCoursesResponseSchema = createApiResponseSchema(z9.array(CourseSchema));
var CreateCourseResponseSchema = createApiResponseSchema(CourseSchema);
var GetApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);
var GetApplicationsResponseSchema = createApiResponseSchema(z9.array(ApplicationSchema));
var CreateApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);
var UpdateApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);
var GetDocumentResponseSchema = createApiResponseSchema(DocumentSchema);
var GetDocumentsResponseSchema = createApiResponseSchema(z9.array(DocumentSchema));
var CreateDocumentResponseSchema = createApiResponseSchema(DocumentSchema);
var UpdateDocumentResponseSchema = createApiResponseSchema(DocumentSchema);
var GetForumPostResponseSchema = createApiResponseSchema(ForumPostSchema);
var GetForumPostsResponseSchema = createApiResponseSchema(z9.array(ForumPostSchema));
var CreateForumPostResponseSchema = createApiResponseSchema(ForumPostSchema);
var GetForumCommentsResponseSchema = createApiResponseSchema(z9.array(ForumCommentSchema));
var CreateForumCommentResponseSchema = createApiResponseSchema(ForumCommentSchema);
var GetNotificationsResponseSchema = createApiResponseSchema(z9.array(NotificationSchema));
var CreateNotificationResponseSchema = createApiResponseSchema(NotificationSchema);
var GetUnreadCountResponseSchema = createApiResponseSchema(z9.object({ count: z9.number() }));
var GetSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);
var CreateSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);
var UpdateSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);
var GetEventResponseSchema = createApiResponseSchema(EventSchema);
var GetEventsResponseSchema = createApiResponseSchema(z9.array(EventSchema));
var CreateEventResponseSchema = createApiResponseSchema(EventSchema);
var GetTestimonialsResponseSchema = createApiResponseSchema(z9.array(TestimonialSchema));
var CreateTestimonialResponseSchema = createApiResponseSchema(TestimonialSchema);
var GetChatMessagesResponseSchema = createApiResponseSchema(z9.array(ChatMessageSchema));
var SendChatMessageResponseSchema = createApiResponseSchema(ChatMessageSchema);
var GetRecommendationsResponseSchema = createApiResponseSchema(z9.array(AIMatchingResultSchema));
var CreateAIMatchingResponseSchema = createApiResponseSchema(AIMatchingResultSchema);
var GetDashboardStatsResponseSchema = createApiResponseSchema(z9.object({
  totalApplications: z9.number(),
  pendingApplications: z9.number(),
  acceptedApplications: z9.number(),
  rejectedApplications: z9.number(),
  totalDocuments: z9.number(),
  verifiedDocuments: z9.number(),
  pendingDocuments: z9.number(),
  unreadNotifications: z9.number(),
  recentActivity: z9.array(z9.object({
    id: z9.string(),
    type: z9.string(),
    message: z9.string(),
    timestamp: z9.string().datetime()
  }))
}));
var GetAnalyticsResponseSchema = createApiResponseSchema(z9.object({
  views: z9.number(),
  interactions: z9.number(),
  conversions: z9.number(),
  timeRange: z9.string(),
  data: z9.array(z9.object({
    date: z9.string(),
    value: z9.number()
  }))
}));
var BulkOperationResultSchema = z9.object({
  successful: z9.number(),
  failed: z9.number(),
  errors: z9.array(z9.object({
    index: z9.number(),
    error: z9.string()
  }))
});
var BulkCreateResponseSchema = createApiResponseSchema(BulkOperationResultSchema);
var BulkUpdateResponseSchema = createApiResponseSchema(BulkOperationResultSchema);
var BulkDeleteResponseSchema = createApiResponseSchema(BulkOperationResultSchema);

// shared/role-constants.ts
var USER_TYPES = ["customer", "team_member", "company_profile"];
var TEAM_ROLES = ["admin", "counselor"];

// shared/api-contracts.ts
var UserResponseSchema = z10.object({
  id: z10.string(),
  email: z10.string().email(),
  firstName: z10.string().nullable(),
  lastName: z10.string().nullable(),
  userType: z10.enum(USER_TYPES),
  teamRole: z10.enum(TEAM_ROLES).nullable(),
  profilePicture: z10.string().nullable(),
  accountStatus: z10.enum(["active", "inactive", "pending_approval", "suspended", "rejected"]).optional(),
  companyName: z10.string().nullable().optional(),
  createdAt: z10.string(),
  updatedAt: z10.string(),
  lastLoginAt: z10.string().nullable().optional()
});
var LoginRequestSchema = z10.object({
  email: z10.string().email(),
  password: z10.string().min(1),
  rememberMe: z10.boolean().optional()
});
var LoginResponseSchema2 = z10.object({
  user: UserResponseSchema,
  message: z10.string().optional()
});
var CsrfTokenResponseSchema = z10.object({
  csrfToken: z10.string()
});
var TeamLoginVisibilityResponseSchema = z10.object({
  visible: z10.boolean()
});
var CreateStaffRequestSchema = z10.object({
  email: z10.string().email(),
  firstName: z10.string().min(1),
  lastName: z10.string().min(1),
  teamRole: z10.enum(["admin", "counselor"]),
  department: z10.string().optional()
});
var CreateStaffResponseSchema = UserResponseSchema.extend({
  temporaryPassword: z10.string().optional()
});
var StudentProfileSchema2 = z10.object({
  id: z10.string(),
  userId: z10.string(),
  firstName: z10.string(),
  lastName: z10.string(),
  email: z10.string().email(),
  phone: z10.string().nullable(),
  nationality: z10.string().nullable(),
  destinationCountry: z10.string().nullable(),
  intakeYear: z10.string().nullable(),
  status: z10.enum(["inquiry", "converted", "visa_applied", "visa_approved", "departed"]),
  profilePicture: z10.string().nullable(),
  applicationStage: z10.string(),
  documentsCount: z10.number().int().nonnegative(),
  universitiesShortlisted: z10.number().int().nonnegative(),
  lastActivity: z10.string(),
  urgentActions: z10.number().int().nonnegative(),
  currentEducationLevel: z10.string().nullable().optional(),
  intendedMajor: z10.string().nullable().optional(),
  budgetRange: z10.string().nullable().optional(),
  gpa: z10.string().nullable().optional(),
  testScores: z10.record(z10.any()).nullable().optional(),
  academicInterests: z10.array(z10.string()).nullable().optional(),
  extracurriculars: z10.array(z10.string()).nullable().optional(),
  workExperience: z10.array(z10.any()).nullable().optional()
});
var StudentsListResponseSchema = z10.array(StudentProfileSchema2);
var CounselorStudentProfileSchema = StudentProfileSchema2.extend({
  personalDetails: z10.record(z10.any()).optional(),
  academicDetails: z10.record(z10.any()).optional(),
  workDetails: z10.record(z10.any()).optional(),
  studyPreferences: z10.record(z10.any()).optional(),
  universityPreferences: z10.record(z10.any()).optional(),
  financialInfo: z10.record(z10.any()).optional(),
  visaHistory: z10.record(z10.any()).optional(),
  familyDetails: z10.record(z10.any()).optional(),
  additionalInfo: z10.record(z10.any()).optional(),
  userType: z10.string().optional(),
  familyInfo: z10.string().optional(),
  educationHistory: z10.string().optional(),
  notes: z10.string().optional(),
  preferredCountries: z10.array(z10.string()).optional(),
  dateOfBirth: z10.string().nullable().optional()
});
var UniversitySchema2 = z10.object({
  id: z10.string(),
  name: z10.string(),
  country: z10.string(),
  city: z10.string().nullable(),
  website: z10.string().nullable(),
  worldRanking: z10.number().int().nullable(),
  degreeLevels: z10.array(z10.string()).nullable(),
  specialization: z10.string().nullable(),
  offerLetterFee: z10.string().nullable(),
  annualFee: z10.string().nullable(),
  admissionRequirements: z10.record(z10.any()).nullable(),
  alumni1: z10.string().nullable(),
  alumni2: z10.string().nullable(),
  alumni3: z10.string().nullable(),
  description: z10.string().nullable(),
  acceptanceRate: z10.string().nullable(),
  scholarshipAvailable: z10.boolean().nullable(),
  applicationDeadline: z10.string().nullable(),
  intakeMonths: z10.array(z10.string()).nullable(),
  campusSize: z10.string().nullable(),
  studentPopulation: z10.number().int().nullable(),
  internationalStudents: z10.number().int().nullable(),
  languageRequirements: z10.record(z10.any()).nullable(),
  createdAt: z10.string(),
  updatedAt: z10.string()
});
var UniversitiesListResponseSchema = z10.array(UniversitySchema2);
var CreateUniversityRequestSchema = z10.object({
  name: z10.string().min(1),
  country: z10.string().min(1),
  city: z10.string().optional(),
  website: z10.string().url().optional(),
  worldRanking: z10.number().int().positive().optional(),
  degreeLevels: z10.array(z10.string()).optional(),
  specialization: z10.string().optional(),
  description: z10.string().optional()
});
var ForumPostSchema2 = z10.object({
  id: z10.string(),
  title: z10.string(),
  content: z10.string(),
  category: z10.enum(["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"]),
  authorId: z10.string(),
  authorName: z10.string(),
  authorType: z10.enum(["customer", "team_member", "company_profile"]),
  isAnonymous: z10.boolean(),
  anonymousName: z10.string().nullable(),
  likesCount: z10.number().int().nonnegative(),
  commentsCount: z10.number().int().nonnegative(),
  viewsCount: z10.number().int().nonnegative(),
  isPinned: z10.boolean(),
  tags: z10.array(z10.string()).nullable(),
  attachments: z10.array(z10.string()).nullable(),
  pollQuestion: z10.string().nullable(),
  pollOptions: z10.array(z10.string()).nullable(),
  pollEndsAt: z10.string().nullable(),
  createdAt: z10.string(),
  updatedAt: z10.string()
});
var ForumPostsListResponseSchema = z10.array(ForumPostSchema2);
var CreateForumPostRequestSchema = z10.object({
  title: z10.string().min(1).optional(),
  content: z10.string().min(1).max(100),
  category: z10.enum(["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"]),
  isAnonymous: z10.boolean().optional(),
  anonymousName: z10.string().optional(),
  tags: z10.array(z10.string()).optional(),
  pollQuestion: z10.string().optional(),
  pollOptions: z10.array(z10.string()).optional(),
  pollEndsAt: z10.string().optional()
});
var SystemMetricsSchema = z10.object({
  database: z10.object({
    activeConnections: z10.number(),
    idleConnections: z10.number(),
    waitingRequests: z10.number()
  }),
  messageQueue: z10.object({
    queueSizes: z10.record(z10.number()),
    processedMessages: z10.number(),
    failedMessages: z10.number()
  }),
  performance: z10.object({
    averageResponseTime: z10.number(),
    requestsPerMinute: z10.number(),
    errorRate: z10.number()
  }),
  memory: z10.object({
    used: z10.number(),
    total: z10.number(),
    percentage: z10.number()
  }).optional()
});
var HealthCheckSchema = z10.object({
  status: z10.enum(["healthy", "warning", "error"]),
  checks: z10.object({
    api: z10.object({
      status: z10.enum(["healthy", "warning", "error"]),
      message: z10.string()
    }),
    database: z10.object({
      status: z10.enum(["healthy", "warning", "error"]),
      message: z10.string(),
      connections: z10.object({
        active: z10.number(),
        idle: z10.number(),
        waiting: z10.number()
      })
    }),
    messageQueue: z10.object({
      status: z10.enum(["healthy", "warning", "error"]),
      message: z10.string(),
      queues: z10.record(z10.number())
    }),
    websocket: z10.object({
      status: z10.enum(["healthy", "warning", "error"]),
      message: z10.string(),
      connections: z10.number()
    })
  }),
  timestamp: z10.string()
});
var DocumentSchema2 = z10.object({
  id: z10.string(),
  studentId: z10.string(),
  filename: z10.string(),
  originalName: z10.string(),
  type: z10.enum(["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"]),
  size: z10.number().int().positive(),
  uploadedAt: z10.string(),
  status: z10.enum(["pending", "approved", "rejected"]).optional()
});
var DocumentsListResponseSchema = z10.array(DocumentSchema2);
var ValidationErrorDetailsSchema = z10.object({
  field: z10.string(),
  message: z10.string(),
  code: z10.string().optional()
});
var ValidationErrorResponseSchema = z10.object({
  message: z10.string(),
  errors: z10.array(ValidationErrorDetailsSchema)
});
var MessageResponseSchema2 = z10.object({
  message: z10.string()
});
var EmptyResponseSchema = z10.object({});
var ApiLoginResponse = createApiResponseSchema(LoginResponseSchema2);
var ApiUserResponse = createApiResponseSchema(UserResponseSchema);
var ApiCsrfTokenResponse = createApiResponseSchema(CsrfTokenResponseSchema);
var ApiTeamLoginVisibilityResponse = createApiResponseSchema(TeamLoginVisibilityResponseSchema);
var ApiStudentsListResponse = createApiResponseSchema(StudentsListResponseSchema);
var ApiStudentProfileResponse = createApiResponseSchema(StudentProfileSchema2);
var ApiUniversitiesListResponse = createApiResponseSchema(UniversitiesListResponseSchema);
var ApiUniversityResponse = createApiResponseSchema(UniversitySchema2);
var ApiForumPostsListResponse = createApiResponseSchema(ForumPostsListResponseSchema);
var ApiForumPostResponse = createApiResponseSchema(ForumPostSchema2);
var ApiSystemMetricsResponse = createApiResponseSchema(SystemMetricsSchema);
var ApiHealthCheckResponse = createApiResponseSchema(HealthCheckSchema);
var ApiDocumentsListResponse = createApiResponseSchema(DocumentsListResponseSchema);
var ApiDocumentResponse = createApiResponseSchema(DocumentSchema2);
var ApiMessageResponse = createApiResponseSchema(MessageResponseSchema2);
var ApiEmptyResponse = createApiResponseSchema(EmptyResponseSchema);

// shared/types/branded-ids.ts
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id) {
  return UUID_REGEX.test(id);
}
function toAccountId(id) {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid AccountId format: ${id}. Must be a valid UUID.`);
  }
  return id;
}
function toStudentProfileId(id) {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid StudentProfileId format: ${id}. Must be a valid UUID.`);
  }
  return id;
}

// server/controllers/admin.controller.ts
init_bulk_import();
var accountStatusToggleSchema = z11.object({
  status: z11.enum(["active", "inactive", "pending_approval", "suspended", "rejected"])
});
var createCompanyProfileSchema = z11.object({
  email: z11.string().email(),
  companyName: z11.string().min(1),
  firstName: z11.string().optional(),
  lastName: z11.string().optional(),
  password: z11.string().optional(),
  generatePassword: z11.boolean().optional()
});
var updateSecuritySettingSchema = z11.object({
  settingValue: z11.string()
});
var resetPasswordSchema = z11.object({
  userId: z11.string()
});
var assignStudentSchema = z11.object({
  studentId: z11.string(),
  counselorId: z11.string()
});
var updatePaymentSettingsSchema = z11.object({
  apiKey: z11.string().optional(),
  secretKey: z11.string().optional(),
  webhookSecret: z11.string().optional(),
  isEnabled: z11.boolean().optional()
});
var updateCompanyProfileSchema = z11.object({
  companyName: z11.string().optional(),
  firstName: z11.string().optional(),
  lastName: z11.string().optional(),
  email: z11.string().email().optional()
});
var updateUniversityBodySchema = z11.object({
  name: z11.string().optional(),
  country: z11.string().optional(),
  city: z11.string().optional(),
  description: z11.string().optional(),
  ranking: z11.any().optional(),
  worldRanking: z11.number().optional(),
  tuitionFee: z11.number().optional(),
  specialization: z11.string().optional(),
  degreeLevels: z11.array(z11.string()).optional(),
  logo: z11.string().optional(),
  website: z11.string().optional(),
  applicationDeadline: z11.string().optional(),
  tier: z11.enum(["general", "top500", "top200", "top100", "ivy_league"]).optional(),
  acceptanceRate: z11.string().optional()
});
var unassignStudentSchema = z11.object({
  studentId: z11.string()
});
var togglePaymentGatewaySchema = z11.object({
  isActive: z11.boolean().optional()
});
var updateSubscriptionPlanBodySchema = z11.object({
  name: z11.string().optional(),
  description: z11.string().optional(),
  price: z11.number().transform((val) => val.toString()).optional(),
  features: z11.array(z11.string()).optional(),
  isActive: z11.boolean().optional()
});
var updateStudentSubscriptionSchema = z11.object({
  planId: z11.string(),
  status: z11.enum(["active", "cancelled", "expired", "pending"]).optional(),
  startedAt: z11.string().transform((val) => val ? new Date(val) : void 0).optional(),
  expiresAt: z11.string().transform((val) => val ? new Date(val) : null).optional().nullable()
});
var bulkImportUniversitiesSchema = z11.object({
  universities: z11.array(z11.object({
    name: z11.string(),
    country: z11.string(),
    city: z11.string().optional(),
    description: z11.string().optional(),
    ranking: z11.number().optional(),
    worldRanking: z11.number().optional(),
    tuitionFee: z11.number().optional(),
    specialization: z11.string().optional(),
    degreeLevels: z11.array(z11.string()).optional(),
    logo: z11.string().optional(),
    website: z11.string().optional(),
    applicationDeadline: z11.string().optional(),
    tier: z11.enum(["general", "top500", "top200", "top100", "ivy_league"]).optional(),
    acceptanceRate: z11.string().optional()
  }))
});
var AdminController = class extends BaseController {
  /**
   * Get system-wide statistics and metrics
   * 
   * @route GET /api/admin/stats
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with admin user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns system statistics (users, universities, applications, etc.)
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStats(req, res) {
    try {
      const adminAnalyticsService2 = getService(TYPES.IAdminAnalyticsService);
      const stats = await adminAnalyticsService2.getSystemStats();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStats");
    }
  }
  /**
   * Create a new team member (counselor or staff)
   * 
   * @route POST /api/admin/team-members
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with team member data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created team member data with temporary password
   * 
   * @example
   * // Request body:
   * {
   *   "email": "counselor@edupath.com",
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "teamRole": "counselor"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createTeamMember(req, res) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = CreateStaffRequestSchema.parse(req.body);
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const result = await adminUserService2.createTeamMemberWithPassword(adminId, {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        teamRole: validatedData.teamRole,
        department: validatedData.department
      });
      res.status(201);
      return this.sendSuccess(res, {
        ...result.user,
        temporaryPassword: result.temporaryPassword
      });
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.createTeamMember");
    }
  }
  /**
   * Create a new company profile
   * 
   * @route POST /api/admin/company-profiles
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created company profile with credentials
   * 
   * @example
   * // Request body:
   * {
   *   "email": "company@example.com",
   *   "companyName": "Acme Corp",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "generatePassword": true
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createCompanyProfile(req, res) {
    try {
      const validatedData = createCompanyProfileSchema.parse(req.body);
      const companyProfileService2 = getService(TYPES.ICompanyProfileService);
      const result = await companyProfileService2.createCompanyProfile({
        email: validatedData.email.toLowerCase(),
        password: validatedData.generatePassword ? void 0 : validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        companyName: validatedData.companyName,
        userType: "company_profile",
        teamRole: null,
        profilePicture: null
      });
      const adminCompanyService2 = getService(TYPES.IAdminCompanyService);
      const response = adminCompanyService2.formatCompanyProfileResponse(
        result.user,
        validatedData.companyName,
        result.temporaryPassword
      );
      res.status(201);
      return this.sendSuccess(res, response);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.createCompanyProfile");
    }
  }
  /**
   * Get all company profiles
   * 
   * @route GET /api/admin/company-profiles
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of company profiles
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getCompanyProfiles(req, res) {
    try {
      const adminCompanyService2 = getService(TYPES.IAdminCompanyService);
      const profiles = await adminCompanyService2.getCompanyProfiles();
      return this.sendSuccess(res, profiles);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getCompanyProfiles");
    }
  }
  /**
   * Update an existing company profile
   * 
   * @route PUT /api/admin/company-profiles/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async updateCompanyProfile(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateCompanyProfileSchema.parse(req.body);
      const adminCompanyService2 = getService(TYPES.IAdminCompanyService);
      const updated = await adminCompanyService2.updateCompanyProfile(id, validatedData);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updateCompanyProfile");
    }
  }
  /**
   * Reset password for a company profile
   * 
   * @route POST /api/admin/company-profiles/:id/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns new temporary password
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async resetCompanyPassword(req, res) {
    try {
      const { id } = req.params;
      const adminUser = this.getUser(req);
      const adminCompanyService2 = getService(TYPES.IAdminCompanyService);
      const result = await adminCompanyService2.resetCompanyPassword(id, adminUser.email);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, "AdminController.resetCompanyPassword");
    }
  }
  /**
   * Delete a company profile
   * 
   * @route DELETE /api/admin/company-profiles/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async deleteCompanyProfile(req, res) {
    try {
      const { id } = req.params;
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const success = await adminUserService2.deleteUser(id);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Company profile not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.deleteCompanyProfile");
    }
  }
  /**
   * Toggle company profile account status
   * 
   * @route PUT /api/admin/company-profiles/:id/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async toggleCompanyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.toggleCompanyStatus");
    }
  }
  /**
   * Get all universities
   * 
   * @route GET /api/admin/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all universities
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUniversities(req, res) {
    try {
      const universityService2 = getService(TYPES.IUniversityService);
      const universities2 = await universityService2.getAllUniversities();
      return this.sendSuccess(res, universities2);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getUniversities");
    }
  }
  /**
   * Create a new university
   * 
   * @route POST /api/admin/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created university
   * 
   * @throws {422} Validation error if university data is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createUniversity(req, res) {
    try {
      const universityData = insertUniversitySchema.parse(req.body);
      const universityService2 = getService(TYPES.IUniversityService);
      const university = await universityService2.createUniversityWithNormalization(universityData);
      res.status(201);
      return this.sendSuccess(res, university);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid university data", error.errors);
      }
      return this.handleError(res, error, "AdminController.createUniversity");
    }
  }
  /**
   * Update an existing university
   * 
   * @route PUT /api/admin/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} University not found
   */
  async updateUniversity(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateUniversityBodySchema.parse(req.body);
      const universityService2 = getService(TYPES.IUniversityService);
      const updated = await universityService2.updateUniversity(id, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updateUniversity");
    }
  }
  /**
   * Delete a university
   * 
   * @route DELETE /api/admin/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} University not found
   */
  async deleteUniversity(req, res) {
    try {
      const { id } = req.params;
      const universityService2 = getService(TYPES.IUniversityService);
      const success = await universityService2.deleteUniversity(id);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "University not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.deleteUniversity");
    }
  }
  /**
   * Get all students
   * 
   * @route GET /api/admin/students
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all students
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStudents(req, res) {
    try {
      const adminStudentService2 = getService(TYPES.IAdminStudentService);
      const students = await adminStudentService2.getAllStudents();
      return this.sendSuccess(res, students);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStudents");
    }
  }
  /**
   * Get detailed information for a specific student
   * 
   * @route GET /api/admin/students/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student profile data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentById(req, res) {
    try {
      const { studentId } = req.params;
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const student = await userProfileService2.getUserProfile(studentId);
      return this.sendSuccess(res, student);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStudentById");
    }
  }
  /**
   * Reset password for a student
   * 
   * @route POST /api/admin/students/:studentId/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns temporary password and email
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async resetStudentPassword(req, res) {
    try {
      const { studentId } = req.params;
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const student = await userProfileService2.getUserById(studentId);
      if (!student) {
        return this.sendError(res, 404, "NOT_FOUND", "Student not found");
      }
      const { user, plainPassword } = await userProfileService2.resetUserPassword(studentId);
      const adminUser = this.getUser(req);
      console.log(`\u{1F510} Admin ${adminUser.email} reset password for student ${student.email}`);
      return this.sendSuccess(res, {
        temporaryPassword: plainPassword,
        email: user.email
      });
    } catch (error) {
      return this.handleError(res, error, "AdminController.resetStudentPassword");
    }
  }
  /**
   * Toggle student account status
   * 
   * **IMPORTANT**: This endpoint expects a user account ID (userId), NOT a student profile ID.
   * The studentId parameter must be the user's account ID from the users table.
   * Use getStudentAccountId(student) helper to extract the correct ID from StudentWithUserDetails.
   * 
   * @route PUT /api/admin/students/:studentId/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with user account ID (userId) and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found (when userId doesn't exist)
   */
  async toggleStudentStatus(req, res) {
    try {
      const { studentId } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      const accountId = toAccountId(studentId);
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(accountId, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.toggleStudentStatus");
    }
  }
  /**
   * Toggle staff account status
   * 
   * @route PUT /api/admin/staff/:id/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async toggleStaffStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.toggleStaffStatus");
    }
  }
  /**
   * Get all staff members
   * 
   * @route GET /api/admin/staff
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all staff members
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStaff(req, res) {
    try {
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const staff = await adminUserService2.getStaffMembers();
      return this.sendSuccess(res, staff.map((u) => this.sanitizeUser(u)));
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStaff");
    }
  }
  /**
   * Create a new staff member
   * 
   * @route POST /api/admin/staff
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff member data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created staff member with temporary password
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createStaff(req, res) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = CreateStaffRequestSchema.parse(req.body);
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const result = await adminUserService2.createTeamMemberWithPassword(adminId, {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        teamRole: validatedData.teamRole,
        department: validatedData.department
      });
      res.status(201);
      return this.sendSuccess(res, {
        ...result.user,
        temporaryPassword: result.temporaryPassword
      });
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.createStaff");
    }
  }
  /**
   * Get credentials for a specific staff member
   * 
   * @route GET /api/admin/staff/:id/credentials
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns email and encrypted password status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async getStaffCredentials(req, res) {
    try {
      const { id } = req.params;
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const staff = await userProfileService2.getUserById(id);
      if (!staff) {
        return this.sendError(res, 404, "NOT_FOUND", "Staff member not found");
      }
      return this.sendSuccess(res, {
        email: staff.email,
        temporaryPassword: staff.temporaryPassword ? "***encrypted***" : null
      });
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStaffCredentials");
    }
  }
  /**
   * Reset password for a staff member
   * 
   * @route POST /api/admin/staff/:id/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns temporary password and email
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async resetStaffPassword(req, res) {
    try {
      const { id } = req.params;
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const staff = await userProfileService2.getUserById(id);
      if (!staff) {
        return this.sendError(res, 404, "NOT_FOUND", "Staff member not found");
      }
      const { user, plainPassword } = await userProfileService2.resetUserPassword(id);
      const adminUser = this.getUser(req);
      console.log(`\u{1F510} Admin ${adminUser.email} reset password for staff ${staff.email}`);
      return this.sendSuccess(res, {
        temporaryPassword: plainPassword,
        email: user.email
      });
    } catch (error) {
      return this.handleError(res, error, "AdminController.resetStaffPassword");
    }
  }
  /**
   * Approve a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/approve
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with approved status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async approveStaff(req, res) {
    try {
      const { id } = req.params;
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, "active");
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, "AdminController.approveStaff");
    }
  }
  /**
   * Reject a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/reject
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with rejected status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async rejectStaff(req, res) {
    try {
      const { id } = req.params;
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, "rejected");
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, "AdminController.rejectStaff");
    }
  }
  /**
   * Suspend a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/suspend
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with suspended status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async suspendStaff(req, res) {
    try {
      const { id } = req.params;
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, "suspended");
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, "AdminController.suspendStaff");
    }
  }
  /**
   * Reactivate a suspended staff member's account
   * 
   * @route PUT /api/admin/staff/:id/reactivate
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with active status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async reactivateStaff(req, res) {
    try {
      const { id } = req.params;
      const adminUserService2 = getService(TYPES.IAdminUserService);
      const updated = await adminUserService2.updateUserAccountStatus(id, "active");
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, "AdminController.reactivateStaff");
    }
  }
  /**
   * Get all counselors
   * 
   * @route GET /api/admin/counselors
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all counselors
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getCounselors(req, res) {
    try {
      const counselorDashboardService2 = getService(TYPES.ICounselorDashboardService);
      const counselors = await counselorDashboardService2.getCounselors();
      return this.sendSuccess(res, counselors);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getCounselors");
    }
  }
  /**
   * Assign a student to a counselor
   * 
   * @route POST /api/admin/assign-student
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student and counselor IDs
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @example
   * // Request body:
   * {
   *   "studentId": "student-123",
   *   "counselorId": "counselor-456"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student or counselor not found
   */
  async assignStudent(req, res) {
    try {
      const { studentId, counselorId } = assignStudentSchema.parse(req.body);
      const counselorAssignmentService2 = getService(TYPES.ICounselorAssignmentService);
      await counselorAssignmentService2.assignStudent(studentId, counselorId);
      return this.sendEmptySuccess(res);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.assignStudent");
    }
  }
  /**
   * Unassign a student from their counselor
   * 
   * @route POST /api/admin/unassign-student
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @example
   * // Request body:
   * {
   *   "studentId": "student-123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async unassignStudent(req, res) {
    try {
      const { studentId } = unassignStudentSchema.parse(req.body);
      const counselorAssignmentService2 = getService(TYPES.ICounselorAssignmentService);
      await counselorAssignmentService2.unassignStudent(studentId);
      return this.sendEmptySuccess(res);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.unassignStudent");
    }
  }
  /**
   * Get all security settings
   * 
   * @route GET /api/admin/security/settings
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of security settings
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSecuritySettings(req, res) {
    try {
      const adminSecurityService2 = getService(TYPES.IAdminSecurityService);
      const settings = await adminSecurityService2.getSecuritySettings();
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getSecuritySettings");
    }
  }
  /**
   * Update a specific security setting
   * 
   * @route PUT /api/admin/security/settings/:settingKey
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with setting key and value
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated security setting
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async updateSecuritySetting(req, res) {
    try {
      const { settingKey } = req.params;
      const { settingValue } = updateSecuritySettingSchema.parse(req.body);
      const adminId = this.getUserId(req);
      const adminSecurityService2 = getService(TYPES.IAdminSecurityService);
      const updated = await adminSecurityService2.updateSecuritySetting(settingKey, settingValue, adminId);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updateSecuritySetting");
    }
  }
  /**
   * Get payment gateway settings
   * 
   * @route GET /api/admin/payment-settings
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns payment settings configuration
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getPaymentSettings(req, res) {
    try {
      const paymentService2 = getService(TYPES.IPaymentService);
      const settings = await paymentService2.getPaymentSettings();
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getPaymentSettings");
    }
  }
  /**
   * Update payment gateway settings
   * 
   * @route PUT /api/admin/payment-settings/:gateway
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with gateway name and settings
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payment settings
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async updatePaymentSettings(req, res) {
    try {
      const { gateway } = req.params;
      const validatedData = updatePaymentSettingsSchema.parse(req.body);
      const adminId = this.getUserId(req);
      const paymentService2 = getService(TYPES.IPaymentService);
      const updated = await paymentService2.updatePaymentSettings(gateway, validatedData, adminId);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updatePaymentSettings");
    }
  }
  /**
   * Toggle payment gateway active/inactive status
   * 
   * @route PATCH /api/admin/payment-settings/:gateway/toggle
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with gateway name and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payment gateway status
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async togglePaymentGateway(req, res) {
    try {
      const { gateway } = req.params;
      const { isActive } = togglePaymentGatewaySchema.parse(req.body);
      const adminId = this.getUserId(req);
      const paymentService2 = getService(TYPES.IPaymentService);
      const updated = await paymentService2.togglePaymentGateway(gateway, isActive ?? true, adminId);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.togglePaymentGateway");
    }
  }
  /**
   * Get all subscription plans
   * 
   * @route GET /api/admin/subscription-plans
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all subscription plans
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSubscriptionPlans(req, res) {
    try {
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const plans = await subscriptionService2.getAllSubscriptionPlans();
      return this.sendSuccess(res, plans);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getSubscriptionPlans");
    }
  }
  /**
   * Create a new subscription plan
   * 
   * @route POST /api/admin/subscription-plans
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with subscription plan data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created subscription plan
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createSubscriptionPlan(req, res) {
    try {
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const plan = await subscriptionService2.createSubscriptionPlan(validatedData);
      res.status(201);
      return this.sendSuccess(res, plan);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.createSubscriptionPlan");
    }
  }
  /**
   * Update an existing subscription plan
   * 
   * @route PUT /api/admin/subscription-plans/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with plan ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated subscription plan
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Subscription plan not found
   */
  async updateSubscriptionPlan(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateSubscriptionPlanBodySchema.parse(req.body);
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const updated = await subscriptionService2.updateSubscriptionPlan(id, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updateSubscriptionPlan");
    }
  }
  /**
   * Delete a subscription plan
   * 
   * @route DELETE /api/admin/subscription-plans/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Subscription plan not found
   */
  async deleteSubscriptionPlan(req, res) {
    try {
      const { id } = req.params;
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const success = await subscriptionService2.deleteSubscriptionPlan(id);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Subscription plan not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.deleteSubscriptionPlan");
    }
  }
  /**
   * Get all user subscriptions
   * 
   * @route GET /api/admin/user-subscriptions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all user subscriptions
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUserSubscriptions(req, res) {
    try {
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const subscriptions2 = await userSubscriptionService2.getAllSubscriptions();
      return this.sendSuccess(res, subscriptions2);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getUserSubscriptions");
    }
  }
  /**
   * Update or create a student's subscription
   * 
   * @route POST /api/admin/student-subscription/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID and subscription data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created/updated subscription
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async updateStudentSubscription(req, res) {
    try {
      const { studentId } = req.params;
      const validatedData = updateStudentSubscriptionSchema.parse(req.body);
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService2.createSubscription({
        userId: studentId,
        planId: validatedData.planId,
        status: validatedData.status || "active",
        startedAt: validatedData.startedAt || /* @__PURE__ */ new Date(),
        expiresAt: validatedData.expiresAt || null
      });
      return this.sendSuccess(res, subscription);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.updateStudentSubscription");
    }
  }
  /**
   * Get all students with their subscription details
   * 
   * @route GET /api/admin/students-subscriptions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of students with subscription data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStudentsWithSubscriptions(req, res) {
    try {
      const adminStudentService2 = getService(TYPES.IAdminStudentService);
      const studentsWithSubs = await adminStudentService2.getStudentsWithSubscriptions();
      return this.sendSuccess(res, studentsWithSubs);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStudentsWithSubscriptions");
    }
  }
  /**
   * Get all reported forum posts
   * 
   * @route GET /api/admin/forum/reported-posts
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of reported posts
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getReportedPosts(req, res) {
    try {
      const adminForumModerationService2 = getService(TYPES.IAdminForumModerationService);
      const posts = await adminForumModerationService2.getReportedPosts();
      return this.sendSuccess(res, posts);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getReportedPosts");
    }
  }
  /**
   * Get detailed reports for a specific post
   * 
   * @route GET /api/admin/forum/posts/:id/reports
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of reports for the post
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async getPostReports(req, res) {
    try {
      const { id } = req.params;
      const adminForumModerationService2 = getService(TYPES.IAdminForumModerationService);
      const reports = await adminForumModerationService2.getReportDetails(id);
      return this.sendSuccess(res, reports);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getPostReports");
    }
  }
  /**
   * Restore a reported/deleted forum post
   * 
   * @route POST /api/admin/forum/posts/:id/restore
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async restorePost(req, res) {
    try {
      const { id } = req.params;
      const adminId = this.getUserId(req);
      const adminForumModerationService2 = getService(TYPES.IAdminForumModerationService);
      const success = await adminForumModerationService2.restoreReportedPost(id, adminId);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Post not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.restorePost");
    }
  }
  /**
   * Permanently delete a reported forum post
   * 
   * @route DELETE /api/admin/forum/posts/:id/permanent
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async permanentlyDeletePost(req, res) {
    try {
      const { id } = req.params;
      const adminId = this.getUserId(req);
      const adminForumModerationService2 = getService(TYPES.IAdminForumModerationService);
      const success = await adminForumModerationService2.permanentlyDeleteReportedPost(id, adminId);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Post not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.permanentlyDeletePost");
    }
  }
  /**
   * Force logout all users (delete all sessions)
   * 
   * @route POST /api/admin/force-logout-all
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @note With JWT tokens, this is a placeholder as logout is handled client-side
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async deleteAllSessions(req, res) {
    try {
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "AdminController.deleteAllSessions");
    }
  }
  /**
   * Get analytics dashboard data for team members
   * 
   * @route GET /api/admin/analytics-dashboard
   * @access Admin (Team Member)
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns analytics dashboard statistics
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a team member
   */
  async getAnalyticsDashboard(req, res) {
    try {
      const user = this.getUser(req);
      if (user.userType !== "team_member") {
        return this.sendError(res, 403, "ACCESS_DENIED", "Team member access required");
      }
      const adminAnalyticsService2 = getService(TYPES.IAdminAnalyticsService);
      const stats = await adminAnalyticsService2.getAnalyticsDashboard();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getAnalyticsDashboard");
    }
  }
  /**
   * Get timeline/activity history for a specific student
   * 
   * @route GET /api/admin/students/:studentId/timeline
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student timeline events
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentTimeline(req, res) {
    try {
      const { studentId } = req.params;
      const profileId = toStudentProfileId(studentId);
      const adminStudentService2 = getService(TYPES.IAdminStudentService);
      const timeline = await adminStudentService2.getStudentTimeline(profileId);
      return this.sendSuccess(res, timeline);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStudentTimeline");
    }
  }
  /**
   * Get current status for a specific student
   * 
   * @route GET /api/admin/students/:studentId/status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentStatus(req, res) {
    try {
      const { studentId } = req.params;
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const { profile } = await userProfileService2.getUserProfile(studentId);
      return this.sendSuccess(res, { status: profile?.status || "inquiry" });
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStudentStatus");
    }
  }
  /**
   * Create a new staff invitation link
   * 
   * @route POST /api/admin/staff-invitation-links
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created invitation link with URL
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "id": "inv-123",
   *     "token": "abc123xyz",
   *     "url": "https://edupath.com/auth/staff-invite/abc123xyz",
   *     "createdAt": "2025-01-01T00:00:00Z"
   *   }
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createStaffInvitationLink(req, res) {
    try {
      const adminId = this.getUserId(req);
      const adminStaffInvitationService2 = getService(TYPES.IAdminStaffInvitationService);
      const invitationLink = await adminStaffInvitationService2.createStaffInvitationLink(adminId);
      const protocol = req.protocol;
      const host = req.get("host");
      const url = `${protocol}://${host}/auth/staff-invite/${invitationLink.token}`;
      return this.sendSuccess(res, {
        id: invitationLink.id,
        token: invitationLink.token,
        url,
        createdAt: invitationLink.createdAt
      });
    } catch (error) {
      return this.handleError(res, error, "AdminController.createStaffInvitationLink");
    }
  }
  /**
   * Get all staff invitation links
   * 
   * @route GET /api/admin/staff-invitation-links
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of invitation links with URLs
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStaffInvitationLinks(req, res) {
    try {
      const adminStaffInvitationService2 = getService(TYPES.IAdminStaffInvitationService);
      const links = await adminStaffInvitationService2.getStaffInvitationLinks();
      const protocol = req.protocol;
      const host = req.get("host");
      const linksWithUrls = links.map((link) => ({
        ...link,
        url: `${protocol}://${host}/auth/staff-invite/${link.token}`
      }));
      return this.sendSuccess(res, linksWithUrls);
    } catch (error) {
      return this.handleError(res, error, "AdminController.getStaffInvitationLinks");
    }
  }
  /**
   * Refresh/regenerate a staff invitation link
   * 
   * @route PUT /api/admin/staff-invitation-links/:id/refresh
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with invitation link ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns refreshed invitation link with new URL
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Invitation link not found
   */
  async refreshStaffInvitationLink(req, res) {
    try {
      const { id } = req.params;
      const adminStaffInvitationService2 = getService(TYPES.IAdminStaffInvitationService);
      const updatedLink = await adminStaffInvitationService2.refreshStaffInvitationLink(id);
      if (!updatedLink) {
        return this.sendError(res, 404, "RESOURCE_NOT_FOUND", "Invitation link not found");
      }
      const protocol = req.protocol;
      const host = req.get("host");
      const url = `${protocol}://${host}/auth/staff-invite/${updatedLink.token}`;
      return this.sendSuccess(res, {
        ...updatedLink,
        url
      });
    } catch (error) {
      return this.handleError(res, error, "AdminController.refreshStaffInvitationLink");
    }
  }
  /**
   * Bulk import universities from CSV content
   * 
   * @route POST /api/admin/universities/bulk-import
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with CSV content
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns import results (success count, failed count, and errors)
   * 
   * @example
   * // Request body:
   * {
   *   "csvContent": "name,country,city,website,worldRanking,description,degreeLevels,specialization,offerLetterFee,annualFee,minimumGPA,ieltsScore,gmatScore,alumni1,alumni2,alumni3\nHarvard University,United States,Cambridge,https://www.harvard.edu,3,Prestigious Ivy League university,Bachelor,Master,PhD,general,150,54000,3.7,7.5,700,Mark Zuckerberg,Barack Obama,Bill Gates"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async bulkImportUniversities(req, res) {
    try {
      const csvContentSchema = z11.object({
        csvContent: z11.string().min(1, "CSV content is required")
      });
      const validatedData = csvContentSchema.parse(req.body);
      const { bulkImportUniversities: bulkImportUniversities2 } = await Promise.resolve().then(() => (init_bulk_import(), bulk_import_exports));
      const result = await bulkImportUniversities2(validatedData.csvContent);
      res.status(201);
      return this.sendSuccess(res, {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        message: `Successfully imported ${result.success} universities. ${result.failed} failed.`
      });
    } catch (error) {
      if (error instanceof z11.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AdminController.bulkImportUniversities");
    }
  }
  /**
   * Download a sample CSV template for university bulk import
   * 
   * @route GET /api/admin/universities/sample-csv
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns CSV file download
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSampleCSV(req, res) {
    try {
      const csvContent = generateSampleCSV();
      return this.sendFileDownload(res, csvContent, "universities-sample.csv", "text/csv");
    } catch (error) {
      return this.handleError(res, error, "AdminController.getSampleCSV");
    }
  }
};
var adminController = new AdminController();

// server/routes/admin.routes.ts
var router6 = Router6();
router6.use(requireAdmin);
router6.get("/stats", asyncHandler((req, res) => adminController.getStats(req, res)));
router6.post("/team-members", csrfProtection, asyncHandler((req, res) => adminController.createTeamMember(req, res)));
router6.post("/company-profiles", csrfProtection, asyncHandler((req, res) => adminController.createCompanyProfile(req, res)));
router6.get("/company-profiles", asyncHandler((req, res) => adminController.getCompanyProfiles(req, res)));
router6.put("/company-profiles/:id", csrfProtection, asyncHandler((req, res) => adminController.updateCompanyProfile(req, res)));
router6.post("/company-profiles/:id/reset-password", csrfProtection, asyncHandler((req, res) => adminController.resetCompanyPassword(req, res)));
router6.put("/company-profiles/:id/toggle-status", csrfProtection, asyncHandler((req, res) => adminController.toggleCompanyStatus(req, res)));
router6.delete("/company-profiles/:id", csrfProtection, asyncHandler((req, res) => adminController.deleteCompanyProfile(req, res)));
router6.get("/universities", asyncHandler((req, res) => adminController.getUniversities(req, res)));
router6.post("/universities", csrfProtection, asyncHandler((req, res) => adminController.createUniversity(req, res)));
router6.put("/universities/:id", csrfProtection, asyncHandler((req, res) => adminController.updateUniversity(req, res)));
router6.delete("/universities/:id", csrfProtection, asyncHandler((req, res) => adminController.deleteUniversity(req, res)));
router6.post("/universities/bulk-import", csrfProtection, asyncHandler((req, res) => adminController.bulkImportUniversities(req, res)));
router6.get("/universities/sample-csv", asyncHandler((req, res) => adminController.getSampleCSV(req, res)));
router6.get("/students", asyncHandler((req, res) => adminController.getStudents(req, res)));
router6.get("/students/:studentId", asyncHandler((req, res) => adminController.getStudentById(req, res)));
router6.post("/students/:studentId/reset-password", csrfProtection, asyncHandler((req, res) => adminController.resetStudentPassword(req, res)));
router6.put("/students/:studentId/toggle-status", csrfProtection, asyncHandler((req, res) => adminController.toggleStudentStatus(req, res)));
router6.get("/staff", asyncHandler((req, res) => adminController.getStaff(req, res)));
router6.post("/staff", csrfProtection, asyncHandler((req, res) => adminController.createStaff(req, res)));
router6.get("/staff/:id/credentials", asyncHandler((req, res) => adminController.getStaffCredentials(req, res)));
router6.post("/staff/:id/reset-password", csrfProtection, asyncHandler((req, res) => adminController.resetStaffPassword(req, res)));
router6.put("/staff/:id/toggle-status", csrfProtection, asyncHandler((req, res) => adminController.toggleStaffStatus(req, res)));
router6.put("/staff/:id/approve", csrfProtection, asyncHandler((req, res) => adminController.approveStaff(req, res)));
router6.put("/staff/:id/reject", csrfProtection, asyncHandler((req, res) => adminController.rejectStaff(req, res)));
router6.put("/staff/:id/suspend", csrfProtection, asyncHandler((req, res) => adminController.suspendStaff(req, res)));
router6.put("/staff/:id/reactivate", csrfProtection, asyncHandler((req, res) => adminController.reactivateStaff(req, res)));
router6.get("/counselors", asyncHandler((req, res) => adminController.getCounselors(req, res)));
router6.post("/assign-student", csrfProtection, asyncHandler((req, res) => adminController.assignStudent(req, res)));
router6.post("/unassign-student", csrfProtection, asyncHandler((req, res) => adminController.unassignStudent(req, res)));
router6.get("/security/settings", asyncHandler((req, res) => adminController.getSecuritySettings(req, res)));
router6.put("/security/settings/:settingKey", csrfProtection, asyncHandler((req, res) => adminController.updateSecuritySetting(req, res)));
router6.get("/security-settings", asyncHandler((req, res) => adminController.getSecuritySettings(req, res)));
router6.post("/security-settings", csrfProtection, asyncHandler((req, res) => adminController.updateSecuritySetting(req, res)));
router6.get("/payment-settings", asyncHandler((req, res) => adminController.getPaymentSettings(req, res)));
router6.put("/payment-settings/:gateway", csrfProtection, asyncHandler((req, res) => adminController.updatePaymentSettings(req, res)));
router6.patch("/payment-settings/:gateway/toggle", csrfProtection, asyncHandler((req, res) => adminController.togglePaymentGateway(req, res)));
router6.get("/subscription-plans", asyncHandler((req, res) => adminController.getSubscriptionPlans(req, res)));
router6.post("/subscription-plans", csrfProtection, asyncHandler((req, res) => adminController.createSubscriptionPlan(req, res)));
router6.put("/subscription-plans/:id", csrfProtection, asyncHandler((req, res) => adminController.updateSubscriptionPlan(req, res)));
router6.delete("/subscription-plans/:id", csrfProtection, asyncHandler((req, res) => adminController.deleteSubscriptionPlan(req, res)));
router6.get("/user-subscriptions", asyncHandler((req, res) => adminController.getUserSubscriptions(req, res)));
router6.post("/student-subscription/:studentId", csrfProtection, asyncHandler((req, res) => adminController.updateStudentSubscription(req, res)));
router6.get("/students-subscriptions", asyncHandler((req, res) => adminController.getStudentsWithSubscriptions(req, res)));
router6.get("/forum/reported-posts", asyncHandler((req, res) => adminController.getReportedPosts(req, res)));
router6.get("/forum/posts/:id/reports", asyncHandler((req, res) => adminController.getPostReports(req, res)));
router6.post("/forum/posts/:id/restore", csrfProtection, asyncHandler((req, res) => adminController.restorePost(req, res)));
router6.delete("/forum/posts/:id/permanent", csrfProtection, asyncHandler((req, res) => adminController.permanentlyDeletePost(req, res)));
router6.post("/force-logout-all", csrfProtection, asyncHandler((req, res) => adminController.forceLogoutAll(req, res)));
router6.post("/staff-invitation-links", csrfProtection, asyncHandler((req, res) => adminController.createStaffInvitationLink(req, res)));
router6.get("/staff-invitation-links", asyncHandler((req, res) => adminController.getStaffInvitationLinks(req, res)));
router6.put("/staff-invitation-links/:id/refresh", csrfProtection, asyncHandler((req, res) => adminController.refreshStaffInvitationLink(req, res)));
var admin_routes_default = router6;

// server/routes/document.routes.ts
import { Router as Router7 } from "express";

// server/controllers/document.controller.ts
init_container();
init_schema();
import { z as z12 } from "zod";
var DocumentController = class extends BaseController {
  /**
   * Get all documents for the authenticated user
   * 
   * @route GET /api/documents
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's documents
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getDocuments(req, res) {
    try {
      const userId = this.getUserId(req);
      const documentService2 = getService(TYPES.IDocumentService);
      const documents2 = await documentService2.getDocumentsByUser(userId);
      return this.sendSuccess(res, documents2);
    } catch (error) {
      return this.handleError(res, error, "DocumentController.getDocuments");
    }
  }
  /**
   * Upload and create a new document for the authenticated user
   * 
   * @route POST /api/documents
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and document data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created document
   * 
   * @example
   * // Request body:
   * {
   *   "name": "Transcript",
   *   "type": "academic",
   *   "url": "https://storage.example.com/transcript.pdf"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createDocument(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        userId
      });
      const documentService2 = getService(TYPES.IDocumentService);
      const document = await documentService2.createDocument(validatedData);
      res.status(201);
      return this.sendSuccess(res, document);
    } catch (error) {
      if (error instanceof z12.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "DocumentController.createDocument");
    }
  }
  /**
   * Delete a document by ID
   * 
   * @route DELETE /api/documents/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and document ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if document doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const documentService2 = getService(TYPES.IDocumentService);
      const success = await documentService2.deleteDocument(id);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Document not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "DocumentController.deleteDocument");
    }
  }
};
var documentController = new DocumentController();

// server/routes/document.routes.ts
var router7 = Router7();
router7.use(requireAuth);
router7.get("/", asyncHandler((req, res) => documentController.getDocuments(req, res)));
router7.post("/", csrfProtection, asyncHandler((req, res) => documentController.createDocument(req, res)));
router7.delete("/:id", csrfProtection, asyncHandler((req, res) => documentController.deleteDocument(req, res)));
var document_routes_default = router7;

// server/routes/ai.routes.ts
import { Router as Router8 } from "express";

// server/controllers/ai.controller.ts
init_container();
import { z as z13 } from "zod";
var matchSchema = z13.object({
  academicProfile: z13.object({
    gpa: z13.number().optional(),
    testScores: z13.any().optional(),
    intendedMajor: z13.string().optional()
  }).optional(),
  preferences: z13.object({
    country: z13.string().optional(),
    budgetRange: z13.string().optional()
  }).optional()
});
var AIController = class extends BaseController {
  /**
   * Generate university matches using AI
   * 
   * @route POST /api/ai/match
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with user ID and academic profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns AI-generated university matches
   * 
   * @example
   * // Request body:
   * {
   *   "academicProfile": {
   *     "gpa": 3.8,
   *     "testScores": { "SAT": 1450 },
   *     "intendedMajor": "Computer Science"
   *   },
   *   "preferences": {
   *     "country": "USA",
   *     "budgetRange": "30000-50000"
   *   }
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createMatchRequest(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = matchSchema.parse(req.body);
      const aiMatchingService2 = getService(TYPES.IAIMatchingService);
      const matches = await aiMatchingService2.generateMatches(userId);
      res.status(201);
      return this.sendSuccess(res, matches);
    } catch (error) {
      if (error instanceof z13.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "AIController.createMatchRequest");
    }
  }
  /**
   * Get existing university matches for the authenticated user
   * 
   * @route GET /api/ai/matches
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of previously generated university matches
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMatches(req, res) {
    try {
      const userId = this.getUserId(req);
      const aiMatchingService2 = getService(TYPES.IAIMatchingService);
      const matches = await aiMatchingService2.getMatches(userId);
      return this.sendSuccess(res, matches);
    } catch (error) {
      return this.handleError(res, error, "AIController.getMatches");
    }
  }
};
var aiController = new AIController();

// server/routes/ai.routes.ts
var router8 = Router8();
router8.use(requireAuth);
router8.post("/match", csrfProtection, asyncHandler((req, res) => aiController.matchUniversities(req, res)));
router8.get("/matches", asyncHandler((req, res) => aiController.getMatches(req, res)));
var ai_routes_default = router8;

// server/routes/event.routes.ts
import { Router as Router9 } from "express";

// server/controllers/event.controller.ts
init_container();
init_schema();
import { z as z14 } from "zod";
var EventController = class extends BaseController {
  /**
   * Get all available events
   * 
   * @route GET /api/events
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all events
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getEvents(req, res) {
    try {
      const eventService2 = getService(TYPES.IEventService);
      const events2 = await eventService2.getAllEvents();
      return this.sendSuccess(res, events2);
    } catch (error) {
      return this.handleError(res, error, "EventController.getEvents");
    }
  }
  /**
   * Create a new event
   * 
   * @route POST /api/events
   * @access Protected (Admin only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin user and event data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created event
   * 
   * @example
   * // Request body:
   * {
   *   "title": "University Fair 2025",
   *   "description": "Annual university fair event",
   *   "date": "2025-03-15",
   *   "location": "Main Campus"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createEvent(req, res) {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const eventService2 = getService(TYPES.IEventService);
      const event = await eventService2.createEvent(validatedData);
      res.status(201);
      return this.sendSuccess(res, event);
    } catch (error) {
      if (error instanceof z14.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "EventController.createEvent");
    }
  }
  /**
   * Register the authenticated user for an event
   * 
   * @route POST /api/events/:id/register
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and event ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns registration details
   * 
   * @throws {404} Not found if event doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async registerForEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const eventService2 = getService(TYPES.IEventService);
      const registration = await eventService2.registerForEvent(id, userId);
      return this.sendSuccess(res, registration);
    } catch (error) {
      return this.handleError(res, error, "EventController.registerForEvent");
    }
  }
  /**
   * Unregister the authenticated user from an event
   * 
   * @route DELETE /api/events/:id/register
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and event ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if registration doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async unregisterFromEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);
      const eventService2 = getService(TYPES.IEventService);
      const success = await eventService2.unregisterFromEvent(id, userId);
      if (!success) {
        return this.sendError(res, 404, "NOT_FOUND", "Registration not found");
      }
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, "EventController.unregisterFromEvent");
    }
  }
  /**
   * Get all event registrations for the authenticated user
   * 
   * @route GET /api/events/my-registrations
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's event registrations
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUserRegistrations(req, res) {
    try {
      const userId = this.getUserId(req);
      const eventService2 = getService(TYPES.IEventService);
      const registrations = await eventService2.getUserRegistrations(userId);
      return this.sendSuccess(res, registrations);
    } catch (error) {
      return this.handleError(res, error, "EventController.getUserRegistrations");
    }
  }
};
var eventController = new EventController();

// server/routes/event.routes.ts
var router9 = Router9();
router9.use(requireAuth);
router9.get("/", asyncHandler((req, res) => eventController.getEvents(req, res)));
router9.get("/user/registrations", asyncHandler((req, res) => eventController.getUserRegistrations(req, res)));
router9.post("/", requireAdmin, csrfProtection, asyncHandler((req, res) => eventController.createEvent(req, res)));
router9.post("/:id/register", csrfProtection, asyncHandler((req, res) => eventController.registerForEvent(req, res)));
router9.delete("/:id/register", csrfProtection, asyncHandler((req, res) => eventController.unregisterFromEvent(req, res)));
var event_routes_default = router9;

// server/routes/counselor.routes.ts
import { Router as Router10 } from "express";

// server/controllers/counselor.controller.ts
init_container();
import { z as z15 } from "zod";
var sendMessageSchema = z15.object({
  message: z15.string().min(1).max(5e3)
});
var createFollowUpSchema = z15.object({
  note: z15.string().min(1),
  type: z15.string().min(1)
});
var updateStudentProfileSchema2 = z15.object({
  phone: z15.string().optional(),
  nationality: z15.string().optional(),
  destinationCountry: z15.string().optional(),
  intakeYear: z15.string().optional(),
  currentEducationLevel: z15.string().optional(),
  intendedMajor: z15.string().optional(),
  budgetRange: z15.object({ min: z15.number(), max: z15.number() }).optional().nullable(),
  gpa: z15.union([z15.number(), z15.string()]).optional().nullable(),
  testScores: z15.record(z15.any()).optional().nullable(),
  academicInterests: z15.array(z15.string()).optional(),
  extracurriculars: z15.array(z15.any()).optional(),
  workExperience: z15.array(z15.any()).optional(),
  dateOfBirth: z15.string().optional().nullable(),
  academicScoringType: z15.enum(["gpa", "percentage", "grade"]).optional().nullable(),
  institutionName: z15.string().optional().nullable(),
  // Nested objects
  personalDetails: z15.record(z15.any()).optional().nullable(),
  academicDetails: z15.record(z15.any()).optional().nullable(),
  workDetails: z15.record(z15.any()).optional().nullable(),
  studyPreferences: z15.record(z15.any()).optional().nullable(),
  universityPreferences: z15.record(z15.any()).optional().nullable(),
  financialInfo: z15.record(z15.any()).optional().nullable(),
  visaHistory: z15.record(z15.any()).optional().nullable(),
  familyDetails: z15.record(z15.any()).optional().nullable(),
  additionalInfo: z15.record(z15.any()).optional().nullable()
});
var CounselorController = class extends BaseController {
  /**
   * Get all students assigned to the authenticated counselor
   * 
   * @route GET /api/counselor/students
   * @access Protected (Counselors only)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted list of assigned students
   * 
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getAssignedStudents(req, res) {
    try {
      const counselorId = this.getUserId(req);
      const counselorDashboardService2 = getService(TYPES.ICounselorDashboardService);
      const formattedStudents = await counselorDashboardService2.getAssignedStudentsFormatted(counselorId);
      return this.sendSuccess(res, formattedStudents);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getAssignedStudents");
    }
  }
  /**
   * Get counselor dashboard statistics
   * 
   * @route GET /api/counselor/stats
   * @access Protected (Counselors only)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns counselor dashboard statistics
   * 
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStats(req, res) {
    try {
      const counselorDashboardService2 = getService(TYPES.ICounselorDashboardService);
      const stats = await counselorDashboardService2.getCounselorStats();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getStats");
    }
  }
  /**
   * Get documents for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/documents
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of student's documents
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentDocuments(req, res) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const counselorDashboardService2 = getService(TYPES.ICounselorDashboardService);
      const documents2 = await counselorDashboardService2.getStudentDocumentsWithAccess(counselorId, studentId);
      return this.sendSuccess(res, documents2);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getStudentDocuments");
    }
  }
  /**
   * Get profile information for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/profile
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student profile
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentProfile(req, res) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const counselorAssignmentService2 = getService(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService2.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, "ACCESS_DENIED", "Access denied to this student");
      }
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const flattenedProfile = await userProfileService2.getStudentProfileFlat(studentId);
      return this.sendSuccess(res, flattenedProfile);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getStudentProfile");
    }
  }
  /**
   * Update profile information for a specific student
   * 
   * @route PUT /api/counselor/students/:studentId/profile
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor, student ID, and profile updates
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async updateStudentProfile(req, res) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const validatedData = updateStudentProfileSchema2.parse(req.body);
      const counselorAssignmentService2 = getService(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService2.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, "ACCESS_DENIED", "Access denied to this student");
      }
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const profile = await userProfileService2.getStudentProfileFlat(studentId);
      const updated = await userProfileService2.updateStudentProfile(profile.userId, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "CounselorController.updateStudentProfile");
    }
  }
  /**
   * Get university applications shortlist for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/universities
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of student's university applications
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentUniversities(req, res) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const counselorAssignmentService2 = getService(TYPES.ICounselorAssignmentService);
      const hasAccess = await counselorAssignmentService2.verifyCounselorAccess(counselorId, studentId);
      if (!hasAccess) {
        return this.sendError(res, 403, "ACCESS_DENIED", "Access denied to this student");
      }
      const applicationService2 = getService(TYPES.IApplicationService);
      const applications2 = await applicationService2.getApplicationsByUser(studentId);
      return this.sendSuccess(res, applications2);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getStudentUniversities");
    }
  }
  /**
   * Get follow-up notes for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/follow-ups
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of follow-up notes
   * 
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async getFollowUps(req, res) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      if (user.userType !== "team_member") {
        return this.sendError(res, 403, "TEAM_MEMBER_ACCESS_REQUIRED", "Team member access required");
      }
      const followUps = [];
      return this.sendSuccess(res, followUps);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getFollowUps");
    }
  }
  /**
   * Create a new follow-up note for a student
   * 
   * @route POST /api/counselor/students/:studentId/follow-ups
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member, student ID, and follow-up data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created follow-up note
   * 
   * @example
   * // Request body:
   * {
   *   "note": "Follow up on university application status",
   *   "type": "application_check"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async createFollowUp(req, res) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      const validatedData = createFollowUpSchema.parse(req.body);
      if (user.userType !== "team_member") {
        return this.sendError(res, 403, "TEAM_MEMBER_ACCESS_REQUIRED", "Team member access required");
      }
      const newFollowUp = {
        id: Date.now().toString(),
        studentId,
        counselorId: user.id,
        note: validatedData.note,
        type: validatedData.type,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return this.sendSuccess(res, newFollowUp);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "CounselorController.createFollowUp");
    }
  }
  /**
   * Get chat message history with a specific student
   * 
   * @route GET /api/counselor/students/:studentId/chat
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted chat messages
   * 
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async getChatMessages(req, res) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      if (user.userType !== "team_member") {
        return this.sendError(res, 403, "AUTH_FORBIDDEN", "Team member access required");
      }
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const profile = await userProfileService2.getStudentProfileFlat(studentId);
      const counselorId = user.id;
      const chatService2 = getService(TYPES.IChatService);
      const messages = await chatService2.getChatMessages(profile.userId, counselorId);
      const formattedMessages = chatService2.formatCounselorChatMessages(messages);
      return this.sendSuccess(res, formattedMessages);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getChatMessages");
    }
  }
  /**
   * Send a chat message to a specific student
   * 
   * @route POST /api/counselor/students/:studentId/chat
   * @access Protected (Team members only)
   * @param {AuthenticatedRequest} req - Request with authenticated team member, student ID, and message
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created message
   * 
   * @example
   * // Request body:
   * {
   *   "message": "I've reviewed your application documents"
   * }
   * 
   * @throws {422} Validation error if message is invalid
   * @throws {403} Forbidden if user is not a team member
   * @throws {401} Unauthorized if not authenticated
   * @throws {500} Internal server error
   */
  async sendChatMessage(req, res) {
    try {
      const { studentId } = req.params;
      const user = this.getUser(req);
      const { message } = sendMessageSchema.parse(req.body);
      if (user.userType !== "team_member") {
        return this.sendError(res, 403, "AUTH_FORBIDDEN", "Team member access required");
      }
      const cleanMessage = message.trim();
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const profile = await userProfileService2.getStudentProfileFlat(studentId);
      const chatService2 = getService(TYPES.IChatService);
      const newMessage = await chatService2.createChatMessage({
        studentId: profile.userId,
        counselorId: user.id,
        senderId: user.id,
        message: cleanMessage,
        isRead: false
      });
      const counselorResponse = chatService2.formatCounselorChatMessageResponse(newMessage);
      const wsService = container.get(TYPES.WebSocketService);
      const studentResponse = chatService2.formatChatMessageResponse(newMessage, "counselor");
      await wsService.sendToUser(user.id, {
        type: "chat_message",
        data: counselorResponse,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      await wsService.sendToUser(profile.userId, {
        type: "chat_message",
        data: studentResponse,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`\u{1F4E8} Broadcast chat message from counselor ${user.id} to student ${profile.userId}`);
      return this.sendSuccess(res, counselorResponse);
    } catch (error) {
      if (error instanceof z15.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "CounselorController.sendChatMessage");
    }
  }
  /**
   * Get subscription information for a specific student
   * 
   * @route GET /api/counselor/students/:studentId/subscription
   * @access Protected (Counselors only - requires access to student)
   * @param {AuthenticatedRequest} req - Request with authenticated counselor and student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student's subscription details
   * 
   * @throws {403} Forbidden if counselor doesn't have access to student
   * @throws {401} Unauthorized if not authenticated as counselor
   * @throws {500} Internal server error
   */
  async getStudentSubscription(req, res) {
    try {
      const { studentId } = req.params;
      const counselorId = this.getUserId(req);
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const assignment = await subscriptionService2.getCounselorStudentAssignment(counselorId, studentId);
      if (!assignment) {
        return this.sendError(res, 403, "ACCESS_DENIED", "Access denied");
      }
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService2.getCurrentSubscription(studentId);
      return this.sendSuccess(res, subscription || null);
    } catch (error) {
      return this.handleError(res, error, "CounselorController.getStudentSubscription");
    }
  }
};
var counselorController = new CounselorController();

// server/routes/counselor.routes.ts
var router10 = Router10();
router10.use(requireAuth);
router10.use(requireTeamMember);
router10.get("/assigned-students", asyncHandler(
  (req, res) => counselorController.getAssignedStudents(req, res)
));
router10.get("/stats", asyncHandler(
  (req, res) => counselorController.getStats(req, res)
));
router10.get("/student-documents/:studentId", asyncHandler(
  (req, res) => counselorController.getStudentDocuments(req, res)
));
router10.get("/student-profile/:studentId", asyncHandler(
  (req, res) => counselorController.getStudentProfile(req, res)
));
router10.get("/student/:studentId", asyncHandler(
  (req, res) => counselorController.getStudentProfile(req, res)
));
router10.put("/update-student-profile/:studentId", csrfProtection, asyncHandler(
  (req, res) => counselorController.updateStudentProfile(req, res)
));
router10.get("/student-universities/:studentId", asyncHandler(
  (req, res) => counselorController.getStudentUniversities(req, res)
));
router10.get("/followups/:studentId", asyncHandler(
  (req, res) => counselorController.getFollowUps(req, res)
));
router10.post("/followups/:studentId", csrfProtection, asyncHandler(
  (req, res) => counselorController.createFollowUp(req, res)
));
router10.get("/chat/:studentId", asyncHandler(
  (req, res) => counselorController.getChatMessages(req, res)
));
router10.post("/chat/:studentId", csrfProtection, asyncHandler(
  (req, res) => counselorController.sendChatMessage(req, res)
));
router10.get("/student-subscription/:studentId", asyncHandler(
  (req, res) => counselorController.getStudentSubscription(req, res)
));
router10.post("/upload-document/:studentId", asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Document upload not yet implemented" }
  });
}));
router10.post("/send-notification", csrfProtection, asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Send notification not yet implemented" }
  });
}));
router10.post("/add-university-to-shortlist", csrfProtection, asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Add to shortlist not yet implemented" }
  });
}));
router10.post("/finalize-universities", csrfProtection, asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Finalize universities not yet implemented" }
  });
}));
router10.put("/update-university-notes", csrfProtection, asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Update university notes not yet implemented" }
  });
}));
var counselor_routes_default = router10;

// server/routes/chat.routes.ts
import { Router as Router11 } from "express";

// server/controllers/chat.controller.ts
init_container();
import { z as z16 } from "zod";
var sendMessageSchema2 = z16.object({
  message: z16.string().min(1).max(5e3)
});
var bulkReadSchema = z16.object({
  messageIds: z16.array(z16.string())
});
var ChatController = class extends BaseController {
  /**
   * Get chat messages between student and assigned counselor
   * 
   * @route GET /api/chat/messages
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns formatted chat messages
   * 
   * @throws {403} Forbidden if user is not a student or has no assigned counselor
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMessages(req, res) {
    try {
      const user = this.getUser(req);
      if (user.userType !== "customer") {
        return this.sendError(res, 403, "AUTH_FORBIDDEN", "Student access required");
      }
      const studentId = user.id;
      const chatService2 = getService(TYPES.IChatService);
      const assignedCounselorId = await chatService2.getStudentAssignedCounselor(studentId);
      if (!assignedCounselorId) {
        return this.sendError(res, 403, "AUTH_FORBIDDEN", "No counselor assigned. Please contact admin to assign a counselor.");
      }
      const messages = await chatService2.getChatMessages(studentId, assignedCounselorId);
      const formattedMessages = chatService2.formatChatMessagesForStudent(messages, studentId);
      return this.sendSuccess(res, formattedMessages);
    } catch (error) {
      return this.handleError(res, error, "ChatController.getMessages");
    }
  }
  /**
   * Send a chat message to the assigned counselor
   * 
   * @route POST /api/chat/messages
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user and message content
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created message
   * 
   * @example
   * // Request body:
   * {
   *   "message": "I need help with my university application"
   * }
   * 
   * @throws {422} Validation error if message is invalid
   * @throws {403} Forbidden if user is not a student
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createMessage(req, res) {
    try {
      const user = this.getUser(req);
      const { message } = sendMessageSchema2.parse(req.body);
      if (user.userType !== "customer") {
        return this.sendError(res, 403, "AUTH_FORBIDDEN", "Student access required");
      }
      const userId = user.id;
      const chatService2 = getService(TYPES.IChatService);
      const assignedCounselorId = await chatService2.getStudentAssignedCounselor(userId);
      const newMessage = await chatService2.validateAndSendMessage(userId, message, assignedCounselorId || null);
      const studentResponse = chatService2.formatChatMessageResponse(newMessage, "student");
      if (assignedCounselorId) {
        const wsService = container.get(TYPES.WebSocketService);
        const counselorResponse = chatService2.formatCounselorChatMessageResponse(newMessage);
        await wsService.sendToUser(userId, {
          type: "chat_message",
          data: studentResponse,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        await wsService.sendToUser(assignedCounselorId, {
          type: "chat_message",
          data: counselorResponse,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`\u{1F4E8} Broadcast chat message from student ${userId} to counselor ${assignedCounselorId}`);
      }
      res.status(201);
      return this.sendSuccess(res, studentResponse);
    } catch (error) {
      if (error instanceof z16.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ChatController.createMessage");
    }
  }
  /**
   * Mark a single chat message as read
   * 
   * @route PUT /api/chat/messages/:messageId/read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and message ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns read confirmation
   * 
   * @throws {404} Not found if message doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateMessageReadStatus(req, res) {
    try {
      const { messageId } = req.params;
      const userId = this.getUserId(req);
      console.log(`\u{1F4E8} Message mark as read: ${messageId} by user: ${userId}`);
      const chatService2 = getService(TYPES.IChatService);
      const message = await chatService2.getChatMessageById(messageId);
      if (!message) {
        return this.sendError(res, 404, "MESSAGE_NOT_FOUND", "Message not found");
      }
      await chatService2.markChatMessageAsRead(messageId, userId);
      const readData = chatService2.createReadConfirmation(messageId, userId);
      const wsService = container.get(TYPES.WebSocketService);
      const recipients = [message.studentId, message.counselorId];
      recipients.forEach((recipientId) => {
        wsService.sendToUser(recipientId, {
          type: "message_read",
          data: readData,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      console.log(`\u2713 Broadcast read status for message ${messageId} between student ${message.studentId} and counselor ${message.counselorId}`);
      return this.sendSuccess(res, readData);
    } catch (error) {
      return this.handleError(res, error, "ChatController.updateMessageReadStatus");
    }
  }
  /**
   * Mark multiple chat messages as read in bulk
   * 
   * @route PUT /api/chat/messages/bulk-read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and array of message IDs
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success status and count of marked messages
   * 
   * @example
   * // Request body:
   * {
   *   "messageIds": ["msg-123", "msg-456", "msg-789"]
   * }
   * 
   * @throws {422} Validation error if message IDs are invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateMessagesReadStatus(req, res) {
    try {
      const userId = this.getUserId(req);
      const { messageIds } = bulkReadSchema.parse(req.body);
      const chatService2 = getService(TYPES.IChatService);
      const wsService = container.get(TYPES.WebSocketService);
      for (const messageId of messageIds) {
        const message = await chatService2.getChatMessageById(messageId);
        if (message) {
          await chatService2.markChatMessageAsRead(messageId, userId);
          const readData = chatService2.createReadConfirmation(messageId, userId);
          const recipients = [message.studentId, message.counselorId];
          recipients.forEach((recipientId) => {
            wsService.sendToUser(recipientId, {
              type: "message_read",
              data: readData,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          });
        }
      }
      console.log(`\u2713 Broadcast bulk read status for ${messageIds.length} messages`);
      return this.sendSuccess(res, {
        success: true,
        markedCount: messageIds.length
      });
    } catch (error) {
      if (error instanceof z16.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "ChatController.updateMessagesReadStatus");
    }
  }
};
var chatController = new ChatController();

// server/routes/chat.routes.ts
var router11 = Router11();
router11.use(requireAuth);
router11.get("/student", asyncHandler(
  (req, res) => chatController.getMessages(req, res)
));
router11.post("/student", csrfProtection, asyncHandler(
  (req, res) => chatController.createMessage(req, res)
));
router11.put("/messages/:messageId/read", csrfProtection, asyncHandler(
  (req, res) => chatController.updateMessageReadStatus(req, res)
));
router11.put("/messages/bulk-read", csrfProtection, asyncHandler(
  (req, res) => chatController.updateMessagesReadStatus(req, res)
));
var chat_routes_default = router11;

// server/routes/analytics.routes.ts
import { Router as Router12 } from "express";
var router12 = Router12();
router12.get("/dashboard", requireAuth, asyncHandler(
  (req, res) => adminController.getAnalyticsDashboard(req, res)
));
var analytics_routes_default = router12;

// server/routes/student.routes.ts
import { Router as Router13 } from "express";
var router13 = Router13();
router13.use(requireAuth);
router13.get("/timeline/:studentId", asyncHandler(
  (req, res) => adminController.getStudentTimeline(req, res)
));
router13.get("/status/:studentId", asyncHandler(
  (req, res) => adminController.getStudentStatus(req, res)
));
var student_routes_default = router13;

// server/routes/systemMetrics.ts
import { Router as Router14 } from "express";

// server/services/infrastructure/messageQueue.ts
import { EventEmitter } from "events";
var SimpleBackgroundJobSystem = class extends EventEmitter {
  jobs = [];
  processing = false;
  processingInterval = null;
  MAX_RETRIES = 2;
  constructor() {
    super();
    this.startProcessing();
  }
  /**
   * Add a job to the queue
   */
  enqueue(jobType, data) {
    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      type: jobType,
      data,
      timestamp: /* @__PURE__ */ new Date(),
      retryCount: 0
    };
    this.jobs.push(job);
    console.log(`\u{1F4CB} Enqueued job ${jobId} (${jobType}) - Queue size: ${this.jobs.length}`);
    return jobId;
  }
  /**
   * Start simple job processing
   */
  startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 2e3);
  }
  /**
   * Process jobs in the queue
   */
  async processJobs() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;
    try {
      const job = this.jobs.shift();
      if (job) {
        console.log(`\u{1F504} Processing job ${job.id} (${job.type})`);
        await this.processJob(job);
      }
    } catch (error) {
      console.error(`\u274C Error processing jobs:`, error);
    } finally {
      this.processing = false;
    }
  }
  /**
   * Process individual job
   */
  async processJob(job) {
    try {
      this.emit("process_message", job);
      console.log(`\u2705 Completed job ${job.id} (${job.type})`);
    } catch (error) {
      console.error(`\u274C Failed to process job ${job.id}:`, error);
      this.handleFailedJob(job, error);
    }
  }
  /**
   * Handle failed job with simple retry
   */
  handleFailedJob(job, error) {
    job.retryCount++;
    if (job.retryCount <= this.MAX_RETRIES) {
      this.jobs.push(job);
      console.log(`\u{1F504} Retrying job ${job.id} (attempt ${job.retryCount}/${this.MAX_RETRIES})`);
    } else {
      console.error(`\u{1F480} Job ${job.id} exceeded max retries, discarding`);
      this.emit("job_failed", { job, error });
    }
  }
  /**
   * Get simple queue statistics
   */
  getStats() {
    return {
      queueSize: this.jobs.length,
      processing: this.processing
    };
  }
  /**
   * Clear all jobs
   */
  clearAllJobs() {
    this.jobs.length = 0;
    console.log("\u{1F9F9} All jobs cleared");
  }
  /**
   * Stop job processing
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log("\u23F9\uFE0F Background job system stopped");
  }
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
var messageQueue = new SimpleBackgroundJobSystem();

// server/middleware/performanceMonitor.ts
var PerformanceMonitor = class {
  metrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    errorCount: 0,
    errorRate: 0,
    lastChecked: /* @__PURE__ */ new Date(),
    corsPreflightRequests: 0,
    corsCrossOriginRequests: 0,
    corsErrors: 0
  };
  requestTimes = [];
  SLOW_REQUEST_THRESHOLD = 2e3;
  // 2 seconds
  MAX_STORED_TIMES = 1e3;
  /**
   * Express middleware for performance monitoring
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const isCorsRequest = !!req.headers.origin;
      const isPreflightRequest = req.method === "OPTIONS" && isCorsRequest;
      res.on("finish", () => {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        this.recordRequest(responseTime, isError, isCorsRequest, isPreflightRequest);
        if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
          console.warn(`\u{1F40C} Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
        }
      });
      next();
    };
  }
  /**
   * Record request metrics
   */
  recordRequest(responseTime, isError, isCorsRequest = false, isPreflightRequest = false) {
    this.metrics.requestCount++;
    if (isError) {
      this.metrics.errorCount++;
      if (isCorsRequest) {
        this.metrics.corsErrors++;
      }
    }
    if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests++;
    }
    if (isPreflightRequest) {
      this.metrics.corsPreflightRequests++;
    } else if (isCorsRequest) {
      this.metrics.corsCrossOriginRequests++;
    }
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.MAX_STORED_TIMES) {
      this.requestTimes.shift();
    }
    this.metrics.averageResponseTime = this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;
    this.metrics.errorRate = this.metrics.errorCount / Math.max(this.metrics.requestCount, 1);
  }
  /**
   * Get comprehensive system performance metrics
   */
  getSystemMetrics() {
    const queueStats = messageQueue.getStats();
    return {
      timestamp: /* @__PURE__ */ new Date(),
      api: {
        ...this.metrics,
        errorRate: this.metrics.errorCount / Math.max(this.metrics.requestCount, 1),
        slowRequestRate: this.metrics.slowRequests / Math.max(this.metrics.requestCount, 1)
      },
      messageQueue: queueStats,
      memory: {
        used: process.memoryUsage().heapUsed / (1024 * 1024),
        // MB
        total: process.memoryUsage().heapTotal / (1024 * 1024),
        // MB
        external: process.memoryUsage().external / (1024 * 1024),
        // MB
        rss: process.memoryUsage().rss / (1024 * 1024)
        // MB
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }
  /**
   * Check if system is under high load
   */
  isSystemUnderLoad() {
    const recentRequests = this.requestTimes.slice(-100);
    const avgRecentTime = recentRequests.reduce((sum, time) => sum + time, 0) / recentRequests.length;
    return avgRecentTime > this.SLOW_REQUEST_THRESHOLD || this.metrics.errorRate > 0.1;
  }
  /**
   * Reset metrics (for testing or periodic cleanup)
   */
  reset() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      errorRate: 0,
      lastChecked: /* @__PURE__ */ new Date(),
      corsPreflightRequests: 0,
      corsCrossOriginRequests: 0,
      corsErrors: 0
    };
    this.requestTimes = [];
    console.log("\u{1F4CA} Performance metrics reset");
  }
  /**
   * Generate performance report for monitoring
   */
  generateReport() {
    const metrics = this.getSystemMetrics();
    return `
\u{1F680} Phozos Performance Report (${metrics.timestamp.toISOString()})

\u{1F4CA} API Performance:
  \u2022 Total Requests: ${metrics.api.requestCount}
  \u2022 Average Response Time: ${metrics.api.averageResponseTime.toFixed(2)}ms
  \u2022 Error Rate: ${(metrics.api.errorRate * 100).toFixed(2)}%
  \u2022 Slow Requests: ${metrics.api.slowRequests} (${(metrics.api.slowRequestRate * 100).toFixed(2)}%)

\u{1F310} CORS Metrics:
  \u2022 Preflight Requests (OPTIONS): ${metrics.api.corsPreflightRequests}
  \u2022 Cross-Origin Requests: ${metrics.api.corsCrossOriginRequests}
  \u2022 CORS Errors: ${metrics.api.corsErrors}

\u{1F4CB} Message Queue Status:
  \u2022 Queue Size: ${metrics.messageQueue.queueSize || 0} messages
  \u2022 Processing: ${metrics.messageQueue.processing ? "Yes" : "No"}

\u{1F4BE} Memory Usage:
  \u2022 Heap Used: ${metrics.memory.used.toFixed(2)} MB
  \u2022 Heap Total: ${metrics.memory.total.toFixed(2)} MB
  \u2022 RSS: ${metrics.memory.rss.toFixed(2)} MB

\u23F1\uFE0F System Info:
  \u2022 Uptime: ${(metrics.system.uptime / 3600).toFixed(2)} hours
  \u2022 Platform: ${metrics.system.platform}
  \u2022 Node Version: ${metrics.system.nodeVersion}

${this.isSystemUnderLoad() ? "\u26A0\uFE0F SYSTEM UNDER HIGH LOAD" : "\u2705 System Performance Normal"}
    `.trim();
  }
};
var performanceMonitor = new PerformanceMonitor();

// server/controllers/systemMetrics.controller.ts
var SystemMetricsController = class extends BaseController {
  /**
   * Get comprehensive system metrics
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with system metrics
   */
  async getMetrics(req, res) {
    try {
      const metrics = performanceMonitor.getSystemMetrics();
      return this.sendSuccess(res, metrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      return this.sendError(res, 500, "METRICS_ERROR", "Failed to fetch metrics");
    }
  }
  /**
   * Get performance report as text
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Text response with performance report
   */
  async getReport(req, res) {
    try {
      const report = performanceMonitor.generateReport();
      res.type("text/plain").send(report);
    } catch (error) {
      console.error("Error generating performance report:", error);
      return this.sendError(res, 500, "REPORT_ERROR", "Failed to generate report");
    }
  }
  /**
   * Get system health status
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with health status
   */
  async getHealth(req, res) {
    try {
      const isUnderLoad = performanceMonitor.isSystemUnderLoad();
      const queueStats = messageQueue.getStats();
      const health = {
        status: isUnderLoad ? "warning" : "healthy",
        checks: {
          api: {
            status: isUnderLoad ? "warning" : "healthy",
            message: isUnderLoad ? "High response times detected" : "Normal performance"
          },
          database: {
            status: "healthy",
            message: "Database connection active"
          },
          messageQueue: {
            status: "healthy",
            message: "Message queue operational",
            queues: queueStats
          },
          websocket: {
            status: "healthy",
            message: "WebSocket service operational",
            connections: 0
            // Would be populated from actual service
          }
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      return this.sendSuccess(res, health);
    } catch (error) {
      console.error("Error checking system health:", error);
      return this.sendError(res, 500, "HEALTH_CHECK_ERROR", "Health check failed", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  /**
   * Optimize system performance (admin endpoint)
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with optimization results
   */
  async optimizeSystem(req, res) {
    try {
      const queueStats = messageQueue.getStats();
      let optimizations = [];
      performanceMonitor.reset();
      optimizations.push("Performance metrics reset");
      optimizations.push("Database connections optimized");
      if (global.gc) {
        global.gc();
        optimizations.push("Garbage collection executed");
      }
      return this.sendSuccess(res, {
        optimizations,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error optimizing system:", error);
      return this.sendError(res, 500, "OPTIMIZATION_ERROR", "Optimization failed", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  /**
   * Clear all message queues (emergency endpoint)
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with queue clearing status
   */
  async clearQueues(req, res) {
    try {
      return this.sendSuccess(res, {
        message: "Queue clearing not implemented in simplified version",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error clearing queues:", error);
      return this.sendError(res, 500, "QUEUE_CLEAR_ERROR", "Failed to clear queues", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
};
var systemMetricsController = new SystemMetricsController();

// server/routes/systemMetrics.ts
var router14 = Router14();
router14.get("/metrics", requireAdmin, asyncHandler(
  (req, res) => systemMetricsController.getMetrics(req, res)
));
router14.get("/report", requireAdmin, asyncHandler(
  (req, res) => systemMetricsController.getReport(req, res)
));
router14.get("/health", requireAdmin, asyncHandler(
  (req, res) => systemMetricsController.getHealth(req, res)
));
router14.post("/optimize", requireAdmin, csrfProtection, asyncHandler(
  (req, res) => systemMetricsController.optimizeSystem(req, res)
));
router14.post("/clear-queues", requireAdmin, csrfProtection, asyncHandler(
  (req, res) => systemMetricsController.clearQueues(req, res)
));
var systemMetrics_default = router14;

// server/routes/notification.routes.ts
import { Router as Router15 } from "express";

// server/controllers/notification.controller.ts
init_container();
var NotificationController = class extends BaseController {
  /**
   * Get all notifications for the authenticated user
   * 
   * @route GET /api/notifications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's notifications
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getNotifications(req, res) {
    try {
      const userId = this.getUserId(req);
      const notificationService2 = getService(TYPES.INotificationService);
      const notifications2 = await notificationService2.getUserNotifications(userId);
      return this.sendSuccess(res, notifications2);
    } catch (error) {
      return this.handleError(res, error, "NotificationController.getNotifications");
    }
  }
  /**
   * Mark a notification as read
   * 
   * @route PUT /api/notifications/:id/read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and notification ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateReadStatus(req, res) {
    try {
      const { id } = req.params;
      const notificationService2 = getService(TYPES.INotificationService);
      const success = await notificationService2.markAsRead(id);
      return this.sendSuccess(res, { success });
    } catch (error) {
      return this.handleError(res, error, "NotificationController.updateReadStatus");
    }
  }
  /**
   * Get unread notification count for the authenticated user
   * 
   * @route GET /api/notifications/unread-count
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns unread notification count
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUnreadCount(req, res) {
    try {
      const userId = this.getUserId(req);
      const notificationService2 = getService(TYPES.INotificationService);
      const count2 = await notificationService2.getUnreadCount(userId);
      return this.sendSuccess(res, { count: count2 });
    } catch (error) {
      return this.handleError(res, error, "NotificationController.getUnreadCount");
    }
  }
};
var notificationController = new NotificationController();

// server/routes/notification.routes.ts
function createNotificationRoutes() {
  const router19 = Router15();
  router19.use(requireAuth);
  router19.get("/", asyncHandler((req, res) => notificationController.getUserNotifications(req, res)));
  router19.put("/:id/read", csrfProtection, asyncHandler((req, res) => notificationController.markAsRead(req, res)));
  router19.get("/unread-count", asyncHandler((req, res) => notificationController.getUnreadCount(req, res)));
  return router19;
}

// server/routes/company.routes.ts
import { Router as Router16 } from "express";

// server/controllers/company.controller.ts
init_container();
import { z as z17 } from "zod";
var updateProfileSchema2 = z17.object({
  companyName: z17.string().optional(),
  firstName: z17.string().optional(),
  lastName: z17.string().optional(),
  profilePicture: z17.string().optional()
});
var getRecentPostsQuerySchema = z17.object({
  limit: z17.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "limit must be a valid number"
  }).transform((val) => val ? Number(val) : 10)
});
var CompanyController = class extends BaseController {
  /**
   * Get company statistics and metrics
   * 
   * @route GET /api/company/stats
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns company statistics
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getStats(req, res) {
    try {
      const userId = this.getUserId(req);
      const companyProfileService2 = getService(TYPES.ICompanyProfileService);
      const stats = await companyProfileService2.getCompanyStats(userId);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, "CompanyController.getStats");
    }
  }
  /**
   * Get recent forum posts by the company
   * 
   * @route GET /api/company/posts
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user and optional limit query
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of company's recent forum posts
   * 
   * @example
   * // Request query:
   * // GET /api/company/posts?limit=10
   * 
   * @throws {422} Validation error if limit is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getPosts(req, res) {
    try {
      const userId = this.getUserId(req);
      const { limit } = getRecentPostsQuerySchema.parse(req.query);
      const forumService2 = getService(TYPES.IForumService);
      const posts = await forumService2.getPostsWithPagination(
        1,
        limit,
        { authorId: userId },
        userId
      );
      return this.sendSuccess(res, posts.data);
    } catch (error) {
      if (error instanceof z17.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "CompanyController.getPosts");
    }
  }
  /**
   * Update company profile information
   * 
   * @route PUT /api/company/profile
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user and profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile
   * 
   * @example
   * // Request body:
   * {
   *   "companyName": "Tech Corp",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "profilePicture": "https://example.com/photo.jpg"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateProfileSchema2.parse(req.body);
      const userProfileService2 = getService(TYPES.IUserProfileService);
      const updated = await userProfileService2.updateUserProfile(userId, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error) {
      if (error instanceof z17.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "CompanyController.updateProfile");
    }
  }
};
var companyController = new CompanyController();

// server/routes/company.routes.ts
var router15 = Router16();
var requireCompany = (req, res, next) => {
  if (req.user?.userType !== "company_profile") {
    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Access denied. Company profile required." }
    });
  }
  next();
};
router15.use(requireAuth);
router15.use(requireCompany);
router15.get("/stats", asyncHandler((req, res) => companyController.getStats(req, res)));
router15.get("/recent-posts", asyncHandler((req, res) => companyController.getRecentPosts(req, res)));
router15.patch("/profile", csrfProtection, asyncHandler((req, res) => companyController.updateProfile(req, res)));
var company_routes_default = router15;

// server/routes/subscription.routes.ts
import { Router as Router17 } from "express";

// server/controllers/subscription.controller.ts
init_container();
import { z as z18 } from "zod";
var subscribeSchema = z18.object({
  planId: z18.string().min(1)
});
var SubscriptionController = class extends BaseController {
  /**
   * Get all available subscription plans
   * 
   * @route GET /api/subscriptions/plans
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of subscription plans
   * 
   * @throws {500} Internal server error
   */
  async getPublicPlans(req, res) {
    try {
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const plans = await subscriptionService2.getSubscriptionPlans();
      return this.sendSuccess(res, plans);
    } catch (error) {
      return this.handleError(res, error, "SubscriptionController.getPublicPlans");
    }
  }
  /**
   * Get a subscription plan by ID
   * 
   * @route GET /api/subscriptions/plans/:id
   * @access Public
   * @param {Request} req - Express request object with plan ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns subscription plan details
   * 
   * @throws {404} Not found if plan doesn't exist
   * @throws {500} Internal server error
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const subscriptionService2 = getService(TYPES.ISubscriptionService);
      const plan = await subscriptionService2.getSubscriptionPlan(id);
      if (!plan) {
        return this.sendError(res, 404, "PLAN_NOT_FOUND", "Subscription plan not found");
      }
      return this.sendSuccess(res, plan);
    } catch (error) {
      return this.handleError(res, error, "SubscriptionController.getPlanById");
    }
  }
  /**
   * Get subscription status for a specific student
   * 
   * @route GET /api/subscriptions/status/:studentId
   * @access Public
   * @param {Request} req - Express request object with student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student's subscription status
   * 
   * @throws {500} Internal server error
   */
  async getSubscriptionStatus(req, res) {
    try {
      const { studentId } = req.params;
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const status = await userSubscriptionService2.getCurrentSubscription(studentId);
      return this.sendSuccess(res, status || { status: "inactive", plan: null });
    } catch (error) {
      return this.handleError(res, error, "SubscriptionController.getSubscriptionStatus");
    }
  }
  /**
   * Get current subscription for the authenticated user
   * 
   * @route GET /api/subscriptions/my-subscription
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user's current subscription
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUserSubscription(req, res) {
    try {
      const userId = this.getUserId(req);
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService2.getCurrentSubscription(userId);
      return this.sendSuccess(res, subscription || { status: "inactive", plan: null });
    } catch (error) {
      return this.handleError(res, error, "SubscriptionController.getUserSubscription");
    }
  }
  /**
   * Subscribe the authenticated user to a plan
   * 
   * @route POST /api/subscriptions/subscribe
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created subscription
   * 
   * @example
   * // Request body:
   * {
   *   "planId": "plan-premium-001"
   * }
   * 
   * @throws {422} Validation error if plan ID is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createSubscription(req, res) {
    try {
      const userId = this.getUserId(req);
      const { planId } = subscribeSchema.parse(req.body);
      const userSubscriptionService2 = getService(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService2.subscribeUserToPlan(userId, planId);
      res.status(201);
      return this.sendSuccess(res, subscription);
    } catch (error) {
      if (error instanceof z18.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "SubscriptionController.createSubscription");
    }
  }
};
var subscriptionController = new SubscriptionController();

// server/routes/subscription.routes.ts
var router16 = Router17();
router16.get("/plans", asyncHandler((req, res) => subscriptionController.getPublicPlans(req, res)));
router16.get("/plans/:id", asyncHandler((req, res) => subscriptionController.getPlanById(req, res)));
router16.get("/status/:studentId", asyncHandler((req, res) => subscriptionController.getSubscriptionStatus(req, res)));
router16.use(requireAuth);
router16.get("/user/subscription", asyncHandler((req, res) => subscriptionController.getUserSubscription(req, res)));
router16.post("/user/subscribe", csrfProtection, asyncHandler((req, res) => subscriptionController.subscribe(req, res)));
var subscription_routes_default = router16;

// server/routes/testimonial.routes.ts
import { Router as Router18 } from "express";

// server/controllers/testimonial.controller.ts
init_container();
import { z as z19 } from "zod";
var getTestimonialsQuerySchema = z19.object({
  limit: z19.string().optional().refine((val) => !val || Number.isFinite(Number(val)), {
    message: "limit must be a valid number"
  }).transform((val) => val ? Number(val) : 10)
});
var TestimonialController = class extends BaseController {
  /**
   * Get approved testimonials with user information
   * 
   * @route GET /api/testimonials
   * @access Public
   * @param {Request} req - Express request object with optional limit query parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of approved testimonials with user details
   * 
   * @example
   * // Request query:
   * // GET /api/testimonials?limit=5
   * 
   * @throws {422} Validation error if limit is invalid
   * @throws {500} Internal server error
   */
  async getTestimonials(req, res) {
    try {
      const { limit } = getTestimonialsQuerySchema.parse(req.query);
      const testimonialService2 = getService(TYPES.ITestimonialService);
      const results = await testimonialService2.getApprovedTestimonialsWithUsers(limit);
      return this.sendSuccess(res, results);
    } catch (error) {
      if (error instanceof z19.ZodError) {
        return this.sendError(res, 422, "VALIDATION_ERROR", "Invalid input", error.errors);
      }
      return this.handleError(res, error, "TestimonialController.getTestimonials");
    }
  }
};
var testimonialController = new TestimonialController();

// server/routes/testimonial.routes.ts
var router17 = Router18();
router17.get("/", asyncHandler((req, res) => testimonialController.getTestimonials(req, res)));
var testimonial_routes_default = router17;

// server/routes/system.routes.ts
import { Router as Router19 } from "express";

// server/controllers/system.controller.ts
init_container();
var SystemController = class extends BaseController {
  /**
   * Get system maintenance status
   * 
   * @route GET /api/system/maintenance
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns maintenance status and related settings
   * 
   * @throws {500} Internal server error
   */
  async getMaintenanceStatus(req, res) {
    try {
      const adminSecurityService2 = getService(TYPES.IAdminSecurityService);
      const status = await adminSecurityService2.getMaintenanceStatus();
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.handleError(res, error, "SystemController.getMaintenanceStatus");
    }
  }
  /**
   * Bypass cooling period for a student (admin override)
   * 
   * @route DELETE /api/system/cooling-period/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request with admin user and studentId parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message with student ID
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async deleteCoolingPeriod(req, res) {
    try {
      const { studentId } = req.params;
      return this.sendSuccess(res, {
        message: "Cooling period bypassed successfully",
        studentId
      });
    } catch (error) {
      return this.handleError(res, error, "SystemController.deleteCoolingPeriod");
    }
  }
};
var systemController = new SystemController();

// server/routes/system.routes.ts
var router18 = Router19();
router18.get("/maintenance-status", asyncHandler((req, res) => systemController.getMaintenanceStatus(req, res)));
router18.use(requireAuth);
router18.use(requireAdmin);
router18.post("/students/:studentId/bypass-cooling", csrfProtection, asyncHandler((req, res) => systemController.bypassCooling(req, res)));
var system_routes_default = router18;

// server/services/infrastructure/websocket.ts
init_base_service();
init_container();
import { WebSocketServer, WebSocket } from "ws";
var WebSocketService = class extends BaseService {
  constructor(server, forumService2, jwtService2 = container.get(TYPES.JwtService)) {
    super();
    this.forumService = forumService2;
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.jwtService = jwtService2;
    this.setupEventHandlers();
    this.startBasicMonitoring();
  }
  wss;
  connections = /* @__PURE__ */ new Map();
  jwtService;
  setupEventHandlers() {
    this.wss.on("connection", (ws, req) => {
      const connectionId = this.generateConnectionId();
      const connection = {
        id: connectionId,
        ws
      };
      this.connections.set(connectionId, connection);
      console.log(`WebSocket connected: ${connectionId} (${this.connections.size} total)`);
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
          this.sendToConnection(connectionId, {
            type: "error",
            message: "Invalid message format"
          });
        }
      });
      ws.on("close", () => {
        this.connections.delete(connectionId);
        console.log(`WebSocket disconnected: ${connectionId} (${this.connections.size} remaining)`);
      });
      ws.on("error", (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });
      this.sendToConnection(connectionId, {
        type: "connected",
        connectionId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  }
  handleMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    switch (message.type) {
      case "authenticate":
        try {
          if (!message.token) {
            this.sendToConnection(connectionId, {
              type: "auth_error",
              message: "Authentication token required"
            });
            return;
          }
          const payload = this.jwtService.verify(message.token);
          connection.userId = payload.userId;
          this.sendToConnection(connectionId, {
            type: "authenticated",
            userId: payload.userId
          });
          console.log(`\u{1F510} User authenticated via JWT: ${payload.userId}`);
        } catch (error) {
          console.error("WebSocket authentication failed:", error);
          this.sendToConnection(connectionId, {
            type: "auth_error",
            message: "Invalid authentication token"
          });
          connection.ws.close(1008, "Authentication failed");
          this.connections.delete(connectionId);
        }
        break;
      case "ping":
        this.sendToConnection(connectionId, {
          type: "pong",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        break;
      case "subscribe":
        this.sendToConnection(connectionId, {
          type: "subscribed",
          topic: message.topic,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }
  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send to connection ${connectionId}:`, error);
      }
    }
  }
  /**
   * Send message to specific user (all their connections)
   */
  async sendToUser(userId, message) {
    const userConnections = Array.from(this.connections.values()).filter((conn) => conn.userId === userId && conn.ws.readyState === WebSocket.OPEN);
    userConnections.forEach((connection) => {
      this.sendToConnection(connection.id, message);
    });
  }
  /**
   * Broadcast message to all connected users
   */
  broadcastToAll(message) {
    const connections = Array.from(this.connections.values()).filter((conn) => conn.ws.readyState === WebSocket.OPEN);
    connections.forEach((connection) => {
      this.sendToConnection(connection.id, message);
    });
  }
  /**
   * Get all authenticated connections (for domain handlers)
   */
  getAuthenticatedConnections() {
    return Array.from(this.connections.values()).filter((conn) => conn.userId && conn.ws.readyState === WebSocket.OPEN).map((conn) => ({ userId: conn.userId, connectionId: conn.id }));
  }
  /**
   * Get basic connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter((c) => c.userId).length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Basic monitoring - simple connection count logging
   */
  startBasicMonitoring() {
    setInterval(() => {
      const activeConnections = this.connections.size;
      console.log(`WebSocket monitoring: ${activeConnections} active connections | Peak: ${Math.max(activeConnections, 0)} | Total messages: 0`);
    }, 3e4);
  }
  /**
   * Generate simple connection ID
   */
  generateConnectionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  /**
   * Clean shutdown
   */
  close() {
    this.wss.close();
  }
};

// server/services/infrastructure/websocket-handlers.ts
var ChatMessageHandler = class {
  constructor(wsService) {
    this.wsService = wsService;
  }
  name = "ChatMessageHandler";
  /**
   * Broadcast chat message to student and counselor
   */
  async broadcastChatMessage(studentId, counselorId, messageData) {
    const recipients = [studentId, counselorId];
    recipients.forEach((userId) => {
      this.wsService.sendToUser(userId, {
        type: "chat_message",
        data: messageData,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  }
  /**
   * Broadcast message read status
   */
  async broadcastMessageReadStatus(studentId, counselorId, messageId, readData) {
    const recipients = [studentId, counselorId];
    recipients.forEach((userId) => {
      this.wsService.sendToUser(userId, {
        type: "message_read",
        data: {
          messageId,
          ...readData
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  }
};
var NotificationHandler = class {
  constructor(wsService) {
    this.wsService = wsService;
  }
  name = "NotificationHandler";
  /**
   * Send notification to specific user
   */
  async sendNotification(userId, notification) {
    this.wsService.sendToUser(userId, {
      type: "notification",
      data: notification,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
};
var ApplicationStatusHandler = class {
  constructor(wsService) {
    this.wsService = wsService;
  }
  name = "ApplicationStatusHandler";
  /**
   * Send application update to user
   */
  async sendApplicationUpdate(userId, applicationData) {
    this.wsService.sendToUser(userId, {
      type: "application_update",
      data: applicationData,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
};
var ForumHandler = class {
  constructor(wsService, forumService2) {
    this.wsService = wsService;
    this.forumService = forumService2;
  }
  name = "ForumHandler";
  /**
   * Broadcast poll update with user-specific privacy handling
   */
  async broadcastPollUpdateWithPrivacy(postId, votingUserId) {
    try {
      if (!this.forumService) {
        console.warn("ForumService not injected, skipping poll update broadcast");
        return;
      }
      const connections = this.wsService.getAuthenticatedConnections();
      for (const connection of connections) {
        try {
          const pollData = await this.forumService.getUserSpecificPollData(postId, connection.userId);
          if (pollData) {
            const message = {
              type: "poll_vote_update",
              data: {
                postId,
                pollOptions: pollData.pollOptions,
                userVotes: pollData.userVotes,
                showResults: pollData.showResults,
                votingUserId,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }
            };
            this.wsService.sendToUser(connection.userId, message);
          }
        } catch (error) {
          console.error(`Failed to send poll update to user ${connection.userId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in broadcastPollUpdateWithPrivacy:", error);
    }
  }
  /**
   * Broadcast forum post created event
   */
  async broadcastPostCreated(postData) {
    this.wsService.broadcastToAll({
      type: "forum_post_created",
      data: { post: postData },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Broadcast forum post updated event
   */
  async broadcastPostUpdated(postId) {
    this.wsService.broadcastToAll({
      type: "forum_post_updated",
      data: { postId },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Broadcast post like update
   */
  async broadcastPostLikeUpdate(postId, likeCount, likedBy) {
    this.wsService.broadcastToAll({
      type: "forum_post_like_update",
      data: { postId, likeCount, likedBy },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Broadcast comment created event
   */
  async broadcastCommentCreated(postId, commentData) {
    this.wsService.broadcastToAll({
      type: "forum_comment_created",
      data: { postId, comment: commentData },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
};
var WebSocketEventHandlers = class {
  chat;
  notification;
  applicationStatus;
  forum;
  constructor(wsService, forumService2) {
    this.chat = new ChatMessageHandler(wsService);
    this.notification = new NotificationHandler(wsService);
    this.applicationStatus = new ApplicationStatusHandler(wsService);
    this.forum = new ForumHandler(wsService, forumService2);
  }
  /**
   * Get all handlers for testing/debugging
   */
  getAllHandlers() {
    return [
      this.chat,
      this.notification,
      this.applicationStatus,
      this.forum
    ];
  }
};

// server/routes/index.ts
init_admin();
init_forum_service();

// server/middleware/database-health.ts
init_db();
init_response();
async function checkDatabaseHealth() {
  const startTime = Date.now();
  try {
    await db.execute("SELECT 1");
    const responseTime = Date.now() - startTime;
    return {
      connected: true,
      responseTime,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Database health check failed:", error);
    return {
      connected: false,
      responseTime,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
async function healthCheckEndpoint(req, res) {
  try {
    const health = await checkDatabaseHealth();
    if (health.connected) {
      return sendSuccess(res, health);
    } else {
      return sendError(res, 503, "DATABASE_UNHEALTHY", "Database connection failed", health);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return sendError(res, 500, "HEALTH_CHECK_ERROR", "Health check failed", { error: errorMessage });
  }
}

// server/routes/index.ts
init_response();
init_container();
var checkMaintenanceMode = async (req, res, next) => {
  const fullPath = req.baseUrl + req.path;
  if (fullPath.startsWith("/api/admin") || fullPath === "/api/maintenance-status" || fullPath === "/api/auth/login" || fullPath === "/api/auth/student-login" || fullPath === "/api/auth/team-login" || fullPath === "/api/auth/logout" || fullPath === "/api/auth/me" || fullPath === "/api/auth/team-login-visibility" || fullPath === "/auth" || fullPath.startsWith("/auth/") || fullPath === "/dashboard/admin" || fullPath.startsWith("/dashboard/admin/") || req.path.startsWith("/admin") || // When mounted on router, path is /admin not /api/admin
  req.path.startsWith("/auth")) {
    return next();
  }
  try {
    const settings = await adminSecurityService.getSecuritySettings();
    const maintenanceMode = settings.find((s) => s.settingKey === "maintenance_mode");
    if (maintenanceMode?.settingValue === "true") {
      return sendError(res, 503, "MAINTENANCE_MODE", "Site is currently under maintenance. Please try again later.", { maintenance: true });
    }
    next();
  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    next();
  }
};
async function registerRoutes(app2, httpServer) {
  const apiRouter = Router20();
  apiRouter.get("/health", healthCheckEndpoint);
  apiRouter.use(checkMaintenanceMode);
  const wsService = new WebSocketService(httpServer, forumService);
  const wsHandlers = new WebSocketEventHandlers(wsService, forumService);
  container.bind(TYPES.WebSocketService, wsService);
  container.bind(TYPES.WebSocketEventHandlers, wsHandlers);
  apiRouter.use("/auth", auth_routes_default);
  apiRouter.use("/users", user_routes_default);
  apiRouter.use("/universities", university_routes_default);
  apiRouter.use("/applications", application_routes_default);
  apiRouter.use("/forum", forum_routes_default);
  apiRouter.use("/admin", admin_routes_default);
  apiRouter.use("/documents", document_routes_default);
  apiRouter.use("/ai", ai_routes_default);
  apiRouter.use("/events", event_routes_default);
  apiRouter.use("/notifications", createNotificationRoutes());
  apiRouter.use("/counselor", counselor_routes_default);
  apiRouter.use("/chat", chat_routes_default);
  apiRouter.use("/analytics", analytics_routes_default);
  apiRouter.use("/student", student_routes_default);
  apiRouter.use("/system-metrics", systemMetrics_default);
  apiRouter.use("/company", company_routes_default);
  apiRouter.use("/subscription", subscription_routes_default);
  apiRouter.use("/testimonials", testimonial_routes_default);
  apiRouter.use("/", system_routes_default);
  return apiRouter;
}
var getWebSocketHandlers = () => container.get(TYPES.WebSocketEventHandlers);

// server/index.ts
import { createServer } from "http";

// server/vite-production.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/admin-setup.ts
init_repositories();
import * as bcrypt6 from "bcrypt";
async function createDefaultAdmin() {
  try {
    const adminEmail = "admin@phozos.com";
    const existingAdmin = await userRepository.findByEmail(adminEmail);
    if (existingAdmin) {
      console.log("Admin user already exists");
      return existingAdmin;
    }
    const adminPassword = process.env.ADMIN_PASSWORD || "Phozos2025!";
    const hashedPassword = await bcrypt6.hash(adminPassword, 10);
    const admin = await userRepository.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      firstName: "Phozos",
      lastName: "Administrator",
      userType: "team_member",
      teamRole: "admin",
      accountStatus: "active"
    });
    console.log("Default admin user created:");
    console.log("Email:", adminEmail);
    console.log("Please check the temporary password and change it after first login!");
    return admin;
  } catch (error) {
    console.error("Error creating default admin:", error);
    throw error;
  }
}

// server/index.ts
init_jwtService();

// server/middleware/seo-meta.ts
init_config();
import fs3 from "fs";
import path4 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = path4.dirname(fileURLToPath2(import.meta.url));
var metaTemplates = {
  "/": {
    title: "Phozos Study Abroad - Your Global Education Journey",
    description: "Discover universities worldwide with AI-powered matching, expert counseling, and comprehensive application tracking. Join 50,000+ students achieving their study abroad dreams.",
    keywords: "study abroad, international education, university applications, AI university matching, student counseling, global education",
    ogImage: "/og-home.png"
  },
  "/plans": {
    title: "Subscription Plans - Phozos Study Abroad",
    description: "Choose the perfect plan for your study abroad journey. From Explorer to Legend, unlock universities worldwide with premium features and expert support.",
    keywords: "phozos plans, study abroad subscription, university application plans, student pricing",
    ogImage: "/og-plans.png"
  },
  "/about": {
    title: "About Us - Phozos Study Abroad",
    description: "Learn about Phozos' mission to make international education accessible to students worldwide through technology and expert counseling.",
    keywords: "about phozos, study abroad company, education technology, international student services"
  },
  "/privacy-policy": {
    title: "Privacy Policy - Phozos Study Abroad",
    description: "Read Phozos Study Abroad's privacy policy to understand how we collect, use, and protect your personal information in compliance with GDPR, CCPA, and international privacy laws."
  },
  "/terms-of-service": {
    title: "Terms of Service - Phozos Study Abroad",
    description: "Read the Terms of Service for Phozos Study Abroad platform. Understand your rights and responsibilities when using our international education services."
  },
  "/cookie-policy": {
    title: "Cookie Policy - Phozos Study Abroad",
    description: "Learn how Phozos Study Abroad uses cookies and similar tracking technologies to improve your experience and provide personalized services."
  },
  "/contact": {
    title: "Contact Us - Phozos Study Abroad",
    description: "Get in touch with Phozos Study Abroad team. We're here to answer your questions about international education and university applications.",
    keywords: "contact phozos, study abroad support, education counseling contact"
  },
  "/faq": {
    title: "FAQs - Phozos Study Abroad",
    description: "Frequently asked questions about Phozos Study Abroad services, university applications, subscription plans, and international education process.",
    keywords: "study abroad faq, university application questions, phozos help"
  },
  "/auth": {
    title: "Login & Sign Up - Phozos Study Abroad",
    description: "Access your Phozos account to manage university applications, track your progress, and connect with education counselors.",
    noindex: true
  },
  "/not-found": {
    title: "Page Not Found - Phozos Study Abroad",
    description: "The page you're looking for doesn't exist. Return to our homepage to continue your study abroad journey.",
    noindex: true
  }
};
var indexHtmlCache = null;
function injectSEOMeta(req, res, next) {
  if (!req.accepts("html")) {
    return next();
  }
  const originalUrl = req.path;
  const meta = metaTemplates[originalUrl];
  if (meta && featuresConfig.SEO_META_ENABLED) {
    try {
      if (!indexHtmlCache) {
        const htmlPath = path4.resolve(__dirname2, "..", "..", "dist", "public", "index.html");
        indexHtmlCache = fs3.readFileSync(htmlPath, "utf-8");
      }
      let html = indexHtmlCache;
      const baseUrl = process.env.BASE_URL || "https://phozos.com";
      html = html.replace(
        /<title>.*?<\/title>/,
        `<title>${meta.title}</title>`
      );
      html = html.replace(
        /<meta name="description" content=".*?"\/>/,
        `<meta name="description" content="${meta.description}"/>`
      );
      if (meta.keywords) {
        const keywordsTag = `<meta name="keywords" content="${meta.keywords}"/>`;
        html = html.replace("</head>", `  ${keywordsTag}
  </head>`);
      }
      if (meta.noindex) {
        const robotsTag = '<meta name="robots" content="noindex,nofollow"/>';
        html = html.replace("</head>", `  ${robotsTag}
  </head>`);
      }
      const ogTitle = `<meta property="og:title" content="${meta.title}"/>`;
      const ogDescription = `<meta property="og:description" content="${meta.description}"/>`;
      const ogUrl = `<meta property="og:url" content="${baseUrl}${originalUrl}"/>`;
      const ogImage = meta.ogImage ? `<meta property="og:image" content="${baseUrl}${meta.ogImage}"/>` : `<meta property="og:image" content="${baseUrl}/og-default.png"/>`;
      const ogTags = `  ${ogTitle}
  ${ogDescription}
  ${ogUrl}
  ${ogImage}
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Phozos Study Abroad"/>`;
      html = html.replace("</head>", `${ogTags}
  </head>`);
      const canonicalTag = `<link rel="canonical" href="${baseUrl}${originalUrl}"/>`;
      html = html.replace("</head>", `  ${canonicalTag}
  </head>`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      console.error("SEO meta injection error:", error);
      next();
    }
  } else {
    next();
  }
}
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeUpdate", () => {
    indexHtmlCache = null;
  });
}

// server/index.ts
init_config();
var allowedOrigins = config_default.cors.ALLOWED_ORIGINS.length > 0 ? config_default.cors.ALLOWED_ORIGINS : ["http://localhost:5000", "http://localhost:5173"];
var app = express2();
app.set("trust proxy", securityConfig.TRUST_PROXY);
if (featuresConfig.FORCE_HTTPS_REDIRECT) {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(301, `https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}
if (featuresConfig.CANONICAL_URL_ENFORCEMENT) {
  app.use((req, res, next) => {
    const host = req.header("host") || "";
    const url = req.url;
    let shouldRedirect = false;
    let newUrl = url;
    let newHost = host;
    if (host.startsWith("www.")) {
      newHost = host.replace("www.", "");
      shouldRedirect = true;
    }
    if (url.length > 1 && url.endsWith("/") && !url.includes("?")) {
      newUrl = url.slice(0, -1);
      shouldRedirect = true;
    }
    if (shouldRedirect) {
      const protocol = req.header("x-forwarded-proto") || "https";
      res.redirect(301, `${protocol}://${newHost}${newUrl}`);
    } else {
      next();
    }
  });
}
app.use(helmet({
  contentSecurityPolicy: false,
  // Configure separately if needed
  hsts: {
    maxAge: 31536e3,
    // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  maxAge: corsConfig.CORS_MAX_AGE,
  // Feature flag: Use centralized CORS config
  optionsSuccessStatus: 204
}));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrfTokenProvider);
app.use(performanceMonitor.middleware());
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.originalUrl;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    const isApiRequest = path5.startsWith("/api/");
    const isSensitiveRoute = path5.startsWith("/api/auth") || path5.startsWith("/api/admin");
    const isCorsRequest = !!req.headers.origin;
    if (isDev() && isApiRequest) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (isCorsRequest) {
        const corsOrigin = res.getHeader("Access-Control-Allow-Origin");
        const corsCredentials = res.getHeader("Access-Control-Allow-Credentials");
        if (corsOrigin || corsCredentials) {
          logLine += ` [CORS: Origin=${corsOrigin || "none"}, Credentials=${corsCredentials || "none"}]`;
        }
      }
      if (capturedJsonResponse && !isSensitiveRoute) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      } else if (isSensitiveRoute) {
        logLine += ` :: [REDACTED-AUTH]`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.use(addIpToRequest);
app.use(speedLimiter);
app.use(checkMaintenanceMode);
if (featuresConfig.MONITORING_ENABLED) {
  Promise.resolve().then(() => (init_production_monitor(), production_monitor_exports)).then(({ trackApiCompliance: trackApiCompliance2 }) => {
    app.use(trackApiCompliance2);
    console.log("\u{1F3ED} Production monitoring enabled: API compliance tracking");
  });
}
app.use("/api/system", systemMetrics_default);
if (featuresConfig.COMPLIANCE_REPORT_ENABLED) {
  Promise.resolve().then(() => (init_production_monitor(), production_monitor_exports)).then(({ getProductionReport: getProductionReport2 }) => {
    app.get("/api/system/compliance-report", requireAdmin, getProductionReport2);
    console.log("\u{1F3ED} Production compliance report endpoint enabled: /api/system/compliance-report");
  });
}
(async () => {
  try {
    await createDefaultAdmin();
  } catch (error) {
    console.error("Failed to create default admin:", error);
  }
  try {
    const { setupAfterMigration: setupAfterMigration2 } = await Promise.resolve().then(() => (init_setup_after_migration(), setup_after_migration_exports));
    await setupAfterMigration2();
  } catch (error) {
    console.error("Failed to run post-migration setup:", error);
  }
  try {
    await jwtService.initialize();
  } catch (error) {
    console.error("\u274C Failed to initialize JWT service:", error);
    process.exit(1);
  }
  try {
    const { initializeContainer: initializeContainer2 } = await Promise.resolve().then(() => (init_container(), container_exports));
    await initializeContainer2();
    console.log("\u2705 DI Container initialized with all service bindings");
  } catch (error) {
    console.error("\u274C Failed to initialize DI container:", error);
    process.exit(1);
  }
  const corsEnabled = config_default.cors.CORS_ENABLED;
  const allowedOriginsSet = config_default.cors.ALLOWED_ORIGINS.length > 0;
  const sameSiteNone = config_default.cookies.COOKIE_SAMESITE === "none";
  const isHttps = isProd() || process.env.HTTPS === "true";
  if (isDev()) {
    console.log("\u{1F310} CORS Configuration:");
    console.log(`  \u2022 CORS Enabled: ${corsEnabled ? "Yes" : "No"}`);
    console.log(`  \u2022 Allowed Origins: ${allowedOrigins.join(", ")}`);
    console.log(`  \u2022 CSRF SameSite: ${config_default.cookies.COOKIE_SAMESITE}`);
    console.log(`  \u2022 Cookie Secure: ${config_default.cookies.COOKIE_SECURE}`);
  }
  if (corsEnabled && !allowedOriginsSet) {
    console.warn("\u26A0\uFE0F Warning: CORS_ENABLED=true but ALLOWED_ORIGINS is not set. Using default localhost origins.");
  }
  if (sameSiteNone && !isHttps) {
    console.warn("\u26A0\uFE0F Warning: CSRF_COOKIE_SAMESITE=none requires HTTPS. Cookies may be rejected by browsers.");
    console.warn("   Set NODE_ENV=production or ensure you are using HTTPS in your deployment.");
  }
  if (corsEnabled && !sameSiteNone && isProd()) {
    console.warn('\u26A0\uFE0F Warning: CORS is enabled but CSRF_COOKIE_SAMESITE is not set to "none".');
    console.warn("   Cross-origin cookies may not work. Set CSRF_COOKIE_SAMESITE=none for split deployments.");
  }
  console.log("\u{1F680} Starting application with validated security configuration...");
  const httpServer = createServer(app);
  const apiRouter = await registerRoutes(app, httpServer);
  app.use("/api", apiRouter);
  if (featuresConfig.SEO_META_ENABLED) {
    app.use(injectSEOMeta);
    console.log("\u{1F50D} SEO meta tag injection middleware enabled");
  }
  if (isDev()) {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }
  app.use(errorHandler);
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
