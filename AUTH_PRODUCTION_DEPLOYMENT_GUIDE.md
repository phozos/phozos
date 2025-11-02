# 🔐 Authentication System Production Deployment Guide
## Deploying Auth Fixes & Upgrades to AWS Lightsail

**Document Version:** 1.0  
**Date:** November 2, 2025  
**Target Environment:** AWS Lightsail Production Server

---

## 📋 Overview

This guide provides step-by-step instructions for deploying authentication system improvements from the AUTH_REMEDIATION_PLAN.md to your production AWS Lightsail server. The improvements are organized into 4 phases, each buildable independently.

### What You're Deploying

| Phase | Priority | Changes | Deployment Time | Downtime |
|-------|----------|---------|-----------------|----------|
| **Phase 1** | CRITICAL | Fix logout bugs with smart token handling | 30-45 min | ~2 min |
| **Phase 2** | HIGH | Add refresh token pattern + database migration | 45-60 min | ~5 min |
| **Phase 3** | MEDIUM | Move refresh tokens to HttpOnly cookies | 30-45 min | ~2 min |
| **Phase 4** | LOW | Add idle timeout, device management, audit logging | 60-90 min | ~2 min |

### Deployment Strategy

**Recommended Approach:** Deploy phases incrementally in order (1 → 2 → 3 → 4)

**Why Incremental?**
- ✅ Easier to test and validate each improvement
- ✅ Lower risk - can rollback individual phases if needed
- ✅ Users benefit from fixes immediately (don't have to wait for all phases)
- ✅ Database migrations happen in controlled steps

---

## 🔍 Pre-Deployment Assessment

### Which Phases Should You Deploy?

**Required:**
- ✅ **Phase 1** - Fixes critical logout bugs affecting users NOW

**Highly Recommended:**
- ✅ **Phase 2** - Industry standard security (refresh tokens)
- ✅ **Phase 3** - XSS protection (HttpOnly cookies)

**Optional:**
- ⚪ **Phase 4** - Enterprise features (idle timeout, device tracking)

### Prerequisites Checklist

Before deploying ANY phase, ensure you have:

- [ ] Active AWS Lightsail server running EduPath
- [ ] SSH access to your Lightsail instance
- [ ] Database connection working (Supabase/Neon)
- [ ] Recent backup of your database
- [ ] Recent backup of your application code
- [ ] Access to your server's `.env` file
- [ ] 30-90 minutes of scheduled maintenance time
- [ ] Ability to monitor logs after deployment

### Environment Requirements

**Server Requirements:**
- Ubuntu 22.04 LTS
- Node.js 20.x
- PM2 process manager
- Nginx (if using domain with SSL)

**Database Requirements:**
- PostgreSQL (Supabase/Neon)
- Database migration tool (Drizzle Kit) installed
- Database backup before Phase 2 deployment

---

## 📦 Phase 1: Critical Logout Bug Fixes

### Overview

**What it fixes:**
- Users getting logged out unexpectedly on page refresh
- Race conditions in token retrieval from localStorage
- Aggressive token clearing on any 401 error

**What changes:**
- Client-side token hydration logic
- Smart 401 error handling
- Retry logic for auth checks
- Diagnostic logging

**Database changes:** None ✅  
**Environment variables:** None ✅  
**User impact:** Immediate improvement - fewer unexpected logouts

---

### Pre-Deployment Testing (Local/Development)

**Before deploying to production, test these scenarios locally:**

1. **Normal page reload test**
   ```
   1. Login to your app
   2. Reload the page 10 times (Ctrl+R or Cmd+R)
   3. Verify: User stays logged in all 10 times
   ```

2. **Tab close/reopen test**
   ```
   1. Login to your app
   2. Close the browser tab
   3. Reopen and navigate to app URL
   4. Verify: User is still logged in
   ```

3. **Network delay simulation**
   ```
   1. Login to your app
   2. Open DevTools → Network tab
   3. Set throttling to "Slow 3G"
   4. Reload page
   5. Verify: User stays logged in (watch for retry in console)
   ```

4. **Verify console logs**
   ```
   Open DevTools → Console and verify logs like:
   - "✅ [AUTH] Token hydrated from localStorage on module load"
   - "✅ [AUTH] Authentication valid, user: [email]"
   ```

**✅ All tests passing?** Proceed to production deployment.  
**❌ Any failures?** Fix issues before deploying to production.

---

### Production Deployment Steps

**⏱️ Estimated Time:** 30-45 minutes  
**🔴 Downtime:** ~2 minutes during app restart

#### Step 1: Connect to Your Lightsail Server

```bash
# Open your Lightsail console
# Click your instance → "Connect using SSH"
```

You'll see the terminal prompt:
```
ubuntu@ip-172-26-3-45:~$
```

---

#### Step 2: Create Backup

**CRITICAL: Always backup before deploying!**

```bash
# Create backup directory with timestamp
mkdir -p ~/backups/backup-phase1-$(date +%Y%m%d-%H%M%S)

# Backup application code
cp -r ~/edupath-app ~/backups/backup-phase1-$(date +%Y%m%d-%H%M%S)/

# Verify backup was created
ls -lh ~/backups/
```

**Expected output:** You should see a folder like `backup-phase1-20251102-143022`

---

#### Step 3: Navigate to Application Directory

```bash
cd ~/edupath-app

# Verify you're in the right place
pwd
```

**Expected output:** `/home/ubuntu/edupath-app`

---

#### Step 4: Pull Latest Code

**Option A: If using Git (Recommended)**

```bash
# Fetch latest code from your repository
git fetch origin

# View what will change
git log HEAD..origin/main --oneline

# Pull the Phase 1 changes
git pull origin main
```

**Option B: If using manual upload**

1. Upload new code via FileZilla (see AWS guide Section 5, Step 8)
2. Extract uploaded files
3. Continue to next step

---

#### Step 5: Stop the Application

```bash
# Stop PM2 process
pm2 stop edupath-production

# Verify it stopped
pm2 status
```

**Expected output:** Status should show `stopped` (red)

---

#### Step 6: Install Dependencies

```bash
# Install any new or updated packages
npm install

# This should take 1-2 minutes
```

**Expected output:** `added X packages` or `up to date`

---

#### Step 7: Rebuild Application

```bash
# Build the TypeScript code
npm run build
```

**Wait 2-4 minutes** for the build to complete.

**Expected output:**
```
✓ built in 45s
dist/public/index.html  1.2 kB
dist/index.js          234 kB
```

---

#### Step 8: Restart Application with PM2

```bash
# Restart the app
pm2 restart edupath-production

# Check status
pm2 status
```

**Expected output:** Status should show `online` (green)

---

#### Step 9: Monitor Logs

```bash
# View real-time logs (press Ctrl+C to exit)
pm2 logs edupath-production
```

**Watch for these SUCCESS indicators:**
```
✅ [AUTH] Token hydrated from localStorage on module load
Server is running on port 5000
Database connected successfully
```

**🚨 ERROR indicators to watch for:**
- `❌ [AUTH] Failed to hydrate token` (rare, usually means localStorage corruption)
- `Database connection failed` (check DATABASE_URL in .env)
- JavaScript errors in the log

**If you see errors:** Proceed to Rollback section below.

---

#### Step 10: Test Production Application

**Open your production URL in a browser:**

```
https://your-domain.com
```

**Perform these quick tests:**

1. **Login test**
   ```
   1. Login with test credentials
   2. Note: You should see auth logs in browser console
   3. Verify successful login
   ```

2. **Page reload test**
   ```
   1. Reload the page 5 times (Ctrl+R)
   2. Verify: You stay logged in all 5 times
   3. Check console for: "✅ [AUTH] Token hydrated from localStorage"
   ```

3. **Tab close test**
   ```
   1. Close the browser tab
   2. Reopen and navigate to your site
   3. Verify: You're still logged in
   ```

4. **Check logs on server**
   ```bash
   # On server, view last 50 log lines
   pm2 logs edupath-production --lines 50
   
   # Verify no errors
   ```

**✅ All tests passing?** Deployment successful!  
**❌ Users reporting issues?** Proceed to Rollback section.

---

### Post-Deployment Monitoring

**First 24 hours after deployment:**

1. **Monitor user reports**
   - Ask users if they're still experiencing unexpected logouts
   - Check support tickets/messages

2. **Check server logs daily**
   ```bash
   pm2 logs edupath-production --lines 200 | grep "AUTH"
   ```

3. **Watch for auth-related errors**
   - Look for patterns in error logs
   - Monitor login success rate

**Success Metrics:**
- ✅ Logout complaints reduced by >90%
- ✅ No increase in error rate
- ✅ Auth logs showing successful token hydration

---

### Rollback Procedure (Phase 1)

**If you encounter issues:**

```bash
# Stop the application
pm2 stop edupath-production

# Navigate to app directory
cd ~/edupath-app

# Remove current version
rm -rf dist node_modules client server shared package-lock.json

# Restore from backup (replace timestamp with your backup folder)
cp -r ~/backups/backup-phase1-20251102-143022/edupath-app/* .

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart edupath-production

# Verify
pm2 logs edupath-production --lines 50
```

**Rollback time:** ~5 minutes

**After rollback:**
- Notify users that you reverted the changes
- Investigate what went wrong before trying again
- Test more thoroughly in development

---

### Known Issues & Troubleshooting (Phase 1)

#### Issue 1: "Token hydrated from localStorage" not appearing in logs

**Symptom:** Console logs missing the hydration message

**Cause:** Browser cache serving old JavaScript

**Fix:**
```bash
# Force rebuild with cache clear
npm run build -- --force

# Restart
pm2 restart edupath-production
```

**User Fix:** Have users do "Hard Reload" (Ctrl+Shift+R or Cmd+Shift+R)

---

#### Issue 2: Users still getting logged out

**Symptom:** Users report still experiencing unexpected logouts

**Diagnosis:**
```bash
# Check logs for specific auth failures
pm2 logs edupath-production | grep "❌ \[AUTH\]"
```

**Common causes:**
1. **Database connection issues** - Check DATABASE_URL
2. **JWT secret mismatch** - Verify JWT_SECRET in .env
3. **Token expiration** - Check server time is correct

**Fix database connection:**
```bash
# Test database connection
nano .env
# Verify DATABASE_URL is correct
# Save and exit

pm2 restart edupath-production
```

---

#### Issue 3: Console showing retry attempts

**Symptom:** Logs show "🔄 [AUTH] Retry attempt 1"

**Is this normal?** Yes! This is the retry logic working as intended.

**When to worry:** If you see retry on EVERY page load (indicates deeper issue)

**Fix if excessive:**
```bash
# Check server response time
pm2 logs edupath-production | grep "Authentication valid"

# If consistently slow, check database
# Consider upgrading Lightsail plan ($10 → $20)
```

---

## 📦 Phase 2: Refresh Token Pattern

### Overview

**What it adds:**
- Dual-token system (access token + refresh token)
- Access tokens expire in 15 minutes (was 24 hours)
- Refresh tokens last 7 days and rotate on use
- Server-side token revocation capability
- New database table for refresh tokens

**What changes:**
- **Database:** New `refresh_tokens` table (requires migration)
- **Backend:** New refresh token service, updated auth controller
- **Frontend:** Automatic token refresh logic
- **Security:** Shorter-lived access tokens, rotating refresh tokens

**Database changes:** ✅ YES - New table  
**Environment variables:** None (uses existing JWT_SECRET)  
**User impact:** More secure, seamless session management

---

### Pre-Deployment Requirements

**CRITICAL: Database backup required!**

This phase creates a new database table. Before proceeding:

1. **Backup your database**
   ```bash
   # On your Lightsail server
   cd ~/edupath-app
   
   # Set your database URL (from .env)
   export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
   
   # Create backup (requires postgresql-client)
   pg_dump $DATABASE_URL > ~/backups/db-backup-phase2-$(date +%Y%m%d-%H%M%S).sql
   
   # Verify backup was created
   ls -lh ~/backups/db-backup-*.sql
   ```

2. **Verify backup is restorable**
   ```bash
   # Check file size (should be several KB to MB depending on your data)
   ls -lh ~/backups/db-backup-*.sql
   
   # View first few lines to verify it's a valid SQL dump
   head -20 ~/backups/db-backup-*.sql
   ```

**✅ Backup created and verified?** Proceed to deployment.  
**❌ Backup failed?** Do not proceed - fix backup first.

---

### Pre-Deployment Testing (Local/Development)

**Test these scenarios in development before production:**

1. **Token refresh test**
   ```
   1. Login to your app
   2. Open DevTools → Network tab
   3. Wait 16 minutes (access token expires at 15 min)
   4. Make any API call (click around the app)
   5. Verify: POST /api/auth/refresh appears in Network tab
   6. Verify: Request succeeded, user stays logged in
   7. Check console for: "✅ [AUTH] Access token refreshed successfully"
   ```

2. **Logout test**
   ```
   1. Login to your app
   2. Logout
   3. Check server logs for refresh token revocation
   4. Try to manually call /api/auth/refresh (should fail with 401)
   ```

3. **Database verification**
   ```sql
   -- In your database client, verify refresh_tokens table exists
   SELECT * FROM refresh_tokens LIMIT 5;
   
   -- Verify columns: id, user_id, token_hash, expires_at, etc.
   ```

**✅ All tests passing?** Proceed to production deployment.

---

### Production Deployment Steps

**⏱️ Estimated Time:** 45-60 minutes  
**🔴 Downtime:** ~5 minutes (includes database migration)

#### Step 1: Pre-Deployment Checklist

**Before starting, verify:**

- [ ] Database backup completed (see Pre-Deployment Requirements above)
- [ ] Application backup completed
- [ ] Phase 1 deployed and working
- [ ] You have 60 minutes of scheduled maintenance time
- [ ] Users notified of upcoming 5-minute maintenance window

---

#### Step 2: Connect to Server & Create Backup

```bash
# SSH to your Lightsail server

# Create backup
mkdir -p ~/backups/backup-phase2-$(date +%Y%m%d-%H%M%S)
cp -r ~/edupath-app ~/backups/backup-phase2-$(date +%Y%m%d-%H%M%S)/

# Verify backup
ls -lh ~/backups/
```

---

#### Step 3: Pull Latest Code

```bash
cd ~/edupath-app

# If using Git
git pull origin main

# Verify Phase 2 changes are present
git log --oneline -5
```

---

#### Step 4: Install Dependencies

```bash
npm install
```

**Wait 1-2 minutes**

---

#### Step 5: Stop Application (Start Downtime)

```bash
# Stop the app
pm2 stop edupath-production

# Verify stopped
pm2 status
```

**🔴 DOWNTIME BEGINS** - Users cannot access the app until restart

---

#### Step 6: Run Database Migration

**CRITICAL STEP: This creates the refresh_tokens table**

```bash
# Run Drizzle migration
npm run db:push
```

**Expected output:**
```
✓ Checking schema...
✓ Applying changes...
✓ Schema updated successfully
```

**🚨 If migration fails:**
```
❌ Database migration failed
```

**Troubleshooting:**
1. Check DATABASE_URL in .env
2. Verify database is reachable
3. Check database migration logs: `npm run db:push 2>&1 | tee migration.log`
4. If stuck, restore from database backup and rollback (see Rollback section)

---

#### Step 7: Verify Database Migration

```bash
# Install PostgreSQL client if not already installed
sudo apt install postgresql-client -y

# Connect to database (use your DATABASE_URL from .env)
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Verify table exists
psql $DATABASE_URL -c "\dt refresh_tokens"
```

**Expected output:**
```
            List of relations
 Schema |      Name       | Type  |  Owner  
--------+-----------------+-------+---------
 public | refresh_tokens  | table | postgres
```

**Verify columns:**
```bash
psql $DATABASE_URL -c "\d refresh_tokens"
```

**Expected columns:**
- id (uuid)
- user_id (uuid)
- token_hash (text)
- expires_at (timestamp)
- created_at (timestamp)
- revoked_at (timestamp, nullable)
- ip_address (text)
- user_agent (text)

**✅ Table exists with correct columns?** Continue.  
**❌ Table missing or wrong structure?** See Rollback section.

---

#### Step 8: Rebuild Application

```bash
npm run build
```

**Wait 2-4 minutes**

---

#### Step 9: Restart Application (End Downtime)

```bash
# Start the app
pm2 restart edupath-production

# Check status
pm2 status
```

**Expected output:** Status = `online` (green)

**🟢 DOWNTIME ENDS** - Users can access the app again

---

#### Step 10: Monitor Startup Logs

```bash
# Watch logs for startup
pm2 logs edupath-production --lines 50
```

**Watch for SUCCESS indicators:**
```
Server is running on port 5000
Database connected successfully
```

**🚨 Watch for ERRORS:**
- `refresh_tokens table not found` → Migration failed
- `Database connection failed` → Check DATABASE_URL
- JavaScript errors → Check build

---

#### Step 11: Test Production Application

**Open your production URL:**

```
https://your-domain.com
```

**Perform these tests:**

1. **Login and verify refresh token created**
   ```
   1. Login with test account
   2. On server, check database:
   
   psql $DATABASE_URL -c "SELECT id, user_id, created_at FROM refresh_tokens ORDER BY created_at DESC LIMIT 5;"
   
   3. Verify: Your login created a new row
   ```

2. **Token refresh test (requires 16 min wait)**
   ```
   1. Login to app
   2. Open DevTools → Network tab
   3. Wait 16 minutes or manually change access token expiration for testing
   4. Make an API call (navigate to a page)
   5. Verify: POST /api/auth/refresh appears in Network tab
   6. Verify: Response is 200 OK
   7. Check console: "✅ [AUTH] Access token refreshed successfully"
   ```

3. **Logout and verify token revocation**
   ```
   1. Login to app
   2. Logout
   3. On server, check database:
   
   psql $DATABASE_URL -c "SELECT id, revoked_at FROM refresh_tokens WHERE revoked_at IS NOT NULL ORDER BY revoked_at DESC LIMIT 5;"
   
   4. Verify: Your refresh token has a revoked_at timestamp
   ```

4. **Server logs verification**
   ```bash
   pm2 logs edupath-production --lines 100 | grep "REFRESH"
   ```

**✅ All tests passing?** Phase 2 deployment successful!

---

### Post-Deployment Monitoring

**First 48 hours:**

1. **Monitor refresh token table growth**
   ```bash
   # Check number of active tokens daily
   psql $DATABASE_URL -c "SELECT COUNT(*) as active_tokens FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW();"
   ```

2. **Watch for refresh failures**
   ```bash
   pm2 logs edupath-production | grep "❌.*REFRESH"
   ```

3. **Monitor token rotation**
   ```bash
   # Tokens should be rotating (old ones revoked, new ones created)
   psql $DATABASE_URL -c "SELECT COUNT(*) as revoked_tokens FROM refresh_tokens WHERE revoked_at IS NOT NULL;"
   ```

**Success Metrics:**
- ✅ Users staying logged in seamlessly
- ✅ Automatic token refresh happening (check logs)
- ✅ No increase in auth errors
- ✅ Refresh tokens being created and rotated in database

---

### Rollback Procedure (Phase 2)

**⚠️ WARNING: Rolling back Phase 2 requires database changes!**

#### Step 1: Stop Application

```bash
pm2 stop edupath-production
```

#### Step 2: Restore Application Code

```bash
cd ~/edupath-app
rm -rf dist node_modules client server shared package-lock.json
cp -r ~/backups/backup-phase2-20251102-143022/edupath-app/* .
npm install
npm run build
```

#### Step 3: Restore Database (CRITICAL)

```bash
# Restore from SQL backup
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Drop the refresh_tokens table
psql $DATABASE_URL -c "DROP TABLE IF EXISTS refresh_tokens CASCADE;"

# Restore full database backup (if needed)
psql $DATABASE_URL < ~/backups/db-backup-phase2-20251102-143022.sql
```

**⚠️ Note:** This will log out all currently logged-in users (they'll need to login again)

#### Step 4: Restart Application

```bash
pm2 restart edupath-production
pm2 logs edupath-production --lines 50
```

#### Step 5: Verify Rollback

- [ ] Application starts without errors
- [ ] Users can login
- [ ] No refresh_tokens table errors in logs
- [ ] Users report app is working

**Rollback time:** ~10 minutes

---

### Known Issues & Troubleshooting (Phase 2)

#### Issue 1: "refresh_tokens table does not exist"

**Symptom:** Server logs showing table not found error

**Cause:** Database migration didn't run successfully

**Fix:**
```bash
# Manually run migration
npm run db:push

# Or create table manually
psql $DATABASE_URL -c "
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);
"

# Restart app
pm2 restart edupath-production
```

---

#### Issue 2: Token refresh returning 401

**Symptom:** Network tab shows POST /api/auth/refresh returning 401 Unauthorized

**Cause:** Refresh token invalid, expired, or revoked

**Diagnosis:**
```bash
# Check server logs
pm2 logs edupath-production | grep "REFRESH.*401"

# Check database for user's refresh tokens
psql $DATABASE_URL -c "SELECT id, expires_at, revoked_at FROM refresh_tokens WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC LIMIT 5;"
```

**Fix:**
- If token expired: Working as intended, user should login again
- If token revoked: Working as intended (logout was called)
- If token not in database: Possible race condition, have user login again

---

#### Issue 3: Refresh token table growing too large

**Symptom:** Database table has thousands of rows

**Cause:** Old tokens not being cleaned up

**Fix: Add cleanup cron job**
```bash
# Create cleanup script
cat > ~/edupath-app/cleanup-tokens.sh << 'EOF'
#!/bin/bash
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
psql $DATABASE_URL -c "DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL '30 days';"
EOF

chmod +x ~/edupath-app/cleanup-tokens.sh

# Add to crontab (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * ~/edupath-app/cleanup-tokens.sh") | crontab -
```

---

## 📦 Phase 3: HttpOnly Cookie Migration

### Overview

**What it adds:**
- Refresh tokens moved from localStorage to HttpOnly cookies
- XSS attack protection (JavaScript cannot access refresh token)
- Automatic cookie management by browser
- CSRF protection via SameSite attribute

**What changes:**
- **Backend:** Cookies set via Set-Cookie headers
- **Frontend:** Refresh token no longer in localStorage
- **Environment:** New cookie configuration options
- **Security:** Significantly improved (prevents XSS token theft)

**Database changes:** None ✅  
**Environment variables:** Optional cookie config (domain, secure, etc.)  
**User impact:** Improved security, no visible change

---

### Pre-Deployment Requirements

1. **Phase 2 must be deployed and working**
   - Verify dual-token system is working
   - Check database has refresh_tokens table
   - Confirm automatic token refresh is working

2. **HTTPS must be configured**
   - HttpOnly cookies with Secure flag require HTTPS
   - If not using HTTPS, see Configuration section

3. **CORS must allow credentials**
   - If frontend and backend are on different domains
   - Check server CORS config includes `credentials: true`

---

### Pre-Deployment Testing (Local/Development)

**Test these scenarios in development:**

1. **Cookie set on login**
   ```
   1. Login to app
   2. Open DevTools → Application → Cookies
   3. Verify: refreshToken cookie exists
   4. Verify attributes:
      - HttpOnly: ✓
      - Secure: ✓ (if HTTPS)
      - SameSite: Strict or Lax
      - Expires: ~7 days from now
   ```

2. **XSS protection test**
   ```
   1. Login to app
   2. Open DevTools → Console
   3. Try: document.cookie
   4. Verify: refreshToken NOT visible (HttpOnly protection)
   5. Try: localStorage.getItem('refresh_token')
   6. Verify: null (no longer in localStorage)
   ```

3. **Automatic cookie sending**
   ```
   1. Login to app
   2. Open DevTools → Network tab
   3. Make any API request
   4. Click request → Headers tab
   5. Verify: Cookie: refreshToken=xxx... in Request Headers
   6. Verify: Automatic (no manual code needed)
   ```

4. **Token refresh with cookie**
   ```
   1. Login to app
   2. Wait 16 minutes (or manually expire access token)
   3. Make API call
   4. Open Network tab
   5. Verify: POST /api/auth/refresh shows Cookie header
   6. Verify: Response has Set-Cookie header with new refresh token
   ```

**✅ All tests passing?** Proceed to production.

---

### Production Deployment Steps

**⏱️ Estimated Time:** 30-45 minutes  
**🔴 Downtime:** ~2 minutes during app restart

#### Step 1: Create Backup

```bash
# SSH to server
mkdir -p ~/backups/backup-phase3-$(date +%Y%m%d-%H%M%S)
cp -r ~/edupath-app ~/backups/backup-phase3-$(date +%Y%m%d-%H%M%S)/
```

---

#### Step 2: Update Environment Variables (Optional)

**If you want to customize cookie settings:**

```bash
cd ~/edupath-app
nano .env
```

**Add these optional variables:**

```env
# Cookie Configuration (Optional - defaults work for most setups)
COOKIE_SECURE=true                    # Set to 'false' if NOT using HTTPS
COOKIE_SAMESITE=strict                # Options: 'strict', 'lax', 'none'
COOKIE_DOMAIN=                        # Leave empty for single domain
                                      # Set to '.yourdomain.com' for subdomains
COOKIE_MAX_AGE=604800                # 7 days in seconds (default)
```

**Save and exit:** Ctrl+X, Y, Enter

**If you're using HTTPS (recommended):**
- Keep `COOKIE_SECURE=true`

**If you're NOT using HTTPS (development only):**
- Set `COOKIE_SECURE=false`
- **WARNING:** This is insecure, get HTTPS set up!

---

#### Step 3: Pull Latest Code

```bash
git pull origin main
npm install
```

---

#### Step 4: Stop Application

```bash
pm2 stop edupath-production
```

**🔴 DOWNTIME BEGINS**

---

#### Step 5: Rebuild Application

```bash
npm run build
```

**Wait 2-4 minutes**

---

#### Step 6: Restart Application

```bash
pm2 restart edupath-production
pm2 status
```

**🟢 DOWNTIME ENDS**

---

#### Step 7: Monitor Logs

```bash
pm2 logs edupath-production --lines 50
```

**Watch for:**
- Server startup messages
- No cookie-related errors
- Database connection success

---

#### Step 8: Test Production Application

**⚠️ IMPORTANT: This will log out all users!**

Phase 3 changes how refresh tokens are stored. All existing sessions (with localStorage refresh tokens) will be invalid. Users will need to login again.

**Communication to users:**
```
"We've upgraded our security system. Please log in again. Your data is safe."
```

**Test the new system:**

1. **Login and verify cookie**
   ```
   1. Clear browser cookies for your site
   2. Login with test account
   3. Open DevTools → Application → Cookies
   4. Verify: refreshToken cookie exists with HttpOnly ✓
   ```

2. **XSS protection verification**
   ```
   1. Open DevTools → Console
   2. Type: document.cookie
   3. Verify: refreshToken NOT visible
   4. Type: localStorage.getItem('refresh_token')
   5. Verify: null
   ```

3. **Automatic cookie sending**
   ```
   1. Open DevTools → Network tab
   2. Navigate to any page
   3. Click any API request → Headers
   4. Verify: Cookie: refreshToken=xxx in Request Headers
   ```

4. **Token refresh test**
   ```
   1. Stay logged in
   2. Wait 16 minutes (or manually test)
   3. Make API call
   4. Check Network tab: POST /api/auth/refresh
   5. Verify: Request has Cookie header
   6. Verify: Response has Set-Cookie header
   ```

**✅ All tests passing?** Phase 3 deployment successful!

---

### Post-Deployment Monitoring

**First 24-48 hours:**

1. **Monitor user login issues**
   - Some users might not understand why they were logged out
   - Have clear communication ready

2. **Check for cookie errors**
   ```bash
   pm2 logs edupath-production | grep -i "cookie"
   ```

3. **Verify HTTPS is working**
   - If cookies not being set, check COOKIE_SECURE setting
   - Visit: https://your-domain.com and check padlock icon

4. **Monitor refresh failures**
   ```bash
   pm2 logs edupath-production | grep "REFRESH.*failed"
   ```

**Success Metrics:**
- ✅ Users successfully logging in after deployment
- ✅ Cookies being set and sent automatically
- ✅ No XSS vulnerability (tokens not accessible via JavaScript)
- ✅ Token refresh working seamlessly

---

### Rollback Procedure (Phase 3)

```bash
# Stop application
pm2 stop edupath-production

# Navigate to app directory
cd ~/edupath-app

# Restore from backup
rm -rf dist node_modules client server shared package-lock.json
cp -r ~/backups/backup-phase3-20251102-143022/edupath-app/* .

# Reinstall and rebuild
npm install
npm run build

# Restart
pm2 restart edupath-production
```

**After rollback:**
- Users will need to login again (refresh tokens in different storage)
- Remove cookie environment variables from .env if added

**Rollback time:** ~5 minutes

---

### Known Issues & Troubleshooting (Phase 3)

#### Issue 1: Cookies not being set

**Symptom:** refreshToken cookie missing in DevTools

**Common causes:**

1. **COOKIE_SECURE=true but not using HTTPS**
   ```bash
   # Fix: Set to false if not using HTTPS (temporary)
   nano .env
   # Change: COOKIE_SECURE=false
   pm2 restart edupath-production
   ```

2. **CORS not allowing credentials**
   ```bash
   # Check server CORS config includes:
   # credentials: true
   # origin: your-frontend-domain
   ```

3. **SameSite=Strict blocking cross-site requests**
   ```bash
   # If frontend/backend on different domains:
   nano .env
   # Change: COOKIE_SAMESITE=lax
   pm2 restart edupath-production
   ```

---

#### Issue 2: "No refresh token found" error

**Symptom:** POST /api/auth/refresh returning 401 with "No refresh token found"

**Cause:** Cookie not being sent with request

**Fix:**
```javascript
// Verify fetch requests include credentials
fetch('/api/auth/refresh', {
  credentials: 'include'  // Must be present!
})
```

**Server-side check:**
```bash
pm2 logs edupath-production | grep "No refresh token"
```

---

#### Issue 3: Cookies working locally but not in production

**Symptom:** Cookies work in development, fail in production

**Common causes:**

1. **Domain mismatch**
   ```bash
   # Check COOKIE_DOMAIN setting
   # For subdomain sharing: .yourdomain.com
   # For single domain: leave empty
   ```

2. **HTTPS not configured**
   ```bash
   # Verify SSL certificate
   curl -I https://your-domain.com
   
   # Should show: HTTP/2 200
   # Not: SSL certificate problem
   ```

3. **Nginx not passing cookies**
   ```bash
   # Check Nginx config
   sudo nano /etc/nginx/sites-available/edupath
   
   # Verify these headers exist:
   # proxy_set_header Cookie $http_cookie;
   # proxy_set_header Set-Cookie $http_set_cookie;
   ```

---

## 📦 Phase 4: Advanced Security Features

### Overview

**What it adds:**
- Idle timeout warning (warn before auto-logout)
- Absolute session timeout (max session duration)
- Device management (view and revoke sessions)
- Suspicious activity detection (unusual login patterns)
- Security audit logging (comprehensive auth event logging)
- "Remember Me" option (extended sessions)

**What changes:**
- **Database:** New tables for sessions, audit logs
- **Frontend:** New UI components (idle warning modal, device management)
- **Backend:** Security monitoring services
- **Infrastructure:** Potential cron jobs for cleanup

**Database changes:** ✅ YES - New tables  
**Environment variables:** Optional feature flags  
**User impact:** Enhanced security features, visible to users

---

### Should You Deploy Phase 4?

**Deploy if you:**
- Have enterprise/business users requiring audit trails
- Need compliance features (HIPAA, SOC 2, etc.)
- Want advanced session management
- Have security-conscious users

**Skip if you:**
- Have a simple application
- Don't need audit logging
- Want to minimize complexity
- Phases 1-3 meet your needs

---

### Pre-Deployment Requirements

1. **Phases 1-3 deployed and stable**
2. **Database backup** (creates new tables)
3. **60-90 minutes maintenance window**
4. **User communication** (new features will be visible)

---

### Production Deployment Steps

**⏱️ Estimated Time:** 60-90 minutes  
**🔴 Downtime:** ~2 minutes

**Steps are similar to Phase 2-3:**

1. Create backup
2. Pull code updates
3. Run database migrations (creates new tables)
4. Install dependencies
5. Stop application
6. Rebuild
7. Restart
8. Test new features

**See Phase 2 deployment steps for detailed commands**

---

### New Features to Test

1. **Idle timeout warning**
   ```
   1. Login
   2. Wait 25 minutes (configurable)
   3. Verify: Warning modal appears
   4. Click "Stay Logged In"
   5. Verify: Timer resets
   ```

2. **Device management**
   ```
   1. Login from multiple devices/browsers
   2. Go to Account Settings → Security → Active Sessions
   3. Verify: See list of active devices
   4. Click "Revoke" on one session
   5. Verify: That device is logged out
   ```

3. **Audit log**
   ```
   1. Login, logout, token refresh
   2. Check database:
   
   psql $DATABASE_URL -c "SELECT * FROM security_audit_log ORDER BY created_at DESC LIMIT 10;"
   
   3. Verify: Events are logged
   ```

---

### Rollback Procedure (Phase 4)

**Similar to Phase 2 rollback:**

1. Stop application
2. Restore code from backup
3. Restore database from backup (drops new tables)
4. Rebuild and restart

**Rollback time:** ~10 minutes

---

## 🔄 Complete Deployment Flow (All Phases)

### Option 1: Deploy All Phases at Once

**⏱️ Total Time:** 3-4 hours  
**🔴 Total Downtime:** ~15 minutes  
**Risk Level:** MEDIUM-HIGH

**Recommended for:** Development/staging environments only

**Steps:**
1. Complete all pre-deployment testing
2. Create comprehensive backup
3. Run all database migrations
4. Deploy all code changes
5. Test all features

**Advantages:**
- ✅ Get all features at once
- ✅ Only one maintenance window

**Disadvantages:**
- ❌ Higher risk if something fails
- ❌ More complex troubleshooting
- ❌ Longer rollback time

---

### Option 2: Deploy Incrementally (Recommended)

**⏱️ Total Time:** 4-6 hours (spread across multiple days)  
**🔴 Total Downtime:** ~11 minutes (4 separate windows)  
**Risk Level:** LOW

**Recommended for:** Production environments

**Timeline:**

**Day 1: Phase 1** (30-45 min, 2 min downtime)
- Deploy critical bug fixes
- Monitor for 24-48 hours
- Verify user logout issues resolved

**Day 3: Phase 2** (45-60 min, 5 min downtime)
- Deploy refresh token pattern
- Run database migration
- Monitor token refresh working
- Wait 48-72 hours for stability

**Day 6: Phase 3** (30-45 min, 2 min downtime)
- Deploy HttpOnly cookies
- Communicate user logout to users
- Monitor cookie functionality
- Wait 48-72 hours

**Day 9: Phase 4** (Optional) (60-90 min, 2 min downtime)
- Deploy advanced features
- Test new UI components
- Monitor audit logging

**Advantages:**
- ✅ Lower risk per deployment
- ✅ Easier troubleshooting
- ✅ Time to validate each phase
- ✅ Faster rollback if needed

**Disadvantages:**
- ❌ Multiple maintenance windows
- ❌ Takes longer to get all features

---

## 🚨 Emergency Procedures

### Complete System Rollback

**If all phases fail and you need to restore original system:**

```bash
# 1. Stop application
pm2 stop edupath-production

# 2. Restore database to pre-Phase-2 state
export DATABASE_URL="your-database-url"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS refresh_tokens CASCADE;"
psql $DATABASE_URL < ~/backups/db-backup-before-auth-changes.sql

# 3. Restore application code to original
cd ~/edupath-app
rm -rf *
git checkout [commit-hash-before-phase-1]
npm install
npm run build

# 4. Restart
pm2 restart edupath-production

# 5. Verify
pm2 logs edupath-production --lines 100
```

**After emergency rollback:**
- Document what went wrong
- Notify users
- Plan remediation in development before trying again

---

## 📊 Success Criteria

### How to Know Your Deployment Succeeded

**Phase 1 Success:**
- [ ] Zero reports of unexpected logouts
- [ ] Console logs showing token hydration
- [ ] Page refresh doesn't log users out
- [ ] Auth check retry logic working

**Phase 2 Success:**
- [ ] refresh_tokens table exists and growing
- [ ] Automatic token refresh happening every 15 min
- [ ] Tokens rotating (old ones revoked)
- [ ] No auth-related error increase

**Phase 3 Success:**
- [ ] Cookies being set with HttpOnly flag
- [ ] XSS test: document.cookie doesn't show refresh token
- [ ] Automatic cookie sending working
- [ ] No localStorage refresh token

**Phase 4 Success:**
- [ ] Idle warning modal appearing correctly
- [ ] Device management showing active sessions
- [ ] Audit log capturing auth events
- [ ] Session revocation working

---

## 📞 Support & Troubleshooting

### Getting Help

**If you encounter issues during deployment:**

1. **Check the logs first**
   ```bash
   pm2 logs edupath-production --lines 200
   ```

2. **Look for specific error patterns**
   - Database connection errors → Check DATABASE_URL
   - Table not found → Migration didn't run
   - Cookie not set → HTTPS/CORS issue
   - 401 errors → Token/authentication issue

3. **Verify environment**
   ```bash
   # Check Node version
   node -v  # Should be v20.x.x
   
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check .env file
   cat .env | grep -v "PASSWORD\|SECRET"
   ```

4. **When in doubt, rollback**
   - Don't try to fix complex issues in production
   - Rollback, investigate in development, try again

---

### Common Error Messages & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "refresh_tokens does not exist" | Migration didn't run | Run `npm run db:push` |
| "ECONNREFUSED" | Database unreachable | Check DATABASE_URL, firewall |
| "Cookie not found" | Cookies not enabled | Check COOKIE_SECURE setting |
| "CSRF token mismatch" | CORS credentials issue | Verify CORS config |
| "401 Unauthorized" | Token invalid/expired | Check JWT_SECRET, token expiry |

---

## 📝 Post-Deployment Checklist

### After Each Phase Deployment

- [ ] Application running (pm2 status = online)
- [ ] No errors in logs (pm2 logs)
- [ ] Database migrations applied (if any)
- [ ] Test users can login
- [ ] Test users can navigate app
- [ ] Test users can logout
- [ ] Backup verified and accessible
- [ ] Rollback procedure documented and tested
- [ ] Users notified of changes (if applicable)
- [ ] Monitoring configured
- [ ] Documentation updated

---

## 🎯 Summary

### Quick Reference

**Phase 1:** Bug fixes, no database changes, 30-45 min, deploy ASAP  
**Phase 2:** Refresh tokens, database migration, 45-60 min, deploy within 1 week  
**Phase 3:** HttpOnly cookies, no database changes, 30-45 min, deploy within 2 weeks  
**Phase 4:** Advanced features, database migration, 60-90 min, deploy as needed

**Total effort (all phases):** 3-4 hours deployment + testing  
**Recommended timeline:** 2-3 weeks for incremental deployment

---

**Questions? Issues? Refer to:**
- AUTH_REMEDIATION_PLAN.md for technical details
- AWS_LIGHTSAIL_DEPLOYMENT_GUIDE.md for server management
- This guide for deployment procedures

**Last Updated:** November 2, 2025  
**Version:** 1.0
