# 🚀 EduPath AWS Lightsail Deployment Guide

**Complete Step-by-Step Guide for Non-Technical Users**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [AWS Account Setup](#aws-account-setup)
4. [Lightsail Instance Creation](#lightsail-instance-creation)
5. [Server Configuration](#server-configuration)
6. [Application Deployment](#application-deployment)
7. [Domain & SSL Certificate Setup](#domain--ssl-certificate-setup)
8. [Post-Deployment](#post-deployment)
9. [Cost Management](#cost-management)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What You're Building

You'll deploy the **EduPath platform** to AWS Lightsail, a beginner-friendly cloud hosting service. Your app will run on a $10/month virtual server that can handle 1,000-2,000 monthly users.

### What You'll Get

- ✅ A production-ready server running 24/7
- ✅ Free SSL certificate (HTTPS/secure connection)
- ✅ Custom domain support (e.g., edupath.com)
- ✅ Automatic app restarts if it crashes
- ✅ $200 AWS credits (18 months of free hosting!)

### Total Time Estimate

- **Initial Setup:** 2-3 hours (one-time)
- **Future Updates:** 5-10 minutes

---

## Pre-Deployment Checklist

### ⏱️ Time: 30 minutes | 🟢 Difficulty: Easy

Before starting, gather these items:

#### ✅ Required Information

1. **Supabase Database Credentials**
   - Go to your Supabase dashboard: https://app.supabase.com
   - Click your project → **Settings** → **Database**
   - Copy the **Connection String** (looks like: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)
   - Save this - you'll need it later!

2. **Email Address**
   - For AWS account registration
   - For SSL certificate notifications

3. **Credit/Debit Card**
   - AWS requires a card for verification (won't be charged if you stay within free credits)
   - Virtual cards (like Privacy.com) work fine

#### ✅ Optional (Recommended)

4. **Domain Name**
   - Purchase from Namecheap, GoDaddy, or Google Domains (~$10-15/year)
   - Not required to start, but needed for custom domain (e.g., edupath.com)

5. **GitHub Account**
   - For easier code deployment and updates
   - Free at https://github.com/join

#### ✅ Accounts to Create

- [ ] AWS Account (we'll do this together in Section 3)
- [ ] Domain registrar account (if using custom domain)

---

## AWS Account Setup

### ⏱️ Time: 45 minutes | 🟢 Difficulty: Easy

### Step 1: Create AWS Account

1. **Go to AWS Signup Page**
   - Visit: https://aws.amazon.com/free
   - Click the big orange **"Create a Free Account"** button

2. **Enter Your Email & Account Name**
   - **Email address:** Use a valid email you check regularly
   - **AWS account name:** Can be anything (e.g., "EduPath Production")
   - Click **"Verify email address"**

3. **Check Your Email**
   - Open the verification email from AWS
   - Copy the verification code
   - Paste it into the AWS signup page
   - Click **"Verify"**

4. **Create Password**
   - Enter a strong password (12+ characters)
   - Save it in a password manager (recommended: Bitwarden, 1Password)
   - Click **"Continue"**

5. **Contact Information**
   - **Account Type:** Select **"Personal"** (unless you have a business)
   - Fill in your full name, phone number, and address
   - Check the box: "I have read and agree to the AWS Customer Agreement"
   - Click **"Continue"**

6. **Payment Information**
   - Enter your credit/debit card details
   - **Don't worry:** You won't be charged if you stay within the $200 credits
   - AWS charges $1 temporarily to verify your card (refunded immediately)
   - Click **"Verify and Continue"**

7. **Confirm Your Identity (Phone Verification)**
   - Choose **"Text message (SMS)"** or **"Voice call"**
   - Enter your phone number
   - You'll receive a 4-digit code
   - Enter the code and click **"Verify Code"**

8. **Select Support Plan**
   - Choose **"Basic support - Free"** (the first option)
   - Click **"Complete sign up"**

🎉 **Success!** You'll see "Congratulations! Your AWS account is ready."

---

### Step 2: Claim Your $200 in Credits

#### Part A: Automatic $100 Credit (Instant)

- This is credited automatically to new accounts created after July 15, 2025
- No action needed - check your credits after 10 minutes

#### Part B: Bonus $100 Credit (5 Tasks)

Complete these 5 simple tasks to earn **$20 per task**:

##### Task 1: Set Up AWS Budget (Easiest - Start Here!)

**What it does:** Sends you alerts if spending approaches your limit

1. In the AWS Console, search for **"Budgets"** in the top search bar
2. Click **"Create budget"**
3. Select **"Use a template (simplified)"**
4. Choose **"Monthly cost budget"**
5. **Budget name:** Type "Monthly Spending Limit"
6. **Budgeted amount:** Enter **$15** (safe buffer above the $10/month plan)
7. **Email recipients:** Your email address
8. Click **"Create budget"**

✅ **Check:** Within 10 minutes, go to **Billing → Credits**. You should see **+$20** added.

##### Task 2: Launch an EC2 Instance

**What it does:** Practice creating a virtual server (we won't actually use this one)

1. Search for **"EC2"** in the top search bar
2. Click **"Launch instance"**
3. **Name:** Type "Test-Instance"
4. **Application and OS Images:** Keep the default (Amazon Linux, Free tier eligible)
5. **Instance type:** Keep **t2.micro** (Free tier eligible)
6. **Key pair:** Click "Proceed without a key pair"
7. Scroll down and click **"Launch instance"**
8. Wait 2 minutes, then **terminate** it:
   - Go to **EC2 → Instances**
   - Select your test instance
   - Click **Actions → Instance State → Terminate**

✅ **Check:** Go to **Billing → Credits**. You should see **+$20** (total: $40)

##### Task 3: Configure RDS Database Options

**What it does:** Explore database settings (we won't create an actual database)

1. Search for **"RDS"** in the top search bar
2. Click **"Create database"**
3. Under **Engine options**, click each database type (just to view):
   - Click **Amazon Aurora**
   - Then click **MySQL**
   - Then click **PostgreSQL**
4. **Do NOT click "Create database"** - just close the tab

✅ **Check:** Go to **Billing → Credits**. You should see **+$20** (total: $60)

##### Task 4: Build AWS Lambda Function

**What it does:** Create a simple serverless function

1. Search for **"Lambda"** in the top search bar
2. Click **"Create function"**
3. Select **"Author from scratch"**
4. **Function name:** Type "test-function"
5. **Runtime:** Select **Node.js 20.x**
6. Click **"Create function"**
7. Scroll down to **"Code source"** section
8. You'll see sample code already there - click **"Deploy"** button (top right)
9. Click the **"Test"** tab → **"Create new event"**
10. **Event name:** Type "test"
11. Click **"Save"** then **"Test"**

✅ **Check:** Go to **Billing → Credits**. You should see **+$20** (total: $80)

##### Task 5: Use Amazon Bedrock AI

**What it does:** Try AWS's AI chat playground

1. Search for **"Bedrock"** in the top search bar
2. Click **"Get started"** (if first time)
3. In the left menu, click **"Playgrounds" → "Chat"**
4. You may need to click **"Enable model access"** → Select **"Anthropic - Claude"** → **"Save changes"**
5. Wait 2-3 minutes for model access to be granted
6. Go back to **Playgrounds → Chat**
7. Select **Claude** model from dropdown
8. Type any question in the chat (e.g., "What is AWS?")
9. Hit Enter and wait for a response

✅ **Check:** Go to **Billing → Credits**. You should see **+$20** (total: $100)

---

### Step 3: Verify Your Credits

1. Go to **Billing Dashboard** → **Credits**
2. You should see:
   - **$100** - AWS Free Tier 2025 (automatic)
   - **$100** - Activation tasks (5 × $20)
   - **Total: $200**
3. **Expiration:** 12 months from today (or 6 months if you stay on free account plan)

**Screenshot location:** You should see a screen showing "Available credits: $200"

---

### Step 4: Set Up Billing Alerts (CRITICAL!)

**Why:** Get notified before accidentally spending real money

1. Go to **Billing Dashboard**
2. In the left menu, click **"Billing preferences"**
3. Check these boxes:
   - ✅ **"Receive Free Tier Usage Alerts"**
   - ✅ **"Receive Billing Alerts"**
4. Enter your email address
5. Click **"Save preferences"**

6. **Create CloudWatch Alert:**
   - Search for **"CloudWatch"** in top search bar
   - Click **"Alarms" → "Billing" → "Create alarm"**
   - Click **"Select metric"** → **"Billing" → "Total Estimated Charge"**
   - Select the checkbox next to **"USD"** → Click **"Select metric"**
   - **Threshold:** Enter **$5** (you'll get notified if you're charged more than $5)
   - Click **"Next"**
   - **Create new topic** → Enter your email → Click **"Create topic"**
   - **Check your email** and confirm the subscription
   - Click **"Next"** → Name it **"Billing Alert $5"** → **"Create alarm"**

🎉 **Section Complete!** You now have an AWS account with $200 credits and billing protection.

---

## Lightsail Instance Creation

### ⏱️ Time: 20 minutes | 🟢 Difficulty: Easy

### Step 1: Access Lightsail

1. In the AWS Console, search for **"Lightsail"** in the top search bar
2. Click **"Amazon Lightsail"**
3. You'll see the Lightsail home page - click **"Create instance"**

---

### Step 2: Choose Instance Location

1. **Instance location (Region):**
   - Click the dropdown to select a region
   - Choose the one **closest to most of your users**:
     - **USA East Coast:** `us-east-1` (N. Virginia)
     - **USA West Coast:** `us-west-2` (Oregon)
     - **Europe:** `eu-west-1` (Ireland)
     - **Asia:** `ap-southeast-1` (Singapore)
   - Keep the **Availability Zone** as default (e.g., `us-east-1a`)

**Why this matters:** Closer servers = faster loading times for users

---

### Step 3: Select Platform & Blueprint

1. **Pick your instance image:**
   - Click **"Linux/Unix"** (should be selected by default)

2. **Select a blueprint:**
   - Click **"OS Only"** tab (NOT "Apps + OS")
   - Select **"Ubuntu 22.04 LTS"**

**Why Ubuntu 22.04?** It's stable, widely supported, and compatible with all our tools.

---

### Step 4: Choose Your Instance Plan

Scroll down to **"Choose your instance plan"**

1. Click the **$10 USD** plan (NOT the $5 plan):
   - **2 GB RAM**
   - **1 vCPU**
   - **60 GB SSD**
   - **3 TB transfer**

**Why $10 plan?** The $5 plan has only 1 GB RAM, which can cause crashes with 1,000+ users.

**Monthly Cost:** $10/month × 18 months = $180 (you have $200 credits ✅)

---

### Step 5: Name Your Instance

1. **Identify your instance:**
   - In the text box under "Instance name", type: **`edupath-production`**

**Why naming matters:** You'll recognize it easily if you create multiple servers later.

---

### Step 6: Create the Instance

1. **Review your settings:**
   - Region: Your chosen region
   - Blueprint: Ubuntu 22.04 LTS
   - Plan: $10/month
   - Name: edupath-production

2. Click the big **"Create instance"** button at the bottom

3. **Wait 2-3 minutes**
   - You'll see "Instance is being created..."
   - Then status changes to **"Running"** (green light)

🎉 **Success!** Your server is now online.

---

### Step 7: Attach a Static IP Address

**What's a static IP?** A permanent address for your server (so it doesn't change when you restart).

1. In Lightsail, go to the **"Networking"** tab (top menu)
2. Click **"Create static IP"**
3. **Select your instance:** Click the dropdown → Select **"edupath-production"**
4. **Name it:** Type **`edupath-static-ip`**
5. Click **"Create"**

You'll see your static IP address (looks like: `54.123.45.67`)

**Save this IP!** You'll need it for your domain setup later.

---

### Step 8: Configure Firewall Rules

**What's a firewall?** Security settings that control which ports can accept traffic.

1. Click your instance name (**edupath-production**)
2. Click the **"Networking"** tab
3. Under **"IPv4 Firewall"**, you'll see some default rules
4. **Add two new rules:**

**Rule 1: HTTP (Port 80)**
- Click **"+ Add rule"**
- **Application:** Select **"HTTP"**
- **Port:** 80 (auto-filled)
- Leave restriction as **"All IP addresses"**

**Rule 2: HTTPS (Port 443)**
- Click **"+ Add rule"**
- **Application:** Select **"HTTPS"**
- **Port:** 443 (auto-filled)
- Leave restriction as **"All IP addresses"**

**Rule 3: Custom Port 5000 (For EduPath App)**
- Click **"+ Add rule"**
- **Application:** Select **"Custom"**
- **Protocol:** TCP
- **Port:** 5000
- Leave restriction as **"All IP addresses"**

5. Scroll down and verify you have these ports open:
   - ✅ SSH (22)
   - ✅ HTTP (80)
   - ✅ HTTPS (443)
   - ✅ Custom TCP (5000)

🎉 **Section Complete!** Your Lightsail instance is ready for configuration.

---

## Server Configuration

### ⏱️ Time: 45 minutes | 🟡 Difficulty: Medium

### Step 1: Connect to Your Server via SSH

**What's SSH?** A secure way to type commands on your server (like a remote terminal).

1. Go to your Lightsail home page
2. Click on your instance (**edupath-production**)
3. Click the **"Connect using SSH"** button (looks like a terminal icon >\_)

A new browser window opens with a **black terminal screen** - this is your server!

**What you see:**
```
ubuntu@ip-172-26-3-45:~$
```

This is called the "command prompt" - it's waiting for you to type commands.

---

### Step 2: Update Ubuntu

**Why?** Get the latest security patches and bug fixes.

Copy and paste this command (right-click to paste in the terminal):

```bash
sudo apt update && sudo apt upgrade -y
```

**What this does:**
- `sudo` = run as administrator
- `apt update` = refresh the list of available software
- `apt upgrade -y` = install updates (the `-y` means "yes to all")

**Wait time:** 3-5 minutes

You'll see lots of text scrolling - that's normal! Wait until you see the prompt again (`ubuntu@...`).

---

### Step 3: Install Node.js 20 (LTS)

**Why Node.js 20?** EduPath is built with Node.js and needs version 18 or higher.

Copy and paste these commands **one at a time**:

```bash
# Step 1: Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg
```

```bash
# Step 2: Add NodeSource repository key
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
```

```bash
# Step 3: Add Node.js 20 repository
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
```

```bash
# Step 4: Install Node.js 20
sudo apt-get update && sudo apt-get install nodejs -y
```

**Verify installation:**

```bash
node -v
```

**Expected output:** `v20.x.x` (e.g., v20.11.0)

```bash
npm -v
```

**Expected output:** `10.x.x` (e.g., 10.2.4)

✅ **Success check:** Both commands show version numbers.

---

### Step 4: Install PM2 (Process Manager)

**What's PM2?** A tool that keeps your app running 24/7 and restarts it automatically if it crashes.

```bash
sudo npm install -g pm2
```

**Verify installation:**

```bash
pm2 -v
```

**Expected output:** `5.x.x` (e.g., 5.3.0)

---

### Step 5: Install Git (for Code Deployment)

**Why Git?** To download your code from GitHub and easily update it later.

```bash
sudo apt install git -y
```

**Verify installation:**

```bash
git --version
```

**Expected output:** `git version 2.x.x`

---

### Step 6: Generate Secure Secret Keys

**What are these?** Random passwords for encrypting user sessions and tokens.

Copy and paste this command to generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Expected output:** A long random string like:
```
e3ff5f077839c1331b1d893a728246685cb7dba9e3a77bffe7d52eaccf660988a1b2c3d4e5f6
```

**Copy this entire string** - you'll need it for your `.env` file!

Run the command **again** to generate a CSRF secret (different from JWT):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Expected output:** Another random string like:
```
9f8e7d6c5b4a39281706f5e4d3c2b1a098f7e6d5c4b3a291807f6e5d4c3b2a19
```

**Copy this too!**

**Save both strings** in a notepad on your computer - you'll paste them in the next step.

---

### Step 7: Create Application Directory

**Where will your code live?** Let's create a folder for it.

```bash
# Create a directory for your app
mkdir -p ~/edupath-app

# Navigate into it
cd ~/edupath-app
```

**What this does:**
- `mkdir -p ~/edupath-app` = create a folder called "edupath-app" in your home directory
- `cd ~/edupath-app` = move into that folder

**Check you're in the right place:**

```bash
pwd
```

**Expected output:** `/home/ubuntu/edupath-app`

---

### Step 8: Upload Your Code (Option A: GitHub - Recommended)

**If your code is on GitHub:**

```bash
git clone https://github.com/YOUR-USERNAME/edupath-app.git .
```

**Replace `YOUR-USERNAME/edupath-app`** with your actual GitHub repository URL.

**Note the dot (.) at the end** - it tells Git to clone into the current folder.

**Expected output:**
```
Cloning into '.'...
remote: Counting objects...
Receiving objects: 100% (1234/1234), done.
```

**Skip to Step 9** if you used GitHub.

---

### Step 8: Upload Your Code (Option B: Manual Upload)

**If you don't have GitHub or prefer manual upload:**

1. **On your local computer**, compress your EduPath project folder into a `.zip` file:
   - Right-click the folder → **"Compress"** (Mac) or **"Send to → Compressed folder"** (Windows)

2. **Use SFTP to upload:**
   - Download **FileZilla** (free): https://filezilla-project.org/download.php
   - Open FileZilla
   - **Host:** Your static IP address (e.g., `54.123.45.67`)
   - **Username:** `ubuntu`
   - **Port:** `22`
   - **Password:** Leave blank
   - **Click "Quickconnect"**

3. **Get your SSH key:**
   - In Lightsail, go to **Account** (top right) → **Account** → **SSH keys**
   - Download the **Default key** for your region
   - In FileZilla, go to **Edit → Settings → SFTP**
   - Click **"Add key file"** → Select your downloaded `.pem` key file

4. **Upload your .zip file:**
   - In FileZilla, navigate to `/home/ubuntu/edupath-app` (right side)
   - Drag your `.zip` file from left to right
   - Wait for upload to complete

5. **Back in the SSH terminal**, unzip your file:

```bash
# Install unzip tool (if needed)
sudo apt install unzip -y

# Unzip your file (replace filename with yours)
unzip your-edupath-app.zip

# Move contents to current directory (if needed)
mv your-folder-name/* .

# Remove the zip file
rm your-edupath-app.zip
```

---

### Step 9: Install Application Dependencies

**What's this?** Download all the code libraries EduPath needs to run.

```bash
npm install
```

**Wait time:** 3-5 minutes

**Expected output:** Lots of text, ending with:
```
added 1234 packages in 3m
```

**⚠️ Ignore warnings** - they're normal. Only stop if you see **"ERROR"** in red.

---

### Step 10: Create Environment Variables File

**What's a .env file?** A configuration file with sensitive passwords and settings.

```bash
nano .env
```

This opens a text editor. **Copy and paste this template**, then **fill in YOUR values**:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxxxx.supabase.co:5432/postgres

# Security Secrets
JWT_SECRET=paste-your-64-character-jwt-secret-here
CSRF_SECRET=paste-your-32-character-csrf-secret-here

# Application Settings
NODE_ENV=production
PORT=5000

# Admin Account (Optional - set a strong password)
ADMIN_PASSWORD=ChangeThisToAStrongPassword123!

# Email Service (Optional - for sending emails)
# SENDGRID_API_KEY=your-sendgrid-api-key-if-you-have-one
```

**Replace these values:**

1. **DATABASE_URL:** Paste your Supabase connection string (from Pre-Deployment Checklist)
2. **JWT_SECRET:** Paste the first secret you generated in Step 6
3. **CSRF_SECRET:** Paste the second secret you generated in Step 6
4. **ADMIN_PASSWORD:** Create a strong password for the admin account

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` (to confirm save)
- Press `Enter` (to confirm filename)

**Verify your .env file was created:**

```bash
ls -la
```

You should see `.env` in the list.

**🔒 Security check - verify .env has correct permissions:**

```bash
chmod 600 .env
```

This makes the file readable only by you (not other users on the server).

---

### Step 11: Build the Application

**What's this?** Compile your TypeScript code and React frontend into optimized JavaScript.

```bash
npm run build
```

**Wait time:** 2-4 minutes

**Expected output:** Ends with something like:
```
✓ built in 45s
dist/public/index.html  1.2 kB
dist/index.js          234 kB
```

**Check the build succeeded:**

```bash
ls -la dist/
```

You should see a `dist` folder containing:
- `public/` (frontend files)
- `index.js` (backend server)

✅ **Success!** Your app is compiled and ready to run.

---

### Step 12: Test the Application

**Before running 24/7, let's test it manually.**

```bash
npm start
```

**Expected output:**
```
Server is running on port 5000
Database connected successfully
```

**Open a new browser tab** and visit:
```
http://YOUR_STATIC_IP:5000
```

Replace `YOUR_STATIC_IP` with your actual IP (e.g., `http://54.123.45.67:5000`)

**✅ You should see your EduPath homepage!**

**Stop the test:**
- Go back to the SSH terminal
- Press `Ctrl + C` to stop the server

---

### Step 13: Set Up PM2 to Run App 24/7

**Why PM2?** So your app runs in the background and restarts automatically.

**Start your app with PM2:**

```bash
pm2 start dist/index.js --name edupath-production
```

**Expected output:**
```
[PM2] Starting dist/index.js in fork_mode (1 instance)
[PM2] Done.
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ mode    │ status  │ cpu      │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ edupath-production   │ fork    │ online  │ 0%       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

**Check your app is running:**

```bash
pm2 status
```

**Expected status:** `online` (green)

**View live logs:**

```bash
pm2 logs edupath-production
```

Press `Ctrl + C` to exit logs.

---

### Step 14: Configure PM2 to Start on Server Reboot

**Why?** If the server restarts (power outage, AWS maintenance), PM2 will auto-start your app.

```bash
pm2 startup
```

**Expected output:** A command like:
```
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**Copy the entire `sudo env...` command** from your output and paste it into the terminal, then press Enter.

**Save the current PM2 process list:**

```bash
pm2 save
```

**Expected output:**
```
[PM2] Saving current process list...
[PM2] Successfully saved in /home/ubuntu/.pm2/dump.pm2
```

✅ **Success!** Your app will now auto-start even after server reboots.

---

### Step 15: Test the Live Application

**Visit your app in a browser:**

```
http://YOUR_STATIC_IP:5000
```

**✅ Your EduPath platform should be live and working!**

**Try these tests:**
- Load the homepage
- Click around different pages
- Test the login form (don't actually log in yet - we haven't set up SSL)

**⚠️ Warning:** Don't log in with real credentials yet - your site doesn't have HTTPS (SSL) yet, so passwords aren't encrypted in transit. We'll fix this in Section 7.

🎉 **Section Complete!** Your app is running 24/7 on your Lightsail server.

---

## Application Deployment

### ⏱️ Time: 10 minutes | 🟢 Difficulty: Easy

**This section is already complete!** We deployed in the previous section. This section covers how to **update** your app in the future.

---

### How to Update Your Application

**When you make code changes and want to deploy them:**

#### Option A: Update via Git (Recommended)

```bash
# Connect to your server via SSH
# Navigate to your app directory
cd ~/edupath-app

# Stop the current app
pm2 stop edupath-production

# Pull latest code from GitHub
git pull origin main

# Install any new dependencies
npm install

# Rebuild the app
npm run build

# Restart with PM2
pm2 restart edupath-production

# View logs to confirm it started
pm2 logs edupath-production --lines 50
```

**Wait 2-3 minutes for the build** to complete.

**Check your website** - changes should be live!

---

#### Option B: Manual Update (if not using Git)

1. **On your local computer:**
   - Make your code changes
   - Create a new `.zip` file of your project

2. **Upload via FileZilla:**
   - Connect to your server (same as Section 5, Step 8)
   - Upload the new `.zip` file to `/home/ubuntu/edupath-app`

3. **In SSH terminal:**

```bash
cd ~/edupath-app

# Stop the app
pm2 stop edupath-production

# Backup old files (optional but recommended)
mkdir ~/backup-$(date +%Y%m%d)
cp -r ~/edupath-app/* ~/backup-$(date +%Y%m%d)/

# Remove old files
rm -rf dist node_modules client server shared

# Unzip new files
unzip your-new-app.zip

# Move contents if needed
mv your-folder-name/* .

# Install dependencies
npm install

# Rebuild
npm run build

# Restart app
pm2 restart edupath-production
```

---

### Rollback to Previous Version (if update breaks something)

**If you used Git:**

```bash
cd ~/edupath-app

# View recent commits
git log --oneline -5

# Rollback to previous commit (copy the commit hash from git log)
git reset --hard abc1234

# Rebuild and restart
npm install
npm run build
pm2 restart edupath-production
```

**If you used manual upload:**

```bash
# Restore from backup (replace date with your backup folder)
cd ~/edupath-app
pm2 stop edupath-production
rm -rf dist node_modules client server shared
cp -r ~/backup-20250123/* .
npm install
npm run build
pm2 restart edupath-production
```

---

### Quick Restart (if app is just frozen)

```bash
pm2 restart edupath-production
```

This takes 5 seconds and doesn't require rebuilding.

---

### View Application Logs

**Real-time logs (press Ctrl+C to exit):**

```bash
pm2 logs edupath-production
```

**Last 100 lines of logs:**

```bash
pm2 logs edupath-production --lines 100
```

**Error logs only:**

```bash
pm2 logs edupath-production --err
```

---

## Domain & SSL Certificate Setup

### ⏱️ Time: 45 minutes | 🟡 Difficulty: Medium

**Why do you need this?**
- **Domain:** So users visit `edupath.com` instead of `54.123.45.67:5000`
- **SSL Certificate:** Enables HTTPS (green padlock) so passwords are encrypted

---

### Step 1: Point Your Domain to Lightsail

**Before starting:**
- You must own a domain (e.g., edupath.com)
- You need access to your domain registrar (Namecheap, GoDaddy, etc.)

---

#### Option A: Use Lightsail DNS (Easiest)

1. **In Lightsail, go to Networking tab**
2. Click **"Create DNS zone"**
3. **Domain name:** Enter your domain (e.g., `edupath.com`)
4. Click **"Create DNS zone"**

5. **You'll see 4 nameservers** like:
   ```
   ns-123.awsdns-12.com
   ns-456.awsdns-45.org
   ns-789.awsdns-78.net
   ns-012.awsdns-01.co.uk
   ```

6. **Copy all 4 nameservers**

7. **Go to your domain registrar** (Namecheap, GoDaddy, etc.):
   - Log in to your account
   - Find "Manage DNS" or "Nameservers"
   - Select **"Custom Nameservers"**
   - Paste all 4 AWS nameservers
   - Save changes

8. **Wait 2-48 hours** for DNS propagation (usually 2-4 hours)

9. **Back in Lightsail DNS zone, add these records:**

**Record 1: Main domain (edupath.com)**
- **Record type:** A record
- **Subdomain:** Leave blank (or `@`)
- **Resolves to:** Select your static IP (`edupath-static-ip`)
- Click **"Add record"**

**Record 2: www subdomain (www.edupath.com)**
- **Record type:** A record
- **Subdomain:** `www`
- **Resolves to:** Select your static IP
- Click **"Add record"**

---

#### Option B: Use Your Domain Registrar's DNS

1. **Log in to your domain registrar**
2. **Find DNS settings** (usually called "DNS Management" or "Advanced DNS")
3. **Add an A record:**
   - **Type:** A
   - **Host:** `@` (represents your root domain)
   - **Value:** Your Lightsail static IP (e.g., `54.123.45.67`)
   - **TTL:** 3600 (or automatic)

4. **Add another A record for www:**
   - **Type:** A
   - **Host:** `www`
   - **Value:** Your Lightsail static IP
   - **TTL:** 3600

5. **Save changes**

**Wait 2-48 hours** for DNS propagation.

---

### Step 2: Verify DNS is Working

**After waiting 2-4 hours**, test if your domain points to your server:

```bash
# On your local computer (Mac/Linux), open Terminal and run:
nslookup edupath.com

# Or use an online tool:
# Visit: https://www.whatsmydns.net
# Enter your domain and check if it shows your static IP globally
```

**Expected result:** Your domain should return your Lightsail static IP.

---

### Step 3: Install Nginx (Web Server)

**Why Nginx?** It sits in front of your Node.js app and handles HTTPS/SSL.

**In your SSH terminal:**

```bash
sudo apt update
sudo apt install nginx -y
```

**Verify Nginx is running:**

```bash
sudo systemctl status nginx
```

**Expected output:** `active (running)` in green

Press `Q` to exit.

---

### Step 4: Configure Nginx as Reverse Proxy

**What's a reverse proxy?** Nginx receives web traffic on port 80/443 and forwards it to your app on port 5000.

**Create Nginx configuration:**

```bash
sudo nano /etc/nginx/sites-available/edupath
```

**Paste this configuration** (replace `edupath.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name edupath.com www.edupath.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

**Enable the configuration:**

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/edupath /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration for errors
sudo nginx -t
```

**Expected output:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Restart Nginx:**

```bash
sudo systemctl restart nginx
```

---

### Step 5: Test Your Domain (HTTP Only)

**Visit your domain in a browser:**

```
http://edupath.com
```

**✅ You should see your EduPath platform!**

**Note:** It's still `http://` (not secure). We'll add SSL next.

---

### Step 6: Install SSL Certificate with Let's Encrypt

**What's Let's Encrypt?** Free SSL certificates that enable HTTPS.

**Install Certbot (Let's Encrypt client):**

```bash
sudo apt install certbot python3-certbot-nginx -y
```

**Generate and install SSL certificate:**

```bash
sudo certbot --nginx -d edupath.com -d www.edupath.com
```

**You'll be asked several questions:**

1. **Email address:** Enter your email (for renewal notifications)
   - Type your email and press Enter

2. **Terms of Service:** 
   - Type `Y` and press Enter

3. **Share email with EFF:**
   - Type `N` (or `Y` if you want to support them)

**Certbot will now:**
- Verify you own the domain
- Generate SSL certificate
- Automatically configure Nginx for HTTPS
- Set up auto-renewal

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/edupath.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/edupath.com/privkey.pem
```

---

### Step 7: Test Auto-Renewal

**SSL certificates expire every 90 days.** Certbot auto-renews them, but let's test it works:

```bash
sudo certbot renew --dry-run
```

**Expected output:**
```
Congratulations, all simulated renewals succeeded
```

✅ **Success!** Your certificates will auto-renew.

---

### Step 8: Update Firewall (Close Port 5000)

**Security improvement:** Now that Nginx handles traffic, we can close direct access to port 5000.

1. **In Lightsail console, go to your instance**
2. Click **Networking** tab
3. Under **IPv4 Firewall**, find the **Custom TCP 5000** rule
4. Click the **X** to delete it

**Why?** All traffic now goes through Nginx (ports 80/443), making it more secure.

---

### Step 9: Verify HTTPS is Working

**Visit your domain with HTTPS:**

```
https://edupath.com
```

**✅ Success checks:**
- Browser shows a **green padlock** 🔒
- URL starts with `https://`
- No security warnings

**Test both:**
- `https://edupath.com` (root domain)
- `https://www.edupath.com` (www subdomain)

Both should work and show the padlock!

---

### Step 10: Force HTTPS (Redirect HTTP to HTTPS)

**This is already done!** Certbot automatically configured Nginx to redirect all `http://` traffic to `https://`.

**Test it:** Visit `http://edupath.com` (without the 's') - it should automatically redirect to `https://edupath.com`.

---

### Step 11: Update Environment Variables for Production Domain

**Optional but recommended:** Update your `.env` file to use your domain instead of localhost.

```bash
cd ~/edupath-app
nano .env
```

**Add this line** (if your app uses it):

```env
BASE_URL=https://edupath.com
```

**Save and exit** (`Ctrl + X`, `Y`, `Enter`)

**Restart the app:**

```bash
pm2 restart edupath-production
```

---

🎉 **Section Complete!** Your app now has:
- ✅ Custom domain (edupath.com)
- ✅ Free SSL certificate (HTTPS)
- ✅ Auto-renewal of SSL
- ✅ Secure, encrypted connections

**Users can now safely log in and use your platform!**

---

## Post-Deployment

### ⏱️ Time: 15 minutes | 🟢 Difficulty: Easy

### Monitoring Your Application

#### Check if App is Running

**Quick status check:**

```bash
pm2 status
```

**Expected output:**
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ cpu     │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ edupath-production   │ online  │ 0%      │
└─────┴──────────────────────┴─────────┴─────────┘
```

**Status meanings:**
- ✅ `online` = App is running
- ❌ `stopped` = App is not running
- ⚠️ `errored` = App crashed

---

#### View Application Logs

**Real-time logs (live updates):**

```bash
pm2 logs edupath-production
```

Press `Ctrl + C` to exit.

**Last 200 lines:**

```bash
pm2 logs edupath-production --lines 200
```

**Error logs only:**

```bash
pm2 logs edupath-production --err --lines 50
```

**Clear old logs:**

```bash
pm2 flush edupath-production
```

---

#### Monitor Server Resources

**Real-time monitoring (CPU, memory):**

```bash
pm2 monit
```

**What you see:**
- CPU usage (should be <50% normally)
- Memory usage (should be <1.5 GB on the $10 plan)
- Logs scrolling in real-time

Press `Ctrl + C` to exit.

**⚠️ Warning signs:**
- CPU consistently >80% = Your app may be overloaded
- Memory >1.8 GB = Risk of out-of-memory crashes (upgrade to $20 plan)

---

### Restarting Your Application

#### Restart App (if it's frozen or crashed)

```bash
pm2 restart edupath-production
```

**Takes 5 seconds** - app restarts without rebuilding.

---

#### Reload App (zero-downtime restart)

```bash
pm2 reload edupath-production
```

**Better for production** - ensures no downtime, but only works in cluster mode.

---

#### Stop and Start Manually

```bash
# Stop the app
pm2 stop edupath-production

# Start it again
pm2 start dist/index.js --name edupath-production
```

---

### Restart Nginx

**If you change Nginx configuration:**

```bash
# Test config first
sudo nginx -t

# If successful, restart
sudo systemctl restart nginx
```

---

### Restart the Entire Server

**When to do this:** Very rarely (only if updating Ubuntu or kernel)

```bash
sudo reboot
```

**What happens:**
1. Server restarts (2-3 minutes downtime)
2. PM2 automatically starts your app when server comes back online
3. Your app is live again

**Check from your local computer** after 3 minutes:
```
https://edupath.com
```

---

### Database Connection Issues

**Symptom:** App shows "Database connection error"

**Possible causes:**

1. **Supabase is down (rare)**
   - Check: https://status.supabase.com
   - Wait for Supabase to come back online

2. **Wrong DATABASE_URL in .env**
   - Fix: `nano ~/edupath-app/.env` and verify your connection string
   - Restart: `pm2 restart edupath-production`

3. **Supabase changed password**
   - Get new connection string from Supabase dashboard
   - Update `.env` file
   - Restart app

4. **Firewall blocking connection**
   - Check Supabase allows connections from your server IP
   - In Supabase dashboard, go to Settings → Database → Connection pooling
   - Ensure no IP restrictions are blocking your Lightsail IP

**Test database connection:**

```bash
# Install PostgreSQL client
sudo apt install postgresql-client -y

# Test connection (use your DATABASE_URL)
psql "postgresql://postgres:yourpassword@db.xxx.supabase.co:5432/postgres"
```

If successful, you'll see:
```
postgres=>
```

Type `\q` to exit.

---

### Checking Disk Space

**View disk usage:**

```bash
df -h
```

**Expected output:**
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/xvda1       60G   8G   50G  14% /
```

**⚠️ Warning:** If **Use%** is >85%, you're running out of space.

**Free up space:**

```bash
# Clean old npm cache
npm cache clean --force

# Remove old PM2 logs
pm2 flush

# Remove old apt packages
sudo apt autoremove -y
sudo apt clean
```

---

### Updating the Server OS

**Do this monthly for security patches:**

```bash
sudo apt update && sudo apt upgrade -y
```

**If kernel is updated, reboot:**

```bash
sudo reboot
```

---

### Backing Up Your Application

**Create a backup before major updates:**

```bash
# Create backup directory with date
mkdir -p ~/backups/backup-$(date +%Y%m%d-%H%M%S)

# Copy app files
cp -r ~/edupath-app ~/backups/backup-$(date +%Y%m%d-%H%M%S)/

# Copy environment variables
cp ~/edupath-app/.env ~/backups/backup-$(date +%Y%m%d-%H%M%S)/

# Copy Nginx config
sudo cp /etc/nginx/sites-available/edupath ~/backups/backup-$(date +%Y%m%d-%H%M%S)/nginx-edupath.conf

# List backups
ls -lh ~/backups/
```

**Restore from backup:**

```bash
# Stop app
pm2 stop edupath-production

# Remove current version
rm -rf ~/edupath-app

# Copy backup (replace date with your backup folder)
cp -r ~/backups/backup-20250123-143022/edupath-app ~/

# Restart app
cd ~/edupath-app
pm2 restart edupath-production
```

---

### Email Notifications (Optional)

**Set up email alerts when app crashes:**

Install PM2 ecosystem file:

```bash
cd ~/edupath-app
pm2 ecosystem
```

Edit `ecosystem.config.js`:

```bash
nano ecosystem.config.js
```

Add email configuration:

```javascript
module.exports = {
  apps: [{
    name: 'edupath-production',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }],
  
  // Add this section for email alerts
  deploy: {
    production: {
      user: 'ubuntu',
      host: '54.123.45.67', // Your server IP
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/edupath-app.git',
      path: '/home/ubuntu/edupath-app',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
}
```

Save and restart PM2:

```bash
pm2 delete edupath-production
pm2 start ecosystem.config.js --env production
pm2 save
```

---

### Performance Monitoring

**Check response times and uptime:**

Use free monitoring tools:
- **UptimeRobot** (https://uptimerobot.com) - Free, checks every 5 minutes
- **Pingdom** (https://www.pingdom.com) - Free trial, detailed reports

**Setup UptimeRobot:**
1. Sign up at https://uptimerobot.com
2. Add a new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** https://edupath.com
   - **Monitoring Interval:** 5 minutes (free tier)
   - **Alert Contacts:** Your email
3. You'll get email alerts if your site goes down

---

🎉 **Section Complete!** You now know how to:
- ✅ Monitor your app's status
- ✅ View and troubleshoot logs
- ✅ Restart services when needed
- ✅ Back up your application
- ✅ Update and maintain the server

---

## Cost Management

### ⏱️ Time: 15 minutes | 🟢 Difficulty: Easy

### Understanding Your Costs

#### Current Monthly Costs

With your current setup:

| Service | Cost |
|---------|------|
| Lightsail Instance ($10 plan) | $10.00 |
| Static IP (while attached to running instance) | $0.00 |
| Data transfer (first 3 TB) | $0.00 |
| **TOTAL** | **$10.00/month** |

**Additional costs (if you add them later):**
- Snapshots: $0.05/GB per month
- Extra data transfer (>3 TB): $0.09/GB
- Load balancer: $18/month (not needed for your traffic)

---

### Your Credit Balance

**Total credits:** $200

**Monthly cost:** $10

**Duration:** $200 ÷ $10 = **20 months** (1 year 8 months)

**But there's a catch:** AWS bills some services at $11/month (taxes/fees may apply depending on your region).

**Safe estimate:** **18 months of free hosting**

---

### Checking Your Credit Balance

1. **Go to AWS Console**
2. Click your account name (top right) → **"Billing and Cost Management"**
3. In the left menu, click **"Credits"**
4. You'll see:
   - **Available credits:** $XXX
   - **Expiration date:** MM/DD/YYYY
   - **Credits used:** $XXX

**Check this monthly** to track your usage.

---

### Viewing Your Bill

1. **In Billing Dashboard**, click **"Bills"** (left menu)
2. Select the current month
3. You'll see a breakdown:
   - **Total charges:** $10.00 (or $11.xx)
   - **Credits applied:** -$10.00
   - **Amount due:** $0.00

**Screenshot description:** You should see $0.00 amount due as long as credits remain.

---

### Setting Up Budget Alerts

**You did this in Section 3, but let's verify it's working:**

1. Search for **"Budgets"** in AWS Console
2. You should see **"Monthly Spending Limit"** budget
3. Click it to view details
4. **Verify:**
   - Budget amount: $15
   - Email: Your email address
   - Status: Active

**You'll get email alerts at:**
- 80% of budget ($12)
- 100% of budget ($15)
- Actual spend exceeds budget

---

### Reducing Costs

#### Stop Lightsail Instance (Not Recommended)

**If you stop your instance, you still pay for:**
- Attached static IP: **$0.005/hour** (~$3.60/month)
- Disk storage: Still charged

**Savings: Minimal** (maybe $1-2/month)

**Downside:** Your app is offline

**Conclusion:** Not worth it - just keep it running.

---

#### Delete Snapshots You Don't Need

**Snapshots cost $0.05/GB per month.**

If you create manual snapshots (backups), delete old ones:

1. **In Lightsail**, go to **Storage** → **Snapshots**
2. Select old snapshots you don't need
3. Click **Delete**

**Example:**
- 20 GB snapshot × $0.05 = $1/month
- Deleting 5 old snapshots = Save $5/month

**Keep:** 2-3 recent snapshots for safety

---

#### Optimize Application

**Reduce memory and CPU usage:**

1. **Enable Gzip compression** (already done by Nginx)
2. **Optimize images** (use WebP format, compress uploads)
3. **Database query optimization** (index frequently queried columns)
4. **Cache static assets** (Nginx handles this)

**These won't reduce Lightsail costs** (flat $10/month), but they'll improve performance.

---

### What Happens When Credits Run Out?

**After 18 months, your $200 credits are depleted.**

**Option 1: Start Paying $10/Month**
- Your card on file will be charged automatically
- No action needed - service continues uninterrupted

**Option 2: Migrate to a Cheaper Provider**
- Consider: **Render.com**, **Railway.app**, **Fly.io** (all have free/cheaper tiers)
- You'd export your app and database, then redeploy

**Option 3: Apply for More Credits**
- AWS Activate (for startups): https://aws.amazon.com/activate
- AWS Educate (for students): https://aws.amazon.com/education/awseducate/

---

### Preventing Unexpected Charges

#### Set a Spending Limit (CloudWatch Alarm)

**You already did this in Section 3, but verify:**

1. Search for **"CloudWatch"** in AWS Console
2. Click **"Alarms"** (left menu) → **"Billing"**
3. You should see: **"Billing Alert $5"**
4. Status: **"OK"** (green)

**If status turns to "ALARM" (red):**
- You'll get an email immediately
- Check your Billing dashboard for details
- Investigate what service is causing charges

---

#### Enable MFA (Multi-Factor Authentication)

**Why?** Prevent unauthorized access that could create expensive resources.

1. Go to **IAM** in AWS Console
2. Click your username → **Security credentials**
3. Click **"Assign MFA device"**
4. Follow the wizard to set up Google Authenticator or Authy

**This prevents hackers from:**
- Launching expensive EC2 instances
- Creating RDS databases
- Racking up charges on your account

---

### Monthly Cost Checklist

**Do this on the 1st of every month:**

- [ ] Check **Billing → Credits** - verify credits remain
- [ ] Check **Billing → Bills** - verify amount due is $0.00
- [ ] Review **Cost Explorer** - ensure no unexpected spikes
- [ ] Check Lightsail usage - still within 3 TB transfer limit
- [ ] Delete old snapshots (if any)

**Time required:** 5 minutes/month

---

🎉 **Section Complete!** You now understand:
- ✅ Exactly what you're paying ($10/month, covered by credits)
- ✅ How long your credits will last (18 months)
- ✅ How to monitor costs and avoid surprises
- ✅ What to do when credits run out

---

## Troubleshooting

### ⏱️ Time: Variable | 🔴 Difficulty: Depends on Issue

### Common Issues and Fixes

---

### Issue 1: Website Not Loading (Blank Page)

**Symptoms:**
- Browser shows "This site can't be reached"
- ERR_CONNECTION_REFUSED
- Timeout error

**Possible causes and fixes:**

#### 1.1 App is Not Running

**Check:**
```bash
pm2 status
```

**If status is "stopped" or "errored":**
```bash
pm2 restart edupath-production
pm2 logs edupath-production --lines 50
```

**Look for errors** in the logs and fix them.

---

#### 1.2 Firewall Blocking Access

**Check Lightsail firewall:**
1. Go to Lightsail console → Your instance
2. Click **Networking** tab
3. Verify these ports are open:
   - ✅ SSH (22)
   - ✅ HTTP (80)
   - ✅ HTTPS (443)

**If missing, add them** (see Section 4, Step 8).

---

#### 1.3 Nginx is Not Running

**Check Nginx status:**
```bash
sudo systemctl status nginx
```

**If inactive/stopped:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

**If failed:**
```bash
# Check error logs
sudo tail -50 /var/log/nginx/error.log

# Test config
sudo nginx -t

# If config errors, fix them and restart
sudo systemctl restart nginx
```

---

#### 1.4 DNS Not Configured Correctly

**Check DNS:**
```bash
nslookup yourdomain.com
```

**Expected:** Should show your Lightsail static IP

**If wrong:**
- Verify your DNS A records (see Section 7, Step 1)
- Wait up to 48 hours for DNS propagation
- Use https://www.whatsmydns.net to check global DNS propagation

---

### Issue 2: "502 Bad Gateway" Error

**Symptoms:**
- Nginx shows "502 Bad Gateway" page

**Meaning:** Nginx is running but can't connect to your Node.js app on port 5000.

**Fixes:**

#### 2.1 App Crashed

**Check PM2:**
```bash
pm2 status
```

**If errored:**
```bash
pm2 logs edupath-production --err --lines 50
```

**Common errors:**
- **"Cannot find module"** → Run `npm install`
- **"Port 5000 already in use"** → Another process is using port 5000
- **"Database connection error"** → Check DATABASE_URL in `.env`

**Restart after fixing:**
```bash
pm2 restart edupath-production
```

---

#### 2.2 Wrong Port in Nginx Config

**Check Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/edupath
```

**Verify this line:**
```nginx
proxy_pass http://localhost:5000;
```

**Should match the PORT in your .env file** (default: 5000).

**If you changed it, update Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

### Issue 3: SSL Certificate Errors

**Symptoms:**
- "Your connection is not private"
- "NET::ERR_CERT_DATE_INVALID"
- Red padlock or warning triangle

**Fixes:**

#### 3.1 Certificate Expired

**Check expiration:**
```bash
sudo certbot certificates
```

**If expired, renew:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

#### 3.2 Certificate Doesn't Match Domain

**Symptom:** Certificate is for a different domain

**Fix:** Re-issue certificate for your domain:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --force-renewal
```

---

#### 3.3 Mixed Content (HTTP resources on HTTPS page)

**Symptom:** Padlock shows warning, some content not loading

**Fix:** Check browser console (F12) for mixed content errors.

**Update your code** to use `https://` for all external resources (images, scripts, APIs).

---

### Issue 4: Database Connection Errors

**Symptoms:**
- App shows "Database connection failed"
- Logs show "ECONNREFUSED" or "timeout"

**Fixes:**

#### 4.1 Wrong DATABASE_URL

**Check your .env file:**
```bash
nano ~/edupath-app/.env
```

**Verify DATABASE_URL format:**
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

**Test connection:**
```bash
sudo apt install postgresql-client -y
psql "your-database-url-here"
```

**If successful, you'll see `postgres=>`**

**If failed:** Check password, hostname, port in Supabase dashboard.

---

#### 4.2 Supabase Paused Free Tier Project

**Supabase pauses inactive projects after 7 days.**

**Fix:**
1. Go to Supabase dashboard
2. Click your project
3. Click **"Restore"** or **"Unpause"**
4. Wait 2-3 minutes
5. Restart your app: `pm2 restart edupath-production`

---

#### 4.3 Connection Pooling Limits

**Symptom:** "Too many connections" error

**Fix:** Use Supabase's connection pooling URL instead of direct connection.

**In Supabase dashboard:**
1. Settings → Database → **Connection Pooling**
2. Copy the **Transaction pooler** connection string
3. Update `.env` file with this URL (add `?pgbouncer=true` at the end)
4. Restart app

---

### Issue 5: Out of Memory / App Crashing

**Symptoms:**
- PM2 status shows "errored" or keeps restarting
- Logs show "JavaScript heap out of memory"

**Fixes:**

#### 5.1 Increase Memory Limit

**In ecosystem.config.js:**
```bash
nano ~/edupath-app/ecosystem.config.js
```

**Add this:**
```javascript
module.exports = {
  apps: [{
    name: 'edupath-production',
    script: './dist/index.js',
    node_args: '--max-old-space-size=1536', // 1.5 GB
    max_memory_restart: '1G'
  }]
}
```

**Restart:**
```bash
pm2 delete edupath-production
pm2 start ecosystem.config.js
pm2 save
```

---

#### 5.2 Upgrade Lightsail Plan

**If crashes persist:**

1. Create a snapshot (backup) first
2. Go to Lightsail → Your instance → **Manage**
3. Click **"Change plan"**
4. Select **$20/month plan** (4 GB RAM, 2 vCPU)
5. Click **"Change plan"**

**Downtime:** ~5 minutes during upgrade

---

### Issue 6: Port 5000 Already in Use

**Symptoms:**
- App fails to start
- Error: "EADDRINUSE: address already in use :::5000"

**Fix:**

**Find what's using port 5000:**
```bash
sudo lsof -i :5000
```

**Expected output:**
```
COMMAND   PID USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
node    12345 ubuntu   21u  IPv6  123456      0t0  TCP *:5000 (LISTEN)
```

**Kill the process:**
```bash
sudo kill -9 12345
```

**Replace `12345` with the actual PID** from the output above.

**Restart your app:**
```bash
pm2 restart edupath-production
```

---

### Issue 7: "Cannot GET /api/..." (404 Errors)

**Symptoms:**
- Frontend loads fine
- API requests fail with 404

**Possible causes:**

#### 7.1 API Routes Not Built

**Rebuild your app:**
```bash
cd ~/edupath-app
npm run build
pm2 restart edupath-production
```

---

#### 7.2 Nginx Blocking API Routes

**Check Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/edupath
```

**Make sure it has this location block** (not multiple conflicting ones):
```nginx
location / {
    proxy_pass http://localhost:5000;
    ...
}
```

**Do NOT have separate `/api` blocks** unless specifically needed.

**Restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

### Issue 8: Code Changes Not Showing

**Symptoms:**
- You deployed new code but website shows old version
- Cache seems stuck

**Fixes:**

#### 8.1 Rebuild and Restart

**Ensure you rebuild after pulling code:**
```bash
cd ~/edupath-app
git pull origin main
npm install
npm run build    # THIS IS CRITICAL
pm2 restart edupath-production
```

---

#### 8.2 Browser Cache

**Clear browser cache:**
- **Chrome/Edge:** Ctrl + Shift + Delete → "Cached images and files" → Clear
- **Firefox:** Ctrl + Shift + Delete → "Cache" → Clear
- **Safari:** Cmd + Option + E

**Or use Incognito/Private mode** to test.

---

#### 8.3 CDN/Proxy Cache

**If using Cloudflare or similar:**
1. Log in to Cloudflare dashboard
2. Go to **Caching** → **Purge Everything**

---

### Issue 9: SSH Connection Refused

**Symptoms:**
- Can't connect via browser SSH
- FileZilla/SFTP can't connect

**Fixes:**

#### 9.1 Instance is Stopped

**Check in Lightsail console:**
1. Go to your instance
2. If status is "Stopped", click **"Start"**
3. Wait 2 minutes for it to boot

---

#### 9.2 Firewall Blocking SSH

**Check firewall:**
1. Lightsail → Instance → Networking
2. Ensure SSH (port 22) is open

---

#### 9.3 Instance is Rebooting

**Wait 3-5 minutes** after reboot before trying to connect.

---

### Issue 10: High Data Transfer (Approaching 3 TB Limit)

**Check data transfer:**
1. Lightsail → Instance → **Metrics** tab
2. View **"Network out"** graph

**If approaching 3 TB:**

**Optimize images:**
```bash
# Install image optimization tools
sudo apt install optipng jpegoptim -y

# Optimize images (example)
find ~/edupath-app/uploads -name "*.png" -exec optipng {} \;
find ~/edupath-app/uploads -name "*.jpg" -exec jpegoptim --max=85 {} \;
```

**Enable better compression in Nginx:**
```bash
sudo nano /etc/nginx/nginx.conf
```

**Add to `http {}` block:**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

---

### Diagnostic Commands

**Server health:**
```bash
# CPU and memory
top

# Disk usage
df -h

# Network connections
sudo netstat -tulpn

# System logs
sudo journalctl -xe
```

**App-specific:**
```bash
# PM2 status
pm2 status

# App logs
pm2 logs edupath-production --lines 100

# Nginx logs
sudo tail -100 /var/log/nginx/access.log
sudo tail -100 /var/log/nginx/error.log

# System resource usage
pm2 monit
```

---

### Getting Help

**If you're still stuck:**

1. **Check application logs first:**
   ```bash
   pm2 logs edupath-production --lines 200
   ```

2. **Check Nginx error logs:**
   ```bash
   sudo tail -100 /var/log/nginx/error.log
   ```

3. **Check system logs:**
   ```bash
   sudo journalctl -xe --no-pager | tail -100
   ```

4. **Search for the error message:**
   - Copy the exact error message
   - Google: "lightsail nodejs [your error message]"
   - Or ask on Stack Overflow: https://stackoverflow.com

5. **AWS Support:**
   - Free basic support: https://console.aws.amazon.com/support
   - AWS forums: https://forums.aws.amazon.com

---

🎉 **Troubleshooting Guide Complete!**

Most issues are solved by:
1. Checking PM2 status and logs
2. Verifying Nginx is running
3. Rebuilding the app after code changes
4. Checking environment variables

**Remember:** Always check logs first - they tell you exactly what went wrong!

---

## Appendix

### Quick Reference Commands

#### PM2 Commands
```bash
pm2 status                           # Check app status
pm2 restart edupath-production       # Restart app
pm2 logs edupath-production          # View logs
pm2 monit                            # Real-time monitoring
pm2 save                             # Save PM2 process list
pm2 flush                            # Clear logs
```

#### Nginx Commands
```bash
sudo nginx -t                        # Test config
sudo systemctl restart nginx         # Restart Nginx
sudo systemctl status nginx          # Check status
sudo tail -f /var/log/nginx/error.log  # View error logs
```

#### Application Updates
```bash
cd ~/edupath-app
git pull origin main
npm install
npm run build
pm2 restart edupath-production
```

#### Server Maintenance
```bash
sudo apt update && sudo apt upgrade -y  # Update packages
df -h                                   # Check disk space
top                                     # View CPU/memory
sudo reboot                             # Restart server
```

---

### Environment Variables Reference

**Required in `.env` file:**

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Security Secrets (generate with Node.js crypto)
JWT_SECRET=64-character-hex-string
CSRF_SECRET=32-character-hex-string

# Application Settings
NODE_ENV=production
PORT=5000

# Admin Account (optional)
ADMIN_PASSWORD=your-secure-password

# Email Service (optional)
SENDGRID_API_KEY=your-api-key
```

---

### File Locations Reference

**Application files:**
- App directory: `/home/ubuntu/edupath-app`
- Built files: `/home/ubuntu/edupath-app/dist`
- Environment: `/home/ubuntu/edupath-app/.env`

**Nginx configuration:**
- Site config: `/etc/nginx/sites-available/edupath`
- Enabled sites: `/etc/nginx/sites-enabled/`
- Access logs: `/var/log/nginx/access.log`
- Error logs: `/var/log/nginx/error.log`

**SSL certificates (Let's Encrypt):**
- Certificates: `/etc/letsencrypt/live/yourdomain.com/`
- Renewal config: `/etc/letsencrypt/renewal/`

**PM2 files:**
- PM2 home: `/home/ubuntu/.pm2`
- Logs: `/home/ubuntu/.pm2/logs/`
- Saved config: `/home/ubuntu/.pm2/dump.pm2`

---

### Useful Resources

**AWS Documentation:**
- Lightsail docs: https://docs.aws.amazon.com/lightsail
- Lightsail console: https://lightsail.aws.amazon.com
- AWS Free Tier: https://aws.amazon.com/free

**Tools & Services:**
- PM2 documentation: https://pm2.keymetrics.io/docs
- Nginx documentation: https://nginx.org/en/docs
- Let's Encrypt: https://letsencrypt.org
- Certbot: https://certbot.eff.org
- Supabase docs: https://supabase.com/docs

**Monitoring:**
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- AWS CloudWatch: https://console.aws.amazon.com/cloudwatch

**Community Support:**
- Stack Overflow: https://stackoverflow.com/questions/tagged/aws-lightsail
- AWS Forums: https://forums.aws.amazon.com
- Reddit: r/aws, r/node

---

### Estimated Costs Breakdown

**Current setup (18 months free with credits):**

| Item | Monthly Cost | Covered by Credits |
|------|--------------|-------------------|
| Lightsail $10 instance | $10.00 | ✅ Yes |
| Static IP (attached) | $0.00 | N/A |
| Data transfer (first 3 TB) | $0.00 | N/A |
| SSL certificate (Let's Encrypt) | $0.00 | N/A |
| **TOTAL** | **$10.00** | **✅ Covered** |

**After credits run out (month 19+):**
- Same costs, but charged to your credit card
- **$10.00/month** ongoing

**Optional add-ons:**
- Manual snapshots: $0.05/GB/month
- Lightsail CDN: $2.50/month + bandwidth
- Lightsail Load Balancer: $18/month (not needed for your traffic)

---

### Security Best Practices

**✅ Implemented in this guide:**
- HTTPS/SSL with auto-renewal
- Firewall configuration
- Secure secret generation
- Environment variables (not hardcoded)
- Regular updates

**🔐 Additional recommendations:**

1. **Enable AWS MFA** (Multi-Factor Authentication)
   - Protects your AWS account
   - Setup: AWS Console → IAM → Security Credentials

2. **Regular backups**
   - Create monthly snapshots in Lightsail
   - Store critical data off-server (e.g., Supabase backups)

3. **Update dependencies monthly**
   ```bash
   cd ~/edupath-app
   npm update
   npm audit fix
   npm run build
   pm2 restart edupath-production
   ```

4. **Monitor security logs**
   ```bash
   sudo tail -f /var/log/auth.log  # SSH login attempts
   ```

5. **Rate limiting**
   - Already implemented in your Express app
   - Prevents abuse and DDoS attacks

---

### Performance Optimization Tips

**Already optimized:**
- Gzip compression (Nginx)
- Static file serving (Nginx)
- PM2 process management

**Future optimizations (if traffic grows):**

1. **Enable caching**
   - Browser caching via Nginx headers
   - Redis for session storage

2. **Database indexing**
   - Add indexes to frequently queried columns in Supabase

3. **CDN for static assets**
   - Use Lightsail CDN or Cloudflare
   - Offload image/JS/CSS delivery

4. **Enable PM2 cluster mode**
   - Run multiple instances of your app
   - Better CPU utilization

---

### Scaling Beyond 2,000 Users

**When you outgrow the $10 instance:**

**Option 1: Upgrade Lightsail Plan**
- $20/month: 4 GB RAM, 2 vCPU (handles ~5,000 users)
- $40/month: 8 GB RAM, 2 vCPU (handles ~10,000 users)

**Option 2: Add Lightsail Load Balancer**
- $18/month
- Distribute traffic across multiple $10 instances
- Better reliability and performance

**Option 3: Migrate to AWS EC2 + RDS**
- More control and scalability
- More complex to manage
- Higher costs ($30-50/month minimum)

**Option 4: Use Platform-as-a-Service**
- Render.com, Railway.app, Vercel
- Easier management
- Similar or lower costs

---

🎉 **Deployment Guide Complete!**

**You've successfully:**
- ✅ Set up AWS account with $200 credits
- ✅ Created a Lightsail instance
- ✅ Deployed your Node.js application
- ✅ Configured custom domain with SSL
- ✅ Set up monitoring and cost controls
- ✅ Learned troubleshooting and maintenance

**Your EduPath platform is now live and production-ready!**

**Questions?** Refer to the Troubleshooting section or reach out to the AWS community forums.

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Platform:** AWS Lightsail + Node.js 20 + Ubuntu 22.04

---
