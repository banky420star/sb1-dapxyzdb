# AI Trading System Master Orchestrator

A comprehensive orchestration system for managing your AI trading platform deployment, monitoring, and operations.

## Overview

The master orchestrator provides a unified interface for managing all aspects of your AI trading system:

- **Development Environment**: Local setup and development workflow
- **Production Deployment**: Automated deployment to various cloud platforms
- **Service Management**: Start, stop, and monitor all services
- **Monitoring & Logging**: Health checks and log management
- **Backup & Recovery**: Data backup and restoration
- **Testing**: Automated test execution

## Quick Start

### 1. Initial Setup

```bash
# Make orchestrator executable
chmod +x orchestrator.sh orchestrator-simple.sh

# Run initial setup
./orchestrator-simple.sh setup
```

### 2. Development Mode

```bash
# Start development environment
./orchestrator-simple.sh dev

# Check status
./orchestrator-simple.sh status

# View logs
./orchestrator-simple.sh logs
```

### 3. Production Deployment

```bash
# Deploy to configured platform (Vultr by default)
./orchestrator-simple.sh deploy
```

## Orchestrator Scripts

### 1. `orchestrator.sh` - Full-Featured Orchestrator

The comprehensive orchestrator with advanced features:

```bash
# Install dependencies
./orchestrator.sh install

# Build application
./orchestrator.sh build

# Start services
./orchestrator.sh start

# Check status
./orchestrator.sh status

# Monitor services continuously
./orchestrator.sh monitor

# Deploy to cloud
./orchestrator.sh deploy

# Run tests
./orchestrator.sh test

# Create backup
./orchestrator.sh backup

# Restore from backup
./orchestrator.sh restore backups/20231201_143022

# Show logs
./orchestrator.sh logs

# Cleanup
./orchestrator.sh cleanup
```

### 2. `orchestrator-simple.sh` - Quick Commands

Simplified orchestrator for common tasks:

```bash
# Setup project
./orchestrator-simple.sh setup

# Development mode
./orchestrator-simple.sh dev

# Build for production
./orchestrator-simple.sh build

# Start production services
./orchestrator-simple.sh start

# Stop services
./orchestrator-simple.sh stop

# Check status
./orchestrator-simple.sh status

# Deploy
./orchestrator-simple.sh deploy

# View logs
./orchestrator-simple.sh logs
```

## Configuration

### `orchestrator.config`

The configuration file contains all settings for the orchestrator:

```bash
# Project Settings
PROJECT_NAME="ai-trading-system"
PROJECT_VERSION="1.0.0"

# Port Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
MT5_PORT=5000

# Deployment Configuration
DEFAULT_DEPLOYMENT_TARGET="vultr"

# Trading Configuration
DEFAULT_ACCOUNT_TYPE="demo"
RISK_MANAGEMENT_ENABLED=true
MAX_POSITION_SIZE=0.02
```

### Environment Variables

You can override configuration by setting environment variables:

```bash
export BACKEND_PORT=9000
export FRONTEND_PORT=4000
export DEFAULT_DEPLOYMENT_TARGET="railway"
```

## Deployment Targets

The orchestrator supports multiple deployment platforms:

### 1. Vultr VPS
- **Script**: `deploy-to-vultr.sh`
- **Configuration**: Requires Vultr API key and SSH keys
- **Features**: Full server control, custom domain support

### 2. Railway
- **Script**: `deploy-to-railway.sh`
- **Configuration**: Requires Railway CLI and project setup
- **Features**: Automatic scaling, managed databases

### 3. Render
- **Script**: `deploy-to-render.sh`
- **Configuration**: Requires Render account and project setup
- **Features**: Free tier available, automatic deployments

### 4. Local Development
- **Script**: Built into orchestrator
- **Features**: Full development environment

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   MT5 Bridge    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MQL5)        │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (MongoDB)     │
                    │   Port: 27017   │
                    └─────────────────┘
```

## Monitoring & Health Checks

### Health Check Endpoints

- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost:3000`
- **MT5 Bridge**: `http://localhost:5000/status`

### Monitoring Commands

```bash
# Check all services
./orchestrator.sh status

# Continuous monitoring
./orchestrator.sh monitor

# View recent logs
./orchestrator.sh logs
```

## Backup & Recovery

### Creating Backups

```bash
# Create backup
./orchestrator.sh backup

# Backup location: backups/YYYYMMDD_HHMMSS/
```

### Restoring Backups

```bash
# Restore from backup
./orchestrator.sh restore backups/20231201_143022
```

### Backup Contents

- Server data directory
- Configuration files (*.env, *.json)
- Database dumps (if configured)

## Testing

### Running Tests

```bash
# Run all tests
./orchestrator.sh test

# Frontend tests only
npm run test

# Backend tests only
cd tests && npm test
```

### Test Coverage

- Unit tests for ML models
- Integration tests for trading engine
- End-to-end tests for API endpoints

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Dependencies Missing**
   ```bash
   # Reinstall dependencies
   ./orchestrator.sh install
   ```

3. **Service Not Starting**
   ```bash
   # Check logs
   ./orchestrator.sh logs
   
   # Restart services
   ./orchestrator.sh restart
   ```

4. **Deployment Failures**
   ```bash
   # Check deployment logs
   tail -f deployment.log
   
   # Verify configuration
   cat orchestrator.config
   ```

### Log Files

- `orchestrator.log` - Orchestrator activity
- `backend.log` - Backend service logs
- `frontend.log` - Frontend service logs
- `deployment.log` - Deployment process logs

## Security Considerations

### Environment Variables

Never commit sensitive information to version control:

```bash
# Create .env file for secrets
cp env.example .env

# Edit .env with your secrets
nano .env
```

### API Keys

Store API keys securely:

```bash
# Vultr API key
export VULTR_API_KEY="your-api-key"

# MT5 credentials
export MT5_LOGIN="your-login"
export MT5_PASSWORD="your-password"
```

## Performance Optimization

### Production Settings

```bash
# Set production environment
export NODE_ENV="production"

# Enable caching
export REDIS_URL="redis://localhost:6379"

# Optimize for performance
export DEBUG_MODE=false
```

### Monitoring Performance

```bash
# Check resource usage
htop

# Monitor network
iftop

# Check disk usage
df -h
```

## Contributing

### Adding New Commands

1. Edit `orchestrator.sh`
2. Add new case in main() function
3. Update help documentation
4. Test thoroughly

### Adding New Deployment Targets

1. Create deployment script (e.g., `deploy-to-newplatform.sh`)
2. Add to `DEPLOYMENT_TARGETS` in config
3. Update deploy_cloud() function
4. Test deployment process

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review log files
3. Check configuration settings
4. Verify system requirements

## License

This orchestrator is part of the AI Trading System project. 