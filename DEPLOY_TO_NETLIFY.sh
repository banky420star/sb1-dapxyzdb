#!/bin/bash

# 🚀 Netlify Deployment Script for AI Trading Platform
# Version: 2.0.0 - Enhanced with production checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 AI TRADING PLATFORM - NETLIFY DEPLOYMENT 🚀           ║"
echo "║                                                               ║"
echo "║     Autonomous Trading | AI Consensus | Risk Management      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Pre-deployment checks
echo -e "${YELLOW}📋 Step 1/7: Running pre-deployment checks...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm version: $(npm -v)${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git installed${NC}"

# Step 2: Install Netlify CLI
echo -e "\n${YELLOW}📦 Step 2/7: Checking Netlify CLI...${NC}"

if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}Installing Netlify CLI globally...${NC}"
    npm install -g netlify-cli
    echo -e "${GREEN}✅ Netlify CLI installed${NC}"
else
    echo -e "${GREEN}✅ Netlify CLI already installed ($(netlify --version))${NC}"
fi

# Step 3: Netlify authentication
echo -e "\n${YELLOW}🔐 Step 3/7: Netlify authentication...${NC}"

if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}Please login to Netlify (browser will open)...${NC}"
    netlify login
    echo -e "${GREEN}✅ Logged in to Netlify${NC}"
else
    echo -e "${GREEN}✅ Already logged in to Netlify${NC}"
fi

# Step 4: Install dependencies
echo -e "\n${YELLOW}📦 Step 4/7: Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm packages...${NC}"
    npm ci --production=false
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Step 5: Run production build
echo -e "\n${YELLOW}🔨 Step 5/7: Building production bundle...${NC}"

# Clean previous build
if [ -d "dist" ]; then
    rm -rf dist
    echo "🗑️  Cleaned previous build"
fi

# Run build
echo "Building with Vite..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed! dist directory not created.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Production build complete${NC}"

# Display build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}📦 Build size: ${BUILD_SIZE}${NC}"

# Step 6: Deploy to Netlify
echo -e "\n${YELLOW}🚀 Step 6/7: Deploying to Netlify...${NC}"

# Check if site is already linked
if [ ! -f ".netlify/state.json" ]; then
    echo -e "${YELLOW}First time deployment. Initializing Netlify site...${NC}"
    netlify init
fi

# Deploy to production
echo "Deploying to production..."
netlify deploy --prod --dir=dist

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

# Step 7: Post-deployment verification
echo -e "\n${YELLOW}🔍 Step 7/7: Post-deployment verification...${NC}"

# Get deployment URL
echo "Fetching deployment information..."
SITE_INFO=$(netlify status)
SITE_URL=$(echo "$SITE_INFO" | grep "Site Url:" | awk '{print $3}')
SITE_ID=$(echo "$SITE_INFO" | grep "Site Id:" | awk '{print $3}')

echo -e "${GREEN}✅ Site ID: ${SITE_ID}${NC}"
echo -e "${GREEN}✅ Site URL: ${SITE_URL}${NC}"

# Health check
echo "Running health check..."
sleep 3  # Wait for deployment to propagate
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
fi

# Environment variables reminder
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 IMPORTANT: Configure Environment Variables${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Go to Netlify Dashboard → Site Settings → Environment Variables"
echo "and add the following variables:"
echo ""
echo -e "${GREEN}VITE_API_BASE${NC}=https://sb1-dapxyzdb-trade-shit.up.railway.app"
echo -e "${GREEN}NODE_ENV${NC}=production"
echo -e "${GREEN}NODE_VERSION${NC}=18"
echo ""
echo "After adding variables, trigger a new deployment for them to take effect."
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Frontend deployed successfully${NC}"
echo -e "${GREEN}✅ Site URL: ${SITE_URL}${NC}"
echo -e "${GREEN}✅ Backend API: https://sb1-dapxyzdb-trade-shit.up.railway.app${NC}"
echo ""
echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo "1. Configure environment variables in Netlify dashboard"
echo "2. Set up custom domain: methtrader.xyz (optional)"
echo "3. Configure DNS records (if using custom domain)"
echo "4. Test all functionality on the live site"
echo "5. Enable Netlify Analytics (optional)"
echo "6. Set up monitoring and alerts"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "- Deployment Guide: NETLIFY_DEPLOYMENT_COMPLETE.md"
echo "- Production Ready Report: PRODUCTION_READY_REPORT.md"
echo "- Trade Ready Verification: TRADE_READY_VERIFICATION.md"
echo "- Quick Start: QUICK_START.md"
echo ""
echo -e "${YELLOW}🔗 Quick Links:${NC}"
echo "- Open site: netlify open:site"
echo "- Open dashboard: netlify open:admin"
echo "- View logs: netlify watch"
echo "- Deploy again: netlify deploy --prod"
echo ""
echo -e "${GREEN}💰 Your AI trading system is now live!${NC}"
echo -e "${GREEN}Start with paper trading mode and monitor performance.${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

# Open site in browser (optional)
read -p "Would you like to open the site in your browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    netlify open:site
fi

# Open admin dashboard (optional)
read -p "Would you like to open the Netlify dashboard? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    netlify open:admin
fi

echo ""
echo -e "${GREEN}🚀 Deployment script completed successfully!${NC}"
echo ""
