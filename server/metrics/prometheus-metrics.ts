/**
 * Prometheus Metrics - Comprehensive metrics collection for the trading system
 * Provides /metrics endpoint with orders/sec, fill %, error buckets, P&L, DD, pod weights, mode
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics({ register });

// Trading metrics
export const tradingMetrics = {
  // Order metrics
  ordersTotal: new Counter({
    name: 'trading_orders_total',
    help: 'Total number of orders submitted',
    labelNames: ['symbol', 'side', 'type', 'status']
  }),
  
  orderLatency: new Histogram({
    name: 'trading_order_latency_seconds',
    help: 'Order processing latency in seconds',
    labelNames: ['symbol', 'type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),
  
  fillRate: new Gauge({
    name: 'trading_fill_rate',
    help: 'Order fill rate percentage',
    labelNames: ['symbol']
  }),
  
  // P&L metrics
  totalPnL: new Gauge({
    name: 'trading_total_pnl',
    help: 'Total P&L in USD',
    labelNames: ['mode']
  }),
  
  dailyPnL: new Gauge({
    name: 'trading_daily_pnl',
    help: 'Daily P&L in USD',
    labelNames: ['mode']
  }),
  
  maxDrawdown: new Gauge({
    name: 'trading_max_drawdown',
    help: 'Maximum drawdown percentage',
    labelNames: ['mode']
  }),
  
  currentDrawdown: new Gauge({
    name: 'trading_current_drawdown',
    help: 'Current drawdown percentage',
    labelNames: ['mode']
  }),
  
  // Risk metrics
  riskUtilization: new Gauge({
    name: 'trading_risk_utilization',
    help: 'Risk utilization percentage',
    labelNames: ['symbol']
  }),
  
  positionCount: new Gauge({
    name: 'trading_positions_count',
    help: 'Number of open positions',
    labelNames: ['symbol', 'side']
  }),
  
  exposureUSD: new Gauge({
    name: 'trading_exposure_usd',
    help: 'Total exposure in USD',
    labelNames: ['symbol']
  }),
  
  // Alpha pod metrics
  podWeights: new Gauge({
    name: 'alpha_pod_weights',
    help: 'Alpha pod weights',
    labelNames: ['symbol', 'pod']
  }),
  
  podSignals: new Counter({
    name: 'alpha_pod_signals_total',
    help: 'Total alpha pod signals generated',
    labelNames: ['symbol', 'pod', 'signal_type']
  }),
  
  podConfidence: new Histogram({
    name: 'alpha_pod_confidence',
    help: 'Alpha pod signal confidence',
    labelNames: ['symbol', 'pod'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  }),
  
  podPerformance: new Gauge({
    name: 'alpha_pod_performance',
    help: 'Alpha pod performance metrics',
    labelNames: ['symbol', 'pod', 'metric']
  }),
  
  // Meta allocator metrics
  metaAllocatorWeights: new Gauge({
    name: 'meta_allocator_weights',
    help: 'Meta allocator weights',
    labelNames: ['symbol', 'pod']
  }),
  
  metaAllocatorUpdates: new Counter({
    name: 'meta_allocator_updates_total',
    help: 'Total meta allocator weight updates',
    labelNames: ['symbol']
  }),
  
  // Risk engine metrics
  riskViolations: new Counter({
    name: 'risk_violations_total',
    help: 'Total risk violations',
    labelNames: ['type', 'severity']
  }),
  
  circuitBreakerStatus: new Gauge({
    name: 'circuit_breaker_status',
    help: 'Circuit breaker status (1=halted, 0=active)',
    labelNames: ['type']
  }),
  
  riskChecks: new Counter({
    name: 'risk_checks_total',
    help: 'Total risk checks performed',
    labelNames: ['type', 'result']
  }),
  
  // OMS metrics
  omsOrders: new Counter({
    name: 'oms_orders_total',
    help: 'Total OMS orders processed',
    labelNames: ['status', 'exchange']
  }),
  
  omsLatency: new Histogram({
    name: 'oms_order_latency_seconds',
    help: 'OMS order processing latency',
    labelNames: ['exchange'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
  }),
  
  omsErrors: new Counter({
    name: 'oms_errors_total',
    help: 'Total OMS errors',
    labelNames: ['type', 'exchange']
  }),
  
  // Exchange metrics
  exchangeConnections: new Gauge({
    name: 'exchange_connections',
    help: 'Exchange connection status (1=connected, 0=disconnected)',
    labelNames: ['exchange']
  }),
  
  exchangeMessages: new Counter({
    name: 'exchange_messages_total',
    help: 'Total exchange messages received',
    labelNames: ['exchange', 'type']
  }),
  
  exchangeLatency: new Histogram({
    name: 'exchange_latency_seconds',
    help: 'Exchange API latency',
    labelNames: ['exchange', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2]
  }),
  
  // System metrics
  tradingMode: new Gauge({
    name: 'trading_mode',
    help: 'Current trading mode (0=halt, 1=paper, 2=live)',
    labelNames: ['mode']
  }),
  
  systemHealth: new Gauge({
    name: 'system_health',
    help: 'System health status (1=healthy, 0=unhealthy)',
    labelNames: ['component']
  }),
  
  // Performance metrics
  memoryUsage: new Gauge({
    name: 'system_memory_usage_bytes',
    help: 'System memory usage in bytes',
    labelNames: ['component']
  }),
  
  cpuUsage: new Gauge({
    name: 'system_cpu_usage_percent',
    help: 'System CPU usage percentage',
    labelNames: ['component']
  }),
  
  // Database metrics
  databaseConnections: new Gauge({
    name: 'database_connections',
    help: 'Number of database connections',
    labelNames: ['database']
  }),
  
  databaseQueries: new Counter({
    name: 'database_queries_total',
    help: 'Total database queries',
    labelNames: ['database', 'type', 'status']
  }),
  
  databaseLatency: new Histogram({
    name: 'database_latency_seconds',
    help: 'Database query latency',
    labelNames: ['database', 'type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  })
};

// Custom metrics for trading-specific functionality
export const customMetrics = {
  // Sharpe ratio tracking
  sharpeRatio: new Gauge({
    name: 'trading_sharpe_ratio',
    help: 'Current Sharpe ratio',
    labelNames: ['period']
  }),
  
  // Win rate tracking
  winRate: new Gauge({
    name: 'trading_win_rate',
    help: 'Current win rate percentage',
    labelNames: ['period', 'symbol']
  }),
  
  // Volatility tracking
  realizedVolatility: new Gauge({
    name: 'trading_realized_volatility',
    help: 'Realized volatility',
    labelNames: ['symbol', 'period']
  }),
  
  // Kelly fraction tracking
  kellyFraction: new Gauge({
    name: 'trading_kelly_fraction',
    help: 'Current Kelly fraction',
    labelNames: ['symbol']
  }),
  
  // Model performance tracking
  modelAccuracy: new Gauge({
    name: 'model_accuracy',
    help: 'Model accuracy percentage',
    labelNames: ['model', 'symbol']
  }),
  
  modelPredictions: new Counter({
    name: 'model_predictions_total',
    help: 'Total model predictions',
    labelNames: ['model', 'symbol', 'outcome']
  })
};

// Utility functions for metric updates
export class MetricsCollector {
  private static instance: MetricsCollector;
  
  private constructor() {}
  
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  // Order metrics
  recordOrder(symbol: string, side: string, type: string, status: string): void {
    tradingMetrics.ordersTotal.inc({ symbol, side, type, status });
  }
  
  recordOrderLatency(symbol: string, type: string, latency: number): void {
    tradingMetrics.orderLatency.observe({ symbol, type }, latency);
  }
  
  updateFillRate(symbol: string, rate: number): void {
    tradingMetrics.fillRate.set({ symbol }, rate);
  }
  
  // P&L metrics
  updateTotalPnL(mode: string, pnl: number): void {
    tradingMetrics.totalPnL.set({ mode }, pnl);
  }
  
  updateDailyPnL(mode: string, pnl: number): void {
    tradingMetrics.dailyPnL.set({ mode }, pnl);
  }
  
  updateDrawdown(mode: string, maxDD: number, currentDD: number): void {
    tradingMetrics.maxDrawdown.set({ mode }, maxDD);
    tradingMetrics.currentDrawdown.set({ mode }, currentDD);
  }
  
  // Risk metrics
  updateRiskUtilization(symbol: string, utilization: number): void {
    tradingMetrics.riskUtilization.set({ symbol }, utilization);
  }
  
  updatePositionCount(symbol: string, side: string, count: number): void {
    tradingMetrics.positionCount.set({ symbol, side }, count);
  }
  
  updateExposure(symbol: string, exposure: number): void {
    tradingMetrics.exposureUSD.set({ symbol }, exposure);
  }
  
  // Alpha pod metrics
  updatePodWeight(symbol: string, pod: string, weight: number): void {
    tradingMetrics.podWeights.set({ symbol, pod }, weight);
  }
  
  recordPodSignal(symbol: string, pod: string, signalType: string): void {
    tradingMetrics.podSignals.inc({ symbol, pod, signalType });
  }
  
  recordPodConfidence(symbol: string, pod: string, confidence: number): void {
    tradingMetrics.podConfidence.observe({ symbol, pod }, confidence);
  }
  
  updatePodPerformance(symbol: string, pod: string, metric: string, value: number): void {
    tradingMetrics.podPerformance.set({ symbol, pod, metric }, value);
  }
  
  // Meta allocator metrics
  updateMetaAllocatorWeight(symbol: string, pod: string, weight: number): void {
    tradingMetrics.metaAllocatorWeights.set({ symbol, pod }, weight);
  }
  
  recordMetaAllocatorUpdate(symbol: string): void {
    tradingMetrics.metaAllocatorUpdates.inc({ symbol });
  }
  
  // Risk engine metrics
  recordRiskViolation(type: string, severity: string): void {
    tradingMetrics.riskViolations.inc({ type, severity });
  }
  
  updateCircuitBreakerStatus(type: string, isHalted: boolean): void {
    tradingMetrics.circuitBreakerStatus.set({ type }, isHalted ? 1 : 0);
  }
  
  recordRiskCheck(type: string, result: string): void {
    tradingMetrics.riskChecks.inc({ type, result });
  }
  
  // OMS metrics
  recordOMSOrder(status: string, exchange: string): void {
    tradingMetrics.omsOrders.inc({ status, exchange });
  }
  
  recordOMSLatency(exchange: string, latency: number): void {
    tradingMetrics.omsLatency.observe({ exchange }, latency);
  }
  
  recordOMSError(type: string, exchange: string): void {
    tradingMetrics.omsErrors.inc({ type, exchange });
  }
  
  // Exchange metrics
  updateExchangeConnection(exchange: string, isConnected: boolean): void {
    tradingMetrics.exchangeConnections.set({ exchange }, isConnected ? 1 : 0);
  }
  
  recordExchangeMessage(exchange: string, type: string): void {
    tradingMetrics.exchangeMessages.inc({ exchange, type });
  }
  
  recordExchangeLatency(exchange: string, endpoint: string, latency: number): void {
    tradingMetrics.exchangeLatency.observe({ exchange, endpoint }, latency);
  }
  
  // System metrics
  updateTradingMode(mode: string): void {
    const modeValue = mode === 'halt' ? 0 : mode === 'paper' ? 1 : 2;
    tradingMetrics.tradingMode.set({ mode }, modeValue);
  }
  
  updateSystemHealth(component: string, isHealthy: boolean): void {
    tradingMetrics.systemHealth.set({ component }, isHealthy ? 1 : 0);
  }
  
  // Performance metrics
  updateMemoryUsage(component: string, usage: number): void {
    tradingMetrics.memoryUsage.set({ component }, usage);
  }
  
  updateCPUUsage(component: string, usage: number): void {
    tradingMetrics.cpuUsage.set({ component }, usage);
  }
  
  // Database metrics
  updateDatabaseConnections(database: string, count: number): void {
    tradingMetrics.databaseConnections.set({ database }, count);
  }
  
  recordDatabaseQuery(database: string, type: string, status: string): void {
    tradingMetrics.databaseQueries.inc({ database, type, status });
  }
  
  recordDatabaseLatency(database: string, type: string, latency: number): void {
    tradingMetrics.databaseLatency.observe({ database, type }, latency);
  }
  
  // Custom metrics
  updateSharpeRatio(period: string, ratio: number): void {
    customMetrics.sharpeRatio.set({ period }, ratio);
  }
  
  updateWinRate(period: string, symbol: string, rate: number): void {
    customMetrics.winRate.set({ period, symbol }, rate);
  }
  
  updateRealizedVolatility(symbol: string, period: string, volatility: number): void {
    customMetrics.realizedVolatility.set({ symbol, period }, volatility);
  }
  
  updateKellyFraction(symbol: string, fraction: number): void {
    customMetrics.kellyFraction.set({ symbol }, fraction);
  }
  
  updateModelAccuracy(model: string, symbol: string, accuracy: number): void {
    customMetrics.modelAccuracy.set({ model, symbol }, accuracy);
  }
  
  recordModelPrediction(model: string, symbol: string, outcome: string): void {
    customMetrics.modelPredictions.inc({ model, symbol, outcome });
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();

// Export register for Express middleware
export { register };