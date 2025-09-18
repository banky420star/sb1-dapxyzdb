#!/bin/bash

# Create New Repository Structure with Branches
# This script creates a new repository with branches for each section

set -e

echo "🚀 Creating New Repository Structure with Branches..."
echo "====================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
    esac
}

# Create new directory for the new repository
NEW_REPO_DIR="../trading-system-v2"
print_status "INFO" "Creating new repository directory: $NEW_REPO_DIR"

# Create the directory
mkdir -p "$NEW_REPO_DIR"
cd "$NEW_REPO_DIR"

# Initialize git repository
print_status "INFO" "Initializing git repository..."
git init

# Create main branch structure
print_status "INFO" "Setting up main branch with core files..."

# Copy core files from current project
cp -r ../sb1-dapxyzdb/docker-compose.yml .
cp -r ../sb1-dapxyzdb/model-service .
cp -r ../sb1-dapxyzdb/railway-backend .
cp -r ../sb1-dapxyzdb/test-system.sh .
cp -r ../sb1-dapxyzdb/README_ENHANCED.md .
cp -r ../sb1-dapxyzdb/AGENT_TASKS.md .
cp -r ../sb1-dapxyzdb/RUNBOOK.md .
cp -r ../sb1-dapxyzdb/models .
cp -r ../sb1-dapxyzdb/data .
cp -r ../sb1-dapxyzdb/logs .

# Create main README
cat > README.md << 'EOF'
# Trading System V2 - Production Ready

## 🏗️ Repository Structure

This repository contains a production-ready trading system with separate branches for each component:

### Branches:
- `main` - Core system and documentation
- `model-service` - Python FastAPI model service
- `backend-api` - TypeScript Express backend
- `frontend` - React/Vite frontend
- `monitoring` - Prometheus/Grafana monitoring
- `deployment` - Docker and deployment configs
- `documentation` - Comprehensive docs and runbooks

### Quick Start:
```bash
# Clone and setup
git clone <your-repo-url>
cd trading-system-v2

# Start the system
docker compose up --build

# Test the system
./test-system.sh
```

See individual branch READMEs for detailed information about each component.
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Build outputs
dist/
build/
*.egg-info/

# Environment files
.env
.env.local
.env.production

# Logs
logs/
*.log

# Data
data/
models/*.pkl
models/*.joblib

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
.dockerignore

# Temporary files
*.tmp
*.temp
EOF

# Initial commit on main
git add .
git commit -m "feat: initial commit - core trading system structure"

print_status "SUCCESS" "Main branch created with core files"

# Create model-service branch
print_status "INFO" "Creating model-service branch..."
git checkout -b model-service

# Create model-service specific README
cat > MODEL_SERVICE_README.md << 'EOF'
# Model Service Branch

## Overview
Python FastAPI service that hosts the RL trading model.

## Features
- FastAPI-based prediction endpoint
- Model versioning and health checks
- Feature preprocessing and calibration
- Fallback model for testing

## Structure
```
model-service/
├── app.py              # Main FastAPI application
├── utils.py            # Utility functions
├── requirements.txt    # Python dependencies
├── Dockerfile         # Container configuration
└── models/            # Model files directory
```

## Quick Start
```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m uvicorn app:app --host 0.0.0.0 --port 9000 --reload

# Or with Docker
docker build -t model-service .
docker run -p 9000:9000 model-service
```

## API Endpoints
- `GET /health` - Health check
- `POST /predict` - Model prediction
- `GET /model/info` - Model information
- `POST /model/reload` - Reload model

## Integration
Replace the fallback model in `app.py` with your RL model:
```python
def predict_with_model(features: Dict[str, float]) -> tuple:
    # Load your trained model
    model = load_your_model()
    
    # Make prediction
    prediction = model.predict(preprocess_features(features))
    
    return convert_to_signal_and_confidence(prediction)
```
EOF

git add MODEL_SERVICE_README.md
git commit -m "feat: add model service documentation and structure"

# Create backend-api branch
print_status "INFO" "Creating backend-api branch..."
git checkout main
git checkout -b backend-api

# Create backend specific README
cat > BACKEND_API_README.md << 'EOF'
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
EOF

git add BACKEND_API_README.md
git commit -m "feat: add backend API documentation and structure"

# Create frontend branch
print_status "INFO" "Creating frontend branch..."
git checkout main
git checkout -b frontend

# Copy frontend files from original project
cp -r ../sb1-dapxyzdb/src .
cp -r ../sb1-dapxyzdb/public .
cp -r ../sb1-dapxyzdb/package.json .
cp -r ../sb1-dapxyzdb/vite.config.js .
cp -r ../sb1-dapxyzdb/tailwind.config.js .
cp -r ../sb1-dapxyzdb/index.html .

# Create frontend specific README
cat > FRONTEND_README.md << 'EOF'
# Frontend Branch

## Overview
React/Vite frontend for the trading system dashboard.

## Features
- Real-time trading dashboard
- Model prediction visualization
- Risk management controls
- Performance monitoring

## Structure
```
src/
├── components/         # React components
├── pages/             # Page components
├── services/          # API services
├── utils/             # Utility functions
└── styles/            # CSS/styling
public/                # Static assets
package.json           # Dependencies
vite.config.js         # Vite configuration
```

## Quick Start
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## Environment Variables
```bash
VITE_API_URL=http://localhost:8000
VITE_MODEL_SERVICE_URL=http://localhost:9000
```

## Features
- Trading dashboard
- Model predictions display
- Risk metrics visualization
- Configuration management
- Real-time updates
EOF

git add .
git commit -m "feat: add frontend structure and documentation"

# Create monitoring branch
print_status "INFO" "Creating monitoring branch..."
git checkout main
git checkout -b monitoring

# Create monitoring directory and files
mkdir -p monitoring
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'model-service'
    static_configs:
      - targets: ['model-service:9000']
    metrics_path: '/metrics'
EOF

cat > monitoring/grafana-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "Trading System Dashboard",
    "panels": [
      {
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"backend\"}"
          }
        ]
      },
      {
        "title": "Model Predictions",
        "type": "graph",
        "targets": [
          {
            "expr": "model_predictions_total"
          }
        ]
      }
    ]
  }
}
EOF

# Create monitoring README
cat > MONITORING_README.md << 'EOF'
# Monitoring Branch

## Overview
Prometheus and Grafana monitoring setup for the trading system.

## Components
- Prometheus for metrics collection
- Grafana for dashboards
- Custom metrics for trading system

## Structure
```
monitoring/
├── prometheus.yml           # Prometheus configuration
├── grafana-dashboard.json   # Grafana dashboard
└── alerts/                  # Alert rules
```

## Quick Start
```bash
# Start monitoring stack
docker compose up monitoring grafana

# Access Grafana
# URL: http://localhost:3001
# Username: admin
# Password: admin
```

## Metrics
- System health checks
- API response times
- Model prediction accuracy
- Risk metrics
- Trading performance

## Dashboards
- System overview
- Trading performance
- Risk management
- Model analytics
EOF

git add .
git commit -m "feat: add monitoring configuration and documentation"

# Create deployment branch
print_status "INFO" "Creating deployment branch..."
git checkout main
git checkout -b deployment

# Copy deployment files
cp -r ../sb1-dapxyzdb/docker-compose.yml .
cp -r ../sb1-dapxyzdb/railway-backend/Dockerfile ./railway-backend/
cp -r ../sb1-dapxyzdb/model-service/Dockerfile ./model-service/

# Create deployment README
cat > DEPLOYMENT_README.md << 'EOF'
# Deployment Branch

## Overview
Docker and deployment configurations for the trading system.

## Components
- Docker Compose setup
- Individual service Dockerfiles
- Railway deployment configs
- Environment management

## Quick Start
```bash
# Start all services
docker compose up --build

# Start specific services
docker compose up backend model-service

# Deploy to Railway
railway login
railway link
railway up
```

## Services
- model-service: Python FastAPI (port 9000)
- backend: TypeScript Express (port 8000)
- frontend: React/Vite (port 3000)
- monitoring: Prometheus (port 9090)
- grafana: Grafana (port 3001)

## Environment Variables
Create `.env` file:
```bash
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
MODEL_SERVICE_URL=http://localhost:9000
```

## Production Deployment
1. Set up environment variables
2. Configure monitoring
3. Set up SSL certificates
4. Configure backups
5. Set up alerts
EOF

git add .
git commit -m "feat: add deployment configuration and documentation"

# Create documentation branch
print_status "INFO" "Creating documentation branch..."
git checkout main
git checkout -b documentation

# Copy documentation files
cp -r ../sb1-dapxyzdb/README_ENHANCED.md .
cp -r ../sb1-dapxyzdb/AGENT_TASKS.md .
cp -r ../sb1-dapxyzdb/RUNBOOK.md .
cp -r ../sb1-dapxyzdb/test-system.sh .

# Create documentation README
cat > DOCUMENTATION_README.md << 'EOF'
# Documentation Branch

## Overview
Comprehensive documentation for the trading system.

## Documents
- README_ENHANCED.md: System overview and quick start
- AGENT_TASKS.md: Operational procedures
- RUNBOOK.md: Step-by-step runbook
- test-system.sh: Automated testing script

## Quick Reference

### System Health
```bash
curl -s http://localhost:8000/health
curl -s http://localhost:9000/health
```

### Test System
```bash
./test-system.sh
```

### API Testing
```bash
# AI Consensus
curl -X POST http://localhost:8000/api/ai/consensus \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","features":{"mom_20":1.0}}'

# Trade Execution
curl -X POST http://localhost:8000/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","qtyUsd":2000,"confidence":0.9}'
```

## Emergency Procedures
1. Switch to paper mode: `export TRADING_MODE=paper`
2. Restart services: `docker compose restart`
3. Check logs: `docker logs backend && docker logs model-service`
4. Reset risk state: `curl -X POST http://localhost:8000/api/risk/reset`
EOF

git add .
git commit -m "feat: add comprehensive documentation"

# Return to main branch
git checkout main

print_status "SUCCESS" "Repository structure created successfully!"

echo ""
echo "🎉 New Repository Structure Complete!"
echo "====================================="
echo ""
echo "📁 Repository: $NEW_REPO_DIR"
echo ""
echo "🌿 Branches Created:"
echo "  - main: Core system and documentation"
echo "  - model-service: Python FastAPI model service"
echo "  - backend-api: TypeScript Express backend"
echo "  - frontend: React/Vite frontend"
echo "  - monitoring: Prometheus/Grafana monitoring"
echo "  - deployment: Docker and deployment configs"
echo "  - documentation: Comprehensive docs and runbooks"
echo ""
echo "📋 Next Steps:"
echo "1. Create new GitHub repository"
echo "2. Push all branches to GitHub:"
echo "   cd $NEW_REPO_DIR"
echo "   git remote add origin <your-new-repo-url>"
echo "   git push -u origin main"
echo "   git push -u origin model-service"
echo "   git push -u origin backend-api"
echo "   git push -u origin frontend"
echo "   git push -u origin monitoring"
echo "   git push -u origin deployment"
echo "   git push -u origin documentation"
echo ""
echo "3. Each branch contains specific documentation and structure"
echo "4. Use main branch for overall system overview"
echo "5. Switch to specific branches for detailed component work"
