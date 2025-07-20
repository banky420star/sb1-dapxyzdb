import { Logger } from '../../utils/logger.js'

export class DDQNModel {
  constructor() {
    this.logger = new Logger()
    this.isInitialized = false
    this.isTrained = false
    
    // Model configuration
    this.config = {
      stateSize: 20,
      actionSize: 3, // hold, buy, sell
      hiddenLayers: [64, 32],
      learningRate: 0.001,
      gamma: 0.95, // discount factor
      epsilon: 1.0, // exploration rate
      epsilonMin: 0.01,
      epsilonDecay: 0.995,
      batchSize: 32,
      memorySize: 10000,
      targetUpdateFreq: 100,
      episodes: 1000
    }
    
    // Neural networks (main and target)
    this.mainNetwork = null
    this.targetNetwork = null
    
    // Experience replay memory
    this.memory = []
    this.memoryIndex = 0
    
    // Training state
    this.epsilon = this.config.epsilon
    this.episode = 0
    this.totalReward = 0
    this.version = '1.0.0'
    
    // Training history
    this.trainingHistory = []
    this.rewardHistory = []
    this.lossHistory = []
  }

  async initialize() {
    try {
      this.logger.info('Initializing DDQN model')
      
      // Initialize neural networks
      this.mainNetwork = this.createNetwork()
      this.targetNetwork = this.createNetwork()
      
      // Copy weights from main to target network
      this.updateTargetNetwork()
      
      this.isInitialized = true
      this.logger.info('DDQN model initialized')
      
      return true
    } catch (error) {
      this.logger.error('Error initializing DDQN model:', error)
      throw error
    }
  }

  createNetwork() {
    // Simplified neural network implementation
    const layers = [this.config.stateSize, ...this.config.hiddenLayers, this.config.actionSize]
    const network = {
      layers: layers,
      weights: [],
      biases: []
    }
    
    // Initialize weights and biases
    for (let i = 0; i < layers.length - 1; i++) {
      const weightMatrix = this.randomMatrix(layers[i + 1], layers[i])
      const biasVector = this.randomArray(layers[i + 1])
      
      network.weights.push(weightMatrix)
      network.biases.push(biasVector)
    }
    
    return network
  }

  randomMatrix(rows, cols) {
    const matrix = []
    const scale = Math.sqrt(2.0 / cols) // He initialization
    
    for (let i = 0; i < rows; i++) {
      const row = []
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() - 0.5) * 2 * scale)
      }
      matrix.push(row)
    }
    return matrix
  }

  randomArray(size) {
    const scale = Math.sqrt(2.0 / size)
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 2 * scale)
  }

  updateTargetNetwork() {
    // Copy weights from main network to target network
    this.targetNetwork.weights = this.mainNetwork.weights.map(layer => 
      layer.map(row => [...row])
    )
    this.targetNetwork.biases = this.mainNetwork.biases.map(bias => [...bias])
  }

  async train(trainData, validData, options = {}) {
    try {
      this.logger.info('Starting DDQN training')
      
      if (!trainData || trainData.length === 0) {
        throw new Error('No training data provided')
      }
      
      const startTime = Date.now()
      
      // Convert training data to trading environment
      const environment = this.createTradingEnvironment(trainData)
      
      // Training loop
      for (let episode = 0; episode < this.config.episodes; episode++) {
        const episodeReward = await this.trainEpisode(environment)
        this.rewardHistory.push(episodeReward)
        
        // Update target network periodically
        if (episode % this.config.targetUpdateFreq === 0) {
          this.updateTargetNetwork()
        }
        
        // Decay epsilon
        if (this.epsilon > this.config.epsilonMin) {
          this.epsilon *= this.config.epsilonDecay
        }
        
        // Progress logging
        if ((episode + 1) % 100 === 0) {
          const avgReward = this.rewardHistory.slice(-100).reduce((sum, r) => sum + r, 0) / 100
          this.logger.debug(`Episode ${episode + 1}/${this.config.episodes}, Avg Reward: ${avgReward.toFixed(2)}, Epsilon: ${this.epsilon.toFixed(3)}`)
        }
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
        episodes: this.config.episodes,
        finalEpsilon: this.epsilon,
        avgReward: this.rewardHistory.slice(-100).reduce((sum, r) => sum + r, 0) / Math.min(100, this.rewardHistory.length),
        validation: validationResult
      }
      
      this.trainingHistory.push(trainingRecord)
      this.isTrained = true
      
      this.logger.info(`DDQN training completed in ${trainingTime}ms`)
      
      return {
        success: true,
        trainingTime,
        episodes: this.config.episodes,
        finalEpsilon: this.epsilon,
        avgReward: trainingRecord.avgReward,
        validation: validationResult
      }
    } catch (error) {
      this.logger.error('Error training DDQN:', error)
      throw error
    }
  }

  createTradingEnvironment(data) {
    return {
      data: data.sort((a, b) => a.timestamp - b.timestamp),
      currentIndex: 0,
      position: 0, // -1: short, 0: neutral, 1: long
      balance: 10000,
      equity: 10000,
      trades: [],
      
      reset: function() {
        this.currentIndex = 0
        this.position = 0
        this.balance = 10000
        this.equity = 10000
        this.trades = []
        return this.getState()
      },
      
      step: function(action) {
        const prevEquity = this.equity
        const currentPrice = this.data[this.currentIndex].features[4] // Close price
        
        // Execute action
        const reward = this.executeAction(action, currentPrice)
        
        // Move to next step
        this.currentIndex++
        
        // Check if episode is done
        const done = this.currentIndex >= this.data.length - 1
        
        return {
          nextState: done ? null : this.getState(),
          reward,
          done
        }
      },
      
      executeAction: function(action, price) {
        let reward = 0
        
        // Action: 0 = hold, 1 = buy, 2 = sell
        if (action === 1 && this.position <= 0) { // Buy
          if (this.position === -1) {
            // Close short position
            reward += (this.entryPrice - price) / this.entryPrice * 100
          }
          this.position = 1
          this.entryPrice = price
        } else if (action === 2 && this.position >= 0) { // Sell
          if (this.position === 1) {
            // Close long position
            reward += (price - this.entryPrice) / this.entryPrice * 100
          }
          this.position = -1
          this.entryPrice = price
        }
        
        // Calculate unrealized P&L
        if (this.position !== 0) {
          const unrealizedPnL = this.position === 1 ? 
            (price - this.entryPrice) / this.entryPrice * 100 :
            (this.entryPrice - price) / this.entryPrice * 100
          
          this.equity = this.balance + unrealizedPnL
        } else {
          this.equity = this.balance
        }
        
        return reward
      },
      
      getState: function() {
        if (this.currentIndex >= this.data.length) return null
        
        const features = [...this.data[this.currentIndex].features]
        
        // Add position and equity information
        features.push(this.position)
        features.push(this.equity / 10000) // Normalized equity
        
        return features.slice(0, this.config?.stateSize || 20)
      }
    }
  }

  async trainEpisode(environment) {
    let state = environment.reset()
    let totalReward = 0
    let step = 0
    
    while (state && step < 1000) { // Max steps per episode
      // Choose action (epsilon-greedy)
      const action = this.chooseAction(state)
      
      // Take action
      const { nextState, reward, done } = environment.step(action)
      
      // Store experience
      this.remember(state, action, reward, nextState, done)
      
      // Train if enough experiences
      if (this.memory.length >= this.config.batchSize) {
        const loss = await this.replay()
        if (loss !== null) {
          this.lossHistory.push(loss)
        }
      }
      
      state = nextState
      totalReward += reward
      step++
      
      if (done) break
    }
    
    return totalReward
  }

  chooseAction(state) {
    // Epsilon-greedy action selection
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.config.actionSize)
    }
    
    // Get Q-values from main network
    const qValues = this.forward(this.mainNetwork, state)
    
    // Return action with highest Q-value
    return qValues.indexOf(Math.max(...qValues))
  }

  remember(state, action, reward, nextState, done) {
    const experience = { state, action, reward, nextState, done }
    
    if (this.memory.length < this.config.memorySize) {
      this.memory.push(experience)
    } else {
      this.memory[this.memoryIndex] = experience
      this.memoryIndex = (this.memoryIndex + 1) % this.config.memorySize
    }
  }

  async replay() {
    if (this.memory.length < this.config.batchSize) return null
    
    // Sample random batch
    const batch = this.sampleBatch()
    
    // Prepare training data
    const states = batch.map(exp => exp.state)
    const nextStates = batch.filter(exp => !exp.done).map(exp => exp.nextState)
    
    // Get current Q-values
    const currentQValues = states.map(state => this.forward(this.mainNetwork, state))
    
    // Get next Q-values from target network
    const nextQValues = nextStates.map(state => this.forward(this.targetNetwork, state))
    
    // Calculate target Q-values
    const targets = []
    let nextQIndex = 0
    
    for (let i = 0; i < batch.length; i++) {
      const exp = batch[i]
      const target = [...currentQValues[i]]
      
      if (exp.done) {
        target[exp.action] = exp.reward
      } else {
        const maxNextQ = Math.max(...nextQValues[nextQIndex])
        target[exp.action] = exp.reward + this.config.gamma * maxNextQ
        nextQIndex++
      }
      
      targets.push(target)
    }
    
    // Train network
    const loss = this.trainBatch(states, targets)
    
    return loss
  }

  sampleBatch() {
    const batch = []
    const indices = new Set()
    
    while (batch.length < this.config.batchSize) {
      const index = Math.floor(Math.random() * this.memory.length)
      if (!indices.has(index)) {
        indices.add(index)
        batch.push(this.memory[index])
      }
    }
    
    return batch
  }

  forward(network, input) {
    let activation = [...input]
    
    for (let i = 0; i < network.weights.length; i++) {
      const weights = network.weights[i]
      const biases = network.biases[i]
      
      const newActivation = []
      
      for (let j = 0; j < weights.length; j++) {
        let sum = biases[j]
        for (let k = 0; k < weights[j].length && k < activation.length; k++) {
          sum += weights[j][k] * activation[k]
        }
        
        // ReLU activation for hidden layers, linear for output
        if (i < network.weights.length - 1) {
          newActivation.push(Math.max(0, sum))
        } else {
          newActivation.push(sum)
        }
      }
      
      activation = newActivation
    }
    
    return activation
  }

  trainBatch(states, targets) {
    // Simplified training step
    // In a real implementation, this would use proper backpropagation
    
    let totalLoss = 0
    
    for (let i = 0; i < states.length; i++) {
      const predicted = this.forward(this.mainNetwork, states[i])
      const target = targets[i]
      
      // Calculate loss (MSE)
      let loss = 0
      for (let j = 0; j < predicted.length; j++) {
        loss += Math.pow(predicted[j] - target[j], 2)
      }
      loss /= predicted.length
      totalLoss += loss
      
      // Simplified gradient update
      this.updateWeights(states[i], predicted, target)
    }
    
    return totalLoss / states.length
  }

  updateWeights(state, predicted, target) {
    // Simplified weight update
    // In a real implementation, this would compute proper gradients
    
    const learningRate = this.config.learningRate
    
    for (let i = 0; i < predicted.length; i++) {
      const error = target[i] - predicted[i]
      
      // Update output layer weights
      const outputLayerIndex = this.mainNetwork.weights.length - 1
      for (let j = 0; j < this.mainNetwork.weights[outputLayerIndex][i].length; j++) {
        this.mainNetwork.weights[outputLayerIndex][i][j] += learningRate * error * 0.01
      }
      
      // Update bias
      this.mainNetwork.biases[outputLayerIndex][i] += learningRate * error * 0.01
    }
  }

  async predict(features) {
    try {
      if (!this.isTrained) {
        throw new Error('Model not trained')
      }
      
      // Prepare state (add position and equity info)
      const state = [...features.slice(0, this.config.stateSize - 2), 0, 1] // Neutral position, normalized equity
      
      // Get Q-values
      const qValues = this.forward(this.mainNetwork, state)
      
      // Get best action
      const action = qValues.indexOf(Math.max(...qValues))
      
      // Convert action to trading signal
      let signal = 0
      let direction = 0
      
      if (action === 1) { // Buy
        signal = 1
        direction = 1
      } else if (action === 2) { // Sell
        signal = -1
        direction = -1
      }
      
      // Calculate confidence based on Q-value difference
      const maxQ = Math.max(...qValues)
      const secondMaxQ = qValues.sort((a, b) => b - a)[1]
      const confidence = Math.min(1, Math.max(0, (maxQ - secondMaxQ) / Math.abs(maxQ)))
      
      return {
        action,
        qValues,
        signal,
        direction,
        confidence,
        prediction: action
      }
    } catch (error) {
      this.logger.error('Error making DDQN prediction:', error)
      throw error
    }
  }

  async evaluate(testData) {
    try {
      if (!testData || testData.length === 0) {
        throw new Error('No test data provided')
      }
      
      // Create test environment
      const environment = this.createTradingEnvironment(testData)
      
      // Run evaluation episodes
      const numEpisodes = 10
      const rewards = []
      const accuracies = []
      
      for (let episode = 0; episode < numEpisodes; episode++) {
        let state = environment.reset()
        let totalReward = 0
        let correctPredictions = 0
        let totalPredictions = 0
        
        while (state) {
          // Get action (no exploration)
          const qValues = this.forward(this.mainNetwork, state)
          const action = qValues.indexOf(Math.max(...qValues))
          
          // Take action
          const { nextState, reward, done } = environment.step(action)
          
          totalReward += reward
          
          // Check prediction accuracy (simplified)
          if (reward > 0) correctPredictions++
          totalPredictions++
          
          state = nextState
          if (done) break
        }
        
        rewards.push(totalReward)
        accuracies.push(totalPredictions > 0 ? correctPredictions / totalPredictions : 0)
      }
      
      const avgReward = rewards.reduce((sum, r) => sum + r, 0) / rewards.length
      const avgAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
      
      return {
        accuracy: avgAccuracy,
        avgReward,
        rewards,
        nEpisodes: numEpisodes
      }
    } catch (error) {
      this.logger.error('Error evaluating DDQN model:', error)
      throw error
    }
  }

  async getState() {
    return {
      version: this.version,
      config: this.config,
      mainNetwork: this.mainNetwork,
      targetNetwork: this.targetNetwork,
      epsilon: this.epsilon,
      episode: this.episode,
      memory: this.memory.slice(-1000), // Keep only recent memories
      isTrained: this.isTrained,
      trainingHistory: this.trainingHistory,
      rewardHistory: this.rewardHistory.slice(-1000),
      lossHistory: this.lossHistory.slice(-1000)
    }
  }

  async loadState(state) {
    try {
      this.version = state.version || '1.0.0'
      this.config = { ...this.config, ...state.config }
      this.mainNetwork = state.mainNetwork || this.createNetwork()
      this.targetNetwork = state.targetNetwork || this.createNetwork()
      this.epsilon = state.epsilon || this.config.epsilon
      this.episode = state.episode || 0
      this.memory = state.memory || []
      this.isTrained = state.isTrained || false
      this.trainingHistory = state.trainingHistory || []
      this.rewardHistory = state.rewardHistory || []
      this.lossHistory = state.lossHistory || []
      
      this.logger.info('DDQN model state loaded')
      return true
    } catch (error) {
      this.logger.error('Error loading DDQN model state:', error)
      throw error
    }
  }

  getTrainingHistory() {
    return [...this.trainingHistory]
  }

  getRewardHistory() {
    return [...this.rewardHistory]
  }

  getLossHistory() {
    return [...this.lossHistory]
  }

  async cleanup() {
    this.mainNetwork = null
    this.targetNetwork = null
    this.memory = []
    this.trainingHistory = []
    this.rewardHistory = []
    this.lossHistory = []
    this.isTrained = false
    this.logger.info('DDQN model cleaned up')
  }
}