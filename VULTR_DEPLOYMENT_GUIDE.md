# 🚀 Vultr Deployment Guide - AI Trading System

## Overview

This guide will help you deploy the complete AI Trading System to Vultr, including:
- ✅ Alpha Vantage API integration
- ✅ MQL5 Widgets system
- ✅ Node.js backend with React frontend
- ✅ Database and monitoring
- ✅ Production-ready configuration

---

## 📋 Prerequisites

### 1. Vultr Account
- Create a Vultr account at [vultr.com](https://vultr.com)
- Add payment method
- Note your API key (optional, for automation)

### 2. Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended)
- **Plan**: Cloud Compute (minimum 2GB RAM, 1 CPU)
- **Storage**: 25GB SSD minimum
- **Bandwidth**: 1TB/month minimum

### 3. Domain (Optional)
- Register a domain for SSL certificate
- Point DNS to your Vultr server IP

---

## 🚀 Quick Deployment

### Step 1: Create Vultr Server

1. **Login to Vultr Dashboard**
2. **Create Instance**:
   - Server Location: Choose closest to you
   - Server Type: Cloud Compute
   - CPU & Storage: 2GB RAM, 1 CPU, 25GB SSD
   - Operating System: Ubuntu 22.04 LTS
   - Server Hostname: `ai-trading-system`
   - Enable IPv6: Yes
   - DDoS Protection: Yes (recommended)

3. **Deploy Server**
4. **Note the IP address** (you'll need this)

### Step 2: Connect to Server

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y
```

### Step 3: Upload and Deploy

**Option A: Direct Upload (Recommended)**

1. **Upload files to server**:
```bash
# On your local machine, create a tarball
tar -czf ai-trading-system.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=data \
    --exclude=logs \
    .

# Upload to server
scp ai-trading-system.tar.gz root@YOUR_SERVER_IP:/tmp/
```

2. **On server, extract and deploy**:
```bash
# Extract files
cd /tmp
tar -xzf ai-trading-system.tar.gz -C /opt/
mv /opt/sb1-dapxyzdb /opt/ai-trading-system

# Run deployment script
cd /opt/ai-trading-system
chmod +x deploy_vultr.sh
./deploy_vultr.sh
```

**Option B: Git Clone**

```bash
# On server
cd /opt
git clone https://github.com/yourusername/ai-trading-system.git
cd ai-trading-system
chmod +x deploy_vultr.sh
./deploy_vultr.sh
```

---

## 🔧 Manual Deployment Steps

If you prefer manual deployment:

### 1. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install packages
apt install -y curl wget git build-essential python3 python3-pip nodejs npm nginx sqlite3 supervisor

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Python packages
pip3 install httpx typer pyyaml requests
```

### 2. Set Up Application

```bash
# Create application directory
mkdir -p /opt/ai-trading-system
cd /opt/ai-trading-system

# Copy application files
# (upload your files here)

# Install Node.js dependencies
npm install --production

# Build frontend
npm run build
```

### 3. Configure Environment

```bash
# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=8000
ALPHAVANTAGE_API_KEY=<set-in-provider>
MT5_INTEGRATION=false
DATABASE_PATH=/opt/ai-trading-system/data/trading.db
LOG_LEVEL=info
EOF
```

### 4. Create Services

```bash
# Create systemd service
cat > /etc/systemd/system/ai-trading-system.service << EOF
[Unit]
Description=AI Trading System
After=network.target

[Service]
Type=simple
User=trading
Group=trading
WorkingDirectory=/opt/ai-trading-system
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable ai-trading-system
systemctl start ai-trading-system
```

### 5. Configure Nginx

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/ai-trading-system << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        root /opt/ai-trading-system/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/ai-trading-system /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
```

---

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Security Headers

```bash
# Add security headers to Nginx
cat >> /etc/nginx/sites-available/ai-trading-system << EOF
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
EOF
```

---

## 📊 Monitoring and Maintenance

### 1. System Monitoring

```bash
# Check service status
systemctl status ai-trading-system
systemctl status ai-trading-system-collector
systemctl status nginx

# View logs
journalctl -u ai-trading-system -f
tail -f /opt/ai-trading-system/logs/combined.log
```

### 2. Performance Monitoring

```bash
# Monitor resources
htop
df -h
free -h

# Check application health
curl http://localhost:8000/api/health
```

### 3. Backup Strategy

```bash
# Create backup script
cat > /opt/ai-trading-system/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/ai-trading-system/backups"

mkdir -p $BACKUP_DIR

# Backup database
cp /opt/ai-trading-system/data/trading.db $BACKUP_DIR/trading_$DATE.db

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /opt/ai-trading-system/.env \
    /opt/ai-trading-system/widgets.yaml

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/ai-trading-system/backup.sh

# Add to cron
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ai-trading-system/backup.sh") | crontab -
```

---

## 🚀 Post-Deployment

### 1. Verify Installation

```bash
# Check all services
systemctl is-active ai-trading-system
systemctl is-active ai-trading-system-collector
systemctl is-active nginx

# Test endpoints
curl http://localhost:8000/api/health
curl http://localhost/api/health
```

### 2. Access Your System

- **Web Interface**: `http://YOUR_SERVER_IP`
- **API Endpoint**: `http://YOUR_SERVER_IP:8000/api`
- **Health Check**: `http://YOUR_SERVER_IP/health`

### 3. Initial Configuration

1. **Set Alpha Vantage API Key**:
   ```bash
   # Edit environment file
   nano /opt/ai-trading-system/.env
   # Update ALPHAVANTAGE_API_KEY=your_key_here
   ```

2. **Configure Widgets**:
   ```bash
   # Edit widget configuration
   nano /opt/ai-trading-system/widgets.yaml
   ```

3. **Restart Services**:
   ```bash
   systemctl restart ai-trading-system
   systemctl restart ai-trading-system-collector
   ```

---

## 🔧 Troubleshooting

### Common Issues

1. **Service Won't Start**:
   ```bash
   # Check logs
   journalctl -u ai-trading-system -n 50
   
   # Check permissions
   ls -la /opt/ai-trading-system/
   ```

2. **Database Errors**:
   ```bash
   # Check database file
   ls -la /opt/ai-trading-system/data/
   
   # Reinitialize database
   cd /opt/ai-trading-system
   node -e "const { DatabaseManager } = require('./server/database/manager.js'); new DatabaseManager().initialize();"
   ```

3. **Port Conflicts**:
   ```bash
   # Check what's using port 8000
   netstat -tlnp | grep :8000
   
   # Kill process if needed
   kill -9 PID
   ```

4. **Nginx Issues**:
   ```bash
   # Check Nginx configuration
   nginx -t
   
   # Check Nginx logs
   tail -f /var/log/nginx/error.log
   ```

### Performance Optimization

1. **Enable Gzip Compression**:
   ```bash
   # Add to Nginx config
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Optimize Node.js**:
   ```bash
   # Add to environment
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

3. **Database Optimization**:
   ```bash
   # Run database maintenance
   sqlite3 /opt/ai-trading-system/data/trading.db "VACUUM; ANALYZE;"
   ```

---

## 📈 Scaling Considerations

### For High Traffic

1. **Load Balancer**: Use Vultr Load Balancer
2. **Database**: Consider PostgreSQL or MySQL
3. **Caching**: Add Redis for session storage
4. **CDN**: Use Cloudflare for static assets

### For Production

1. **Monitoring**: Set up Prometheus + Grafana
2. **Logging**: Use ELK stack (Elasticsearch, Logstash, Kibana)
3. **Backup**: Automated backups to S3-compatible storage
4. **SSL**: Proper SSL certificate management

---

## 🎉 Success!

Your AI Trading System is now deployed on Vultr with:

- ✅ **Real-time market data** from Alpha Vantage
- ✅ **Professional MQL5 widgets**
- ✅ **Scalable Node.js backend**
- ✅ **Modern React frontend**
- ✅ **Production-ready configuration**
- ✅ **Automated monitoring and backups**

**Ready for live trading!** 🚀

---

## 📞 Support

If you encounter issues:

1. **Check logs**: `journalctl -u ai-trading-system -f`
2. **Verify configuration**: Review all config files
3. **Test connectivity**: Ensure ports are open
4. **Monitor resources**: Check CPU, memory, disk usage

**Happy trading!** 📈 