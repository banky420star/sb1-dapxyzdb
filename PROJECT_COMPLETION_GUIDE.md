# AI Trading System - Project Completion Guide

## 🎯 Project Status
Your AI Trading System is deployed on **45.76.136.30** and needs final configuration to be fully operational.

## 📋 Current Issues to Fix
1. **Frontend not accessible** - Connection refused on port 3000
2. **Backend connectivity** - Needs proper restart with real data
3. **Domain setup** - Currently using IP address instead of custom domain
4. **Real data integration** - Ensure all mock/sample data is disabled

## 🚀 Step 1: Complete System Restart

### Option A: Use Existing Fix Script
```bash
# SSH to your server
ssh banks@45.76.136.30

# Run the existing fix script
cd /root/ai-trading-system
./fix-server-deployment.sh
```

### Option B: Manual Restart (if fix script doesn't work)
```bash
# SSH to your server
ssh banks@45.76.136.30

# Stop all processes
pm2 delete all

# Clean up data
rm -rf /root/ai-trading-system/data/trading.db*
rm -rf /home/banks/ai-trading-system/data/trading.db*

# Restart backend
cd /root/ai-trading-system
npm ci
pm2 start server/index.js --name ai-trading-backend

# Restart frontend
cd /home/banks/ai-trading-system
npm ci
npm run build
pm2 start "npx serve -s dist -l 3000 --host 0.0.0.0" --name ai-trading-frontend

# Save PM2 configuration
pm2 save
```

## 🌐 Step 2: Domain Setup

### Choose Your Domain Name
Popular options for trading systems:
- `www.tradername.com`
- `www.aifinance.com`
- `www.smarttrader.com`
- `www.quanttrading.com`
- `www.algotrader.com`

### Domain Registration
1. **Register your domain** with a provider like:
   - Namecheap ($10-15/year)
   - GoDaddy ($12-20/year)
   - Google Domains ($12/year)
   - Cloudflare ($8-12/year)

### DNS Configuration
Add these DNS records to your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 45.76.136.30 | 300 |
| A | www | 45.76.136.30 | 300 |
| CNAME | api | yourdomain.com | 300 |

### SSL Certificate Setup
```bash
# Install Certbot for free SSL
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔧 Step 3: Environment Configuration

### Update Backend Environment
```bash
cd /root/ai-trading-system
nano .env
```

Add/update these values:
```env
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://yourdomain.com
ENABLE_REAL_DATA=true
ENABLE_MOCK_DATA=false
ENABLE_SAMPLE_DATA=false
UNIRATE_API_KEY=your_actual_unirate_key
FINNHUB_API_KEY=your_actual_finnhub_key
```

### Update Frontend Environment
```bash
cd /home/banks/ai-trading-system
nano .env
```

Add/update these values:
```env
VITE_API_URL=https://yourdomain.com
VITE_WEBSOCKET_URL=wss://yourdomain.com/ws
VITE_ENABLE_REAL_DATA=true
```

## 🎨 Step 4: Custom Branding

### Update Application Name
```bash
# Update package.json
cd /home/banks/ai-trading-system
nano package.json
```

Change the name to your preferred trading system name.

### Update Frontend Title
```bash
# Update index.html
nano index.html
```

Change the title tag to your domain name.

## 🔄 Step 5: Final Restart

```bash
# Restart all services
pm2 restart all
pm2 save

# Check status
pm2 status

# Test endpoints
curl http://45.76.136.30:8000/api/health
curl http://45.76.136.30:3000
```

## ✅ Step 6: Verification

### Test Your System
1. **Frontend**: Visit `https://yourdomain.com`
2. **Backend API**: `https://yourdomain.com/api/health`
3. **Training**: Go to Models page and start training
4. **Real Data**: Check that data is coming from real APIs

### Monitor Performance
```bash
# Check PM2 logs
pm2 logs

# Monitor system resources
htop

# Check disk space
df -h
```

## 🎉 Final Result

After completing these steps, your AI Trading System will be:

✅ **Fully operational** with real market data  
✅ **Accessible via custom domain** (e.g., `www.tradername.com`)  
✅ **Secured with SSL** (HTTPS)  
✅ **Running AI training** with real data  
✅ **Monitoring enabled** for system health  

## 📞 Support

If you encounter any issues:
1. Check PM2 logs: `pm2 logs`
2. Verify firewall: `sudo ufw status`
3. Test connectivity: `curl localhost:3000`
4. Check DNS propagation: `nslookup yourdomain.com`

## 🚀 Next Steps

1. **Start training** your AI models with real data
2. **Monitor performance** and adjust parameters
3. **Set up alerts** for system health
4. **Consider scaling** if needed
5. **Backup regularly** your trained models and data

---

**Your AI Trading System is now ready for production use! 🎯** 