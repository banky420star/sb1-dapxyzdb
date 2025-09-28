/**
 * Alpha Pod Registry - Core interfaces for the alpha pod system
 * Replaces the old "3-model consensus" with independent, ensembleable strategies
 */

export interface AlphaSignal {
  symbol: string;
  timestamp: number;
  signal: number; // -1 to 1, where 1 = strong buy, -1 = strong sell
  confidence: number; // 0 to 1, model confidence in this signal
  volatility: number; // expected volatility for risk sizing
  pod: string; // pod name
  metadata?: Record<string, any>; // pod-specific data
}

export interface AlphaPod {
  name: string;
  warmupBars: number; // minimum bars needed before generating signals
  enabled: boolean;
  
  // Core computation - returns null if not enough data
  compute(features: Record<string, number>, marketData?: any): AlphaSignal | null;
  
  // Pod lifecycle
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  
  // Performance tracking
  getPerformance?(): PodPerformance;
  updatePerformance?(pnl: number): void;
}

export interface PodPerformance {
  totalPnL: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradeCount: number;
  lastUpdate: number;
}

export interface MetaAllocator {
  // Get current weights for each pod for a symbol
  weightsFor(symbol: string): Record<string, number>; // podName -> weight in [0,1], sum <= 1
  
  // Update performance and adjust weights
  updatePnL(podPnL: Record<string, number>): void;
  
  // Get allocator state
  getState(): MetaAllocatorState;
  
  // Reset weights (for testing or manual override)
  resetWeights?(weights: Record<string, number>): void;
}

export interface MetaAllocatorState {
  weights: Record<string, Record<string, number>>; // symbol -> pod -> weight
  performance: Record<string, PodPerformance>; // pod -> performance
  lastUpdate: number;
  totalAllocatedCapital: number;
}

export interface AlphaEngineConfig {
  pods: {
    trend: { enabled: boolean; weight: number; params: any };
    meanRevert: { enabled: boolean; weight: number; params: any };
    volRegime: { enabled: boolean; weight: number; params: any };
    xgboost: { enabled: boolean; weight: number; params: any };
  };
  metaAllocator: {
    enabled: boolean;
    updateFrequency: number; // ms
    minPodWeight: number; // minimum weight per pod
    maxPodWeight: number; // maximum weight per pod
    performanceWindow: number; // days to look back for performance
  };
  risk: {
    maxSignalStrength: number; // cap signal at this level
    confidenceThreshold: number; // minimum confidence to trade
    volatilityAdjustment: boolean; // adjust position size by volatility
  };
}

// Global registry for alpha pods
export class AlphaRegistry {
  private pods: Map<string, AlphaPod> = new Map();
  private metaAllocator: MetaAllocator;
  private config: AlphaEngineConfig;
  
  constructor(config: AlphaEngineConfig, metaAllocator: MetaAllocator) {
    this.config = config;
    this.metaAllocator = metaAllocator;
  }
  
  async registerPod(pod: AlphaPod): Promise<void> {
    if (pod.initialize) {
      await pod.initialize();
    }
    this.pods.set(pod.name, pod);
  }
  
  async unregisterPod(name: string): Promise<void> {
    const pod = this.pods.get(name);
    if (pod && pod.cleanup) {
      await pod.cleanup();
    }
    this.pods.delete(name);
  }
  
  getPod(name: string): AlphaPod | undefined {
    return this.pods.get(name);
  }
  
  getAllPods(): AlphaPod[] {
    return Array.from(this.pods.values()).filter(pod => pod.enabled);
  }
  
  async computeSignals(symbol: string, features: Record<string, number>, marketData?: any): Promise<AlphaSignal[]> {
    const signals: AlphaSignal[] = [];
    
    for (const pod of this.getAllPods()) {
      try {
        const signal = pod.compute(features, marketData);
        if (signal) {
          signal.pod = pod.name;
          signal.symbol = symbol;
          signal.timestamp = Date.now();
          signals.push(signal);
        }
      } catch (error) {
        console.error(`Error computing signal for pod ${pod.name}:`, error);
      }
    }
    
    return signals;
  }
  
  getMetaAllocator(): MetaAllocator {
    return this.metaAllocator;
  }
  
  async blendSignals(signals: AlphaSignal[], symbol: string): Promise<{ signal: number; confidence: number; attribution: Record<string, number> }> {
    const weights = this.metaAllocator.weightsFor(symbol);
    let totalWeight = 0;
    let weightedSignal = 0;
    let weightedConfidence = 0;
    const attribution: Record<string, number> = {};
    
    for (const signal of signals) {
      const weight = weights[signal.pod] || 0;
      if (weight > 0) {
        totalWeight += weight;
        weightedSignal += signal.signal * signal.confidence * weight;
        weightedConfidence += signal.confidence * weight;
        attribution[signal.pod] = signal.signal * weight;
      }
    }
    
    if (totalWeight === 0) {
      return { signal: 0, confidence: 0, attribution: {} };
    }
    
    return {
      signal: weightedSignal / totalWeight,
      confidence: weightedConfidence / totalWeight,
      attribution
    };
  }
  
  async updatePerformance(podPnL: Record<string, number>): Promise<void> {
    // Update individual pod performance
    for (const [podName, pnl] of Object.entries(podPnL)) {
      const pod = this.pods.get(podName);
      if (pod && pod.updatePerformance) {
        pod.updatePerformance(pnl);
      }
    }
    
    // Update meta allocator
    this.metaAllocator.updatePnL(podPnL);
  }
  
  getConfig(): AlphaEngineConfig {
    return this.config;
  }
  
  async cleanup(): Promise<void> {
    for (const pod of this.pods.values()) {
      if (pod.cleanup) {
        await pod.cleanup();
      }
    }
    this.pods.clear();
  }
}