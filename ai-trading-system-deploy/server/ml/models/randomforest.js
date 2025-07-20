import { Logger } from '../../utils/logger.js'

export class RandomForestModel {
  constructor() {
    this.logger = new Logger()
    this.isInitialized = false
    this.isTrained = false
    
    // Model configuration
    this.config = {
      nTrees: 100,
      maxDepth: 10,
      minSamplesSplit: 2,
      minSamplesLeaf: 1,
      maxFeatures: 'sqrt',
      bootstrap: true,
      randomState: 42
    }
    
    // Model state
    this.trees = []
    this.featureImportances = []
    this.nFeatures = 0
    this.nClasses = 2
    this.version = '1.0.0'
    
    // Training history
    this.trainingHistory = []
  }

  async initialize() {
    try {
      this.logger.info('Initializing Random Forest model')
      
      // Initialize random number generator
      this.random = this.createRandom(this.config.randomState)
      
      this.isInitialized = true
      this.logger.info('Random Forest model initialized')
      
      return true
    } catch (error) {
      this.logger.error('Error initializing Random Forest model:', error)
      throw error
    }
  }

  createRandom(seed) {
    let state = seed
    return {
      next: () => {
        state = (state * 1664525 + 1013904223) % Math.pow(2, 32)
        return state / Math.pow(2, 32)
      },
      choice: (arr) => {
        return arr[Math.floor(this.random.next() * arr.length)]
      },
      sample: (arr, n) => {
        const result = []
        const indices = Array.from({ length: arr.length }, (_, i) => i)
        
        for (let i = 0; i < n && indices.length > 0; i++) {
          const idx = Math.floor(this.random.next() * indices.length)
          result.push(arr[indices[idx]])
          indices.splice(idx, 1)
        }
        
        return result
      }
    }
  }

  async train(trainData, validData, options = {}) {
    try {
      this.logger.info('Starting Random Forest training')
      
      if (!trainData || trainData.length === 0) {
        throw new Error('No training data provided')
      }
      
      const startTime = Date.now()
      
      // Prepare data
      const X = trainData.map(sample => sample.features)
      const y = trainData.map(sample => sample.label)
      
      this.nFeatures = X[0].length
      this.nClasses = Math.max(...y) + 1
      
      // Initialize trees
      this.trees = []
      this.featureImportances = new Array(this.nFeatures).fill(0)
      
      // Train each tree
      for (let i = 0; i < this.config.nTrees; i++) {
        const tree = await this.trainTree(X, y, i)
        this.trees.push(tree)
        
        // Update feature importances
        for (let j = 0; j < this.nFeatures; j++) {
          this.featureImportances[j] += tree.featureImportances[j] || 0
        }
        
        // Progress logging
        if ((i + 1) % 10 === 0) {
          this.logger.debug(`Trained ${i + 1}/${this.config.nTrees} trees`)
        }
      }
      
      // Normalize feature importances
      const totalImportance = this.featureImportances.reduce((sum, imp) => sum + imp, 0)
      if (totalImportance > 0) {
        this.featureImportances = this.featureImportances.map(imp => imp / totalImportance)
      }
      
      const trainingTime = Date.now() - startTime
      
      // Evaluate on validation data
      let validationResult = null
      if (validData && validData.length > 0) {
        validationResult = await this.evaluate(validData)
      }
      
      // Record training history
      const trainingRecord = {
        timestamp: new Date().toISOString(),
        trainingTime,
        trainSize: trainData.length,
        validSize: validData ? validData.length : 0,
        nTrees: this.config.nTrees,
        validation: validationResult
      }
      
      this.trainingHistory.push(trainingRecord)
      this.isTrained = true
      
      this.logger.info(`Random Forest training completed in ${trainingTime}ms`)
      
      return {
        success: true,
        trainingTime,
        validation: validationResult,
        featureImportances: this.featureImportances
      }
    } catch (error) {
      this.logger.error('Error training Random Forest:', error)
      throw error
    }
  }

  async trainTree(X, y, treeIndex) {
    try {
      // Bootstrap sampling
      const bootstrapIndices = []
      for (let i = 0; i < X.length; i++) {
        bootstrapIndices.push(Math.floor(this.random.next() * X.length))
      }
      
      const bootstrapX = bootstrapIndices.map(idx => X[idx])
      const bootstrapY = bootstrapIndices.map(idx => y[idx])
      
      // Build decision tree
      const tree = this.buildDecisionTree(bootstrapX, bootstrapY, 0)
      
      // Calculate feature importances for this tree
      tree.featureImportances = this.calculateTreeFeatureImportances(tree)
      
      return tree
    } catch (error) {
      this.logger.error(`Error training tree ${treeIndex}:`, error)
      throw error
    }
  }

  buildDecisionTree(X, y, depth) {
    // Check stopping criteria
    if (depth >= this.config.maxDepth || 
        X.length < this.config.minSamplesSplit ||
        this.isPure(y)) {
      return this.createLeafNode(y)
    }
    
    // Find best split
    const bestSplit = this.findBestSplit(X, y)
    
    if (!bestSplit || bestSplit.gain <= 0) {
      return this.createLeafNode(y)
    }
    
    // Split data
    const { leftX, leftY, rightX, rightY } = this.splitData(X, y, bestSplit)
    
    // Check minimum samples per leaf
    if (leftX.length < this.config.minSamplesLeaf || 
        rightX.length < this.config.minSamplesLeaf) {
      return this.createLeafNode(y)
    }
    
    // Recursively build subtrees
    const leftChild = this.buildDecisionTree(leftX, leftY, depth + 1)
    const rightChild = this.buildDecisionTree(rightX, rightY, depth + 1)
    
    return {
      type: 'internal',
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      gain: bestSplit.gain,
      samples: X.length,
      left: leftChild,
      right: rightChild
    }
  }

  findBestSplit(X, y) {
    let bestSplit = null
    let bestGain = 0
    
    // Select features to consider
    const nFeaturesToConsider = this.config.maxFeatures === 'sqrt' 
      ? Math.floor(Math.sqrt(this.nFeatures))
      : this.config.maxFeatures === 'log2'
      ? Math.floor(Math.log2(this.nFeatures))
      : this.nFeatures
    
    const featureIndices = Array.from({ length: this.nFeatures }, (_, i) => i)
    const selectedFeatures = this.random.sample(featureIndices, nFeaturesToConsider)
    
    for (const featureIdx of selectedFeatures) {
      // Get unique values for this feature
      const values = [...new Set(X.map(sample => sample[featureIdx]))].sort((a, b) => a - b)
      
      // Try different thresholds
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2
        const gain = this.calculateGain(X, y, featureIdx, threshold)
        
        if (gain > bestGain) {
          bestGain = gain
          bestSplit = {
            feature: featureIdx,
            threshold,
            gain
          }
        }
      }
    }
    
    return bestSplit
  }

  calculateGain(X, y, featureIdx, threshold) {
    const parentEntropy = this.calculateEntropy(y)
    
    const leftIndices = []
    const rightIndices = []
    
    for (let i = 0; i < X.length; i++) {
      if (X[i][featureIdx] <= threshold) {
        leftIndices.push(i)
      } else {
        rightIndices.push(i)
      }
    }
    
    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return 0
    }
    
    const leftY = leftIndices.map(idx => y[idx])
    const rightY = rightIndices.map(idx => y[idx])
    
    const leftEntropy = this.calculateEntropy(leftY)
    const rightEntropy = this.calculateEntropy(rightY)
    
    const weightedEntropy = (leftY.length / y.length) * leftEntropy + 
                           (rightY.length / y.length) * rightEntropy
    
    return parentEntropy - weightedEntropy
  }

  calculateEntropy(y) {
    if (y.length === 0) return 0
    
    const counts = {}
    for (const label of y) {
      counts[label] = (counts[label] || 0) + 1
    }
    
    let entropy = 0
    for (const count of Object.values(counts)) {
      const probability = count / y.length
      if (probability > 0) {
        entropy -= probability * Math.log2(probability)
      }
    }
    
    return entropy
  }

  splitData(X, y, split) {
    const leftX = []
    const leftY = []
    const rightX = []
    const rightY = []
    
    for (let i = 0; i < X.length; i++) {
      if (X[i][split.feature] <= split.threshold) {
        leftX.push(X[i])
        leftY.push(y[i])
      } else {
        rightX.push(X[i])
        rightY.push(y[i])
      }
    }
    
    return { leftX, leftY, rightX, rightY }
  }

  isPure(y) {
    return new Set(y).size <= 1
  }

  createLeafNode(y) {
    const counts = {}
    for (const label of y) {
      counts[label] = (counts[label] || 0) + 1
    }
    
    // Find majority class
    let majorityClass = 0
    let maxCount = 0
    for (const [label, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        majorityClass = parseInt(label)
      }
    }
    
    // Calculate class probabilities
    const probabilities = {}
    for (const [label, count] of Object.entries(counts)) {
      probabilities[label] = count / y.length
    }
    
    return {
      type: 'leaf',
      prediction: majorityClass,
      probabilities,
      samples: y.length
    }
  }

  calculateTreeFeatureImportances(tree) {
    const importances = new Array(this.nFeatures).fill(0)
    
    const traverse = (node) => {
      if (node.type === 'internal') {
        importances[node.feature] += node.gain * node.samples
        traverse(node.left)
        traverse(node.right)
      }
    }
    
    traverse(tree)
    return importances
  }

  async predict(features) {
    try {
      if (!this.isTrained) {
        throw new Error('Model not trained')
      }
      
      if (!Array.isArray(features) || features.length !== this.nFeatures) {
        throw new Error(`Expected ${this.nFeatures} features, got ${features.length}`)
      }
      
      // Get predictions from all trees
      const treePredictions = []
      const treeProbabilities = []
      
      for (const tree of this.trees) {
        const result = this.predictTree(tree, features)
        treePredictions.push(result.prediction)
        treeProbabilities.push(result.probabilities)
      }
      
      // Aggregate predictions (majority vote)
      const classCounts = {}
      for (const prediction of treePredictions) {
        classCounts[prediction] = (classCounts[prediction] || 0) + 1
      }
      
      let finalPrediction = 0
      let maxVotes = 0
      for (const [classLabel, votes] of Object.entries(classCounts)) {
        if (votes > maxVotes) {
          maxVotes = votes
          finalPrediction = parseInt(classLabel)
        }
      }
      
      // Calculate average probabilities
      const avgProbabilities = {}
      for (let i = 0; i < this.nClasses; i++) {
        avgProbabilities[i] = 0
      }
      
      for (const probs of treeProbabilities) {
        for (const [classLabel, prob] of Object.entries(probs)) {
          avgProbabilities[classLabel] += prob
        }
      }
      
      for (const classLabel of Object.keys(avgProbabilities)) {
        avgProbabilities[classLabel] /= this.trees.length
      }
      
      // Calculate confidence
      const confidence = maxVotes / this.trees.length
      
      // Convert to trading signal
      const signal = finalPrediction === 1 ? 1 : -1
      const direction = signal
      
      return {
        prediction: finalPrediction,
        probabilities: avgProbabilities,
        confidence,
        signal,
        direction,
        votes: classCounts
      }
    } catch (error) {
      this.logger.error('Error making prediction:', error)
      throw error
    }
  }

  predictTree(tree, features) {
    let currentNode = tree
    
    while (currentNode.type === 'internal') {
      if (features[currentNode.feature] <= currentNode.threshold) {
        currentNode = currentNode.left
      } else {
        currentNode = currentNode.right
      }
    }
    
    return {
      prediction: currentNode.prediction,
      probabilities: currentNode.probabilities
    }
  }

  async evaluate(testData) {
    try {
      if (!testData || testData.length === 0) {
        throw new Error('No test data provided')
      }
      
      const predictions = []
      const actualLabels = []
      
      for (const sample of testData) {
        const prediction = await this.predict(sample.features)
        predictions.push(prediction.prediction)
        actualLabels.push(sample.label)
      }
      
      // Calculate metrics
      const accuracy = this.calculateAccuracy(predictions, actualLabels)
      const precision = this.calculatePrecision(predictions, actualLabels)
      const recall = this.calculateRecall(predictions, actualLabels)
      const f1Score = this.calculateF1Score(precision, recall)
      const confusionMatrix = this.calculateConfusionMatrix(predictions, actualLabels)
      
      return {
        accuracy,
        precision,
        recall,
        f1Score,
        confusionMatrix,
        nSamples: testData.length
      }
    } catch (error) {
      this.logger.error('Error evaluating model:', error)
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

  calculateConfusionMatrix(predictions, actual) {
    const matrix = {}
    
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i]
      const act = actual[i]
      
      if (!matrix[act]) matrix[act] = {}
      if (!matrix[act][pred]) matrix[act][pred] = 0
      
      matrix[act][pred]++
    }
    
    return matrix
  }

  async getState() {
    return {
      version: this.version,
      config: this.config,
      trees: this.trees,
      featureImportances: this.featureImportances,
      nFeatures: this.nFeatures,
      nClasses: this.nClasses,
      isTrained: this.isTrained,
      trainingHistory: this.trainingHistory
    }
  }

  async loadState(state) {
    try {
      this.version = state.version || '1.0.0'
      this.config = { ...this.config, ...state.config }
      this.trees = state.trees || []
      this.featureImportances = state.featureImportances || []
      this.nFeatures = state.nFeatures || 0
      this.nClasses = state.nClasses || 2
      this.isTrained = state.isTrained || false
      this.trainingHistory = state.trainingHistory || []
      
      this.logger.info('Random Forest model state loaded')
      return true
    } catch (error) {
      this.logger.error('Error loading model state:', error)
      throw error
    }
  }

  getFeatureImportances() {
    return [...this.featureImportances]
  }

  getTrainingHistory() {
    return [...this.trainingHistory]
  }

  async cleanup() {
    this.trees = []
    this.featureImportances = []
    this.trainingHistory = []
    this.isTrained = false
    this.logger.info('Random Forest model cleaned up')
  }
}