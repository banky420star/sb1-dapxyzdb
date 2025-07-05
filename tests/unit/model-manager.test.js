import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ModelManager } from '../../server/ml/manager.js'

describe('Model Manager Unit Tests', () => {
  let modelManager

  beforeEach(async () => {
    modelManager = new ModelManager()
    await modelManager.initialize()
  })

  afterEach(async () => {
    await modelManager.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(modelManager.isInitialized).toBe(true)
      expect(modelManager.models.size).toBeGreaterThan(0)
      expect(modelManager.config.models.randomforest.enabled).toBe(true)
      expect(modelManager.config.models.lstm.enabled).toBe(true)
      expect(modelManager.config.models.ddqn.enabled).toBe(true)
    })

    it('should initialize all enabled models', () => {
      const expectedModels = ['randomforest', 'lstm', 'ddqn']
      
      for (const modelType of expectedModels) {
        expect(modelManager.models.has(modelType)).toBe(true)
      }
    })
  })

  describe('Training Data Preparation', () => {
    it('should prepare training data correctly', async () => {
      // Mock training data
      const mockData = Array.from({ length: 200 }, (_, i) => ({
        timestamp: Date.now() - i * 60000,
        features: Array.from({ length: 10 }, () => Math.random()),
        label: Math.random() > 0.5 ? 1 : 0,
        symbol: 'EURUSD',
        timeframe: '1m'
      }))

      // Mock database method
      modelManager.db.getOHLCVData = async () => mockData.map(d => [
        d.timestamp, 1.1000, 1.1010, 1.0990, 1.1005, 1000
      ])

      const trainingData = await modelManager.prepareTrainingData('randomforest')
      
      expect(trainingData).toBeDefined()
      expect(trainingData.length).toBeGreaterThan(0)
      expect(trainingData[0]).toHaveProperty('features')
      expect(trainingData[0]).toHaveProperty('label')
    })

    it('should generate features from OHLCV data', () => {
      const ohlcvData = Array.from({ length: 100 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000 + Math.sin(i * 0.1) * 0.01,
        1.1000 + Math.sin(i * 0.1) * 0.01 + 0.0005,
        1.1000 + Math.sin(i * 0.1) * 0.01 - 0.0005,
        1.1000 + Math.sin(i * 0.1) * 0.01,
        1000 + Math.random() * 100
      ])

      const features = modelManager.generateFeatures(ohlcvData, 'EURUSD', '1m')
      
      expect(features).toBeDefined()
      expect(features.length).toBeGreaterThan(0)
      expect(features[0].length).toBeGreaterThan(0)
    })

    it('should generate labels from price data', () => {
      const ohlcvData = Array.from({ length: 50 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000,
        1.1010,
        1.0990,
        1.1000 + (i % 2 === 0 ? 0.001 : -0.001), // Alternating up/down
        1000
      ])

      const labels = modelManager.generateLabels(ohlcvData)
      
      expect(labels).toBeDefined()
      expect(labels.length).toBeGreaterThan(0)
      expect(labels.every(label => label === 0 || label === 1)).toBe(true)
    })

    it('should split data correctly', () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        features: [i],
        label: i % 2,
        timestamp: i
      }))

      const { trainData, validData, testData } = modelManager.splitData(mockData)
      
      expect(trainData.length).toBeGreaterThan(0)
      expect(validData.length).toBeGreaterThan(0)
      expect(testData.length).toBeGreaterThan(0)
      
      const totalSize = trainData.length + validData.length + testData.length
      expect(totalSize).toBe(mockData.length)
    })
  })

  describe('Model Training', () => {
    it('should schedule training for models', () => {
      const initialQueueSize = modelManager.trainingQueue.length
      
      modelManager.scheduleTraining('randomforest')
      
      expect(modelManager.trainingQueue.length).toBe(initialQueueSize + 1)
      expect(modelManager.trainingQueue).toContain('randomforest')
    })

    it('should not duplicate training requests', () => {
      modelManager.scheduleTraining('randomforest')
      const queueSizeAfterFirst = modelManager.trainingQueue.length
      
      modelManager.scheduleTraining('randomforest')
      const queueSizeAfterSecond = modelManager.trainingQueue.length
      
      expect(queueSizeAfterSecond).toBe(queueSizeAfterFirst)
    })

    it('should train model with mock data', async () => {
      const mockTrainingData = Array.from({ length: 100 }, (_, i) => ({
        features: Array.from({ length: 10 }, () => Math.random()),
        label: Math.random() > 0.5 ? 1 : 0,
        timestamp: Date.now() - i * 60000
      }))

      // Mock the prepareTrainingData method
      const originalPrepare = modelManager.prepareTrainingData
      modelManager.prepareTrainingData = async () => mockTrainingData

      try {
        await modelManager.trainModel('randomforest')
        
        expect(modelManager.trainingHistory.length).toBeGreaterThan(0)
        const lastTraining = modelManager.trainingHistory[modelManager.trainingHistory.length - 1]
        expect(lastTraining.modelType).toBe('randomforest')
        expect(lastTraining.success).toBe(true)
      } finally {
        // Restore original method
        modelManager.prepareTrainingData = originalPrepare
      }
    })
  })

  describe('Predictions', () => {
    it('should prepare input features for prediction', async () => {
      const mockOHLCV = Array.from({ length: 50 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000,
        1.1010,
        1.0990,
        1.1005,
        1000
      ])

      // Mock database method
      modelManager.db.getOHLCVData = async () => mockOHLCV

      const marketData = {
        price: { close: 1.1005 }
      }

      const features = await modelManager.prepareInputFeatures('EURUSD', marketData)
      
      expect(features).toBeDefined()
      expect(Array.isArray(features)).toBe(true)
      expect(features.length).toBeGreaterThan(0)
    })

    it('should get predictions from active models', async () => {
      // Mock an active model
      const mockModel = {
        predict: async (features) => ({
          prediction: 1,
          confidence: 0.8,
          direction: 1,
          signal: 1
        })
      }

      modelManager.activeModels.set('test', mockModel)
      modelManager.modelPerformance.set('test', { accuracy: 0.7 })

      // Mock prepareInputFeatures
      modelManager.prepareInputFeatures = async () => [1, 2, 3, 4, 5]

      const predictions = await modelManager.getPredictions('EURUSD', {
        price: { close: 1.1000 }
      })

      expect(predictions).toBeDefined()
      expect(predictions.length).toBeGreaterThan(0)
      expect(predictions[0]).toHaveProperty('modelType')
      expect(predictions[0]).toHaveProperty('confidence')
      expect(predictions[0]).toHaveProperty('direction')
    })

    it('should handle empty active models gracefully', async () => {
      // Clear active models
      modelManager.activeModels.clear()

      const predictions = await modelManager.getPredictions('EURUSD', {
        price: { close: 1.1000 }
      })

      expect(predictions).toBeDefined()
      expect(predictions.length).toBe(0)
    })
  })

  describe('Performance Evaluation', () => {
    it('should evaluate model performance', () => {
      // Add some mock prediction history
      const mockPredictions = Array.from({ length: 50 }, (_, i) => ({
        modelType: 'test',
        direction: i % 2 === 0 ? 1 : -1,
        actualOutcome: i % 3 === 0 ? 1 : -1, // Some correct, some incorrect
        timestamp: Date.now() - i * 60000
      }))

      modelManager.predictionHistory = mockPredictions
      modelManager.modelPerformance.set('test', { accuracy: 0.6 })

      modelManager.evaluateModelPerformance()

      const performance = modelManager.modelPerformance.get('test')
      expect(performance).toBeDefined()
      expect(performance.recentAccuracy).toBeDefined()
      expect(performance.lastEvaluation).toBeDefined()
    })

    it('should update prediction outcomes', () => {
      const initialPrediction = {
        modelType: 'test',
        symbol: 'EURUSD',
        direction: 1,
        actualOutcome: null,
        timestamp: Date.now()
      }

      modelManager.predictionHistory.push(initialPrediction)

      modelManager.updatePredictionOutcome('EURUSD', Date.now(), 1)

      const updatedPrediction = modelManager.predictionHistory[modelManager.predictionHistory.length - 1]
      expect(updatedPrediction.actualOutcome).toBe(1)
    })

    it('should clean up old prediction history', () => {
      // Add many predictions
      const manyPredictions = Array.from({ length: 1500 }, (_, i) => ({
        modelType: 'test',
        timestamp: Date.now() - i * 60000
      }))

      modelManager.predictionHistory = manyPredictions

      modelManager.cleanupPredictionHistory()

      expect(modelManager.predictionHistory.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Model Management', () => {
    it('should get model status', () => {
      const status = modelManager.getModelStatus()
      
      expect(status).toBeDefined()
      expect(Array.isArray(status)).toBe(true)
      expect(status.length).toBeGreaterThan(0)
      
      const firstModel = status[0]
      expect(firstModel).toHaveProperty('name')
      expect(firstModel).toHaveProperty('type')
      expect(firstModel).toHaveProperty('status')
      expect(firstModel).toHaveProperty('accuracy')
    })

    it('should get ensemble status', () => {
      const ensembleStatus = modelManager.getEnsembleStatus()
      
      expect(ensembleStatus).toBeDefined()
      expect(ensembleStatus).toHaveProperty('activeModels')
      expect(ensembleStatus).toHaveProperty('totalModels')
      expect(ensembleStatus).toHaveProperty('minModels')
      expect(ensembleStatus).toHaveProperty('confidenceThreshold')
    })

    it('should retrain all models', async () => {
      const initialQueueSize = modelManager.trainingQueue.length
      
      await modelManager.retrainAll()
      
      expect(modelManager.trainingQueue.length).toBeGreaterThan(initialQueueSize)
    })

    it('should validate models', async () => {
      // Mock prepareTrainingData to return empty data for quick test
      const originalPrepare = modelManager.prepareTrainingData
      modelManager.prepareTrainingData = async () => []

      try {
        const result = await modelManager.validateModels()
        expect(result).toBe(true)
      } finally {
        modelManager.prepareTrainingData = originalPrepare
      }
    })
  })

  describe('Hot-swap Deployment', () => {
    it('should deploy new model successfully', async () => {
      const mockModelData = {
        version: '2.0.0',
        weights: [],
        config: {}
      }

      // Mock model methods
      const mockModel = {
        getState: async () => ({ version: '1.0.0' }),
        loadState: async () => true,
        evaluate: async () => ({ accuracy: 0.8 })
      }

      modelManager.models.set('test', mockModel)

      // Mock database save
      modelManager.db.saveModelState = async () => true

      const result = await modelManager.deployModel('test', mockModelData)
      
      expect(result).toBe(true)
    })

    it('should rollback on deployment failure', async () => {
      const mockModelData = {
        version: '2.0.0',
        weights: [],
        config: {}
      }

      // Mock model that fails to load new state
      const mockModel = {
        getState: async () => ({ version: '1.0.0' }),
        loadState: async (data) => {
          if (data.version === '2.0.0') {
            throw new Error('Failed to load')
          }
          return true
        }
      }

      modelManager.models.set('test', mockModel)

      try {
        await modelManager.deployModel('test', mockModelData)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Failed to load')
      }
    })
  })

  describe('Configuration', () => {
    it('should have valid model configurations', () => {
      for (const [modelType, config] of Object.entries(modelManager.config.models)) {
        expect(config.enabled).toBeDefined()
        expect(config.weight).toBeGreaterThan(0)
        expect(config.weight).toBeLessThanOrEqual(1)
        expect(config.retrainInterval).toBeGreaterThan(0)
        expect(config.minAccuracy).toBeGreaterThan(0)
        expect(config.minAccuracy).toBeLessThanOrEqual(1)
      }
    })

    it('should have valid ensemble configuration', () => {
      const ensemble = modelManager.config.ensemble
      
      expect(ensemble.minModels).toBeGreaterThan(0)
      expect(ensemble.confidenceThreshold).toBeGreaterThan(0)
      expect(ensemble.confidenceThreshold).toBeLessThanOrEqual(1)
      expect(ensemble.agreementThreshold).toBeGreaterThan(0)
      expect(ensemble.agreementThreshold).toBeLessThanOrEqual(1)
    })

    it('should have valid training configuration', () => {
      const training = modelManager.config.training
      
      expect(training.lookbackPeriod).toBeGreaterThan(0)
      expect(training.validationSplit).toBeGreaterThan(0)
      expect(training.validationSplit).toBeLessThan(1)
      expect(training.testSplit).toBeGreaterThan(0)
      expect(training.testSplit).toBeLessThan(1)
      expect(training.maxTrainingTime).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle training errors gracefully', async () => {
      // Mock prepareTrainingData to throw error
      const originalPrepare = modelManager.prepareTrainingData
      modelManager.prepareTrainingData = async () => {
        throw new Error('Data preparation failed')
      }

      try {
        await modelManager.trainModel('randomforest')
        
        // Check that error was recorded
        const lastTraining = modelManager.trainingHistory[modelManager.trainingHistory.length - 1]
        expect(lastTraining.success).toBe(false)
        expect(lastTraining.error).toContain('Data preparation failed')
      } finally {
        modelManager.prepareTrainingData = originalPrepare
      }
    })

    it('should handle prediction errors gracefully', async () => {
      // Mock model that throws error
      const errorModel = {
        predict: async () => {
          throw new Error('Prediction failed')
        }
      }

      modelManager.activeModels.set('error-model', errorModel)

      const predictions = await modelManager.getPredictions('EURUSD', {
        price: { close: 1.1000 }
      })

      // Should return empty array, not throw error
      expect(predictions).toBeDefined()
      expect(Array.isArray(predictions)).toBe(true)
    })

    it('should handle missing model gracefully', async () => {
      try {
        await modelManager.trainModel('nonexistent')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error.message).toContain('not found')
      }
    })
  })

  describe('Performance', () => {
    it('should handle large prediction history efficiently', () => {
      const startTime = Date.now()
      
      // Add large prediction history
      const largePredictionHistory = Array.from({ length: 10000 }, (_, i) => ({
        modelType: 'test',
        timestamp: Date.now() - i * 1000
      }))

      modelManager.predictionHistory = largePredictionHistory
      modelManager.cleanupPredictionHistory()

      const endTime = Date.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(100) // Should complete quickly
      expect(modelManager.predictionHistory.length).toBeLessThanOrEqual(1000)
    })
  })
})