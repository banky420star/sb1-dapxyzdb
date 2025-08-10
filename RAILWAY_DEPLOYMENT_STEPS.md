# 🚀 Railway Deployment - Step by Step Guide

## 🎯 **Railway Dashboard Deployment Instructions**

### **Step 1: Access Railway Dashboard**
1. Go to: https://railway.app/dashboard
2. Sign in to your Railway account

### **Step 2: Open Your Project**
1. Find and click on your project: `fe622622-dbe0-490e-ab89-151fd0b8d21d`
2. You'll see the project canvas

### **Step 3: Add New Service**
1. Click **"Add Service"** button
2. Select **"Deploy from GitHub"** option

### **Step 4: Connect GitHub Repository**
1. Search for: `sb1-dapxyzdb`
2. Click on the repository when it appears
3. Click **"Deploy"** or **"Add Variables"**

### **Step 5: Configure Service Settings**
1. **Service Name**: `trading-backend` (or leave default)
2. **Root Directory**: `railway-backend` ⭐ **IMPORTANT**
3. **Branch**: `feature/futuristic-ui`

### **Step 6: Set Environment Variables**
Add these environment variables:

```
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_RECV_WINDOW=5000
NODE_ENV=production
```

### **Step 7: Deploy**
1. Click **"Deploy"** button
2. Wait for deployment to complete (2-3 minutes)

## 🔍 **Finding Root Directory Setting**

### **Option A: During Initial Setup**
- After selecting the GitHub repo, you'll see a configuration screen
- Look for **"Root Directory"** field
- Enter: `railway-backend`

### **Option B: In Service Settings**
1. After deployment, click on your service
2. Go to **"Settings"** tab
3. Look for **"Root Directory"** setting
4. Change it to: `railway-backend`
5. Click **"Save"** and redeploy

### **Option C: Redeploy with Correct Settings**
1. Go to **"Deployments"** tab
2. Click **"Redeploy"**
3. In the deployment options, set **Root Directory** to: `railway-backend`

## 📁 **Directory Structure Verification**

Your repository structure should look like this:
```
sb1-dapxyzdb/
├── railway-backend/          ← This is your root directory
│   ├── package.json
│   ├── server.js
│   ├── railway.json
│   ├── railway.toml
│   └── ...
├── src/
├── public/
└── ...
```

## 🚨 **Common Issues & Solutions**

### **Issue: "Cannot find root directory"**
**Solution**: Make sure you're entering exactly `railway-backend` (no spaces, correct case)

### **Issue: "No package.json found"**
**Solution**: Verify the root directory is set to `railway-backend` where package.json exists

### **Issue: "Build failed"**
**Solution**: Check that you're on the `feature/futuristic-ui` branch

## ✅ **Verification Steps**

After deployment:
1. Check the **"Deployments"** tab for success
2. Click **"Generate Domain"** to get your URL
3. Test the health endpoint: `https://your-domain.railway.app/health`
4. Should return: `{"status":"healthy","timestamp":"...","uptime":...}`

## 🌐 **Expected Backend URL**
```
https://trading-backend-fe622622-dbe0-490e-ab89-151fd0b8d21d.railway.app
```

## 📞 **Need Help?**
If you still can't find the root directory setting:
1. Take a screenshot of the Railway deployment screen
2. Look for any configuration options or advanced settings
3. The setting might be called "Source Directory" or "Build Directory" 