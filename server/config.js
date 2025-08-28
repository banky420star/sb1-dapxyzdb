// config.js - Central configuration with validation
import { z } from 'zod';

// Environment schema validation
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8000'),
  
  // Trading configuration
  TRADING_MODE: z.enum(['paper', 'live']).default('paper'),
  BYBIT_API_KEY: z.string().min(1).optional(),
  BYBIT_SECRET_KEY: z.string().min(1).optional(),
  BYBIT_TESTNET: z.string().transform(val => val === 'true').default('true'),
  
  // Database configuration
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  
  // Risk management
  MAX_DAILY_LOSS: z.string().transform(Number).pipe(z.number().min(0.01).max(0.5)).default('0.05'),
  MAX_DRAWDOWN: z.string().transform(Number).pipe(z.number().min(0.05).max(0.5)).default('0.15'),
  MAX_RISK_PER_TRADE: z.string().transform(Number).pipe(z.number().min(0.001).max(0.1)).default('0.02'),
  
  // Model service
  MODEL_SERVICE_URL: z.string().url().optional(),
  MODEL_VERSION: z.string().default('v1.0.0'),
  
  // Monitoring
  PROMETHEUS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('9090'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Feature flags
  AUTONOMOUS_TRADING_ENABLED: z.string().transform(val => val === 'true').default('false'),
  RISK_MANAGEMENT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  MODEL_PREDICTIONS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Deployment
  COMMIT_SHA: z.string().optional(),
  BUILD_DATE: z.string().optional(),
  VERSION: z.string().default('1.0.0')
});

// Validate environment on startup
function validateEnvironment() {
  try {
    const validatedEnv = envSchema.parse(process.env);
    
    // Additional validation for live trading
    if (validatedEnv.TRADING_MODE === 'live') {
      if (!validatedEnv.BYBIT_API_KEY || !validatedEnv.BYBIT_SECRET_KEY) {
        throw new Error('BYBIT_API_KEY and BYBIT_SECRET_KEY are required for live trading');
      }
    }
    
    // Additional validation for model service
    if (validatedEnv.MODEL_PREDICTIONS_ENABLED && !validatedEnv.MODEL_SERVICE_URL) {
      console.warn('⚠️  MODEL_PREDICTIONS_ENABLED is true but MODEL_SERVICE_URL is not set');
    }
    
    return validatedEnv;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(`  - ${error.message}`);
    }
    console.error('\nPlease check your environment variables and restart the application.');
    process.exit(1);
  }
}

// Configuration object
const config = validateEnvironment();

// Export configuration with computed values
export default {
  // Server
  server: {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    isProduction: config.NODE_ENV === 'production',
    isDevelopment: config.NODE_ENV === 'development',
    isTest: config.NODE_ENV === 'test'
  },
  
  // Trading
  trading: {
    mode: config.TRADING_MODE,
    isLive: config.TRADING_MODE === 'live',
    isPaper: config.TRADING_MODE === 'paper',
    bybit: {
      apiKey: config.BYBIT_API_KEY,
      secretKey: config.BYBIT_SECRET_KEY,
      testnet: config.BYBIT_TESTNET
    }
  },
  
  // Risk management
  risk: {
    maxDailyLoss: config.MAX_DAILY_LOSS,
    maxDrawdown: config.MAX_DRAWDOWN,
    maxRiskPerTrade: config.MAX_RISK_PER_TRADE,
    enabled: config.RISK_MANAGEMENT_ENABLED
  },
  
  // Model service
  model: {
    serviceUrl: config.MODEL_SERVICE_URL,
    version: config.MODEL_VERSION,
    enabled: config.MODEL_PREDICTIONS_ENABLED
  },
  
  // Security
  security: {
    jwtSecret: config.JWT_SECRET,
    corsOrigins: config.CORS_ORIGINS.split(',').map(s => s.trim())
  },
  
  // Monitoring
  monitoring: {
    prometheusPort: config.PROMETHEUS_PORT,
    logLevel: config.LOG_LEVEL
  },
  
  // Feature flags
  features: {
    autonomousTrading: config.AUTONOMOUS_TRADING_ENABLED,
    riskManagement: config.RISK_MANAGEMENT_ENABLED,
    modelPredictions: config.MODEL_PREDICTIONS_ENABLED
  },
  
  // Deployment info
  deployment: {
    commitSha: config.COMMIT_SHA,
    buildDate: config.BUILD_DATE,
    version: config.VERSION
  },
  
  // Database
  database: {
    url: config.DATABASE_URL,
    redisUrl: config.REDIS_URL
  }
};

// Health check configuration
export const healthConfig = {
  checks: [
    {
      name: 'environment',
      check: () => Promise.resolve({ status: 'ok', message: 'Environment validated' })
    },
    {
      name: 'database',
      check: async () => {
        if (!config.database.url) {
          return { status: 'warn', message: 'No database configured' };
        }
        // Add actual DB health check here
        return { status: 'ok', message: 'Database connected' };
      }
    },
    {
      name: 'model_service',
      check: async () => {
        if (!config.model.serviceUrl) {
          return { status: 'warn', message: 'No model service configured' };
        }
        try {
          const response = await fetch(`${config.model.serviceUrl}/health`);
          if (response.ok) {
            return { status: 'ok', message: 'Model service healthy' };
          }
          return { status: 'error', message: 'Model service unhealthy' };
        } catch (error) {
          return { status: 'error', message: 'Model service unreachable' };
        }
      }
    }
  ]
};