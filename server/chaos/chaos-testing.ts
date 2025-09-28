/**
 * Chaos Testing - Failure drills and resilience testing
 * Provides chaos testing for WS disconnects, 429 storms, stale prices, and trade-storm simulation
 */

import { LoggerFactory } from '../logging/structured-logger.js';
import { metrics } from '../metrics/prometheus-metrics.js';
import { EventEmitter } from 'events';

export interface ChaosTest {
  name: string;
  description: string;
  enabled: boolean;
  probability: number; // 0-1, probability of triggering
  duration: number; // milliseconds
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'exchange' | 'data' | 'system' | 'trading';
}

export interface ChaosResult {
  testName: string;
  triggered: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  impact: string;
  recoveryTime?: number;
}

export class ChaosEngine extends EventEmitter {
  private logger = LoggerFactory.getSystemLogger();
  private tests: Map<string, ChaosTest> = new Map();
  private activeTests: Map<string, NodeJS.Timeout> = new Map();
  private results: ChaosResult[] = [];
  private isEnabled: boolean = false;
  
  constructor() {
    super();
    this.initializeTests();
  }
  
  private initializeTests(): void {
    // Network chaos tests
    this.addTest({
      name: 'websocket_disconnect',
      description: 'Simulate WebSocket disconnection',
      enabled: false,
      probability: 0.1,
      duration: 5000,
      impact: 'medium',
      category: 'network'
    });
    
    this.addTest({
      name: 'network_latency_spike',
      description: 'Simulate network latency spike',
      enabled: false,
      probability: 0.05,
      duration: 10000,
      impact: 'medium',
      category: 'network'
    });
    
    // Exchange chaos tests
    this.addTest({
      name: 'exchange_rate_limit_storm',
      description: 'Simulate 429 rate limit storm',
      enabled: false,
      probability: 0.02,
      duration: 30000,
      impact: 'high',
      category: 'exchange'
    });
    
    this.addTest({
      name: 'exchange_timeout',
      description: 'Simulate exchange API timeout',
      enabled: false,
      probability: 0.03,
      duration: 15000,
      impact: 'medium',
      category: 'exchange'
    });
    
    this.addTest({
      name: 'exchange_partial_failure',
      description: 'Simulate partial exchange failure',
      enabled: false,
      probability: 0.01,
      duration: 20000,
      impact: 'high',
      category: 'exchange'
    });
    
    // Data chaos tests
    this.addTest({
      name: 'stale_price_data',
      description: 'Simulate stale price data',
      enabled: false,
      probability: 0.05,
      duration: 8000,
      impact: 'medium',
      category: 'data'
    });
    
    this.addTest({
      name: 'corrupted_market_data',
      description: 'Simulate corrupted market data',
      enabled: false,
      probability: 0.02,
      duration: 5000,
      impact: 'medium',
      category: 'data'
    });
    
    // System chaos tests
    this.addTest({
      name: 'memory_pressure',
      description: 'Simulate memory pressure',
      enabled: false,
      probability: 0.01,
      duration: 12000,
      impact: 'high',
      category: 'system'
    });
    
    this.addTest({
      name: 'cpu_spike',
      description: 'Simulate CPU spike',
      enabled: false,
      probability: 0.02,
      duration: 10000,
      impact: 'medium',
      category: 'system'
    });
    
    // Trading chaos tests
    this.addTest({
      name: 'trade_storm_simulation',
      description: 'Simulate rapid trade execution storm',
      enabled: false,
      probability: 0.01,
      duration: 60000,
      impact: 'critical',
      category: 'trading'
    });
    
    this.addTest({
      name: 'position_sizing_failure',
      description: 'Simulate position sizing calculation failure',
      enabled: false,
      probability: 0.02,
      duration: 3000,
      impact: 'high',
      category: 'trading'
    });
    
    this.addTest({
      name: 'risk_engine_bypass',
      description: 'Simulate risk engine bypass attempt',
      enabled: false,
      probability: 0.01,
      duration: 5000,
      impact: 'critical',
      category: 'trading'
    });
  }
  
  addTest(test: ChaosTest): void {
    this.tests.set(test.name, test);
    this.logger.info({ test: test.name }, `Chaos test added: ${test.name}`);
  }
  
  removeTest(testName: string): void {
    if (this.tests.has(testName)) {
      this.tests.delete(testName);
      this.logger.info({ test: testName }, `Chaos test removed: ${testName}`);
    }
  }
  
  enableTest(testName: string): void {
    const test = this.tests.get(testName);
    if (test) {
      test.enabled = true;
      this.logger.info({ test: testName }, `Chaos test enabled: ${testName}`);
    }
  }
  
  disableTest(testName: string): void {
    const test = this.tests.get(testName);
    if (test) {
      test.enabled = false;
      this.logger.info({ test: testName }, `Chaos test disabled: ${testName}`);
    }
  }
  
  enable(): void {
    this.isEnabled = true;
    this.logger.warn({}, 'Chaos testing ENABLED - system may experience failures');
    this.emit('enabled');
  }
  
  disable(): void {
    this.isEnabled = false;
    this.logger.info({}, 'Chaos testing DISABLED');
    this.emit('disabled');
    
    // Stop all active tests
    for (const [testName, timeout] of this.activeTests) {
      clearTimeout(timeout);
      this.activeTests.delete(testName);
      this.logger.info({ test: testName }, `Active chaos test stopped: ${testName}`);
    }
  }
  
  isChaosEnabled(): boolean {
    return this.isEnabled;
  }
  
  getTests(): ChaosTest[] {
    return Array.from(this.tests.values());
  }
  
  getActiveTests(): string[] {
    return Array.from(this.activeTests.keys());
  }
  
  getResults(): ChaosResult[] {
    return [...this.results];
  }
  
  // Main chaos testing method
  async runChaosTest(testName: string): Promise<ChaosResult> {
    const test = this.tests.get(testName);
    if (!test) {
      throw new Error(`Chaos test not found: ${testName}`);
    }
    
    if (!test.enabled) {
      return {
        testName,
        triggered: false,
        startTime: Date.now(),
        success: true,
        impact: test.impact
      };
    }
    
    const result: ChaosResult = {
      testName,
      triggered: false,
      startTime: Date.now(),
      success: false,
      impact: test.impact
    };
    
    try {
      this.logger.warn({ test: testName }, `Starting chaos test: ${testName}`);
      
      // Check if we should trigger this test
      if (Math.random() < test.probability) {
        result.triggered = true;
        this.emit('chaosStart', testName, test);
        
        // Execute the specific chaos test
        await this.executeChaosTest(testName, test);
        
        result.success = true;
        this.logger.info({ test: testName }, `Chaos test completed successfully: ${testName}`);
      } else {
        result.success = true;
        this.logger.debug({ test: testName }, `Chaos test not triggered (probability): ${testName}`);
      }
    } catch (error: any) {
      result.error = error.message;
      this.logger.error({ test: testName, error }, `Chaos test failed: ${testName}`);
    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      this.results.push(result);
      
      // Keep only last 100 results
      if (this.results.length > 100) {
        this.results = this.results.slice(-100);
      }
      
      this.emit('chaosEnd', testName, result);
    }
    
    return result;
  }
  
  private async executeChaosTest(testName: string, test: ChaosTest): Promise<void> {
    switch (testName) {
      case 'websocket_disconnect':
        await this.simulateWebSocketDisconnect(test);
        break;
      case 'network_latency_spike':
        await this.simulateNetworkLatencySpike(test);
        break;
      case 'exchange_rate_limit_storm':
        await this.simulateExchangeRateLimitStorm(test);
        break;
      case 'exchange_timeout':
        await this.simulateExchangeTimeout(test);
        break;
      case 'exchange_partial_failure':
        await this.simulateExchangePartialFailure(test);
        break;
      case 'stale_price_data':
        await this.simulateStalePriceData(test);
        break;
      case 'corrupted_market_data':
        await this.simulateCorruptedMarketData(test);
        break;
      case 'memory_pressure':
        await this.simulateMemoryPressure(test);
        break;
      case 'cpu_spike':
        await this.simulateCPUSpike(test);
        break;
      case 'trade_storm_simulation':
        await this.simulateTradeStorm(test);
        break;
      case 'position_sizing_failure':
        await this.simulatePositionSizingFailure(test);
        break;
      case 'risk_engine_bypass':
        await this.simulateRiskEngineBypass(test);
        break;
      default:
        throw new Error(`Unknown chaos test: ${testName}`);
    }
  }
  
  // Chaos test implementations
  private async simulateWebSocketDisconnect(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating WebSocket disconnection');
    this.emit('websocketDisconnect', { duration: test.duration });
    
    // Simulate disconnection for the specified duration
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'WebSocket disconnection simulation ended');
    this.emit('websocketReconnect');
  }
  
  private async simulateNetworkLatencySpike(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating network latency spike');
    this.emit('networkLatencySpike', { duration: test.duration, latency: 5000 });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Network latency spike simulation ended');
    this.emit('networkLatencyNormal');
  }
  
  private async simulateExchangeRateLimitStorm(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating exchange rate limit storm');
    this.emit('exchangeRateLimit', { duration: test.duration });
    
    // Simulate multiple 429 errors
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.emit('exchangeError', { 
          type: 'rate_limit', 
          message: 'Rate limit exceeded',
          retryAfter: 60
        });
      }, i * 1000);
    }
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Exchange rate limit storm simulation ended');
  }
  
  private async simulateExchangeTimeout(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating exchange timeout');
    this.emit('exchangeTimeout', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Exchange timeout simulation ended');
  }
  
  private async simulateExchangePartialFailure(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating exchange partial failure');
    this.emit('exchangePartialFailure', { duration: test.duration });
    
    // Simulate intermittent failures
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.emit('exchangeError', { 
          type: 'partial_failure', 
          message: 'Partial service unavailable'
        });
      }, i * 2000);
    }
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Exchange partial failure simulation ended');
  }
  
  private async simulateStalePriceData(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating stale price data');
    this.emit('stalePriceData', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Stale price data simulation ended');
  }
  
  private async simulateCorruptedMarketData(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating corrupted market data');
    this.emit('corruptedMarketData', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Corrupted market data simulation ended');
  }
  
  private async simulateMemoryPressure(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating memory pressure');
    this.emit('memoryPressure', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Memory pressure simulation ended');
  }
  
  private async simulateCPUSpike(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating CPU spike');
    this.emit('cpuSpike', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'CPU spike simulation ended');
  }
  
  private async simulateTradeStorm(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating trade storm');
    this.emit('tradeStorm', { duration: test.duration });
    
    // Simulate rapid trade execution
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        this.emit('rapidTrade', { 
          symbol: 'BTCUSDT',
          side: i % 2 === 0 ? 'buy' : 'sell',
          quantity: 0.001,
          price: 50000 + (i % 100)
        });
      }, i * 100);
    }
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Trade storm simulation ended');
  }
  
  private async simulatePositionSizingFailure(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating position sizing failure');
    this.emit('positionSizingFailure', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Position sizing failure simulation ended');
  }
  
  private async simulateRiskEngineBypass(test: ChaosTest): Promise<void> {
    this.logger.warn({ test: test.name }, 'Simulating risk engine bypass attempt');
    this.emit('riskEngineBypass', { duration: test.duration });
    
    await new Promise(resolve => setTimeout(resolve, test.duration));
    
    this.logger.info({ test: test.name }, 'Risk engine bypass simulation ended');
  }
  
  // Run all enabled tests
  async runAllTests(): Promise<ChaosResult[]> {
    const results: ChaosResult[] = [];
    
    for (const [testName, test] of this.tests) {
      if (test.enabled && this.isEnabled) {
        try {
          const result = await this.runChaosTest(testName);
          results.push(result);
        } catch (error: any) {
          this.logger.error({ test: testName, error }, `Failed to run chaos test: ${testName}`);
          results.push({
            testName,
            triggered: false,
            startTime: Date.now(),
            success: false,
            error: error.message,
            impact: test.impact
          });
        }
      }
    }
    
    return results;
  }
  
  // Schedule periodic chaos testing
  startPeriodicTesting(intervalMs: number = 300000): void { // 5 minutes default
    this.logger.info({ interval: intervalMs }, 'Starting periodic chaos testing');
    
    const runPeriodic = () => {
      if (this.isEnabled) {
        this.runAllTests().catch(error => {
          this.logger.error({ error }, 'Periodic chaos testing failed');
        });
      }
      
      setTimeout(runPeriodic, intervalMs);
    };
    
    setTimeout(runPeriodic, intervalMs);
  }
  
  // Get chaos testing statistics
  getStats(): {
    totalTests: number;
    enabledTests: number;
    activeTests: number;
    totalResults: number;
    successRate: number;
    lastRun?: Date;
  } {
    const enabledTests = Array.from(this.tests.values()).filter(t => t.enabled).length;
    const successfulResults = this.results.filter(r => r.success).length;
    const successRate = this.results.length > 0 ? successfulResults / this.results.length : 0;
    const lastRun = this.results.length > 0 ? new Date(this.results[this.results.length - 1].startTime) : undefined;
    
    return {
      totalTests: this.tests.size,
      enabledTests,
      activeTests: this.activeTests.size,
      totalResults: this.results.length,
      successRate,
      lastRun
    };
  }
}

// Singleton instance
export const chaosEngine = new ChaosEngine();

// Export types and utilities
export { ChaosTest, ChaosResult };