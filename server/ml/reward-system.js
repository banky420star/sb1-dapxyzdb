import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class ModelRewardSystem extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    
    // Reward metrics for each model type
    this.rewardMetrics = {
      randomforest: {
        accuracy: { weight: 0.4, threshold: 0.55 },
        precision: { weight: 0.2, threshold: 0.5 },
        recall: { weight: 0.2, threshold: 0.5 },
        f1Score: { weight: 0.2, threshold: 0.5 },
        trainingSpeed: { weight: 0.1, threshold: 30 }, // seconds
        dataEfficiency: { weight: 0.1, threshold: 0.8 } // samples used effectively
      },
      lstm: {
        accuracy: { weight: 0.35, threshold: 0.60 },
        precision: { weight: 0.15, threshold: 0.55 },
        recall: { weight: 0.15, threshold: 0.55 },
        f1Score: { weight: 0.15, threshold: 0.55 },
        trainingSpeed: { weight: 0.1, threshold: 60 }, // seconds
        convergence: { weight: 0.1, threshold: 0.7 }, // loss convergence
        overfitting: { weight: 0.05, threshold: 0.1 } // validation vs training gap
      },
      ddqn: {
        accuracy: { weight: 0.3, threshold: 0.50 },
        precision: { weight: 0.15, threshold: 0.45 },
        recall: { weight: 0.15, threshold: 0.45 },
        f1Score: { weight: 0.15, threshold: 0.45 },
        trainingSpeed: { weight: 0.1, threshold: 90 }, // seconds
        exploration: { weight: 0.1, threshold: 0.6 }, // exploration rate
        stability: { weight: 0.05, threshold: 0.8 } // reward stability
      }
    }
    
    // Reward history
    this.rewardHistory = new Map()
    this.currentRewards = new Map()
    this.performanceBaselines = new Map()
  }

  async initialize() {
    try {
      await this.db.initialize()
      this.logger.info('Model Reward System initialized')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Model Reward System:', error)
      throw error
    }
  }

  // Calculate reward for a model during training
  calculateTrainingReward(modelType, metrics, trainingTime, epoch, totalEpochs) {
    const modelRewards = this.rewardMetrics[modelType]
    if (!modelRewards) {
      this.logger.warn(`No reward metrics defined for model type: ${modelType}`)
      return 0
    }

    let totalReward = 0
    const rewardBreakdown = {}
    const progress = epoch / totalEpochs

    // Calculate rewards for each metric
    for (const [metric, config] of Object.entries(modelRewards)) {
      let metricValue = 0
      let metricScore = 0

      switch (metric) {
        case 'accuracy':
          metricValue = metrics.accuracy || 0
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'precision':
          metricValue = metrics.precision || 0
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'recall':
          metricValue = metrics.recall || 0
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'f1Score':
          metricValue = metrics.f1Score || 0
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'trainingSpeed':
          // Reward faster training (lower time is better)
          const expectedTime = config.threshold * 1000 // convert to ms
          metricValue = trainingTime
          metricScore = this.calculateSpeedScore(trainingTime, expectedTime, progress)
          break
        case 'dataEfficiency':
          // Reward efficient use of training data
          metricValue = metrics.dataEfficiency || 0.8
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'convergence':
          // Reward good loss convergence
          metricValue = metrics.convergence || 0.7
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'overfitting':
          // Penalize overfitting (lower is better)
          metricValue = metrics.overfitting || 0.1
          metricScore = this.calculateOverfittingScore(metricValue, config.threshold, progress)
          break
        case 'exploration':
          // Reward good exploration in RL
          metricValue = metrics.exploration || 0.6
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
        case 'stability':
          // Reward stable training
          metricValue = metrics.stability || 0.8
          metricScore = this.calculateMetricScore(metricValue, config.threshold, progress)
          break
      }

      const weightedReward = metricScore * config.weight
      totalReward += weightedReward
      rewardBreakdown[metric] = {
        value: metricValue,
        score: metricScore,
        weight: config.weight,
        weightedReward: weightedReward,
        threshold: config.threshold
      }
    }

    // Add progress bonus
    const progressBonus = progress * 0.1
    totalReward += progressBonus

    return {
      totalReward: Math.max(0, Math.min(1, totalReward)),
      rewardBreakdown,
      progress,
      progressBonus,
      timestamp: Date.now()
    }
  }

  // Calculate score for a metric based on threshold and progress
  calculateMetricScore(value, threshold, progress) {
    // Early in training, be more lenient
    const adjustedThreshold = threshold * (0.5 + 0.5 * progress)
    
    if (value >= adjustedThreshold) {
      return 1.0
    } else if (value >= adjustedThreshold * 0.8) {
      return 0.8
    } else if (value >= adjustedThreshold * 0.6) {
      return 0.6
    } else if (value >= adjustedThreshold * 0.4) {
      return 0.4
    } else {
      return 0.2
    }
  }

  // Calculate speed score (lower time is better)
  calculateSpeedScore(actualTime, expectedTime, progress) {
    const adjustedExpectedTime = expectedTime * (1 + progress) // Allow more time early
    const ratio = actualTime / adjustedExpectedTime
    
    if (ratio <= 0.8) return 1.0
    else if (ratio <= 1.0) return 0.8
    else if (ratio <= 1.2) return 0.6
    else if (ratio <= 1.5) return 0.4
    else return 0.2
  }

  // Calculate overfitting score (lower overfitting is better)
  calculateOverfittingScore(overfittingValue, threshold, progress) {
    const adjustedThreshold = threshold * (1 + progress) // Allow more overfitting early
    
    if (overfittingValue <= adjustedThreshold) return 1.0
    else if (overfittingValue <= adjustedThreshold * 1.5) return 0.6
    else if (overfittingValue <= adjustedThreshold * 2.0) return 0.3
    else return 0.1
  }

  // Update reward during training
  updateTrainingReward(sessionId, modelType, metrics, trainingTime, epoch, totalEpochs) {
    const reward = this.calculateTrainingReward(modelType, metrics, trainingTime, epoch, totalEpochs)
    
    // Store current reward
    this.currentRewards.set(sessionId, {
      ...reward,
      modelType,
      epoch,
      totalEpochs
    })
    
    // Add to history
    if (!this.rewardHistory.has(sessionId)) {
      this.rewardHistory.set(sessionId, [])
    }
    this.rewardHistory.get(sessionId).push(reward)
    
    // Emit reward update
    this.emit('reward_update', {
      sessionId,
      modelType,
      reward,
      epoch,
      totalEpochs
    })
    
    this.logger.info(`Reward update for ${modelType}: ${reward.totalReward.toFixed(3)} (epoch ${epoch}/${totalEpochs})`)
    
    return reward
  }

  // Get reward history for a session
  getRewardHistory(sessionId) {
    return this.rewardHistory.get(sessionId) || []
  }

  // Get current reward for a session
  getCurrentReward(sessionId) {
    return this.currentRewards.get(sessionId)
  }

  // Get reward statistics
  getRewardStats(modelType) {
    const allRewards = []
    
    for (const [sessionId, rewards] of this.rewardHistory) {
      const currentReward = this.currentRewards.get(sessionId)
      if (currentReward && currentReward.modelType === modelType) {
        allRewards.push(...rewards)
      }
    }
    
    if (allRewards.length === 0) {
      return {
        averageReward: 0,
        maxReward: 0,
        minReward: 0,
        totalSessions: 0,
        recentTrend: 'stable'
      }
    }
    
    const totalRewards = allRewards.map(r => r.totalReward)
    const recentRewards = allRewards.slice(-10).map(r => r.totalReward)
    
    return {
      averageReward: totalRewards.reduce((a, b) => a + b, 0) / totalRewards.length,
      maxReward: Math.max(...totalRewards),
      minReward: Math.min(...totalRewards),
      totalSessions: new Set([...this.rewardHistory.keys()].filter(id => 
        this.currentRewards.get(id)?.modelType === modelType
      )).size,
      recentTrend: this.calculateTrend(recentRewards)
    }
  }

  // Calculate trend from recent rewards
  calculateTrend(rewards) {
    if (rewards.length < 2) return 'stable'
    
    const firstHalf = rewards.slice(0, Math.floor(rewards.length / 2))
    const secondHalf = rewards.slice(Math.floor(rewards.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    const change = secondAvg - firstAvg
    
    if (change > 0.1) return 'improving'
    else if (change < -0.1) return 'declining'
    else return 'stable'
  }

  // Get reward breakdown for visualization
  getRewardBreakdown(sessionId) {
    const currentReward = this.currentRewards.get(sessionId)
    if (!currentReward) return null
    
    return {
      totalReward: currentReward.totalReward,
      breakdown: currentReward.rewardBreakdown,
      progress: currentReward.progress,
      modelType: currentReward.modelType,
      epoch: currentReward.epoch,
      totalEpochs: currentReward.totalEpochs
    }
  }

  // Get all active rewards
  getActiveRewards() {
    const active = []
    for (const [sessionId, reward] of this.currentRewards) {
      active.push({
        sessionId,
        modelType: reward.modelType,
        totalReward: reward.totalReward,
        progress: reward.progress,
        epoch: reward.epoch,
        totalEpochs: reward.totalEpochs,
        timestamp: reward.timestamp
      })
    }
    return active
  }

  // Clear completed session rewards
  clearSessionRewards(sessionId) {
    this.currentRewards.delete(sessionId)
    // Keep history for analysis
  }

  // Get reward metrics configuration
  getRewardMetrics(modelType) {
    return this.rewardMetrics[modelType] || {}
  }

  // Update reward metrics configuration
  updateRewardMetrics(modelType, newMetrics) {
    this.rewardMetrics[modelType] = {
      ...this.rewardMetrics[modelType],
      ...newMetrics
    }
    this.logger.info(`Updated reward metrics for ${modelType}`)
  }

  // Save reward data to database
  async saveRewardData(sessionId, rewardData) {
    try {
      await this.db.saveRewardData(sessionId, rewardData)
    } catch (error) {
      this.logger.error('Failed to save reward data:', error)
    }
  }

  // Load reward data from database
  async loadRewardData(sessionId) {
    try {
      return await this.db.getRewardData(sessionId)
    } catch (error) {
      this.logger.error('Failed to load reward data:', error)
      return null
    }
  }
} 