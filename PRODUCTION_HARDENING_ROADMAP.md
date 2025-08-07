# 🔒 PRODUCTION HARDENING ROADMAP
## Critical Security & Compliance Fixes

*Priority: IMMEDIATE - Production Readiness Required*

---

## 🚨 **1. REGULATORY COMPLIANCE (WEEK 1)**

### **ML Model Governance & Audit Trail**
```bash
# Install MLflow for model versioning
pip install mlflow==3.0.0
```

**Implementation:**
- [ ] **Model Registry Setup**: MLflow tracking server
- [ ] **Version Control**: Every model, parameter, and deployment logged
- [ ] **Audit Trail**: Complete lineage from data → model → prediction
- [ ] **Compliance Logging**: SEC/FINRA compliant model documentation

**Files to Create:**
- `mlflow_tracking_server.py` - Centralized model tracking
- `model_governance.py` - Compliance and audit functions
- `docs/Model_Risk_Management_SOP.md` - Internal policy document

### **KYC/AML Compliance**
- [ ] **Bybit Account Verification**: Align with SEC/FATF guidance
- [ ] **Transaction Monitoring**: Real-time AML screening
- [ ] **Audit Logging**: Complete trade and account activity logs
- [ ] **Regulatory Reporting**: Automated compliance reporting

---

## 🔐 **2. SECURITY HARDENING (WEEK 1)**

### **Caddy Security Configuration**
```caddyfile
# /etc/caddy/Caddyfile
{
    # Rate limiting for TLS certificate requests
    on_demand_tls {
        rate_limit 10
        allowed_domains methtrader.xyz *.methtrader.xyz
    }
    
    # Security headers
    security {
        strict_transport_security max_age=31536000; include_subdomains
        content_security_policy "default-src 'self'; script-src 'self' 'unsafe-inline'"
        x_frame_options DENY
        x_content_type_options nosniff
        referrer_policy strict-origin-when-cross-origin
    }
}

# Admin endpoints on separate subdomain with mTLS
admin.methtrader.xyz {
    tls {
        client_auth {
            require_and_verify
        }
    }
    
    # Admin API endpoints
    handle /api/admin/* {
        reverse_proxy localhost:8000
    }
}

# Main application
methtrader.xyz {
    # Standard security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    # API endpoints
    handle /api/* {
        reverse_proxy localhost:8000
    }
    
    # Frontend
    handle /* {
        reverse_proxy localhost:3000
    }
}
```

### **Network Security**
- [ ] **VPN Access**: Admin endpoints behind VPN
- [ ] **mTLS**: Mutual TLS for admin interfaces
- [ ] **Rate Limiting**: API rate limiting per IP
- [ ] **WAF**: Web Application Firewall rules

---

## 🤖 **3. ML GOVERNANCE IMPLEMENTATION (WEEK 1-2)**

### **MLflow Integration**
```python
# server/ml/mlflow_tracking.py
import mlflow
import mlflow.sklearn
import mlflow.pytorch
import hashlib
import os

class MLGovernance:
    def __init__(self):
        mlflow.set_tracking_uri("http://localhost:5000")
        self.experiment_name = "crypto_trading_models"
    
    def log_training_run(self, model, params, metrics, data_hash, git_sha):
        with mlflow.start_run():
            # Log parameters
            mlflow.log_params(params)
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log model
            mlflow.sklearn.log_model(model, "model")
            
            # Log lineage information
            mlflow.log_param("data_hash", data_hash)
            mlflow.log_param("git_sha", git_sha)
            mlflow.log_param("model_version", self._get_model_version())
            
            # Log artifacts
            mlflow.log_artifact("training_data.csv")
            mlflow.log_artifact("validation_results.json")
    
    def register_model(self, model_name, model_uri, stage="Staging"):
        """Register model with promotion gates"""
        model_version = mlflow.register_model(
            model_uri=model_uri,
            name=model_name
        )
        
        # Add review requirement for production
        if stage == "Production":
            self._require_review(model_version)
        
        return model_version
    
    def detect_drift(self, live_features, training_features):
        """Detect feature drift and alert if >3σ"""
        drift_score = self._calculate_drift(live_features, training_features)
        
        if drift_score > 3.0:
            self._send_drift_alert(drift_score)
        
        return drift_score
```

### **Model Risk Management SOP**
- [ ] **Model Validation**: Pre-deployment validation checklist
- [ ] **Performance Monitoring**: Real-time model performance tracking
- [ ] **Drift Detection**: Automated feature drift alerts
- [ ] **Rollback Procedures**: Emergency model rollback protocols

---

## 📊 **4. OBSERVABILITY & LOGGING (WEEK 1)**

### **Grafana Loki Integration**
```bash
# Install Loki Docker driver
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions

# Start Loki stack
docker run -d --name loki-stack -p 3100:3100 grafana/loki:latest

# Update containers to use Loki
docker update --log-driver=loki --log-opt loki-url=http://localhost:3100 trading-api
docker update --log-driver=loki --log-opt loki-url=http://localhost:3100 trading-frontend
docker update --log-driver=loki --log-opt loki-url=http://localhost:3100 trading-postgres
```

### **Enhanced Logging**
```javascript
// server/utils/enhanced-logger.js
import winston from 'winston'
import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { 
    service: 'trading-system',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  },
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
})

// Add structured logging for compliance
export const logTrade = (trade) => {
  logger.info('Trade executed', {
    event: 'trade_executed',
    trade_id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    size: trade.size,
    price: trade.price,
    timestamp: trade.timestamp,
    user_id: trade.user_id,
    compliance_id: trade.compliance_id
  })
}

export const logModelPrediction = (prediction) => {
  logger.info('Model prediction', {
    event: 'model_prediction',
    model_id: prediction.model_id,
    model_version: prediction.model_version,
    symbol: prediction.symbol,
    prediction: prediction.value,
    confidence: prediction.confidence,
    features_hash: prediction.features_hash,
    timestamp: prediction.timestamp
  })
}
```

---

## ⚡ **5. BYBIT RATE LIMITING & LATENCY (WEEK 1)**

### **Rate Limiting Implementation**
```javascript
// server/data/bybit-rate-limiter.js
import { RateLimiter } from 'limiter'

class BybitRateLimiter {
  constructor() {
    // 60 requests per minute base limit
    this.restLimiter = new RateLimiter({
      tokensPerInterval: 60,
      interval: 'minute'
    })
    
    // WebSocket for market data (no rate limit)
    this.wsConnected = false
  }
  
  async makeRequest(endpoint, params) {
    // Check rate limit
    const remaining = await this.restLimiter.tryRemoveTokens(1)
    
    if (!remaining) {
      throw new Error('Rate limit exceeded')
    }
    
    // Make request with headers
    const response = await fetch(`https://api.bybit.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bapi-Timestamp': Date.now().toString(),
        'X-Bapi-Recv-Window': '5000'
      },
      body: JSON.stringify(params)
    })
    
    // Log rate limit headers
    const limitStatus = response.headers.get('X-Bapi-Limit-Status')
    const requestedLimit = response.headers.get('X-Bapi-Requested-Limit')
    
    if (limitStatus && parseInt(limitStatus) >= 80) {
      this._sendRateLimitAlert(limitStatus, requestedLimit)
    }
    
    return response
  }
  
  _sendRateLimitAlert(limitStatus, requestedLimit) {
    // Send alert to monitoring system
    console.warn(`Bybit rate limit warning: ${limitStatus}/${requestedLimit}`)
  }
}
```

### **WebSocket Optimization**
- [ ] **Market Data**: Use WebSocket for real-time data
- [ ] **Order Updates**: WebSocket for order status
- [ ] **Connection Management**: Automatic reconnection
- [ ] **Heartbeat Monitoring**: Connection health checks

---

## 🛡️ **6. RISK MANAGEMENT IMPLEMENTATION (WEEK 2)**

### **VaR Calculation**
```javascript
// server/risk/var-calculator.js
class VaRCalculator {
  constructor(portfolio, confidenceLevel = 0.99) {
    this.portfolio = portfolio
    this.confidenceLevel = confidenceLevel
  }
  
  calculateHistoricalVaR(returns, timeHorizon = 1) {
    // Sort returns in ascending order
    const sortedReturns = returns.sort((a, b) => a - b)
    
    // Find VaR percentile
    const varIndex = Math.floor((1 - this.confidenceLevel) * sortedReturns.length)
    const varValue = sortedReturns[varIndex]
    
    return Math.abs(varValue) * Math.sqrt(timeHorizon)
  }
  
  calculatePortfolioVaR() {
    // Calculate portfolio returns
    const portfolioReturns = this._calculatePortfolioReturns()
    
    // Calculate 99% 1-day VaR
    const var99 = this.calculateHistoricalVaR(portfolioReturns, 1)
    
    // Log VaR for monitoring
    this._logVaR(var99)
    
    return var99
  }
  
  stressTest() {
    // March 2020 stress scenario
    const march2020Returns = this._getMarch2020Returns()
    const march2020VaR = this.calculateHistoricalVaR(march2020Returns)
    
    // FTX collapse stress scenario
    const ftxReturns = this._getFTXReturns()
    const ftxVaR = this.calculateHistoricalVaR(ftxReturns)
    
    return {
      normal: this.calculatePortfolioVaR(),
      march2020: march2020VaR,
      ftx: ftxVaR
    }
  }
}
```

### **Dynamic Position Sizing**
```javascript
// server/risk/position-sizer.js
class PositionSizer {
  constructor(portfolio, riskParams) {
    this.portfolio = portfolio
    this.maxRiskPerTrade = riskParams.maxRiskPerTrade || 0.02
    this.maxPortfolioRisk = riskParams.maxPortfolioRisk || 0.10
  }
  
  calculateKellyPosition(signal, volatility) {
    // Kelly Criterion for position sizing
    const winRate = signal.confidence
    const avgWin = signal.expectedReturn
    const avgLoss = volatility
    
    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
    
    // Apply risk constraints
    return Math.min(kellyFraction, this.maxRiskPerTrade)
  }
  
  calculateCVaRPosition(signal, var99) {
    // Conditional VaR constrained position sizing
    const maxLoss = this.portfolio.value * this.maxPortfolioRisk
    const positionSize = maxLoss / var99
    
    return Math.min(positionSize, this.maxRiskPerTrade)
  }
}
```

### **Emergency Brake System**
```javascript
// server/risk/emergency-brake.js
class EmergencyBrake {
  constructor(portfolio, thresholds) {
    this.portfolio = portfolio
    this.drawdownThreshold = thresholds.drawdown || 0.10
    this.varThreshold = thresholds.var || 0.05
  }
  
  checkEmergencyConditions() {
    const drawdown = this._calculateDrawdown()
    const var99 = this._calculateVaR()
    
    if (drawdown > this.drawdownThreshold) {
      this._triggerEmergencyStop('drawdown_exceeded', drawdown)
      return true
    }
    
    if (var99 > this.varThreshold) {
      this._triggerEmergencyStop('var_exceeded', var99)
      return true
    }
    
    return false
  }
  
  async _triggerEmergencyStop(reason, value) {
    // Log emergency stop
    console.error(`EMERGENCY STOP: ${reason} = ${value}`)
    
    // Liquidate all positions to USDT
    await this._liquidateAllPositions()
    
    // Send alert to operations
    await this._sendEmergencyAlert(reason, value)
    
    // Stop all trading
    await this._stopAllTrading()
  }
}
```

---

## 🧪 **7. CI/CD & TESTING (WEEK 2)**

### **Unit Tests for Crypto Engine**
```javascript
// tests/unit/crypto-engine.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CryptoTradingEngine } from '../../server/trading/crypto-engine.js'

describe('CryptoTradingEngine', () => {
  let engine
  
  beforeEach(() => {
    engine = new CryptoTradingEngine({
      bybit: mockBybitIntegration,
      modelManager: mockModelManager,
      riskManager: mockRiskManager
    })
  })
  
  afterEach(() => {
    engine.cleanup()
  })
  
  it('should initialize successfully', async () => {
    await expect(engine.initialize()).resolves.toBe(true)
    expect(engine.isInitialized).toBe(true)
  })
  
  it('should validate risk before placing orders', async () => {
    const signal = {
      symbol: 'BTCUSDT',
      side: 'Buy',
      size: 0.1,
      confidence: 0.8
    }
    
    const result = await engine.executeSignal(signal)
    expect(result.riskValidated).toBe(true)
  })
  
  it('should handle emergency stop correctly', async () => {
    await engine.emergencyStop()
    expect(engine.emergencyStop).toBe(true)
    expect(engine.isRunning).toBe(false)
  })
})
```

### **GitHub Actions Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:crypto
      
      - name: Run security scan
        run: npm audit --audit-level=high
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t trading-system:${{ github.sha }} .
      
      - name: Push to Vultr registry
        run: |
          echo ${{ secrets.VULTR_REGISTRY_PASSWORD }} | docker login registry.vultr.com
          docker tag trading-system:${{ github.sha }} registry.vultr.com/trading-system:${{ github.sha }}
          docker push registry.vultr.com/trading-system:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vultr
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.VULTR_HOST }}
          username: ${{ secrets.VULTR_USERNAME }}
          key: ${{ secrets.VULTR_SSH_KEY }}
          script: |
            cd /opt/ats
            docker pull registry.vultr.com/trading-system:${{ github.sha }}
            docker compose down
            docker compose up -d
            docker system prune -f
```

### **Chaos Testing**
```bash
# scripts/chaos-test.sh
#!/bin/bash

echo "Starting chaos testing..."

# Test 1: Kill Redis
echo "Test 1: Killing Redis..."
docker kill trading-redis
sleep 30
docker start trading-redis
echo "Redis recovery test completed"

# Test 2: Kill Postgres primary
echo "Test 2: Killing Postgres..."
docker kill trading-postgres
sleep 30
docker start trading-postgres
echo "Postgres recovery test completed"

# Test 3: Network partition
echo "Test 3: Network partition..."
docker network disconnect trading-network trading-api
sleep 10
docker network connect trading-network trading-api
echo "Network partition test completed"

echo "Chaos testing completed"
```

---

## 🧹 **8. DATA HYGIENE (WEEK 1)**

### **Alpha Vantage Caching**
```javascript
// server/data/cache-manager.js
import Redis from 'ioredis'

class CacheManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL)
    this.ttl = 300 // 5 minutes
  }
  
  async getCachedData(key) {
    const cached = await this.redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  }
  
  async setCachedData(key, data) {
    await this.redis.setex(key, this.ttl, JSON.stringify(data))
  }
  
  async getAlphaVantageData(symbol, interval) {
    const cacheKey = `alpha_vantage:${symbol}:${interval}`
    
    // Try cache first
    const cached = await this.getCachedData(cacheKey)
    if (cached) {
      return cached
    }
    
    // Fetch from API
    const data = await this._fetchFromAlphaVantage(symbol, interval)
    
    // Cache the result
    await this.setCachedData(cacheKey, data)
    
    return data
  }
}
```

### **Data Validation**
```javascript
// server/data/validator.js
class DataValidator {
  validateOHLCV(data) {
    const required = ['open', 'high', 'low', 'close', 'volume', 'timestamp']
    
    for (const field of required) {
      if (!data.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`)
      }
      
      if (data[field] === null || data[field] === undefined || isNaN(data[field])) {
        throw new Error(`Invalid value for field: ${field}`)
      }
    }
    
    // Validate OHLC relationships
    if (data.high < Math.max(data.open, data.close)) {
      throw new Error('High price is lower than open or close')
    }
    
    if (data.low > Math.min(data.open, data.close)) {
      throw new Error('Low price is higher than open or close')
    }
    
    return true
  }
  
  validateBybitData(data) {
    // Validate Bybit-specific data format
    if (!data.retCode || data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }
    
    return true
  }
}
```

---

## 🌐 **9. PUBLIC STATUS & MONITORING (WEEK 1)**

### **Health Check Endpoint**
```javascript
// server/health-check.js
import { execSync } from 'child_process'

export const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'green',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      git_sha: process.env.GIT_SHA || 'unknown',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        bybit: await checkBybitConnection(),
        mlflow: await checkMLflow()
      }
    }
    
    res.json(health)
  } catch (error) {
    res.status(503).json({
      status: 'red',
      error: error.message
    })
  }
}

export const metrics = async (req, res) => {
  // Prometheus metrics endpoint
  const metrics = await generatePrometheusMetrics()
  res.set('Content-Type', 'text/plain')
  res.send(metrics)
}
```

### **VPN Access for Admin**
```bash
# Setup WireGuard VPN for admin access
sudo apt install wireguard
wg genkey | sudo tee /etc/wireguard/private.key
sudo cat /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key

# Configure WireGuard
sudo nano /etc/wireguard/wg0.conf
```

---

## 📋 **10. RUNBOOKS & OPERATIONS (WEEK 2)**

### **Pager Playbook**
```markdown
# Pager Playbook

## Alert: Disk 90% Full
**Severity**: High
**Primary**: @ops-team
**Escalation**: @dev-team (30 min)

**Immediate Actions**:
1. Check disk usage: `df -h`
2. Clean up logs: `find /var/log -name "*.log" -mtime +7 -delete`
3. Clean Docker: `docker system prune -f`
4. If still >90%, escalate

**Resolution**:
- Increase disk size in Vultr
- Implement log rotation
- Set up monitoring alerts

## Alert: Portfolio Drawdown >10%
**Severity**: Critical
**Primary**: @trading-team
**Escalation**: @management (5 min)

**Immediate Actions**:
1. Check emergency brake status
2. Verify all positions are liquidated
3. Stop all trading engines
4. Review recent trades for anomalies

**Resolution**:
- Investigate root cause
- Review risk parameters
- Resume trading only after approval
```

### **On-Call Schedule**
- **Primary**: Trading Team (24/7)
- **Secondary**: DevOps Team (Business Hours)
- **Escalation**: Management (Critical Issues)

---

## 📅 **IMPLEMENTATION TIMELINE**

### **Week 1 (Critical)**
- [ ] Regulatory compliance setup
- [ ] Security hardening
- [ ] Basic observability
- [ ] Rate limiting
- [ ] Data hygiene

### **Week 2 (Important)**
- [ ] Risk management implementation
- [ ] CI/CD pipeline
- [ ] Testing coverage
- [ ] Runbooks and operations

### **Week 3 (Enhancement)**
- [ ] Advanced monitoring
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Training and handover

---

## 🎯 **SUCCESS METRICS**

### **Security**
- [ ] Zero security vulnerabilities
- [ ] 100% HTTPS traffic
- [ ] All admin access via VPN
- [ ] Rate limiting active

### **Compliance**
- [ ] Complete audit trail
- [ ] Model versioning active
- [ ] KYC/AML procedures documented
- [ ] Regulatory reporting automated

### **Reliability**
- [ ] 99.9% uptime
- [ ] <100ms API response time
- [ ] Zero data loss
- [ ] Automated recovery

### **Risk Management**
- [ ] Real-time VaR monitoring
- [ ] Emergency brake tested
- [ ] Position sizing automated
- [ ] Stress testing completed

---

*This roadmap addresses all critical production issues identified in the punch-list. Implementation should begin immediately to ensure production readiness.* 