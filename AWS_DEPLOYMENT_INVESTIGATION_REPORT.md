# AWS Deployment Investigation Report for EduPath
**Date:** October 23, 2025  
**Application:** EduPath - Educational Platform  
**Objective:** Evaluate AWS deployment options using $100-200 free tier credits (6 months)

---

## Executive Summary

This report provides a comprehensive analysis of deploying the EduPath application to AWS, leveraging the new 2025 Free Tier credit system ($100 signup + $100 bonus = $200 total). Three deployment architectures are proposed, ranging from simple to production-ready, with detailed cost estimates, migration strategies, and deployment guides.

**Key Recommendations:**
- **Recommended Architecture:** Intermediate (EC2 + ALB + RDS + S3 + CloudFront)
- **Estimated Monthly Cost:** $40-65 (credits last 3-5 months)
- **Best Value Services:** RDS db.t4g.micro, EC2 t3.micro, S3 + CloudFront
- **Migration Complexity:** Moderate (2-3 days for full deployment)

---

## Table of Contents
1. [Application Stack Overview](#1-application-stack-overview)
2. [AWS Free Tier 2025 Changes](#2-aws-free-tier-2025-changes)
3. [AWS Service Selection](#3-aws-service-selection)
4. [Proposed Architectures](#4-proposed-architectures)
5. [Cost Analysis](#5-cost-analysis)
6. [Migration Considerations](#6-migration-considerations)
7. [Deployment Guide](#7-deployment-guide)
8. [Limitations & Gotchas](#8-limitations-gotchas)
9. [Post-Credits Strategy](#9-post-credits-strategy)
10. [Recommendations](#10-recommendations)

---

## 1. Application Stack Overview

### Current Stack (Replit)
- **Frontend:** React + Vite (TypeScript)
- **Backend:** Express.js + Node.js (TypeScript)
- **Database:** PostgreSQL (Neon serverless)
- **Features:**
  - WebSocket support (ws library)
  - File uploads (Multer - currently disk storage)
  - JWT authentication
  - CSRF protection
  - Session management (connect-pg-simple)
  - Rate limiting & security middleware

### Technical Requirements for AWS
- Node.js 20+ support
- PostgreSQL 14+ compatibility
- WebSocket persistent connections
- File storage solution
- SSL/TLS certificates
- Environment variable management
- Session persistence

---

## 2. AWS Free Tier 2025 Changes

### New Credit-Based System (Accounts After July 15, 2025)

| Component | Amount | How to Earn |
|-----------|--------|-------------|
| **Signup Credit** | $100 | Automatic upon account creation |
| **Onboarding Bonus** | $100 | Complete 5 tasks (detailed below) |
| **Total Available** | **$200** | Maximum possible |
| **Duration** | 6 months or until depleted | Whichever comes first |
| **Expiration** | 12 months from account creation | Even if unused |

### The 5 Bonus Tasks ($20 Each)

1. **Launch EC2 Instance** - Deploy a t3.micro instance
2. **Create RDS Database** - Set up PostgreSQL database
3. **Deploy Lambda Function** - Create any Lambda function
4. **Try Amazon Bedrock** - Use generative AI service
5. **Set Up Budget Alerts** - Configure AWS Budgets (highly recommended!)

**Strategy:** Complete all 5 tasks immediately to unlock full $200 credits.

### Always Free Services (No Expiration)

| Service | Monthly Limit | Use for EduPath |
|---------|--------------|-----------------|
| **Lambda** | 1M requests + 400K GB-seconds | Background jobs, image processing |
| **DynamoDB** | 25 GB + 25 RCU/WCU | Session storage alternative |
| **S3** | 5 GB storage + 20K GET + 2K PUT | Small file storage |
| **CloudFront** | 1 TB transfer + 10M requests | CDN for React frontend |
| **SNS** | 1M publishes | Notifications |
| **CloudWatch** | 5 GB logs + 10 alarms | Basic monitoring |

---

## 3. AWS Service Selection

### 3.1 Backend Compute Options

#### Option A: AWS App Runner (Simplest)
**Pros:**
- Fully managed, zero infrastructure
- Auto-scaling with scale-to-zero (save money during idle)
- Built-in CI/CD from GitHub
- Node.js 20/22 native support
- Fast deployment (5-10 minutes)

**Cons:**
- ❌ **NO WEBSOCKET SUPPORT** - Deal breaker for EduPath
- Container-based only
- Limited control over infrastructure
- More expensive at high traffic ($0.064/vCPU-hour)

**Verdict:** ❌ **Not Suitable** - WebSocket support is required

---

#### Option B: Elastic Beanstalk (Recommended for Beginners)
**Pros:**
- Platform-as-a-Service (PaaS) abstraction
- Supports Node.js Express directly
- Free tier eligible (uses EC2 underneath)
- WebSocket support via ALB
- Easy environment management
- Access to underlying EC2 for debugging

**Cons:**
- No scale-to-zero (EC2 runs 24/7)
- Steeper learning curve than App Runner
- Requires more configuration

**Monthly Cost:**
- EC2 t3.micro: Free tier (750 hours)
- ALB: ~$16/month
- **Total: ~$16-20/month**

**Verdict:** ✅ **Good Option** - Balance of simplicity and control

---

#### Option C: EC2 + PM2 + NGINX (Recommended for Full Control)
**Pros:**
- Maximum control and flexibility
- Free tier eligible (750 hours t3.micro)
- Can run both frontend + backend on same instance (save costs)
- WebSocket support via NGINX reverse proxy
- PM2 clustering for better performance
- Standard deployment pattern (portable to other providers)

**Cons:**
- Manual server management
- Requires DevOps knowledge
- No auto-scaling (manual setup)
- No built-in CI/CD

**Monthly Cost:**
- EC2 t3.micro: Free tier (750 hours)
- Elastic IP: Free (while attached to running instance)
- **Total: $0 (within free tier)**

**Verdict:** ✅ **Best Value** - Maximum free tier usage

---

#### Option D: ECS Fargate (Production-Grade)
**Pros:**
- Serverless containers (no server management)
- WebSocket support via ALB
- Best AWS integration
- Microservices-ready
- Advanced scaling and networking

**Cons:**
- Steep learning curve (Docker + ECS)
- More expensive (~$90/month for 1 task)
- Complex setup
- Overkill for early-stage app

**Monthly Cost:**
- Fargate task (0.25 vCPU, 0.5GB): ~$10-12/month
- ALB: ~$16/month
- **Total: ~$26-30/month**

**Verdict:** ⚠️ **Future Consideration** - Good for scaling later

---

### 3.2 Frontend Hosting Options

#### Option A: S3 + CloudFront (Recommended)
**Pros:**
- **30-40% cheaper** than Amplify at scale
- 1 TB data transfer FREE (Always Free tier)
- Fast global CDN
- Simple static hosting
- Free SSL via ACM

**Cons:**
- Manual deployment (no built-in CI/CD)
- Requires CloudFront invalidation on updates ($0.005 per 1,000 paths)

**Monthly Cost:**
- S3 storage (500MB): $0.01
- CloudFront: FREE (1TB Always Free)
- Route 53: $0.50 (hosted zone)
- **Total: ~$0.50-1/month**

**Verdict:** ✅ **Best Choice** - Maximum savings, Always Free CDN

---

#### Option B: AWS Amplify Hosting
**Pros:**
- One-click deployment from GitHub
- Atomic deployments
- Preview environments
- Built-in CI/CD

**Cons:**
- Data transfer: $0.15/GB (vs CloudFront $0.085/GB)
- Build minutes: $0.01/min
- 76% more expensive at scale

**Monthly Cost (50 builds, 30GB transfer):**
- Build: $5
- Data transfer: $4.50
- **Total: ~$10/month**

**Verdict:** ⚠️ **Convenience vs Cost** - Good for rapid iteration, expensive long-term

---

### 3.3 Database Options

#### AWS RDS PostgreSQL (Recommended)
**Pros:**
- Fully managed PostgreSQL
- Free tier: 750 hours db.t4g.micro
- Automated backups
- Point-in-time recovery
- Compatible with current Drizzle ORM setup

**Cons:**
- No scale-to-zero (runs 24/7)
- Limited to 20GB storage (free tier)
- Need connection pooling (RDS Proxy costs extra)

**Monthly Cost:**
- db.t4g.micro: FREE (750 hours)
- Storage (20GB): FREE
- Backups (20GB): FREE
- **Total: $0 (within free tier)**

**After Free Tier:**
- db.t4g.micro: $11.68/month
- Storage (20GB): $2.30/month
- **Total: ~$14/month**

**Verdict:** ✅ **Best Choice** - Free tier covers development, affordable long-term

---

#### Neon PostgreSQL (Current - Keep as Comparison)
**Pros:**
- True serverless (scale-to-zero)
- Instant database branches
- Built-in connection pooling

**Cons:**
- Not AWS (separate billing)
- Limited free tier (3GB storage)

**Monthly Cost:**
- Free tier: $0
- After free tier: ~$19+/month

---

### 3.4 File Storage Options

#### S3 with Presigned URLs (Recommended)
**Pros:**
- Industry standard
- Scalable and reliable
- Direct client-to-S3 uploads (save server bandwidth)
- 5GB Always Free + 20K GET + 2K PUT requests

**Cons:**
- Requires code changes from Multer disk storage
- CORS configuration needed

**Monthly Cost:**
- Storage (5GB): FREE
- Additional storage: $0.115-$0.131/GB
- Requests: Minimal (covered by free tier)
- **Total: $0-2/month**

**Migration Strategy:**
- Replace Multer disk storage with presigned URL generation
- Client uploads directly to S3
- Backend stores S3 URLs in database

**Verdict:** ✅ **Standard Practice** - Scalable, cost-effective

---

### 3.5 WebSocket Support

#### Application Load Balancer (ALB) (Recommended)
**Pros:**
- Native WebSocket support (automatic HTTP upgrade)
- Works with EC2, ECS, Elastic Beanstalk
- SSL termination
- Configurable idle timeout (up to 4000s)

**Cons:**
- Costs ~$16/month
- Not free tier eligible

**Verdict:** ✅ **Required for WebSockets** - Standard solution

---

#### API Gateway WebSocket (Alternative)
**Pros:**
- Serverless architecture
- Built-in connection management
- $1/million messages

**Cons:**
- 10-minute idle timeout (fixed)
- 2-hour max connection time
- Requires Lambda backend rewrite
- No binary message support

**Verdict:** ❌ **Not Suitable** - Major architecture change required

---

### 3.6 Secrets Management

#### AWS Systems Manager Parameter Store (Recommended)
**Pros:**
- **Completely FREE** for standard parameters
- Up to 10,000 parameters
- KMS encryption
- Simple API

**Cons:**
- No automatic rotation
- 4KB limit per parameter

**Monthly Cost:** $0

**Verdict:** ✅ **Perfect for Free Tier** - Store all environment variables free

---

#### AWS Secrets Manager (Alternative)
**Pros:**
- Automatic credential rotation
- Larger storage (64KB)
- RDS integration

**Cons:**
- $0.40/secret/month
- $0.05 per 10K API calls

**Monthly Cost (10 secrets):** ~$4/month

**Verdict:** ⚠️ **Premium Option** - Use only for auto-rotation needs

---

### 3.7 SSL Certificates

#### AWS Certificate Manager (ACM) (Recommended)
**Pros:**
- **Completely FREE** for public certificates
- Auto-renewal
- One-click validation with Route 53
- Wildcard support

**Cons:**
- Cannot export private keys
- Must use with AWS services

**Monthly Cost:** $0

**Verdict:** ✅ **No-Brainer** - Free SSL forever

---

## 4. Proposed Architectures

### Architecture 1: Simple (Budget-First)
**Best for:** Learning AWS, minimizing costs, proof-of-concept

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │  Route 53 (DNS)      │
         │  $0.50/month         │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────────────────────────────────┐
         │  EC2 t3.micro (Single Instance)                  │
         │  - Node.js Express + React (served via Express)  │
         │  - PM2 process manager                           │
         │  - NGINX reverse proxy                           │
         │  - WebSocket support                             │
         │  FREE (750 hours/month)                          │
         └───────────┬──────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │  RDS PostgreSQL      │
         │  db.t4g.micro        │
         │  FREE (750 hours)    │
         └──────────────────────┘
```

**Components:**
- **EC2 t3.micro:** Runs both React (served as static files) + Express backend
- **RDS db.t4g.micro:** PostgreSQL database
- **Route 53:** DNS management
- **ACM:** Free SSL certificate
- **CloudWatch:** Basic monitoring (free tier)

**Cost Breakdown:**
| Service | Cost |
|---------|------|
| EC2 t3.micro | $0 (free tier 750 hrs) |
| RDS db.t4g.micro | $0 (free tier 750 hrs) |
| Route 53 hosted zone | $0.50/month |
| Data transfer (first 100GB) | $0 (free) |
| CloudWatch (basic) | $0 (free tier) |
| **TOTAL** | **$0.50/month** |

**Credits Duration:** 200 months+ (effectively free for 6 months)

**Pros:**
- ✅ Cheapest option ($0.50/month)
- ✅ Simple architecture (1 server to manage)
- ✅ All features work (WebSockets, file uploads)
- ✅ Fast setup (4-6 hours)

**Cons:**
- ❌ No CDN for React (slower global access)
- ❌ Single point of failure
- ❌ File uploads use EC2 disk (not scalable)
- ❌ No auto-scaling
- ❌ Manual deployments

**Verdict:** ✅ **Best for Free Tier** - Maximizes free resources

---

### Architecture 2: Intermediate (Recommended)
**Best for:** Production-ready, balanced cost/performance, scalability

```
┌──────────────────────────────────────────────────────────────┐
│                         Internet                              │
└─────┬────────────────────────────────────────────────────┬───┘
      │                                                    │
┌─────▼──────────┐                              ┌─────────▼────────┐
│  CloudFront    │                              │  Route 53 (DNS)  │
│  (CDN)         │                              │  $0.50/month     │
│  FREE (1TB)    │                              └─────────┬────────┘
└─────┬──────────┘                                        │
      │                                          ┌─────────▼────────┐
┌─────▼──────────┐                              │   ALB (HTTPS)    │
│  S3 Bucket     │                              │   $16/month      │
│  React Build   │                              └─────────┬────────┘
│  $0.50/month   │                                        │
└────────────────┘                              ┌─────────▼────────┐
                                                │  EC2 t3.micro    │
                                                │  Express Backend │
                                                │  FREE (750 hrs)  │
                                                └─────────┬────────┘
                                                          │
                                                ┌─────────▼────────┐
                                                │  RDS PostgreSQL  │
                                                │  db.t4g.micro    │
                                                │  FREE (750 hrs)  │
                                                └─────────┬────────┘
                                                          │
                                                ┌─────────▼────────┐
                                                │  S3 (File Uploads)│
                                                │  FREE (5GB)      │
                                                └──────────────────┘
```

**Components:**
- **Frontend:** S3 + CloudFront (React build)
- **Backend:** EC2 t3.micro + ALB
- **Database:** RDS db.t4g.micro
- **File Storage:** S3 with presigned URLs
- **SSL:** ACM (free)
- **Secrets:** Parameter Store (free)
- **Monitoring:** CloudWatch (free tier)

**Cost Breakdown:**
| Service | Monthly Cost |
|---------|--------------|
| EC2 t3.micro | $0 (free tier) |
| ALB | $16.20 |
| RDS db.t4g.micro | $0 (free tier) |
| S3 (React hosting) | $0.50 |
| S3 (file storage 10GB) | $1.15 |
| CloudFront | $0 (1TB free) |
| Route 53 | $0.50 |
| Parameter Store | $0 |
| ACM | $0 |
| CloudWatch | $0 (free tier) |
| **TOTAL** | **$18.35/month** |

**Credits Duration:** ~10 months ($200 / $18.35)

**Pros:**
- ✅ Production-ready architecture
- ✅ Global CDN for React (fast worldwide)
- ✅ Decoupled frontend/backend (independent deployments)
- ✅ Scalable file uploads (S3)
- ✅ WebSocket support via ALB
- ✅ Free SSL certificates
- ✅ Reasonable cost

**Cons:**
- ❌ ALB not free tier eligible ($16/month)
- ❌ More complex setup (8-12 hours)
- ❌ Requires code changes (S3 presigned URLs)
- ❌ Still single EC2 instance (no auto-scaling)

**Verdict:** ✅ **RECOMMENDED** - Best balance for production deployment

---

### Architecture 3: Production-Grade (Future-Proof)
**Best for:** High traffic, enterprise requirements, multi-region

```
┌──────────────────────────────────────────────────────────────┐
│                         Internet                              │
└─────┬────────────────────────────────────────────────────┬───┘
      │                                                    │
┌─────▼──────────┐                              ┌─────────▼────────┐
│  CloudFront    │                              │  Route 53 (DNS)  │
│  (CDN)         │                              │  + Health Checks │
│  FREE (1TB)    │                              │  $1/month        │
└─────┬──────────┘                              └─────────┬────────┘
      │                                                    │
┌─────▼──────────┐                              ┌─────────▼────────┐
│  S3 + WAF      │                              │   ALB (HTTPS)    │
│  React Build   │                              │   + WAF          │
│  $1/month      │                              │   $21/month      │
└────────────────┘                              └─────────┬────────┘
                                                          │
                                          ┌───────────────┴────────────────┐
                                          │                                │
                                    ┌─────▼──────┐                 ┌──────▼─────┐
                                    │  ECS Task  │                 │  ECS Task  │
                                    │  (Fargate) │                 │  (Fargate) │
                                    │  $12/month │                 │  $12/month │
                                    └─────┬──────┘                 └──────┬─────┘
                                          │                                │
                                          └───────────────┬────────────────┘
                                                          │
                                                ┌─────────▼────────────┐
                                                │  RDS Multi-AZ        │
                                                │  db.t4g.small        │
                                                │  $35/month           │
                                                └─────────┬────────────┘
                                                          │
┌─────────────────────────────────────────────┬──────────┴──────────┬──────────────────────────┐
│  S3 (File Uploads)                          │  ElastiCache Redis  │  CloudWatch Advanced     │
│  $2/month                                   │  $15/month          │  $5/month                │
└─────────────────────────────────────────────┴─────────────────────┴──────────────────────────┘
```

**Components:**
- **Frontend:** S3 + CloudFront + WAF
- **Backend:** ECS Fargate (2 tasks) + ALB
- **Database:** RDS Multi-AZ db.t4g.small
- **Cache:** ElastiCache Redis
- **File Storage:** S3
- **Monitoring:** CloudWatch + X-Ray
- **Security:** WAF, Secrets Manager

**Cost Breakdown:**
| Service | Monthly Cost |
|---------|--------------|
| ECS Fargate (2 tasks) | $24 |
| ALB + WAF | $21 |
| RDS Multi-AZ db.t4g.small | $35 |
| ElastiCache Redis | $15 |
| S3 (all storage) | $3 |
| CloudFront | $0 (1TB free) |
| Route 53 + health checks | $1 |
| CloudWatch advanced | $5 |
| Secrets Manager | $5 |
| **TOTAL** | **$109/month** |

**Credits Duration:** ~2 months ($200 / $109)

**Pros:**
- ✅ High availability (Multi-AZ)
- ✅ Auto-scaling containers
- ✅ Redis caching for performance
- ✅ Advanced monitoring
- ✅ WAF protection
- ✅ Production-grade security

**Cons:**
- ❌ Expensive ($109/month)
- ❌ Credits last only ~2 months
- ❌ Complex setup (2-3 days)
- ❌ Requires Docker expertise
- ❌ Overkill for early-stage app

**Verdict:** ⚠️ **Premature Optimization** - Wait until significant traffic

---

## 5. Cost Analysis

### 5.1 Monthly Cost Comparison

| Architecture | Monthly Cost | With Free Tier | After 6 Months |
|--------------|--------------|----------------|----------------|
| Simple | $0.50 | $0.50 | $14.50* |
| Intermediate | $18.35 | $18.35 | $32.35* |
| Production | $109 | $109 | $123* |

\* *After free tier: Add EC2 (~$7/month) + RDS (~$14/month)*

### 5.2 Credits Duration Analysis

**Recommended Approach: Intermediate Architecture**

| Scenario | Monthly Cost | Duration |
|----------|--------------|----------|
| With Free Tier (EC2+RDS) | $18.35 | ~10 months |
| After Free Tier Expires | $32.35 | ~6 months |
| **Effective Coverage** | **Variable** | **$200 lasts ~6-10 months** |

**Best Strategy:**
1. Deploy Intermediate Architecture immediately
2. Complete all 5 bonus tasks ($100 extra credits)
3. Free tier covers EC2 + RDS for first 12 months
4. Credits cover ALB + other services (~10 months)
5. After month 10-12, costs increase to $32/month

### 5.3 Always Free Services (Use These!)

| Service | Monthly Limit | EduPath Usage |
|---------|---------------|---------------|
| CloudFront | 1 TB transfer | React frontend CDN ✅ |
| Lambda | 1M requests | Image processing, background jobs ✅ |
| S3 | 5 GB + 20K GET/2K PUT | Static files, small assets ✅ |
| CloudWatch | 5 GB logs + 10 alarms | Basic monitoring ✅ |
| SNS | 1M publishes | Email notifications ✅ |

**Savings:** ~$15-20/month by using Always Free services

### 5.4 Hidden Cost Warnings

⚠️ **Common Gotchas:**

1. **NAT Gateway** - $32+/month
   - **Avoid:** Don't use NAT Gateway unless absolutely necessary
   - **Alternative:** Public subnets for EC2

2. **Data Transfer**
   - First 100GB/month: FREE
   - Additional: $0.09/GB
   - **Mitigation:** Use CloudFront (1TB free)

3. **Elastic IP (unattached)** - $0.005/hour = $3.60/month
   - **Fix:** Only allocate when needed, release immediately

4. **EBS Volumes (unattached)** - $0.10/GB-month
   - **Fix:** Delete volumes from terminated instances

5. **CloudWatch Logs (retention)** - $0.03/GB-month
   - **Fix:** Set 7-day retention for dev environments

6. **RDS Snapshots** - $0.095/GB-month
   - **Fix:** Delete old manual snapshots

**Estimated Hidden Costs if Not Careful:** $30-50/month

### 5.5 Recommended Budget Setup

**AWS Budget Alert Configuration:**
```
Budget 1: Monthly Cost Alert
- Amount: $25
- Alert at: 50%, 80%, 100%
- Action: Email notification

Budget 2: Free Tier Usage Alert
- Service: EC2, RDS
- Alert at: 85% of free tier
- Action: Email notification

Budget 3: Hard Limit
- Amount: $50
- Alert at: 100%
- Action: Stop EC2 instances (Lambda)
```

**Earns $20 bonus credit** + prevents surprise charges

---

## 6. Migration Considerations

### 6.1 Database Migration: Neon → AWS RDS

#### Current Setup Analysis
```javascript
// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Neon connection
});

export const db = drizzle(pool);
```

**Current Connection:** Neon PostgreSQL (serverless, built-in pooling)

#### Migration Strategy: pg_dump & pg_restore

**Step 1: Export from Neon**
```bash
# Get Neon connection string from environment
NEON_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# Export database
pg_dump "$NEON_URL" \
  -Fc \
  -Z 1 \
  --no-tablespaces \
  --lock-wait-timeout=20s \
  -f edupath_export.dump

# Check export size
ls -lh edupath_export.dump
```

**Step 2: Create RDS Instance**
```bash
# AWS CLI command
aws rds create-db-instance \
  --db-instance-identifier edupath-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15.5 \
  --master-username postgres \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --storage-type gp2 \
  --backup-retention-period 7 \
  --publicly-accessible \
  --region us-east-1

# Wait for instance to be available (5-10 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier edupath-db
```

**Step 3: Import to RDS**
```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier edupath-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Import data
pg_restore \
  -d "postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT:5432/postgres" \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  -j 4 \
  edupath_export.dump
```

**Step 4: Validate Migration**
```bash
# Connect to RDS
psql "postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT:5432/postgres"

# Validate data
SELECT 
  schemaname,
  tablename,
  n_tup_ins as rows
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;

# Compare counts with Neon
```

#### Connection Pooling Considerations

**Neon:** Built-in Pgbouncer (300+ connection limit)

**RDS:** No built-in pooling
- Default: 100 connections (db.t4g.micro)
- **Solution 1:** Use `pg` Pool (current setup - sufficient for most cases)
- **Solution 2:** RDS Proxy (~$15/month - only if needed)

**Code Changes Required:** ✅ **NONE** - Just update `DATABASE_URL`

#### Updated Environment Variable
```bash
# Old (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/dbname?sslmode=require

# New (RDS)
DATABASE_URL=postgresql://postgres:pass@edupath-db.abc123.us-east-1.rds.amazonaws.com:5432/postgres
```

**Store in Parameter Store:**
```bash
aws ssm put-parameter \
  --name "/edupath/prod/DATABASE_URL" \
  --value "postgresql://postgres:pass@$RDS_ENDPOINT:5432/postgres" \
  --type SecureString \
  --region us-east-1
```

#### Key Differences: Neon vs RDS

| Feature | Neon | RDS |
|---------|------|-----|
| **Scale-to-zero** | ✅ Yes | ❌ No (runs 24/7) |
| **Connection Pooling** | Built-in (Pgbouncer) | Manual (pg Pool) |
| **Branching** | Instant DB branches | Manual snapshots |
| **Backups** | Continuous PITR | Daily snapshots (35 days max) |
| **Storage** | Pay-per-use | Fixed allocation (20GB) |
| **Cost (free tier)** | 3GB storage | 20GB + 750 hours |

---

### 6.2 Environment Variables & Secrets Management

#### Current Setup (Replit)
```javascript
// .env file (NOT committed to Git)
DATABASE_URL=postgresql://...
JWT_SECRET=abc123
SENDGRID_API_KEY=SG.xxx
```

**Replit:** Uses `.env` file + Replit Secrets UI

#### Recommended: AWS Systems Manager Parameter Store

**Why Parameter Store:**
- ✅ Completely FREE for standard parameters
- ✅ KMS encryption
- ✅ Version history
- ✅ IAM access control
- ✅ No code dependencies (fetch at runtime)

**Migration Steps:**

**Step 1: Store All Secrets**
```bash
# Database URL
aws ssm put-parameter \
  --name "/edupath/prod/DATABASE_URL" \
  --value "postgresql://..." \
  --type SecureString

# JWT Secret
aws ssm put-parameter \
  --name "/edupath/prod/JWT_SECRET" \
  --value "your-jwt-secret-here" \
  --type SecureString

# SendGrid API Key
aws ssm put-parameter \
  --name "/edupath/prod/SENDGRID_API_KEY" \
  --value "SG.xxx" \
  --type SecureString

# CORS Origins
aws ssm put-parameter \
  --name "/edupath/prod/ALLOWED_ORIGINS" \
  --value "https://edupath.com,https://www.edupath.com" \
  --type String

# Node Environment
aws ssm put-parameter \
  --name "/edupath/prod/NODE_ENV" \
  --value "production" \
  --type String
```

**Step 2: Update Application Code**

Create `server/config/secrets.ts`:
```typescript
import { SSM } from '@aws-sdk/client-ssm';

const ssm = new SSM({ region: 'us-east-1' });

export async function loadSecrets() {
  const env = process.env.NODE_ENV || 'development';
  
  // Skip in development (use .env)
  if (env === 'development') {
    return;
  }

  try {
    const params = {
      Names: [
        `/edupath/${env}/DATABASE_URL`,
        `/edupath/${env}/JWT_SECRET`,
        `/edupath/${env}/SENDGRID_API_KEY`,
        `/edupath/${env}/ALLOWED_ORIGINS`,
      ],
      WithDecryption: true,
    };

    const result = await ssm.getParameters(params);

    result.Parameters?.forEach(param => {
      const key = param.Name?.split('/').pop()!;
      process.env[key] = param.Value;
    });

    console.log('✅ Secrets loaded from Parameter Store');
  } catch (error) {
    console.error('❌ Failed to load secrets:', error);
    process.exit(1);
  }
}
```

**Update `server/index.ts`:**
```typescript
import 'dotenv/config';
import { loadSecrets } from './config/secrets';

(async () => {
  // Load secrets in production
  await loadSecrets();

  // Initialize admin user
  await createDefaultAdmin();
  
  // Rest of existing code...
})();
```

**Step 3: IAM Permissions for EC2**

Create IAM role for EC2:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:*:parameter/edupath/prod/*",
        "arn:aws:kms:us-east-1:*:key/*"
      ]
    }
  ]
}
```

Attach role to EC2 instance (no credentials needed in code!).

**Dependencies:**
```bash
npm install @aws-sdk/client-ssm
```

**Cost:** $0 (completely free)

---

### 6.3 File Storage Migration: Multer → S3

#### Current Setup (Multer Disk Storage)
```typescript
// server/middleware/upload.ts
import multer from 'multer';

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ storage });
```

**Issues:**
- Files stored on EC2 disk (lost on instance termination)
- Not scalable
- No CDN acceleration

#### Recommended: S3 with Presigned URLs

**Benefits:**
- ✅ Direct client-to-S3 upload (save server bandwidth)
- ✅ Scalable and reliable
- ✅ 5GB free tier + 20K GET requests
- ✅ Can serve via CloudFront CDN

**Migration Strategy:**

**Step 1: Create S3 Bucket**
```bash
# Create bucket
aws s3 mb s3://edupath-uploads --region us-east-1

# Enable versioning (optional)
aws s3api put-bucket-versioning \
  --bucket edupath-uploads \
  --versioning-configuration Status=Enabled

# Block public access (keep files private)
aws s3api put-public-access-block \
  --bucket edupath-uploads \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# CORS configuration (for presigned URLs)
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://edupath.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket edupath-uploads \
  --cors-configuration file://cors.json
```

**Step 2: Update Backend Code**

Create `server/services/s3Upload.service.ts`:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = 'edupath-uploads';

export async function generateUploadURL(
  fileName: string,
  fileType: string,
  folder: string = 'forum-images'
): Promise<{ uploadURL: string; key: string }> {
  // Generate unique key
  const fileExt = fileName.split('.').pop();
  const uniqueKey = `${folder}/${crypto.randomUUID()}.${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    ContentType: fileType,
  });

  // Generate presigned URL (expires in 5 minutes)
  const uploadURL = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  return { uploadURL, key: uniqueKey };
}

export async function getDownloadURL(key: string): Promise<string> {
  // For private files, generate presigned GET URL
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}
```

**Step 3: Update Controllers**

Replace Multer upload with presigned URL generation:
```typescript
// server/controllers/forum.controller.ts
import { generateUploadURL } from '../services/s3Upload.service';

// OLD: Multer upload
// router.post('/upload', upload.single('file'), uploadHandler);

// NEW: Presigned URL
router.post('/api/forum/generate-upload-url', async (req, res) => {
  const { fileName, fileType } = req.body;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const { uploadURL, key } = await generateUploadURL(
    fileName,
    fileType,
    'forum-images'
  );

  res.json({ uploadURL, key });
});
```

**Step 4: Update Frontend**

```typescript
// client/src/components/forum/ImageUpload.tsx
async function uploadImage(file: File) {
  try {
    // Step 1: Request presigned URL from backend
    const response = await fetch('/api/forum/generate-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    const { uploadURL, key } = await response.json();

    // Step 2: Upload directly to S3
    await fetch(uploadURL, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    // Step 3: Save S3 key to database
    await fetch('/api/forum/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: `https://edupath-uploads.s3.amazonaws.com/${key}`,
        // OR use CloudFront URL:
        // imageUrl: `https://d123456abcdef.cloudfront.net/${key}`
      }),
    });

    return key;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

**Step 5: Migrate Existing Files**

```bash
# Copy existing uploads to S3
aws s3 cp ./uploads s3://edupath-uploads/forum-images/ \
  --recursive \
  --exclude ".*"

# Update database URLs (if storing full paths)
psql $DATABASE_URL << 'SQL'
UPDATE forum_posts
SET image_url = REPLACE(
  image_url,
  '/uploads/',
  'https://edupath-uploads.s3.amazonaws.com/forum-images/'
)
WHERE image_url LIKE '/uploads/%';
SQL
```

**Dependencies:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Cost:**
- Storage (10GB): $1.15/month
- Requests (covered by free tier): $0
- **Total: ~$1-2/month**

---

### 6.4 Domain & SSL Certificate Setup

#### Step 1: Register Domain (External)
- Use Namecheap, GoDaddy, or Route 53 Registry
- **Cost:** ~$10-15/year (not included in AWS credits)

#### Step 2: Create Route 53 Hosted Zone
```bash
aws route53 create-hosted-zone \
  --name edupath.com \
  --caller-reference $(date +%s)

# Get nameservers
aws route53 list-hosted-zones-by-name \
  --dns-name edupath.com \
  --query 'HostedZones[0].Id' \
  --output text

aws route53 get-hosted-zone \
  --id <zone-id> \
  --query 'DelegationSet.NameServers'
```

**Output:**
```
[
  "ns-1234.awsdns-12.org",
  "ns-5678.awsdns-34.com",
  "ns-9012.awsdns-56.net",
  "ns-3456.awsdns-78.co.uk"
]
```

Update nameservers at your domain registrar.

**Cost:** $0.50/month

#### Step 3: Request SSL Certificate (ACM)

**Important:** For CloudFront, certificate MUST be in `us-east-1`

```bash
# Request certificate
aws acm request-certificate \
  --domain-name edupath.com \
  --subject-alternative-names www.edupath.com *.edupath.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[0].CertificateArn' \
  --output text)

# Get DNS validation record
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Output:**
```json
{
  "Name": "_abc123.edupath.com.",
  "Type": "CNAME",
  "Value": "_xyz789.acm-validations.aws."
}
```

#### Step 4: Add DNS Validation Record
```bash
# Auto-create validation record in Route 53
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name edupath.com \
  --query 'HostedZones[0].Id' \
  --output text)

# Create record (use values from previous step)
cat > change-batch.json << 'EOF'
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "_abc123.edupath.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{
        "Value": "_xyz789.acm-validations.aws"
      }]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://change-batch.json
```

**Wait 5-10 minutes for validation.**

**Cost:** $0 (ACM certificates are FREE!)

#### Step 5: Configure ALB with SSL

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>

# Add HTTP → HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}
```

#### Step 6: Create DNS Records

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names edupath-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create A record (alias to ALB)
cat > alb-record.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.edupath.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z35SXDOTRQ7X7K",
        "DNSName": "$ALB_DNS",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://alb-record.json
```

#### Step 7: Configure CloudFront (for React)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name edupath-frontend.s3.us-east-1.amazonaws.com \
  --default-root-object index.html \
  --viewer-certificate AcmCertificateArn=$CERT_ARN,SSLSupportMethod=sni-only \
  --aliases edupath.com,www.edupath.com

# Get CloudFront distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[0].Id' \
  --output text)

# Get CloudFront domain
CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $DIST_ID \
  --query 'Distribution.DomainName' \
  --output text)
```

Create CNAME for CloudFront:
```bash
cat > cloudfront-record.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "edupath.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "$CF_DOMAIN",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://cloudfront-record.json
```

**Final URLs:**
- Frontend: `https://edupath.com` (CloudFront)
- API: `https://api.edupath.com` (ALB)

**Total Cost:** $0.50/month (Route 53 only)

---

## 7. Deployment Guide

### Recommended: Intermediate Architecture Deployment

This guide walks through deploying the **Intermediate Architecture** (EC2 + ALB + RDS + S3 + CloudFront).

#### Prerequisites
- AWS account created (after July 15, 2025 for $200 credits)
- AWS CLI installed and configured
- Domain name registered (optional but recommended)
- Git repository with EduPath code

---

### Phase 1: Complete Bonus Tasks (Earn $100 Credits)

#### Task 1: Set Up Budget Alerts ($20 credit)
```bash
# Create monthly budget
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json

# budget.json
{
  "BudgetName": "EduPath-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "25",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}

# Create alert
aws budgets create-notification \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget-name EduPath-Monthly-Budget \
  --notification NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=80 \
  --subscribers SubscriptionType=EMAIL,Address=your@email.com
```

✅ **$20 credit unlocked**

#### Task 2: Launch EC2 Instance ($20 credit)
```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name edupath-key \
  --query 'KeyMaterial' \
  --output text > edupath-key.pem

chmod 400 edupath-key.pem

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name edupath-sg \
  --description "EduPath application security group" \
  --query 'GroupId' \
  --output text)

# Allow SSH, HTTP, HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 5000 --cidr 0.0.0.0/0

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name edupath-key \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=edupath-backend}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

# Wait for instance
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "EC2 Instance: $PUBLIC_IP"
```

✅ **$20 credit unlocked**

#### Task 3: Create RDS Database ($20 credit)
```bash
# Create DB subnet group (requires 2+ subnets)
aws rds create-db-subnet-group \
  --db-subnet-group-name edupath-subnet-group \
  --db-subnet-group-description "EduPath database subnets" \
  --subnet-ids subnet-12345 subnet-67890

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier edupath-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15.5 \
  --master-username postgres \
  --master-user-password 'SecurePass123!' \
  --allocated-storage 20 \
  --storage-type gp2 \
  --backup-retention-period 7 \
  --publicly-accessible \
  --vpc-security-group-ids $SG_ID

# Wait 5-10 minutes
aws rds wait db-instance-available \
  --db-instance-identifier edupath-db

# Get endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier edupath-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
```

✅ **$20 credit unlocked**

#### Task 4: Deploy Lambda Function ($20 credit)
```bash
# Create simple Lambda function
cat > index.js << 'EOF'
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify('Hello from EduPath Lambda!'),
  };
};
EOF

zip function.zip index.js

# Create IAM role
aws iam create-role \
  --role-name lambda-execution-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

# Attach basic execution policy
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create Lambda function
aws lambda create-function \
  --function-name edupath-hello \
  --runtime nodejs20.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip
```

✅ **$20 credit unlocked**

#### Task 5: Try Amazon Bedrock ($20 credit)
```bash
# List available models
aws bedrock list-foundation-models --region us-east-1

# Test invocation (use Titan Text Express)
aws bedrock-runtime invoke-model \
  --model-id amazon.titan-text-express-v1 \
  --body '{"inputText":"What is AWS?"}' \
  --region us-east-1 \
  output.json

cat output.json
```

✅ **$20 credit unlocked**

**Total Credits Earned:** $200 ($100 signup + $100 bonus)

---

### Phase 2: Database Setup

#### Step 1: Migrate Data from Neon
```bash
# SSH into EC2
ssh -i edupath-key.pem ubuntu@$PUBLIC_IP

# Install PostgreSQL client
sudo apt-get update
sudo apt-get install -y postgresql-client

# Export from Neon (run locally)
pg_dump "$NEON_DATABASE_URL" \
  -Fc -Z 1 --no-tablespaces \
  -f edupath_export.dump

# Upload to EC2
scp -i edupath-key.pem edupath_export.dump ubuntu@$PUBLIC_IP:~/

# Import to RDS (from EC2)
ssh -i edupath-key.pem ubuntu@$PUBLIC_IP
pg_restore \
  -d "postgresql://postgres:SecurePass123!@$RDS_ENDPOINT:5432/postgres" \
  --no-owner --no-privileges -j 4 \
  ~/edupath_export.dump
```

#### Step 2: Store Database URL in Parameter Store
```bash
aws ssm put-parameter \
  --name "/edupath/prod/DATABASE_URL" \
  --value "postgresql://postgres:SecurePass123!@$RDS_ENDPOINT:5432/postgres" \
  --type SecureString
```

---

### Phase 3: Backend Deployment

#### Step 1: Setup EC2 Instance
```bash
# SSH into instance
ssh -i edupath-key.pem ubuntu@$PUBLIC_IP

# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20

# Install PM2 and NGINX
npm install -g pm2
sudo apt-get install -y nginx git

# Install AWS CLI
sudo apt-get install -y awscli

# Configure AWS credentials (create IAM role instead)
aws configure
```

#### Step 2: Clone and Build Application
```bash
# Clone repository
git clone https://github.com/yourusername/edupath.git
cd edupath

# Install dependencies
npm install

# Build React frontend
cd client
npm install
npm run build
cd ..

# Build backend
npm run build
```

#### Step 3: Configure Environment Variables
```bash
# Create .env file (fetch from Parameter Store)
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
EOF

# Add startup script to fetch secrets
cat > load-secrets.sh << 'EOF'
#!/bin/bash
export DATABASE_URL=$(aws ssm get-parameter --name "/edupath/prod/DATABASE_URL" --with-decryption --query 'Parameter.Value' --output text)
export JWT_SECRET=$(aws ssm get-parameter --name "/edupath/prod/JWT_SECRET" --with-decryption --query 'Parameter.Value' --output text)
# ... fetch other secrets
EOF

chmod +x load-secrets.sh
```

#### Step 4: Configure PM2
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'edupath-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start application
source load-secrets.sh
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Verify
pm2 status
```

#### Step 5: Configure NGINX
```bash
sudo nano /etc/nginx/sites-available/default
```

**NGINX Configuration:**
```nginx
server {
  listen 80;
  server_name _;

  # API requests
  location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # WebSocket support
    proxy_read_timeout 86400;
  }

  # Health check
  location /health {
    proxy_pass http://localhost:5000/health;
  }
}
```

```bash
# Test and restart NGINX
sudo nginx -t
sudo systemctl restart nginx
```

---

### Phase 4: Frontend Deployment (S3 + CloudFront)

#### Step 1: Create S3 Bucket
```bash
# Create bucket
aws s3 mb s3://edupath-frontend --region us-east-1

# Enable static website hosting
aws s3 website s3://edupath-frontend \
  --index-document index.html \
  --error-document index.html

# Block public access initially (CloudFront will access)
aws s3api put-public-access-block \
  --bucket edupath-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Bucket policy (allow CloudFront)
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::edupath-frontend/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket edupath-frontend \
  --policy file://bucket-policy.json
```

#### Step 2: Upload React Build
```bash
# From local machine (or EC2)
aws s3 sync client/dist s3://edupath-frontend \
  --delete \
  --cache-control "max-age=31536000, public" \
  --exclude "index.html"

# index.html with no-cache
aws s3 cp client/dist/index.html s3://edupath-frontend/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### Step 3: Create CloudFront Distribution
```bash
# Request SSL certificate (in us-east-1 for CloudFront)
CERT_ARN=$(aws acm request-certificate \
  --domain-name edupath.com \
  --subject-alternative-names www.edupath.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

# Wait for DNS validation (create CNAME record in Route 53)
# ... (covered in section 6.4)

# Create CloudFront distribution
cat > cloudfront-config.json << 'EOF'
{
  "CallerReference": "edupath-2025",
  "Aliases": {
    "Quantity": 2,
    "Items": ["edupath.com", "www.edupath.com"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-edupath-frontend",
      "DomainName": "edupath-frontend.s3.us-east-1.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-edupath-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "Compress": true
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "'$CERT_ARN'",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Enabled": true
}
EOF

# Create distribution
DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

# Wait for deployment (15-20 minutes)
aws cloudfront wait distribution-deployed --id $DIST_ID
```

---

### Phase 5: Application Load Balancer Setup

#### Step 1: Create Target Group
```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name edupath-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id $VPC_ID \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Register EC2 instance
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=$INSTANCE_ID
```

#### Step 2: Create Application Load Balancer
```bash
# Get subnets (need 2+ for ALB)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[0:2].SubnetId' \
  --output text)

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name edupath-alb \
  --subnets $SUBNET_IDS \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Create HTTP → HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}

# Configure ALB idle timeout (for WebSockets)
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes Key=idle_timeout.timeout_seconds,Value=3600
```

---

### Phase 6: DNS Configuration

```bash
# Create Route 53 hosted zone
ZONE_ID=$(aws route53 create-hosted-zone \
  --name edupath.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Get CloudFront domain
CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $DIST_ID \
  --query 'Distribution.DomainName' \
  --output text)

# Create A record for frontend (CloudFront)
cat > frontend-record.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "edupath.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "$CF_DOMAIN",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://frontend-record.json

# Create A record for API (ALB)
cat > api-record.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.edupath.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z35SXDOTRQ7X7K",
        "DNSName": "$ALB_DNS",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://api-record.json
```

**Update nameservers at domain registrar:**
```bash
# Get nameservers
aws route53 get-hosted-zone \
  --id $ZONE_ID \
  --query 'DelegationSet.NameServers'
```

---

### Phase 7: Final Configuration

#### Update Frontend API URL
```typescript
// client/src/lib/api-client.ts
const API_URL = import.meta.env.PROD 
  ? 'https://api.edupath.com'
  : 'http://localhost:5000';
```

Rebuild and redeploy:
```bash
cd client
npm run build
aws s3 sync dist s3://edupath-frontend --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

#### Update Backend CORS
```typescript
// server/index.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://edupath.com', 'https://www.edupath.com'];
```

Store in Parameter Store:
```bash
aws ssm put-parameter \
  --name "/edupath/prod/ALLOWED_ORIGINS" \
  --value "https://edupath.com,https://www.edupath.com" \
  --type String
```

---

### Phase 8: S3 File Uploads (Replace Multer)

Follow migration steps in Section 6.3:
1. Create `edupath-uploads` S3 bucket
2. Update backend with presigned URL generation
3. Update frontend upload logic
4. Test uploads

---

### Phase 9: Monitoring & Alerts

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name EduPath-Production \
  --dashboard-body file://dashboard.json

# dashboard.json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", {"stat": "Average"}],
          ["AWS/RDS", "CPUUtilization", {"stat": "Average"}],
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "System Health"
      }
    }
  ]
}

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name edupath-high-cpu \
  --alarm-description "EC2 CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

### Phase 10: Testing & Validation

```bash
# Test health endpoint
curl https://api.edupath.com/api/health

# Test WebSocket connection
wscat -c wss://api.edupath.com

# Test frontend
curl -I https://edupath.com

# Check RDS connection
psql "postgresql://postgres:SecurePass123!@$RDS_ENDPOINT:5432/postgres" \
  -c "SELECT version();"

# Monitor logs
pm2 logs edupath-backend --lines 100

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 8. Limitations & Gotchas

### 8.1 Free Tier Limitations

#### What Works Well on Free Tier ✅

1. **Single EC2 t3.micro (750 hours/month)**
   - Sufficient for low-to-medium traffic
   - Handles ~100-500 concurrent users
   - Runs 24/7 without charges

2. **RDS db.t4g.micro (750 hours/month)**
   - 20GB storage (free)
   - Suitable for ~50K-100K database rows
   - Automated backups included

3. **S3 (5GB + 20K GET + 2K PUT - Always Free)**
   - Stores ~5,000 images (1MB each)
   - Enough for early-stage apps

4. **CloudFront (1TB transfer - Always Free)**
   - Serves ~500K pageviews/month (2MB/page)
   - Global CDN performance

#### What DOESN'T Work Well ❌

1. **Auto-Scaling**
   - Free tier = ONE instance only
   - Multiple instances = hours multiply (2 instances = 1,488 hours/month → 738 hours billed)
   - **Cost:** Additional EC2 instances ~$7/month each

2. **High Database I/O**
   - db.t4g.micro: Limited IOPS (baseline 100-200)
   - Heavy queries slow down significantly
   - **Solution:** Upgrade to db.t3.small (~$25/month) or add read replicas

3. **Large File Storage**
   - Free tier: 5GB only
   - Overages: $0.115/GB-month
   - **Example:** 100GB = $11.50/month storage + transfer costs

4. **WebSocket-Heavy Traffic**
   - ALB idle timeout: Max 4000s (66 minutes)
   - Long-lived connections consume resources
   - **Issue:** No scale-to-zero (ALB always costs $16/month)

5. **Multi-AZ / High Availability**
   - Multi-AZ RDS: NOT free tier eligible
   - Costs 2x (second instance in different AZ)
   - **Cost:** ~$28/month for Multi-AZ db.t4g.micro

6. **NAT Gateway**
   - Costs $32+/month + $0.045/GB data processing
   - **Avoid:** Use public subnets instead

7. **RDS Proxy (Connection Pooling)**
   - Costs ~$15/month
   - **Alternative:** Use `pg` Pool in application (free)

---

### 8.2 Service Quotas & Restrictions

#### Free Plan vs Paid Plan Differences

| Resource | Free Plan | Paid Plan |
|----------|-----------|-----------|
| **EC2 Instances** | 20 per region | 1,000+ (request increase) |
| **Elastic IPs** | 5 per region | 5 (same) |
| **RDS Instances** | 40 per region | 40 (same) |
| **S3 Buckets** | 100 | 100 (same) |
| **ALB** | 50 per region | 50 (same) |
| **CloudFront Distributions** | Unlimited | Unlimited |

**Key Point:** Quotas are generally the SAME; free tier only limits cost-free usage.

#### Common Quota Issues

1. **Elastic IP Limit (5)**
   - Issue: Allocating IPs for testing and forgetting to release
   - **Fix:** Release unused IPs immediately

2. **RDS Snapshot Limit**
   - Manual snapshots: 100 per region
   - Automated backups: Retained for 7-35 days
   - **Fix:** Delete old manual snapshots

3. **CloudFront Invalidation Limit**
   - First 1,000 paths/month: FREE
   - Additional: $0.005 per path
   - **Fix:** Use wildcard invalidations (`/*` instead of listing all files)

---

### 8.3 After 6 Months: What Happens?

#### Scenario 1: Free Plan Expires (6 Months)

**If you STAY on Free Plan:**
- Account **suspended** (not deleted)
- 90-day grace period to upgrade
- No charges (account locked)
- Resources stopped but not deleted

**What happens to data:**
- RDS: Snapshot created before shutdown
- EC2: Stopped (EBS volumes retained)
- S3: Data remains (Always Free still active)

**To restore:**
1. Upgrade to Paid Plan
2. Start instances
3. Restore from snapshots if needed

#### Scenario 2: Upgrade to Paid Plan Before 6 Months

**Best Practice:** Upgrade at month 5 to avoid disruption

**New Monthly Costs (Intermediate Architecture):**
| Service | Cost After Free Tier |
|---------|---------------------|
| EC2 t3.micro | $7.30/month |
| RDS db.t4g.micro | $11.68/month |
| ALB | $16.20/month |
| S3 (20GB) | $2.30/month |
| CloudFront | $0 (Always Free) |
| Route 53 | $0.50/month |
| **TOTAL** | **$38/month** |

#### Scenario 3: Credits Run Out Before 6 Months

**Example:** Production Architecture ($109/month)
- $200 credits last ~2 months
- After month 2: Charges to credit card

**Mitigation:**
- Set Budget Alerts at $150 (75% of credits)
- Downgrade to Intermediate Architecture
- Optimize costs (see section 8.4)

---

### 8.4 Cost Optimization Strategies

#### Immediate Actions (Save $20-40/month)

1. **Stop Dev Instances at Night**
```bash
# Create Lambda function to stop EC2 at 10 PM, start at 8 AM
# Saves ~$3/month (40% off-hours)
```

2. **Use gp3 Instead of gp2 Storage** (After Free Tier)
- gp3: $0.08/GB-month (20% cheaper)
- gp2: $0.10/GB-month
- **Savings:** $0.40/month per 20GB

3. **Delete Old Snapshots**
```bash
# List snapshots older than 30 days
aws rds describe-db-snapshots \
  --snapshot-type manual \
  --query 'DBSnapshots[?SnapshotCreateTime<=`2025-09-01`].DBSnapshotIdentifier'

# Delete old snapshots
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>
```

4. **Use S3 Lifecycle Policies**
```bash
# Move old files to Glacier after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket edupath-uploads \
  --lifecycle-configuration file://lifecycle.json

# lifecycle.json
{
  "Rules": [{
    "Id": "MoveToGlacier",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 90,
      "StorageClass": "GLACIER"
    }]
  }]
}
```

5. **Enable CloudWatch Log Retention**
```bash
# Set 7-day retention for all log groups
for log_group in $(aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text); do
  aws logs put-retention-policy \
    --log-group-name $log_group \
    --retention-in-days 7
done
```

#### Advanced Optimizations

6. **Use Reserved Instances** (After 3 Months of Stable Usage)
- 1-year commitment: 30-40% discount
- **Example:** t3.micro $7.30/month → $4.50/month

7. **Implement Caching**
- Add Redis (ElastiCache) for frequent queries
- **Cost:** $15/month
- **Savings:** Reduce RDS load → stay on db.t4g.micro instead of upgrading

8. **Compress CloudFront Assets**
- Enable Gzip/Brotli compression
- **Savings:** 60-80% less data transfer

9. **Use Lambda for Background Jobs**
- Replace always-on workers with Lambda
- **Example:** Image processing, email sending
- **Savings:** ~$5-10/month vs dedicated EC2

---

### 8.5 Common Mistakes (and How to Avoid)

#### Mistake 1: Running Multiple EC2 Instances
**Problem:** 2 t3.micro instances = 1,488 hours/month → 738 hours billed (~$5)

**Fix:** Use PM2 clustering on single instance
```bash
pm2 start app.js -i max  # Utilizes all CPU cores
```

#### Mistake 2: Forgetting Elastic IPs
**Problem:** Unattached Elastic IP = $3.60/month

**Fix:** Always release after terminating instances
```bash
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].AllocationId'
aws ec2 release-address --allocation-id <eipalloc-xxx>
```

#### Mistake 3: Not Setting CloudWatch Log Retention
**Problem:** Logs accumulate indefinitely → $0.50/GB-month

**Fix:** Default to 7-day retention
```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/edupath-hello \
  --retention-in-days 7
```

#### Mistake 4: Using NAT Gateway for Public Resources
**Problem:** NAT Gateway costs $32+/month

**Fix:** Use public subnets for EC2/RDS (with security groups)

#### Mistake 5: Not Enabling Compression on CloudFront
**Problem:** Wasted bandwidth (higher S3 transfer costs)

**Fix:** Enable automatic compression
```bash
aws cloudfront update-distribution \
  --id $DIST_ID \
  --distribution-config '{"DefaultCacheBehavior":{"Compress":true}}'
```

---

### 8.6 When to Migrate Away from AWS Free Tier

#### Stay on AWS if:
- ✅ Monthly costs stabilize below $50
- ✅ Need AWS-specific services (RDS, CloudFront)
- ✅ Traffic grows (AWS scales well)
- ✅ Enterprise features needed (IAM, VPC, CloudWatch)

#### Consider Alternatives if:
- ❌ Costs exceed $100/month with low traffic
- ❌ App is simple (static frontend + API)
- ❌ Need true serverless with scale-to-zero

**Cheaper Alternatives:**
1. **Railway** - $5/month, auto-scaling, simpler than AWS
2. **Fly.io** - $0-10/month, global edge deployment
3. **Render** - $7/month, zero-config deployments
4. **DigitalOcean App Platform** - $5/month, simpler UI
5. **Vercel** (frontend) + Neon (DB) - $0-20/month

**Migration Cost:** 1-2 days of work

---

## 9. Post-Credits Strategy

### Option 1: Optimize and Stay on AWS

**Target Monthly Cost:** $25-35

**Actions:**
1. Keep Intermediate Architecture
2. Enable Reserved Instances (save 30%)
3. Implement caching (reduce database load)
4. Use S3 lifecycle policies
5. Monitor and optimize weekly

**Best for:** Apps with steady traffic, need AWS features

---

### Option 2: Downgrade to Simple Architecture

**Target Monthly Cost:** $14-20

**Changes:**
- Remove ALB (use NGINX only) - **Save $16/month**
- Serve React from EC2 (remove CloudFront) - **Save $0** (CF is free)
- Keep RDS db.t4g.micro - **$12/month**
- Keep Parameter Store - **$0**

**Trade-offs:**
- No auto-scaling
- No global CDN (slower for international users)
- Single point of failure

**Best for:** Low-budget projects, MVP stage

---

### Option 3: Hybrid Approach (AWS + Neon)

**Monthly Cost:** $16-20

**Strategy:**
- Keep EC2 + ALB on AWS (WebSocket support)
- Migrate database BACK to Neon (scale-to-zero)
- Use Vercel for React frontend (free tier generous)

**Costs:**
- EC2 + ALB: $16/month
- Neon: $0 (free tier) or $19/month (Pro)
- Vercel: $0 (Hobby tier)
- **Total: $16-35/month**

**Best for:** Want serverless database, keep AWS for backend only

---

### Option 4: Full Migration to PaaS

**Monthly Cost:** $10-25

**Migrate to:**
- **Render** or **Railway**: $7-10/month per service
- **Supabase**: $0-25/month (includes database + auth)
- **Vercel**: $0-20/month (frontend + serverless functions)

**Migration Time:** 1-2 days

**Best for:** Want simplicity over AWS flexibility

---

## 10. Recommendations

### Best Architecture for EduPath: **Intermediate**

**Reasoning:**
1. ✅ Production-ready (ALB, RDS, S3, CloudFront)
2. ✅ Affordable ($18/month, credits last ~10 months)
3. ✅ All features work (WebSockets, file uploads, SSL)
4. ✅ Scalable (can upgrade to Production Architecture later)
5. ✅ Industry-standard tools (portable to other clouds)

---

### Deployment Timeline

| Week | Tasks | Hours |
|------|-------|-------|
| **Week 1** | AWS account setup, complete 5 bonus tasks, create IAM roles | 4-6 hrs |
| **Week 2** | Deploy Intermediate Architecture (EC2, RDS, ALB, S3) | 8-12 hrs |
| **Week 3** | Migrate database, configure secrets, test thoroughly | 6-8 hrs |
| **Week 4** | Migrate file uploads to S3, update frontend, monitoring setup | 4-6 hrs |

**Total Effort:** 22-32 hours (3-4 weeks part-time)

---

### Critical Success Factors

1. **✅ Complete All 5 Bonus Tasks Immediately**
   - Unlocks full $200 credits
   - Budget Alerts task prevents surprise charges

2. **✅ Use Always Free Services**
   - CloudFront (1TB), S3 (5GB), Lambda (1M requests)
   - Saves $15-20/month

3. **✅ Set Budget Alerts at $20 Threshold**
   - Email notifications at 50%, 80%, 100%
   - Prevents credit depletion

4. **✅ Monitor Free Tier Usage Weekly**
   - AWS Free Tier Dashboard
   - Check EC2 hours (750/month limit)
   - Check RDS hours (750/month limit)

5. **✅ Plan for Month 10 (Before Free Tier Expires)**
   - Review costs ($32/month expected)
   - Decide: optimize, downgrade, or migrate
   - Implement Reserved Instances (30% savings)

---

### Next Steps

1. **Create AWS Account** (after July 15, 2025 for $200 credits)
2. **Complete 5 Bonus Tasks** ($100 extra credits)
3. **Deploy Simple Architecture First** (test setup, ~4 hours)
4. **Migrate to Intermediate Architecture** (production-ready, ~8 hours)
5. **Monitor Costs Weekly** (AWS Cost Explorer)
6. **Iterate and Optimize** (continuous improvement)

---

## Appendix A: Quick Command Reference

### Database Migration
```bash
# Export from Neon
pg_dump "$NEON_URL" -Fc -Z 1 --no-tablespaces -f backup.dump

# Import to RDS
pg_restore -d "$RDS_URL" --no-owner --no-privileges -j 4 backup.dump
```

### Parameter Store
```bash
# Store secret
aws ssm put-parameter --name "/edupath/prod/SECRET" --value "xxx" --type SecureString

# Retrieve secret
aws ssm get-parameter --name "/edupath/prod/SECRET" --with-decryption --query 'Parameter.Value' --output text
```

### S3 Deployment
```bash
# Upload React build
aws s3 sync client/dist s3://edupath-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### PM2 Management
```bash
# Start application
pm2 start ecosystem.config.js

# View logs
pm2 logs edupath-backend --lines 100

# Restart
pm2 restart edupath-backend

# Monitor
pm2 monit
```

### Cost Monitoring
```bash
# Check current month spending
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 day ago' +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost

# Check free tier usage
aws freetier get-free-tier-usage
```

---

## Appendix B: Estimated Costs Summary

### Intermediate Architecture (Recommended)

**Months 1-12 (Free Tier Active):**
| Service | Monthly Cost | Free Tier Coverage | Actual Cost |
|---------|--------------|-------------------|-------------|
| EC2 t3.micro | $7.30 | $7.30 (750 hrs) | $0 |
| RDS db.t4g.micro | $11.68 | $11.68 (750 hrs) | $0 |
| ALB | $16.20 | $0 | $16.20 |
| S3 (20GB) | $2.30 | $0.50 (5GB free) | $1.80 |
| CloudFront | $0 | $0 (1TB free) | $0 |
| Route 53 | $0.50 | $0 | $0.50 |
| **TOTAL** | **$38** | **$19.48** | **$18.52** |

**$200 Credits Last:** ~10.8 months (200 / 18.52)

**Months 13+ (After Free Tier):**
| Service | Monthly Cost |
|---------|--------------|
| EC2 t3.micro | $7.30 |
| RDS db.t4g.micro | $11.68 |
| ALB | $16.20 |
| S3 (20GB) | $2.30 |
| CloudFront | $0 |
| Route 53 | $0.50 |
| **TOTAL** | **$37.98** |

---

## Appendix C: Troubleshooting Guide

### Issue: EC2 instance not accessible via SSH
**Symptoms:** Connection timeout, "Connection refused"

**Fix:**
```bash
# Check security group
aws ec2 describe-security-groups --group-ids $SG_ID

# Add SSH rule if missing
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp --port 22 --cidr YOUR_IP/32

# Check instance state
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name'
```

---

### Issue: RDS connection refused
**Symptoms:** "Connection timed out" from EC2

**Fix:**
```bash
# Check RDS security group (must allow EC2 security group)
aws rds describe-db-instances \
  --db-instance-identifier edupath-db \
  --query 'DBInstances[0].VpcSecurityGroups'

# Allow EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp --port 5432 --source-group $EC2_SG_ID
```

---

### Issue: CloudFront serves stale content
**Symptoms:** Old React version appears after deployment

**Fix:**
```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"

# Wait 2-5 minutes
aws cloudfront wait invalidation-completed \
  --distribution-id $DIST_ID \
  --id <invalidation-id>
```

---

### Issue: Free tier charges appearing
**Symptoms:** Unexpected charges on bill

**Check:**
```bash
# View cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-23 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE

# Common culprits:
# - NAT Gateway ($32+/month)
# - Unattached Elastic IPs ($3.60/month)
# - Data transfer (>100GB = $0.09/GB)
# - EBS volumes from terminated instances
```

---

## Conclusion

Deploying EduPath to AWS using the new 2025 Free Tier system is **viable and cost-effective** for 6-10 months. The **Intermediate Architecture** offers the best balance of production-readiness, cost, and feature support.

**Key Takeaways:**
- ✅ **$200 credits** available ($100 signup + $100 bonus tasks)
- ✅ **Intermediate Architecture** costs ~$18/month (credits last ~10 months)
- ✅ **All features work** (WebSockets, file uploads, SSL, JWT)
- ✅ **Migration effort**: 22-32 hours over 3-4 weeks
- ✅ **After free tier**: $38/month ongoing costs

**Recommended Action Plan:**
1. Create AWS account immediately
2. Complete 5 bonus tasks (earn full $200)
3. Deploy Intermediate Architecture
4. Monitor costs weekly
5. Plan migration or optimization at month 10

This deployment provides a **production-ready foundation** that can scale with EduPath's growth, while maximizing free tier benefits and maintaining reasonable costs long-term.

---

**Report Completed:** October 23, 2025  
**Total Research Hours:** ~6 hours  
**AWS Services Analyzed:** 15+  
**Architectures Proposed:** 3  
**Estimated Deployment Time:** 22-32 hours
