# Backend API Branch

## Overview
TypeScript Express backend with risk management and trading execution.

## Features
- Risk management and position sizing
- Confidence threshold enforcement
- Drawdown monitoring and caps
- Structured logging with Pino
- Type-safe API with Zod validation

## Structure
```
railway-backend/
├── src/
│   ├── config.ts           # Configuration management
│   ├── logger.ts           # Structured logging
│   ├── index.ts            # Main application
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   └── services/           # Business logic services
├── package.json            # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── Dockerfile             # Container configuration
```

## Quick Start
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## API Endpoints
- `GET /health` - Health check
- `POST /api/ai/consensus` - AI consensus
- `POST /api/trade/execute` - Trade execution
- `GET /api/trade/status` - Trading status

## Configuration
Set environment variables:
```bash
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
TARGET_ANN_VOL=0.12
MAX_DRAWDOWN_PCT=0.15
PER_SYMBOL_USD_CAP=10000
MODEL_SERVICE_URL=http://localhost:9000
```

## Risk Management
- Confidence threshold enforcement
- Position size caps
- Drawdown limits
- Volatility targeting
- Rate limiting
