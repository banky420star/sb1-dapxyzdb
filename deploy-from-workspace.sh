#!/bin/bash

# Deploy AI Trading System from this workspace using Vultr API
# Requirements: curl, ssh-keygen, ssh, scp, tar, npm

set -e

API_KEY="${VULTR_API_KEY:-7CEVCTGACCAF6M3VXHBS7MNEKKHBYW5RGVBA}"
REGION="ewr"
PLAN="vc2-1c-1gb"
OS_ID="1743"  # Ubuntu 22.04 LTS x64
LABEL="ai-trading-workspace"

WORKSPACE_KEY="/workspace/deploy_key"
PUBLIC_KEY_FILE="${WORKSPACE_KEY}.pub"
SSH_KEY_NAME="workspace-key-$(date +%s)"

# Generate key if not exists
if [ ! -f "$WORKSPACE_KEY" ]; then
  echo "🔑 Generating SSH key pair in workspace..."
  ssh-keygen -t rsa -b 4096 -N "" -f "$WORKSPACE_KEY" >/dev/null
fi
PUBLIC_KEY_CONTENT=$(cat "$PUBLIC_KEY_FILE")

vultr_api() {
  curl -s -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" "$@"
}

echo "🚀 Uploading workspace public key to Vultr..."
UPLOAD_RESP=$(vultr_api -X POST "https://api.vultr.com/v2/ssh-keys" -d "{\"name\":\"$SSH_KEY_NAME\",\"ssh_key\":\"$PUBLIC_KEY_CONTENT\"}") || true
if echo "$UPLOAD_RESP" | grep -q 'id'; then
  SSH_KEY_ID=$(echo "$UPLOAD_RESP" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
  # key might already exist (duplicate). Reuse existing
  SSH_KEY_ID=$(vultr_api "https://api.vultr.com/v2/ssh-keys" | grep -B1 "$PUBLIC_KEY_CONTENT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
fi
if [ -z "$SSH_KEY_ID" ]; then
  echo "❌ Failed to upload or locate SSH key on Vultr"; exit 1; fi

echo "✅ SSH key ID: $SSH_KEY_ID"

# Create instance
CREATE_PAYLOAD=$(cat <<EOF
{
  "region": "$REGION",
  "plan": "$PLAN",
  "os_id": $OS_ID,
  "label": "$LABEL",
  "sshkey_id": ["$SSH_KEY_ID"],
  "enable_ipv6": false,
  "hostname": "ai-trading"
}
EOF
)

echo "🖥️  Creating Vultr instance..."
CREATE_RESP=$(vultr_api -X POST "https://api.vultr.com/v2/instances" -d "$CREATE_PAYLOAD")
INSTANCE_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$INSTANCE_ID" ]; then echo "❌ Unable to create instance"; echo "$CREATE_RESP"; exit 1; fi

echo "✅ Instance ID: $INSTANCE_ID"

# Wait for ready
echo "⏳ Waiting for server to become active..."
while true; do
  STATUS_JSON=$(vultr_api "https://api.vultr.com/v2/instances/$INSTANCE_ID")
  STATUS=$(echo "$STATUS_JSON" | grep -o '"server_status":"[^"]*' | cut -d'"' -f4)
  if [ "$STATUS" = "ok" ]; then break; fi
  echo "   Status: $STATUS (waiting...)"; sleep 10;
done
SERVER_IP=$(echo "$STATUS_JSON" | grep -o '"main_ip":"[^"]*' | cut -d'"' -f4)
echo "✅ Server ready at $SERVER_IP"

# Wait a bit for SSH
sleep 30

# Test SSH
SSH_CMD="ssh -i $WORKSPACE_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@$SERVER_IP"
if ! $SSH_CMD "echo 'SSH connected'" >/dev/null 2>&1; then
  echo "❌ SSH connection failed. Trying again in 15s..."; sleep 15;
fi
$SSH_CMD "echo 'SSH connection established'"

# Install dependencies on server (node, npm, pm2, rsync)
$SSH_CMD <<'SERVERSETUP'
set -e
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl tar rsync build-essential git
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y -qq nodejs
npm install -g pm2 >/dev/null
SERVERSETUP

echo "📦 Creating application archive..."
tar --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='dist' -czf /tmp/app.tar.gz .

echo "📤 Uploading archive..."
scp -i "$WORKSPACE_KEY" -o StrictHostKeyChecking=no /tmp/app.tar.gz root@$SERVER_IP:/root/

# Deploy on server
$SSH_CMD <<'DEPLOY'
set -e
mkdir -p /root/ai-trading-system
cd /root/ai-trading-system
rm -rf * || true

# Extract
tar -xzf /root/app.tar.gz -C /root/ai-trading-system
rm /root/app.tar.gz

# Install deps
npm install --omit=dev

# Build frontend
npm run build --if-present

# Start app
pm2 delete ai-trading || true
PORT=80 pm2 start server.js --name ai-trading
pm2 save
DEPLOY

echo "🎉 Deployment finished!"
echo "Dashboard   : http://$SERVER_IP"
echo "Backend API : http://$SERVER_IP:8000"
echo "Health check: http://$SERVER_IP:8000/api/health"