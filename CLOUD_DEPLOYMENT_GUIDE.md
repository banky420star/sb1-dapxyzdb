# 🚀 **COMPLETE CLOUD DEPLOYMENT GUIDE**

## 🌍 **Your London Server Details**
- **IP Address**: `45.76.136.30`
- **Location**: London, UK
- **Specs**: 2 vCPUs, 4GB RAM, 50GB NVMe
- **OS**: Ubuntu 22.04 x64
- **Cost**: $2.87/month
- **Username**: `root`
- **Password**: `G-b9ni}9r5TXPRy{`

---

## 🎯 **DEPLOYMENT OPTIONS**

### **Option 1: One-Command Deploy (RECOMMENDED) ⭐**

**Step 1: Connect to your server**
```bash
ssh root@45.76.136.30
# Password: G-b9ni}9r5TXPRy{
```

**Step 2: Run the deployment script**
```bash
# Copy and paste this entire block:
cd /root && mkdir -p ai-trading-system && cd ai-trading-system

# Install dependencies
apt-get update && apt-get install -y curl wget git docker.io docker-compose nodejs npm

# Start Docker
systemctl start docker && systemctl enable docker

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MAX_DRAWDOWN=0.15
ALPHA_VANTAGE_API_KEY=<set-in-provider>
ENABLE_LIVE_DATA=true
DATA_UPDATE_INTERVAL=1000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_db
REDIS_HOST=localhost
REDIS_PORT=6379
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
EOF

# Create Docker Compose
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  trading-backend:
    image: node:18-alpine
    container_name: ai-trading-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "5555:5555"
      - "5556:5556"
    environment:
      - NODE_ENV=production
      - TRADING_MODE=paper
      - ALPHA_VANTAGE_API_KEY=<set-in-provider>
    working_dir: /app
    volumes:
      - ./:/app
      - ./data:/app/data
      - ./logs:/app/logs
    command: sh -c "npm install && npm start"
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G

  trading-frontend:
    image: node:18-alpine
    container_name: ai-trading-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://45.76.136.30:8000
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    deploy:
      resources:
        limits:
          cpus: '0.3'
          memory: 512M

  redis:
    image: redis:7-alpine
    container_name: trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  prometheus:
    image: prom/prometheus:latest
    container_name: trading-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=7d'

  grafana:
    image: grafana/grafana:latest
    container_name: trading-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123

volumes:
  redis-data:
  prometheus-data:
  grafana-data:
EOF

# Setup firewall
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw allow 8000 && ufw allow 3000 && ufw allow 5555 && ufw allow 5556 && ufw allow 3001 && ufw --force enable

# Deploy everything
echo "🚀 Starting AI Trading System..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to initialize..."
sleep 30

echo "🎉 AI TRADING SYSTEM IS LIVE!"
echo "📊 Dashboard: http://45.76.136.30:3000"
echo "🔧 API Health: http://45.76.136.30:8000/api/health"
echo "📈 Monitoring: http://45.76.136.30:3001 (admin/admin123)"
```

**⏱️ Deployment time: 3-5 minutes**

---

### **Option 2: Upload Deployment Package**

**Step 1: Upload from your local machine**
```bash
# From your local terminal
scp ai-trading-system-deploy.tar.gz root@45.76.136.30:/root/
```

**Step 2: Extract and deploy on server**
```bash
# SSH to server
ssh root@45.76.136.30

# Extract package
cd /root
tar -xzf ai-trading-system-deploy.tar.gz
cd ai-trading-system

# Deploy
chmod +x deploy.sh
./deploy.sh
```

---

### **Option 3: Railway.app (No Docker Required)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

**Your app will be live at**: `https://your-app.railway.app`

---

### **Option 4: Render.com**

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Render auto-detects and deploys

---

## 🌐 **YOUR LIVE SYSTEM URLs**

Once deployed, access your system at:

### **🎯 Primary URLs:**
```bash
📊 Trading Dashboard: http://45.76.136.30:3000
🔧 API Backend: http://45.76.136.30:8000
💹 System Health: http://45.76.136.30:8000/api/health
📈 Monitoring: http://45.76.136.30:3001
   Login: admin / admin123
```

### **🔐 Secure URLs (after SSL setup):**
```bash
📊 Trading Dashboard: https://45.76.136.30:3000
🔧 API Backend: https://45.76.136.30:8000
```

---

## 🔌 **MT5 INTEGRATION SETUP**

### **Update Your MT5 EA Settings:**
```mql5
// Right-click EA → Properties → Inputs:
Inp_PubEndpoint = "tcp://45.76.136.30:5556"
Inp_RepEndpoint = "tcp://45.76.136.30:5555" 
Inp_Magic = 123456
Inp_LogLevel = 2

// ✅ Make sure "Allow DLL imports" is checked!
```

### **Test MT5 Connection:**
```bash
# From your server terminal:
curl -X POST http://45.76.136.30:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "test mt5 connection"}'
```

---

## 🛡️ **SECURITY SETUP**

### **Firewall Configuration:**
```bash
# Open required ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 8000  # API
ufw allow 3000  # Dashboard
ufw allow 5555  # MT5 Command
ufw allow 5556  # MT5 Data
ufw allow 3001  # Monitoring

# Enable firewall
ufw enable
```

### **SSL Certificate (Optional but Recommended):**
```bash
# Install Certbot for free SSL
apt update
apt install -y certbot

# Get free SSL certificate (replace with your domain if you have one)
# certbot --nginx -d yourdomain.com
```

---

## 🧪 **VERIFICATION TESTS**

### **1. System Health Check:**
```bash
curl http://45.76.136.30:8000/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":"..."}
```

### **2. Trading System Status:**
```bash
curl http://45.76.136.30:8000/api/status
# Expected: {"mode":"paper","isRunning":false,"positions":0,...}
```

### **3. ML Models Status:**
```bash
curl http://45.76.136.30:8000/api/models/status
# Expected: {"activeModels":3,"randomforest":"active",...}
```

### **4. Start Trading:**
```bash
curl -X POST http://45.76.136.30:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'
```

---

## 📊 **SYSTEM MONITORING**

### **Grafana Dashboard:**
- **URL**: http://45.76.136.30:3001
- **Username**: `admin`
- **Password**: `admin123`

### **Key Metrics to Monitor:**
- CPU Usage (should be < 80%)
- Memory Usage (should be < 3.5GB)
- Disk Usage (should be < 40GB)
- Network Latency
- Trading Performance
- API Response Times

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

**1. Port Already in Use:**
```bash
# Check what's using the port
lsof -i :8000

# Kill the process
kill -9 <PID>
```

**2. Docker Issues:**
```bash
# Restart Docker
systemctl restart docker

# Clean up containers
docker system prune -a
```

**3. Memory Issues:**
```bash
# Check memory usage
free -h

# Optimize for 4GB RAM
# The deployment script already includes optimizations
```

**4. API Key Issues:**
```bash
# Verify API key is set
echo $ALPHA_VANTAGE_API_KEY

# Test API key
curl "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=2ZQ8QZSN1U9XN5TK"
```

---

## 🚀 **NEXT STEPS**

### **After Successful Deployment:**

1. **Test the Dashboard**: Visit http://45.76.136.30:3000
2. **Configure MT5**: Update your EA settings
3. **Start Paper Trading**: Use the dashboard controls
4. **Monitor Performance**: Check Grafana at http://45.76.136.30:3001
5. **Set Up Alerts**: Configure email/SMS notifications
6. **Backup Strategy**: Set up automated backups
7. **Scale Up**: Consider upgrading server specs for live trading

### **Performance Optimization:**
- **For 2 vCPU / 4GB RAM**: Already optimized in deployment
- **For Live Trading**: Consider upgrading to 4 vCPU / 8GB RAM
- **For High Frequency**: Consider dedicated server with SSD

---

## 💰 **COST OPTIMIZATION**

### **Current Setup:**
- **Server**: $2.87/month (London)
- **API Calls**: Free tier (500/day)
- **Total**: ~$3/month

### **Scaling Options:**
- **Live Trading**: Upgrade to $5.74/month (4 vCPU / 8GB)
- **High Frequency**: Dedicated server ~$20/month
- **Enterprise**: Custom solution

---

## 🎉 **SUCCESS!**

Your AI trading system is now deployed and ready to trade! 

**Quick Start:**
1. Visit http://45.76.136.30:3000
2. Click "Start Paper Trading"
3. Configure your MT5 EA
4. Monitor performance
5. Scale up when ready

**Support:**
- Check logs: `docker logs ai-trading-backend`
- Monitor health: http://45.76.136.30:8000/api/health
- View metrics: http://45.76.136.30:3001

🚀 **Happy Trading!** 💰