/**
 * Volatility Regime Alpha Pod
 * Switches between tight mean-reversion and breakout strategies based on volatility regime
 */

import { AlphaPod, AlphaSignal, PodPerformance } from '../alpha-registry.js';

interface VolRegimeConfig {
  volLookback: number; // periods to look back for volatility calculation
  regimeThreshold: number; // threshold to switch between regimes
  lowVolStrategy: 'mean_revert' | 'breakout' | 'both';
  highVolStrategy: 'breakout' | 'trend_follow' | 'both';
  volSmoothing: number; // smoothing factor for volatility
  regimePersistence: number; // minimum bars to stay in a regime
  adaptiveThreshold: boolean; // whether to adapt threshold based on market conditions
}

interface VolRegimeState {
  currentRegime: 'low' | 'high' | 'transitioning';
  realizedVol: number;
  volPercentile: number;
  regimeBars: number;
  lastRegimeChange: number;
  performance: PodPerformance;
}

export class VolatilityRegimePod implements AlphaPod {
  name = 'volRegime';
  warmupBars = 30; // need enough data for volatility calculation
  enabled = true;
  
  private config: VolRegimeConfig;
  private state: Map<string, VolRegimeState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private volHistory: Map<string, number[]> = new Map();
  
  constructor(config: Partial<VolRegimeConfig> = {}) {
    this.config = {
      volLookback: 20,
      regimeThreshold: 0.6, // 60th percentile threshold
      lowVolStrategy: 'mean_revert',
      highVolStrategy: 'breakout',
      volSmoothing: 0.1, // 10% smoothing
      regimePersistence: 5,
      adaptiveThreshold: true,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    console.log('Volatility Regime pod initialized');
  }
  
  async cleanup(): Promise<void> {
    this.state.clear();
    this.priceHistory.clear();
    this.volHistory.clear();
  }
  
  compute(features: Record<string, number>, marketData?: any): AlphaSignal | null {
    try {
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
      
      // Need enough data for volatility calculation
      const prices = this.priceHistory.get(symbol) || [];
      if (prices.length < this.config.volLookback) {
        return null;
      }
      
      // Calculate realized volatility
      const realizedVol = this.calculateRealizedVolatility(prices, this.config.volLookback);
      state.realizedVol = realizedVol;
      
      // Update volatility history and percentile
      this.updateVolatilityHistory(symbol, realizedVol);
      state.volPercentile = this.calculateVolatilityPercentile(symbol, realizedVol);
      
      // Determine volatility regime
      this.updateVolatilityRegime(symbol, state);
      
      // Generate regime-appropriate signal
      const signal = this.generateRegimeSignal(symbol, state, { close, high, low });
      
      return signal;
      
    } catch (error) {
      console.error('Error in volatility regime pod computation:', error);
      return null;
    }
  }
  
  private updatePriceHistory(symbol: string, price: { close: number; high: number; low: number }): void {
    let history = this.priceHistory.get(symbol) || [];
    history.push(price.close);
    
    // Keep only recent history
    if (history.length > this.config.volLookback * 2) {
      history = history.slice(-this.config.volLookback * 2);
    }
    
    this.priceHistory.set(symbol, history);
  }
  
  private updateVolatilityHistory(symbol: string, vol: number): void {
    let history = this.volHistory.get(symbol) || [];
    history.push(vol);
    
    // Keep longer history for percentile calculation
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    this.volHistory.set(symbol, history);
  }
  
  private initializeState(): VolRegimeState {
    return {
      currentRegime: 'transitioning',
      realizedVol: 0,
      volPercentile: 50,
      regimeBars: 0,
      lastRegimeChange: Date.now(),
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
  
  private calculateRealizedVolatility(prices: number[], lookback: number): number {
    if (prices.length < lookback + 1) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i <= lookback; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    
    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    // Annualized volatility (assuming daily data)
    return Math.sqrt(variance) * Math.sqrt(252);
  }
  
  private calculateVolatilityPercentile(symbol: string, currentVol: number): number {
    const volHistory = this.volHistory.get(symbol) || [];
    
    if (volHistory.length < 10) return 50; // default to median if insufficient data
    
    // Count how many historical values are below current
    const belowCount = volHistory.filter(vol => vol < currentVol).length;
    
    return (belowCount / volHistory.length) * 100;
  }
  
  private updateVolatilityRegime(symbol: string, state: VolRegimeState): void {
    const oldRegime = state.currentRegime;
    
    // Determine new regime based on volatility percentile
    if (state.volPercentile <= (100 - this.config.regimeThreshold * 100)) {
      state.currentRegime = 'low';
    } else if (state.volPercentile >= this.config.regimeThreshold * 100) {
      state.currentRegime = 'high';
    } else {
      state.currentRegime = 'transitioning';
    }
    
    // Apply regime persistence
    if (state.currentRegime !== oldRegime) {
      if (state.regimeBars < this.config.regimePersistence) {
        // Not enough persistence, keep old regime
        state.currentRegime = oldRegime;
        state.regimeBars++;
      } else {
        // Regime change confirmed
        state.regimeBars = 0;
        state.lastRegimeChange = Date.now();
      }
    } else {
      state.regimeBars++;
    }
  }
  
  private generateRegimeSignal(symbol: string, state: VolRegimeState, price: { close: number; high: number; low: number }): AlphaSignal | null {
    const signal: AlphaSignal = {
      symbol,
      timestamp: Date.now(),
      signal: 0,
      confidence: 0,
      volatility: state.realizedVol,
      pod: this.name,
      metadata: {
        regime: state.currentRegime,
        volPercentile: state.volPercentile,
        realizedVol: state.realizedVol,
        regimeBars: state.regimeBars
      }
    };
    
    switch (state.currentRegime) {
      case 'low':
        signal.signal = this.generateLowVolSignal(symbol, state, price);
        break;
      case 'high':
        signal.signal = this.generateHighVolSignal(symbol, state, price);
        break;
      case 'transitioning':
        // Generate neutral or reduced signal during transitions
        signal.signal = this.generateTransitionSignal(symbol, state, price);
        break;
    }
    
    // Set confidence based on regime strength and volatility
    signal.confidence = this.calculateRegimeConfidence(state);
    
    // Only return signal if confidence is sufficient
    if (Math.abs(signal.signal) > 0.1 && signal.confidence > 0.3) {
      return signal;
    }
    
    return null;
  }
  
  private generateLowVolSignal(symbol: string, state: VolRegimeState, price: { close: number; high: number; low: number }): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 20) return 0;
    
    // Mean reversion strategy for low volatility
    const shortMA = this.calculateMA(prices, 5);
    const longMA = this.calculateMA(prices, 20);
    const maRatio = (price.close - longMA) / longMA;
    
    // Z-score based mean reversion
    const zScore = this.calculateZScore(prices, price.close, 20);
    
    if (Math.abs(zScore) > 1.5) {
      return -Math.sign(zScore) * 0.6; // mean reversion signal
    }
    
    // MA convergence signal
    if (Math.abs(maRatio) > 0.002) { // 0.2% deviation
      return -Math.sign(maRatio) * 0.4;
    }
    
    return 0;
  }
  
  private generateHighVolSignal(symbol: string, state: VolRegimeState, price: { close: number; high: number; low: number }): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 10) return 0;
    
    // Breakout strategy for high volatility
    const recentHigh = Math.max(...prices.slice(-10));
    const recentLow = Math.min(...prices.slice(-10));
    const range = recentHigh - recentLow;
    
    // Breakout signals
    if (price.close > recentHigh + (range * 0.1)) {
      return 0.7; // upward breakout
    }
    
    if (price.close < recentLow - (range * 0.1)) {
      return -0.7; // downward breakout
    }
    
    // Trend following in high vol
    const shortMA = this.calculateMA(prices, 3);
    const longMA = this.calculateMA(prices, 10);
    
    if (shortMA > longMA * 1.001) {
      return 0.5; // trend up
    } else if (shortMA < longMA * 0.999) {
      return -0.5; // trend down
    }
    
    return 0;
  }
  
  private generateTransitionSignal(symbol: string, state: VolRegimeState, price: { close: number; high: number; low: number }): number {
    // Reduced signal strength during regime transitions
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 10) return 0;
    
    // Weak momentum signal
    const shortMA = this.calculateMA(prices, 3);
    const longMA = this.calculateMA(prices, 10);
    const momentum = (shortMA - longMA) / longMA;
    
    if (Math.abs(momentum) > 0.001) {
      return Math.sign(momentum) * 0.3; // reduced signal strength
    }
    
    return 0;
  }
  
  private calculateRegimeConfidence(state: VolRegimeState): number {
    let confidence = 0.5; // base confidence
    
    // Increase confidence based on regime persistence
    if (state.regimeBars > this.config.regimePersistence) {
      confidence += 0.2;
    }
    
    // Increase confidence based on volatility percentile extremity
    const percentileDistance = Math.min(state.volPercentile, 100 - state.volPercentile);
    confidence += (percentileDistance / 50) * 0.2;
    
    // Reduce confidence during transitions
    if (state.currentRegime === 'transitioning') {
      confidence *= 0.6;
    }
    
    return Math.min(0.95, confidence);
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
  
  getPerformance(): PodPerformance {
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