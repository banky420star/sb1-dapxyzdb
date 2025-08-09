#!/bin/bash
# 🧪 Smoke Tests for Netlify Functions
# Tests the exact playbook implementation

SITE_URL="https://delightful-crumble-983869.netlify.app"

echo "🧪 SMOKE TESTS: Netlify Functions + Bybit V5"
echo "=============================================="

echo ""
echo "📍 Testing Functions at: $SITE_URL"

# Test 1: Order Creation
echo ""
echo "🔸 Test 1: Order Creation Function"
echo "curl -sS -X POST $SITE_URL/.netlify/functions/orders-create"

curl -sS -X POST \
  "$SITE_URL/.netlify/functions/orders-create" \
  -H "content-type: application/json" \
  -d '{"category":"linear","symbol":"BTCUSDT","side":"Buy","orderType":"Limit","qty":"0.001","price":"35000"}' \
  | jq '.' 2>/dev/null || echo "Response received (not JSON formatted)"

# Test 2: Positions
echo ""
echo "🔸 Test 2: Positions Function" 
echo "curl -sS $SITE_URL/.netlify/functions/positions?category=linear"

curl -sS "$SITE_URL/.netlify/functions/positions?category=linear" \
  | jq '.' 2>/dev/null || echo "Response received (not JSON formatted)"

# Test 3: Account Balance
echo ""
echo "🔸 Test 3: Account Balance Function"
echo "curl -sS $SITE_URL/.netlify/functions/account-balance?accountType=UNIFIED"

curl -sS "$SITE_URL/.netlify/functions/account-balance?accountType=UNIFIED" \
  | jq '.' 2>/dev/null || echo "Response received (not JSON formatted)"

echo ""
echo "✅ Smoke tests complete!"
echo "🔧 If you see signature/401 errors, add environment variables in Netlify dashboard"
echo "🌐 Dashboard: https://app.netlify.com/sites/delightful-crumble-983869/settings/environment"