# AlgoTrader Pro - AI-Powered Autonomous Trading System

A comprehensive algorithmic trading platform with machine learning models, real-time market data, intelligent notifications, and full autonomous trading capabilities.

## 🚀 Complete System Overview

### Core Components
- **Multi-Model ML Ensemble**: Random Forest, LSTM, and DDQN models with ensemble predictions
- **Real-time Market Data**: Live price feeds from Alpha Vantage and Bybit with technical indicators
- **Risk Management**: Advanced position sizing, stop-loss, drawdown protection, and correlation analysis
- **Autonomous Trading**: Fully automated trading with intelligent decision making
- **AI Notification Agent**: Real-time system monitoring and intelligent alerts
- **MT5 Integration**: ZeroMQ-based integration with MetaTrader 5 for live trading
- **Autonomous Orchestrator**: Intelligent system coordination and health monitoring

### Infrastructure Services
- **PostgreSQL (Port 5432)**: TimescaleDB-enabled database with hypertables for time-series data - `trading/securepassword123`
- **Rate-Gate (Port 3001)**: Redis-based API quota management with 80% warnings and token bucket limiting
- **MLflow (Port 5000)**: Model tracking server for experiment management and artifact storage - No auth required
- **Loki (Port 3100)**: Centralized log aggregation with 14-day retention and JSON structured logs
- **Grafana (Port 3000)**: Monitoring dashboards for metrics and logs - `admin/admin`
- **Prometheus (Port 9090)**: Metrics collection and time-series database for system monitoring

### Frontend Dashboard
- **Real-time Updates**: Live trading data, system metrics, and performance tracking
- **Interactive Charts**: TradingView integration with technical analysis
- **AI Notifications**: Intelligent alert system with filtering and management
- **Responsive Design**: Mobile-friendly interface with dark mode support
- **MQL5 Widgets**: Real-time MT5 data integration

## 🔄 Complete Detailed Workflow

### 1. System Initialization Process

#### 1.1 Server Startup Sequence
```bash
# Start the complete system
npm run dev

# This triggers the following sequence:
# 1. Backend API server initialization
# 2. Frontend development server startup
# 3. Database initialization
# 4. ML model loading
# 5. Risk manager setup
# 6. AI notification agent startup
# 7. Autonomous orchestrator initialization
# 8. MT5 integration attempt
```

#### 1.2 Backend Initialization Details
```javascript
// Server startup sequence in server/index.js
1. Logger initialization
2. Database Manager initialization
   - SQLite database connection
   - Table creation (prices, trades, models, notifications, positions, orders)
   - Index creation for performance
3. Data Manager initialization
   - Alpha Vantage API connection
   - Bybit API connection
   - Real-time data fetching setup
4. Model Manager initialization
   - Random Forest model loading
   - LSTM model loading
   - DDQN model loading
   - Model state restoration
5. Risk Manager initialization
   - Historical data loading
   - Risk parameters setup
   - Position sizing algorithms
6. Trading Engine initialization
   - ZeroMQ connections setup
   - Position and order loading
   - Trading mode configuration
7. AI Notification Agent initialization
   - Database connection
   - Monitoring intervals setup
   - Alert thresholds configuration
8. Autonomous Orchestrator initialization
   - System components registration
   - Health monitoring setup
   - Autonomous trading configuration
9. MT5 Integration attempt
   - ZeroMQ socket connection test
   - Connection timeout handling
10. Server startup on available port
```

#### 1.3 Frontend Initialization Details
```javascript
// Frontend startup sequence in src/main.tsx
1. React application mounting
2. TradingContext initialization
   - WebSocket connection setup
   - Real-time data subscription
   - State management setup
3. Component tree rendering
   - Layout component
   - Navigation setup
   - Dashboard components
4. Real-time data fetching
   - API health check
   - Initial data loading
   - WebSocket event listeners
```

### 2. Data Collection Pipeline - Complete Workflow

#### 2.1 Real-time Data Fetching Process
```javascript
// Data fetching workflow in server/data/manager.js
1. Scheduled Data Fetch (every 30 seconds)
   ├── Alpha Vantage Data Fetch
   │   ├── API call to Alpha Vantage
   │   ├── Response validation
   │   ├── Data parsing and normalization
   │   ├── Technical indicators calculation
   │   └── Database storage
   │
   ├── Bybit Data Fetch (if configured)
   │   ├── WebSocket connection
   │   ├── Real-time price streaming
   │   ├── Data aggregation
   │   ├── Technical indicators calculation
   │   └── Database storage
   │
   └── Data Quality Checks
       ├── Missing data detection
       ├── Outlier detection
       ├── Data validation
       └── Error handling and retry logic
```

#### 2.2 Technical Indicators Calculation
```javascript
// Technical indicators workflow
1. Price Data Processing
   ├── OHLCV data validation
   ├── Missing data interpolation
   └── Data normalization

2. Indicator Calculation (50+ indicators)
   ├── Trend Indicators
   │   ├── Simple Moving Average (SMA)
   │   ├── Exponential Moving Average (EMA)
   │   ├── MACD (Moving Average Convergence Divergence)
   │   └── Parabolic SAR
   │
   ├── Momentum Indicators
   │   ├── RSI (Relative Strength Index)
   │   ├── Stochastic Oscillator
   │   ├── Williams %R
   │   └── CCI (Commodity Channel Index)
   │
   ├── Volatility Indicators
   │   ├── Bollinger Bands
   │   ├── Average True Range (ATR)
   │   ├── Standard Deviation
   │   └── Historical Volatility
   │
   ├── Volume Indicators
   │   ├── Volume SMA
   │   ├── On-Balance Volume (OBV)
   │   ├── Volume Rate of Change
   │   └── Money Flow Index
   │
   └── Custom Indicators
       ├── Price Action Patterns
       ├── Support/Resistance Levels
       ├── Fibonacci Retracements
       └── Market Structure Analysis
```

#### 2.3 Database Storage Process
```javascript
// Database storage workflow in server/database/manager.js
1. Data Validation
   ├── Schema validation
   ├── Data type checking
   └── Constraint validation

2. Transaction Processing
   ├── Begin transaction
   ├── Insert/update data
   ├── Index maintenance
   └── Commit transaction

3. Performance Optimization
   ├── Batch processing
   ├── Connection pooling
   ├── Query optimization
   └── Cache management
```

### 3. Machine Learning Pipeline - Complete Workflow

#### 3.1 Data Preparation Process
```javascript
// Data preparation workflow in server/ml/manager.js
1. Historical Data Loading
   ├── Database query for historical data
   ├── Data filtering and cleaning
   ├── Feature engineering
   └── Data normalization

2. Feature Engineering
   ├── Technical indicators calculation
   ├── Market sentiment features
   ├── Volatility features
   ├── Volume features
   └── Time-based features

3. Data Splitting
   ├── Training set (70%)
   ├── Validation set (15%)
   └── Test set (15%)

4. Sequence Preparation (for LSTM)
   ├── Time series windowing
   ├── Sequence labeling
   ├── Data augmentation
   └── Memory optimization
```

#### 3.2 Model Training Process

##### Random Forest Training
```javascript
// Random Forest training workflow in server/ml/models/randomforest.js
1. Model Initialization
   ├── Hyperparameter setup
   ├── Tree configuration
   └── Random state setting

2. Training Process
   ├── Bootstrap sampling
   ├── Feature selection
   ├── Tree construction
   ├── Ensemble creation
   └── Model validation

3. Evaluation Process
   ├── Cross-validation
   ├── Performance metrics calculation
   ├── Feature importance analysis
   └── Model persistence
```

##### LSTM Training
```javascript
// LSTM training workflow in server/ml/models/lstm.js
1. Model Architecture Setup
   ├── Layer configuration
   ├── Activation functions
   ├── Dropout layers
   └── Output layer setup

2. Training Process
   ├── Batch preparation
   ├── Forward propagation
   ├── Loss calculation
   ├── Backpropagation
   ├── Weight updates
   └── Early stopping

3. Model Evaluation
   ├── Validation performance
   ├── Test set evaluation
   ├── Prediction accuracy
   └── Model saving
```

##### DDQN Training
```javascript
// DDQN training workflow in server/ml/models/ddqn.js
1. Environment Setup
   ├── State space definition
   ├── Action space definition
   ├── Reward function setup
   └── Experience replay buffer

2. Training Loop
   ├── State observation
   ├── Action selection (epsilon-greedy)
   ├── Environment step
   ├── Reward calculation
   ├── Experience storage
   ├── Network updates
   └── Target network updates

3. Model Persistence
   ├── Network weights saving
   ├── Experience buffer saving
   └── Training statistics
```

#### 3.3 Ensemble Prediction Process
```javascript
// Ensemble prediction workflow
1. Individual Model Predictions
   ├── Random Forest prediction
   ├── LSTM prediction
   └── DDQN prediction

2. Weighted Combination
   ├── Random Forest weight: 40%
   ├── LSTM weight: 35%
   └── DDQN weight: 25%

3. Final Prediction
   ├── Weighted average calculation
   ├── Confidence scoring
   ├── Signal strength calculation
   └── Risk assessment
```

### 4. Risk Management System - Complete Workflow

#### 4.1 Position Sizing Process
```javascript
// Position sizing workflow in server/risk/manager.js
1. Kelly Criterion Calculation
   ├── Win rate calculation
   ├── Average win/loss calculation
   ├── Kelly percentage computation
   └── Position size determination

2. Volatility Adjustment
   ├── Historical volatility calculation
   ├── Current volatility assessment
   ├── Position size adjustment
   └── Risk per trade calculation

3. Portfolio Limits
   ├── Maximum position size
   ├── Maximum portfolio exposure
   ├── Correlation limits
   └── Sector exposure limits
```

#### 4.2 Risk Monitoring Process
```javascript
// Risk monitoring workflow
1. Real-time Risk Assessment
   ├── Current drawdown calculation
   ├── Daily loss tracking
   ├── Position correlation analysis
   └── Portfolio heat map generation

2. Risk Limit Checks
   ├── Daily loss limit validation
   ├── Maximum drawdown check
   ├── Position count validation
   └── Leverage limit check

3. Risk Alerts
   ├── Threshold breach detection
   ├── Alert generation
   ├── Notification sending
   └── Emergency stop conditions
```

### 5. Autonomous Trading Engine - Complete Workflow

#### 5.1 Signal Generation Process
```javascript
// Signal generation workflow in server/trading/engine.js
1. Market Analysis
   ├── Technical analysis
   ├── Fundamental analysis
   ├── Sentiment analysis
   └── News impact assessment

2. ML Model Integration
   ├── Ensemble prediction
   ├── Signal strength calculation
   ├── Confidence scoring
   └── Risk assessment

3. Signal Validation
   ├── Multiple timeframe analysis
   ├── Volume confirmation
   ├── Trend alignment
   └── Risk/reward ratio calculation
```

#### 5.2 Order Execution Process
```javascript
// Order execution workflow
1. Order Preparation
   ├── Signal validation
   ├── Position sizing calculation
   ├── Entry price determination
   ├── Stop loss calculation
   └── Take profit calculation

2. Order Placement
   ├── Paper trading mode
   ├── Live trading mode (MT5)
   ├── Order validation
   └── Confirmation handling

3. Order Management
   ├── Order tracking
   ├── Fill monitoring
   ├── Partial fill handling
   └── Order modification
```

#### 5.3 Position Management Process
```javascript
// Position management workflow
1. Position Monitoring
   ├── Real-time P&L tracking
   ├── Risk assessment
   ├── Performance analysis
   └── Correlation monitoring

2. Exit Decision Making
   ├── Stop loss monitoring
   ├── Take profit monitoring
   ├── Time-based exits
   └── Signal-based exits

3. Position Adjustment
   ├── Partial position closing
   ├── Position scaling
   ├── Risk adjustment
   └── Portfolio rebalancing
```

### 6. AI Notification Agent - Complete Workflow

#### 6.1 System Monitoring Process
```javascript
// AI notification workflow in server/ai/notification-agent.js
1. Health Check Process (every 30 seconds)
   ├── System component status check
   ├── Database connection validation
   ├── API endpoint health check
   ├── Memory and CPU monitoring
   └── Disk space monitoring

2. Trading Performance Monitoring (every 60 seconds)
   ├── Recent trades analysis
   ├── P&L calculation
   ├── Win rate calculation
   ├── Drawdown calculation
   └── Performance trend analysis

3. Model Health Monitoring (every 120 seconds)
   ├── Model accuracy tracking
   ├── Prediction performance
   ├── Training status check
   ├── Model degradation detection
   └── Retraining recommendations

4. Data Stream Health Monitoring (every 30 seconds)
   ├── Data update frequency check
   ├── Data quality assessment
   ├── API rate limit monitoring
   ├── Connection status check
   └── Data consistency validation
```

#### 6.2 Alert Generation Process
```javascript
// Alert generation workflow
1. Threshold Checking
   ├── P&L threshold validation
   ├── Win rate threshold check
   ├── Drawdown threshold monitoring
   ├── System load threshold check
   └── Model accuracy threshold validation

2. Alert Classification
   ├── Critical alerts (immediate action required)
   ├── Warning alerts (attention needed)
   ├── Info alerts (informational)
   └── Success alerts (positive events)

3. Alert Processing
   ├── Alert creation
   ├── Priority assignment
   ├── Duplicate detection
   ├── Escalation logic
   └── Notification delivery
```

#### 6.3 Notification Delivery Process
```javascript
// Notification delivery workflow
1. Database Storage
   ├── Alert persistence
   ├── Timestamp recording
   ├── Metadata storage
   └── Read status tracking

2. Frontend Integration
   ├── Real-time notification updates
   ├── Notification display
   ├── User interaction handling
   └── Notification management

3. Alert Management
   ├── Read/unread status
   ├── Alert filtering
   ├── Alert deletion
   └── Alert history
```

### 7. Autonomous Orchestrator - Complete Workflow

#### 7.1 System Coordination Process
```javascript
// Autonomous orchestrator workflow in server/autonomous/orchestrator.js
1. Component Registration
   ├── Trading engine registration
   ├── Data manager registration
   ├── Model manager registration
   ├── Risk manager registration
   └── Database manager registration

2. Health Monitoring (every 60 seconds)
   ├── Component status check
   ├── Performance monitoring
   ├── Error detection
   ├── Recovery procedures
   └── System optimization

3. Autonomous Trading Setup
   ├── Trading mode configuration
   ├── Risk parameter setup
   ├── Model configuration
   ├── Data fetching setup
   └── Performance tracking setup
```

#### 7.2 Autonomous Data Fetching
```javascript
// Autonomous data fetching workflow
1. Scheduled Data Fetching (every 30 seconds)
   ├── Market data retrieval
   ├── Data validation
   ├── Database storage
   ├── Technical indicators calculation
   └── Data quality assessment

2. Error Handling
   ├── API failure detection
   ├── Retry logic
   ├── Fallback mechanisms
   ├── Error reporting
   └── Recovery procedures
```

#### 7.3 Autonomous Model Training
```javascript
// Autonomous model training workflow
1. Scheduled Training (every 60 minutes)
   ├── Data preparation
   ├── Model training
   ├── Performance evaluation
   ├── Model validation
   └── Model persistence

2. Training Optimization
   ├── Hyperparameter tuning
   ├── Feature selection
   ├── Model selection
   ├── Performance monitoring
   └── Retraining decisions
```

### 8. MT5 Integration - Complete Workflow

#### 8.1 ZeroMQ Connection Process
```javascript
// MT5 integration workflow in server/index.js
1. Connection Setup
   ├── ZeroMQ socket creation
   ├── Connection configuration
   ├── Port binding
   └── Connection testing

2. Data Exchange
   ├── Command sending
   ├── Data receiving
   ├── Message parsing
   ├── Error handling
   └── Reconnection logic

3. Trading Integration
   ├── Order placement
   ├── Position monitoring
   ├── Account information
   ├── Market data
   └── Trade execution
```

### 9. Frontend Dashboard - Complete Workflow

#### 9.1 Real-time Data Flow
```javascript
// Frontend data flow workflow in src/contexts/TradingContext.tsx
1. WebSocket Connection
   ├── Connection establishment
   ├── Event listener setup
   ├── Reconnection logic
   └── Error handling

2. Data Subscription
   ├── Real-time price updates
   ├── Trade notifications
   ├── System status updates
   ├── AI notification updates
   └── Performance metrics

3. State Management
   ├── Data caching
   ├── State updates
   ├── Component re-rendering
   ├── Performance optimization
   └── Memory management
```

#### 9.2 Component Interaction Flow
```javascript
// Component interaction workflow
1. Dashboard Component
   ├── Layout rendering
   ├── Component mounting
   ├── Data fetching
   ├── Event handling
   └── State management

2. Trading Components
   ├── Position display
   ├── Order management
   ├── Chart rendering
   ├── Performance tracking
   └── Risk monitoring

3. AI Notification Components
   ├── Notification display
   ├── Alert management
   ├── Filtering options
   ├── User interactions
   └── Real-time updates
```

### 10. API Endpoints - Complete Workflow

#### 10.1 Request Processing Flow
```javascript
// API request processing workflow
1. Request Reception
   ├── HTTP request parsing
   ├── Authentication validation
   ├── Rate limiting check
   ├── CORS validation
   └── Request logging

2. Business Logic Processing
   ├── Data validation
   ├── Business rule application
   ├── Database operations
   ├── External API calls
   └── Response preparation

3. Response Delivery
   ├── Response formatting
   ├── Error handling
   ├── CORS headers
   ├── Response logging
   └── Client delivery
```

## 📊 Dashboard Access

- **Frontend**: http://localhost:3000 (or auto-detected port)
- **Backend API**: http://localhost:8000 (or auto-detected port)
- **AI Notifications**: Click the 🤖 icon in the top bar
- **System Health**: Real-time monitoring dashboard

## 🤖 AI Notification Agent

The AI notification agent acts as your trading concierge, providing:

### Real-time Monitoring
- System health and performance metrics
- Trading performance alerts and warnings
- Model accuracy tracking and degradation detection
- Data stream health monitoring and connection status

### Smart Alerts
- **P&L Alerts**: Notifications when losses exceed configurable thresholds
- **Win Rate Monitoring**: Alerts for poor trading performance
- **Drawdown Protection**: Critical alerts for high drawdowns
- **System Load**: CPU and memory usage monitoring
- **Model Performance**: Accuracy drops and retraining notifications

### Daily Summaries
- Automated daily trading performance reports
- Model performance summaries and accuracy trends
- System uptime and reliability metrics
- Risk management compliance reports

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Agent      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Monitoring)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │TradingView│            │ML Models│            │Notifications│
    │MQL5     │            │Database│            │Alerts   │
    └─────────┘            └─────────┘            └─────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │Real-time│            │Risk Mgmt│            │Performance│
    │Data     │            │Engine   │            │Tracking  │
    └─────────┘            └─────────┘            └─────────┘
```

## 🔧 Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false

# Risk Management
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MAX_DRAWDOWN=0.15
MAX_POSITIONS=10

# API Keys
ALPHA_VANTAGE_API_KEY=your_api_key
BYBIT_API_KEY=your_api_key
BYBIT_SECRET=your_secret

# MT5 Integration
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
```

### AI Agent Configuration
```javascript
// Customize notification thresholds
const notificationAgent = new AINotificationAgent({
  checkInterval: 30000, // 30 seconds
  notificationThresholds: {
    pnlAlert: -100,        // Alert on $100 loss
    winRateAlert: 0.4,     // Alert if win rate < 40%
    drawdownAlert: 0.1,    // Alert on 10% drawdown
    modelAccuracyAlert: 0.5, // Alert if model accuracy < 50%
    systemLoadAlert: 0.8,  // Alert if system load > 80%
    connectionTimeout: 60000 // Alert if no data for 1 minute
  }
})
```

## 📈 Trading Models

### Random Forest (40% Weight)
- **Type**: Ensemble learning with decision trees
- **Features**: 50+ technical indicators, market sentiment, volatility
- **Update Frequency**: Daily retraining with new data
- **Strengths**: Robust, handles non-linear relationships

### LSTM Neural Network (35% Weight)
- **Type**: Deep learning for time series prediction
- **Features**: Price patterns, volume analysis, sequence learning
- **Update Frequency**: Weekly retraining with validation
- **Strengths**: Captures temporal dependencies and patterns

### DDQN Agent (25% Weight)
- **Type**: Reinforcement learning with double Q-learning
- **Features**: Market state, action-reward learning, exploration
- **Update Frequency**: Continuous learning with experience replay
- **Strengths**: Adapts to changing market conditions

## 🛡️ Risk Management

### Position Sizing
- **Kelly Criterion**: Optimal position sizing based on win rate and odds
- **Volatility Adjustment**: Position size adjusted for market volatility
- **Correlation Limits**: Maximum exposure to correlated assets
- **Portfolio Limits**: Maximum total portfolio exposure

### Risk Controls
- **Daily Loss Limits**: Configurable maximum daily loss percentage
- **Drawdown Protection**: Maximum drawdown limits with automatic stops
- **Stop Loss Management**: Dynamic stop-loss levels based on volatility
- **Take Profit Targets**: Automated profit taking at resistance levels

### Portfolio Protection
- **Correlation Analysis**: Real-time correlation monitoring
- **Exposure Limits**: Maximum exposure per asset and sector
- **Leverage Control**: Maximum leverage limits
- **Weekend Flattening**: Automatic position reduction before weekends

## 🚀 Deployment Options

### Railway (Recommended)
```bash
RAILWAY_TOKEN=your_token npm run deploy
```

### Heroku
```bash
HEROKU_API_KEY=your_key npm run deploy
```

### Render
```bash
RENDER_TOKEN=your_token npm run deploy
```

### Vultr VPS
```bash
VULTR_API_KEY=your_key VULTR_SERVER_IP=your_ip npm run deploy
```

### Local Development
```bash
npm run deploy  # Automatically detects local environment
```

## 📝 API Endpoints

### Trading
- `GET /api/positions` - Get current positions
- `GET /api/orders` - Get pending orders
- `POST /api/orders` - Place new order
- `GET /api/balance` - Get account balance
- `POST /api/trading/start` - Start autonomous trading
- `POST /api/trading/stop` - Stop autonomous trading

### Models
- `GET /api/models` - Get model status and performance
- `POST /api/models/retrain` - Retrain all models
- `GET /api/models/performance` - Get detailed model performance
- `GET /api/models/predictions` - Get latest predictions

### Data
- `GET /api/data/ohlcv/:symbol/:timeframe` - Get OHLCV data
- `GET /api/data/indicators/:symbol/:timeframe` - Get technical indicators
- `GET /api/data/latest/:symbol` - Get latest price data
- `POST /api/data/fetch` - Trigger data fetch

### AI Notifications
- `GET /api/notifications` - Get AI notifications
- `POST /api/notifications/mark-read` - Mark notification as read
- `GET /api/notifications/summary` - Get daily summary
- `GET /api/notifications/settings` - Get notification settings

### System
- `GET /api/health` - System health check
- `GET /api/status` - Detailed system status
- `GET /api/performance` - System performance metrics
- `POST /api/system/restart` - Restart system components

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run pipeline tests
npm run test:pipeline

# Performance testing
npm run test:performance
```

## 📊 Monitoring & Logging

### Metrics
- Trading performance metrics (P&L, win rate, drawdown)
- Model accuracy tracking and degradation detection
- System resource usage (CPU, memory, disk)
- API response times and throughput
- Database performance and query times

### Logs
- Trading activity logs with detailed trade information
- Model training logs with accuracy and performance metrics
- System error logs with stack traces and context
- Performance logs with timing and resource usage
- AI notification logs with alert details

### Health Checks
- Real-time system health monitoring
- Component status tracking
- Automatic error detection and recovery
- Performance degradation alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Create an issue on GitHub with detailed error information
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Wiki**: Check the project wiki for tutorials and examples

## 🎯 Roadmap

### Phase 1 (Current) ✅
- [x] Multi-model ML ensemble
- [x] Real-time data integration
- [x] Risk management system
- [x] AI notification agent
- [x] MT5 integration
- [x] Autonomous trading

### Phase 2 (Next) 🚧
- [ ] Advanced ML models (Transformer, GAN)
- [ ] Multi-exchange support
- [ ] Mobile app development
- [ ] Advanced backtesting engine
- [ ] Social trading features

### Phase 3 (Future) 📋
- [ ] API rate limiting improvements
- [ ] Enhanced AI notifications
- [ ] Machine learning pipeline optimization
- [ ] Advanced portfolio management
- [ ] Institutional features

## 🔄 Current System Status

The system is currently running with:
- ✅ Backend API server operational
- ✅ Database initialized and connected
- ✅ ML models loaded and ready
- ✅ Risk management active
- ✅ AI notification agent monitoring
- ✅ Autonomous orchestrator configured
- ⚠️ MT5 integration (requires MT5 with ZmqDealerEA)
- ✅ Frontend accessible

## 🎉 Getting Started

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/algotrader-pro.git
   cd algotrader-pro
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your API keys and settings
   ```

3. **Start the System**
   ```bash
   npm run dev
   ```

4. **Access Dashboard**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - Health Check: http://localhost:8000/api/health

5. **Configure Trading**
   - Set trading mode (paper/live)
   - Configure risk parameters
   - Set up AI notification preferences
   - Start autonomous trading

---

**Built with ❤️ for algorithmic traders**

*This system is designed for educational and research purposes. Always test thoroughly before using with real money.*