# AI Trading System - Operations Runbook v1.1

**Version**: 1.1.0  
**Commit SHA**: $(git rev-parse HEAD)  
**Last Updated**: $(date)  
**Next Review**: $(date -d '+3 months')

## 🚨 Emergency Contacts & Escalation

| Role | Contact | Escalation Time | PagerDuty Schedule |
|------|---------|----------------|-------------------|
| Primary On-Call | @devops-lead (Slack) | Immediate | PD-TRADING-PRIMARY |
| Secondary | @sre-team (Slack) | 15 minutes | PD-TRADING-SECONDARY |
| Management | @cto (Slack/Phone) | 1 hour | PD-EXECUTIVE |
| Security Incident | @security-team | Immediate | PD-SECURITY |

**Emergency Slack Channel:** `#trading-ops-alerts`  
**PagerDuty Integration:** Enabled for P0/P1 alerts  
**After Hours Phone Tree:** See PagerDuty escalation policy PD-TRADING-PRIMARY

---

## 🎯 Alert Glossary & Response

### P0 - Critical System Failure

#### **🔴 PM2 High Restart Rate**
- **Trigger:** `pm2_process_restarts > 3 in 5 minutes`
- **Impact:** Service instability, potential data loss
- **Response:**
  ```bash
  # Check PM2 status
  pm2 status
  pm2 logs --lines 50
  
  # Identify failing process
  pm2 describe [process_name]
  
  # Manual restart with environment update
  pm2 restart ecosystem.config.cjs --update-env
  # WARNING: Don't run "pm2 restart all" - can double-spawn if config changed
  ```
- **Escalation:** If restarts persist after manual intervention

#### **🔴 Database Connection Pool Exhausted**
- **Trigger:** `database_connections_active >= database_connections_max`
- **Impact:** Application cannot process new requests
- **Response:**
  ```bash
  # Check PostgreSQL connections
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
  
  # Kill long-running queries
  psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - interval '5 minutes';"
  
  # If DB is the bottleneck, increase connection limit
  psql $DATABASE_URL -c "ALTER SYSTEM SET max_connections = 200;"
  psql $DATABASE_URL -c "SELECT pg_reload_conf();"
  
  # Restart application if needed
  pm2 restart ecosystem.config.cjs --update-env
  ```

#### **🔴 Rate Gate API Exhaustion**
- **Trigger:** `rate_gate_backoff_count > 10 per minute`
- **Impact:** External API calls blocked, trading halted
- **Response:**
  ```bash
  # Check rate gate status
  curl -sSf http://localhost:3001/status
  
  # ⚠️ CAUTION: Only reset quotas if exchanges are already blocking
  # Resetting early masks quota leaks and causes worse rate limiting
  curl -X POST http://localhost:3001/reset
  
  # Monitor quota usage
  curl -sSf http://localhost:3001/metrics
  ```

#### **🔴 Loki Ingestion Lag**
- **Trigger:** `loki_ingestion_lag > 30 seconds`
- **Impact:** Blind to real-time logs during incidents
- **Response:**
  ```bash
  # Check Loki status
  curl -sSf http://localhost:3100/ready
  
  # Check ingestion rate
  curl -sSf http://localhost:3100/metrics | grep loki_ingester
  
  # Restart Loki if needed
  docker restart loki
  ```

### P1 - Service Degradation

#### **🟡 Negative Sharpe Ratio with Drawdown**
- **Trigger:** `trading_sharpe_ratio < 0 for 15 minutes AND equity_curve_drawdown > 5%`
- **Impact:** Trading strategy underperforming with significant losses
- **Response:**
  ```bash
  # Check trading performance
  curl -sSf http://localhost:8000/api/metrics/performance
  
  # Review recent trades
  curl -sSf http://localhost:8000/api/trades?limit=20
  
  # Check model accuracy
  curl -sSf http://localhost:8000/api/models/status
  
  # Consider disabling auto-trading
  curl -X POST http://localhost:8000/api/trading/disable
  ```

#### **🟡 High API Latency**
- **Trigger:** `http_request_duration_p95 > 2s`
- **Impact:** Slow response times, poor user experience
- **Response:**
  ```bash
  # Check system resources
  top
  df -h
  free -m
  
  # Review application logs
  pm2 logs --lines 100
  
  # Check database performance
  psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
  
  # Check TimescaleDB hypertable performance
  psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables;"
  ```

### P2 - Minor Issues

#### **🟢 Backup Failure**
- **Trigger:** Backup script exit code != 0
- **Impact:** DR capability reduced
- **Response:**
  ```bash
  # Check backup logs
  tail -50 /var/log/postgres-backup.log
  tail -50 /var/log/redis-backup.log
  
  # Manual backup execution
  ./scripts/backup-postgres.sh
  ./scripts/backup-redis.sh
  
  # Verify S3 uploads
  aws s3 ls s3://ai-trading-backups/postgres/
  ```

---

## 🔄 Rollback Procedures

### Application Rollback (Helm)
```bash
# List recent deployments
helm history ats -n trading

# Rollback to previous version
helm rollback ats [REVISION] -n trading

# Verify rollback with built-in probes
helm test ats -n trading

# Verify rollback
kubectl get pods -n trading
curl -sSf http://localhost:8000/api/health
```

### Database Migration Rollback
```bash
# Connect to database
psql $DATABASE_URL

-- Check migration status
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

-- Rollback migration (if supported)
-- NOTE: Many migrations are irreversible - coordinate with dev team
```

### PM2 Configuration Rollback
```bash
# Backup current config
cp ecosystem.config.cjs ecosystem.config.backup.cjs

# Restore from backup
git checkout HEAD~1 -- ecosystem.config.cjs
pm2 reload ecosystem.config.cjs
```

---

## 📊 Service Health Checks

### Quick Health Verification
```bash
#!/bin/bash
# health-check.sh
set -euo pipefail

echo "=== System Health Check ==="

# API Health
echo "API Health:"
curl -sSf http://localhost:8000/api/health | jq .

# Database
echo "Database:"
psql $DATABASE_URL -c "SELECT 1;" > /dev/null && echo "✅ Connected" || echo "❌ Failed"

# Redis (handle non-default port)
echo "Redis:"
redis-cli -p ${REDIS_PORT:-6379} ping > /dev/null && echo "✅ Connected" || echo "❌ Failed"

# PM2 Status
echo "PM2 Processes:"
pm2 status --no-color

# Docker Services
echo "Docker Services:"
docker compose ps

# Disk Space
echo "Disk Usage:"
df -h | grep -E "(/$|/var|/tmp)"

# Memory
echo "Memory Usage:"
free -m

echo "=== Health Check Complete ==="
```

### Performance Baseline
| Metric | Normal Range | Alert Threshold |
|--------|--------------|----------------|
| CPU Usage | < 70% | > 85% |
| Memory Usage | < 85% | > 90% |
| Disk Usage | < 85% | > 90% |
| API Response Time (p95) | < 500ms | > 2s |
| Database Connections | < 80% of max | > 90% of max |

---

## 🔧 Common Troubleshooting

### High Memory Usage
```bash
# Find memory-heavy processes
ps aux --sort=-%mem | head -10

# Check Node.js heap usage
curl -sSf http://localhost:8000/api/metrics/memory

# Restart PM2 processes
pm2 restart ecosystem.config.cjs --update-env
```

### Slow Database Queries
```bash
# Enable query logging (temporarily)
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check TimescaleDB hypertable insights
psql $DATABASE_URL -c "SELECT hypertable_name, hypertable_size(format('%I.%I', schema_name, table_name)) FROM timescaledb_information.hypertables ORDER BY 2 DESC;"

# Reset statistics
psql $DATABASE_URL -c "SELECT pg_stat_statements_reset();"
```

### WebSocket Connection Issues
```bash
# Check active WebSocket connections
curl -sSf http://localhost:8000/api/metrics/websockets

# Test WebSocket connectivity
wscat -c ws://localhost:8000/ws/market

# Check nginx proxy (if used)
nginx -t
systemctl status nginx
```

### Rate Limiting Issues
```bash
# Check current quotas
curl -sSf http://localhost:3001/status

# View rate limiting metrics
curl -sSf http://localhost:3001/metrics

# Reset specific provider quota (emergency only - when exchanges already blocking)
curl -X POST http://localhost:3001/reset/alphavantage
```

---

## 🛡️ Security Incident Response

### Suspected Breach
1. **Immediate:** Disable external API access
   ```bash
   # Use UFW instead of iptables (safer on Ubuntu)
   sudo ufw deny out 443
   ```

2. **Isolate:** Stop trading activities
   ```bash
   curl -X POST http://localhost:8000/api/trading/emergency-stop
   ```

3. **Investigate:** Check logs for anomalies
   ```bash
   grep -E "(error|unauthorized|failed)" logs/combined.log | tail -100
   ```

4. **Escalate:** Contact security team immediately via PD-SECURITY

### API Key Compromise
```bash
# Rotate API keys immediately
# 1. Update environment variables
# 2. Restart services
pm2 restart ecosystem.config.cjs --update-env

# 3. Verify new keys working
curl -sSf http://localhost:8000/api/health
```

---

## 💾 Backup & Recovery

### Database Recovery
```bash
# List available backups
aws s3 ls s3://ai-trading-backups/postgres/

# Download backup
aws s3 cp s3://ai-trading-backups/postgres/trading_db_2025-01-20.dump /tmp/

# Restore database
dropdb trading_db_recovery
createdb trading_db_recovery
pg_restore --verbose --clean --no-acl --no-owner -d trading_db_recovery /tmp/trading_db_2025-01-20.dump
```

### Redis Recovery
```bash
# Stop Redis
systemctl stop redis

# Restore RDB file
cp /var/backups/redis/redis_latest.rdb.gz /var/lib/redis/
gunzip /var/lib/redis/redis_latest.rdb.gz
mv /var/lib/redis/redis_latest.rdb /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis
```

### Application Recovery (Clean Deployment)
```bash
# Clone fresh repository
git clone https://github.com/banky420star/sb1-dapxyzdb.git recovery
cd recovery

# Deploy clean stack
docker compose down -v
docker compose up --build -d

# Verify services
./scripts/deployment-verification.sh
```

---

## 🎮 Disaster Recovery Procedures

### Quarterly Game-Day Exercise
```bash
# Disaster Recovery Dry-Run (30-minute target)
# 1. Spin up clean cluster from last night's backups
# 2. Restore all data and configurations
# 3. Verify trading system is operational
# 4. Document time to recovery and issues found

# Schedule: Every quarter, first Tuesday of the month
# Next scheduled: [ADD DATE]
```

### Blue/Green Deployment Swap
```bash
# Production deployment with instant rollback capability
# 1. Deploy new version to "green" environment
# 2. Update ingress annotation to point to green
# 3. Wait for green liveness probe success
# 4. Cut DNS from blue to green
# 5. Monitor for 15 minutes before decommissioning blue

# Rollback: Reverse DNS and ingress changes (< 30 seconds)
```

---

## 📞 Contact Information & Credentials

| Service | URL | Credentials | Notes |
|---------|-----|-------------|-------|
| Grafana | http://localhost:3000 | See 1Password vault: "AI-Trading-Grafana" | ⚠️ Change default admin/admin on first login |
| MLflow | http://localhost:5000 | None | No authentication required |
| Prometheus | http://localhost:9090 | None | Internal monitoring only |
| Trading API | http://localhost:8000 | Bearer token in 1Password | Rotate weekly |

**Security Note**: All default passwords have been changed and stored in 1Password vault "AI-Trading-Production". 

**Emergency Procedures:**
- For P0 alerts: Page PD-TRADING-PRIMARY immediately
- For data corruption: Stop all trading, contact dev team
- For security incidents: Follow incident response protocol, page PD-SECURITY

**Documentation Updates:**
This runbook should be updated after each deployment and reviewed monthly.

---

*Version: 1.1.0*  
*Commit SHA: $(git rev-parse HEAD)*  
*Owner: Trading Operations Team*  
*Next Review: $(date -d '+3 months')* 