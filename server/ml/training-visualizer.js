import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class TrainingVisualizer extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    
    this.options = {
      updateInterval: options.updateInterval || 1000, // 1 second updates
      maxHistoryPoints: options.maxHistoryPoints || 1000,
      ...options
    }
    
    this.trainingSessions = new Map()
    this.activeTrainings = new Set()
    this.trainingMetrics = new Map()
    this.io = null // Will be set by server
  }

  setSocketIO(io) {
    this.io = io
  }

  async initialize() {
    try {
      await this.db.initialize()
      this.logger.info('Training Visualizer initialized')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Training Visualizer:', error)
      throw error
    }
  }

  // Start tracking a new training session
  startTrainingSession(sessionId, modelName, config = {}) {
    const session = {
      id: sessionId,
      modelName,
      startTime: Date.now(),
      status: 'training',
      progress: 0,
      currentEpoch: 0,
      totalEpochs: config.epochs || 100,
      metrics: {
        loss: [],
        accuracy: [],
        validation_loss: [],
        validation_accuracy: [],
        learning_rate: []
      },
      config,
      events: []
    }
    
    this.trainingSessions.set(sessionId, session)
    this.activeTrainings.add(sessionId)
    this.trainingMetrics.set(sessionId, [])
    
    // Emit training started event
    this.emit('training_started', session)
    if (this.io) {
      this.io.emit('training_started', session)
    }
    
    this.logger.info(`Training session started: ${sessionId} for ${modelName}`)
    return session
  }

  // Update training progress
  updateTrainingProgress(sessionId, progress, epoch, metrics = {}) {
    const session = this.trainingSessions.get(sessionId)
    if (!session) {
      this.logger.warn(`Training session not found: ${sessionId}`)
      return
    }
    
    // Update session progress
    session.progress = Math.min(progress, 1)
    session.currentEpoch = epoch
    
    // Add metrics to history
    const metricPoint = {
      timestamp: Date.now(),
      epoch,
      progress,
      ...metrics
    }
    
    this.trainingMetrics.get(sessionId).push(metricPoint)
    
    // Keep only recent history
    const metricsHistory = this.trainingMetrics.get(sessionId)
    if (metricsHistory.length > this.options.maxHistoryPoints) {
      this.trainingMetrics.set(sessionId, metricsHistory.slice(-this.options.maxHistoryPoints))
    }
    
    // Update session metrics
    if (metrics.loss !== undefined) session.metrics.loss.push(metrics.loss)
    if (metrics.accuracy !== undefined) session.metrics.accuracy.push(metrics.accuracy)
    if (metrics.validation_loss !== undefined) session.metrics.validation_loss.push(metrics.validation_loss)
    if (metrics.validation_accuracy !== undefined) session.metrics.validation_accuracy.push(metrics.validation_accuracy)
    if (metrics.learning_rate !== undefined) session.metrics.learning_rate.push(metrics.learning_rate)
    
    // Emit progress update
    const update = {
      sessionId,
      progress,
      epoch,
      metrics,
      timestamp: Date.now()
    }
    
    this.emit('training_progress', update)
    if (this.io) {
      this.io.emit('training_progress', update)
    }
    
    // Save to database
    this.saveTrainingProgress(sessionId, update)
  }

  // Add training event (like epoch completed, validation, etc.)
  addTrainingEvent(sessionId, eventType, data = {}) {
    const session = this.trainingSessions.get(sessionId)
    if (!session) return
    
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data
    }
    
    session.events.push(event)
    
    // Emit event
    this.emit('training_event', { sessionId, event })
    if (this.io) {
      this.io.emit('training_event', { sessionId, event })
    }
    
    this.logger.info(`Training event: ${sessionId} - ${eventType}`)
  }

  // Complete training session
  completeTrainingSession(sessionId, finalMetrics = {}) {
    const session = this.trainingSessions.get(sessionId)
    if (!session) return
    
    session.status = 'completed'
    session.endTime = Date.now()
    session.duration = session.endTime - session.startTime
    session.finalMetrics = finalMetrics
    session.progress = 1
    
    this.activeTrainings.delete(sessionId)
    
    // Emit completion
    this.emit('training_completed', session)
    if (this.io) {
      this.io.emit('training_completed', session)
    }
    
    // Save final results
    this.saveTrainingResults(sessionId, session)
    
    this.logger.info(`Training completed: ${sessionId} - Duration: ${session.duration}ms`)
  }

  // Fail training session
  failTrainingSession(sessionId, error) {
    const session = this.trainingSessions.get(sessionId)
    if (!session) return
    
    session.status = 'failed'
    session.endTime = Date.now()
    session.duration = session.endTime - session.startTime
    session.error = error.message || error
    
    this.activeTrainings.delete(sessionId)
    
    // Emit failure
    this.emit('training_failed', { sessionId, error: session.error })
    if (this.io) {
      this.io.emit('training_failed', { sessionId, error: session.error })
    }
    
    this.logger.error(`Training failed: ${sessionId} - ${session.error}`)
  }

  // Get current training status
  getTrainingStatus(sessionId) {
    const session = this.trainingSessions.get(sessionId)
    if (!session) return null
    
    return {
      ...session,
      metrics: this.trainingMetrics.get(sessionId) || []
    }
  }

  // Get all active trainings
  getActiveTrainings() {
    return Array.from(this.activeTrainings).map(id => this.getTrainingStatus(id))
  }

  // Get training history
  getTrainingHistory(limit = 50) {
    const sessions = Array.from(this.trainingSessions.values())
    return sessions
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, limit)
  }

  // Save training progress to database
  async saveTrainingProgress(sessionId, progress) {
    try {
      await this.db.saveTrainingProgress(sessionId, progress)
    } catch (error) {
      this.logger.error('Failed to save training progress:', error)
    }
  }

  // Save final training results
  async saveTrainingResults(sessionId, session) {
    try {
      await this.db.saveTrainingResults(sessionId, session)
    } catch (error) {
      this.logger.error('Failed to save training results:', error)
    }
  }

  // Get training metrics for visualization
  getTrainingMetrics(sessionId, metricType = 'all') {
    const metrics = this.trainingMetrics.get(sessionId)
    if (!metrics) return []
    
    if (metricType === 'all') {
      return metrics
    }
    
    return metrics.map(point => ({
      timestamp: point.timestamp,
      epoch: point.epoch,
      progress: point.progress,
      value: point[metricType]
    })).filter(point => point.value !== undefined)
  }

  // Get real-time training summary
  getTrainingSummary() {
    const active = this.getActiveTrainings()
    const history = this.getTrainingHistory(10)
    
    return {
      active: active.length,
      completed: history.filter(s => s.status === 'completed').length,
      failed: history.filter(s => s.status === 'failed').length,
      total: history.length,
      activeSessions: active.map(s => ({
        id: s.id,
        modelName: s.modelName,
        progress: s.progress,
        currentEpoch: s.currentEpoch,
        totalEpochs: s.totalEpochs
      }))
    }
  }

  // Clean up old training sessions
  cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now()
    const toDelete = []
    
    for (const [sessionId, session] of this.trainingSessions) {
      if (session.endTime && (now - session.endTime) > maxAge) {
        toDelete.push(sessionId)
      }
    }
    
    for (const sessionId of toDelete) {
      this.trainingSessions.delete(sessionId)
      this.trainingMetrics.delete(sessionId)
    }
    
    if (toDelete.length > 0) {
      this.logger.info(`Cleaned up ${toDelete.length} old training sessions`)
    }
  }

  // Start periodic cleanup
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupOldSessions()
    }, 60 * 60 * 1000) // Every hour
  }

  // Stop all active trainings
  stopAllTrainings() {
    for (const sessionId of this.activeTrainings) {
      this.failTrainingSession(sessionId, new Error('Training stopped by user'))
    }
  }

  // Get training statistics
  getTrainingStats() {
    const sessions = Array.from(this.trainingSessions.values())
    const completed = sessions.filter(s => s.status === 'completed')
    const failed = sessions.filter(s => s.status === 'failed')
    
    const avgDuration = completed.length > 0 
      ? completed.reduce((sum, s) => sum + s.duration, 0) / completed.length 
      : 0
    
    const successRate = sessions.length > 0 
      ? completed.length / sessions.length 
      : 0
    
    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      activeSessions: this.activeTrainings.size,
      averageDuration: avgDuration,
      successRate: successRate,
      recentSessions: this.getTrainingHistory(5)
    }
  }
} 