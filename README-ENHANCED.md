# 🤖 AI Trading System - Production-Grade Architecture

A comprehensive, production-ready algorithmic trading system built with modern infrastructure, machine learning operations (MLOps), and enterprise-grade reliability features.

## 🚀 Architecture Overview

This system implements a hardened, scalable trading platform with:

- **PostgreSQL + TimescaleDB** for high-performance time-series data
- **Redis-based rate limiting** for API quota management
- **Real-time WebSocket separation** (market data vs UI)
- **PM2 clustering** with graceful shutdown
- **Comprehensive logging** with Loki + Grafana
- **MLflow integration** for model lifecycle management
- **Prefect orchestration** for data pipeline automation
- **Docker Compose** production stack
- **CI/CD pipeline** with automated testing and deployment

## 📊 System Components

### Core Infrastructure
- **Database**: PostgreSQL 15 + TimescaleDB for time-series optimization
- **Cache**: Redis for session management and rate limiting
- **Message Queue**: Redis Bull for background job processing
- **Load Balancer**: Nginx with SSL termination
- **Process Manager**: PM2 with 4 clustered workers

### Monitoring & Observability
- **Metrics**: Prometheus + Grafana dashboards
- **Logging**: Winston + Loki for centralized log aggregation
- **Alerting**: Slack integration for critical events
- **Health Checks**: Comprehensive system monitoring

### ML Operations (MLOps)
- **Model Tracking**: MLflow for experiment management
- **Data Pipeline**: Prefect for workflow orchestration
- **Feature Store**: TimescaleDB hypertables for ML features
- **Model Serving**: Real-time inference with caching

### Trading Features
- **Multiple Models**: Random Forest, LSTM, DDQN ensemble
- **Risk Management**: Real-time position sizing and drawdown protection
- **Paper Trading**: Safe simulation environment
- **MT5 Integration**: MetaTrader 5 connectivity via ZeroMQ
- **Real-time Data**: Multiple data source integration

## 🛠️ Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Git

### 1. Clone and Setup

```bash
git clone https://github.com/your-username/ai-trading-system.git
cd ai-trading-system

# Copy environment configuration
cp .env.example .env

# Edit .env with your API keys and settings
nano .env
```

### 2. Infrastructure Deployment

```bash
# Start all services (PostgreSQL, Redis, Grafana, etc.)
docker compose up --build -d

# Wait for services to initialize (90 seconds)
sleep 90

# Verify all containers are healthy
docker compose ps
```

### 3. Database Migration

```bash
# Run PostgreSQL migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Application Startup

```bash
# Install dependencies
npm install

# Start with PM2 clustering (production)
npm start

# OR start in development mode
npm run start:dev

# OR start simple mode (single process)
npm run start:simple
```

### 5. Verification

- **Backend API**: http://localhost:8000/api/health
- **Frontend**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **MLflow**: http://localhost:5000
- **Prefect**: http://localhost:4200

## 📡 API Endpoints

### Health & Status
```
GET /api/health          - System health check
GET /api/status          - System status and uptime
GET /api/metrics         - Prometheus metrics
```

### Trading Data
```
GET /api/positions       - Current positions
GET /api/trades          - Trading history
GET /api/balance         - Account balance
GET /api/models          - Model status and performance
```

### Real-time WebSocket
```
WS /ws/market           - High-frequency market data
WS /ui                  - Dashboard updates (Socket.IO)
```

### ML Operations
```
POST /api/models/train   - Trigger model training
GET /api/models/metrics  - Model performance metrics
GET /api/features        - Feature engineering status
```

## 🏗️ Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Rate Gateway  │    │    Frontend     │
│     (Nginx)     │◄───┤     (Redis)     │◄───┤    (React)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Trading Backend (PM2 Cluster)              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Worker 1  │ │   Worker 2  │ │   Worker 3  │ │   Worker 4  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │     MLflow      │
│  + TimescaleDB  │    │   (Cache +      │    │   (Models)      │
│  (Time Series)  │    │ Rate Limiting)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │      Loki       │    │    Prefect      │
│   (Metrics)     │    │    (Logs)       │    │  (Workflows)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
                      ┌─────────────────┐
                      │     Grafana     │
                      │   (Dashboard)   │
                      └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgres://trading_app:secure_pass@db:5432/trading

# Redis
REDIS_URL=redis://redis:6379

# API Keys
ALPHA_VANTAGE_API_KEY=your_key_here
BYBIT_API_KEY=your_key_here
BYBIT_API_SECRET=your_secret_here

# Trading Settings
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MAX_POSITION_SIZE=0.01
MAX_DAILY_LOSS=0.005

# ML Operations
MLFLOW_TRACKING_URI=http://mlflow:5000
PREFECT_API_URL=http://prefect-server:4200/api

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
WINSTON_LEVEL=info
```

### Configuration Files

- `config/default.yaml` - Base configuration
- `config/production.yaml` - Production overrides
- `config/development.yaml` - Development settings
- `ecosystem.config.cjs` - PM2 cluster configuration
- `docker-compose.yml` - Infrastructure stack

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Performance Tests
```bash
npm run test:performance
```

### Coverage Report
```bash
npm run test:coverage
```

## 📈 Monitoring & Alerting

### Grafana Dashboards

1. **System Overview**
   - CPU, Memory, Disk usage
   - Database connections
   - API response times

2. **Trading Performance**
   - P&L tracking
   - Win/loss ratios
   - Drawdown monitoring
   - Position sizing

3. **ML Model Performance**
   - Accuracy trends
   - Training progress
   - Feature importance
   - Prediction latency

4. **Infrastructure Health**
   - Container status
   - Network latency
   - Error rates
   - Rate limiting status

### Alerting Rules

- **High Priority**: System failures, trading halts, security events
- **Medium Priority**: Performance degradation, model accuracy drops
- **Low Priority**: Rate limit warnings, disk space alerts

## 🔒 Security Features

### Infrastructure Security
- Container isolation with least privilege
- Network segmentation
- Secrets management via environment variables
- Regular security scanning (Trivy)

### Application Security
- Rate limiting per API endpoint
- Input validation and sanitization
- Secure headers (Helmet.js)
- SQL injection prevention
- XSS protection

### Operational Security
- Audit logging for all trading actions
- Role-based access control
- Encrypted data transmission (TLS)
- Database connection encryption

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Docker Stack
```bash
docker compose up --build
```

### Production Deployment
```bash
# Build and push images
npm run docker:build
docker push ghcr.io/username/ai-trading-system:latest

# Deploy with Docker Swarm or Kubernetes
kubectl apply -f k8s/
```

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests and security scans
2. Builds Docker images
3. Deploys to staging environment
4. Runs integration tests
5. Deploys to production (on main branch)

## 📊 Performance Benchmarks

### System Performance
- **API Response Time**: < 200ms (95th percentile)
- **Database Queries**: < 50ms average
- **WebSocket Latency**: < 10ms
- **Memory Usage**: < 2GB per worker
- **CPU Usage**: < 70% under normal load

### Trading Performance
- **Order Execution**: < 100ms
- **Risk Calculations**: < 50ms
- **Model Inference**: < 10ms
- **Data Processing**: 10,000+ ticks/second

## 🛠️ Development

### Project Structure
```
├── server/                 # Backend application
│   ├── database/          # PostgreSQL manager
│   ├── trading/           # Trading engine
│   ├── ml/                # ML models and training
│   ├── risk/              # Risk management
│   ├── data/              # Data management
│   ├── monitoring/        # Metrics and health
│   └── utils/             # Utilities and helpers
├── src/                   # Frontend React application
│   ├── components/        # React components
│   ├── pages/            # Application pages
│   └── contexts/         # React contexts
├── flows/                 # Prefect workflows
├── migrations/           # Database migrations
├── config/               # Configuration files
├── monitoring/           # Grafana/Prometheus config
├── tests/                # Test suites
└── docs/                 # Documentation
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- ESLint + Prettier for code formatting
- TypeScript for type safety
- Jest for testing
- Conventional commits for git history
- 80%+ test coverage requirement

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [ML Model Guide](./docs/ml-models.md)
- [Deployment Guide](./docs/deployment.md)
- [Monitoring Setup](./docs/monitoring.md)
- [Security Guidelines](./docs/security.md)
- [Performance Tuning](./docs/performance.md)

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL status
   docker compose logs db
   
   # Verify connection
   psql postgres://trading_app:password@localhost:5432/trading
   ```

2. **Rate Limiting Issues**
   ```bash
   # Check rate gate service
   curl http://localhost:3002/health
   
   # View rate limit stats
   curl http://localhost:3002/stats
   ```

3. **Model Training Failures**
   ```bash
   # Check MLflow logs
   docker compose logs mlflow
   
   # Verify data availability
   npm run db:stats
   ```

### Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Security**: security@ai-trading-system.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TimescaleDB for time-series optimization
- MLflow for ML lifecycle management
- Prefect for workflow orchestration
- Grafana for visualization
- OpenAI for AI guidance

---

**⚠️ Risk Disclaimer**: This software is for educational and research purposes. Trading carries significant financial risk. Always test thoroughly and never risk more than you can afford to lose. 