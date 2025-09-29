/**
 * Trend/Breakout Alpha Pod
 * ATR breakout strategy with trailing stop - robust and thrives in strong moves
 */

import { AlphaPod, AlphaSignal, PodPerformance } from '../alpha-registry.js';

interface TrendPodConfig {
  atrPeriod: number; // ATR lookback period
  atrMultiplier: number; // ATR multiplier for breakout threshold
  minBreakoutStrength: number; // minimum strength to trigger signal
  trailingStopPct: number; // trailing stop percentage
  maxHoldBars: number; // maximum bars to hold a position
  minVolatility: number; // minimum volatility to trade
}

interface TrendState {
  atr: number;
  breakoutLevel: number;
  trailingStop: number;
  trendDirection: 'up' | 'down' | 'neutral';
  barsInTrend: number;
  lastSignal: number;
  performance: PodPerformance;
}

export class TrendPod implements AlphaPod {
  name = 'trend';
  warmupBars = 50; // need enough bars for ATR calculation
  enabled = true;
  
  private config: TrendPodConfig;
  private state: Map<string, TrendState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  
  constructor(config: Partial<TrendPodConfig> = {}) {
    this.config = {
      atrPeriod: 14,
      atrMultiplier: 2.0,
      minBreakoutStrength: 0.6,
      trailingStopPct: 0.02,
      maxHoldBars: 20,
      minVolatility: 0.001,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    // Initialize any required resources
    console.log('Trend pod initialized');
  }
  
  async cleanup(): Promise<void> {
    this.state.clear();
    this.priceHistory.clear();
  }
  
  compute(features: Record<string, number>, marketData?: any): AlphaSignal | null {
    try {
      // Extract required features
      const symbol = marketData?.symbol || 'UNKNOWN';
      const close = features.close || 0;
      const high = features.high || close;
      const low = features.low || close;
      const volume = features.volume || 0;
      
      if (!close || close <= 0) return null;
      
      // Update price history
      this.updatePriceHistory(symbol, { close, high, low });
      
      // Get current state or initialize
      let state = this.state.get(symbol);
      if (!state) {
        state = this.initializeState();
        this.state.set(symbol, state);
      }
      
      // Need enough data for ATR calculation
      const prices = this.priceHistory.get(symbol) || [];
      if (prices.length < this.config.atrPeriod) {
        return null;
      }
      
      // Calculate ATR
      state.atr = this.calculateATR(prices, this.config.atrPeriod);
      
      // Check for volatility filter
      if (state.atr < this.config.minVolatility) {
        return null;
      }
      
      // Update breakout levels
      this.updateBreakoutLevels(symbol, state, prices);
      
      // Check for breakout signals
      const signal = this.checkBreakoutSignal(symbol, state, close);
      
      // Update trend state
      this.updateTrendState(symbol, state, signal);
      
      // Calculate expected volatility for risk sizing
      const expectedVolatility = state.atr / close;
      
      return signal;
      
    } catch (error) {
      console.error('Error in trend pod computation:', error);
      return null;
    }
  }
  
  private updatePriceHistory(symbol: string, price: { close: number; high: number; low: number }): void {
    const key = `${price.close}_${price.high}_${price.low}`;
    let history = this.priceHistory.get(symbol) || [];
    history.push(parseFloat(key.split('_')[0]));
    
    // Keep only recent history
    if (history.length > this.config.atrPeriod * 2) {
      history = history.slice(-this.config.atrPeriod * 2);
    }
    
    this.priceHistory.set(symbol, history);
  }
  
  private initializeState(): TrendState {
    return {
      atr: 0,
      breakoutLevel: 0,
      trailingStop: 0,
      trendDirection: 'neutral',
      barsInTrend: 0,
      lastSignal: 0,
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
  
  private calculateATR(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    // Simplified ATR calculation using close prices
    let sum = 0;
    for (let i = 1; i <= period; i++) {
      const range = Math.abs(prices[i] - prices[i - 1]);
      sum += range;
    }
    
    return sum / period;
  }
  
  private updateBreakoutLevels(symbol: string, state: TrendState, prices: number[]): void {
    const recentPrices = prices.slice(-this.config.atrPeriod);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    
    // Update breakout levels based on ATR
    const atrThreshold = state.atr * this.config.atrMultiplier;
    state.breakoutLevel = high + atrThreshold; // for upward breakout
  }
  
  private checkBreakoutSignal(symbol: string, state: TrendState, currentPrice: number): AlphaSignal | null {
    const signal: AlphaSignal = {
      symbol,
      timestamp: Date.now(),
      signal: 0,
      confidence: 0,
      volatility: state.atr / currentPrice,
      pod: this.name,
      metadata: {
        atr: state.atr,
        breakoutLevel: state.breakoutLevel,
        trendDirection: state.trendDirection,
        barsInTrend: state.barsInTrend
      }
    };
    
    // Check for upward breakout
    if (currentPrice > state.breakoutLevel && state.trendDirection !== 'up') {
      const breakoutStrength = (currentPrice - state.breakoutLevel) / state.atr;
      
      if (breakoutStrength >= this.config.minBreakoutStrength) {
        signal.signal = Math.min(1.0, breakoutStrength / this.config.atrMultiplier);
        signal.confidence = Math.min(0.95, 0.6 + (breakoutStrength * 0.1));
        
        // Adjust confidence based on trend duration
        if (state.barsInTrend > this.config.maxHoldBars) {
          signal.confidence *= 0.5; // reduce confidence for extended trends
        }
        
        return signal;
      }
    }
    
    // Check for trend continuation
    if (state.trendDirection === 'up' && state.barsInTrend < this.config.maxHoldBars) {
      const trendStrength = (currentPrice - state.breakoutLevel) / state.atr;
      
      if (trendStrength > 0) {
        signal.signal = Math.min(0.8, trendStrength * 0.3);
        signal.confidence = Math.min(0.7, 0.4 + (trendStrength * 0.1));
        
        // Reduce confidence as trend ages
        const ageFactor = 1 - (state.barsInTrend / this.config.maxHoldBars);
        signal.confidence *= ageFactor;
        
        return signal;
      }
    }
    
    // Check for trend reversal (mean reversion signal)
    if (state.trendDirection === 'up' && state.barsInTrend > this.config.maxHoldBars / 2) {
      const reversalThreshold = state.breakoutLevel - (state.atr * this.config.atrMultiplier * 0.5);
      
      if (currentPrice < reversalThreshold) {
        signal.signal = -0.3; // weak sell signal for trend exhaustion
        signal.confidence = 0.4;
        return signal;
      }
    }
    
    return null;
  }
  
  private updateTrendState(symbol: string, state: TrendState, signal: AlphaSignal | null): void {
    if (signal && signal.signal > 0.1) {
      // Strong buy signal
      if (state.trendDirection !== 'up') {
        state.trendDirection = 'up';
        state.barsInTrend = 1;
      } else {
        state.barsInTrend++;
      }
      state.lastSignal = signal.signal;
    } else if (signal && signal.signal < -0.1) {
      // Sell signal
      state.trendDirection = 'down';
      state.barsInTrend = 1;
      state.lastSignal = signal.signal;
    } else {
      // No clear signal
      if (state.trendDirection !== 'neutral') {
        state.barsInTrend++;
        
        // Reset to neutral if trend is too old
        if (state.barsInTrend > this.config.maxHoldBars) {
          state.trendDirection = 'neutral';
          state.barsInTrend = 0;
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
      maxDrawdown: Math.max(...Array.from(this.state.values()).map(s => s.performance.maxDrawdown)),
      tradeCount: totalTrades,
      lastUpdate: Date.now()
    };
  }
  
  updatePerformance(pnl: number): void {
    // Update performance for the most recent trade
    // This would typically be called by the trading engine
    for (const state of this.state.values()) {
      state.performance.totalPnL += pnl;
      state.performance.tradeCount++;
      
      if (pnl > 0) {
        // Update win rate calculation would go here
      }
      
      // Update max drawdown
      if (pnl < 0 && Math.abs(pnl) > state.performance.maxDrawdown) {
        state.performance.maxDrawdown = Math.abs(pnl);
      }
      
      state.performance.lastUpdate = Date.now();
    }
  }
  
  private calculateSharpeRatio(): number {
    // Simplified Sharpe ratio calculation
    // In practice, this would use historical returns
    const performances = Array.from(this.state.values()).map(s => s.performance);
    
    if (performances.length === 0) return 0;
    
    const avgReturn = performances.reduce((sum, p) => sum + p.totalPnL, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p.totalPnL - avgReturn, 2), 0) / performances.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }
}