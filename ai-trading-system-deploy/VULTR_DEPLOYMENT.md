# 🚀 Vultr Deployment Guide

## ⚡ Quick Start Options

### Option 1: Automated Deployment (Creates Server + Deploys)
```bash
./deploy-vultr.sh
```
This will:
- ✅ Create a new $5/month Vultr server
- ✅ Configure Ubuntu 20.04 with Node.js
- ✅ Deploy your AI trading system
- ✅ Start the application with PM2
- ✅ Give you the live URL

### Option 2: Deploy to Existing Vultr Server
```bash
./vultr-quick-deploy.sh root@your-server-ip
```

### Option 3: Manual Setup
1. Create server at [my.vultr.com](https://my.vultr.com)
2. Choose:
   - Cloud Compute
   - New Jersey (close to financial markets)
   - Ubuntu 20.04
   - 25 GB SSD ($5/month)
   - Add your SSH key
3. Run: `./vultr-quick-deploy.sh root@new-server-ip`

## 🔐 Security Note

**IMPORTANT**: Your Vultr API key is currently in `.env`. For production:

1. Remove it from `.env` after deployment
2. Or use environment variable:
   ```bash
   export VULTR_API_KEY="your-key"
   ./deploy-vultr.sh
   ```

## 📊 After Deployment

Your AI Trading System will be available at:
- Frontend Dashboard: `http://your-server-ip`
- API Backend: `http://your-server-ip:8000`
- Health Check: `http://your-server-ip/api/health`

## 🔧 Server Management

```bash
# SSH to your server
ssh root@your-server-ip

# View application logs
pm2 logs ai-trading

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart ai-trading

# Check server resources
htop
```

## 💰 Next Steps

1. **Get Alpha Vantage API Key**
   - Free at: https://www.alphavantage.co/support/#api-key
   
2. **Update Configuration**
   ```bash
   ssh root@your-server-ip
   cd /root/ai-trading-system
   nano .env
   # Add your real API key
   pm2 restart ai-trading
   ```

3. **Configure Domain (Optional)**
   - Point your domain to the server IP
   - Update ALLOWED_ORIGINS in .env

4. **Start Trading**
   - Access dashboard at http://your-server-ip
   - Monitor performance
   - Scale gradually

## 🎯 Server Specifications

- **Location**: New Jersey (low latency to markets)
- **CPU**: 1 vCPU
- **RAM**: 1 GB
- **Storage**: 25 GB SSD
- **Cost**: $5/month
- **OS**: Ubuntu 20.04 LTS

## ⚠️ Important Notes

1. **IP Whitelist**: Your API key is currently restricted to:
   - 152.110.45.7/32
   - Add your server IP in Vultr dashboard

2. **Firewall**: Ports 22, 80, 443, 3000, 8000 are open

3. **Auto-restart**: PM2 ensures your app restarts on crash/reboot

## 🚀 Ready to Deploy?

Run one of these commands:
```bash
# Automated (creates new server)
./deploy-vultr.sh

# Manual (existing server)
./vultr-quick-deploy.sh root@your-server-ip
```

Your AI trading system will be live in ~5 minutes! 💰