# Live Deployment Unlock

**WARNING: This file enables live trading deployment!**

- Created: 2025-01-27 00:00:00 UTC
- Duration: 24 hours
- Expires: 2025-01-28 00:00:00 UTC
- Reason: Example live deployment unlock file
- Created by: system
- Workflow: manual
- Run ID: example

## Safety Reminders

1. Ensure paper deployment is healthy before live deployment
2. Monitor live deployment closely after activation
3. This file will auto-expire in 24 hours
4. Remove this file manually if deployment needs to be halted early

## Risk Checklist

- [ ] Paper deployment verified healthy
- [ ] All tests passing
- [ ] Risk parameters validated
- [ ] Circuit breakers tested
- [ ] Monitoring alerts configured
- [ ] Rollback plan ready
- [ ] Team notified of live deployment

**DO NOT COMMIT THIS FILE TO MAIN BRANCH WITHOUT PROPER APPROVAL**

## How to Use

1. **Enable Live Deployment:**
   ```bash
   # Run the live release workflow manually
   gh workflow run release-live.yml
   ```

2. **Manual Unlock (Emergency):**
   ```bash
   # Create unlock file manually (use with caution)
   echo "# Live unlock $(date)" > ops/ENABLE_LIVE.md
   git add ops/ENABLE_LIVE.md
   git commit -m "Emergency live unlock"
   git push origin main
   ```

3. **Disable Live Deployment:**
   ```bash
   # Remove unlock file
   git rm ops/ENABLE_LIVE.md
   git commit -m "Disable live deployment"
   git push origin main
   ```

## Security Notes

- This file is automatically removed after 24 hours
- Never commit this file without proper approval
- Always verify paper deployment health first
- Monitor live deployment closely
- Have rollback plan ready

## Emergency Procedures

If live deployment causes issues:

1. **Immediate Halt:**
   ```bash
   # Remove unlock file to stop new deployments
   git rm ops/ENABLE_LIVE.md
   git commit -m "Emergency halt - remove live unlock"
   git push origin main
   ```

2. **Rollback:**
   ```bash
   # Revert to previous working commit
   git revert HEAD
   git push origin main
   ```

3. **Kill Switch:**
   - Use the kill switch endpoint: `POST /api/trading/halt`
   - Set `TRADING_MODE=halt` in environment variables
   - Restart services to apply halt mode