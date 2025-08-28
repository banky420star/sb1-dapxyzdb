# Enhanced Trading System - Production Ready

A production-ready trading system that combines your RL model (Python FastAPI) with a risk-aware API backend (Node/TS Express) in one project, bootstrapped with Docker Compose.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

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

### 3. Run comprehensive tests:
```bash
# Run the test script
./test-system.sh
```

## 🏗️ Architecture

### Services

1. **Model Service** (Port 9000)
   - FastAPI-based Python service
   - Hosts your RL model for predictions
   - Provides `/predict` endpoint with confidence scores
   - Includes model versioning and health checks

2. **Backend API** (Port 8000)
   - TypeScript/Express backend
   - Risk management and position sizing
   - Trading execution (currently dry-run)
   - Comprehensive logging and monitoring

3. **Frontend** (Port 3000)
   - React/Vite application
   - Trading dashboard and controls
   - Real-time monitoring

4. **Monitoring** (Ports 9090, 3001)
   - Prometheus for metrics
   - Grafana for dashboards

### Key Features

- **Risk Management**: Drawdown limits, position caps, volatility targeting
- **Model Integration**: Seamless integration with your RL model
- **Paper Trading**: Safe testing environment before going live
- **Monitoring**: Comprehensive health checks and metrics
- **Type Safety**: Full TypeScript backend with Zod validation
- **Production Ready**: Security headers, rate limiting, structured logging

## 📊 API Endpoints

### Health Checks
```bash
# Backend health
GET http://localhost:8000/health

# Model service health
GET http://localhost:9000/health
```

### AI Consensus
```bash
POST http://localhost:8000/api/ai/consensus
{
  "symbol": "BTCUSDT",
  "features": {
    "mom_20": 1.0,
    "rv_5": 0.2,
    "rsi_14": 65.0
  }
}
```

### Trade Execution
```bash
POST http://localhost:8000/api/trade/execute
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "qtyUsd": 2000,
  "confidence": 0.9
}
```

### Model Service
```bash
# Get prediction
POST http://localhost:9000/predict
{
  "symbol": "BTCUSDT",
  "features": {...}
}

# Get model info
GET http://localhost:9000/model/info
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=8000
CORS_ORIGIN=*

# Trading Configuration
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
TARGET_ANN_VOL=0.12
MAX_DRAWDOWN_PCT=0.15
PER_SYMBOL_USD_CAP=10000

# Model Service
MODEL_SERVICE_URL=http://localhost:9000

# Bybit API (for future live trading)
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_API_SECRET=your_bybit_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_SEC=30
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

### Risk Parameters

- `CONFIDENCE_THRESHOLD`: Minimum confidence for trade execution (0.0-1.0)
- `TARGET_ANN_VOL`: Target annualized volatility for position sizing
- `MAX_DRAWDOWN_PCT`: Maximum allowed drawdown percentage
- `PER_SYMBOL_USD_CAP`: Maximum USD exposure per symbol

## 🔧 Development

### Local Development (without Docker)

#### Backend
```bash
cd railway-backend
npm install
npm run dev
```

#### Model Service
```bash
cd model-service
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

#### Frontend
```bash
npm install
npm run dev
```

### Adding Your RL Model

1. **Replace the fallback model** in `model-service/app.py`:
```python
def predict_with_model(features: Dict[str, float]) -> tuple:
    # Load your trained model
    model = load_your_model()
    
    # Preprocess features
    X = preprocess_features(features)
    
    # Make prediction
    prediction = model.predict(X)
    
    # Convert to probabilities and confidence
    return convert_to_signal_and_confidence(prediction)
```

2. **Update feature preprocessing** in `model-service/utils.py`:
```python
def preprocess_features(features: Dict[str, float]) -> np.ndarray:
    # Define your model's expected features
    expected_features = [
        'your_feature_1',
        'your_feature_2',
        # ... add all your features
    ]
    
    # Process features according to your model's requirements
    processed = []
    for feature in expected_features:
        processed.append(features.get(feature, 0.0))
    
    return np.array(processed).reshape(1, -1)
```

3. **Add model files** to `models/` directory:
```bash
# Copy your trained model
cp your_model.pkl models/latest_model.pkl
```

### Adding Bybit Integration

1. **Create Bybit service** in `railway-backend/src/services/bybitService.ts`
2. **Update trade execution** in `railway-backend/src/routes/trade.ts`
3. **Add API keys** to environment variables
4. **Test thoroughly** in paper mode before going live

## 📈 Monitoring & Observability

### Health Checks
- Backend: `http://localhost:8000/health`
- Model Service: `http://localhost:9000/health`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

### Logging
- Structured JSON logging with Pino
- Component-specific loggers
- Request/response logging
- Error tracking with stack traces

### Metrics
- Response times
- Error rates
- Model prediction confidence distribution
- Risk limit utilization
- API rate limit usage

## 🚨 Risk Management

### Built-in Protections

1. **Confidence Threshold**: Trades only execute above minimum confidence
2. **Position Caps**: Maximum USD exposure per symbol
3. **Drawdown Limits**: Automatic halt on drawdown breach
4. **Volatility Targeting**: Position sizing based on realized volatility
5. **Rate Limiting**: API protection against abuse
6. **Paper Trading**: Safe testing environment

### Emergency Procedures

```bash
# Immediate halt
export TRADING_MODE=paper
docker compose restart backend

# Reset risk state (emergency only)
curl -X POST http://localhost:8000/api/risk/reset
```

## 🧪 Testing

### Automated Tests
```bash
# Run comprehensive test suite
./test-system.sh

# Test specific components
curl -s http://localhost:8000/health
curl -s http://localhost:9000/health
```

### Manual Testing
```bash
# Test AI consensus
curl -X POST http://localhost:8000/api/ai/consensus \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","features":{"mom_20":1.0,"rv_5":0.2}}'

# Test trade execution
curl -X POST http://localhost:8000/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","qtyUsd":2000,"confidence":0.9}'
```

## 📚 Documentation

- **AGENT_TASKS.md**: Detailed operational procedures
- **RUNBOOK.md**: Step-by-step runbook for operators
- **API Documentation**: Available at `http://localhost:9000/docs` (model service)

## 🔄 Deployment

### Railway Deployment
```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Docker Deployment
```bash
# Build and push images
docker build -t your-registry/trading-backend ./railway-backend
docker build -t your-registry/trading-model ./model-service
docker push your-registry/trading-backend
docker push your-registry/trading-model
```

## 🛡️ Security

- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input validation with Zod
- No secrets in code
- Environment-based configuration

## 📞 Support

For issues and questions:
1. Check the logs: `docker logs backend && docker logs model-service`
2. Review the runbook: `RUNBOOK.md`
3. Run diagnostics: `./test-system.sh`
4. Check health endpoints for system status

## 🎯 Next Steps

1. **Integrate your RL model** into the model service
2. **Add Bybit execution** for live trading
3. **Set up monitoring dashboards** in Grafana
4. **Configure alerts** for critical events
5. **Test thoroughly** in paper mode
6. **Gradually scale up** to live trading

---

**⚠️ Important**: Always test in paper mode first. Only enable live trading after thorough validation and when you're confident in the system's performance.
