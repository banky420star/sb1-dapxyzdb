// utils/logger.js - Structured logging with Pino
import pino from 'pino';
import config from '../config.js';

// Create base logger configuration
const loggerConfig = {
  level: config.monitoring.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => {
      // Add deployment info to all logs
      return {
        ...object,
        service: 'trading-api',
        version: config.deployment.version,
        commitSha: config.deployment.commitSha,
        environment: config.server.nodeEnv,
        tradingMode: config.trading.mode
      };
    }
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
};

// Create the main logger
const logger = pino(loggerConfig);

// Create specialized loggers for different components
export const loggers = {
  trading: logger.child({ component: 'trading' }),
  risk: logger.child({ component: 'risk' }),
  model: logger.child({ component: 'model' }),
  api: logger.child({ component: 'api' }),
  monitoring: logger.child({ component: 'monitoring' }),
  database: logger.child({ component: 'database' })
};

// Audit trail logger for trading decisions
export const auditLogger = logger.child({ 
  component: 'audit',
  type: 'trading_decision'
});

// Function to log trading decisions with full context
export function logTradingDecision(decision) {
  const {
    symbol,
    side,
    qty,
    price,
    confidence,
    modelVersion,
    riskActions,
    idempotencyKey,
    timestamp = new Date().toISOString()
  } = decision;

  auditLogger.info({
    msg: 'Trading decision executed',
    decision: {
      symbol,
      side,
      qty,
      price,
      confidence,
      modelVersion,
      riskActions,
      idempotencyKey,
      timestamp
    },
    metadata: {
      tradingMode: config.trading.mode,
      riskEnabled: config.risk.enabled,
      modelEnabled: config.model.enabled
    }
  });
}

// Function to log risk events
export function logRiskEvent(event) {
  const {
    type,
    symbol,
    action,
    reason,
    metadata = {}
  } = event;

  loggers.risk.warn({
    msg: 'Risk event triggered',
    event: {
      type,
      symbol,
      action,
      reason,
      timestamp: new Date().toISOString()
    },
    metadata: {
      ...metadata,
      currentDrawdown: metadata.currentDrawdown,
      dailyPnL: metadata.dailyPnL
    }
  });
}

// Function to log model predictions
export function logModelPrediction(prediction) {
  const {
    symbol,
    signal,
    confidence,
    modelVersion,
    features,
    timestamp = new Date().toISOString()
  } = prediction;

  loggers.model.info({
    msg: 'Model prediction generated',
    prediction: {
      symbol,
      signal,
      confidence,
      modelVersion,
      timestamp
    },
    metadata: {
      featureCount: Object.keys(features || {}).length,
      modelServiceUrl: config.model.serviceUrl
    }
  });
}

// Function to log API requests with performance metrics
export function logApiRequest(req, res, responseTime) {
  const { method, url, headers } = req;
  const { statusCode } = res;

  loggers.api.info({
    msg: 'API request processed',
    request: {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: headers['user-agent'],
      ip: req.ip
    },
    metadata: {
      tradingMode: config.trading.mode,
      riskEnabled: config.risk.enabled
    }
  });
}

// Function to log errors with context
export function logError(error, context = {}) {
  logger.error({
    msg: 'Application error',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context: {
      ...context,
      timestamp: new Date().toISOString()
    }
  });
}

// Function to log performance metrics
export function logPerformance(metric) {
  const {
    name,
    value,
    unit = 'ms',
    tags = {},
    timestamp = new Date().toISOString()
  } = metric;

  loggers.monitoring.info({
    msg: 'Performance metric',
    metric: {
      name,
      value,
      unit,
      timestamp
    },
    tags: {
      ...tags,
      environment: config.server.nodeEnv,
      tradingMode: config.trading.mode
    }
  });
}

// Export the main logger for backward compatibility
export { logger as default };