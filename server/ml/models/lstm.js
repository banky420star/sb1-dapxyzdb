import { Logger } from '../../utils/logger.js'

export class LSTMModel {
  constructor() {
    this.logger = new Logger()
    this.isInitialized = false
    this.isTrained = false
    
    // Model configuration
    this.config = {
      sequenceLength: 60,
      hiddenSize: 50,
      numLayers: 2,
      dropout: 0.2,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      patience: 10
    }
    
    // Model architecture
    this.weights = {
      inputWeights: [],
      hiddenWeights: [],
      outputWeights: [],
      biases: []
    }
    
    // Training state
    this.scaler = null
    this.sequenceLength = this.config.sequenceLength
    this.inputSize = 0
    this.outputSize = 2 // Binary classification
    this.version = '1.0.0'
    
    // Training history
    this.trainingHistory = []
    this.losses = []
  }

  async initialize() {
    try {
      this.logger.info('Initializing LSTM model')
      
      // Initialize random weights (simplified implementation)
      this.initializeWeights()
      
      this.isInitialized = true
      this.logger.info('LSTM model initialized')
      
      return true
    } catch (error) {
      this.logger.error('Error initializing LSTM model:', error)
      throw error
    }
  }

  initializeWeights() {
    // Simplified LSTM weight initialization
    // In a real implementation, this would use proper LSTM cell initialization
    this.weights = {
      inputWeights: this.randomMatrix(this.config.hiddenSize, 10), // Placeholder input size
      hiddenWeights: this.randomMatrix(this.config.hiddenSize, this.config.hiddenSize),
      outputWeights: this.randomMatrix(this.outputSize, this.config.hiddenSize),
      biases: this.randomArray(this.config.hiddenSize)
    }
  }

  randomMatrix(rows, cols) {
    const matrix = []
    for (let i = 0; i < rows; i++) {
      const row = []
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() - 0.5) * 0.1) // Small random values
      }
      matrix.push(row)
    }
    return matrix
  }

  randomArray(size) {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1)
  }

  async train(trainData, validData, options = {}) {
    try {
      this.logger.info('Starting LSTM training')
      
      if (!trainData || trainData.length === 0) {
        throw new Error('No training data provided')
      }
      
      const startTime = Date.now()
      
      // Reduce memory usage by limiting data size
      const maxSamples = 5000 // Limit to prevent memory issues
      const limitedTrainData = trainData.slice(0, maxSamples)
      
      // Prepare sequences with smaller batch size
      const { X, y } = this.prepareSequences(limitedTrainData)
      const { X: validX, y: validY } = validData ? this.prepareSequences(validData.slice(0, 1000)) : { X: null, y: null }
      
      if (X.length === 0) {
        throw new Error('Insufficient data for sequence creation')
      }
      
      this.logger.info(`Training with ${X.length} sequences`)
      
      // Reduce epochs to prevent timeout
      const epochs = Math.min(options.epochs || this.config.epochs, 20)
      const batchSize = Math.min(options.batchSize || this.config.batchSize, 16)
      
      let bestLoss = Infinity
      let patience = 0
      const maxPatience = this.config.patience
      
      for (let epoch = 1; epoch <= epochs; epoch++) {
        try {
          // Train epoch with smaller batches
          const trainLoss = await this.trainEpoch(X, y, batchSize)
          
          // Validate if validation data exists
          let validLoss = null
          if (validX && validY) {
            validLoss = await this.validateEpoch(validX, validY)
          }
          
          const currentLoss = validLoss || trainLoss
          
          // Early stopping
          if (currentLoss < bestLoss) {
            bestLoss = currentLoss
            patience = 0
          } else {
            patience++
          }
          
          if (patience >= maxPatience) {
            this.logger.info(`Early stopping at epoch ${epoch}`)
            break
          }
          
          // Add small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10))
          
        } catch (error) {
          this.logger.error(`Error in epoch ${epoch}:`, error)
          // Continue with next epoch instead of failing completely
          continue
        }
      }
      
      const trainingTime = Date.now() - startTime
      this.isTrained = true
      
      this.logger.info(`LSTM training completed in ${trainingTime}ms`)
      return {
        success: true,
        trainingTime,
        finalLoss: bestLoss,
        epochs: epoch - 1
      }
      
    } catch (error) {
      this.logger.error('LSTM training failed:', error)
      throw error
    }
  }

  prepareSequences(data) {
    const sequences = []
    const labels = []
    
    // Sort data by timestamp
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp)
    
    // Create sequences
    for (let i = this.sequenceLength; i < sortedData.length; i++) {
      const sequence = []
      
      for (let j = i - this.sequenceLength; j < i; j++) {
        sequence.push(sortedData[j].features)
      }
      
      sequences.push(sequence)
      labels.push(sortedData[i].label)
    }
    
    return { X: sequences, y: labels }
  }

  fitScaler(sequences) {
    // Calculate mean and std for each feature across all sequences
    const flatFeatures = []
    
    for (const sequence of sequences) {
      for (const timestep of sequence) {
        flatFeatures.push(timestep)
      }
    }
    
    if (flatFeatures.length === 0) {
      return { mean: [], std: [] }
    }
    
    const nFeatures = flatFeatures[0].length
    const mean = new Array(nFeatures).fill(0)
    const std = new Array(nFeatures).fill(1)
    
    // Calculate mean
    for (const features of flatFeatures) {
      for (let i = 0; i < nFeatures; i++) {
        mean[i] += features[i]
      }
    }
    
    for (let i = 0; i < nFeatures; i++) {
      mean[i] /= flatFeatures.length
    }
    
    // Calculate std
    for (const features of flatFeatures) {
      for (let i = 0; i < nFeatures; i++) {
        std[i] += Math.pow(features[i] - mean[i], 2)
      }
    }
    
    for (let i = 0; i < nFeatures; i++) {
      std[i] = Math.sqrt(std[i] / flatFeatures.length)
      if (std[i] === 0) std[i] = 1 // Avoid division by zero
    }
    
    return { mean, std }
  }

  normalizeSequences(sequences) {
    if (!this.scaler) return sequences
    
    return sequences.map(sequence => 
      sequence.map(timestep => 
        timestep.map((feature, i) => 
          (feature - this.scaler.mean[i]) / this.scaler.std[i]
        )
      )
    )
  }

  async trainEpoch(X, y, batchSize) {
    let totalLoss = 0
    
    // Shuffle data
    const indices = Array.from({ length: X.length }, (_, i) => i)
    this.shuffleArray(indices)
    
    for (let i = 0; i < X.length; i += batchSize) {
      const batchIndices = indices.slice(i, i + batchSize)
      const batchX = batchIndices.map(idx => X[idx])
      const batchY = batchIndices.map(idx => y[idx])
      
      const batchLoss = await this.trainBatch(batchX, batchY)
      totalLoss += batchLoss
    }
    
    return totalLoss / Math.ceil(X.length / batchSize)
  }

  async trainBatch(batchX, batchY) {
    // Simplified LSTM forward and backward pass
    // In a real implementation, this would use proper LSTM cells and backpropagation
    
    let totalLoss = 0
    
    for (let i = 0; i < batchX.length; i++) {
      const sequence = batchX[i]
      const target = batchY[i]
      
      // Forward pass
      const prediction = this.forwardPass(sequence)
      
      // Calculate loss (cross-entropy)
      const loss = this.calculateLoss(prediction, target)
      totalLoss += loss
      
      // Backward pass (simplified)
      this.backwardPass(prediction, target, sequence)
    }
    
    return totalLoss / batchX.length
  }

  forwardPass(sequence) {
    // Simplified LSTM forward pass
    let hiddenState = new Array(this.config.hiddenSize).fill(0)
    let cellState = new Array(this.config.hiddenSize).fill(0)
    
    // Process sequence
    for (const timestep of sequence) {
      const { newHidden, newCell } = this.lstmCell(timestep, hiddenState, cellState)
      hiddenState = newHidden
      cellState = newCell
    }
    
    // Output layer
    const output = this.matrixVectorMultiply(this.weights.outputWeights, hiddenState)
    
    // Softmax activation
    return this.softmax(output)
  }

  lstmCell(input, hiddenState, cellState) {
    // Simplified LSTM cell computation
    // In reality, this would implement forget, input, and output gates
    
    // Combine input and hidden state
    const combined = [...input, ...hiddenState]
    
    // Compute gates (simplified)
    const forgetGate = this.sigmoid(this.matrixVectorMultiply(
      this.weights.inputWeights.slice(0, this.config.hiddenSize), 
      combined
    ))
    
    const inputGate = this.sigmoid(this.matrixVectorMultiply(
      this.weights.inputWeights.slice(this.config.hiddenSize, 2 * this.config.hiddenSize), 
      combined
    ))
    
    const candidateValues = this.tanh(this.matrixVectorMultiply(
      this.weights.inputWeights.slice(2 * this.config.hiddenSize, 3 * this.config.hiddenSize), 
      combined
    ))
    
    const outputGate = this.sigmoid(this.matrixVectorMultiply(
      this.weights.inputWeights.slice(3 * this.config.hiddenSize, 4 * this.config.hiddenSize), 
      combined
    ))
    
    // Update cell state
    const newCellState = cellState.map((c, i) => 
      forgetGate[i] * c + inputGate[i] * candidateValues[i]
    )
    
    // Update hidden state
    const newHiddenState = outputGate.map((o, i) => 
      o * Math.tanh(newCellState[i])
    )
    
    return { newHidden: newHiddenState, newCell: newCellState }
  }

  matrixVectorMultiply(matrix, vector) {
    const result = []
    
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0
      for (let j = 0; j < Math.min(matrix[i].length, vector.length); j++) {
        sum += matrix[i][j] * vector[j]
      }
      result.push(sum)
    }
    
    return result
  }

  sigmoid(values) {
    return values.map(x => 1 / (1 + Math.exp(-x)))
  }

  tanh(values) {
    return values.map(x => Math.tanh(x))
  }

  softmax(values) {
    const maxVal = Math.max(...values)
    const exp = values.map(x => Math.exp(x - maxVal))
    const sum = exp.reduce((a, b) => a + b, 0)
    return exp.map(x => x / sum)
  }

  calculateLoss(prediction, target) {
    // Cross-entropy loss
    const epsilon = 1e-15
    const clippedPrediction = prediction.map(p => Math.max(epsilon, Math.min(1 - epsilon, p)))
    
    return -Math.log(clippedPrediction[target])
  }

  backwardPass(prediction, target, sequence) {
    // Simplified backward pass
    // In a real implementation, this would compute gradients and update weights
    
    const learningRate = this.config.learningRate
    const error = prediction[target] - 1 // Simplified error calculation
    
    // Update output weights (simplified)
    for (let i = 0; i < this.weights.outputWeights.length; i++) {
      for (let j = 0; j < this.weights.outputWeights[i].length; j++) {
        this.weights.outputWeights[i][j] -= learningRate * error * 0.01 // Simplified gradient
      }
    }
  }

  async validateEpoch(validX, validY) {
    let totalLoss = 0
    
    for (let i = 0; i < validX.length; i++) {
      const prediction = this.forwardPass(validX[i])
      const loss = this.calculateLoss(prediction, validY[i])
      totalLoss += loss
    }
    
    return totalLoss / validX.length
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  async predict(features) {
    try {
      if (!this.isTrained) {
        throw new Error('Model not trained')
      }
      
      // Create sequence from single feature vector
      // In practice, you'd need a sequence of features
      const sequence = Array(this.sequenceLength).fill(features)
      
      // Normalize
      const normalizedSequence = this.scaler ? 
        sequence.map(timestep => 
          timestep.map((feature, i) => 
            (feature - this.scaler.mean[i]) / this.scaler.std[i]
          )
        ) : sequence
      
      // Forward pass
      const probabilities = this.forwardPass(normalizedSequence)
      
      // Get prediction
      const prediction = probabilities[1] > probabilities[0] ? 1 : 0
      const confidence = Math.max(...probabilities)
      
      // Convert to trading signal
      const signal = prediction === 1 ? 1 : -1
      const direction = signal
      
      return {
        prediction,
        probabilities: {
          0: probabilities[0],
          1: probabilities[1]
        },
        confidence,
        signal,
        direction
      }
    } catch (error) {
      this.logger.error('Error making prediction:', error)
      throw error
    }
  }

  async evaluate(testData) {
    try {
      if (!testData || testData.length === 0) {
        throw new Error('No test data provided')
      }
      
      const { X, y } = this.prepareSequences(testData)
      
      if (X.length === 0) {
        throw new Error('Insufficient test data for sequences')
      }
      
      const normalizedX = this.normalizeSequences(X)
      
      const predictions = []
      const actualLabels = y
      
      for (let i = 0; i < normalizedX.length; i++) {
        const probabilities = this.forwardPass(normalizedX[i])
        const prediction = probabilities[1] > probabilities[0] ? 1 : 0
        predictions.push(prediction)
      }
      
      // Calculate metrics
      const accuracy = this.calculateAccuracy(predictions, actualLabels)
      const precision = this.calculatePrecision(predictions, actualLabels)
      const recall = this.calculateRecall(predictions, actualLabels)
      const f1Score = this.calculateF1Score(precision, recall)
      
      return {
        accuracy,
        precision,
        recall,
        f1Score,
        nSamples: testData.length
      }
    } catch (error) {
      this.logger.error('Error evaluating LSTM model:', error)
      throw error
    }
  }

  calculateAccuracy(predictions, actual) {
    const correct = predictions.filter((pred, i) => pred === actual[i]).length
    return correct / predictions.length
  }

  calculatePrecision(predictions, actual) {
    const truePositives = predictions.filter((pred, i) => pred === 1 && actual[i] === 1).length
    const falsePositives = predictions.filter((pred, i) => pred === 1 && actual[i] === 0).length
    
    return truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0
  }

  calculateRecall(predictions, actual) {
    const truePositives = predictions.filter((pred, i) => pred === 1 && actual[i] === 1).length
    const falseNegatives = predictions.filter((pred, i) => pred === 0 && actual[i] === 1).length
    
    return truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0
  }

  calculateF1Score(precision, recall) {
    return precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0
  }

  async getState() {
    return {
      version: this.version,
      config: this.config,
      weights: this.weights,
      scaler: this.scaler,
      inputSize: this.inputSize,
      outputSize: this.outputSize,
      isTrained: this.isTrained,
      trainingHistory: this.trainingHistory,
      losses: this.losses
    }
  }

  async loadState(state) {
    try {
      this.version = state.version || '1.0.0'
      this.config = { ...this.config, ...state.config }
      this.weights = state.weights || this.weights
      this.scaler = state.scaler || null
      this.inputSize = state.inputSize || 0
      this.outputSize = state.outputSize || 2
      this.isTrained = state.isTrained || false
      this.trainingHistory = state.trainingHistory || []
      this.losses = state.losses || []
      
      this.logger.info('LSTM model state loaded')
      return true
    } catch (error) {
      this.logger.error('Error loading LSTM model state:', error)
      throw error
    }
  }

  getTrainingHistory() {
    return [...this.trainingHistory]
  }

  getLosses() {
    return [...this.losses]
  }

  async cleanup() {
    this.weights = {
      inputWeights: [],
      hiddenWeights: [],
      outputWeights: [],
      biases: []
    }
    this.scaler = null
    this.trainingHistory = []
    this.losses = []
    this.isTrained = false
    this.logger.info('LSTM model cleaned up')
  }
}