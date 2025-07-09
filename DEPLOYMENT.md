# Deployment Guide

This guide covers deploying the AlgoTrader Pro system to various cloud platforms.

## 🚀 Quick Deploy Options

### 1. Railway (Recommended - Easiest)

Railway is perfect for Node.js apps with automatic deployments.

**Steps:**
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`
4. Set environment variables in Railway dashboard
5. Your app will be live at `https://your-app-name.railway.app`

**Benefits:**
- Free tier available
- Automatic HTTPS
- Built-in Redis
- Easy environment variable management
- Automatic deployments from Git

### 2. Render (Great Free Tier)

Render offers a generous free tier with automatic deployments.

**Steps:**
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the `render.yaml` configuration
4. Set environment variables
5. Deploy automatically

**Benefits:**
- Free tier with 750 hours/month
- Automatic HTTPS
- Built-in Redis database
- Easy scaling

### 3. Heroku (Classic Choice)

Heroku is a reliable platform with good Node.js support.

**Steps:**
1. Install Heroku CLI: `brew install heroku/brew/heroku`
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Add Redis: `heroku addons:create heroku-redis:hobby-dev`
5. Deploy: `git push heroku main`
6. Set environment variables: `heroku config:set NODE_ENV=production`

**Benefits:**
- Reliable and stable
- Good documentation
- Built-in Redis addon
- Easy scaling

### 4. Docker Deployment

For maximum control and portability.

**Local Docker:**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t algo-trading-system .
docker run -p 8000:8000 algo-trading-system
```

**Cloud Docker (AWS, GCP, Azure):**
1. Build and push to container registry
2. Deploy to container service
3. Set up load balancer and auto-scaling

## 🔧 Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
# Required for all deployments
NODE_ENV=production
PORT=8000
REDIS_URL=your_redis_url

# Trading configuration
TRADING_MODE=paper  # Start with paper trading
MAX_POSITION_SIZE=0.02
MAX_DRAWDOWN=0.1

# Optional: Live trading (configure carefully!)
BYBIT_API_KEY=your_key
BYBIT_SECRET=your_secret
MT5_LOGIN=your_login
MT5_PASSWORD=your_password
```

## 📊 Monitoring Setup

### Prometheus & Grafana (Optional)

The Docker Compose includes monitoring:

```bash
# Start with monitoring
docker-compose up -d

# Access Grafana at http://localhost:3001
# Username: admin, Password: admin
```

### Health Checks

All deployments include health checks at `/api/health`:

```bash
curl https://your-app.railway.app/api/health
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET` and `SESSION_SECRET`
- [ ] Use HTTPS (automatic on most platforms)
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Use environment variables for all secrets

### Trading Safety

- [ ] Start with `TRADING_MODE=paper`
- [ ] Set conservative `MAX_POSITION_SIZE`
- [ ] Configure `MAX_DRAWDOWN` limits
- [ ] Test thoroughly before live trading
- [ ] Monitor system health continuously

## 🚨 Emergency Procedures

### Emergency Stop

The system includes emergency stop functionality:

```bash
# Via API
curl -X POST https://your-app.railway.app/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'

# Via WebSocket (from frontend)
socket.emit('emergency_stop')
```

### Rollback

To rollback to a previous version:

**Railway:**
```bash
railway rollback
```

**Heroku:**
```bash
heroku rollback v42
```

**Docker:**
```bash
docker-compose down
docker-compose up -d --force-recreate
```

## 📈 Scaling

### Horizontal Scaling

Most platforms support automatic scaling:

**Railway:**
- Configure in dashboard
- Set min/max instances

**Render:**
- Enable auto-scaling in service settings
- Set CPU/memory thresholds

**Heroku:**
```bash
heroku ps:scale web=2
```

### Vertical Scaling

Upgrade your plan for more resources:

- Railway: Upgrade to Pro plan
- Render: Upgrade to paid plan
- Heroku: Upgrade dyno size

## 🔍 Troubleshooting

### Common Issues

1. **Port Issues**
   - Ensure `PORT` environment variable is set
   - Check platform-specific port requirements

2. **Redis Connection**
   - Verify `REDIS_URL` is correct
   - Check Redis service is running

3. **Memory Issues**
   - Monitor memory usage
   - Consider upgrading plan
   - Optimize ML model memory usage

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`
   - Check build logs for specific errors

### Logs

**Railway:**
```bash
railway logs
```

**Render:**
- View logs in dashboard
- Or use CLI: `render logs`

**Heroku:**
```bash
heroku logs --tail
```

**Docker:**
```bash
docker-compose logs -f
```

## 📞 Support

For deployment issues:

1. Check platform-specific documentation
2. Review logs for error messages
3. Verify environment configuration
4. Test locally with Docker first

## ⚠️ Disclaimer

This trading system is for educational purposes. Always test thoroughly in paper mode before live trading. Trading involves substantial risk of loss. 