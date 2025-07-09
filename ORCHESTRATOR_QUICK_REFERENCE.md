# AI Trading System Orchestrator - Quick Reference

## 🚀 Quick Start Commands

```bash
# Initial setup
./setup-orchestrator.sh

# Development mode
./orchestrator-simple.sh dev

# Production deployment
./orchestrator-simple.sh deploy

# Check status
./orchestrator-simple.sh status
```

## 📋 Essential Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `setup` | Install dependencies | `./orchestrator-simple.sh setup` |
| `dev` | Start development environment | `./orchestrator-simple.sh dev` |
| `build` | Build for production | `./orchestrator-simple.sh build` |
| `start` | Start production services | `./orchestrator-simple.sh start` |
| `stop` | Stop all services | `./orchestrator-simple.sh stop` |
| `status` | Check service status | `./orchestrator-simple.sh status` |
| `deploy` | Deploy to cloud | `./orchestrator-simple.sh deploy` |
| `logs` | Show recent logs | `./orchestrator-simple.sh logs` |

## 🔧 Advanced Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `install` | Full dependency installation | `./orchestrator.sh install` |
| `monitor` | Continuous monitoring | `./orchestrator.sh monitor` |
| `backup` | Create backup | `./orchestrator.sh backup` |
| `restore` | Restore from backup | `./orchestrator.sh restore <backup-dir>` |
| `test` | Run tests | `./orchestrator.sh test` |
| `cleanup` | Clean up temporary files | `./orchestrator.sh cleanup` |

## 🌐 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| MT5 Bridge | 5000 | http://localhost:5000 |
| Monitoring | 9090 | http://localhost:9090 |

## 📁 Important Files

| File | Purpose |
|------|---------|
| `orchestrator.config` | Main configuration |
| `orchestrator.sh` | Full-featured orchestrator |
| `orchestrator-simple.sh` | Quick commands |
| `setup-orchestrator.sh` | Initial setup |
| `.env` | Environment variables |
| `orchestrator.log` | Orchestrator logs |

## 🔍 Troubleshooting

### Service Not Starting
```bash
# Check logs
./orchestrator-simple.sh logs

# Restart services
./orchestrator-simple.sh stop
./orchestrator-simple.sh start
```

### Port Already in Use
```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Deployment Issues
```bash
# Check deployment logs
tail -f deployment.log

# Verify configuration
cat orchestrator.config
```

## 📊 Monitoring

### Health Check URLs
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`
- MT5 Bridge: `http://localhost:5000/status`

### Continuous Monitoring
```bash
# Start monitoring
./orchestrator.sh monitor

# Check status every 5 minutes
*/5 * * * * cd /path/to/project && ./orchestrator-simple.sh status
```

## 🚀 Deployment Targets

| Platform | Script | Configuration |
|----------|--------|---------------|
| Vultr VPS | `deploy-to-vultr.sh` | Vultr API key + SSH keys |
| Railway | `deploy-to-railway.sh` | Railway CLI + project setup |
| Render | `deploy-to-render.sh` | Render account + project setup |
| Local | Built-in | No additional setup |

## 🔐 Security

### Environment Variables
```bash
# Copy example environment
cp env.example .env

# Edit with your secrets
nano .env
```

### API Keys
```bash
# Vultr API key
export VULTR_API_KEY="your-api-key"

# MT5 credentials
export MT5_LOGIN="your-login"
export MT5_PASSWORD="your-password"
```

## 📈 Performance

### Production Settings
```bash
export NODE_ENV="production"
export DEBUG_MODE=false
export REDIS_URL="redis://localhost:6379"
```

### Resource Monitoring
```bash
# Check resource usage
htop

# Monitor network
iftop

# Check disk usage
df -h
```

## 🆘 Emergency Commands

```bash
# Force stop all services
pkill -f "node index.js"
pkill -f "npm run dev"

# Clear all logs
rm -f *.log

# Reset to clean state
./orchestrator.sh cleanup
./orchestrator-simple.sh setup
```

## 📞 Support

1. Check this quick reference
2. Review `ORCHESTRATOR_README.md`
3. Check log files: `./orchestrator-simple.sh logs`
4. Verify configuration: `cat orchestrator.config` 