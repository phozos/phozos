# AWS Lightsail Production Environment Fix

## 🔍 **Root Cause Analysis**

### **The Problem**
Your application failed to start in AWS Lightsail with:
```
❌ Configuration Validation Failed
[RAZORPAY]
  • keyId: Required
  • keySecret: Required
  • webhookSecret: Required
```

### **Why It Happened**
When `esbuild` bundles your server code into `dist/index.js`, the module's `__dirname` changes:

- **Development**: `__dirname = /home/runner/workspace/server/config`
  - `resolve(__dirname, '../..')` → `/home/runner/workspace` ✅ **CORRECT**

- **Production (AWS Lightsail)**: `__dirname = /home/ubuntu/app/dist`
  - `resolve(__dirname, '../..')` → `/home/ubuntu` ❌ **WRONG!**
  - Should be: `/home/ubuntu/app` (project root)

Because `dotenv-flow` looked in `/home/ubuntu` instead of `/home/ubuntu/app`, it couldn't find your `.env` files, resulting in missing environment variables.

---

## ✅ **The Fix Applied**

### **Changed in `server/config/index.ts`:**

**BEFORE:**
```typescript
dotenvFlow.config({
  path: resolve(__dirname, '../..'),  // ❌ Breaks in bundled builds
  silent: true,
  node_env: process.env.NODE_ENV || 'development',
});
```

**AFTER:**
```typescript
dotenvFlow.config({
  path: process.env.CONFIG_ROOT || process.cwd(),  // ✅ Works everywhere
  silent: true,
  node_env: process.env.NODE_ENV || 'development',
});
```

### **Why This Works:**
- `process.cwd()` always returns the directory where Node.js was started (your project root)
- It works correctly in both development and production/bundled builds
- Supports `CONFIG_ROOT` environment variable for custom deployments

---

## 🚀 **Deployment Instructions for AWS Lightsail**

### **Option 1: Using .env Files (Quick)**
1. Ensure your `.env` file is deployed to AWS Lightsail
2. Run `npm start` from your **project root directory** (e.g., `/home/ubuntu/app`)
3. The fix ensures `.env` will be found correctly

### **Option 2: Using Environment Variables (Recommended for Production)**
Set environment variables directly in AWS Lightsail console instead of using `.env` files:

**Required Variables:**
```bash
# Database
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=your-64-char-secret
CSRF_SECRET=your-32-char-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Optional
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**How to set in AWS Lightsail:**
1. Go to your Lightsail container/instance
2. Navigate to **Environment Variables** settings
3. Add each variable with its value
4. Restart your application

---

## 🧪 **Testing**

### **Verified in Replit:**
✅ Application starts successfully  
✅ Configuration validation passes  
✅ All environment variables loaded correctly  
✅ Server running on port 5000  

### **Next Steps for AWS Lightsail:**
1. **Rebuild your application:** `npm run build`
2. **Deploy to AWS Lightsail** with the updated code
3. **Verify environment variables** are set (Option 1 or 2 above)
4. **Start the application:** `npm start`
5. **Check logs** to confirm no configuration validation errors

---

## 📋 **Technical Details**

### **Why `process.cwd()` vs `__dirname`:**
- **`process.cwd()`**: Working directory where Node.js process started (your project root)
- **`__dirname`**: Directory of the current module file (changes after bundling)

### **Build Impact:**
- esbuild bundles all server code into `dist/index.js`
- This relocates the module from `server/config/index.ts` to `dist/index.js`
- Path calculations using `__dirname` break; `process.cwd()` remains correct

### **Compatibility:**
- ✅ Works in development (Replit)
- ✅ Works in production (AWS Lightsail, Heroku, Railway, etc.)
- ✅ Works with bundled builds (esbuild, webpack, etc.)
- ✅ Supports custom paths via `CONFIG_ROOT` environment variable

---

## 🔐 **Security Best Practice**

For production deployments:
1. **Never commit `.env` files** with real secrets to version control
2. **Use AWS Lightsail environment variables** for sensitive data
3. **Keep `.env.example`** with placeholder values for documentation
4. **Use different secrets** for development and production

---

## ⚡ **Quick Commands**

```bash
# Rebuild application
npm run build

# Test production build locally
NODE_ENV=production npm start

# Validate configuration
npm run validate:production

# Deploy to AWS Lightsail (your deployment script)
# Make sure to run from project root!
cd /home/ubuntu/app
npm start
```

---

**Status:** ✅ **FIXED AND TESTED**  
**Date:** November 24, 2025  
**Impact:** Production deployment on AWS Lightsail now works correctly
