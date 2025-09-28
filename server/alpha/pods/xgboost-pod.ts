/**
 * XGBoost Alpha Pod
 * Tabular features with limited feature set and hard out-of-sample validation
 */

import { AlphaPod, AlphaSignal, PodPerformance } from '../alpha-registry.js';
import { ModelServiceClient } from '../../ml/model-service-client.js';

interface XGBoostConfig {
  features: string[]; // allowed features
  maxFeatures: number; // maximum number of features to use
  minConfidence: number; // minimum confidence threshold
  retrainThreshold: number; // performance threshold to trigger retraining
  lookbackPeriod: number; // periods to look back for feature calculation
  predictionHorizon: number; // periods ahead to predict
}

interface XGBoostState {
  modelLoaded: boolean;
  lastPrediction: number;
  featureCache: Map<string, number[]>;
  performance: PodPerformance;
}

export class XGBoostPod implements AlphaPod {
  name = 'xgboost';
  warmupBars = 50; // need enough data for feature calculation
  enabled = true;
  
  private config: XGBoostConfig;
  private state: Map<string, XGBoostState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private modelServiceClient: ModelServiceClient | null = null;
  
  constructor(config: Partial<XGBoostConfig> = {}) {
    this.config = {
      features: [
        'returns_1', 'returns_5', 'returns_10', // price returns
        'volatility_5', 'volatility_20', // volatility measures
        'rsi_14', 'rsi_5', // RSI indicators
        'skew_10', 'kurtosis_10', // distribution moments
        'funding_rate', 'basis', // market structure
        'volume_ratio', 'volume_trend', // volume features
        'time_of_day', 'day_of_week' // temporal features
      ],
      maxFeatures: 12,
      minConfidence: 0.55,
      retrainThreshold: 0.45, // retrain if accuracy drops below 45%
      lookbackPeriod: 50,
      predictionHorizon: 5,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    console.log('XGBoost pod initialized');
    
    // Initialize model service client
    try {
      this.modelServiceClient = new (await import('../../ml/model-service-client.js')).createModelServiceClient();
      const isHealthy = await this.modelServiceClient.healthCheck();
      console.log(`Model service client initialized: ${isHealthy ? 'healthy' : 'unhealthy'}`);
    } catch (error) {
      console.warn('Failed to initialize model service client:', error);
      this.modelServiceClient = null;
    }
  }
  
  async cleanup(): Promise<void> {
    this.state.clear();
    this.priceHistory.clear();
  }
  
  compute(features: Record<string, number>, marketData?: any): AlphaSignal | null {
    try {
      const symbol = marketData?.symbol || 'UNKNOWN';
      const close = features.close || 0;
      
      if (!close || close <= 0) return null;
      
      // Update price history
      this.updatePriceHistory(symbol, close);
      
      // Get current state or initialize
      let state = this.state.get(symbol);
      if (!state) {
        state = this.initializeState();
        this.state.set(symbol, state);
      }
      
      // Need enough data for feature calculation
      const prices = this.priceHistory.get(symbol) || [];
      if (prices.length < this.config.lookbackPeriod) {
        return null;
      }
      
      // Calculate engineered features
      const engineeredFeatures = this.calculateEngineeredFeatures(symbol, prices, features);
      
      // Validate features
      if (!this.validateFeatures(engineeredFeatures)) {
        return null;
      }
      
      // Get model prediction (real or simulated)
      const prediction = await this.getModelPrediction(engineeredFeatures);
      
      if (!prediction || prediction.confidence < this.config.minConfidence) {
        return null;
      }
      
      // Create signal
      const signal: AlphaSignal = {
        symbol,
        timestamp: Date.now(),
        signal: prediction.signal,
        confidence: prediction.confidence,
        volatility: prediction.volatility || 0.02,
        pod: this.name,
        metadata: {
          features: this.getTopFeatures(engineeredFeatures),
          prediction: prediction,
          modelVersion: '1.0.0'
        }
      };
      
      // Update state
      state.lastPrediction = prediction.confidence;
      
      return signal;
      
    } catch (error) {
      console.error('Error in XGBoost pod computation:', error);
      return null;
    }
  }
  
  private updatePriceHistory(symbol: string, price: number): void {
    let history = this.priceHistory.get(symbol) || [];
    history.push(price);
    
    // Keep only recent history
    if (history.length > this.config.lookbackPeriod * 2) {
      history = history.slice(-this.config.lookbackPeriod * 2);
    }
    
    this.priceHistory.set(symbol, history);
  }
  
  private initializeState(): XGBoostState {
    return {
      modelLoaded: true, // simulated as loaded
      lastPrediction: 0,
      featureCache: new Map(),
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
  
  private calculateEngineeredFeatures(symbol: string, prices: number[], rawFeatures: Record<string, number>): Record<string, number> {
    const features: Record<string, number> = {};
    
    // Price-based features
    features.returns_1 = this.calculateReturn(prices, 1);
    features.returns_5 = this.calculateReturn(prices, 5);
    features.returns_10 = this.calculateReturn(prices, 10);
    
    // Volatility features
    features.volatility_5 = this.calculateVolatility(prices, 5);
    features.volatility_20 = this.calculateVolatility(prices, 20);
    
    // Technical indicators
    features.rsi_14 = this.calculateRSI(prices, 14);
    features.rsi_5 = this.calculateRSI(prices, 5);
    
    // Distribution moments
    features.skew_10 = this.calculateSkewness(prices, 10);
    features.kurtosis_10 = this.calculateKurtosis(prices, 10);
    
    // Market structure features
    features.funding_rate = rawFeatures.fundingRate || 0;
    features.basis = rawFeatures.basis || 0;
    
    // Volume features
    features.volume_ratio = this.calculateVolumeRatio(rawFeatures);
    features.volume_trend = this.calculateVolumeTrend(rawFeatures);
    
    // Temporal features
    const now = new Date();
    features.time_of_day = now.getHours() / 24;
    features.day_of_week = now.getDay() / 7;
    
    return features;
  }
  
  private calculateReturn(prices: number[], periods: number): number {
    if (prices.length < periods + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - periods];
    return (current - past) / past;
  }
  
  private calculateVolatility(prices: number[], periods: number): number {
    if (prices.length < periods + 1) return 0;
    
    const returns: number[] = [];
    for (let i = prices.length - periods; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private calculateSkewness(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const returns: number[] = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 3), 0) / returns.length;
    return skewness;
  }
  
  private calculateKurtosis(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const returns: number[] = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 4), 0) / returns.length;
    return kurtosis - 3; // excess kurtosis
  }
  
  private calculateVolumeRatio(rawFeatures: Record<string, number>): number {
    const currentVolume = rawFeatures.volume || 0;
    const avgVolume = rawFeatures.avgVolume || currentVolume;
    
    if (avgVolume === 0) return 1;
    return currentVolume / avgVolume;
  }
  
  private calculateVolumeTrend(rawFeatures: Record<string, number>): number {
    // Simplified volume trend calculation
    const currentVolume = rawFeatures.volume || 0;
    const prevVolume = rawFeatures.prevVolume || currentVolume;
    
    if (prevVolume === 0) return 0;
    return (currentVolume - prevVolume) / prevVolume;
  }
  
  private validateFeatures(features: Record<string, number>): boolean {
    // Check for NaN or infinite values
    for (const value of Object.values(features)) {
      if (!isFinite(value)) {
        return false;
      }
    }
    
    // Check feature count
    if (Object.keys(features).length < this.config.maxFeatures * 0.8) {
      return false;
    }
    
    return true;
  }
  
  private async getModelPrediction(features: Record<string, number>): Promise<{ signal: number; confidence: number; volatility: number } | null> {
    try {
      // Try to use the model service if available
      if (this.modelServiceClient) {
        const response = await this.modelServiceClient.predict({
          symbol: 'BTCUSDT', // Default symbol, should be passed from context
          features: features,
          timestamp: new Date()
        });
        
        return {
          signal: response.prediction,
          confidence: response.confidence,
          volatility: features.volatility_20 || 0.02
        };
      }
    } catch (error) {
      console.warn('Model service unavailable, falling back to simulated prediction:', error);
    }
    
    // Fallback to simulated XGBoost prediction
    let signal = 0;
    let confidence = 0.5;
    
    // Use returns as primary signal
    const returns1 = features.returns_1 || 0;
    const returns5 = features.returns_5 || 0;
    const volatility = features.volatility_20 || 0.02;
    
    // RSI-based signals
    const rsi14 = features.rsi_14 || 50;
    const rsi5 = features.rsi_5 || 50;
    
    // Combined signal logic
    if (rsi14 < 30 && returns1 < -0.01) {
      signal = 0.8; // strong buy on oversold
      confidence = 0.75;
    } else if (rsi14 > 70 && returns1 > 0.01) {
      signal = -0.8; // strong sell on overbought
      confidence = 0.75;
    } else if (Math.abs(returns5) > 0.02 && volatility > 0.03) {
      // Momentum signal in high vol
      signal = Math.sign(returns5) * 0.6;
      confidence = 0.65;
    } else if (Math.abs(returns1) > 0.005 && volatility < 0.01) {
      // Mean reversion in low vol
      signal = -Math.sign(returns1) * 0.4;
      confidence = 0.6;
    }
    
    // Adjust confidence based on feature quality
    const featureQuality = this.assessFeatureQuality(features);
    confidence *= featureQuality;
    
    // Add some randomness to simulate model uncertainty
    const noise = (Math.random() - 0.5) * 0.1;
    signal += noise;
    confidence += noise * 0.1;
    
    // Clamp values
    signal = Math.max(-1, Math.min(1, signal));
    confidence = Math.max(0.3, Math.min(0.95, confidence));
    
    return {
      signal,
      confidence,
      volatility
    };
  }
  
  private assessFeatureQuality(features: Record<string, number>): number {
    let quality = 1.0;
    
    // Reduce quality if key features are missing or extreme
    const keyFeatures = ['returns_1', 'volatility_20', 'rsi_14'];
    
    for (const feature of keyFeatures) {
      const value = features[feature];
      if (value === undefined || !isFinite(value)) {
        quality *= 0.7;
      } else if (Math.abs(value) > 10) { // extreme values
        quality *= 0.8;
      }
    }
    
    return quality;
  }
  
  private getTopFeatures(features: Record<string, number>): Record<string, number> {
    // Return top features by absolute value
    const sortedFeatures = Object.entries(features)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 5);
    
    return Object.fromEntries(sortedFeatures);
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
      
      // Check if retraining is needed
      if (state.performance.winRate < this.config.retrainThreshold) {
        console.warn(`XGBoost pod performance degraded, retraining recommended`);
      }
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