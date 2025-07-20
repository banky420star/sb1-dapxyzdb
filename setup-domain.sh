#!/bin/bash

# AI Trading System Domain Setup Script
# This script helps set up a custom domain for your trading system

set -e

echo "=== AI TRADING SYSTEM DOMAIN SETUP ==="
echo "This script will help you set up a custom domain for your trading system"

# Get domain name from user
read -p "Enter your desired domain name (e.g., www.tradername.com): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo "No domain name provided. Exiting."
    exit 1
fi

echo "Setting up domain: $DOMAIN_NAME"

# Create Nginx configuration for the domain
echo "Creating Nginx configuration..."
cat > nginx/trading-domain.conf << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;
    
    # SSL configuration (you'll need to add your SSL certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Monitoring
    location /monitor/ {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Create environment update script
echo "Creating environment update script..."
cat > update-env-for-domain.sh << EOF
#!/bin/bash

# Update environment files for the new domain
echo "Updating environment files for domain: $DOMAIN_NAME"

# Update backend environment
cd /root/ai-trading-system
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN_NAME|" .env

# Update frontend environment
cd /home/banks/ai-trading-system
sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN_NAME|" .env
sed -i "s|VITE_WEBSOCKET_URL=.*|VITE_WEBSOCKET_URL=wss://$DOMAIN_NAME/ws|" .env

echo "Environment files updated for domain: $DOMAIN_NAME"
echo "Please restart your services after updating the environment"
EOF

chmod +x update-env-for-domain.sh

# Create DNS setup instructions
echo "Creating DNS setup instructions..."
cat > DNS_SETUP_INSTRUCTIONS.md << EOF
# DNS Setup Instructions for $DOMAIN_NAME

## Step 1: Domain Registration
If you haven't registered your domain yet, do so with a domain registrar like:
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare

## Step 2: DNS Configuration
Add the following DNS records to your domain:

### A Record
- **Name**: @ (or leave blank)
- **Value**: 45.76.136.30
- **TTL**: 300

### A Record for www
- **Name**: www
- **Value**: 45.76.136.30
- **TTL**: 300

### CNAME Record (optional)
- **Name**: api
- **Value**: $DOMAIN_NAME
- **TTL**: 300

## Step 3: SSL Certificate
For HTTPS, you'll need an SSL certificate. Options:
1. **Let's Encrypt** (free):
   \`\`\`bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
   \`\`\`

2. **Cloudflare** (free SSL with proxy):
   - Enable Cloudflare proxy (orange cloud)
   - Set SSL/TLS mode to "Full" or "Full (strict)"

## Step 4: Update Nginx Configuration
After getting your SSL certificate, update the nginx configuration:
\`\`\`bash
sudo nano nginx/trading-domain.conf
# Uncomment and update SSL certificate paths
\`\`\`

## Step 5: Restart Services
\`\`\`bash
sudo systemctl restart nginx
cd /root/ai-trading-system
./update-env-for-domain.sh
pm2 restart all
\`\`\`

## Step 6: Test Your Domain
Visit: https://$DOMAIN_NAME

Your AI Trading System should now be accessible via your custom domain!
EOF

echo ""
echo "=== DOMAIN SETUP COMPLETE ==="
echo "Domain: $DOMAIN_NAME"
echo ""
echo "Files created:"
echo "- nginx/trading-domain.conf (Nginx configuration)"
echo "- update-env-for-domain.sh (Environment update script)"
echo "- DNS_SETUP_INSTRUCTIONS.md (Complete setup guide)"
echo ""
echo "Next steps:"
echo "1. Follow the DNS_SETUP_INSTRUCTIONS.md guide"
echo "2. Set up your SSL certificate"
echo "3. Run the update-env-for-domain.sh script"
echo "4. Restart your services"
echo ""
echo "Your AI Trading System will then be accessible at:"
echo "https://$DOMAIN_NAME" 