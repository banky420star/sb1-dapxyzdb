/**
 * Risk Engine - Core risk management system
 * Implements volatility targeting, position sizing, and circuit breakers
 */

import { RiskConfig, loadRiskConfig } from '../../config/risk.js';

export interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface RiskMetrics {
  totalExposure: number;
  dailyPnL: number;
  dailyDrawdown: number;
  maxDrawdown: number;
  currentVolatility: number;
  targetVolatility: number;
  riskUtilization: number;
  consecutiveLosses: number;
  dailyTradeCount: number;
  lastResetTime: number;
}

export interface RiskViolation {
  type: 'exposure' | 'drawdown' | 'volatility' | 'consecutive_losses' | 'daily_trades' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  limit: number;
  timestamp: number;
}

export interface PositionSizeResult {
  size: number;
  riskAmount: number;
  confidence: number;
  volatility: number;
  kellyFraction: number;
  warnings: string[];
}

export class RiskEngine {
  private config: RiskConfig;
  private positions: Map<string, Position> = new Map();
  private dailyMetrics: RiskMetrics;
  private priceHistory: Map<string, number[]> = new Map();
  private tradeHistory: Array<{ timestamp: number; pnl: number; symbol: string }> = [];
  
  constructor(config?: RiskConfig) {
    this.config = config || loadRiskConfig();
    this.dailyMetrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): RiskMetrics {
    return {
      totalExposure: 0,
      dailyPnL: 0,
      dailyDrawdown: 0,
      maxDrawdown: 0,
      currentVolatility: 0,
      targetVolatility: this.config.targetAnnVol,
      riskUtilization: 0,
      consecutiveLosses: 0,
      dailyTradeCount: 0,
      lastResetTime: Date.now()
    };
  }
  
  // Position sizing with Kelly criterion and volatility targeting
  calculatePositionSize(
    symbol: string,
    signal: number,
    confidence: number,
    currentPrice: number,
    expectedVolatility?: number
  ): PositionSizeResult {
    const warnings: string[] = [];
    
    try {
      // Check if trading is allowed
      if (this.config.tradingMode === 'halt') {
        return { size: 0, riskAmount: 0, confidence, volatility: 0, kellyFraction: 0, warnings: ['Trading halted'] };
      }
      
      // Get symbol-specific limits
      const symbolLimits = this.config.symbolLimits[symbol] || {};
      const maxPosUSD = symbolLimits.maxPosUSD || this.config.maxPosUSD;
      const maxRiskPct = symbolLimits.maxRiskPct || this.config.maxRiskPerSymbol;
      
      // Calculate expected volatility
      const volatility = expectedVolatility || this.calculateVolatility(symbol);
      
      // Calculate Kelly fraction (simplified)
      const winRate = this.estimateWinRate(symbol);
      const avgWin = this.estimateAvgWin(symbol);
      const avgLoss = this.estimateAvgLoss(symbol);
      
      let kellyFraction = 0;
      if (avgLoss > 0) {
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        kellyFraction = Math.max(0, Math.min(kelly, this.config.kellyFractionCap));
      }
      
      // Apply confidence adjustment
      kellyFraction *= confidence;
      
      // Volatility targeting
      let riskAmount = 0;
      if (this.config.volTargeting && volatility > 0) {
        // Target volatility adjustment
        const volRatio = this.config.targetAnnVol / volatility;
        riskAmount = this.config.riskBudget * kellyFraction * volRatio;
      } else {
        riskAmount = this.config.riskBudget * kellyFraction;
      }
      
      // Apply risk limits
      riskAmount = Math.min(riskAmount, this.config.riskBudget * this.config.maxRiskPerTrade);
      riskAmount = Math.min(riskAmount, this.config.riskBudget * maxRiskPct);
      
      // Calculate position size
      const stopLossDistance = currentPrice * this.config.stopLossPct;
      const size = riskAmount / stopLossDistance;
      
      // Apply position size limits
      const maxSizeUSD = maxPosUSD;
      const maxSize = maxSizeUSD / currentPrice;
      const finalSize = Math.min(size, maxSize);
      
      // Check for warnings
      if (finalSize < size * 0.5) {
        warnings.push('Position size significantly reduced due to limits');
      }
      
      if (volatility > this.config.targetAnnVol * 2) {
        warnings.push('High volatility detected');
      }
      
      if (kellyFraction > this.config.kellyFractionCap * 0.8) {
        warnings.push('High Kelly fraction');
      }
      
      return {
        size: finalSize,
        riskAmount: finalSize * stopLossDistance,
        confidence,
        volatility,
        kellyFraction,
        warnings
      };
      
    } catch (error) {
      console.error('Error calculating position size:', error);
      return { size: 0, riskAmount: 0, confidence: 0, volatility: 0, kellyFraction: 0, warnings: ['Calculation error'] };
    }
  }
  
  // Circuit breaker checks
  checkCircuitBreakers(): RiskViolation[] {
    const violations: RiskViolation[] = [];
    const now = Date.now();
    
    // Reset daily metrics if new day
    if (this.isNewDay()) {
      this.resetDailyMetrics();
    }
    
    // Check emergency stop
    if (this.config.emergencyStop) {
      violations.push({
        type: 'emergency',
        severity: 'critical',
        message: 'Emergency stop activated',
        value: 1,
        limit: 0,
        timestamp: now
      });
    }
    
    // Check daily drawdown
    const dailyDD = Math.abs(this.dailyMetrics.dailyPnL) / this.config.riskBudget;
    if (dailyDD >= this.config.maxDDDailyPct) {
      violations.push({
        type: 'drawdown',
        severity: 'critical',
        message: `Daily drawdown limit exceeded: ${(dailyDD * 100).toFixed(2)}%`,
        value: dailyDD,
        limit: this.config.maxDDDailyPct,
        timestamp: now
      });
    } else if (dailyDD >= this.config.alertDrawdown) {
      violations.push({
        type: 'drawdown',
        severity: 'high',
        message: `Daily drawdown alert: ${(dailyDD * 100).toFixed(2)}%`,
        value: dailyDD,
        limit: this.config.alertDrawdown,
        timestamp: now
      });
    } else if (dailyDD >= this.config.warningDrawdown) {
      violations.push({
        type: 'drawdown',
        severity: 'medium',
        message: `Daily drawdown warning: ${(dailyDD * 100).toFixed(2)}%`,
        value: dailyDD,
        limit: this.config.warningDrawdown,
        timestamp: now
      });
    }
    
    // Check total exposure
    if (this.dailyMetrics.totalExposure > this.config.maxExposureUSD) {
      violations.push({
        type: 'exposure',
        severity: 'high',
        message: `Total exposure exceeded: $${this.dailyMetrics.totalExposure.toFixed(2)}`,
        value: this.dailyMetrics.totalExposure,
        limit: this.config.maxExposureUSD,
        timestamp: now
      });
    }
    
    // Check consecutive losses
    if (this.dailyMetrics.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      violations.push({
        type: 'consecutive_losses',
        severity: 'high',
        message: `Too many consecutive losses: ${this.dailyMetrics.consecutiveLosses}`,
        value: this.dailyMetrics.consecutiveLosses,
        limit: this.config.maxConsecutiveLosses,
        timestamp: now
      });
    }
    
    // Check daily trade count
    if (this.dailyMetrics.dailyTradeCount >= this.config.maxDailyTrades) {
      violations.push({
        type: 'daily_trades',
        severity: 'medium',
        message: `Daily trade limit exceeded: ${this.dailyMetrics.dailyTradeCount}`,
        value: this.dailyMetrics.dailyTradeCount,
        limit: this.config.maxDailyTrades,
        timestamp: now
      });
    }
    
    // Check trading hours
    if (this.config.tradingHours.enabled && !this.isWithinTradingHours()) {
      violations.push({
        type: 'emergency',
        severity: 'medium',
        message: 'Outside trading hours',
        value: 1,
        limit: 0,
        timestamp: now
      });
    }
    
    return violations;
  }
  
  // Update position and risk metrics
  updatePosition(position: Position): void {
    this.positions.set(position.id, position);
    this.updateRiskMetrics();
  }
  
  // Record trade result
  recordTrade(symbol: string, pnl: number): void {
    const now = Date.now();
    
    // Add to trade history
    this.tradeHistory.push({ timestamp: now, pnl, symbol });
    
    // Update daily P&L
    this.dailyMetrics.dailyPnL += pnl;
    this.dailyMetrics.dailyTradeCount++;
    
    // Update consecutive losses
    if (pnl < 0) {
      this.dailyMetrics.consecutiveLosses++;
    } else {
      this.dailyMetrics.consecutiveLosses = 0;
    }
    
    // Update drawdown
    if (this.dailyMetrics.dailyPnL < 0) {
      this.dailyMetrics.dailyDrawdown = Math.abs(this.dailyMetrics.dailyPnL);
      this.dailyMetrics.maxDrawdown = Math.max(this.dailyMetrics.maxDrawdown, this.dailyMetrics.dailyDrawdown);
    }
    
    // Clean up old trade history
    const cutoff = now - (30 * 24 * 60 * 60 * 1000); // 30 days
    this.tradeHistory = this.tradeHistory.filter(trade => trade.timestamp > cutoff);
  }
  
  // Remove position
  removePosition(positionId: string): void {
    this.positions.delete(positionId);
    this.updateRiskMetrics();
  }
  
  // Update price and recalculate metrics
  updatePrice(symbol: string, price: number): void {
    // Update price history
    let prices = this.priceHistory.get(symbol) || [];
    prices.push(price);
    
    // Keep only recent prices
    if (prices.length > 1000) {
      prices = prices.slice(-1000);
    }
    
    this.priceHistory.set(symbol, prices);
    
    // Update positions with this symbol
    for (const position of this.positions.values()) {
      if (position.symbol === symbol) {
        position.currentPrice = price;
        
        // Recalculate P&L
        if (position.side === 'buy') {
          position.pnl = (price - position.entryPrice) * position.size;
        } else {
          position.pnl = (position.entryPrice - price) * position.size;
        }
        
        position.pnlPercent = (position.pnl / (position.entryPrice * position.size)) * 100;
      }
    }
    
    this.updateRiskMetrics();
  }
  
  // Get current risk metrics
  getRiskMetrics(): RiskMetrics {
    return { ...this.dailyMetrics };
  }
  
  // Get all positions
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }
  
  // Get positions for a specific symbol
  getPositionsBySymbol(symbol: string): Position[] {
    return Array.from(this.positions.values()).filter(pos => pos.symbol === symbol);
  }
  
  // Calculate volatility for a symbol
  private calculateVolatility(symbol: string): number {
    const prices = this.priceHistory.get(symbol);
    if (!prices || prices.length < 20) {
      return this.config.targetAnnVol; // Default to target if insufficient data
    }
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualized volatility
    return stdDev * Math.sqrt(252);
  }
  
  // Estimate win rate for a symbol
  private estimateWinRate(symbol: string): number {
    const symbolTrades = this.tradeHistory.filter(trade => trade.symbol === symbol);
    if (symbolTrades.length === 0) return 0.5; // Default 50% win rate
    
    const wins = symbolTrades.filter(trade => trade.pnl > 0).length;
    return wins / symbolTrades.length;
  }
  
  // Estimate average win for a symbol
  private estimateAvgWin(symbol: string): number {
    const symbolTrades = this.tradeHistory.filter(trade => trade.symbol === symbol && trade.pnl > 0);
    if (symbolTrades.length === 0) return 0.01; // Default 1% average win
    
    const totalWin = symbolTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    return totalWin / symbolTrades.length;
  }
  
  // Estimate average loss for a symbol
  private estimateAvgLoss(symbol: string): number {
    const symbolTrades = this.tradeHistory.filter(trade => trade.symbol === symbol && trade.pnl < 0);
    if (symbolTrades.length === 0) return 0.01; // Default 1% average loss
    
    const totalLoss = symbolTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
    return totalLoss / symbolTrades.length;
  }
  
  // Update risk metrics
  private updateRiskMetrics(): void {
    // Calculate total exposure
    let totalExposure = 0;
    for (const position of this.positions.values()) {
      totalExposure += position.size * position.currentPrice;
    }
    
    this.dailyMetrics.totalExposure = totalExposure;
    
    // Calculate risk utilization
    this.dailyMetrics.riskUtilization = totalExposure / this.config.riskBudget;
    
    // Calculate current volatility (portfolio level)
    const positions = Array.from(this.positions.values());
    if (positions.length > 0) {
      const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
      const portfolioValue = positions.reduce((sum, pos) => sum + pos.size * pos.entryPrice, 0);
      
      if (portfolioValue > 0) {
        this.dailyMetrics.currentVolatility = Math.abs(totalPnL / portfolioValue);
      }
    }
  }
  
  // Check if it's a new day
  private isNewDay(): boolean {
    const now = new Date();
    const lastReset = new Date(this.dailyMetrics.lastResetTime);
    
    return now.getDate() !== lastReset.getDate() ||
           now.getMonth() !== lastReset.getMonth() ||
           now.getFullYear() !== lastReset.getFullYear();
  }
  
  // Reset daily metrics
  private resetDailyMetrics(): void {
    this.dailyMetrics.dailyPnL = 0;
    this.dailyMetrics.dailyDrawdown = 0;
    this.dailyMetrics.dailyTradeCount = 0;
    this.dailyMetrics.consecutiveLosses = 0;
    this.dailyMetrics.lastResetTime = Date.now();
  }
  
  // Check if within trading hours
  private isWithinTradingHours(): boolean {
    if (!this.config.tradingHours.enabled) return true;
    
    const now = new Date();
    const hour = now.getUTCHours();
    
    return hour >= this.config.tradingHours.startHour && 
           hour < this.config.tradingHours.endHour;
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  // Get current configuration
  getConfig(): RiskConfig {
    return { ...this.config };
  }
  
  // Emergency stop
  emergencyStop(): void {
    this.config.emergencyStop = true;
    this.config.tradingMode = 'halt';
  }
  
  // Resume trading
  resumeTrading(): void {
    this.config.emergencyStop = false;
    this.config.tradingMode = 'paper'; // Always resume in paper mode
  }
  
  // Cleanup
  cleanup(): void {
    this.positions.clear();
    this.priceHistory.clear();
    this.tradeHistory = [];
  }
}