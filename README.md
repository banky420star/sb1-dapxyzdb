# AlgoTrader Pro - AI-Powered Trading System

A comprehensive algorithmic trading platform with machine learning models, real-time market data, and intelligent notifications.

## 🚀 Features

### Core Trading System
- **Multi-Model ML Ensemble**: Random Forest, LSTM, and DDQN models
- **Real-time Market Data**: Live price feeds and technical indicators
- **Risk Management**: Position sizing, stop-loss, and drawdown protection
- **Paper & Live Trading**: Safe testing with paper trading mode

### AI Notification Agent 🤖
- **Intelligent Monitoring**: Real-time system health and performance tracking
- **Smart Alerts**: P&L alerts, model performance, system load monitoring
- **Daily Summaries**: Automated trading performance reports
- **Concierge Service**: Proactive notifications about system status

### Frontend Dashboard
- **Real-time Updates**: Live trading data and system metrics
- **Interactive Charts**: TradingView and MQL5 integration
- **AI Notifications**: Intelligent alert system with filtering
- **Responsive Design**: Mobile-friendly interface

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/algotrader-pro.git
cd algotrader-pro

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Deployment
```bash
# Deploy to any platform (Railway, Heroku, Render, Vultr, or local)
npm run deploy
```

The deployment script automatically detects your environment and deploys accordingly.

## 📊 Dashboard Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **AI Notifications**: Click the 🤖 icon in the top bar

## 🤖 AI Notification Agent

The AI notification agent acts as your trading concierge, providing:

### Real-time Monitoring
- System health and performance metrics
- Trading performance alerts
- Model accuracy tracking
- Data stream health monitoring

### Smart Alerts
- **P&L Alerts**: Notifications when losses exceed thresholds
- **Win Rate Monitoring**: Alerts for poor trading performance
- **Drawdown Protection**: Critical alerts for high drawdowns
- **System Load**: CPU and memory usage monitoring

### Daily Summaries
- Automated daily trading performance reports
- Model performance summaries
- System uptime and reliability metrics

## 🏗️ Architecture

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
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MT5_INTEGRATION=true
ALPHA_VANTAGE_API_KEY=your_api_key
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

### Random Forest
- **Type**: Ensemble learning
- **Features**: Technical indicators, market sentiment
- **Update Frequency**: Daily retraining

### LSTM Neural Network
- **Type**: Deep learning for time series
- **Features**: Price patterns, volume analysis
- **Update Frequency**: Weekly retraining

### DDQN Agent
- **Type**: Reinforcement learning
- **Features**: Market state, action-reward learning
- **Update Frequency**: Continuous learning

## 🛡️ Risk Management

- **Position Sizing**: Kelly Criterion-based sizing
- **Stop Loss**: Dynamic stop-loss levels
- **Drawdown Protection**: Maximum drawdown limits
- **Daily Loss Limits**: Configurable daily loss thresholds

## 🚀 Deployment Options

### Railway
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

### Models
- `GET /api/models` - Get model status
- `POST /api/models/retrain` - Retrain models
- `GET /api/models/performance` - Get model performance

### AI Notifications
- `GET /api/notifications` - Get AI notifications
- `POST /api/notifications/mark-read` - Mark notification as read
- `GET /api/notifications/summary` - Get daily summary

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📊 Monitoring

### Metrics
- Trading performance metrics
- Model accuracy tracking
- System resource usage
- API response times

### Logs
- Trading activity logs
- Model training logs
- System error logs
- Performance logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions

## 🎯 Roadmap

- [ ] Advanced ML models (Transformer, GAN)
- [ ] Multi-exchange support
- [ ] Mobile app
- [ ] Advanced backtesting
- [ ] Social trading features
- [ ] API rate limiting improvements
- [ ] Enhanced AI notifications

---

**Built with ❤️ for algorithmic traders**