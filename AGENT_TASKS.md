# Agent Tasks (Exact Steps)

## On Every Run

### 1. Ensure containers are healthy:
```bash
# Check backend health
curl -s http://localhost:8000/health | jq '.ok'

# Check model service health
curl -s http://localhost:9000/health | jq '.ok'
```

### 2. Run consensus smoke test:
```bash
# Test AI consensus endpoint
curl -X POST http://localhost:8000/api/ai/consensus \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "BTCUSDT",
    "features": {
      "mom_20": 1.0,
      "rv_5": 0.2,
      "rsi_14": 65.0
    }
  }' | jq '.allow'
```

### 3. Run dry-run execute test:
```bash
# Test trade execution (should return dryRun: true)
curl -X POST http://localhost:8000/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "BTCUSDT",
    "side": "buy",
    "qtyUsd": 2000,
    "confidence": 0.9
  }' | jq '.dryRun'
```

## Before Enabling Live Trading

### 1. Verify environment configuration:
```bash
# Check trading mode is paper
curl -s http://localhost:8000/health | jq '.tradingMode'

# Verify confidence threshold is set appropriately
curl -s http://localhost:8000/health | jq '.config.confidenceThreshold'

# Check risk parameters
curl -s http://localhost:8000/health | jq '.config'
```

### 2. Confirm model version tracking:
```bash
# Check model version is changing on deployments
curl -s http://localhost:9000/health | jq '.model_version'

# Verify model is loaded
curl -s http://localhost:9000/health | jq '.model_loaded'
```

### 3. Test confidence distribution:
```bash
# Run multiple predictions to check confidence distribution
for i in {1..10}; do
  curl -s -X POST http://localhost:8000/api/ai/consensus \
    -H 'Content-Type: application/json' \
    -d '{"symbol": "BTCUSDT", "features": {"mom_20": '$((RANDOM % 200 - 100))'/100.0}}' \
    | jq '.confidence'
done
```

## While Live Trading (if enabled)

### Monitor for these conditions and halt trading if:

1. **Drawdown brake tripped (423 error)**:
```bash
# Check for risk_locked errors in logs
docker logs backend 2>&1 | grep "risk_locked"
```

2. **Model health degraded for >5 minutes**:
```bash
# Monitor model service health
watch -n 30 'curl -s http://localhost:9000/health | jq ".ok"'
```

3. **Error rate spikes > SLO (e.g., >5% errors)**:
```bash
# Monitor error rates
docker logs backend 2>&1 | grep "ERROR" | wc -l
```

### Model rotation procedure:

1. **Deploy new model service**:
```bash
# Update model version
export MODEL_VERSION=$(date +%Y%m%d_%H%M%S)
docker compose up --build model-service
```

2. **Canary test for X trades**:
```bash
# Run paper trading tests
for i in {1..10}; do
  curl -s -X POST http://localhost:8000/api/trade/execute \
    -H 'Content-Type: application/json' \
    -d '{"symbol": "BTCUSDT", "side": "buy", "qtyUsd": 100, "confidence": 0.8}'
done
```

3. **Promote if metrics improve**:
```bash
# Switch to live mode (only after validation)
export TRADING_MODE=live
docker compose restart backend
```

## After Incidents

### 1. Export logs for analysis:
```bash
# Export logs for the time window
docker logs backend --since "2024-01-01T10:00:00" --until "2024-01-01T11:00:00" > incident_logs.txt
docker logs model-service --since "2024-01-01T10:00:00" --until "2024-01-01T11:00:00" > model_logs.txt
```

### 2. Tag model version and environment snapshot:
```bash
# Get current state
curl -s http://localhost:8000/health > health_snapshot.json
curl -s http://localhost:9000/health > model_snapshot.json
```

### 3. File postmortem with action items:
- Document incident timeline
- Identify root cause
- List action items with owners
- Update runbook based on learnings

## Emergency Procedures

### Immediate halt:
```bash
# Stop all trading
export TRADING_MODE=paper
docker compose restart backend
```

### Model service down:
```bash
# Check model service status
curl -s http://localhost:9000/health || echo "Model service down"

# Restart model service
docker compose restart model-service
```

### Risk limits breached:
```bash
# Check current drawdown
curl -s http://localhost:8000/health | jq '.risk.drawdown'

# Reset risk state (emergency only)
curl -X POST http://localhost:8000/api/risk/reset
```
