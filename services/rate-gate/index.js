const express = require('express');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Rate Gate connected to Redis');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
})();

// Rate limiting configuration
const RATE_LIMITS = {
  alphavantage: {
    limit: parseInt(process.env.RATE_LIMIT_ALPHA_VANTAGE) || 5,
    window: 60000, // 1 minute
    key: 'rate_limit:alphavantage'
  },
  bybit: {
    limit: parseInt(process.env.RATE_LIMIT_BYBIT) || 100,
    window: 60000, // 1 minute  
    key: 'rate_limit:bybit'
  }
};

// Rate limiting function
async function checkRateLimit(provider) {
  const config = RATE_LIMITS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const now = Date.now();
  const windowStart = now - config.window;
  
  // Get current count
  const key = config.key;
  const count = await redisClient.zCount(key, windowStart, now);
  
  // Check if limit exceeded
  if (count >= config.limit) {
    return {
      allowed: false,
      count,
      limit: config.limit,
      resetTime: windowStart + config.window,
      backoffSeconds: Math.ceil((windowStart + config.window - now) / 1000)
    };
  }

  // Add current request
  await redisClient.zAdd(key, { score: now, value: now.toString() });
  
  // Clean old entries
  await redisClient.zRemRangeByScore(key, 0, windowStart);
  
  // Set expiry
  await redisClient.expire(key, Math.ceil(config.window / 1000));

  return {
    allowed: true,
    count: count + 1,
    limit: config.limit,
    remaining: config.limit - count - 1,
    resetTime: windowStart + config.window
  };
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    redis: redisClient.isReady ? 'connected' : 'disconnected'
  });
});

// Check rate limit
app.post('/check/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const result = await checkRateLimit(provider);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        ...result
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get current status
app.get('/status/:provider?', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider) {
      const config = RATE_LIMITS[provider];
      if (!config) {
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }
      
      const now = Date.now();
      const windowStart = now - config.window;
      const count = await redisClient.zCount(config.key, windowStart, now);
      
      res.json({
        provider,
        count,
        limit: config.limit,
        remaining: config.limit - count,
        utilizationPercent: ((count / config.limit) * 100).toFixed(1),
        resetTime: windowStart + config.window
      });
    } else {
      // Return status for all providers
      const statuses = {};
      
      for (const [providerName, config] of Object.entries(RATE_LIMITS)) {
        const now = Date.now();
        const windowStart = now - config.window;
        const count = await redisClient.zCount(config.key, windowStart, now);
        
        statuses[providerName] = {
          count,
          limit: config.limit,
          remaining: config.limit - count,
          utilizationPercent: ((count / config.limit) * 100).toFixed(1),
          resetTime: windowStart + config.window
        };
      }
      
      res.json(statuses);
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Reset rate limits (emergency use only)
app.post('/reset/:provider?', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider) {
      const config = RATE_LIMITS[provider];
      if (!config) {
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }
      
      await redisClient.del(config.key);
      console.log(`⚠️ Rate limit reset for provider: ${provider}`);
      
      res.json({ 
        message: `Rate limit reset for ${provider}`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Reset all providers
      for (const config of Object.values(RATE_LIMITS)) {
        await redisClient.del(config.key);
      }
      
      console.log('⚠️ Rate limits reset for all providers');
      
      res.json({ 
        message: 'Rate limits reset for all providers',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', async (req, res) => {
  try {
    let metrics = '';
    
    for (const [providerName, config] of Object.entries(RATE_LIMITS)) {
      const now = Date.now();
      const windowStart = now - config.window;
      const count = await redisClient.zCount(config.key, windowStart, now);
      const utilization = count / config.limit;
      
      metrics += `# HELP rate_gate_requests_total Total requests for provider\n`;
      metrics += `# TYPE rate_gate_requests_total counter\n`;
      metrics += `rate_gate_requests_total{provider="${providerName}"} ${count}\n`;
      
      metrics += `# HELP rate_gate_utilization_ratio Current utilization ratio\n`;
      metrics += `# TYPE rate_gate_utilization_ratio gauge\n`;
      metrics += `rate_gate_utilization_ratio{provider="${providerName}"} ${utilization.toFixed(3)}\n`;
      
      metrics += `# HELP rate_gate_backoff_count Number of requests in backoff\n`;
      metrics += `# TYPE rate_gate_backoff_count gauge\n`;
      metrics += `rate_gate_backoff_count{provider="${providerName}"} ${count >= config.limit ? 1 : 0}\n`;
    }
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rate Gate service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Rate Gate service...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Rate Gate service...');
  await redisClient.quit();
  process.exit(0);
}); 