import express from 'express';
import Redis from 'ioredis';
import { Logger } from '../../server/utils/logger.js';

class RateGate {
  constructor() {
    this.app = express();
    this.logger = new Logger();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Rate limit configurations
    this.limits = {
      ALPHA_VANTAGE: {
        requests: parseInt(process.env.ALPHA_VANTAGE_LIMIT) || 5,
        window: 60, // 1 minute window
        warningThreshold: parseFloat(process.env.WARNING_THRESHOLD) || 0.8
      },
      BYBIT: {
        requests: parseInt(process.env.BYBIT_LIMIT) || 120,
        window: 60, // 1 minute window
        warningThreshold: parseFloat(process.env.WARNING_THRESHOLD) || 0.8
      }
    };
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        redis: this.redis.status 
      });
    });

    // Rate limit check and consumption
    this.app.post('/consume/:provider', async (req, res) => {
      try {
        const { provider } = req.params;
        const { tokens = 1 } = req.body;
        
        const result = await this.consumeTokens(provider.toUpperCase(), tokens);
        
        if (result.allowed) {
          res.json({
            allowed: true,
            remaining: result.remaining,
            resetTime: result.resetTime,
            usage: result.usage
          });
        } else {
          res.status(429).json({
            allowed: false,
            retryAfter: result.retryAfter,
            usage: result.usage,
            message: 'Rate limit exceeded'
          });
        }
      } catch (error) {
        this.logger.error('Error in rate limit consumption:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get current usage stats
    this.app.get('/stats/:provider', async (req, res) => {
      try {
        const { provider } = req.params;
        const stats = await this.getUsageStats(provider.toUpperCase());
        res.json(stats);
      } catch (error) {
        this.logger.error('Error getting usage stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get all providers stats
    this.app.get('/stats', async (req, res) => {
      try {
        const allStats = {};
        for (const provider of Object.keys(this.limits)) {
          allStats[provider] = await this.getUsageStats(provider);
        }
        res.json(allStats);
      } catch (error) {
        this.logger.error('Error getting all stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Reset rate limit for a provider (admin endpoint)
    this.app.post('/reset/:provider', async (req, res) => {
      try {
        const { provider } = req.params;
        await this.resetRateLimit(provider.toUpperCase());
        res.json({ message: 'Rate limit reset successfully' });
      } catch (error) {
        this.logger.error('Error resetting rate limit:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async consumeTokens(provider, tokens = 1) {
    const config = this.limits[provider];
    if (!config) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const key = `rate_limit:${provider}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (config.window * 1000)) * config.window;
    const windowKey = `${key}:${windowStart}`;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, config.window);
    
    const results = await pipeline.exec();
    const currentCount = results[0][1];

    const remaining = Math.max(0, config.requests - currentCount);
    const usage = currentCount / config.requests;
    const resetTime = (windowStart + config.window) * 1000;

    // Check if we've exceeded the limit
    if (currentCount > config.requests) {
      // Remove the token we just added since we're over the limit
      await this.redis.decr(windowKey);
      
      return {
        allowed: false,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        usage: (currentCount - 1) / config.requests,
        remaining: 0
      };
    }

    // Check for warning threshold
    if (usage >= config.warningThreshold) {
      this.emitWarning(provider, usage, remaining);
    }

    return {
      allowed: true,
      remaining,
      resetTime,
      usage
    };
  }

  async getUsageStats(provider) {
    const config = this.limits[provider];
    if (!config) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const key = `rate_limit:${provider}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (config.window * 1000)) * config.window;
    const windowKey = `${key}:${windowStart}`;

    const currentCount = await this.redis.get(windowKey) || 0;
    const remaining = Math.max(0, config.requests - currentCount);
    const usage = currentCount / config.requests;
    const resetTime = (windowStart + config.window) * 1000;

    return {
      provider,
      limit: config.requests,
      used: parseInt(currentCount),
      remaining,
      usage,
      resetTime: new Date(resetTime).toISOString(),
      windowSeconds: config.window
    };
  }

  async resetRateLimit(provider) {
    const key = `rate_limit:${provider}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (this.limits[provider].window * 1000)) * this.limits[provider].window;
    const windowKey = `${key}:${windowStart}`;
    
    await this.redis.del(windowKey);
    this.logger.info(`Rate limit reset for provider: ${provider}`);
  }

  emitWarning(provider, usage, remaining) {
    const warningData = {
      type: 'rate_limit_warning',
      provider,
      usage: Math.round(usage * 100),
      remaining,
      timestamp: new Date().toISOString(),
      message: `${provider} API usage at ${Math.round(usage * 100)}% - ${remaining} requests remaining`
    };

    this.logger.warn('Rate limit warning:', warningData);

    // Publish warning to Redis for other services to consume
    this.redis.publish('rate_limit_warnings', JSON.stringify(warningData));
  }

  async start() {
    const port = process.env.PORT || 3002;
    
    // Wait for Redis connection
    await this.redis.ping();
    this.logger.info('Connected to Redis');

    this.app.listen(port, () => {
      this.logger.info(`🚦 Rate Gate service started on port ${port}`);
      this.logger.info('📊 Rate limits configured:', this.limits);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      await this.redis.quit();
      process.exit(0);
    });
  }
}

// Start the service
const rateGate = new RateGate();
rateGate.start().catch(error => {
  console.error('Failed to start Rate Gate service:', error);
  process.exit(1);
}); 