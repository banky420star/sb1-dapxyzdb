/**
 * Risk Manager - Main orchestrator for risk management system
 * Integrates Risk Engine, Circuit Breakers, and Position Sizer
 */

import { EventEmitter } from 'events';
import { RiskEngine, Position, RiskMetrics, RiskViolation } from './risk-engine.js';
import { CircuitBreakers, CircuitBreakerAction } from './circuit-breakers.js';
import { PositionSizer, SizingContext, SizingResult } from './position-sizer.js';
import { RiskConfig, loadRiskConfig } from '../../config/risk.js';

export interface RiskManagerConfig extends RiskConfig {
  // Additional risk manager specific config
  enableCircuitBreakers: boolean;
  enablePositionSizing: boolean;
  enableRealTimeMonitoring: boolean;
  monitoringInterval: number; // ms
}

export interface RiskStatus {
  isHalted: boolean;
  haltReason: string | null;
  tradingMode: 'paper' | 'live' | 'halt';
  riskMetrics: RiskMetrics;
  circuitBreakerStatus: any;
  lastUpdate: number;
}

export class RiskManager extends EventEmitter {
  private config: RiskManagerConfig;
  private riskEngine: RiskEngine;
  private circuitBreakers: CircuitBreakers;
  private positionSizer: PositionSizer;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  constructor(config?: Partial<RiskManagerConfig>) {
    super();
    
    // Load and merge configuration
    const baseConfig = loadRiskConfig();
    this.config = {
      ...baseConfig,
      enableCircuitBreakers: true,
      enablePositionSizing: true,
      enableRealTimeMonitoring: true,
      monitoringInterval: 5000, // 5 seconds
      ...config
    };
    
    // Initialize components
    this.riskEngine = new RiskEngine(this.config);
    this.circuitBreakers = new CircuitBreakers(this.riskEngine, this.config);
    this.positionSizer = new PositionSizer(this.riskEngine, this.config);
    
    this.setupEventListeners();
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Risk Manager...');
      
      // Start real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startMonitoring();
      }
      
      this.isInitialized = true;
      console.log('Risk Manager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Risk Manager:', error);
      throw error;
    }
  }
  
  private setupEventListeners(): void {
    // Circuit breaker halt events
    this.circuitBreakers.onHalt((reason: string) => {
      this.emit('trading_halted', { reason, timestamp: Date.now() });
    });
    
    // Circuit breaker violation events
    this.circuitBreakers.onViolation((violation: RiskViolation) => {
      this.emit('risk_violation', violation);
    });
  }
  
  // Position sizing with full risk management
  calculatePositionSize(context: SizingContext): SizingResult {
    if (!this.config.enablePositionSizing) {
      return {
        size: 0,
        sizeUSD: 0,
        riskAmount: 0,
        riskPercent: 0,
        kellyFraction: 0,
        volatilityAdjustment: 1,
        correlationAdjustment: 1,
        confidenceAdjustment: 1,
        finalSize: 0,
        finalSizeUSD: 0,
        warnings: ['Position sizing disabled'],
        metadata: {
          maxSize: 0,
          maxSizeUSD: 0,
          stopLossDistance: 0,
          takeProfitDistance: 0,
          expectedReturn: 0,
          riskRewardRatio: 0
        }
      };
    }
    
    // Check if trading is allowed
    if (this.circuitBreakers.isHalted()) {
      return {
        size: 0,
        sizeUSD: 0,
        riskAmount: 0,
        riskPercent: 0,
        kellyFraction: 0,
        volatilityAdjustment: 1,
        correlationAdjustment: 1,
        confidenceAdjustment: 1,
        finalSize: 0,
        finalSizeUSD: 0,
        warnings: [`Trading halted: ${this.circuitBreakers.getHaltReason()}`],
        metadata: {
          maxSize: 0,
          maxSizeUSD: 0,
          stopLossDistance: 0,
          takeProfitDistance: 0,
          expectedReturn: 0,
          riskRewardRatio: 0
        }
      };
    }
    
    // Calculate position size
    const result = this.positionSizer.calculateSize(context);
    
    // Add risk warnings
    this.addRiskWarnings(result, context);
    
    return result;
  }
  
  // Validate signal before execution
  validateSignal(symbol: string, signal: number, confidence: number): { approved: boolean; reason?: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check circuit breakers
    if (this.circuitBreakers.isHalted()) {
      return {
        approved: false,
        reason: `Trading halted: ${this.circuitBreakers.getHaltReason()}`,
        warnings
      };
    }
    
    // Check confidence threshold
    if (confidence < this.config.confidenceThreshold) {
      return {
        approved: false,
        reason: `Confidence too low: ${(confidence * 100).toFixed(1)}% < ${(this.config.confidenceThreshold * 100).toFixed(1)}%`,
        warnings
      };
    }
    
    // Check signal strength
    if (Math.abs(signal) < 0.1) {
      return {
        approved: false,
        reason: 'Signal strength too weak',
        warnings
      };
    }
    
    // Check trading mode
    if (this.config.tradingMode === 'halt') {
      return {
        approved: false,
        reason: 'Trading mode set to halt',
        warnings
      };
    }
    
    // Check symbol limits
    const symbolLimits = this.config.symbolLimits[symbol];
    if (symbolLimits && !symbolLimits.enabled) {
      return {
        approved: false,
        reason: `Symbol ${symbol} is disabled`,
        warnings
      };
    }
    
    // Check current positions
    const currentPositions = this.riskEngine.getPositionsBySymbol(symbol);
    if (currentPositions.length > 0) {
      warnings.push(`Already have ${currentPositions.length} position(s) in ${symbol}`);
    }
    
    // Check daily trade count
    const dailyTradeCount = this.riskEngine.getRiskMetrics().dailyTradeCount;
    if (dailyTradeCount >= this.config.maxDailyTrades) {
      return {
        approved: false,
        reason: `Daily trade limit exceeded: ${dailyTradeCount}`,
        warnings
      };
    }
    
    return {
      approved: true,
      warnings
    };
  }
  
  // Update position
  updatePosition(position: Position): void {
    this.riskEngine.updatePosition(position);
    this.emit('position_updated', position);
  }
  
  // Remove position
  removePosition(positionId: string): void {
    this.riskEngine.removePosition(positionId);
    this.emit('position_removed', positionId);
  }
  
  // Record trade result
  recordTrade(symbol: string, pnl: number): void {
    this.riskEngine.recordTrade(symbol, pnl);
    
    // Update position sizer with historical data
    this.positionSizer.addReturn(symbol, pnl);
    
    this.emit('trade_recorded', { symbol, pnl, timestamp: Date.now() });
  }
  
  // Update price
  updatePrice(symbol: string, price: number): void {
    this.riskEngine.updatePrice(symbol, price);
    this.emit('price_updated', { symbol, price, timestamp: Date.now() });
  }
  
  // Manual halt (kill switch)
  manualHalt(reason: string = 'Manual halt activated'): void {
    this.circuitBreakers.manualHalt(reason);
    this.emit('manual_halt', { reason, timestamp: Date.now() });
  }
  
  // Manual resume (admin only)
  manualResume(reason: string = 'Manual resume'): void {
    this.circuitBreakers.manualResume(reason);
    this.emit('manual_resume', { reason, timestamp: Date.now() });
  }
  
  // Get current risk status
  getRiskStatus(): RiskStatus {
    return {
      isHalted: this.circuitBreakers.isHalted(),
      haltReason: this.circuitBreakers.getHaltReason(),
      tradingMode: this.config.tradingMode,
      riskMetrics: this.riskEngine.getRiskMetrics(),
      circuitBreakerStatus: this.circuitBreakers.getStatus(),
      lastUpdate: Date.now()
    };
  }
  
  // Get all positions
  getPositions(): Position[] {
    return this.riskEngine.getPositions();
  }
  
  // Get positions by symbol
  getPositionsBySymbol(symbol: string): Position[] {
    return this.riskEngine.getPositionsBySymbol(symbol);
  }
  
  // Get risk metrics
  getRiskMetrics(): RiskMetrics {
    return this.riskEngine.getRiskMetrics();
  }
  
  // Get circuit breaker violations
  getViolations(): RiskViolation[] {
    return this.circuitBreakers.getViolations();
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<RiskManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.riskEngine.updateConfig(this.config);
    this.circuitBreakers.updateConfig(this.config);
    
    this.emit('config_updated', this.config);
  }
  
  // Get current configuration
  getConfig(): RiskManagerConfig {
    return { ...this.config };
  }
  
  // Start real-time monitoring
  private startMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.monitoringTimer = setInterval(() => {
      this.performRiskCheck();
    }, this.config.monitoringInterval);
  }
  
  // Stop real-time monitoring
  private stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }
  
  // Perform comprehensive risk check
  private performRiskCheck(): void {
    if (!this.config.enableCircuitBreakers) {
      return;
    }
    
    try {
      // Check circuit breakers
      const action = this.circuitBreakers.check();
      
      // Emit action event
      this.emit('circuit_breaker_action', action);
      
      // Take action based on result
      switch (action.action) {
        case 'halt':
          // Trading is already halted by circuit breakers
          break;
          
        case 'reduce':
          // Emit signal to reduce trading activity
          this.emit('reduce_trading', action);
          break;
          
        case 'warn':
          // Emit warning
          this.emit('risk_warning', action);
          break;
          
        case 'continue':
          // All good, emit status update
          this.emit('risk_status_ok', action);
          break;
      }
      
      // Emit periodic status update
      this.emit('risk_monitor_update', this.getRiskStatus());
      
    } catch (error) {
      console.error('Error in risk monitoring:', error);
      this.emit('risk_monitor_error', error);
    }
  }
  
  // Add risk warnings to position sizing result
  private addRiskWarnings(result: SizingResult, context: SizingContext): void {
    const riskMetrics = this.riskEngine.getRiskMetrics();
    
    // Check if approaching daily drawdown limit
    const dailyDDPercent = (riskMetrics.dailyDrawdown / this.config.riskBudget) * 100;
    if (dailyDDPercent > this.config.warningDrawdown * 100) {
      result.warnings.push(`Approaching daily drawdown limit: ${dailyDDPercent.toFixed(1)}%`);
    }
    
    // Check if approaching exposure limit
    const exposurePercent = (riskMetrics.totalExposure / this.config.maxExposureUSD) * 100;
    if (exposurePercent > 80) {
      result.warnings.push(`High exposure: ${exposurePercent.toFixed(1)}% of limit`);
    }
    
    // Check consecutive losses
    if (riskMetrics.consecutiveLosses >= this.config.maxConsecutiveLosses * 0.8) {
      result.warnings.push(`High consecutive losses: ${riskMetrics.consecutiveLosses}`);
    }
    
    // Check daily trade count
    const tradePercent = (riskMetrics.dailyTradeCount / this.config.maxDailyTrades) * 100;
    if (tradePercent > 80) {
      result.warnings.push(`High daily trade count: ${riskMetrics.dailyTradeCount}/${this.config.maxDailyTrades}`);
    }
  }
  
  // Emergency stop (immediate halt)
  emergencyStop(): void {
    this.manualHalt('Emergency stop activated');
    this.riskEngine.emergencyStop();
    this.emit('emergency_stop', { timestamp: Date.now() });
  }
  
  // Reset all risk metrics (use with caution)
  reset(): void {
    this.circuitBreakers.reset();
    this.riskEngine.cleanup();
    this.positionSizer.cleanup();
    this.emit('risk_reset', { timestamp: Date.now() });
  }
  
  // Cleanup
  async cleanup(): Promise<void> {
    try {
      this.stopMonitoring();
      this.riskEngine.cleanup();
      this.positionSizer.cleanup();
      this.circuitBreakers.cleanup();
      this.removeAllListeners();
      
      this.isInitialized = false;
      console.log('Risk Manager cleaned up successfully');
      
    } catch (error) {
      console.error('Error cleaning up Risk Manager:', error);
    }
  }
}

// Factory function for easy initialization
export async function createRiskManager(config?: Partial<RiskManagerConfig>): Promise<RiskManager> {
  const riskManager = new RiskManager(config);
  await riskManager.initialize();
  return riskManager;
}