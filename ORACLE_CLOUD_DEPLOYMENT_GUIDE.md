# 🚀 Oracle Cloud Infrastructure (OCI) Deployment Guide

## 📋 Overview

This guide will help you deploy your AI Trading System to Oracle Cloud Infrastructure (OCI). OCI offers free tier options and excellent performance for production workloads.

---

## 🎯 **Deployment Options**

### **Option 1: OCI Compute Instance with Docker (Recommended)**
- Most flexible and straightforward
- Full control over the environment
- Works with OCI free tier
- Best for production workloads

### **Option 2: OCI Container Instances**
- Serverless container deployment
- Auto-scaling capabilities
- Pay only for what you use
- Ideal for variable workloads

### **Option 3: OCI Kubernetes Engine (OKE)**
- Advanced orchestration
- High availability
- Best for enterprise deployments
- Requires more setup

---

## 🆓 **Oracle Cloud Free Tier**

Oracle Cloud offers a generous Always Free tier:

- **2 AMD-based Compute VMs**: 1/8 OCPU and 1 GB memory each
- **4 Arm-based Ampere A1 cores**: 24 GB memory (can be split into 4 instances)
- **200 GB total Block Volume storage**
- **10 TB outbound data transfer per month**
- **Load Balancer**: 1 instance, 10 Mbps bandwidth

**Perfect for your trading system!** We'll use Arm-based instances for better performance.

---

## 🚀 **OPTION 1: Deploy to OCI Compute Instance (Recommended)**

### **Step 1: Create OCI Account**

1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Fill in your details
4. Verify your email and phone
5. Add credit card (won't be charged for free tier)

### **Step 2: Create Compute Instance**

1. Log into [OCI Console](https://cloud.oracle.com)
2. Navigate to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - **Name**: `ai-trading-system`
   - **Placement**: Choose closest region
   - **Image**: `Ubuntu 22.04`
   - **Shape**: `VM.Standard.A1.Flex` (Arm-based, free tier)
     - OCPUs: **4** (use all free tier cores)
     - Memory: **24 GB** (use all free tier memory)
   - **Networking**: Use default VCN or create new
   - **Add SSH Keys**: Generate or upload your SSH key
   - **Boot Volume**: 100 GB (within free tier)

5. Click **Create**
6. Wait for instance to provision (~2-3 minutes)
7. Note the **Public IP Address**

### **Step 3: Configure Network Security**

1. Navigate to **Networking** → **Virtual Cloud Networks**
2. Click on your VCN → **Security Lists** → **Default Security List**
3. Click **Add Ingress Rules** and add:

```
# SSH
Source: 0.0.0.0/0
Destination Port: 22

# HTTP
Source: 0.0.0.0/0
Destination Port: 80

# HTTPS
Source: 0.0.0.0/0
Destination Port: 443

# API Backend
Source: 0.0.0.0/0
Destination Port: 8000

# Frontend Dashboard
Source: 0.0.0.0/0
Destination Port: 3000

# Monitoring (Grafana)
Source: 0.0.0.0/0
Destination Port: 3001

# Prometheus
Source: 0.0.0.0/0
Destination Port: 9090

# MT5 Integration (if needed)
Source: 0.0.0.0/0
Destination Port: 5555-5556
```

### **Step 4: Connect to Your Instance**

```bash
# Use the private key you created/downloaded
chmod 600 ~/path/to/your-ssh-key.pem
ssh -i ~/path/to/your-ssh-key.pem ubuntu@YOUR_PUBLIC_IP

# Example:
ssh -i ~/.ssh/oci_key.pem ubuntu@129.80.123.45
```

### **Step 5: One-Command Deployment**

Copy and paste this entire script into your OCI instance terminal:

```bash
#!/bin/bash
# AI Trading System - OCI Deployment Script

echo "🚀 Starting AI Trading System deployment on Oracle Cloud..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create app directory
cd ~
mkdir -p ai-trading-system
cd ai-trading-system

# Clone repository (replace with your repo)
git clone https://github.com/banky420star/sb1-dapxyzdb.git .

# Or upload files via SCP if private repo
# scp -i ~/.ssh/oci_key.pem -r /path/to/local/project ubuntu@YOUR_IP:~/ai-trading-system/

# Create .env file
cat > .env << 'EOF'
# Core Configuration
NODE_ENV=production
PORT=8000
TRADING_MODE=paper

# API Keys (add your own)
BYBIT_API_KEY=your_api_key_here
BYBIT_SECRET=your_secret_here
ALPHA_VANTAGE_API_KEY=your_key_here

# Risk Management
MAX_POSITION_SIZE=0.1
MAX_TOTAL_EXPOSURE=0.5
MAX_LEVERAGE=10
DEFAULT_STOP_LOSS=0.02
DEFAULT_TAKE_PROFIT=0.04
MAX_DAILY_LOSS=0.05

# CORS (update with your domain)
CORS_ORIGINS=*

# Feature Flags
ENABLE_AUTONOMOUS_TRADING=false
ENABLE_NOTIFICATIONS=true
ENABLE_MONITORING=true
ENABLE_RISK_MANAGEMENT=true

# Logging
LOG_LEVEL=info
ENABLE_DETAILED_LOGGING=true
EOF

# Configure firewall (OCI uses iptables)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9090 -j ACCEPT
sudo netfilter-persistent save

# Install dependencies
npm install

# Build frontend
npm run build

# Start services with Docker Compose
docker compose up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 30

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/opc/v1/instance/metadata | grep -oP '"publicIp":"\K[^"]+')

echo ""
echo "✅ =================================="
echo "✅  DEPLOYMENT COMPLETE!"
echo "✅ =================================="
echo ""
echo "🌐 Access your trading system:"
echo "   📊 Dashboard:  http://$PUBLIC_IP:3000"
echo "   🔧 API:        http://$PUBLIC_IP:8000"
echo "   💓 Health:     http://$PUBLIC_IP:8000/api/health"
echo "   📈 Monitoring: http://$PUBLIC_IP:3001 (admin/admin123)"
echo ""
echo "📝 Next steps:"
echo "   1. Update API keys in .env file"
echo "   2. Configure your domain (optional)"
echo "   3. Set up SSL certificate"
echo "   4. Start trading!"
echo ""
```

Save this script and run it:

```bash
chmod +x deploy-oci.sh
./deploy-oci.sh
```

---

## 🔒 **Security Hardening**

### **1. Configure Firewall**

```bash
# Install UFW (if not using iptables)
sudo apt-get install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22

# Allow application ports
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8000
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 9090

# Enable firewall
sudo ufw --force enable
```

### **2. Set Up SSL Certificate**

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (if you have a domain)
sudo certbot certonly --standalone -d yourdomain.com

# Or use Nginx
sudo apt-get install -y nginx
sudo certbot --nginx -d yourdomain.com
```

### **3. Configure Nginx as Reverse Proxy**

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/trading << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN_OR_IP;

    # SSL configuration (update paths if you have certificates)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/trading /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 **Monitoring & Maintenance**

### **Check Service Status**

```bash
# Docker containers
docker ps

# Application logs
docker logs ai-trading-backend -f
docker logs ai-trading-frontend -f

# System resources
htop
```

### **Update Application**

```bash
cd ~/ai-trading-system

# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### **Backup Data**

```bash
# Create backup directory
mkdir -p ~/backups

# Backup data directory
tar -czf ~/backups/data-$(date +%Y%m%d).tar.gz ~/ai-trading-system/data

# Backup logs
tar -czf ~/backups/logs-$(date +%Y%m%d).tar.gz ~/ai-trading-system/logs

# Upload to OCI Object Storage (optional)
oci os object put -bn your-bucket-name --file ~/backups/data-$(date +%Y%m%d).tar.gz
```

---

## 🎯 **Performance Optimization**

### **For Arm-based Instances (A1)**

The trading system is already optimized for Arm architecture. Docker will automatically use Arm-compatible images.

### **Resource Monitoring**

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Monitor in real-time
htop           # CPU and memory
iotop          # Disk I/O
nethogs        # Network usage
```

### **Optimize Docker**

```bash
# Clean up unused Docker resources
docker system prune -a

# Limit container resources (edit docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G
        reservations:
          cpus: '1'
          memory: 4G
```

---

## 💰 **Cost Management**

### **Free Tier Limits**

- **Compute**: 4 OCPUs + 24 GB RAM (Arm) - Always Free
- **Storage**: 200 GB Block Volume - Always Free
- **Network**: 10 TB outbound - Always Free

**Your trading system will run completely FREE on OCI!**

### **Monitoring Costs**

```bash
# Check OCI billing
oci iam region list

# View usage reports in OCI Console
# Cost Analysis → Usage Reports
```

---

## 🧪 **Testing & Verification**

### **Test Deployment**

```bash
# Health check
curl http://YOUR_IP:8000/api/health

# Market data
curl http://YOUR_IP:8000/api/market/BTCUSDT

# System status
curl http://YOUR_IP:8000/api/status

# Test frontend
curl http://YOUR_IP:3000
```

### **Load Testing**

```bash
# Install Apache Bench
sudo apt-get install -y apache2-utils

# Test API performance
ab -n 1000 -c 10 http://YOUR_IP:8000/api/health
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**1. Can't connect to instance:**
```bash
# Check security list rules in OCI Console
# Verify SSH key is correct
# Check instance is running
```

**2. Ports not accessible:**
```bash
# Check iptables rules
sudo iptables -L -n

# Check if services are running
sudo netstat -tulpn | grep LISTEN
```

**3. Out of memory:**
```bash
# Check memory usage
free -h

# Restart Docker services
docker compose restart
```

**4. Docker issues:**
```bash
# Restart Docker
sudo systemctl restart docker

# Check Docker logs
sudo journalctl -u docker.service
```

---

## 📚 **Additional Resources**

- [OCI Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [OCI Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Compute Instances](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)
- [OCI Container Instances](https://docs.oracle.com/en-us/iaas/Content/container-instances/home.htm)

---

## 🚀 **Quick Start Commands**

```bash
# Connect to OCI instance
ssh -i ~/.ssh/oci_key.pem ubuntu@YOUR_IP

# View logs
docker logs ai-trading-backend -f

# Restart services
cd ~/ai-trading-system && docker compose restart

# Update application
cd ~/ai-trading-system && git pull && docker compose up -d --build

# Backup data
tar -czf ~/backup-$(date +%Y%m%d).tar.gz ~/ai-trading-system/data
```

---

## ✅ **Deployment Checklist**

- [ ] Create OCI account
- [ ] Create compute instance
- [ ] Configure security lists
- [ ] Connect via SSH
- [ ] Run deployment script
- [ ] Update .env file with API keys
- [ ] Test all endpoints
- [ ] Configure SSL (optional)
- [ ] Set up monitoring
- [ ] Create backup strategy
- [ ] Test trading functionality

---

**Status**: ✅ Ready for deployment  
**Platform**: Oracle Cloud Infrastructure  
**Cost**: $0/month (Free Tier)  
**Performance**: Excellent (Arm-based)  

🎉 **Your AI Trading System is ready to run on Oracle Cloud!**
