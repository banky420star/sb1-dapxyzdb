#!/bin/bash

# Complete Branch Setup Script
# This script creates the remaining branches for the trading system

set -e

echo "🚀 Completing Branch Setup..."
echo "============================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    esac
}

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

# Create frontend README
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

print_status "SUCCESS" "All branches created successfully!"

echo ""
echo "🎉 Repository Structure Complete!"
echo "================================="
echo ""
echo "📁 Repository: $(pwd)"
echo ""
echo "🌿 All Branches:"
git branch -a
echo ""
echo "📋 Next Steps:"
echo "1. Create new GitHub repository"
echo "2. Push all branches to GitHub:"
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
