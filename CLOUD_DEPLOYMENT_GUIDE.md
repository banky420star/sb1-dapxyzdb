# 🚀 **Cloud Deployment Guide - Production Setup**

## 🎯 **Complete Production Deployment**

Since you have the EA on a chart and want to deploy to your cloud server, here's the **complete production setup** with Docker containers, monitoring, and live trading.

---

## 📋 **Prerequisites**

### **✅ What You Need:**
- ☁️ **Cloud Server** (AWS, DigitalOcean, Azure, etc.)
- 🐳 **Docker & Docker Compose** installed
- 🔑 **API Keys** for market data
- 💻 **MT5 Terminal** with your EA already running
- 🌐 **Domain name** (optional, for SSL)

---

## 🎯 **Step 1: Server Setup**

### **💻 Connect to Your Cloud Server:**
```bash
# SSH into your cloud server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### **🔥 Firewall Configuration:**
```bash
# Open required ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 8000  # API Backend
ufw allow 3000  # Frontend
ufw allow 5555  # MT5 Command Port
ufw allow 5556  # MT5 Data Port
ufw allow 9090  # Prometheus
ufw allow 3001  # Grafana

ufw enable
```

---

## 📁 **Step 2: Deploy Your Trading System**

### **📥 Upload Your Project:**
```bash
# Clone or upload your project to the server
git clone your-repository.git ai-trading-system
# OR upload via SCP/SFTP

cd ai-trading-system
```

### **⚙️ Configure Environment:**
```bash
# Copy production environment
cp .env.production .env

# Edit with your settings
nano .env
```

**📝 Edit these critical values:**
```bash
# Add your API keys
ALPHA_VANTAGE_API_KEY=your_real_api_key
TWELVEDATA_API_KEY=your_real_api_key

# Security (generate strong secrets)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Set your server IP/domain
CORS_ORIGIN=http://your-server-ip

# Production settings
MT5_ACCOUNT_TYPE=demo  # Start with demo!
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
```

### **🚀 Deploy Everything:**
```bash
# Run the deployment script
./deploy.sh

# This will:
# ✅ Build Docker images
# ✅ Train ML models
# ✅ Start all services
# ✅ Run health checks
# ✅ Set up monitoring
```

---

## 🔌 **Step 3: Connect MT5 to Your Cloud Server**

### **🎯 Your EA Configuration:**
Since you already have the EA on a chart, **update these settings**:

```mql5
// In your MT5 EA settings:
Inp_PubEndpoint = "tcp://YOUR-SERVER-IP:5556"
Inp_RepEndpoint = "tcp://YOUR-SERVER-IP:5555"
Inp_Magic = 123456
Inp_LogLevel = 2
```

### **🧪 Test Connection:**
```bash
# From your cloud server, test if MT5 can connect
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "test mt5 connection"}'

# Should return: {"success": true}
```

### **📊 Monitor Connection:**
```bash
# Watch logs for MT5 connections
docker-compose logs -f trading-backend

# You should see:
# "MT5 connection established successfully"
# "ZeroMQ sockets configured"
```

---

## 📊 **Step 4: Access Your Live System**

### **🌐 Service URLs:**
```bash
# Replace YOUR-SERVER-IP with your actual server IP

# Trading Dashboard
http://YOUR-SERVER-IP:3000

# API Backend
http://YOUR-SERVER-IP:8000

# System Health
http://YOUR-SERVER-IP:8000/api/health

# Monitoring Dashboard
http://YOUR-SERVER-IP:3001
# Login: admin / admin123

# Metrics (Prometheus)
http://YOUR-SERVER-IP:9090
```

### **📱 Mobile Access:**
Your system is now accessible from anywhere:
- **Desktop**: Full dashboard experience
- **Mobile**: Responsive interface
- **API**: Programmatic access

---

## 🛡️ **Step 5: Production Security**

### **🔒 SSL Setup (Recommended):**
```bash
# Install Certbot for Let's Encrypt
apt install certbot

# Get SSL certificate (replace your-domain.com)
certbot certonly --standalone -d your-domain.com

# Update nginx config for HTTPS
# Edit nginx/nginx.conf and uncomment SSL server block
```

### **🔐 Security Hardening:**
```bash
# Create non-root user
adduser trader
usermod -aG docker trader

# Switch to non-root user
su trader

# Update CORS for production
# Edit .env:
CORS_ORIGIN=https://your-domain.com
```

---

## 📊 **Step 6: Monitoring & Maintenance**

### **🏥 Health Monitoring:**
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f trading-backend

# Monitor performance
curl http://localhost:8000/api/metrics

# System resources
docker stats
```

### **📈 Grafana Dashboards:**
1. **Open**: `http://YOUR-SERVER-IP:3001`
2. **Login**: admin / admin123
3. **Import** trading dashboards
4. **Monitor**: Real-time trading performance

### **🔔 Alerts Setup:**
```bash
# Set up email alerts (optional)
# Edit monitoring/grafana/provisioning/alerting.yml
# Configure SMTP settings for notifications
```

---

## 🎯 **Step 7: Start Live Trading**

### **🧪 Validation Process:**

#### **Phase 1: Demo Validation (Week 1-2)**
```bash
# Ensure demo mode
curl -X POST http://YOUR-SERVER-IP:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "set mode demo"}'

# Start trading
curl -X POST http://YOUR-SERVER-IP:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'

# Monitor for 2 weeks minimum
```

#### **Phase 2: Live Trading (Month 2+)**
```bash
# Switch to live mode (ONLY after successful demo)
# Edit .env:
MT5_ACCOUNT_TYPE=live

# Restart system
docker-compose restart

# Start with micro positions
POSITION_SIZE_LIMIT=0.01
```

---

## 🔧 **Management Commands**

### **📋 Daily Operations:**
```bash
# Check system status
docker-compose ps

# View trading logs
docker-compose logs trading-backend | tail -100

# Check performance
curl http://localhost:8000/api/metrics

# Backup data
./deploy.sh backup

# Restart services
docker-compose restart

# Update system
git pull && ./deploy.sh
```

### **⚠️ Emergency Commands:**
```bash
# Emergency stop all trading
curl -X POST http://YOUR-SERVER-IP:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'

# Close all positions
curl -X POST http://YOUR-SERVER-IP:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "close all positions"}'

# Stop all services
docker-compose down
```

---

## 💰 **Expected Results**

### **📊 Performance Targets:**
- **Win Rate**: >55%
- **Profit Factor**: >1.3
- **Max Drawdown**: <5%
- **Response Time**: <100ms
- **Uptime**: >99.9%

### **📈 Scaling Strategy:**
```bash
# Week 1-2: Demo validation
POSITION_SIZE_LIMIT=0.01

# Month 1: Micro live trading
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005

# Month 2+: Scale gradually
POSITION_SIZE_LIMIT=0.1
MAX_DAILY_LOSS=0.02
MAX_POSITIONS=10
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **🔌 MT5 Connection Failed:**
```bash
# Check ports are open
telnet YOUR-SERVER-IP 5555
telnet YOUR-SERVER-IP 5556

# Check firewall
ufw status

# Check logs
docker-compose logs trading-backend | grep -i zmq
```

#### **📊 Frontend Not Loading:**
```bash
# Check container status
docker-compose ps

# Rebuild frontend
docker-compose build trading-frontend
docker-compose up -d trading-frontend
```

#### **🧠 Models Not Training:**
```bash
# Check API keys
docker-compose run --rm trading-backend npm run train api-test

# Manually train
docker-compose run --rm trading-backend npm run train train
```

---

## 🎉 **Success Checklist**

### **✅ Deployment Complete When:**
- [ ] All Docker containers running
- [ ] MT5 EA connected to server
- [ ] Dashboard accessible remotely
- [ ] Models trained and active
- [ ] Monitoring working
- [ ] Demo trading profitable
- [ ] Logs show no errors
- [ ] Health checks passing

---

## 🎯 **You're Live!**

**🚀 Congratulations! Your AI trading system is now:**

- ✅ **Deployed in Production** on your cloud server
- ✅ **Connected to MT5** via ZeroMQ bridge
- ✅ **Monitoring Everything** with Grafana/Prometheus
- ✅ **Trading Autonomously** with your EA
- ✅ **Accessible Remotely** from anywhere
- ✅ **Scalable & Secure** for live trading

### **📱 Access Your System:**
- **Dashboard**: `http://YOUR-SERVER-IP:3000`
- **API**: `http://YOUR-SERVER-IP:8000`
- **Monitoring**: `http://YOUR-SERVER-IP:3001`

### **🎯 Next Steps:**
1. **Monitor** demo trading for 30+ days
2. **Validate** profitability and stability
3. **Scale** to live trading gradually
4. **Optimize** based on performance
5. **Enjoy** your autonomous AI profits!

**🚀 Your AI is now live and ready to make money! 💰**