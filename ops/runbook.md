# AI Trading System Runbook

## Emergency Procedures

### Kill Switch Activation

**Immediate Halt (Critical Issues)**

1. **API Kill Switch:**
   ```bash
   curl -X POST https://methtrader.xyz/api/trading/halt \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json"
   ```

2. **Environment Kill Switch:**
   ```bash
   # Set trading mode to halt
   export TRADING_MODE=halt
   # Restart services
   docker-compose restart
   ```

3. **Database Kill Switch:**
   ```sql
   -- Update trading mode in database
   UPDATE system_config SET value = 'halt' WHERE key = 'trading_mode';
   ```

### Circuit Breaker Triggers

**Daily Drawdown Limit (DDL) Triggered**

1. **Check Current P&L:**
   ```bash
   curl https://methtrader.xyz/api/trading/pnl
   ```

2. **Verify DDL Status:**
   ```bash
   curl https://methtrader.xyz/api/risk/circuit-breakers
   ```

3. **Manual Override (if needed):**
   ```bash
   curl -X POST https://methtrader.xyz/api/risk/reset-ddl \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

**Exchange Connection Issues**

1. **Check Exchange Status:**
   ```bash
   curl https://methtrader.xyz/api/exchange/status
   ```

2. **Restart Exchange Connection:**
   ```bash
   curl -X POST https://methtrader.xyz/api/exchange/reconnect \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

3. **Switch to Paper Mode:**
   ```bash
   export TRADING_MODE=paper
   docker-compose restart
   ```

### Rollback Procedures

**Code Rollback**

1. **Revert to Previous Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Force Rollback (Emergency):**
   ```bash
   git reset --hard HEAD~1
   git push origin main --force
   ```

**Database Rollback**

1. **Restore from Backup:**
   ```bash
   # Restore database from last known good state
   pg_restore -d trading_db backup_$(date -d '1 day ago' +%Y%m%d).sql
   ```

2. **Reset Risk State:**
   ```sql
   -- Reset risk engine state
   UPDATE risk_state SET 
     daily_pnl = 0,
     max_drawdown = 0,
     circuit_breaker_triggered = false;
   ```

**Configuration Rollback**

1. **Restore Config:**
   ```bash
   # Restore from backup
   cp config/risk.json.backup config/risk.json
   cp config/oms.json.backup config/oms.json
   ```

2. **Restart Services:**
   ```bash
   docker-compose restart
   ```

### Monitoring and Alerts

**Health Checks**

1. **System Health:**
   ```bash
   curl https://methtrader.xyz/health
   ```

2. **Trading Health:**
   ```bash
   curl https://methtrader.xyz/api/trading/health
   ```

3. **Risk Health:**
   ```bash
   curl https://methtrader.xyz/api/risk/health
   ```

**Metrics and Logs**

1. **Prometheus Metrics:**
   ```bash
   curl https://methtrader.xyz/metrics
   ```

2. **Logs:**
   ```bash
   # View recent logs
   docker-compose logs --tail=100 trading-backend
   
   # View error logs
   docker-compose logs --tail=100 trading-backend | grep ERROR
   ```

3. **Risk Events:**
   ```bash
   curl https://methtrader.xyz/api/risk/events
   ```

### Troubleshooting

**Common Issues**

1. **WebSocket Disconnection:**
   - Check network connectivity
   - Restart WebSocket connection
   - Verify exchange API status

2. **Order Failures:**
   - Check exchange rate limits
   - Verify order parameters
   - Check account balance

3. **Risk Engine Errors:**
   - Check risk configuration
   - Verify market data
   - Check position calculations

4. **Model Service Issues:**
   - Check Python service health
   - Verify model files
   - Check feature data

**Debug Commands**

1. **System Status:**
   ```bash
   # Check all services
   docker-compose ps
   
   # Check resource usage
   docker stats
   ```

2. **Database Status:**
   ```bash
   # Check database connections
   psql -d trading_db -c "SELECT * FROM pg_stat_activity;"
   
   # Check recent trades
   psql -d trading_db -c "SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;"
   ```

3. **Exchange Status:**
   ```bash
   # Check exchange connection
   curl https://methtrader.xyz/api/exchange/status
   
   # Check recent orders
   curl https://methtrader.xyz/api/orders/recent
   ```

### Maintenance Procedures

**Daily Maintenance**

1. **Check System Health:**
   - Review metrics and alerts
   - Check error logs
   - Verify risk parameters

2. **Update Models:**
   ```bash
   # Trigger model retraining
   curl -X POST https://methtrader.xyz/api/models/retrain
   ```

3. **Backup Database:**
   ```bash
   # Create daily backup
   pg_dump trading_db > backup_$(date +%Y%m%d).sql
   ```

**Weekly Maintenance**

1. **Review Performance:**
   - Analyze P&L performance
   - Check model accuracy
   - Review risk metrics

2. **Update Dependencies:**
   ```bash
   # Update Node.js dependencies
   npm update
   
   # Update Python dependencies
   pip install --upgrade -r model-service/requirements.txt
   ```

3. **Security Audit:**
   ```bash
   # Run security audit
   npm audit
   
   # Check for vulnerabilities
   snyk test
   ```

### Contact Information

**Emergency Contacts**

- **Primary On-Call:** [Your Name] - [Phone] - [Email]
- **Secondary On-Call:** [Backup Name] - [Phone] - [Email]
- **DevOps Team:** [Team Email]
- **Security Team:** [Security Email]

**Escalation Procedures**

1. **Level 1 (Minor Issues):**
   - Check logs and metrics
   - Apply standard fixes
   - Document issue

2. **Level 2 (Major Issues):**
   - Activate kill switch if needed
   - Contact on-call engineer
   - Begin rollback procedures

3. **Level 3 (Critical Issues):**
   - Immediate kill switch activation
   - Contact all emergency contacts
   - Begin full system rollback
   - Notify stakeholders

### Recovery Procedures

**After Emergency Halt**

1. **Assess Damage:**
   - Check P&L impact
   - Review failed orders
   - Analyze risk violations

2. **Root Cause Analysis:**
   - Review logs and metrics
   - Identify failure point
   - Document findings

3. **Recovery Plan:**
   - Fix identified issues
   - Update risk parameters if needed
   - Test fixes in paper mode

4. **Gradual Restart:**
   - Start with paper mode
   - Monitor for 24 hours
   - Gradually enable live trading

**Post-Incident Review**

1. **Incident Report:**
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Lessons learned

2. **Process Improvements:**
   - Update runbook
   - Improve monitoring
   - Enhance safety measures

3. **Team Communication:**
   - Share findings with team
   - Update documentation
   - Conduct training if needed