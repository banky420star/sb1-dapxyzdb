import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { RealDataFetcher } from '../data/realDataFetcher.js'
import { ModelManager } from './manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'

export class MLTrainer {
  constructor() {
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.dataFetcher = new RealDataFetcher()
    this.modelManager = new ModelManager()
    this.metrics = new MetricsCollector()
    
    this.isTraining = false
    this.trainingProgress = {}
    this.trainingHistory = []
    
    this.config = {
      // Data preparation
      lookbackPeriod: 60,           // bars to look back for features
      forecastHorizon: 5,           // bars to predict ahead
      validationSplit: 0.2,        // 20% for validation
      testSplit: 0.1,               // 10% for testing
      
      // Feature engineering
      technicalIndicators: {
        sma: [5, 10, 20, 50],
        ema: [12, 26],
        rsi: [14],
        macd: [12, 26, 9],
        bb: [20, 2],
        atr: [14]
      },
      
      // Training parameters
      maxTrainingTime: 30 * 60 * 1000,  // 30 minutes
      minDataPoints: 1000,               // Minimum data for training
      targetAccuracy: 0.65,              // Target model accuracy
      
      // Model selection
      enabledModels: ['randomforest', 'lstm', 'ddqn'],
      ensemble: {
        method: 'weighted_average',
        weights: { randomforest: 0.4, lstm: 0.35, ddqn: 0.25 }
      },
      
      // Cross-validation
      crossValidationFolds: 5,
      walkForwardValidation: true
    }
  }

  async initialize() {
    try {
      this.logger.info('Initializing ML Trainer')
      
      await this.db.initialize()
      await this.dataFetcher.initialize()
      await this.modelManager.initialize()
      await this.metrics.initialize()
      
      this.logger.info('ML Trainer initialized successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize ML Trainer:', error)
      throw error
    }
  }

  async trainAllModels(symbols = null, timeframes = null) {
    try {
      if (this.isTraining) {
        throw new Error('Training already in progress')
      }

      this.isTraining = true
      this.trainingProgress = { status: 'starting', progress: 0, currentTask: 'initialization' }
      
      const trainingStartTime = Date.now()
      const targetSymbols = symbols || ['EURUSD', 'GBPUSD', 'USDJPY']
      const targetTimeframes = timeframes || ['1h', '4h']
      
      this.logger.info(`Starting ML training for ${targetSymbols.length} symbols, ${targetTimeframes.length} timeframes`)
      
      // Step 1: Prepare training data
      this.trainingProgress = { status: 'data_preparation', progress: 10, currentTask: 'collecting historical data' }
      const trainingData = await this.prepareTrainingData(targetSymbols, targetTimeframes)
      
      if (trainingData.length < this.config.minDataPoints) {
        throw new Error(`Insufficient training data: ${trainingData.length} < ${this.config.minDataPoints}`)
      }
      
      // Step 2: Feature engineering
      this.trainingProgress = { status: 'feature_engineering', progress: 30, currentTask: 'generating features' }
      const features = await this.engineerFeatures(trainingData)
      
      // Step 3: Split data
      this.trainingProgress = { status: 'data_splitting', progress: 40, currentTask: 'splitting data sets' }
      const { trainData, validData, testData } = this.splitData(features)
      
      // Step 4: Train models
      this.trainingProgress = { status: 'model_training', progress: 50, currentTask: 'training models' }
      const modelResults = {}
      
      for (const modelType of this.config.enabledModels) {
        try {
          this.trainingProgress.currentTask = `training ${modelType}`
          const result = await this.trainSingleModel(modelType, trainData, validData, testData)
          modelResults[modelType] = result
          this.trainingProgress.progress += 15
        } catch (error) {
          this.logger.error(`Failed to train ${modelType}:`, error)
          modelResults[modelType] = { error: error.message }
        }
      }
      
      // Step 5: Ensemble validation
      this.trainingProgress = { status: 'ensemble_validation', progress: 90, currentTask: 'validating ensemble' }
      const ensembleResults = await this.validateEnsemble(modelResults, testData)
      
      // Step 6: Save results
      this.trainingProgress = { status: 'saving_results', progress: 95, currentTask: 'saving models' }
      await this.saveTrainingResults(modelResults, ensembleResults)
      
      const trainingDuration = Date.now() - trainingStartTime
      
      const finalResults = {
        success: true,
        duration: trainingDuration,
        dataPoints: trainingData.length,
        models: modelResults,
        ensemble: ensembleResults,
        timestamp: new Date().toISOString()
      }
      
      this.trainingHistory.push(finalResults)
      this.trainingProgress = { status: 'completed', progress: 100, currentTask: 'training completed' }
      
      this.logger.info(`ML Training completed successfully in ${trainingDuration}ms`)
      return finalResults
      
    } catch (error) {
      this.logger.error('ML Training failed:', error)
      this.trainingProgress = { status: 'error', progress: 0, currentTask: error.message }
      
      const errorResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
      
      this.trainingHistory.push(errorResult)
      throw error
    } finally {
      this.isTraining = false
    }
  }

  async prepareTrainingData(symbols, timeframes) {
    try {
      const allData = []
      
      for (const symbol of symbols) {
        for (const timeframe of timeframes) {
          // Get historical data from database
          let data = await this.db.getOHLCVData(symbol, timeframe, 10000)
          
          // If not enough data, fetch from API
          if (!data || data.length < 500) {
            this.logger.info(`Fetching additional data for ${symbol} ${timeframe}`)
            await this.dataFetcher.fetchHistoricalData(symbol, timeframe, 5000)
            data = await this.db.getOHLCVData(symbol, timeframe, 10000)
          }
          
          if (data && data.length > 100) {
            // Convert to training format
            const formattedData = data.map(bar => ({
              symbol,
              timeframe,
              timestamp: bar[0],
              open: bar[1],
              high: bar[2],
              low: bar[3],
              close: bar[4],
              volume: bar[5]
            }))
            
            allData.push(...formattedData)
          }
        }
      }
      
      // Sort by timestamp
      allData.sort((a, b) => a.timestamp - b.timestamp)
      
      this.logger.info(`Prepared ${allData.length} data points for training`)
      return allData
    } catch (error) {
      this.logger.error('Error preparing training data:', error)
      throw error
    }
  }

  async engineerFeatures(rawData) {
    try {
      const features = []
      const lookback = this.config.lookbackPeriod
      const forecast = this.config.forecastHorizon
      
      // Group data by symbol and timeframe
      const groupedData = {}
      for (const point of rawData) {
        const key = `${point.symbol}_${point.timeframe}`
        if (!groupedData[key]) groupedData[key] = []
        groupedData[key].push(point)
      }
      
      for (const [key, data] of Object.entries(groupedData)) {
        if (data.length < lookback + forecast) continue
        
        const [symbol, timeframe] = key.split('_')
        
        for (let i = lookback; i < data.length - forecast; i++) {
          const feature = await this.generateFeatureVector(data, i, lookback, forecast)
          if (feature) {
            features.push({
              ...feature,
              symbol,
              timeframe,
              timestamp: data[i].timestamp
            })
          }
        }
      }
      
      this.logger.info(`Generated ${features.length} feature vectors`)
      return features
    } catch (error) {
      this.logger.error('Error engineering features:', error)
      throw error
    }
  }

  async generateFeatureVector(data, currentIndex, lookback, forecast) {
    try {
      const features = []
      const labels = []
      
      // Price-based features
      for (let i = currentIndex - lookback; i < currentIndex; i++) {
        const bar = data[i]
        
        // OHLCV features
        features.push(bar.open, bar.high, bar.low, bar.close, bar.volume)
        
        // Price ratios
        features.push(
          bar.high / bar.close,    // High/Close ratio
          bar.low / bar.close,     // Low/Close ratio
          (bar.close - bar.open) / bar.open,  // Return
          (bar.high - bar.low) / bar.close    // Range/Close ratio
        )
      }
      
      // Technical indicators
      const closes = data.slice(currentIndex - lookback - 50, currentIndex).map(d => d.close)
      const highs = data.slice(currentIndex - lookback - 50, currentIndex).map(d => d.high)
      const lows = data.slice(currentIndex - lookback - 50, currentIndex).map(d => d.low)
      
      if (closes.length >= 50) {
        // Moving averages
        const sma20 = this.calculateSMA(closes, 20)
        const sma50 = this.calculateSMA(closes, 50)
        const ema12 = this.calculateEMA(closes, 12)
        const ema26 = this.calculateEMA(closes, 26)
        
        features.push(
          closes[closes.length - 1] / sma20,  // Price/SMA20
          closes[closes.length - 1] / sma50,  // Price/SMA50
          ema12 / ema26,                      // EMA ratio
          sma20 / sma50                       // SMA ratio
        )
        
        // RSI
        const rsi = this.calculateRSI(closes, 14)
        features.push(rsi / 100)
        
        // Volatility
        const volatility = this.calculateVolatility(closes, 20)
        features.push(volatility)
      }
      
      // Time-based features
      const date = new Date(data[currentIndex].timestamp)
      features.push(
        date.getHours() / 24,
        date.getDay() / 7,
        date.getDate() / 31
      )
      
      // Generate labels (future price movement)
      const currentPrice = data[currentIndex].close
      const futurePrice = data[currentIndex + forecast].close
      const priceChange = (futurePrice - currentPrice) / currentPrice
      
      // Classification: 1 for up, 0 for down
      const label = priceChange > 0.0001 ? 1 : 0  // 1 pip threshold
      
      // Regression: actual price change
      const regressionLabel = priceChange
      
      return {
        features,
        classificationLabel: label,
        regressionLabel: regressionLabel,
        priceChange: priceChange,
        currentPrice: currentPrice,
        futurePrice: futurePrice
      }
    } catch (error) {
      this.logger.debug('Error generating feature vector:', error)
      return null
    }
  }

  splitData(features) {
    const totalSize = features.length
    const testSize = Math.floor(totalSize * this.config.testSplit)
    const validSize = Math.floor(totalSize * this.config.validationSplit)
    const trainSize = totalSize - testSize - validSize
    
    // Shuffle features while maintaining temporal order within groups
    const shuffled = this.shufflePreservingOrder(features)
    
    return {
      trainData: shuffled.slice(0, trainSize),
      validData: shuffled.slice(trainSize, trainSize + validSize),
      testData: shuffled.slice(trainSize + validSize)
    }
  }

  shufflePreservingOrder(features) {
    // Group by symbol/timeframe
    const groups = {}
    for (const feature of features) {
      const key = `${feature.symbol}_${feature.timeframe}`
      if (!groups[key]) groups[key] = []
      groups[key].push(feature)
    }
    
    // Shuffle groups but maintain order within groups
    const groupKeys = Object.keys(groups)
    const shuffledFeatures = []
    
    const maxLength = Math.max(...Object.values(groups).map(g => g.length))
    
    for (let i = 0; i < maxLength; i++) {
      for (const key of groupKeys) {
        if (groups[key][i]) {
          shuffledFeatures.push(groups[key][i])
        }
      }
    }
    
    return shuffledFeatures
  }

  async trainSingleModel(modelType, trainData, validData, testData) {
    try {
      this.logger.info(`Training ${modelType} model`)
      
      const model = this.modelManager.models.get(modelType)
      if (!model) {
        throw new Error(`Model ${modelType} not available`)
      }
      
      const startTime = Date.now()
      
      // Prepare data in model-specific format
      const modelTrainData = this.formatDataForModel(trainData, modelType)
      const modelValidData = this.formatDataForModel(validData, modelType)
      const modelTestData = this.formatDataForModel(testData, modelType)
      
      // Train the model
      const trainingResult = await model.train(modelTrainData, modelValidData, {
        maxTime: this.config.maxTrainingTime,
        targetAccuracy: this.config.targetAccuracy
      })
      
      // Evaluate on test data
      const evaluation = await model.evaluate(modelTestData)
      
      const trainingTime = Date.now() - startTime
      
      const result = {
        modelType,
        trainingTime,
        trainingResult,
        evaluation,
        dataSize: {
          train: trainData.length,
          valid: validData.length,
          test: testData.length
        },
        success: true
      }
      
      this.logger.info(`${modelType} training completed: accuracy=${(evaluation.accuracy * 100).toFixed(2)}%`)
      return result
      
    } catch (error) {
      this.logger.error(`Error training ${modelType}:`, error)
      return {
        modelType,
        error: error.message,
        success: false
      }
    }
  }

  formatDataForModel(data, modelType) {
    // Format data according to model requirements
    switch (modelType) {
      case 'randomforest':
      case 'lstm':
        return data.map(item => ({
          features: item.features,
          label: item.classificationLabel
        }))
      
      case 'ddqn':
        // Reinforcement learning format
        return data.map(item => ({
          state: item.features,
          action: item.classificationLabel,
          reward: item.priceChange > 0 ? 1 : -1,
          nextState: item.features // Simplified
        }))
      
      default:
        return data
    }
  }

  async validateEnsemble(modelResults, testData) {
    try {
      const activeModels = Object.entries(modelResults)
        .filter(([_, result]) => result.success && result.evaluation.accuracy > 0.5)
      
      if (activeModels.length === 0) {
        throw new Error('No successful models for ensemble')
      }
      
      // Test ensemble predictions
      const ensemblePredictions = []
      const actualLabels = testData.map(item => item.classificationLabel)
      
      for (let i = 0; i < Math.min(testData.length, 100); i++) {
        const predictions = {}
        
        for (const [modelType, result] of activeModels) {
          const model = this.modelManager.models.get(modelType)
          if (model) {
            const prediction = await model.predict(testData[i].features)
            predictions[modelType] = prediction.signal || prediction.direction || prediction.action
          }
        }
        
        // Weighted ensemble
        let ensembleScore = 0
        let totalWeight = 0
        
        for (const [modelType, prediction] of Object.entries(predictions)) {
          const weight = this.config.ensemble.weights[modelType] || 0.33
          ensembleScore += prediction * weight
          totalWeight += weight
        }
        
        const ensemblePrediction = totalWeight > 0 ? (ensembleScore / totalWeight > 0.5 ? 1 : 0) : 0
        ensemblePredictions.push(ensemblePrediction)
      }
      
      // Calculate ensemble accuracy
      let correct = 0
      for (let i = 0; i < ensemblePredictions.length; i++) {
        if (ensemblePredictions[i] === actualLabels[i]) correct++
      }
      
      const ensembleAccuracy = correct / ensemblePredictions.length
      
      return {
        accuracy: ensembleAccuracy,
        activeModels: activeModels.length,
        modelTypes: activeModels.map(([type, _]) => type),
        testSamples: ensemblePredictions.length,
        predictions: ensemblePredictions.slice(0, 10) // Sample predictions
      }
      
    } catch (error) {
      this.logger.error('Error validating ensemble:', error)
      return {
        accuracy: 0,
        error: error.message
      }
    }
  }

  async saveTrainingResults(modelResults, ensembleResults) {
    try {
      // Save individual model results
      for (const [modelType, result] of Object.entries(modelResults)) {
        if (result.success) {
          await this.db.saveModelPerformance(modelType, {
            accuracy: result.evaluation.accuracy,
            precision: result.evaluation.precision,
            recall: result.evaluation.recall,
            f1Score: result.evaluation.f1Score,
            trainingTime: result.trainingTime,
            trainingDate: new Date().toISOString(),
            dataSize: result.dataSize.train + result.dataSize.valid + result.dataSize.test,
            version: '1.0.0'
          })
        }
      }
      
      // Save ensemble results
      if (ensembleResults.accuracy > 0) {
        await this.db.saveModelPerformance('ensemble', {
          accuracy: ensembleResults.accuracy,
          trainingDate: new Date().toISOString(),
          activeModels: ensembleResults.activeModels,
          version: '1.0.0'
        })
      }
      
      this.logger.info('Training results saved to database')
    } catch (error) {
      this.logger.error('Error saving training results:', error)
    }
  }

  // Utility functions for technical indicators
  calculateSMA(values, period) {
    if (values.length < period) return values[values.length - 1]
    const sum = values.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  calculateEMA(values, period) {
    if (values.length < period) return values[values.length - 1]
    
    const multiplier = 2 / (period + 1)
    let ema = values[0]
    
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  calculateRSI(values, period = 14) {
    if (values.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = values[i] - values[i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  calculateVolatility(values, period = 20) {
    if (values.length < period) return 0
    
    const returns = []
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1])
    }
    
    if (returns.length < period) return 0
    
    const recentReturns = returns.slice(-period)
    const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length
    
    return Math.sqrt(variance)
  }

  getTrainingProgress() {
    return this.trainingProgress
  }

  getTrainingHistory() {
    return this.trainingHistory
  }

  async cleanup() {
    try {
      this.logger.info('Cleaning up ML Trainer')
      this.isTraining = false
      this.trainingProgress = {}
      this.logger.info('ML Trainer cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}