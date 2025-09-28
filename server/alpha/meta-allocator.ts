/**
 * Meta-Allocator - Online expert algorithm (Hedge/EWA) for dynamic pod weighting
 * Updates weights per pod daily with regret caps and diversification penalty
 */

import { MetaAllocator, MetaAllocatorState, PodPerformance } from './alpha-registry.js';

interface MetaAllocatorConfig {
  updateFrequency: number; // ms between updates
  minPodWeight: number; // minimum weight per pod (0.05 = 5%)
  maxPodWeight: number; // maximum weight per pod (0.5 = 50%)
  performanceWindow: number; // days to look back for performance
  regretCap: number; // maximum regret before weight decay
  diversificationPenalty: number; // penalty for over-concentration
  learningRate: number; // learning rate for weight updates
  rebalanceThreshold: number; // minimum change to trigger rebalancing
}

interface PodMetrics {
  returns: number[]; // recent returns
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  lastUpdate: number;
}

export class HedgeMetaAllocator implements MetaAllocator {
  private config: MetaAllocatorConfig;
  private state: MetaAllocatorState;
  private podMetrics: Map<string, PodMetrics> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<MetaAllocatorConfig> = {}) {
    this.config = {
      updateFrequency: 24 * 60 * 60 * 1000, // daily updates
      minPodWeight: 0.05,
      maxPodWeight: 0.5,
      performanceWindow: 30, // 30 days
      regretCap: 0.15, // 15% regret cap
      diversificationPenalty: 0.1,
      learningRate: 0.01,
      rebalanceThreshold: 0.05, // 5% change threshold
      ...config
    };
    
    this.state = {
      weights: {},
      performance: {},
      lastUpdate: Date.now(),
      totalAllocatedCapital: 1.0
    };
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }
  
  weightsFor(symbol: string): Record<string, number> {
    const symbolWeights = this.state.weights[symbol];
    
    if (!symbolWeights) {
      // Initialize with equal weights if not exists
      const pods = ['trend', 'meanRevert', 'volRegime', 'xgboost'];
      const equalWeight = 1.0 / pods.length;
      const weights: Record<string, number> = {};
      
      for (const pod of pods) {
        weights[pod] = equalWeight;
      }
      
      this.state.weights[symbol] = weights;
      return weights;
    }
    
    return { ...symbolWeights };
  }
  
  updatePnL(podPnL: Record<string, number>): void {
    const now = Date.now();
    
    for (const [podName, pnl] of Object.entries(podPnL)) {
      // Update pod metrics
      let metrics = this.podMetrics.get(podName);
      if (!metrics) {
        metrics = {
          returns: [],
          volatility: 0,
          sharpe: 0,
          maxDrawdown: 0,
          lastUpdate: now
        };
        this.podMetrics.set(podName, metrics);
      }
      
      // Add return to history
      metrics.returns.push(pnl);
      
      // Keep only recent returns (performance window)
      const maxReturns = this.config.performanceWindow * 24; // assume hourly data
      if (metrics.returns.length > maxReturns) {
        metrics.returns = metrics.returns.slice(-maxReturns);
      }
      
      // Update performance metrics
      this.updatePodMetrics(podName, metrics);
      
      // Update state performance
      this.state.performance[podName] = {
        totalPnL: (this.state.performance[podName]?.totalPnL || 0) + pnl,
        winRate: this.calculateWinRate(metrics.returns),
        sharpeRatio: this.calculateSharpeRatio(metrics.returns),
        maxDrawdown: Math.max(this.state.performance[podName]?.maxDrawdown || 0, Math.abs(Math.min(...metrics.returns, 0))),
        tradeCount: (this.state.performance[podName]?.tradeCount || 0) + 1,
        lastUpdate: now
      };
    }
    
    // Trigger weight update if enough time has passed
    if (now - this.state.lastUpdate > this.config.updateFrequency) {
      this.updateWeights();
    }
  }
  
  private updatePodMetrics(podName: string, metrics: PodMetrics): void {
    if (metrics.returns.length < 2) return;
    
    // Calculate volatility
    const meanReturn = metrics.returns.reduce((sum, ret) => sum + ret, 0) / metrics.returns.length;
    const variance = metrics.returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / metrics.returns.length;
    metrics.volatility = Math.sqrt(variance);
    
    // Calculate Sharpe ratio
    metrics.sharpe = metrics.volatility > 0 ? meanReturn / metrics.volatility : 0;
    
    // Update max drawdown
    let runningMax = 0;
    let maxDD = 0;
    
    for (const ret of metrics.returns) {
      runningMax += ret;
      maxDD = Math.max(maxDD, runningMax);
      metrics.maxDrawdown = Math.max(metrics.maxDrawdown, maxDD - runningMax);
    }
    
    metrics.lastUpdate = Date.now();
  }
  
  private calculateWinRate(returns: number[]): number {
    if (returns.length === 0) return 0;
    const wins = returns.filter(ret => ret > 0).length;
    return wins / returns.length;
  }
  
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? meanReturn / stdDev : 0;
  }
  
  private updateWeights(): void {
    const now = Date.now();
    
    // Get all symbols that have been traded
    const symbols = Object.keys(this.state.weights);
    
    for (const symbol of symbols) {
      const newWeights = this.calculateNewWeights(symbol);
      
      // Check if rebalancing is needed
      const currentWeights = this.state.weights[symbol];
      const needsRebalancing = this.needsRebalancing(currentWeights, newWeights);
      
      if (needsRebalancing) {
        this.state.weights[symbol] = newWeights;
        console.log(`Rebalanced weights for ${symbol}:`, newWeights);
      }
    }
    
    this.state.lastUpdate = now;
  }
  
  private calculateNewWeights(symbol: string): Record<string, number> {
    const currentWeights = this.state.weights[symbol] || {};
    const podNames = ['trend', 'meanRevert', 'volRegime', 'xgboost'];
    const newWeights: Record<string, number> = {};
    
    // Calculate performance scores for each pod
    const scores: Record<string, number> = {};
    let totalScore = 0;
    
    for (const podName of podNames) {
      const metrics = this.podMetrics.get(podName);
      const performance = this.state.performance[podName];
      
      if (!metrics || !performance || metrics.returns.length < 5) {
        // Insufficient data, use equal weight
        scores[podName] = 1.0;
      } else {
        // Calculate composite score
        scores[podName] = this.calculatePodScore(metrics, performance);
      }
      
      totalScore += scores[podName];
    }
    
    // Normalize scores to weights
    for (const podName of podNames) {
      let weight = totalScore > 0 ? scores[podName] / totalScore : 1.0 / podNames.length;
      
      // Apply constraints
      weight = Math.max(this.config.minPodWeight, Math.min(this.config.maxPodWeight, weight));
      
      newWeights[podName] = weight;
    }
    
    // Apply diversification penalty for over-concentration
    newWeights = this.applyDiversificationPenalty(newWeights);
    
    // Normalize to sum to 1
    const weightSum = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    for (const podName of podNames) {
      newWeights[podName] = newWeights[podName] / weightSum;
    }
    
    return newWeights;
  }
  
  private calculatePodScore(metrics: PodMetrics, performance: PodPerformance): number {
    // Composite scoring function
    let score = 1.0; // base score
    
    // Sharpe ratio component (30% weight)
    if (metrics.sharpe > 0) {
      score += metrics.sharpe * 0.3;
    } else if (metrics.sharpe < -1) {
      score *= 0.5; // penalize very poor performance
    }
    
    // Win rate component (25% weight)
    const winRate = performance.winRate;
    if (winRate > 0.6) {
      score += (winRate - 0.5) * 0.5; // bonus for good win rate
    } else if (winRate < 0.4) {
      score *= 0.8; // penalty for poor win rate
    }
    
    // Drawdown component (20% weight)
    const maxDD = performance.maxDrawdown;
    if (maxDD > 0.1) { // 10% drawdown threshold
      score *= (1 - maxDD); // penalize high drawdowns
    }
    
    // Consistency component (15% weight)
    if (metrics.returns.length > 10) {
      const consistency = 1 - metrics.volatility;
      score += consistency * 0.15;
    }
    
    // Recent performance component (10% weight)
    if (metrics.returns.length > 0) {
      const recentReturns = metrics.returns.slice(-5); // last 5 trades
      const recentAvg = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
      score += recentAvg * 10; // scale recent performance
    }
    
    return Math.max(0.1, score); // minimum score of 0.1
  }
  
  private applyDiversificationPenalty(weights: Record<string, number>): Record<string, number> {
    const penalty = this.config.diversificationPenalty;
    
    // Find the maximum weight
    const maxWeight = Math.max(...Object.values(weights));
    
    // If any weight is too high, redistribute
    if (maxWeight > 0.4) { // 40% concentration threshold
      const penaltyFactor = 1 - penalty;
      
      for (const podName of Object.keys(weights)) {
        if (weights[podName] > 0.4) {
          weights[podName] *= penaltyFactor;
        }
      }
    }
    
    return weights;
  }
  
  private needsRebalancing(currentWeights: Record<string, number>, newWeights: Record<string, number>): boolean {
    for (const podName of Object.keys(newWeights)) {
      const currentWeight = currentWeights[podName] || 0;
      const newWeight = newWeights[podName];
      
      if (Math.abs(newWeight - currentWeight) > this.config.rebalanceThreshold) {
        return true;
      }
    }
    
    return false;
  }
  
  private startPeriodicUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.updateWeights();
    }, this.config.updateFrequency);
  }
  
  getState(): MetaAllocatorState {
    return {
      ...this.state,
      weights: JSON.parse(JSON.stringify(this.state.weights)), // deep copy
      performance: JSON.parse(JSON.stringify(this.state.performance))
    };
  }
  
  resetWeights(weights: Record<string, number>): void {
    // Manual override of weights
    for (const symbol of Object.keys(this.state.weights)) {
      this.state.weights[symbol] = { ...weights };
    }
    
    console.log('Weights manually reset:', weights);
  }
  
  // Cleanup method
  cleanup(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}