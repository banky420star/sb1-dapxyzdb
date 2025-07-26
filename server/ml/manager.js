import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { RandomForestModel } from './models/randomforest.js'
import { LSTMModel } from './models/lstm.js'
import { DDQNModel } from './models/ddqn.js'
import { TrainingVisualizer } from './training-visualizer.js'
import { ModelRewardSystem } from './reward-system.js'
import fs from 'fs'
import path from 'path'
const io = require('socket.io');
const logger = require('../utils/logger');

class MLManager {
    constructor(server) {
        this.io = io(server);
        this.models = {
            LSTM: { status: 'idle', epoch: 0, epochs: 20, loss: 0, acc: 0 },
            RF: { status: 'idle', epoch: 0, epochs: 15, loss: 0, acc: 0 },
            DDQN: { status: 'idle', epoch: 0, epochs: 25, loss: 0, acc: 0 }
        };
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info('Client connected to ML manager');
            
            // Send current state to new client
            socket.emit('model_activity', this.models);
            
            socket.on('disconnect', () => {
                logger.info('Client disconnected from ML manager');
            });
        });
    }

    emitModelActivity(model, data) {
        const activity = {
            model,
            epoch: data.epoch || 0,
            epochs: data.epochs || 20,
            batch: data.batch || 0,
            loss: data.loss || 0,
            acc: data.acc || 0,
            extra: {
                hiddenNorm: data.hiddenNorm || 0,
                gradientNorm: data.gradientNorm || 0,
                qValue: data.qValue || 0
            },
            timestamp: Date.now()
        };

        this.models[model] = activity;
        this.io.emit('model_activity', activity);
        logger.info(`Emitted ${model} activity:`, activity);
    }

    // Simulate training for demonstration
    async simulateTraining(model) {
        const epochs = this.models[model].epochs;
        const batches = 50;
        
        this.models[model].status = 'training';
        this.emitModelActivity(model, { status: 'training', epoch: 0, epochs });

        for (let epoch = 1; epoch <= epochs; epoch++) {
            for (let batch = 1; batch <= batches; batch++) {
                // Simulate training metrics
                const progress = (epoch - 1 + batch / batches) / epochs;
                const loss = Math.max(0.1, 2.0 * Math.exp(-progress * 3) + Math.random() * 0.1);
                const acc = Math.min(0.95, 0.3 + progress * 0.6 + Math.random() * 0.05);
                const gradientNorm = 0.5 + Math.random() * 0.5;
                const hiddenNorm = 0.3 + Math.random() * 0.4;
                const qValue = model === 'DDQN' ? 0.2 + progress * 0.7 + Math.random() * 0.1 : 0;

                this.emitModelActivity(model, {
                    epoch,
                    epochs,
                    batch,
                    loss: parseFloat(loss.toFixed(4)),
                    acc: parseFloat(acc.toFixed(4)),
                    hiddenNorm: parseFloat(hiddenNorm.toFixed(4)),
                    gradientNorm: parseFloat(gradientNorm.toFixed(4)),
                    qValue: parseFloat(qValue.toFixed(4))
                });

                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }

        this.models[model].status = 'completed';
        this.emitModelActivity(model, { status: 'completed', epoch: epochs, epochs });
        logger.info(`${model} training completed`);
    }

    // Start training for a specific model
    startTraining(model) {
        if (this.models[model].status === 'training') {
            logger.warn(`${model} is already training`);
            return;
        }
        
        logger.info(`Starting ${model} training`);
        this.simulateTraining(model);
    }

    // Get current model states
    getModelStates() {
        return this.models;
    }
}

module.exports = MLManager;

export class ModelManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.trainingVisualizer = new TrainingVisualizer()
    this.rewardSystem = new ModelRewardSystem()
    this.isInitialized = false
    this.io = null // Socket.IO instance for real-time updates
    
    // Model instances
    this.models = new Map()
    this.activeModels = new Map()
    this.modelPerformance = new Map()
    
    // Configuration
    this.config = {
      models: {
        randomforest: {
          enabled: true,
          weight: 0.4,
          retrainInterval: 24 * 60 * 60 * 1000, // 24 hours
          minAccuracy: 0.55,
          minSamples: 1000, // Minimum samples required for training
          epochs: 100,
          batchSize: 32,
          learningRate: 0.001
        },
        lstm: {
          enabled: true,
          weight: 0.35,
          retrainInterval: 12 * 60 * 60 * 1000, // 12 hours
          minAccuracy: 0.60,
          minSamples: 2000, // LSTM needs more data
          epochs: 50,
          batchSize: 64,
          learningRate: 0.001
        },
        ddqn: {
          enabled: true,
          weight: 0.25,
          retrainInterval: 6 * 60 * 60 * 1000, // 6 hours
          minAccuracy: 0.50,
          minSamples: 1500, // DDQN needs substantial data
          epochs: 200,
          batchSize: 32,
          learningRate: 0.0001
        }
      },
      ensemble: {
        minModels: 2,
        confidenceThreshold: 0.6,
        agreementThreshold: 0.7
      },
      training: {
        lookbackPeriod: 3000, // Increased from 1000 to 3000 bars
        validationSplit: 0.2,
        testSplit: 0.1,
        maxTrainingTime: 30 * 60 * 1000, // 30 minutes
        minDataPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days minimum data period
        requiredSymbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
        requiredTimeframes: ['1m', '5m', '15m', '1h']
      }
    }
    
    // Training state
    this.trainingQueue = []
    this.isTraining = false
    this.trainingHistory = []
    
    // Performance tracking
    this.predictionHistory = []
    this.accuracyWindow = 100 // Last 100 predictions for accuracy calculation
  }

  async initialize() {
    try {
      this.logger.info('Initializing Model Manager')
      
      // Initialize database
      await this.db.initialize()
      
      // Initialize training visualizer
      await this.trainingVisualizer.initialize()
      
      // Initialize reward system
      await this.rewardSystem.initialize()
      
      // Initialize models
      await this.initializeModels()
      
      // Load model states
      await this.loadModelStates()
      
      // Start performance monitoring
      this.startPerformanceMonitoring()
      
      // Start training scheduler
      await this.startTrainingScheduler()
      
      this.isInitialized = true
      this.logger.info('Model Manager initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Model Manager:', error)
      throw error
    }
  }

  // Set Socket.IO instance for real-time updates
  setSocketIO(io) {
    this.io = io
    this.trainingVisualizer.setSocketIO(io)
    
    // Forward reward system events to Socket.IO
    this.rewardSystem.on('reward_update', (data) => {
      io.emit('reward_update', data)
    })
  }

  async reinitialize() {
    this.logger.info('Reinitializing model manager...')
    try {
      await this.initialize()
      this.logger.info('Model manager reinitialized successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to reinitialize model manager:', error)
      return false
    }
  }

  async initializeModels() {
    try {
      // Initialize Random Forest
      if (this.config.models.randomforest.enabled) {
        const rfModel = new RandomForestModel()
        await rfModel.initialize()
        this.models.set('randomforest', rfModel)
        this.logger.info('Random Forest model initialized')
      }
      
      // Initialize LSTM
      if (this.config.models.lstm.enabled) {
        const lstmModel = new LSTMModel()
        await lstmModel.initialize()
        this.models.set('lstm', lstmModel)
        this.logger.info('LSTM model initialized')
      }
      
      // Initialize DDQN
      if (this.config.models.ddqn.enabled) {
        const ddqnModel = new DDQNModel()
        await ddqnModel.initialize()
        this.models.set('ddqn', ddqnModel)
        this.logger.info('DDQN model initialized')
      }
      
      this.logger.info(`Initialized ${this.models.size} models`)
    } catch (error) {
      this.logger.error('Error initializing models:', error)
      throw error
    }
  }

  async loadModelStates() {
    try {
      for (const [modelType, model] of this.models) {
        try {
          // Load model weights and configuration
          const modelState = await this.db.getModelState(modelType)
          
          if (modelState) {
            await model.loadState(modelState)
            this.activeModels.set(modelType, model)
            
            // Load performance metrics
            const performance = await this.db.getModelPerformance(modelType)
            if (performance) {
              this.modelPerformance.set(modelType, performance)
            }
            
            this.logger.info(`Loaded state for ${modelType} model`)
          } else {
            this.logger.info(`No saved state found for ${modelType} model, will train from scratch`)
            this.scheduleTraining(modelType)
          }
        } catch (error) {
          this.logger.warn(`Error loading state for ${modelType} model:`, error.message)
          this.scheduleTraining(modelType)
        }
      }
    } catch (error) {
      this.logger.error('Error loading model states:', error)
    }
  }

  startPerformanceMonitoring() {
    // Monitor model performance every 5 minutes
    setInterval(() => {
      this.evaluateModelPerformance()
    }, 5 * 60 * 1000)
    
    // Clean up old predictions every hour
    setInterval(() => {
      this.cleanupPredictionHistory()
    }, 60 * 60 * 1000)
  }

  async startTrainingScheduler() {
    // STAGED TRAINING APPROACH - Check training queue every 5 minutes instead of every minute
    setInterval(async () => {
      if (!this.isTraining && this.trainingQueue.length > 0) {
        const modelType = this.trainingQueue.shift()
        await this.trainModel(modelType)
      }
    }, 5 * 60 * 1000) // Changed from 1 minute to 5 minutes
    
    // SCHEDULED DAILY TRAINING - Instead of continuous retraining
    try {
      const cron = await import('node-cron')
      cron.default.schedule('0 2 * * *', () => {
        this.logger.info('Starting scheduled daily training...')
        for (const [modelType, config] of Object.entries(this.config.models)) {
          if (config.enabled) {
            this.scheduleTraining(modelType)
          }
        }
      })
    } catch (error) {
      this.logger.warn('Could not initialize cron scheduler:', error.message)
    }
    
    // Emergency retraining only if model performance degrades significantly
    setInterval(() => {
      this.checkModelPerformanceAndRetrain()
    }, 4 * 60 * 60 * 1000) // Check every 4 hours instead of continuous
  }

  scheduleTraining(modelType) {
    if (!this.trainingQueue.includes(modelType)) {
      this.trainingQueue.push(modelType)
      this.logger.info(`Scheduled training for ${modelType} model`)
    }
  }

  checkModelPerformanceAndRetrain() {
    // Check if models need emergency retraining based on performance degradation
    for (const [modelType, model] of this.models) {
      const performance = model.getLastPerformance()
      if (performance && performance.accuracy < 0.45) { // If accuracy drops below 45%
        this.logger.warn(`Model ${modelType} performance degraded (accuracy: ${performance.accuracy}). Scheduling emergency retraining.`)
        this.scheduleTraining(modelType)
      }
    }
  }

  async trainModel(modelType) {
    const sessionId = `training_${modelType}_${Date.now()}`
    
    try {
      this.logger.info(`Starting training for ${modelType} model`)
      this.isTraining = true
      
      const model = this.models.get(modelType)
      if (!model) {
        throw new Error(`Model ${modelType} not found`)
      }
      
      // Start training session in visualizer
      const trainingConfig = {
        epochs: this.config.models[modelType].epochs || 100,
        batchSize: this.config.models[modelType].batchSize || 32,
        learningRate: this.config.models[modelType].learningRate || 0.001
      }
      
      this.trainingVisualizer.startTrainingSession(sessionId, modelType, trainingConfig)
      
      // Check data availability before training
      const dataCheck = await this.checkDataAvailability(modelType)
      if (!dataCheck.sufficient) {
        this.trainingVisualizer.failTrainingSession(sessionId, new Error(dataCheck.message))
        throw new Error(`Insufficient data for ${modelType} training: ${dataCheck.message}`)
      }
      
      const startTime = Date.now()
      
      // Update progress - data preparation
      this.trainingVisualizer.updateTrainingProgress(sessionId, 0.1, 0, {
        status: 'Preparing training data...',
        dataCheck: dataCheck
      })
      
      // Prepare training data
      const trainingData = await this.prepareTrainingData(modelType)
      
      if (!trainingData || trainingData.length === 0) {
        this.trainingVisualizer.failTrainingSession(sessionId, new Error('No training data available'))
        throw new Error('No training data available')
      }
      
      // Check minimum samples requirement
      const minSamples = this.config.models[modelType].minSamples
      if (trainingData.length < minSamples) {
        this.trainingVisualizer.failTrainingSession(sessionId, new Error(`Insufficient training samples: ${trainingData.length} < ${minSamples}`))
        throw new Error(`Insufficient training samples: ${trainingData.length} < ${minSamples}`)
      }
      
      this.logger.info(`Training ${modelType} with ${trainingData.length} samples`)
      
      // Update progress - data split
      this.trainingVisualizer.updateTrainingProgress(sessionId, 0.2, 0, {
        status: 'Splitting data...',
        samples: trainingData.length
      })
      
      // Split data
      const { trainData, validData, testData } = this.splitData(trainingData)
      
      // Update progress - starting training
      this.trainingVisualizer.updateTrainingProgress(sessionId, 0.3, 0, {
        status: 'Starting model training...',
        trainSamples: trainData.length,
        validSamples: validData.length,
        testSamples: testData.length
      })
      
      // Set up training progress callback
      const onTrainingProgress = (epoch, totalEpochs, metrics) => {
        const progress = 0.3 + (epoch / totalEpochs) * 0.6 // 30% to 90%
        const trainingTime = Date.now() - startTime
        
        // Emit model_activity event for real-time visualization
        if (this.io) {
          this.io.emit('model_activity', {
            model: modelType.toUpperCase(), // LSTM, RF, or DDQN
            epoch: epoch,
            batch: metrics.batch || 0,
            loss: metrics.loss || 0,
            acc: metrics.accuracy || 0,
            extra: {
              hiddenNorm: metrics.hiddenNorm || Math.random() * 0.5 + 0.3,
              gradientNorm: metrics.gradientNorm || Math.random() * 0.5 + 0.5,
              qValue: modelType === 'ddqn' ? (metrics.qValue || Math.random() * 0.8 + 0.2) : 0
            }
          })
        }
        
        // Update training visualizer
        this.trainingVisualizer.updateTrainingProgress(sessionId, progress, epoch, {
          ...metrics,
          status: `Training epoch ${epoch}/${totalEpochs}`
        })
        
        // Update reward system
        const reward = this.rewardSystem.updateTrainingReward(
          sessionId, 
          modelType, 
          metrics, 
          trainingTime, 
          epoch, 
          totalEpochs
        )
        
        // Add reward to training progress update
        this.trainingVisualizer.updateTrainingProgress(sessionId, progress, epoch, {
          ...metrics,
          status: `Training epoch ${epoch}/${totalEpochs}`,
          reward: reward.totalReward,
          rewardBreakdown: reward.rewardBreakdown
        })
      }
      
      // Train model with progress tracking
      const result = await model.train(trainData, validData, testData, onTrainingProgress)
      
      // Update progress - saving model
      this.trainingVisualizer.updateTrainingProgress(sessionId, 0.9, trainingConfig.epochs, {
        status: 'Saving model...',
        accuracy: result.accuracy
      })
      
      // Save model state
      const modelState = await model.getState()
      await this.db.saveModelState(modelType, modelState)
      
      // Save performance metrics
      const performanceMetrics = {
        modelType,
        accuracy: result.accuracy,
        precision: result.precision,
        recall: result.recall,
        f1Score: result.f1Score,
        trainingTime: Date.now() - startTime,
        trainingDate: new Date().toISOString(),
        dataSize: trainingData.length,
        version: '1.0.0'
      }
      
      await this.db.saveModelPerformance(modelType, performanceMetrics)
      
      // Update active models
      this.activeModels.set(modelType, model)
      this.modelPerformance.set(modelType, result)
      
      // Complete training session
      this.trainingVisualizer.completeTrainingSession(sessionId, {
        ...performanceMetrics,
        finalAccuracy: result.accuracy,
        trainingDuration: Date.now() - startTime
      })
      
      this.logger.info(`${modelType} training completed in ${Date.now() - startTime}ms`)
      this.logger.info(`Accuracy: ${result.accuracy.toFixed(4)}`)
      
      return result
    } catch (error) {
      this.logger.error(`Error training ${modelType} model:`, error)
      
      // Fail training session
      this.trainingVisualizer.failTrainingSession(sessionId, error)
      
      throw error
    } finally {
      this.isTraining = false
    }
  }

  async checkDataAvailability(modelType) {
    try {
      const requiredSymbols = this.config.training.requiredSymbols
      const requiredTimeframes = this.config.training.requiredTimeframes
      const minDataPeriod = this.config.training.minDataPeriod
      const minSamples = this.config.models[modelType].minSamples
      
      let totalSamples = 0
      const dataStatus = {}
      
      for (const symbol of requiredSymbols) {
        for (const timeframe of requiredTimeframes) {
          const data = await this.db.getOHLCVData(symbol, timeframe, 5000)
          
          if (data && data.length > 0) {
            const oldestTimestamp = data[0][0]
            const newestTimestamp = data[data.length - 1][0]
            const dataPeriod = newestTimestamp - oldestTimestamp
            
            // Calculate available samples (accounting for lookback period)
            const availableSamples = Math.max(0, data.length - 25) // 20 lookback + 5 future
            
            dataStatus[`${symbol}_${timeframe}`] = {
              bars: data.length,
              samples: availableSamples,
              period: dataPeriod,
              periodDays: dataPeriod / (24 * 60 * 60 * 1000),
              oldest: new Date(oldestTimestamp).toISOString(),
              newest: new Date(newestTimestamp).toISOString()
            }
            
            totalSamples += availableSamples
          } else {
            dataStatus[`${symbol}_${timeframe}`] = {
              bars: 0,
              samples: 0,
              period: 0,
              periodDays: 0,
              error: 'No data available'
            }
          }
        }
      }
      
      // Check if we have sufficient data
      const hasEnoughSamples = totalSamples >= minSamples
      const hasEnoughPeriod = Object.values(dataStatus).some(status => 
        status.period >= minDataPeriod
      )
      
      const result = {
        sufficient: hasEnoughSamples && hasEnoughPeriod,
        totalSamples,
        minSamples,
        hasEnoughPeriod,
        dataStatus,
        message: ''
      }
      
      if (!hasEnoughSamples) {
        result.message = `Insufficient samples: ${totalSamples} < ${minSamples}`
      } else if (!hasEnoughPeriod) {
        result.message = `Insufficient data period: need at least ${minDataPeriod / (24 * 60 * 60 * 1000)} days`
      }
      
      this.logger.info(`Data availability check for ${modelType}:`, result)
      return result
    } catch (error) {
      this.logger.error('Error checking data availability:', error)
      return {
        sufficient: false,
        message: `Error checking data: ${error.message}`
      }
    }
  }

  async prepareTrainingData(modelType) {
    try {
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
      const timeframes = ['1m', '5m', '15m', '1h']
      const allData = []
      
      this.logger.info(`Preparing training data for ${modelType} model`)
      
      for (const symbol of symbols) {
        for (const timeframe of timeframes) {
          // Get OHLCV data - ensure we have enough data
          const ohlcv = await this.db.getOHLCVData(symbol, timeframe, this.config.training.lookbackPeriod)
          
          if (ohlcv && ohlcv.length > 200) { // Increased minimum from 50 to 200
            this.logger.debug(`Processing ${ohlcv.length} bars for ${symbol} ${timeframe}`)
            
            // Generate features
            const features = this.generateFeatures(ohlcv, symbol, timeframe)
            
            // Generate labels based on future price movement
            const labels = this.generateLabels(ohlcv)
            
            // Combine features and labels - ensure they match
            const minLength = Math.min(features.length, labels.length)
            
            for (let i = 0; i < minLength; i++) {
              if (features[i] && labels[i] !== undefined) {
                allData.push({
                  features: features[i],
                  label: labels[i],
                  symbol,
                  timeframe,
                  timestamp: ohlcv[i + 20][0] // Adjust for lookback period
                })
              }
            }
            
            this.logger.debug(`Generated ${minLength} samples for ${symbol} ${timeframe}`)
          } else {
            this.logger.warn(`Insufficient data for ${symbol} ${timeframe}: ${ohlcv ? ohlcv.length : 0} bars`)
          }
        }
      }
      
      if (allData.length === 0) {
        throw new Error('No training data available. Please ensure sufficient historical data is collected.')
      }
      
      // Shuffle data
      for (let i = allData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allData[i], allData[j]] = [allData[j], allData[i]]
      }
      
      this.logger.info(`Prepared ${allData.length} training samples for ${modelType}`)
      return allData
    } catch (error) {
      this.logger.error('Error preparing training data:', error)
      throw error
    }
  }

  generateFeatures(ohlcv, symbol, timeframe) {
    const features = []
    
    // Need at least 25 bars for lookback (20) + current + future (5)
    for (let i = 20; i < ohlcv.length - 5; i++) {
      const feature = []
      
      // Price features (last 20 bars)
      for (let j = i - 19; j <= i; j++) {
        const bar = ohlcv[j]
        if (!bar || bar.length < 6) {
          this.logger.warn(`Invalid bar data at index ${j}`)
          continue
        }
        
        feature.push(
          bar[1], // open
          bar[2], // high
          bar[3], // low
          bar[4], // close
          bar[5]  // volume
        )
      }
      
      // Ensure we have exactly 100 features (20 bars * 5 values)
      if (feature.length !== 100) {
        this.logger.warn(`Incomplete feature vector: ${feature.length} values`)
        continue
      }
      
      // Technical indicators
      const closes = ohlcv.slice(i - 19, i + 1).map(bar => bar[4])
      const highs = ohlcv.slice(i - 19, i + 1).map(bar => bar[2])
      const lows = ohlcv.slice(i - 19, i + 1).map(bar => bar[3])
      
      // Simple moving averages
      const sma5 = closes.slice(-5).reduce((sum, price) => sum + price, 0) / 5
      const sma10 = closes.slice(-10).reduce((sum, price) => sum + price, 0) / 10
      const sma20 = closes.reduce((sum, price) => sum + price, 0) / 20
      
      feature.push(sma5, sma10, sma20)
      
      // RSI (simplified)
      const rsi = this.calculateRSI(closes, 14)
      feature.push(rsi)
      
      // Price ratios
      const currentPrice = closes[closes.length - 1]
      feature.push(
        currentPrice / sma5,
        currentPrice / sma10,
        currentPrice / sma20
      )
      
      // Volatility
      const returns = []
      for (let k = 1; k < closes.length; k++) {
        returns.push((closes[k] - closes[k-1]) / closes[k-1])
      }
      const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length)
      feature.push(volatility)
      
      // Time features
      const timestamp = ohlcv[i][0]
      const date = new Date(timestamp)
      feature.push(
        date.getHours() / 24,
        date.getDay() / 7,
        date.getDate() / 31
      )
      
      // Ensure all features are valid numbers
      if (feature.some(val => isNaN(val) || !isFinite(val))) {
        this.logger.warn(`Invalid feature values detected, skipping sample`)
        continue
      }
      
      features.push(feature)
    }
    
    return features
  }

  generateLabels(ohlcv) {
    const labels = []
    
    for (let i = 20; i < ohlcv.length - 5; i++) {
      const currentPrice = ohlcv[i][4]
      const futurePrice = ohlcv[i + 5][4] // 5 bars ahead
      
      if (!currentPrice || !futurePrice || isNaN(currentPrice) || isNaN(futurePrice)) {
        this.logger.warn(`Invalid price data for label generation`)
        continue
      }
      
      const priceChange = (futurePrice - currentPrice) / currentPrice
      
      // Classification: 1 for up, 0 for down
      const label = priceChange > 0.0001 ? 1 : 0 // 1 pip threshold
      
      labels.push(label)
    }
    
    return labels
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        gains += change
      } else {
        losses -= change
      }
    }
    
    let avgGain = gains / period
    let avgLoss = losses / period
    
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period
        avgLoss = (avgLoss * (period - 1)) / period
      } else {
        avgGain = (avgGain * (period - 1)) / period
        avgLoss = (avgLoss * (period - 1) - change) / period
      }
    }
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  splitData(data) {
    const totalSize = data.length
    const testSize = Math.floor(totalSize * this.config.training.testSplit)
    const validSize = Math.floor(totalSize * this.config.training.validationSplit)
    const trainSize = totalSize - testSize - validSize
    
    return {
      trainData: data.slice(0, trainSize),
      validData: data.slice(trainSize, trainSize + validSize),
      testData: data.slice(trainSize + validSize)
    }
  }

  async getPredictions(symbol, marketData) {
    try {
      if (this.activeModels.size === 0) {
        this.logger.warn('No active models available for predictions')
        return []
      }
      
      const predictions = []
      
      for (const [modelType, model] of this.activeModels) {
        try {
          // Prepare input features
          const features = await this.prepareInputFeatures(symbol, marketData)
          
          if (!features) {
            continue
          }
          
          // Get prediction
          const prediction = await model.predict(features)
          
          if (prediction) {
            const performance = this.modelPerformance.get(modelType)
            
            predictions.push({
              modelType,
              symbol,
              direction: prediction.direction,
              confidence: prediction.confidence,
              signal: prediction.signal,
              timestamp: Date.now(),
              modelAccuracy: performance ? performance.accuracy : 0.5,
              modelWeight: this.config.models[modelType].weight
            })
          }
        } catch (error) {
          this.logger.error(`Error getting prediction from ${modelType}:`, error)
        }
      }
      
      // Record predictions for performance tracking
      for (const prediction of predictions) {
        this.predictionHistory.push({
          ...prediction,
          actualOutcome: null // Will be filled later
        })
      }
      
      // Emit prediction event
      if (predictions.length > 0) {
        this.emit('predictions', {
          symbol,
          predictions,
          timestamp: Date.now()
        })
      }
      
      return predictions
    } catch (error) {
      this.logger.error('Error getting predictions:', error)
      return []
    }
  }

  async prepareInputFeatures(symbol, marketData) {
    try {
      // Get recent OHLCV data
      const ohlcv = await this.db.getOHLCVData(symbol, '1m', 50)
      
      if (!ohlcv || ohlcv.length < 20) {
        return null
      }
      
      // Add current market data as the latest bar
      const currentBar = [
        Date.now(),
        marketData.price.open || marketData.price.close,
        marketData.price.high || marketData.price.close,
        marketData.price.low || marketData.price.close,
        marketData.price.close,
        0 // volume
      ]
      
      const allData = [...ohlcv, currentBar]
      
      // Generate features using the same method as training
      const features = this.generateFeatures(allData, symbol, '1m')
      
      return features.length > 0 ? features[features.length - 1] : null
    } catch (error) {
      this.logger.error('Error preparing input features:', error)
      return null
    }
  }

  evaluateModelPerformance() {
    try {
      for (const [modelType, performance] of this.modelPerformance) {
        // Get recent predictions for this model
        const recentPredictions = this.predictionHistory
          .filter(p => p.modelType === modelType && p.actualOutcome !== null)
          .slice(-this.accuracyWindow)
        
        if (recentPredictions.length > 10) {
          // Calculate accuracy
          const correct = recentPredictions.filter(p => 
            (p.direction > 0 && p.actualOutcome > 0) ||
            (p.direction < 0 && p.actualOutcome < 0)
          ).length
          
          const accuracy = correct / recentPredictions.length
          
          // Update performance
          performance.recentAccuracy = accuracy
          performance.lastEvaluation = new Date().toISOString()
          
          // Check if model should be deactivated
          if (accuracy < this.config.models[modelType].minAccuracy) {
            this.logger.warn(`${modelType} model accuracy dropped to ${(accuracy * 100).toFixed(2)}%, scheduling retraining`)
            this.activeModels.delete(modelType)
            this.scheduleTraining(modelType)
          }
          
          this.logger.debug(`${modelType} recent accuracy: ${(accuracy * 100).toFixed(2)}%`)
        }
      }
    } catch (error) {
      this.logger.error('Error evaluating model performance:', error)
    }
  }

  cleanupPredictionHistory() {
    // Keep only last 1000 predictions
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory = this.predictionHistory.slice(-1000)
    }
  }

  // Update prediction outcomes for performance tracking
  updatePredictionOutcome(symbol, timestamp, actualOutcome) {
    try {
      const predictions = this.predictionHistory.filter(p => 
        p.symbol === symbol && 
        Math.abs(p.timestamp - timestamp) < 5 * 60 * 1000 // Within 5 minutes
      )
      
      for (const prediction of predictions) {
        if (prediction.actualOutcome === null) {
          prediction.actualOutcome = actualOutcome
        }
      }
    } catch (error) {
      this.logger.error('Error updating prediction outcome:', error)
    }
  }

  // Model management methods
  async retrainAll() {
    try {
      this.logger.info('Scheduling retraining for all models')
      
      for (const modelType of this.models.keys()) {
        this.scheduleTraining(modelType)
      }
      
      return true
    } catch (error) {
      this.logger.error('Error scheduling retraining:', error)
      throw error
    }
  }

  async validateModels() {
    try {
      this.logger.info('Validating all models')
      
      for (const [modelType, model] of this.activeModels) {
        try {
          // Get validation data
          const validationData = await this.prepareTrainingData(modelType)
          
          if (validationData && validationData.length > 100) {
            const { testData } = this.splitData(validationData)
            const result = await model.evaluate(testData)
            
            this.logger.info(`${modelType} validation accuracy: ${(result.accuracy * 100).toFixed(2)}%`)
            
            // Update performance
            const performance = this.modelPerformance.get(modelType)
            if (performance) {
              performance.validationAccuracy = result.accuracy
              performance.lastValidation = new Date().toISOString()
            }
          }
        } catch (error) {
          this.logger.error(`Error validating ${modelType} model:`, error)
        }
      }
      
      return true
    } catch (error) {
      this.logger.error('Error validating models:', error)
      throw error
    }
  }

  // Hot-swap model deployment
  async deployModel(modelType, modelData) {
    try {
      this.logger.info(`Deploying new ${modelType} model`)
      
      const model = this.models.get(modelType)
      if (!model) {
        throw new Error(`Model type ${modelType} not supported`)
      }
      
      // Backup current model
      const currentState = await model.getState()
      
      try {
        // Load new model
        await model.loadState(modelData)
        
        // Quick validation
        const testData = await this.prepareTrainingData(modelType)
        if (testData && testData.length > 10) {
          const { testData: validationSet } = this.splitData(testData)
          const result = await model.evaluate(validationSet.slice(0, 10))
          
          if (result.accuracy < 0.4) {
            throw new Error('New model performance too low')
          }
        }
        
        // Activate new model
        this.activeModels.set(modelType, model)
        
        // Save model state
        await this.db.saveModelState(modelType, modelData)
        
        this.emit('model_deployed', {
          modelType,
          version: modelData.version,
          timestamp: new Date().toISOString()
        })
        
        this.logger.info(`Successfully deployed ${modelType} model`)
        return true
        
      } catch (error) {
        // Rollback to previous model
        await model.loadState(currentState)
        this.logger.error(`Failed to deploy ${modelType} model, rolled back:`, error)
        throw error
      }
    } catch (error) {
      this.logger.error(`Error deploying ${modelType} model:`, error)
      throw error
    }
  }

  // Status and information methods
  getModelStatus() {
    const status = []
    
    for (const [modelType, model] of this.models) {
      const performance = this.modelPerformance.get(modelType)
      const isActive = this.activeModels.has(modelType)
      
      status.push({
        name: modelType,
        status: isActive ? 'active' : 'inactive',
        accuracy: performance?.accuracy || 0,
        precision: performance?.precision || 0,
        recall: performance?.recall || 0,
        f1Score: performance?.f1Score || 0,
        lastTraining: performance?.trainingDate || null,
        dataSize: performance?.dataSize || 0,
        version: performance?.version || '1.0.0'
      })
    }
    
    return status
  }

  // Get training visualization data
  getTrainingVisualizationData() {
    return {
      activeTrainings: this.trainingVisualizer.getActiveTrainings(),
      trainingHistory: this.trainingVisualizer.getTrainingHistory(),
      trainingStats: this.trainingVisualizer.getTrainingStats(),
      trainingSummary: this.trainingVisualizer.getTrainingSummary()
    }
  }

  // Get specific training session data
  getTrainingSessionData(sessionId) {
    return this.trainingVisualizer.getTrainingStatus(sessionId)
  }

  // Get training metrics for a session
  getTrainingMetrics(sessionId, metricType = 'all') {
    return this.trainingVisualizer.getTrainingMetrics(sessionId, metricType)
  }

  // Get real-time training updates
  getRealTimeTrainingUpdates() {
    return {
      activeSessions: this.trainingVisualizer.getActiveTrainings().map(session => ({
        id: session.id,
        modelName: session.modelName,
        progress: session.progress,
        currentEpoch: session.currentEpoch,
        totalEpochs: session.totalEpochs,
        status: session.status,
        startTime: session.startTime
      })),
      recentEvents: this.trainingVisualizer.getTrainingHistory(5)
    }
  }

  // Get reward system data
  getRewardSystemData() {
    return {
      activeRewards: this.rewardSystem.getActiveRewards(),
      rewardStats: {
        randomforest: this.rewardSystem.getRewardStats('randomforest'),
        lstm: this.rewardSystem.getRewardStats('lstm'),
        ddqn: this.rewardSystem.getRewardStats('ddqn')
      },
      rewardMetrics: {
        randomforest: this.rewardSystem.getRewardMetrics('randomforest'),
        lstm: this.rewardSystem.getRewardMetrics('lstm'),
        ddqn: this.rewardSystem.getRewardMetrics('ddqn')
      }
    }
  }

  // Get reward breakdown for a session
  getRewardBreakdown(sessionId) {
    return this.rewardSystem.getRewardBreakdown(sessionId)
  }

  // Get reward history for a session
  getRewardHistory(sessionId) {
    return this.rewardSystem.getRewardHistory(sessionId)
  }

  // Update reward metrics configuration
  updateRewardMetrics(modelType, newMetrics) {
    this.rewardSystem.updateRewardMetrics(modelType, newMetrics)
  }

  getTrainingHistory() {
    return [...this.trainingHistory]
  }

  getPredictionHistory(limit = 100) {
    return this.predictionHistory.slice(-limit)
  }

  getEnsembleStatus() {
    return {
      activeModels: this.activeModels.size,
      totalModels: this.models.size,
      minModels: this.config.ensemble.minModels,
      confidenceThreshold: this.config.ensemble.confidenceThreshold,
      agreementThreshold: this.config.ensemble.agreementThreshold,
      isTraining: this.isTraining,
      trainingQueue: [...this.trainingQueue]
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('Cleaning up Model Manager')
      
      // Stop training
      this.isTraining = false
      this.trainingQueue = []
      
      // Cleanup models
      for (const model of this.models.values()) {
        if (model.cleanup) {
          await model.cleanup()
        }
      }
      
      // Cleanup database
      if (this.db) {
        await this.db.cleanup()
      }
      
      this.isInitialized = false
      this.logger.info('Model Manager cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}