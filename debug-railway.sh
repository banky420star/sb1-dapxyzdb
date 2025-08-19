#!/bin/bash

echo "🔍 Railway Debug Script"
echo "========================"
echo ""

# SSH into Railway
echo "🚀 Connecting to Railway service..."
railway ssh --project=fe622622-dbe0-490e-ab89-151fd0b8d21d --environment=e3484a57-1a3f-4392-a78d-812a8426b616 --service=9a5ebcd4-56b1-4bf0-a150-38e49b4383f1

echo ""
echo "📋 Once connected, run these commands inside the Railway container:"
echo ""
echo "# 1. Check current directory and files"
echo "ls -la"
echo "pwd"
echo ""
echo "# 2. Look for server files"
echo "find . -name '*.js' -type f"
echo ""
echo "# 3. Check package.json"
echo "cat package.json"
echo ""
echo "# 4. Check server.js content"
echo "head -20 server.js"
echo ""
echo "# 5. Try to start the server manually"
echo "npm start"
echo ""
echo "# 6. Check environment variables"
echo "env | grep -E '(BYBIT|TRADING|NODE)'"
echo ""
echo "🔧 This will help us identify why the server is failing to start." 