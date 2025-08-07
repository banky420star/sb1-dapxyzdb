# 🚨 PAGER PLAYBOOK
## Emergency Response Procedures for AI Trading System

*Last Updated: July 31, 2025*

---

## 🚨 **CRITICAL ALERTS (IMMEDIATE RESPONSE)**

### **Alert: Portfolio Drawdown >10%**
**Severity**: 🔴 CRITICAL  
**Primary**: @trading-team  
**Escalation**: @management (5 min)  
**Response Time**: IMMEDIATE  

**Immediate Actions**:
1. **STOP ALL TRADING** - Emergency brake should auto-activate
2. **Verify Emergency Stop** - Check if all engines stopped
3. **Liquidate Positions** - Confirm all positions closed
4. **Check Risk Parameters** - Review what triggered the alert
5. **Notify Management** - Escalate within 5 minutes

**Investigation Steps**:
```bash
# Check emergency brake status
curl http://localhost:8000/api/emergency/status

# Check portfolio value
curl http://localhost:8000/api/portfolio/value

# Check recent trades
curl http://localhost:8000/api/trades/recent

# Check risk metrics
curl http://localhost:8000/api/risk/metrics
```

**Resolution**:
- Investigate root cause (market crash, model failure, etc.)
- Review risk parameters and adjust if needed
- Get management approval before resuming trading
- Document incident and lessons learned

---

### **Alert: VaR Exceeds 5%**
**Severity**: 🔴 CRITICAL  
**Primary**: @risk-team  
**Escalation**: @trading-team (10 min)  
**Response Time**: 10 MINUTES  

**Immediate Actions**:
1. **Check VaR Calculation** - Verify VaR is accurate
2. **Review Positions** - Identify high-risk positions
3. **Reduce Exposure** - Close or hedge risky positions
4. **Check Model Performance** - Verify models are working correctly

**Investigation Steps**:
```bash
# Check VaR calculation
curl http://localhost:8000/api/risk/var

# Check position risk
curl http://localhost:8000/api/positions/risk

# Check model performance
curl http://localhost:8000/api/ml/performance
```

**Resolution**:
- Adjust position sizes if needed
- Review and update risk parameters
- Consider model retraining if performance degraded

---

### **Alert: Bybit Rate Limit Critical**
**Severity**: 🟡 HIGH  
**Primary**: @devops-team  
**Escalation**: @trading-team (15 min)  
**Response Time**: 15 MINUTES  

**Immediate Actions**:
1. **Check Rate Limit Status** - Monitor API usage
2. **Switch to WebSocket** - Use WebSocket for market data
3. **Reduce Request Frequency** - Implement backoff
4. **Check for Bugs** - Look for infinite loops or excessive requests

**Investigation Steps**:
```bash
# Check rate limit status
curl http://localhost:8000/api/bybit/rate-limit

# Check API logs
docker logs trading-api | grep bybit

# Check WebSocket connection
curl http://localhost:8000/api/bybit/websocket/status
```

**Resolution**:
- Fix any code issues causing excessive requests
- Implement proper rate limiting
- Consider upgrading Bybit plan if needed

---

## 🟡 **HIGH PRIORITY ALERTS**

### **Alert: Disk 90% Full**
**Severity**: 🟡 HIGH  
**Primary**: @devops-team  
**Escalation**: @management (30 min)  
**Response Time**: 30 MINUTES  

**Immediate Actions**:
1. **Check Disk Usage** - Identify what's consuming space
2. **Clean Up Logs** - Remove old log files
3. **Clean Docker** - Remove unused containers/images
4. **Check Database Size** - Verify database isn't bloated

**Investigation Steps**:
```bash
# Check disk usage
df -h

# Check largest directories
du -h --max-depth=1 /opt/ats/

# Clean up old logs
find /var/log -name "*.log" -mtime +7 -delete

# Clean Docker
docker system prune -f

# Check database size
docker exec trading-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('trading_db'));"
```

**Resolution**:
- Implement log rotation
- Set up disk monitoring alerts
- Consider increasing disk size
- Document cleanup procedures

---

### **Alert: Database Connection Failed**
**Severity**: 🟡 HIGH  
**Primary**: @devops-team  
**Escalation**: @trading-team (20 min)  
**Response Time**: 20 MINUTES  

**Immediate Actions**:
1. **Check Database Status** - Verify PostgreSQL is running
2. **Check Connection Pool** - Look for connection leaks
3. **Restart Database** - If necessary
4. **Check Network** - Verify connectivity

**Investigation Steps**:
```bash
# Check database status
docker ps | grep postgres

# Check database logs
docker logs trading-postgres

# Test database connection
docker exec trading-postgres psql -U postgres -c "SELECT 1;"

# Check connection pool
curl http://localhost:8000/api/health
```

**Resolution**:
- Fix connection pool issues
- Implement database monitoring
- Set up automatic failover if needed

---

### **Alert: ML Model Performance Degraded**
**Severity**: 🟡 HIGH  
**Primary**: @ml-team  
**Escalation**: @trading-team (30 min)  
**Response Time**: 30 MINUTES  

**Immediate Actions**:
1. **Check Model Metrics** - Review accuracy and performance
2. **Check Data Quality** - Verify input data is correct
3. **Check for Drift** - Look for feature drift
4. **Consider Model Rollback** - If performance is poor

**Investigation Steps**:
```bash
# Check model performance
curl http://localhost:8000/api/ml/performance

# Check model drift
curl http://localhost:8000/api/ml/drift

# Check MLflow for model history
curl http://localhost:5000/api/2.0/mlflow/runs/search

# Check training data quality
curl http://localhost:8000/api/data/quality
```

**Resolution**:
- Retrain model if needed
- Investigate data quality issues
- Rollback to previous model version
- Update model monitoring

---

## 🟢 **MEDIUM PRIORITY ALERTS**

### **Alert: API Response Time >500ms**
**Severity**: 🟢 MEDIUM  
**Primary**: @devops-team  
**Escalation**: @trading-team (60 min)  
**Response Time**: 60 MINUTES  

**Immediate Actions**:
1. **Check System Resources** - CPU, memory, disk I/O
2. **Check Database Performance** - Slow queries
3. **Check External APIs** - Alpha Vantage, Bybit
4. **Check Network Latency** - Network issues

**Investigation Steps**:
```bash
# Check system resources
htop
iostat -x 1 5

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/health

# Check database performance
docker exec trading-postgres psql -U postgres -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check external API latency
curl -w "@curl-format.txt" -o /dev/null -s https://api.bybit.com/v5/market/tickers
```

**Resolution**:
- Optimize slow queries
- Add caching where appropriate
- Scale up resources if needed
- Implement performance monitoring

---

### **Alert: WebSocket Connection Lost**
**Severity**: 🟢 MEDIUM  
**Primary**: @devops-team  
**Escalation**: @trading-team (45 min)  
**Response Time**: 45 MINUTES  

**Immediate Actions**:
1. **Check WebSocket Status** - Verify connection state
2. **Check Network** - Look for network issues
3. **Restart WebSocket** - If necessary
4. **Check Firewall** - Verify no firewall blocking

**Investigation Steps**:
```bash
# Check WebSocket status
curl http://localhost:8000/api/websocket/status

# Check network connectivity
ping api.bybit.com

# Check WebSocket logs
docker logs trading-api | grep websocket

# Test WebSocket connection
wscat -c wss://stream.bybit.com/v5/public/linear
```

**Resolution**:
- Fix network issues
- Implement automatic reconnection
- Add WebSocket monitoring
- Document connection procedures

---

## 📋 **ON-CALL SCHEDULE**

### **Primary On-Call (24/7)**
- **Monday-Friday**: @trading-team
- **Weekends**: @devops-team
- **Holidays**: @management

### **Secondary On-Call (Business Hours)**
- **Monday-Friday 9AM-6PM**: @ml-team
- **Escalation**: @management

### **Emergency Contacts**
- **Trading Team**: +1-555-TRADE-01
- **DevOps Team**: +1-555-DEVOPS-01
- **Management**: +1-555-MGMT-01
- **Compliance**: +1-555-COMP-01

---

## 🛠️ **COMMON COMMANDS**

### **System Status**
```bash
# Check all services
docker compose ps

# Check system health
curl http://localhost:8000/api/health

# Check logs
docker compose logs -f

# Check metrics
curl http://localhost:8000/api/metrics
```

### **Trading Operations**
```bash
# Stop all trading
curl -X POST http://localhost:8000/api/trading/stop

# Start trading
curl -X POST http://localhost:8000/api/trading/start

# Emergency stop
curl -X POST http://localhost:8000/api/emergency/stop

# Check positions
curl http://localhost:8000/api/positions
```

### **Database Operations**
```bash
# Backup database
docker exec trading-postgres pg_dump -U postgres trading_db > backup.sql

# Restore database
docker exec -i trading-postgres psql -U postgres trading_db < backup.sql

# Check database size
docker exec trading-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('trading_db'));"
```

### **Log Analysis**
```bash
# Search for errors
docker logs trading-api | grep ERROR

# Search for specific patterns
docker logs trading-api | grep -i "rate limit"

# Follow logs in real-time
docker logs -f trading-api
```

---

## 📞 **ESCALATION PROCEDURES**

### **Level 1 (Primary On-Call)**
- Respond within SLA time
- Attempt to resolve issue
- Document actions taken
- Escalate if unable to resolve

### **Level 2 (Secondary On-Call)**
- Respond within 30 minutes
- Provide technical expertise
- Coordinate with other teams
- Escalate to management if needed

### **Level 3 (Management)**
- Respond within 1 hour
- Make business decisions
- Coordinate with external parties
- Authorize emergency procedures

---

## 📝 **INCIDENT DOCUMENTATION**

### **Post-Incident Report Template**
```
Incident ID: [GENERATE]
Date/Time: [TIMESTAMP]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Duration: [START_TIME - END_TIME]

Summary:
[Brief description of what happened]

Root Cause:
[What caused the incident]

Actions Taken:
[Step-by-step actions taken]

Resolution:
[How the incident was resolved]

Lessons Learned:
[What can be improved]

Follow-up Actions:
[Tasks to prevent recurrence]
```

---

## 🔄 **CONTINUOUS IMPROVEMENT**

### **Weekly Review**
- Review all incidents from the week
- Identify patterns and trends
- Update playbook based on learnings
- Train team on new procedures

### **Monthly Review**
- Analyze incident metrics
- Review and update escalation procedures
- Update contact information
- Conduct incident response drills

---

*This playbook should be reviewed and updated regularly based on incident learnings and system changes.* 