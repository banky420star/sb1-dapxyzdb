// server/routes/health.js
import { Router } from 'express'
import config, { healthConfig } from '../config.js'
import { getRiskState } from '../middleware/risk.js'
import { loggers } from '../utils/logger.js'

export const health = Router()

health.get('/health', async (_req, res) => {
  try {
    const startTime = Date.now();
    
    // Run health checks
    const checks = await Promise.all(
      healthConfig.checks.map(async (check) => {
        try {
          const result = await check.check();
          return {
            name: check.name,
            ...result
          };
        } catch (error) {
          return {
            name: check.name,
            status: 'error',
            message: error.message
          };
        }
      })
    );

    // Determine overall health status
    const hasErrors = checks.some(check => check.status === 'error');
    const hasWarnings = checks.some(check => check.status === 'warn');
    
    let status = 'healthy';
    if (hasErrors) status = 'unhealthy';
    else if (hasWarnings) status = 'degraded';

    const responseTime = Date.now() - startTime;

    const healthResponse = {
      ok: status === 'healthy',
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: config.deployment.version,
      commitSha: config.deployment.commitSha,
      environment: config.server.nodeEnv,
      tradingMode: config.trading.mode,
      features: {
        riskManagement: config.features.riskManagement,
        autonomousTrading: config.features.autonomousTrading,
        modelPredictions: config.features.modelPredictions
      },
      checks,
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Add risk state if risk management is enabled
    if (config.features.riskManagement) {
      healthResponse.risk = getRiskState();
    }

    loggers.monitoring.info({
      msg: 'Health check completed',
      status,
      responseTime,
      checks: checks.length
    });

    res.json(healthResponse);
  } catch (error) {
    loggers.monitoring.error({
      msg: 'Health check failed',
      error: error.message
    });
    
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

health.get('/version', (_req, res) => {
  res.json({
    app: 'AlgoTrader Pro',
    version: config.deployment.version,
    commitSha: config.deployment.commitSha,
    mode: config.trading.mode,
    environment: config.server.nodeEnv,
    features: config.features
  })
})
