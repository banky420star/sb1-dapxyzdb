import { Logger } from '../utils/logger.js'

export class VaRCalculator {
  constructor(portfolio, confidenceLevel = 0.99) {
    this.portfolio = portfolio
    this.confidenceLevel = confidenceLevel
    this.logger = new Logger()
    
    // Historical data for VaR calculation
    this.historicalReturns = []
    this.varHistory = []
    
    // Stress test scenarios
    this.stressScenarios = {
      march2020: this._getMarch2020Returns(),
      ftx: this._getFTXReturns(),
      covid: this._getCovidReturns()
    }
  }
  
  calculateHistoricalVaR(returns, timeHorizon = 1) {
    if (!returns || returns.length === 0) {
      this.logger.warn('No returns data provided for VaR calculation')
      return 0
    }
    
    try {
      // Sort returns in ascending order
      const sortedReturns = [...returns].sort((a, b) => a - b)
      
      // Find VaR percentile
      const varIndex = Math.floor((1 - this.confidenceLevel) * sortedReturns.length)
      const varValue = sortedReturns[varIndex]
      
      // Apply time horizon scaling
      const scaledVaR = Math.abs(varValue) * Math.sqrt(timeHorizon)
      
      this.logger.info(`VaR calculated: ${scaledVaR.toFixed(4)} (${this.confidenceLevel * 100}% confidence)`)
      
      return scaledVaR
      
    } catch (error) {
      this.logger.error('Error calculating historical VaR:', error)
      return 0
    }
  }
  
  calculatePortfolioVaR() {
    try {
      // Calculate portfolio returns
      const portfolioReturns = this._calculatePortfolioReturns()
      
      if (portfolioReturns.length === 0) {
        this.logger.warn('No portfolio returns available for VaR calculation')
        return 0
      }
      
      // Calculate 99% 1-day VaR
      const var99 = this.calculateHistoricalVaR(portfolioReturns, 1)
      
      // Store VaR history for monitoring
      this.varHistory.push({
        timestamp: new Date().toISOString(),
        var99: var99,
        portfolioValue: this.portfolio.getTotalValue(),
        confidenceLevel: this.confidenceLevel
      })
      
      // Keep only last 1000 VaR calculations
      if (this.varHistory.length > 1000) {
        this.varHistory = this.varHistory.slice(-1000)
      }
      
      // Log VaR for monitoring
      this._logVaR(var99)
      
      return var99
      
    } catch (error) {
      this.logger.error('Error calculating portfolio VaR:', error)
      return 0
    }
  }
  
  _calculatePortfolioReturns() {
    const positions = this.portfolio.getPositions()
    const returns = []
    
    for (const position of positions) {
      if (position.historicalPrices && position.historicalPrices.length > 1) {
        const positionReturns = this._calculatePositionReturns(position.historicalPrices)
        returns.push(...positionReturns)
      }
    }
    
    return returns
  }
  
  _calculatePositionReturns(prices) {
    const returns = []
    
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1]
      returns.push(returnValue)
    }
    
    return returns
  }
  
  stressTest() {
    try {
      const results = {
        normal: this.calculatePortfolioVaR(),
        scenarios: {}
      }
      
      // March 2020 stress scenario (COVID crash)
      if (this.stressScenarios.march2020.length > 0) {
        results.scenarios.march2020 = this.calculateHistoricalVaR(
          this.stressScenarios.march2020, 1
        )
      }
      
      // FTX collapse stress scenario
      if (this.stressScenarios.ftx.length > 0) {
        results.scenarios.ftx = this.calculateHistoricalVaR(
          this.stressScenarios.ftx, 1
        )
      }
      
      // COVID-19 stress scenario
      if (this.stressScenarios.covid.length > 0) {
        results.scenarios.covid = this.calculateHistoricalVaR(
          this.stressScenarios.covid, 1
        )
      }
      
      this.logger.info('Stress test completed', results)
      
      return results
      
    } catch (error) {
      this.logger.error('Error in stress test:', error)
      return { normal: 0, scenarios: {} }
    }
  }
  
  _getMarch2020Returns() {
    // March 2020 COVID crash returns (simplified)
    return [
      -0.12, -0.08, -0.15, -0.10, -0.05, 0.03, -0.07, -0.09,
      -0.11, -0.06, 0.02, -0.04, -0.08, -0.13, -0.16, -0.14
    ]
  }
  
  _getFTXReturns() {
    // FTX collapse returns (simplified)
    return [
      -0.20, -0.25, -0.30, -0.35, -0.40, -0.45, -0.50, -0.55,
      -0.60, -0.65, -0.70, -0.75, -0.80, -0.85, -0.90, -0.95
    ]
  }
  
  _getCovidReturns() {
    // COVID-19 pandemic returns (simplified)
    return [
      -0.10, -0.15, -0.20, -0.25, -0.30, -0.35, -0.40, -0.45,
      -0.50, -0.55, -0.60, -0.65, -0.70, -0.75, -0.80, -0.85
    ]
  }
  
  _logVaR(var99) {
    const portfolioValue = this.portfolio.getTotalValue()
    const varAmount = var99 * portfolioValue
    
    this.logger.info(`Portfolio VaR: $${varAmount.toFixed(2)} (${(var99 * 100).toFixed(2)}%)`, {
      var99: var99,
      portfolioValue: portfolioValue,
      varAmount: varAmount,
      timestamp: new Date().toISOString()
    })
    
    // Alert if VaR exceeds threshold
    if (var99 > 0.05) { // 5% VaR threshold
      this.logger.warn(`VaR threshold exceeded: ${(var99 * 100).toFixed(2)}%`)
      
      // Emit alert for monitoring
      if (global.io) {
        global.io.emit('var_alert', {
          type: 'var_threshold_exceeded',
          var99: var99,
          portfolioValue: portfolioValue,
          varAmount: varAmount,
          timestamp: new Date().toISOString()
        })
      }
    }
  }
  
  // Get VaR history for monitoring
  getVaRHistory() {
    return this.varHistory
  }
  
  // Get current VaR status
  getVaRStatus() {
    const currentVaR = this.calculatePortfolioVaR()
    const stressTest = this.stressTest()
    
    return {
      currentVaR: currentVaR,
      portfolioValue: this.portfolio.getTotalValue(),
      varAmount: currentVaR * this.portfolio.getTotalValue(),
      stressTest: stressTest,
      history: this.varHistory.slice(-10) // Last 10 VaR calculations
    }
  }
} 