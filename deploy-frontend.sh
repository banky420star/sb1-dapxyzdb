#!/bin/bash

# Deploy Updated Frontend to Server
echo "🚀 Deploying updated frontend to methtrader.xyz..."

# Copy built files to server
echo "📦 Copying built files..."
scp -r dist/* root@45.76.136.30:/var/www/html/

# SSH to server and update Nginx config
echo "🔧 Updating server configuration..."
ssh root@45.76.136.30 << 'EOF'

# Backup current config
cp /etc/nginx/sites-available/methtrader.xyz.conf /etc/nginx/sites-available/methtrader.xyz.conf.backup

# Update Nginx config for React routing
cat > /etc/nginx/sites-available/methtrader.xyz.conf << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name methtrader.xyz;

    root /var/www/html;
    index index.html;

    # Handle React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://45.76.136.30:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://45.76.136.30:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Frontend deployed successfully!"
echo "🌐 Visit: http://methtrader.xyz"
echo "📊 Dashboard: http://methtrader.xyz/dashboard"
echo "💹 Trading: http://methtrader.xyz/trading"

EOF

echo "🎉 Deployment complete!"
echo "🌐 Your updated MethTrader.xyz is now live!" 