# Operational Runbook

## Local Development (Docker)

### 1. Start the entire stack:
```bash
# Build and start all services
docker compose up --build

# Or start in background
docker compose up --build -d
```

### 2. Verify all services are healthy:
```bash
# Check backend health
curl -s http://localhost:8000/health | jq '.ok'

# Check model service health  
curl -s http://localhost:9000/health | jq '.ok'

# Check frontend (if running)
curl -s http://localhost:3000 | head -5
```

### 3. Test the AI consensus endpoint:
```bash
# Test with sample features
curl -X POST http://localhost:8000/api/ai/consensus \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "BTCUSDT",
    "features": {
      "mom_20": 1.0,
      "rv_5": 0.2,
      "rsi_14": 65.0
    }
  }' | jq '.'
```

Expected response:
```json
{
  "signal": "long",
  "prob_long": 0.75,
  "prob_short": 0.25,
  "confidence": 0.65,
  "model_version": "20241201_143022",
  "allow": true,
  "threshold": 0.6
}
```

### 4. Test trade execution (dry-run):
```bash
# Test trade execution
curl -X POST http://localhost:8000/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "BTCUSDT",
    "side": "buy",
    "qtyUsd": 2000,
    "confidence": 0.9
  }' | jq '.'
```

Expected response:
```json
{
  "ok": true,
  "dryRun": true,
  "order": {
    "symbol": "BTCUSDT",
    "side": "buy",
    "qtyUsd": 1800,
    "confidence": 0.9,
    "idempotencyKey": "abc123..."
  },
  "message": "Paper trading mode - order simulated"
}
```

## Paper → Live Trading Promotion

### Phase 1: Paper Trading Validation
1. **Start in paper mode** (default):
   ```bash
   export TRADING_MODE=paper
   docker compose restart backend
   ```

2. **Enable tiny position caps**:
   ```bash
   export PER_SYMBOL_USD_CAP=100
   docker compose restart backend
   ```

3. **Monitor key metrics**:
   - Slippage basis points
   - Confidence calibration accuracy
   - Error rates and response times
   - Model prediction distribution

4. **Set acceptance thresholds**:
   - Error rate < 1%
   - Response time < 500ms
   - Confidence calibration within ±5%
   - No risk limit breaches

### Phase 2: Gradual Scale-up
1. **Increase position sizes gradually**:
   ```bash
   export PER_SYMBOL_USD_CAP=500  # Then 1000, 2000, etc.
   docker compose restart backend
   ```

2. **Monitor drawdown and P&L**:
   ```bash
   # Check current drawdown
   curl -s http://localhost:8000/health | jq '.risk.drawdown'
   ```

3. **Only proceed if metrics remain acceptable**

### Phase 3: Live Trading
1. **Switch to live mode** (only after validation):
   ```bash
   export TRADING_MODE=live
   export BYBIT_API_KEY=your_key
   export BYBIT_API_SECRET=your_secret
   docker compose restart backend
   ```

2. **Monitor closely for first 24 hours**:
   - Check logs every 15 minutes
   - Verify all orders are executed correctly
   - Monitor risk limits

## Environment Management

### Secrets Management
- **Never commit API keys** to version control
- Use `.env` files locally (not committed)
- Use GitHub Actions secrets in CI/CD
- Rotate keys regularly

### Configuration Updates
```bash
# Update confidence threshold
export CONFIDENCE_THRESHOLD=0.65
docker compose restart backend

# Update risk limits
export MAX_DRAWDOWN_PCT=0.10
export TARGET_ANN_VOL=0.08
docker compose restart backend
```

## Troubleshooting

### Common Issues

#### 1. Model Service Unreachable (503 errors)
```bash
# Check if model service is running
docker ps | grep model-service

# Check model service logs
docker logs model-service

# Restart model service
docker compose restart model-service
```

#### 2. Low Confidence Errors (412 errors)
```bash
# Check current threshold
curl -s http://localhost:8000/health | jq '.config.confidenceThreshold'

# Lower threshold temporarily for testing
export CONFIDENCE_THRESHOLD=0.50
docker compose restart backend
```

#### 3. Risk Locked Errors (423 errors)
```bash
# Check current drawdown
curl -s http://localhost:8000/health | jq '.risk.drawdown'

# Reset risk state (emergency only)
curl -X POST http://localhost:8000/api/risk/reset
```

#### 4. Rate Limit Exceeded (429 errors)
```bash
# Check rate limit configuration
curl -s http://localhost:8000/health | jq '.config'

# Increase limits if needed
export RATE_LIMIT_MAX=200
docker compose restart backend
```

### Log Analysis
```bash
# View backend logs
docker logs backend -f

# View model service logs
docker logs model-service -f

# Search for errors
docker logs backend 2>&1 | grep ERROR

# Search for specific events
docker logs backend 2>&1 | grep "trade_execution"
```

### Performance Monitoring
```bash
# Check response times
time curl -s http://localhost:8000/health

# Monitor resource usage
docker stats

# Check disk space
docker system df
```

## Backup and Recovery

### Backup Configuration
```bash
# Export current configuration
docker compose config > docker-compose.backup.yml

# Export environment variables
env | grep -E "(TRADING_|MODEL_|BYBIT_)" > env.backup
```

### Recovery Procedures
```bash
# Restore from backup
cp docker-compose.backup.yml docker-compose.yml
source env.backup
docker compose up --build
```

## Monitoring and Alerting

### Health Checks
- Backend: `http://localhost:8000/health`
- Model Service: `http://localhost:9000/health`
- Frontend: `http://localhost:3000`

### Key Metrics to Monitor
- Response times (should be < 500ms)
- Error rates (should be < 1%)
- Model prediction confidence distribution
- Risk limit utilization
- API rate limit usage

### Alerting Thresholds
- Error rate > 5%
- Response time > 1 second
- Model service down > 2 minutes
- Drawdown > 80% of limit
- Rate limit > 80% utilization
