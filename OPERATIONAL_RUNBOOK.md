# AI Trading System - Operational Runbook
**Production Environment: methtrader.xyz**  
**Server: 45.76.136.30 (Vultr Cloud)**  
**Last Updated: July 23, 2025**

## 🚀 System Overview

### Production URLs
- **Main Site**: https://methtrader.xyz
- **Trading Platform**: https://methtrader.xyz/trading  
- **Grafana Monitoring**: https://methtrader.xyz:3001
- **API Base**: https://methtrader.xyz/api/

### Access Credentials
- **Server SSH**: `ssh -i deploy_key root@45.76.136.30`
- **Grafana**: admin / MethTrader2024
- **Landing Page**: admin / admin123

## 🏗️ System Architecture

### Docker Services
```bash
# Check all service status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected services:
- trading-api        (Port 8080 -> 8000)
- trading-frontend   (Port 3002 -> 80) 
- trading-postgres   (Port 5432)
- trading-redis      (Port 6379)
- trading-grafana    (Port 3001 -> 3000)
- trading-caddy      (Ports 80, 443)
```

### Data Sources
- **Alpha Vantage API**: Real-time market data (rate limited)
- **PostgreSQL**: Persistent data storage
- **Redis**: Caching and real-time data
- **Mock Data**: Fallback when APIs are rate limited

## 📊 Monitoring & Health Checks

### API Health Check
```bash
curl -s https://methtrader.xyz/api/health | jq .
# Expected: {"status":"healthy","timestamp":"...","services":{...}}
```

### System Status Commands
```bash
# Overall system health
uptime && free -h && df -h

# Docker service health
docker ps --filter "status=running" --format "table {{.Names}}\t{{.Status}}"

# Application logs
docker logs trading-api --tail 50
docker logs trading-frontend --tail 20
docker logs trading-caddy --tail 20
```

### Grafana Dashboards
- **URL**: https://grafana.methtrader.xyz
- **Login**: admin / MethTrader2024
- Monitor: API response times, system resources, trading metrics

## 🛠️ Daily Operations

### Backup System
**Location**: `/opt/backups/`
**Schedule**: Daily at 2:00 AM (automated via cron)

```bash
# Manual backup
/opt/backups/backup.sh

# Check backup status
ls -la /opt/backups/daily/
crontab -l | grep backup
```

**Backup Contents**:
- PostgreSQL database dumps
- Redis data snapshots  
- Configuration files
- SSH keys (weekly)

### Log Management
```bash
# Application logs
tail -f logs/combined.log
tail -f logs/error.log
tail -f logs/trading.log

# Docker logs
docker logs -f trading-api
docker logs -f trading-postgres
```

## 🔧 Troubleshooting Guide

### API Not Responding
```bash
# Check API container
docker ps | grep trading-api
docker logs trading-api --tail 50

# Restart API if needed
docker restart trading-api

# Verify health
curl -s https://methtrader.xyz/api/health
```

### Database Issues
```bash
# Check PostgreSQL
docker exec trading-postgres pg_isready
docker logs trading-postgres --tail 20

# Database connection test
docker exec trading-api node -e "console.log('Testing DB connection...')"
```

### SSL/Domain Issues
```bash
# Check Caddy (reverse proxy)
docker logs trading-caddy --tail 20
docker exec trading-caddy caddy version

# Test SSL certificate
curl -I https://methtrader.xyz
```

### Alpha Vantage Rate Limiting
- **Free Tier**: 500 requests/day, 5 requests/minute
- **Monitoring**: Check logs for "rate limit" warnings
- **Fallback**: System automatically uses cached/mock data

```bash
# Check API usage
grep -i "alpha\|rate" logs/combined.log | tail -10
```

## 🚨 Emergency Procedures

### Complete System Restart
```bash
# Graceful restart (2-3 min downtime)
docker-compose down && docker-compose up -d

# Verify all services
docker ps --format "table {{.Names}}\t{{.Status}}"
curl -s https://methtrader.xyz/api/health
```

### Database Recovery
```bash
# Restore from latest backup
cd /opt/backups/daily/
latest_backup=$(ls -t trading_db_*.sql | head -1)
docker exec trading-postgres psql -U postgres -d trading_db < $latest_backup
```

### SSL Certificate Renewal
```bash
# Caddy handles auto-renewal, but if needed:
docker exec trading-caddy caddy reload --config /etc/caddy/Caddyfile
```

## 🔐 Security Checklist

### Completed Security Measures
- ✅ Grafana default password changed
- ✅ SSH keys backed up securely
- ✅ SSL certificates (auto-renewed)
- ✅ Firewall configured (Docker manages ports)
- ✅ Non-root Docker containers where possible

### Regular Security Tasks
- [ ] Review access logs weekly
- [ ] Update system packages monthly
- [ ] Rotate backup encryption keys quarterly
- [ ] Review API access patterns

## 📈 ML Model Training

### Available Models
- **LSTM**: Time series prediction
- **Random Forest**: Feature-based predictions  
- **DDQN**: Reinforcement learning trading agent

### Training Commands
```bash
# Start training (inside container)
docker exec trading-api node server/ml/train.js --model lstm
docker exec trading-api node server/ml/train.js --model randomforest  
docker exec trading-api node server/ml/train.js --model ddqn
```

### Model Performance Monitoring
- Check training logs in `logs/training.log`
- Monitor via Grafana ML dashboards
- Validate against historical backtests

## 📞 Escalation Contacts

### Technical Issues
- **System Admin**: [Your contact info]
- **Domain/DNS**: GoDaddy support
- **Server**: Vultr support portal

### Service Dependencies
- **Alpha Vantage**: API status page
- **Docker Hub**: Hub status page  
- **CDN**: Check external service status

## 📋 Maintenance Schedule

### Daily
- ✅ Automated backups (2:00 AM)
- ✅ Health monitoring (automated)
- Manual: Review error logs

### Weekly  
- Check disk space usage
- Review Grafana alerts
- Update documentation if needed

### Monthly
- System package updates
- Review and rotate logs
- Performance optimization review

### Quarterly
- Security audit
- Backup restore testing
- Update dependencies

---

## 🔄 Recent Changes Log

**July 23, 2025**:
- ✅ System fully operational
- ✅ Backup system implemented  
- ✅ Grafana password secured
- ✅ SSH keys backed up
- ✅ All Docker services healthy
- ✅ API endpoints responding correctly
- ✅ Landing page deployed with admin access

**System Status**: 🟢 FULLY OPERATIONAL 