/**
 * Mean Reversion Alpha Pod
 * Z-score strategy with funding rate awareness to avoid fading freight trains
 */

import { AlphaPod, AlphaSignal, PodPerformance } from '../alpha-registry.js';

interface MeanRevertConfig {
  shortPeriod: number; // short MA period
  longPeriod: number; // long MA period
  zScoreThreshold: number; // z-score threshold for signals
  fundingThreshold: number; // funding rate threshold to avoid counter-trend
  volatilityFilter: number; // minimum volatility to trade
  maxHoldingPeriod: number; // maximum bars to hold a position
  meanReversionStrength: number; // how aggressive the reversion signal
}

interface MeanRevertState {
  shortMA: number;
  longMA: number;
  zScore: number;
  fundingRate: number;
  lastSignal: number;
  barsHeld: number;
  performance: PodPerformance;
}

export class MeanRevertPod implements AlphaPod {
  name = 'meanRevert';
  warmupBars = 50; // need enough data for MA calculation
  enabled = true;
  
  private config: MeanRevertConfig;
  private state: Map<string, MeanRevertState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private fundingHistory: Map<string, number[]> = new Map();
  
  constructor(config: Partial<MeanRevertConfig> = {}) {
    this.config = {
      shortPeriod: 5,
      longPeriod: 20,
      zScoreThreshold: 2.0,
      fundingThreshold: 0.001, // 0.1% funding rate threshold
      volatilityFilter: 0.0005,
      maxHoldingPeriod: 15,
      meanReversionStrength: 0.7,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    console.log('Mean Revert pod initialized');
  }
  
  async cleanup(): Promise<void> {
    this.state.clear();
    this.priceHistory.clear();
    this.fundingHistory.clear();
  }
  
  compute(features: Record<string, number>, marketData?: any): AlphaSignal | null {
    try {
      const symbol = marketData?.symbol || 'UNKNOWN';
      const close = features.close || 0;
      const fundingRate = features.fundingRate || 0;
      const volatility = features.volatility || 0;
      
      if (!close || close <= 0) return null;
      
      // Update price history
      this.updatePriceHistory(symbol, close);
      this.updateFundingHistory(symbol, fundingRate);
      
      // Get current state or initialize
      let state = this.state.get(symbol);
      if (!state) {
        state = this.initializeState();
        this.state.set(symbol, state);
      }
      
      // Need enough data for MA calculation
      const prices = this.priceHistory.get(symbol) || [];
      if (prices.length < this.config.longPeriod) {
        return null;
      }
      
      // Calculate moving averages
      state.shortMA = this.calculateMA(prices, this.config.shortPeriod);
      state.longMA = this.calculateMA(prices, this.config.longPeriod);
      
      // Calculate z-score
      state.zScore = this.calculateZScore(prices, close, this.config.longPeriod);
      
      // Get current funding rate
      state.fundingRate = this.getCurrentFundingRate(symbol);
      
      // Check volatility filter
      if (volatility < this.config.volatilityFilter) {
        return null;
      }
      
      // Generate signal
      const signal = this.generateMeanReversionSignal(symbol, state, close);
      
      // Update state
      this.updateState(symbol, state, signal);
      
      return signal;
      
    } catch (error) {
      console.error('Error in mean revert pod computation:', error);
      return null;
    }
  }
  
  private updatePriceHistory(symbol: string, price: number): void {
    let history = this.priceHistory.get(symbol) || [];
    history.push(price);
    
    // Keep only recent history
    if (history.length > this.config.longPeriod * 2) {
      history = history.slice(-this.config.longPeriod * 2);
    }
    
    this.priceHistory.set(symbol, history);
  }
  
  private updateFundingHistory(symbol: string, fundingRate: number): void {
    let history = this.fundingHistory.get(symbol) || [];
    history.push(fundingRate);
    
    // Keep only recent funding history
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    this.fundingHistory.set(symbol, history);
  }
  
  private initializeState(): MeanRevertState {
    return {
      shortMA: 0,
      longMA: 0,
      zScore: 0,
      fundingRate: 0,
      lastSignal: 0,
      barsHeld: 0,
      performance: {
        totalPnL: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        tradeCount: 0,
        lastUpdate: Date.now()
      }
    };
  }
  
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  private calculateZScore(prices: number[], currentPrice: number, period: number): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (currentPrice - mean) / stdDev : 0;
  }
  
  private getCurrentFundingRate(symbol: string): number {
    const fundingHistory = this.fundingHistory.get(symbol) || [];
    return fundingHistory.length > 0 ? fundingHistory[fundingHistory.length - 1] : 0;
  }
  
  private generateMeanReversionSignal(symbol: string, state: MeanRevertState, currentPrice: number): AlphaSignal | null {
    const signal: AlphaSignal = {
      symbol,
      timestamp: Date.now(),
      signal: 0,
      confidence: 0,
      volatility: Math.abs(state.zScore),
      pod: this.name,
      metadata: {
        zScore: state.zScore,
        shortMA: state.shortMA,
        longMA: state.longMA,
        fundingRate: state.fundingRate,
        barsHeld: state.barsHeld
      }
    };
    
    // Check for extreme z-score (mean reversion opportunity)
    const absZScore = Math.abs(state.zScore);
    
    if (absZScore >= this.config.zScoreThreshold) {
      // Determine signal direction based on z-score
      let signalDirection = 0;
      let confidence = 0;
      
      if (state.zScore > this.config.zScoreThreshold) {
        // Price is too high, expect reversion down
        signalDirection = -1;
        confidence = Math.min(0.9, 0.5 + (absZScore - this.config.zScoreThreshold) * 0.2);
      } else if (state.zScore < -this.config.zScoreThreshold) {
        // Price is too low, expect reversion up
        signalDirection = 1;
        confidence = Math.min(0.9, 0.5 + (absZScore - this.config.zScoreThreshold) * 0.2);
      }
      
      // Check funding rate filter - avoid fading strong trends
      if (Math.abs(state.fundingRate) > this.config.fundingThreshold) {
        // High funding rate indicates strong directional bias
        if ((state.zScore > 0 && state.fundingRate > 0) || 
            (state.zScore < 0 && state.fundingRate < 0)) {
          // Funding rate and z-score are aligned - reduce confidence
          confidence *= 0.3;
        }
      }
      
      // Adjust signal strength based on MA divergence
      const maDivergence = Math.abs(state.shortMA - state.longMA) / state.longMA;
      const divergenceFactor = Math.min(1.0, maDivergence * 10); // scale divergence
      
      signal.signal = signalDirection * this.config.meanReversionStrength * divergenceFactor;
      signal.confidence = confidence;
      
      // Reduce confidence if we've been holding too long
      if (state.barsHeld > this.config.maxHoldingPeriod * 0.7) {
        signal.confidence *= 0.6;
      }
      
      // Only return signal if confidence is sufficient
      if (signal.confidence > 0.3) {
        return signal;
      }
    }
    
    // Check for MA crossover (additional confirmation)
    if (state.barsHeld === 0) {
      const maCrossover = state.shortMA - state.longMA;
      const crossoverStrength = Math.abs(maCrossover) / state.longMA;
      
      if (crossoverStrength > 0.001) { // 0.1% crossover
        // If MA crossover confirms z-score signal
        if ((state.zScore > 1 && maCrossover < 0) || (state.zScore < -1 && maCrossover > 0)) {
          signal.signal = -Math.sign(maCrossover) * 0.4; // weaker signal for MA confirmation
          signal.confidence = 0.4;
          return signal;
        }
      }
    }
    
    return null;
  }
  
  private updateState(symbol: string, state: MeanRevertState, signal: AlphaSignal | null): void {
    if (signal && Math.abs(signal.signal) > 0.1) {
      // Active signal
      state.barsHeld++;
      state.lastSignal = signal.signal;
      
      // Reset if holding too long
      if (state.barsHeld > this.config.maxHoldingPeriod) {
        state.barsHeld = 0;
        state.lastSignal = 0;
      }
    } else {
      // No active signal
      if (state.barsHeld > 0) {
        state.barsHeld++;
        
        // Reset after holding period
        if (state.barsHeld > this.config.maxHoldingPeriod) {
          state.barsHeld = 0;
          state.lastSignal = 0;
        }
      }
    }
  }
  
  getPerformance(): PodPerformance {
    // Aggregate performance across all symbols
    let totalPnL = 0;
    let totalTrades = 0;
    let winningTrades = 0;
    
    for (const state of this.state.values()) {
      totalPnL += state.performance.totalPnL;
      totalTrades += state.performance.tradeCount;
      if (state.performance.totalPnL > 0) {
        winningTrades++;
      }
    }
    
    return {
      totalPnL,
      winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: Math.max(...Array.from(this.state.values()).map(s => s.performance.maxDrawdown), 0),
      tradeCount: totalTrades,
      lastUpdate: Date.now()
    };
  }
  
  updatePerformance(pnl: number): void {
    for (const state of this.state.values()) {
      state.performance.totalPnL += pnl;
      state.performance.tradeCount++;
      
      // Update max drawdown
      if (pnl < 0 && Math.abs(pnl) > state.performance.maxDrawdown) {
        state.performance.maxDrawdown = Math.abs(pnl);
      }
      
      state.performance.lastUpdate = Date.now();
    }
  }
  
  private calculateSharpeRatio(): number {
    const performances = Array.from(this.state.values()).map(s => s.performance);
    
    if (performances.length === 0) return 0;
    
    const avgReturn = performances.reduce((sum, p) => sum + p.totalPnL, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p.totalPnL - avgReturn, 2), 0) / performances.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }
}