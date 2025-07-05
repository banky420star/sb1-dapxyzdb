import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class RiskManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.isInitialized = false
    
    // Risk configuration
    this.config = {
      maxPositions: 10,
      maxRiskPerTrade: 0.02, // 2% of account
      maxDailyLoss: 0.05,    // 5% of account
      maxDrawdown: 0.15,     // 15% maximum drawdown
      maxCorrelation: 0.7,   // Maximum correlation between positions
      maxLeverage: 10,       // Maximum leverage
      minEquity: 1000,       // Minimum account equity
      
      // Position sizing
      kellyFraction: 0.25,   // Kelly criterion fraction
      maxKellySize: 0.05,    // Maximum Kelly position size
      
      // Stop loss and take profit
      defaultStopLoss: 0.02, // 2% stop loss
      defaultTakeProfit: 0.04, // 4% take profit
      trailingStop: true,
      
      // Time-based rules
      maxHoldingPeriod: 24 * 60 * 60 * 1000, // 24 hours
      weekendFlattening: true,
      newsBlackout: 5 * 60 * 1000, // 5 minutes before/after news
      
      // Volatility adjustments
      maxVolatility: 0.05,   // 5% daily volatility
      volAdjustment: true
    }
    
    // Risk state
    this.currentRisk = {
      totalExposure: 0,
      dailyPnL: 0,
      drawdown: 0,
      openPositions: 0,
      correlations: new Map(),
      violations: []
    }
    
    // Historical data for calculations
    this.priceHistory = new Map()
    this.correlationMatrix = new Map()
    this.volatilityData = new Map()
    
    // News and events
    this.newsEvents = []
    this.blackoutPeriods = []
  }

  async initialize() {
    try {
      this.logger.info('Initializing Risk Manager')
      
      // Initialize database
      await this.db.initialize()
      
      // Load risk configuration
      await this.loadRiskConfiguration()
      
      // Load historical data for risk calculations
      await this.loadHistoricalData()
      
      // Start risk monitoring
      this.startRiskMonitoring()
      
      this.isInitialized = true
      this.logger.info('Risk Manager initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Risk Manager:', error)
      throw error
    }
  }

  async loadRiskConfiguration() {
    try {
      const savedConfig = await this.db.getRiskConfiguration()
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig }
        this.logger.info('Risk configuration loaded from database')
      }
    } catch (error) {
      this.logger.warn('Could not load risk configuration:', error.message)
    }
  }

  async loadHistoricalData() {
    try {
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD']
      
      for (const symbol of symbols) {
        // Load price history for volatility and correlation calculations
        const priceData = await this.db.getOHLCVData(symbol, '1h', 500)
        if (priceData && priceData.length > 0) {
          this.priceHistory.set(symbol, priceData)
          
          // Calculate volatility
          const volatility = this.calculateVolatility(priceData)
          this.volatilityData.set(symbol, volatility)
        }
      }
      
      // Calculate correlation matrix
      this.updateCorrelationMatrix()
      
      this.logger.info('Historical data loaded for risk calculations')
    } catch (error) {
      this.logger.error('Error loading historical data:', error)
    }
  }

  startRiskMonitoring() {
    // Monitor risk every 30 seconds
    setInterval(() => {
      this.performRiskCheck()
    }, 30 * 1000)
    
    // Update correlations every 5 minutes
    setInterval(() => {
      this.updateCorrelationMatrix()
    }, 5 * 60 * 1000)
    
    // Daily risk reset at midnight
    setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyRisk()
      }
    }, 60 * 1000)
  }

  async performRiskCheck() {
    try {
      // Get current positions and account state
      const positions = await this.db.getActivePositions()
      const accountBalance = await this.db.getAccountBalance()
      
      if (!accountBalance) return
      
      // Update current risk state
      this.updateRiskState(positions, accountBalance)
      
      // Check all risk rules
      const violations = []
      
      // Check maximum positions
      if (positions.length > this.config.maxPositions) {
        violations.push({
          type: 'max_positions',
          severity: 'medium',
          message: `Too many positions: ${positions.length}/${this.config.maxPositions}`,
          value: positions.length,
          limit: this.config.maxPositions
        })
      }
      
      // Check daily loss limit
      if (this.currentRisk.dailyPnL < -this.config.maxDailyLoss * accountBalance.balance) {
        violations.push({
          type: 'daily_loss',
          severity: 'high',
          message: `Daily loss limit exceeded: ${(this.currentRisk.dailyPnL / accountBalance.balance * 100).toFixed(2)}%`,
          value: this.currentRisk.dailyPnL,
          limit: -this.config.maxDailyLoss * accountBalance.balance
        })
      }
      
      // Check maximum drawdown
      if (this.currentRisk.drawdown > this.config.maxDrawdown) {
        violations.push({
          type: 'max_drawdown',
          severity: 'critical',
          message: `Maximum drawdown exceeded: ${(this.currentRisk.drawdown * 100).toFixed(2)}%`,
          value: this.currentRisk.drawdown,
          limit: this.config.maxDrawdown
        })
      }
      
      // Check minimum equity
      if (accountBalance.equity < this.config.minEquity) {
        violations.push({
          type: 'min_equity',
          severity: 'critical',
          message: `Account equity below minimum: $${accountBalance.equity}`,
          value: accountBalance.equity,
          limit: this.config.minEquity
        })
      }
      
      // Check correlation limits
      const correlationViolations = this.checkCorrelationLimits(positions)
      violations.push(...correlationViolations)
      
      // Check volatility limits
      const volatilityViolations = this.checkVolatilityLimits(positions)
      violations.push(...volatilityViolations)
      
      // Check time-based rules
      const timeViolations = this.checkTimeBasedRules(positions)
      violations.push(...timeViolations)
      
      // Process violations
      for (const violation of violations) {
        await this.handleRiskViolation(violation)
      }
      
      this.currentRisk.violations = violations
      
    } catch (error) {
      this.logger.error('Error performing risk check:', error)
    }
  }

  updateRiskState(positions, accountBalance) {
    // Calculate total exposure
    this.currentRisk.totalExposure = positions.reduce((total, pos) => 
      total + Math.abs(pos.size * pos.entryPrice), 0
    )
    
    // Calculate daily P&L
    this.currentRisk.dailyPnL = positions.reduce((total, pos) => total + pos.pnl, 0)
    
    // Calculate current drawdown
    const peakEquity = accountBalance.peakEquity || accountBalance.balance
    this.currentRisk.drawdown = Math.max(0, (peakEquity - accountBalance.equity) / peakEquity)
    
    // Update position count
    this.currentRisk.openPositions = positions.length
  }

  checkCorrelationLimits(positions) {
    const violations = []
    
    // Group positions by currency pairs
    const currencyExposure = new Map()
    
    for (const position of positions) {
      const baseCurrency = position.symbol.substring(0, 3)
      const quoteCurrency = position.symbol.substring(3, 6)
      
      // Calculate exposure for each currency
      const exposure = position.size * position.entryPrice * (position.side === 'buy' ? 1 : -1)
      
      currencyExposure.set(baseCurrency, (currencyExposure.get(baseCurrency) || 0) + exposure)
      currencyExposure.set(quoteCurrency, (currencyExposure.get(quoteCurrency) || 0) - exposure)
    }
    
    // Check for excessive correlation
    for (const [symbol1, pos1] of positions.entries()) {
      for (const [symbol2, pos2] of positions.entries()) {
        if (symbol1 >= symbol2) continue
        
        const correlation = this.getCorrelation(pos1.symbol, pos2.symbol)
        
        if (Math.abs(correlation) > this.config.maxCorrelation) {
          violations.push({
            type: 'high_correlation',
            severity: 'medium',
            message: `High correlation between ${pos1.symbol} and ${pos2.symbol}: ${(correlation * 100).toFixed(1)}%`,
            value: correlation,
            limit: this.config.maxCorrelation,
            symbols: [pos1.symbol, pos2.symbol]
          })
        }
      }
    }
    
    return violations
  }

  checkVolatilityLimits(positions) {
    const violations = []
    
    for (const position of positions) {
      const volatility = this.volatilityData.get(position.symbol)
      
      if (volatility && volatility > this.config.maxVolatility) {
        violations.push({
          type: 'high_volatility',
          severity: 'medium',
          message: `High volatility for ${position.symbol}: ${(volatility * 100).toFixed(2)}%`,
          value: volatility,
          limit: this.config.maxVolatility,
          symbol: position.symbol
        })
      }
    }
    
    return violations
  }

  checkTimeBasedRules(positions) {
    const violations = []
    const now = Date.now()
    
    for (const position of positions) {
      // Check maximum holding period
      const holdingTime = now - position.timestamp
      if (holdingTime > this.config.maxHoldingPeriod) {
        violations.push({
          type: 'max_holding_period',
          severity: 'low',
          message: `Position held too long: ${position.symbol} for ${Math.round(holdingTime / (60 * 60 * 1000))} hours`,
          value: holdingTime,
          limit: this.config.maxHoldingPeriod,
          positionId: position.id
        })
      }
    }
    
    // Check weekend flattening
    if (this.config.weekendFlattening && this.isWeekend()) {
      if (positions.length > 0) {
        violations.push({
          type: 'weekend_positions',
          severity: 'medium',
          message: `Positions open during weekend: ${positions.length}`,
          value: positions.length,
          limit: 0
        })
      }
    }
    
    // Check news blackout periods
    for (const blackout of this.blackoutPeriods) {
      if (now >= blackout.start && now <= blackout.end) {
        violations.push({
          type: 'news_blackout',
          severity: 'medium',
          message: `Trading during news blackout: ${blackout.event}`,
          value: now,
          blackout
        })
      }
    }
    
    return violations
  }

  async handleRiskViolation(violation) {
    try {
      this.logger.warn(`Risk violation: ${violation.type} - ${violation.message}`)
      
      // Save violation to database
      await this.db.saveRiskViolation(violation)
      
      // Emit violation event
      this.emit('risk_violation', violation)
      
      // Take action based on severity
      switch (violation.severity) {
        case 'critical':
          this.emit('emergency_stop')
          break
        case 'high':
          // Close all positions or reduce exposure
          break
        case 'medium':
          // Reduce position sizes or stop new trades
          break
        case 'low':
          // Log only
          break
      }
    } catch (error) {
      this.logger.error('Error handling risk violation:', error)
    }
  }

  async validateSignal(signal) {
    try {
      // Get current account state
      const accountBalance = await this.db.getAccountBalance()
      const positions = await this.db.getActivePositions()
      
      if (!accountBalance) {
        return { approved: false, reason: 'No account balance data' }
      }
      
      // Check if trading is allowed
      if (!this.isTradingAllowed()) {
        return { approved: false, reason: 'Trading not allowed (weekend/news blackout)' }
      }
      
      // Check maximum positions
      if (positions.length >= this.config.maxPositions) {
        return { approved: false, reason: 'Maximum positions reached' }
      }
      
      // Check daily loss limit
      const dailyPnL = positions.reduce((total, pos) => total + pos.pnl, 0)
      if (dailyPnL < -this.config.maxDailyLoss * accountBalance.balance) {
        return { approved: false, reason: 'Daily loss limit exceeded' }
      }
      
      // Check minimum equity
      if (accountBalance.equity < this.config.minEquity) {
        return { approved: false, reason: 'Account equity below minimum' }
      }
      
      // Check correlation with existing positions
      const correlationCheck = this.checkSignalCorrelation(signal, positions)
      if (!correlationCheck.approved) {
        return correlationCheck
      }
      
      // Check volatility
      const volatility = this.volatilityData.get(signal.symbol)
      if (volatility && volatility > this.config.maxVolatility) {
        return { approved: false, reason: `High volatility: ${(volatility * 100).toFixed(2)}%` }
      }
      
      // Check signal confidence
      if (signal.confidence < 0.6) {
        return { approved: false, reason: `Low confidence: ${(signal.confidence * 100).toFixed(1)}%` }
      }
      
      return { approved: true, reason: 'Signal approved' }
    } catch (error) {
      this.logger.error('Error validating signal:', error)
      return { approved: false, reason: 'Validation error' }
    }
  }

  checkSignalCorrelation(signal, positions) {
    for (const position of positions) {
      const correlation = this.getCorrelation(signal.symbol, position.symbol)
      
      // Check if same direction trade would increase correlation risk
      if (Math.abs(correlation) > this.config.maxCorrelation && 
          signal.action === position.side) {
        return {
          approved: false,
          reason: `High correlation with existing position: ${position.symbol} (${(correlation * 100).toFixed(1)}%)`
        }
      }
    }
    
    return { approved: true }
  }

  async calculatePositionSize(signal) {
    try {
      const accountBalance = await this.db.getAccountBalance()
      if (!accountBalance) return 0
      
      // Base position size using Kelly criterion
      const kellySize = this.calculateKellySize(signal)
      
      // Apply risk limits
      const maxRiskSize = this.config.maxRiskPerTrade * accountBalance.equity
      const maxKellySize = this.config.maxKellySize * accountBalance.equity
      
      // Get volatility adjustment
      const volatility = this.volatilityData.get(signal.symbol) || 0.01
      const volAdjustment = this.config.volAdjustment ? 
        Math.min(1, 0.01 / volatility) : 1
      
      // Calculate final position size
      let positionSize = Math.min(kellySize, maxRiskSize, maxKellySize)
      positionSize *= volAdjustment
      
      // Apply confidence scaling
      positionSize *= signal.confidence
      
      // Minimum position size
      const minSize = 0.01
      positionSize = Math.max(minSize, positionSize)
      
      // Round to appropriate precision
      positionSize = Math.round(positionSize * 100) / 100
      
      this.logger.debug(`Position size calculated for ${signal.symbol}: ${positionSize}`)
      
      return positionSize
    } catch (error) {
      this.logger.error('Error calculating position size:', error)
      return 0
    }
  }

  calculateKellySize(signal) {
    // Simplified Kelly criterion calculation
    // In practice, this would use historical win rate and average win/loss
    
    const winRate = 0.6 // Assume 60% win rate
    const avgWin = 0.02 // 2% average win
    const avgLoss = 0.01 // 1% average loss
    
    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
    
    // Apply Kelly fraction limit
    const limitedKelly = Math.min(kellyFraction, this.config.kellyFraction)
    
    // Scale by signal confidence
    return limitedKelly * signal.confidence
  }

  async checkPosition(position) {
    try {
      const shouldClose = false
      let reason = ''
      
      // Check stop loss
      if (position.stopLoss) {
        const shouldHitStopLoss = (position.side === 'buy' && position.currentPrice <= position.stopLoss) ||
                                 (position.side === 'sell' && position.currentPrice >= position.stopLoss)
        
        if (shouldHitStopLoss) {
          return { shouldClose: true, reason: 'stop_loss' }
        }
      }
      
      // Check take profit
      if (position.takeProfit) {
        const shouldHitTakeProfit = (position.side === 'buy' && position.currentPrice >= position.takeProfit) ||
                                   (position.side === 'sell' && position.currentPrice <= position.takeProfit)
        
        if (shouldHitTakeProfit) {
          return { shouldClose: true, reason: 'take_profit' }
        }
      }
      
      // Check maximum holding period
      const holdingTime = Date.now() - position.timestamp
      if (holdingTime > this.config.maxHoldingPeriod) {
        return { shouldClose: true, reason: 'max_holding_period' }
      }
      
      // Check if position is in high volatility
      const volatility = this.volatilityData.get(position.symbol)
      if (volatility && volatility > this.config.maxVolatility * 2) {
        return { shouldClose: true, reason: 'extreme_volatility' }
      }
      
      // Check weekend flattening
      if (this.config.weekendFlattening && this.isWeekend()) {
        return { shouldClose: true, reason: 'weekend_flattening' }
      }
      
      return { shouldClose: false, reason: '' }
    } catch (error) {
      this.logger.error('Error checking position:', error)
      return { shouldClose: false, reason: 'check_error' }
    }
  }

  calculateVolatility(priceData) {
    if (priceData.length < 2) return 0
    
    const returns = []
    for (let i = 1; i < priceData.length; i++) {
      const return_ = (priceData[i][4] - priceData[i-1][4]) / priceData[i-1][4]
      returns.push(return_)
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance * 24) // Annualized daily volatility
  }

  updateCorrelationMatrix() {
    const symbols = Array.from(this.priceHistory.keys())
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i]
        const symbol2 = symbols[j]
        
        const correlation = this.calculateCorrelation(symbol1, symbol2)
        this.correlationMatrix.set(`${symbol1}_${symbol2}`, correlation)
      }
    }
  }

  calculateCorrelation(symbol1, symbol2) {
    const data1 = this.priceHistory.get(symbol1)
    const data2 = this.priceHistory.get(symbol2)
    
    if (!data1 || !data2 || data1.length < 20 || data2.length < 20) {
      return 0
    }
    
    // Calculate returns
    const returns1 = []
    const returns2 = []
    
    const minLength = Math.min(data1.length, data2.length)
    
    for (let i = 1; i < minLength; i++) {
      returns1.push((data1[i][4] - data1[i-1][4]) / data1[i-1][4])
      returns2.push((data2[i][4] - data2[i-1][4]) / data2[i-1][4])
    }
    
    // Calculate correlation coefficient
    const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length
    const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length
    
    let numerator = 0
    let sumSq1 = 0
    let sumSq2 = 0
    
    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - mean1
      const diff2 = returns2[i] - mean2
      
      numerator += diff1 * diff2
      sumSq1 += diff1 * diff1
      sumSq2 += diff2 * diff2
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2)
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  getCorrelation(symbol1, symbol2) {
    const key1 = `${symbol1}_${symbol2}`
    const key2 = `${symbol2}_${symbol1}`
    
    return this.correlationMatrix.get(key1) || this.correlationMatrix.get(key2) || 0
  }

  isTradingAllowed() {
    // Check weekend
    if (this.config.weekendFlattening && this.isWeekend()) {
      return false
    }
    
    // Check news blackout
    const now = Date.now()
    for (const blackout of this.blackoutPeriods) {
      if (now >= blackout.start && now <= blackout.end) {
        return false
      }
    }
    
    return true
  }

  isWeekend() {
    const now = new Date()
    const day = now.getUTCDay()
    const hour = now.getUTCHours()
    
    // Friday 22:00 UTC to Sunday 22:00 UTC
    return (day === 5 && hour >= 22) || day === 6 || (day === 0 && hour < 22)
  }

  addNewsEvent(newsEvent) {
    this.newsEvents.push(newsEvent)
    
    // Create blackout period if high impact
    if (newsEvent.impact === 'high') {
      const eventTime = new Date(newsEvent.timestamp).getTime()
      const blackoutStart = eventTime - this.config.newsBlackout
      const blackoutEnd = eventTime + this.config.newsBlackout
      
      this.blackoutPeriods.push({
        event: newsEvent.title,
        start: blackoutStart,
        end: blackoutEnd,
        currencies: newsEvent.currencies
      })
      
      // Clean up old blackout periods
      this.blackoutPeriods = this.blackoutPeriods.filter(bp => bp.end > Date.now())
    }
  }

  resetDailyRisk() {
    this.currentRisk.dailyPnL = 0
    this.currentRisk.violations = []
    this.logger.info('Daily risk metrics reset')
  }

  // Configuration methods
  async updateRiskConfiguration(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig }
      await this.db.saveRiskConfiguration(this.config)
      
      this.logger.info('Risk configuration updated')
      this.emit('config_updated', this.config)
      
      return true
    } catch (error) {
      this.logger.error('Error updating risk configuration:', error)
      throw error
    }
  }

  getRiskConfiguration() {
    return { ...this.config }
  }

  getCurrentRiskState() {
    return {
      ...this.currentRisk,
      correlations: Object.fromEntries(this.correlationMatrix),
      volatilities: Object.fromEntries(this.volatilityData),
      blackoutPeriods: this.blackoutPeriods.filter(bp => bp.end > Date.now())
    }
  }

  getRiskMetrics() {
    return {
      totalExposure: this.currentRisk.totalExposure,
      dailyPnL: this.currentRisk.dailyPnL,
      drawdown: this.currentRisk.drawdown,
      openPositions: this.currentRisk.openPositions,
      violations: this.currentRisk.violations.length,
      tradingAllowed: this.isTradingAllowed()
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('Cleaning up Risk Manager')
      
      // Save final risk state
      await this.db.saveRiskState(this.currentRisk)
      
      // Cleanup database
      if (this.db) {
        await this.db.cleanup()
      }
      
      this.isInitialized = false
      this.logger.info('Risk Manager cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}