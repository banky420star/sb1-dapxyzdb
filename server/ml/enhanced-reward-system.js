import { EventEmitter } from 'events';
import config from 'config';
import { Logger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/postgres-manager.js';

export class EnhancedModelRewardSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = new Logger('reward-system');
    this.database = options.database || new DatabaseManager();
    
    // Trading cost configuration
    this.tradingCosts = {
      transactionFeeBps: config.get('trading.fees.transactionBps') || 7, // 0.07%
      slippageBps: config.get('trading.fees.slippageBps') || 5, // 0.05%
      spreadCostBps: config.get('trading.fees.spreadCostBps') || 3, // 0.03%
      financingCostBps: config.get('trading.fees.financingCostBps') || 2, // 0.02% per day
    };
    
    // Reward configuration for different model types
    this.rewardConfig = {
      randomforest: {
        accuracy: { weight: 0.25, threshold: 0.55 },
        precision: { weight: 0.15, threshold: 0.50 },
        recall: { weight: 0.15, threshold: 0.50 },
        f1Score: { weight: 0.15, threshold: 0.50 },
        sharpeRatio: { weight: 0.20, threshold: 1.0 }, // Risk-adjusted returns
        maxDrawdown: { weight: 0.10, threshold: 0.15 }, // Maximum drawdown limit
      },
      lstm: {
        accuracy: { weight: 0.20, threshold: 0.60 },
        precision: { weight: 0.15, threshold: 0.55 },
        recall: { weight: 0.15, threshold: 0.55 },
        f1Score: { weight: 0.10, threshold: 0.55 },
        sharpeRatio: { weight: 0.25, threshold: 1.2 },
        maxDrawdown: { weight: 0.10, threshold: 0.12 },
        consistency: { weight: 0.05, threshold: 0.80 }, // Prediction consistency
      },
      ddqn: {
        accuracy: { weight: 0.15, threshold: 0.50 },
        precision: { weight: 0.10, threshold: 0.45 },
        recall: { weight: 0.10, threshold: 0.45 },
        f1Score: { weight: 0.10, threshold: 0.45 },
        sharpeRatio: { weight: 0.30, threshold: 1.5 }, // RL focuses on returns
        maxDrawdown: { weight: 0.15, threshold: 0.10 },
        explorationEfficiency: { weight: 0.10, threshold: 0.70 },
      }
    };
    
    // Performance tracking
    this.sessionRewards = new Map();
    this.tradeHistory = new Map();
    this.performanceBaselines = new Map();
  }

  async initialize() {
    try {
      if (!this.database.isInitialized) {
        await this.database.initialize();
      }
      this.logger.info('Enhanced Model Reward System initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize reward system:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive trading reward including real costs
   * @param {string} modelType - The model type (randomforest, lstm, ddqn)
   * @param {Object} tradingMetrics - Trading performance metrics
   * @param {Object} modelMetrics - Model accuracy metrics
   * @param {number} epoch - Current training epoch
   * @param {number} totalEpochs - Total training epochs
   */
  calculateTradingReward(modelType, tradingMetrics, modelMetrics, epoch, totalEpochs) {
    const config = this.rewardConfig[modelType];
    if (!config) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    const progress = epoch / totalEpochs;
    let totalReward = 0;
    const rewardBreakdown = {};

    // Calculate model performance metrics
    for (const [metric, metricConfig] of Object.entries(config)) {
      let metricValue = 0;
      let metricScore = 0;

      switch (metric) {
        case 'accuracy':
        case 'precision':
        case 'recall':
        case 'f1Score':
          metricValue = modelMetrics[metric] || 0;
          metricScore = this.calculateMetricScore(metricValue, metricConfig.threshold, progress);
          break;

        case 'sharpeRatio':
          metricValue = this.calculateRealSharpeRatio(tradingMetrics);
          metricScore = this.calculateMetricScore(metricValue, metricConfig.threshold, progress);
          break;

        case 'maxDrawdown':
          metricValue = tradingMetrics.maxDrawdown || 0;
          metricScore = this.calculateDrawdownScore(metricValue, metricConfig.threshold, progress);
          break;

        case 'consistency':
          metricValue = this.calculateConsistency(tradingMetrics);
          metricScore = this.calculateMetricScore(metricValue, metricConfig.threshold, progress);
          break;

        case 'explorationEfficiency':
          metricValue = tradingMetrics.explorationEfficiency || 0.5;
          metricScore = this.calculateMetricScore(metricValue, metricConfig.threshold, progress);
          break;
      }

      const weightedReward = metricScore * metricConfig.weight;
      totalReward += weightedReward;

      rewardBreakdown[metric] = {
        value: metricValue,
        score: metricScore,
        weight: metricConfig.weight,
        weightedReward: weightedReward,
        threshold: metricConfig.threshold
      };
    }

    // Add progress bonus with cost awareness
    const costAdjustedProgress = this.calculateCostAdjustedProgress(tradingMetrics, progress);
    totalReward += costAdjustedProgress * 0.1;

    // Penalty for high transaction costs
    const costPenalty = this.calculateCostPenalty(tradingMetrics);
    totalReward -= costPenalty;

    // Normalize reward to [0, 1] range
    const finalReward = Math.max(0, Math.min(1, totalReward));

    return {
      totalReward: finalReward,
      rewardBreakdown,
      progress,
      costAdjustedProgress,
      costPenalty,
      tradingCosts: this.calculateTotalTradingCosts(tradingMetrics),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate Sharpe ratio including transaction costs
   */
  calculateRealSharpeRatio(tradingMetrics) {
    if (!tradingMetrics.returns || tradingMetrics.returns.length === 0) {
      return 0;
    }

    // Apply transaction costs to returns
    const grossReturns = tradingMetrics.returns;
    const netReturns = grossReturns.map(grossReturn => {
      // Deduct transaction costs for each trade
      const totalCostBps = this.tradingCosts.transactionFeeBps + 
                          this.tradingCosts.slippageBps + 
                          this.tradingCosts.spreadCostBps;
      const costPercentage = totalCostBps / 10000; // Convert bps to percentage
      
      // Apply cost twice (entry and exit) for complete trades
      return grossReturn - (2 * costPercentage);
    });

    // Calculate Sharpe ratio
    const meanReturn = netReturns.reduce((a, b) => a + b, 0) / netReturns.length;
    const returnStd = this.calculateStandardDeviation(netReturns);
    
    if (returnStd === 0) return 0;
    
    // Annualized Sharpe ratio (assuming daily returns)
    const sharpeRatio = (meanReturn * Math.sqrt(252)) / (returnStd * Math.sqrt(252));
    
    return sharpeRatio;
  }

  /**
   * Calculate total trading costs for a given trading session
   */
  calculateTotalTradingCosts(tradingMetrics) {
    const { 
      totalTrades = 0, 
      totalVolume = 0, 
      holdingPeriodDays = 1,
      averageSpread = 0.0002 
    } = tradingMetrics;

    // Transaction fees (per trade)
    const transactionCosts = totalTrades * (this.tradingCosts.transactionFeeBps / 10000) * totalVolume;
    
    // Slippage costs (per trade)
    const slippageCosts = totalTrades * (this.tradingCosts.slippageBps / 10000) * totalVolume;
    
    // Spread costs (per trade)
    const spreadCosts = totalTrades * averageSpread * totalVolume;
    
    // Financing costs (for holding positions)
    const financingCosts = holdingPeriodDays * (this.tradingCosts.financingCostBps / 10000) * totalVolume;

    const totalCosts = transactionCosts + slippageCosts + spreadCosts + financingCosts;

    return {
      transactionCosts,
      slippageCosts,
      spreadCosts,
      financingCosts,
      totalCosts,
      costAsPercentageOfVolume: (totalCosts / Math.max(totalVolume, 1)) * 100
    };
  }

  /**
   * Calculate cost penalty based on trading frequency and costs
   */
  calculateCostPenalty(tradingMetrics) {
    const costs = this.calculateTotalTradingCosts(tradingMetrics);
    const costPercentage = costs.costAsPercentageOfVolume;
    
    // Penalty increases exponentially with cost percentage
    if (costPercentage > 5.0) {
      return 0.5; // Heavy penalty for very high costs
    } else if (costPercentage > 2.0) {
      return 0.3; // Moderate penalty
    } else if (costPercentage > 1.0) {
      return 0.1; // Light penalty
    }
    
    return 0; // No penalty for low costs
  }

  /**
   * Calculate cost-adjusted progress that considers trading efficiency
   */
  calculateCostAdjustedProgress(tradingMetrics, rawProgress) {
    const costs = this.calculateTotalTradingCosts(tradingMetrics);
    const grossProfit = tradingMetrics.totalProfit || 0;
    const netProfit = grossProfit - costs.totalCosts;
    
    // Adjust progress based on net profitability
    if (netProfit > 0) {
      return Math.min(1.0, rawProgress * (1 + netProfit * 0.1));
    } else {
      return Math.max(0, rawProgress * (1 + netProfit * 0.05));
    }
  }

  /**
   * Calculate consistency of trading performance
   */
  calculateConsistency(tradingMetrics) {
    if (!tradingMetrics.returns || tradingMetrics.returns.length < 10) {
      return 0.5; // Default for insufficient data
    }

    const returns = tradingMetrics.returns;
    const positiveReturns = returns.filter(r => r > 0).length;
    const winRate = positiveReturns / returns.length;
    
    // Calculate rolling window consistency
    const windowSize = Math.min(20, Math.floor(returns.length / 4));
    let consistencyScore = 0;
    
    for (let i = 0; i <= returns.length - windowSize; i++) {
      const window = returns.slice(i, i + windowSize);
      const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
      const windowStd = this.calculateStandardDeviation(window);
      
      // Reward positive mean with low volatility
      if (windowMean > 0 && windowStd < windowMean * 2) {
        consistencyScore += 1;
      }
    }
    
    const totalWindows = returns.length - windowSize + 1;
    const consistency = totalWindows > 0 ? consistencyScore / totalWindows : 0;
    
    return Math.min(1.0, consistency);
  }

  /**
   * Calculate metric score with progressive thresholds
   */
  calculateMetricScore(value, threshold, progress) {
    // Adjust threshold based on training progress
    const adjustedThreshold = threshold * (0.7 + 0.3 * progress);
    
    if (value >= adjustedThreshold) {
      return 1.0;
    } else if (value >= adjustedThreshold * 0.85) {
      return 0.8;
    } else if (value >= adjustedThreshold * 0.70) {
      return 0.6;
    } else if (value >= adjustedThreshold * 0.55) {
      return 0.4;
    } else {
      return 0.2;
    }
  }

  /**
   * Calculate drawdown score (lower drawdown is better)
   */
  calculateDrawdownScore(drawdown, threshold, progress) {
    const adjustedThreshold = threshold * (1 + 0.5 * (1 - progress)); // Allow higher drawdown early
    
    if (drawdown <= adjustedThreshold) {
      return 1.0;
    } else if (drawdown <= adjustedThreshold * 1.5) {
      return 0.6;
    } else if (drawdown <= adjustedThreshold * 2.0) {
      return 0.3;
    } else {
      return 0.1;
    }
  }

  /**
   * Calculate standard deviation of returns
   */
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Update reward for a training session
   */
  async updateSessionReward(sessionId, modelType, tradingMetrics, modelMetrics, epoch, totalEpochs) {
    try {
      const reward = this.calculateTradingReward(modelType, tradingMetrics, modelMetrics, epoch, totalEpochs);
      
      // Store in session tracking
      this.sessionRewards.set(sessionId, {
        ...reward,
        modelType,
        epoch,
        totalEpochs,
        sessionId,
        timestamp: Date.now()
      });

      // Store in database
      await this.database.saveTrainingProgress({
        modelType,
        runId: sessionId,
        epoch,
        metrics: {
          ...reward,
          tradingMetrics,
          modelMetrics
        },
        timestamp: Date.now()
      });

      // Emit reward update event
      this.emit('reward_update', {
        sessionId,
        modelType,
        reward: reward.totalReward,
        breakdown: reward.rewardBreakdown,
        costs: reward.tradingCosts,
        epoch,
        totalEpochs
      });

      this.logger.training(modelType, epoch, {
        reward: reward.totalReward,
        costs: reward.tradingCosts.totalCosts,
        sharpe: reward.rewardBreakdown.sharpeRatio?.value || 0
      });

      return reward;
    } catch (error) {
      this.logger.error('Failed to update session reward:', error);
      throw error;
    }
  }

  /**
   * Get reward statistics for a model type
   */
  getRewardStatistics(modelType) {
    const sessions = Array.from(this.sessionRewards.values())
      .filter(session => session.modelType === modelType);

    if (sessions.length === 0) {
      return {
        averageReward: 0,
        maxReward: 0,
        minReward: 0,
        totalSessions: 0,
        averageCosts: 0,
        trend: 'stable'
      };
    }

    const rewards = sessions.map(s => s.totalReward);
    const costs = sessions.map(s => s.tradingCosts?.totalCosts || 0);

    return {
      averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
      maxReward: Math.max(...rewards),
      minReward: Math.min(...rewards),
      totalSessions: sessions.length,
      averageCosts: costs.reduce((a, b) => a + b, 0) / costs.length,
      trend: this.calculateTrend(rewards.slice(-10))
    };
  }

  /**
   * Calculate trend from recent rewards
   */
  calculateTrend(recentRewards) {
    if (recentRewards.length < 3) return 'stable';

    const firstThird = recentRewards.slice(0, Math.floor(recentRewards.length / 3));
    const lastThird = recentRewards.slice(-Math.floor(recentRewards.length / 3));

    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    const change = (lastAvg - firstAvg) / firstAvg;

    if (change > 0.15) return 'improving';
    else if (change < -0.15) return 'declining';
    else return 'stable';
  }

  /**
   * Get detailed session breakdown
   */
  getSessionBreakdown(sessionId) {
    return this.sessionRewards.get(sessionId) || null;
  }

  /**
   * Clean up old session data
   */
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - maxAge;
    
    for (const [sessionId, session] of this.sessionRewards) {
      if (session.timestamp < cutoff) {
        this.sessionRewards.delete(sessionId);
      }
    }

    this.logger.info('Reward system cleanup completed');
  }
}

export default EnhancedModelRewardSystem; 