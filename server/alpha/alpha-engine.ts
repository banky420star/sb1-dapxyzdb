/**
 * Alpha Engine - Main orchestrator for the alpha pod system
 * Replaces the old "3-model consensus" with ensemble of independent strategies
 */

import { AlphaRegistry, AlphaEngineConfig, AlphaSignal } from './alpha-registry.js';
import { TrendPod } from './pods/trend-pod.js';
import { MeanRevertPod } from './pods/mean-revert-pod.js';
import { VolatilityRegimePod } from './pods/volatility-regime-pod.js';
import { XGBoostPod } from './pods/xgboost-pod.js';
import { HedgeMetaAllocator } from './meta-allocator.js';

export interface AlphaEngineResult {
  signal: number; // -1 to 1, blended signal
  confidence: number; // 0 to 1, overall confidence
  attribution: Record<string, number>; // pod -> contribution
  podSignals: AlphaSignal[]; // individual pod signals
  metadata: {
    timestamp: number;
    symbol: string;
    weights: Record<string, number>;
    riskAdjusted: boolean;
  };
}

export class AlphaEngine {
  private registry: AlphaRegistry;
  private config: AlphaEngineConfig;
  private isInitialized = false;
  
  constructor(config: Partial<AlphaEngineConfig> = {}) {
    this.config = this.mergeConfig(config);
    
    // Initialize meta allocator
    const metaAllocator = new HedgeMetaAllocator(this.config.metaAllocator);
    
    // Initialize registry
    this.registry = new AlphaRegistry(this.config, metaAllocator);
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Alpha Engine...');
      
      // Register alpha pods
      await this.registerAlphaPods();
      
      this.isInitialized = true;
      console.log('Alpha Engine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Alpha Engine:', error);
      throw error;
    }
  }
  
  private async registerAlphaPods(): Promise<void> {
    // Register Trend Pod
    if (this.config.pods.trend.enabled) {
      const trendPod = new TrendPod(this.config.pods.trend.params);
      await this.registry.registerPod(trendPod);
      console.log('Registered Trend pod');
    }
    
    // Register Mean Reversion Pod
    if (this.config.pods.meanRevert.enabled) {
      const meanRevertPod = new MeanRevertPod(this.config.pods.meanRevert.params);
      await this.registry.registerPod(meanRevertPod);
      console.log('Registered Mean Revert pod');
    }
    
    // Register Volatility Regime Pod
    if (this.config.pods.volRegime.enabled) {
      const volRegimePod = new VolatilityRegimePod(this.config.pods.volRegime.params);
      await this.registry.registerPod(volRegimePod);
      console.log('Registered Volatility Regime pod');
    }
    
    // Register XGBoost Pod
    if (this.config.pods.xgboost.enabled) {
      const xgboostPod = new XGBoostPod(this.config.pods.xgboost.params);
      await this.registry.registerPod(xgboostPod);
      console.log('Registered XGBoost pod');
    }
  }
  
  async computeAlpha(symbol: string, features: Record<string, number>, marketData?: any): Promise<AlphaEngineResult | null> {
    if (!this.isInitialized) {
      throw new Error('Alpha Engine not initialized');
    }
    
    try {
      // Get signals from all pods
      const podSignals = await this.registry.computeSignals(symbol, features, marketData);
      
      if (podSignals.length === 0) {
        return null;
      }
      
      // Blend signals using meta allocator weights
      const blended = await this.registry.blendSignals(podSignals, symbol);
      
      // Apply risk adjustments
      const riskAdjusted = this.applyRiskAdjustments(blended, podSignals);
      
      // Create result
      const result: AlphaEngineResult = {
        signal: riskAdjusted.signal,
        confidence: riskAdjusted.confidence,
        attribution: riskAdjusted.attribution,
        podSignals,
        metadata: {
          timestamp: Date.now(),
          symbol,
          weights: this.registry.getMetaAllocator().weightsFor(symbol),
          riskAdjusted: true
        }
      };
      
      // Apply final filters
      if (!this.passesFilters(result)) {
        return null;
      }
      
      return result;
      
    } catch (error) {
      console.error(`Error computing alpha for ${symbol}:`, error);
      return null;
    }
  }
  
  private applyRiskAdjustments(blended: { signal: number; confidence: number; attribution: Record<string, number> }, podSignals: AlphaSignal[]): { signal: number; confidence: number; attribution: Record<string, number> } {
    let { signal, confidence, attribution } = blended;
    
    // Cap signal strength
    const maxSignal = this.config.risk.maxSignalStrength;
    if (Math.abs(signal) > maxSignal) {
      signal = Math.sign(signal) * maxSignal;
    }
    
    // Apply confidence threshold
    if (confidence < this.config.risk.confidenceThreshold) {
      signal = 0;
      confidence = 0;
    }
    
    // Volatility adjustment
    if (this.config.risk.volatilityAdjustment) {
      const avgVolatility = podSignals.reduce((sum, s) => sum + s.volatility, 0) / podSignals.length;
      
      // Reduce signal strength in high volatility
      if (avgVolatility > 0.05) { // 5% volatility threshold
        const volFactor = Math.max(0.5, 1 - (avgVolatility - 0.05) * 2);
        signal *= volFactor;
        confidence *= volFactor;
      }
    }
    
    return { signal, confidence, attribution };
  }
  
  private passesFilters(result: AlphaEngineResult): boolean {
    // Minimum confidence filter
    if (result.confidence < this.config.risk.confidenceThreshold) {
      return false;
    }
    
    // Minimum signal strength filter
    if (Math.abs(result.signal) < 0.1) {
      return false;
    }
    
    // Check if we have enough pods contributing
    const contributingPods = Object.values(result.attribution).filter(contrib => Math.abs(contrib) > 0.01).length;
    if (contributingPods < 1) {
      return false;
    }
    
    return true;
  }
  
  async updatePerformance(podPnL: Record<string, number>): Promise<void> {
    await this.registry.updatePerformance(podPnL);
  }
  
  getRegistry(): AlphaRegistry {
    return this.registry;
  }
  
  getMetaAllocatorState(): any {
    return this.registry.getMetaAllocator().getState();
  }
  
  getPodPerformances(): Record<string, any> {
    const performances: Record<string, any> = {};
    
    for (const pod of this.registry.getAllPods()) {
      performances[pod.name] = pod.getPerformance ? pod.getPerformance() : null;
    }
    
    return performances;
  }
  
  private mergeConfig(userConfig: Partial<AlphaEngineConfig>): AlphaEngineConfig {
    const defaultConfig: AlphaEngineConfig = {
      pods: {
        trend: {
          enabled: true,
          weight: 0.25,
          params: {
            atrPeriod: 14,
            atrMultiplier: 2.0,
            minBreakoutStrength: 0.6,
            trailingStopPct: 0.02,
            maxHoldBars: 20,
            minVolatility: 0.001
          }
        },
        meanRevert: {
          enabled: true,
          weight: 0.25,
          params: {
            shortPeriod: 5,
            longPeriod: 20,
            zScoreThreshold: 2.0,
            fundingThreshold: 0.001,
            volatilityFilter: 0.0005,
            maxHoldingPeriod: 15,
            meanReversionStrength: 0.7
          }
        },
        volRegime: {
          enabled: true,
          weight: 0.25,
          params: {
            volLookback: 20,
            regimeThreshold: 0.6,
            lowVolStrategy: 'mean_revert',
            highVolStrategy: 'breakout',
            volSmoothing: 0.1,
            regimePersistence: 5,
            adaptiveThreshold: true
          }
        },
        xgboost: {
          enabled: true,
          weight: 0.25,
          params: {
            features: [
              'returns_1', 'returns_5', 'returns_10',
              'volatility_5', 'volatility_20',
              'rsi_14', 'rsi_5',
              'skew_10', 'kurtosis_10',
              'funding_rate', 'basis',
              'volume_ratio', 'volume_trend',
              'time_of_day', 'day_of_week'
            ],
            maxFeatures: 12,
            minConfidence: 0.55,
            retrainThreshold: 0.45,
            lookbackPeriod: 50,
            predictionHorizon: 5
          }
        }
      },
      metaAllocator: {
        enabled: true,
        updateFrequency: 24 * 60 * 60 * 1000, // daily
        minPodWeight: 0.05,
        maxPodWeight: 0.5,
        performanceWindow: 30
      },
      risk: {
        maxSignalStrength: 0.8,
        confidenceThreshold: 0.6,
        volatilityAdjustment: true
      }
    };
    
    // Deep merge configs
    return this.deepMerge(defaultConfig, userConfig);
  }
  
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  async cleanup(): Promise<void> {
    await this.registry.cleanup();
    this.isInitialized = false;
  }
}

// Factory function for easy initialization
export async function createAlphaEngine(config?: Partial<AlphaEngineConfig>): Promise<AlphaEngine> {
  const engine = new AlphaEngine(config);
  await engine.initialize();
  return engine;
}