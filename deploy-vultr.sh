#!/bin/bash

# AI Trading System - Vultr Deployment Script
# Automatically creates a VPS and deploys your app

set -e

echo "🚀 AI Trading System - Vultr Deployment"
echo "======================================"
echo ""

# Configuration
VULTR_API_KEY="${VULTR_API_KEY:-7CEVCTGACCAF6M3VXHBS7MNEKKHBYW5RGVBA}"
SERVER_LABEL="ai-trading-system"
REGION="ewr"  # New Jersey (closest to financial markets)
PLAN="vc2-1c-1gb"  # 1 vCPU, 1GB RAM ($5/month)
OS_ID="1743"  # Ubuntu 22.04 LTS x64
SSH_KEY_NAME="mac@Macs-Air-2.home"

# Your SSH public key
SSH_PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC+T7w0DHBvTEo+8JLpSQji2fxZFlzsN12WLurvsGdvXi+tZXP3TY9Nw9/oUN7CnPmo2//RDwxVWgDbuoQvr/pgQXPJXmN0PrRsTjXsq8+tU/VmGZwypSDxh0NZgvWjnGil5GoCKu2vfF4c+mcW3yQt/0Ry+DiqzUWR8UHSUwOJ/ZE/YCLsmhIk1C500rfiqsKph3yFtapH3BZqNn6XVwDz8ih/SqBuCx+uEUqp+GGSttF4UXcumolC1qTeB30rZ/rar25TGyWduvCIfOL8v6h6T6npfVoVQkArY4UwQMPi0bGlLc7gU5KTtCHodOyiMXxVmAcWbox+bzVtxEz7R3P2mrrxbbbXpsemWqTBh3LB7cPoNfUEbxDXShbD242X22hudCZmggStUJGcdlgxQ5uhrWBpvdJhgAMrf2fD+ylClHY45JbCK1+LlXAbCDGpXqdQkJJJDqTchCvkXgaCS4i1/p+pi06TLOAkOOnyiHPfnMHVqS5COwTxfDXM+6BGfQ8= mac@Macs-Air-2.home"

# Function to make Vultr API calls
vultr_api() {
    curl -s -H "Authorization: Bearer $VULTR_API_KEY" \
         -H "Content-Type: application/json" \
         "$@"
}

echo "🔑 Checking Vultr API access..."
if ! vultr_api "https://api.vultr.com/v2/account" | grep -q "balance"; then
    echo "❌ API key invalid or no access"
    exit 1
fi
echo "✅ API key valid"

# Create SSH key in Vultr
echo "🔐 Adding SSH key to Vultr..."
SSH_KEY_ID=$(vultr_api -X POST "https://api.vultr.com/v2/ssh-keys" \
    -d "{\"name\":\"$SSH_KEY_NAME\",\"ssh_key\":\"$SSH_PUBLIC_KEY\"}" | \
    grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "existing")

if [ "$SSH_KEY_ID" = "existing" ]; then
    # Get existing SSH key ID
    SSH_KEY_ID=$(vultr_api "https://api.vultr.com/v2/ssh-keys" | \
        grep -B1 "$SSH_KEY_NAME" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
fi
echo "✅ SSH key ID: $SSH_KEY_ID"

# Create startup script
echo "📝 Creating startup script..."
STARTUP_SCRIPT='#!/bin/bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git build-essential

# Install PM2
npm install -g pm2

# Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 8000
ufw --force enable

# Create app user
useradd -m -s /bin/bash appuser
mkdir -p /home/appuser/ai-trading-system
chown -R appuser:appuser /home/appuser

# Signal completion
touch /tmp/startup-complete'

SCRIPT_ID=$(vultr_api -X POST "https://api.vultr.com/v2/startup-scripts" \
    -d "{\"name\":\"ai-trading-setup\",\"script\":\"$(echo "$STARTUP_SCRIPT" | base64 -w 0)\"}" | \
    grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")

# Create the server
echo "🖥️  Creating Vultr server..."
echo "   Region: $REGION (New Jersey)"
echo "   Plan: $PLAN (1 vCPU, 1GB RAM, $5/month)"
echo "   OS: Ubuntu 22.04 LTS"

SERVER_RESPONSE=$(vultr_api -X POST "https://api.vultr.com/v2/instances" \
    -d "{
        \"region\":\"$REGION\",
        \"plan\":\"$PLAN\",
        \"os_id\":$OS_ID,
        \"label\":\"$SERVER_LABEL\",
        \"sshkey_id\":[\"$SSH_KEY_ID\"],
        \"script_id\":\"$SCRIPT_ID\",
        \"enable_ipv6\":true,
        \"backups\":\"disabled\",
        \"hostname\":\"ai-trading\"
    }")

INSTANCE_ID=$(echo "$SERVER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$INSTANCE_ID" ]; then
    echo "❌ Failed to create server"
    echo "$SERVER_RESPONSE"
    exit 1
fi

echo "✅ Server created! Instance ID: $INSTANCE_ID"
echo "⏳ Waiting for server to be ready..."

# Wait for server to be active
while true; do
    STATUS=$(vultr_api "https://api.vultr.com/v2/instances/$INSTANCE_ID" | \
        grep -o '"server_status":"[^"]*' | cut -d'"' -f4)
    
    if [ "$STATUS" = "ok" ]; then
        break
    fi
    
    echo "   Status: $STATUS (waiting...)"
    sleep 10
done

# Get server IP
SERVER_INFO=$(vultr_api "https://api.vultr.com/v2/instances/$INSTANCE_ID")
SERVER_IP=$(echo "$SERVER_INFO" | grep -o '"main_ip":"[^"]*' | cut -d'"' -f4)

echo "✅ Server ready! IP: $SERVER_IP"

# Wait for startup script to complete
echo "⏳ Waiting for server setup to complete..."
sleep 60  # Give it time to run startup script

# Deploy the application
echo "🚀 Deploying application..."
echo ""

# Create deploy script
cat > deploy-to-server.sh << EOF
#!/bin/bash
SERVER_IP=$SERVER_IP
rsync -avz --progress \\
    --exclude 'node_modules' \\
    --exclude '.git' \\
    --exclude 'dist' \\
    --exclude '*.log' \\
    . root@\$SERVER_IP:/home/appuser/ai-trading-system/

ssh root@\$SERVER_IP 'cd /home/appuser/ai-trading-system && npm install && npm run build && pm2 start server.js --name ai-trading && pm2 save && pm2 startup systemd -u appuser --hp /home/appuser'
EOF

chmod +x deploy-to-server.sh
./deploy-to-server.sh

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your AI Trading System is now live!"
echo "   Frontend: http://$SERVER_IP:3000"
echo "   Backend API: http://$SERVER_IP:8000"
echo "   Health Check: http://$SERVER_IP:8000/api/health"
echo ""
echo "📊 Server Details:"
echo "   Instance ID: $INSTANCE_ID"
echo "   IP Address: $SERVER_IP"
echo "   Monthly Cost: $5"
echo ""
echo "🔧 Useful Commands:"
echo "   SSH to server: ssh root@$SERVER_IP"
echo "   View logs: ssh root@$SERVER_IP 'pm2 logs'"
echo "   Restart app: ssh root@$SERVER_IP 'pm2 restart ai-trading'"
echo ""
echo "💡 Next Steps:"
echo "   1. Visit http://$SERVER_IP:3000 to see your dashboard"
echo "   2. Get Alpha Vantage API key: https://www.alphavantage.co/support/#api-key"
echo "   3. Update .env on server with real API key"
echo "   4. Configure a domain name (optional)"
echo ""
echo "💰 Your AI Trading System is ready to make money! 🚀"