import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import WebSocket from 'ws';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from 'config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import cluster from 'cluster';
import os from 'os';

// Import enhanced components
import { DatabaseManager } from './database/postgres-manager.js';
import { EnhancedDataManager } from './data/enhanced-data-manager.js';
import { TradingEngine } from './trading/engine.js';
import { ModelManager } from './ml/manager.js';
import { RiskManager } from './risk/manager.js';
import { MetricsCollector } from './monitoring/metrics.js';
import { EnhancedLogger } from './utils/enhanced-logger.js';
import { AINotificationAgent } from './ai/notification-agent.js';
import { AutonomousOrchestrator } from './autonomous/orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced Application Class
class TradingSystemApp {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.logger = new EnhancedLogger('trading-system-server');
    this.isShuttingDown = false;
    this.startTime = Date.now();
    
    // Core components
    this.database = null;
    this.dataManager = null;
    this.tradingEngine = null;
    this.modelManager = null;
    this.riskManager = null;
    this.metricsCollector = null;
    this.notificationAgent = null;
    this.orchestrator = null;
    
    // WebSocket servers
    this.socketIO = null;
    this.marketWS = null;
    
    // System state
    this.systemState = {
      isRunning: false,
      tradingMode: config.get('trading.mode'),
      emergencyStop: false,
      lastUpdate: new Date().toISOString(),
      startTime: this.startTime,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing AI Trading System...');
      
      // Setup middleware
      this.setupMiddleware();
      
      // Initialize database first
      await this.initializeDatabase();
      
      // Initialize core components
      await this.initializeCoreComponents();
      
      // Setup WebSocket servers
      this.setupWebSocketServers();
      
      // Setup API routes
      this.setupRoutes();
      
      // Setup cron jobs
      this.setupCronJobs();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.logger.info('✅ System initialization completed successfully');
      
    } catch (error) {
      this.logger.error('❌ System initialization failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: config.get('security.headers.csp') || false,
      hsts: config.get('security.headers.hsts')
    }));

    // Compression
    if (config.get('performance.compression.enabled')) {
      this.app.use(compression({
        threshold: config.get('performance.compression.threshold')
      }));
    }

    // CORS
    this.app.use(cors({
      origin: config.get('server.cors.origins'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.get('server.rateLimit.windowMs'),
      max: config.get('server.rateLimit.max'),
      message: { error: 'Too many requests' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', limiter);

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => this.logger.info('HTTP Request', { message: message.trim() })
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request timeout
    this.app.use((req, res, next) => {
      req.setTimeout(config.get('server.timeout'));
      next();
    });
  }

  async initializeDatabase() {
    this.logger.info('🗄️ Initializing PostgreSQL database...');
    
    this.database = new DatabaseManager({
      connectionString: config.get('database.url'),
      maxConnections: config.get('database.pool.max'),
      idleTimeoutMillis: config.get('database.pool.idle'),
      connectionTimeoutMillis: config.get('database.pool.acquire')
    });

    await this.database.initialize();
    this.logger.info('✅ Database initialized successfully');
  }

  async initializeCoreComponents() {
    this.logger.info('⚙️ Initializing core components...');

    // Initialize metrics collector first
    this.metricsCollector = new MetricsCollector();

    // Initialize data manager
    this.dataManager = new EnhancedDataManager({
      database: this.database,
      logger: this.logger,
      metricsCollector: this.metricsCollector
    });

    // Initialize model manager
    this.modelManager = new ModelManager({
      database: this.database,
      logger: this.logger,
      metricsCollector: this.metricsCollector
    });

    // Initialize risk manager
    this.riskManager = new RiskManager({
      database: this.database,
      logger: this.logger,
      config: config.get('trading.riskManagement')
    });

    // Initialize trading engine
    this.tradingEngine = new TradingEngine({
      dataManager: this.dataManager,
      modelManager: this.modelManager,
      riskManager: this.riskManager,
      database: this.database,
      logger: this.logger,
      metricsCollector: this.metricsCollector
    });

    // Initialize notification agent
    this.notificationAgent = new AINotificationAgent({
      database: this.database,
      logger: this.logger
    });

    // Initialize autonomous orchestrator
    this.orchestrator = new AutonomousOrchestrator();

    // Initialize all components
    await Promise.all([
      this.dataManager.initialize(),
      this.modelManager.initialize(),
      this.riskManager.initialize(),
      this.tradingEngine.initialize(),
      this.notificationAgent.initialize()
    ]);

    // Setup orchestrator with system components
    this.orchestrator.setSystemComponents({
      tradingEngine: this.tradingEngine,
      dataManager: this.dataManager,
      modelManager: this.modelManager,
      riskManager: this.riskManager,
      database: this.database,
      logger: this.logger
    });

    await this.orchestrator.initialize();

    this.logger.info('✅ Core components initialized successfully');
  }

  setupWebSocketServers() {
    // Socket.IO for dashboard communication
    this.socketIO = new Server(this.server, {
      path: '/ui',
      cors: {
        origin: config.get('server.cors.origins'),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket'], // Remove polling fallback
      pingTimeout: config.get('websocket.pingTimeout'),
      pingInterval: config.get('websocket.pingInterval')
    });

    // Raw WebSocket server for high-frequency market data
    this.marketWS = new WebSocket.Server({
      server: this.server,
      path: '/ws/market',
      maxPayload: 1024 * 1024 // 1MB max payload
    });

    this.setupSocketIOHandlers();
    this.setupMarketWSHandlers();
  }

  setupSocketIOHandlers() {
    this.socketIO.on('connection', (socket) => {
      this.logger.info('Dashboard client connected', { socketId: socket.id });

      // Send initial data
      this.sendInitialData(socket);

      // Handle dashboard commands
      socket.on('execute_command', async (data) => {
        try {
          const result = await this.executeCommand(data.command);
          socket.emit('command_result', { success: true, result });
          this.logger.audit('command_executed', socket.id, data.command);
        } catch (error) {
          socket.emit('command_result', { success: false, error: error.message });
          this.logger.error('Command execution failed', { command: data.command, error });
        }
      });

      socket.on('set_trading_mode', async (data) => {
        try {
          await this.setTradingMode(data.mode);
          this.socketIO.emit('system_state', this.systemState);
          this.logger.audit('trading_mode_changed', socket.id, data.mode);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('emergency_stop', async () => {
        try {
          await this.emergencyStop();
          this.socketIO.emit('emergency_stop_activated', { timestamp: new Date().toISOString() });
          this.logger.audit('emergency_stop', socket.id, 'activated');
        } catch (error) {
          this.logger.error('Emergency stop failed', error);
        }
      });

      socket.on('disconnect', () => {
        this.logger.info('Dashboard client disconnected', { socketId: socket.id });
      });
    });

    // Setup real-time data broadcasting
    this.setupRealTimeDataBroadcasting();
  }

  setupMarketWSHandlers() {
    this.marketWS.on('connection', (ws, request) => {
      this.logger.info('Market data client connected', { 
        clientIP: request.connection.remoteAddress 
      });

      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMarketDataRequest(ws, data);
        } catch (error) {
          this.logger.warn('Invalid market data request', { error: error.message });
        }
      });

      ws.on('close', () => {
        this.logger.info('Market data client disconnected');
      });
    });

    // Setup heartbeat for market WebSocket connections
    setInterval(() => {
      this.marketWS.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  setupRealTimeDataBroadcasting() {
    // Broadcast price updates
    this.dataManager.on('prices', (prices) => {
      this.socketIO.emit('price_update', prices);
      this.broadcastToMarketWS({ type: 'prices', data: prices });
    });

    // Broadcast trading signals
    this.dataManager.on('signals', (signals) => {
      this.socketIO.emit('signals_update', signals);
    });

    // Broadcast model updates
    this.modelManager.on('model_update', (modelData) => {
      this.socketIO.emit('models_update', modelData);
    });

    // Broadcast trade executions
    this.tradingEngine.on('trade_executed', (trade) => {
      this.socketIO.emit('trade_update', trade);
      this.broadcastToMarketWS({ type: 'trade', data: trade });
    });

    // Broadcast risk alerts
    this.riskManager.on('risk_alert', (alert) => {
      this.socketIO.emit('risk_alert', alert);
    });

    // Broadcast notifications
    this.notificationAgent.on('notification', (notification) => {
      this.socketIO.emit('notification', notification);
    });
  }

  broadcastToMarketWS(data) {
    const message = JSON.stringify(data);
    this.marketWS.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  handleMarketDataRequest(ws, request) {
    switch (request.type) {
      case 'subscribe':
        // Handle subscription to specific symbols/feeds
        ws.subscriptions = ws.subscriptions || new Set();
        if (request.symbols) {
          request.symbols.forEach(symbol => ws.subscriptions.add(symbol));
        }
        break;
      
      case 'unsubscribe':
        // Handle unsubscription
        if (ws.subscriptions && request.symbols) {
          request.symbols.forEach(symbol => ws.subscriptions.delete(symbol));
        }
        break;
      
      default:
        ws.send(JSON.stringify({ error: 'Unknown request type' }));
    }
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.getHealthCheck();
        const status = health.status === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Metrics endpoint for Prometheus
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsCollector.getPrometheusMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // System status
    this.app.get('/api/status', (req, res) => {
      res.json({
        ...this.systemState,
        uptime: Date.now() - this.startTime,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      });
    });

    // Trading data endpoints
    this.app.get('/api/positions', async (req, res) => {
      try {
        const positions = await this.database.getPositions();
        res.json(positions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/trades', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 100;
        const trades = await this.database.getTrades(limit);
        res.json(trades);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/models', async (req, res) => {
      try {
        const models = await this.database.getModelStatus();
        res.json(models);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Database metrics
    this.app.get('/api/db/metrics', async (req, res) => {
      try {
        const stats = await this.database.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Rate limiting stats
    this.app.get('/api/rate-limits', async (req, res) => {
      try {
        const response = await fetch(`${config.get('rateGate.url')}/stats`);
        const stats = await response.json();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Rate gate service unavailable' });
      }
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(join(__dirname, '../dist')));
      this.app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../dist/index.html'));
      });
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      this.logger.error('Express error handler', { error, url: req.url, method: req.method });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  setupCronJobs() {
    // System health check every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        const health = await this.getHealthCheck();
        if (health.status !== 'healthy') {
          this.logger.warn('System health check failed', health);
        }
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    });

    // Hourly system metrics collection
    cron.schedule('0 * * * *', async () => {
      try {
        const metrics = await this.metricsCollector.collectSystemMetrics();
        await this.database.query(
          'INSERT INTO metrics (timestamp, metrics_data) VALUES ($1, $2)',
          [Date.now(), JSON.stringify(metrics)]
        );
      } catch (error) {
        this.logger.error('Failed to collect system metrics', error);
      }
    });

    // Daily cleanup job
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.database.query(`
          DELETE FROM price_data WHERE created_at < NOW() - INTERVAL '7 days';
          DELETE FROM metrics WHERE created_at < NOW() - INTERVAL '30 days';
        `);
        this.logger.info('Daily cleanup completed');
      } catch (error) {
        this.logger.error('Daily cleanup failed', error);
      }
    });
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      this.logger.info(`${signal} received, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        this.server.close();

        // Close WebSocket connections
        this.socketIO?.close();
        this.marketWS?.close();

        // Stop trading
        if (this.tradingEngine) {
          await this.tradingEngine.stop();
        }

        // Stop data collection
        if (this.dataManager) {
          await this.dataManager.stop();
        }

        // Close database connections
        if (this.database) {
          await this.database.close();
        }

        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // PM2 restart

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  async getHealthCheck() {
    const checks = {};
    const startTime = Date.now();

    try {
      // Database health
      const dbHealth = await this.database.healthCheck();
      checks.database = dbHealth.status === 'healthy';

      // Trading engine health
      checks.tradingEngine = this.tradingEngine?.isRunning || false;

      // Data manager health
      checks.dataManager = this.dataManager?.isConnected || false;

      // Model manager health
      checks.modelManager = this.modelManager?.isInitialized || false;

      // Risk manager health
      checks.riskManager = this.riskManager?.isActive || false;

      // Overall status
      const allHealthy = Object.values(checks).every(Boolean);
      const responseTime = Date.now() - startTime;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        responseTime,
        checks,
        version: this.systemState.version
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks
      };
    }
  }

  sendInitialData(socket) {
    // Send current system state and data
    socket.emit('system_state', this.systemState);
    socket.emit('positions_update', this.tradingEngine?.getPositions() || []);
    socket.emit('balance_update', this.tradingEngine?.getBalance() || {});
    socket.emit('models_update', this.modelManager?.getModelStatus() || []);
    socket.emit('metrics_update', this.metricsCollector?.getMetrics() || {});
    socket.emit('price_update', this.dataManager?.getCurrentPrices() || {});
  }

  async executeCommand(command) {
    const cmd = command.toLowerCase().trim();
    
    if (cmd.includes('start trading')) {
      return await this.startTrading();
    } else if (cmd.includes('stop trading')) {
      return await this.stopTrading();
    } else if (cmd.includes('retrain')) {
      return await this.retrainModels();
    } else {
      throw new Error('Unknown command');
    }
  }

  async startTrading() {
    if (this.systemState.emergencyStop) {
      throw new Error('Cannot start trading - Emergency stop is active');
    }
    
    this.systemState.isRunning = true;
    await this.tradingEngine.start();
    this.logger.business('trading_started');
    return 'Trading started successfully';
  }

  async stopTrading() {
    this.systemState.isRunning = false;
    await this.tradingEngine.stop();
    this.logger.business('trading_stopped');
    return 'Trading stopped successfully';
  }

  async setTradingMode(mode) {
    if (!['paper', 'live'].includes(mode)) {
      throw new Error('Invalid trading mode');
    }
    
    this.systemState.tradingMode = mode;
    await this.tradingEngine.setMode(mode);
    this.logger.business('trading_mode_changed', { mode });
  }

  async emergencyStop() {
    this.systemState.emergencyStop = true;
    this.systemState.isRunning = false;
    
    await this.tradingEngine.emergencyStop();
    this.logger.warn('Emergency stop activated');
  }

  async retrainModels() {
    this.logger.info('Starting model retraining');
    await this.modelManager.retrainAll();
    return 'Model retraining completed';
  }

  async start() {
    try {
      await this.initialize();
      
      const port = config.get('server.port');
      const host = config.get('server.host');
      
      this.server.listen(port, host, () => {
        this.logger.info(`🚀 AI Trading System started successfully!`, {
          port,
          host,
          environment: process.env.NODE_ENV,
          clustered: cluster.isWorker,
          pid: process.pid
        });
        
        this.logger.info(`📊 Backend: http://${host}:${port}`);
        this.logger.info(`🌐 Frontend: Build with 'npm run build' and serve from dist/`);
        this.logger.info(`💡 Features: PostgreSQL + TimescaleDB, Rate limiting, ML-Ops, Real-time WebSocket`);
        this.logger.info(`🔧 Status: All systems operational`);
      });

    } catch (error) {
      this.logger.error('Failed to start application', error);
      process.exit(1);
    }
  }
}

// Start the application
if (cluster.isMaster && config.get('performance.clustering.enabled')) {
  // Master process - fork workers
  const numWorkers = config.get('performance.clustering.workers') || os.cpus().length;
  
  console.log(`Master ${process.pid} starting ${numWorkers} workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process or single process mode
  const app = new TradingSystemApp();
  app.start();
}

export default TradingSystemApp; 