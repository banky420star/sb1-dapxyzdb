/**
 * Position Sizer - Advanced position sizing with Kelly criterion and volatility targeting
 * Implements dynamic position sizing based on signal strength, confidence, and risk parameters
 */

import { RiskEngine, Position } from './risk-engine.js';
import { RiskConfig } from '../../config/risk.js';

export interface SizingContext {
  symbol: string;
  signal: number; // -1 to 1
  confidence: number; // 0 to 1
  currentPrice: number;
  expectedVolatility: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
  correlation?: number; // correlation with existing positions
}

export interface SizingResult {
  size: number;
  sizeUSD: number;
  riskAmount: number;
  riskPercent: number;
  kellyFraction: number;
  volatilityAdjustment: number;
  correlationAdjustment: number;
  confidenceAdjustment: number;
  finalSize: number;
  finalSizeUSD: number;
  warnings: string[];
  metadata: {
    maxSize: number;
    maxSizeUSD: number;
    stopLossDistance: number;
    takeProfitDistance: number;
    expectedReturn: number;
    riskRewardRatio: number;
  };
}

export class PositionSizer {
  private riskEngine: RiskEngine;
  private config: RiskConfig;
  private historicalReturns: Map<string, number[]> = new Map();
  
  constructor(riskEngine: RiskEngine, config: RiskConfig) {
    this.riskEngine = riskEngine;
    this.config = config;
  }
  
  // Main position sizing method
  calculateSize(context: SizingContext): SizingResult {
    const warnings: string[] = [];
    
    try {
      // Step 1: Calculate base Kelly fraction
      const kellyFraction = this.calculateKellyFraction(context);
      
      // Step 2: Apply confidence adjustment
      const confidenceAdjustment = this.calculateConfidenceAdjustment(context.confidence);
      
      // Step 3: Apply volatility targeting
      const volatilityAdjustment = this.calculateVolatilityAdjustment(
        context.expectedVolatility,
        this.config.targetAnnVol
      );
      
      // Step 4: Apply correlation adjustment
      const correlationAdjustment = this.calculateCorrelationAdjustment(context);
      
      // Step 5: Calculate final Kelly fraction
      const finalKellyFraction = Math.max(0, Math.min(
        kellyFraction * confidenceAdjustment * volatilityAdjustment * correlationAdjustment,
        this.config.kellyFractionCap
      ));
      
      // Step 6: Calculate position size
      const riskAmount = this.config.riskBudget * finalKellyFraction;
      const stopLossDistance = context.currentPrice * this.config.stopLossPct;
      const baseSize = riskAmount / stopLossDistance;
      
      // Step 7: Apply position limits
      const maxSizeUSD = this.getSymbolMaxSize(context.symbol);
      const maxSize = maxSizeUSD / context.currentPrice;
      const finalSize = Math.min(baseSize, maxSize);
      
      // Step 8: Calculate final metrics
      const finalSizeUSD = finalSize * context.currentPrice;
      const finalRiskAmount = finalSize * stopLossDistance;
      const riskPercent = (finalRiskAmount / this.config.riskBudget) * 100;
      
      // Step 9: Generate warnings
      this.generateWarnings(context, finalSize, baseSize, warnings);
      
      // Step 10: Calculate metadata
      const metadata = this.calculateMetadata(context, finalSize);
      
      return {
        size: finalSize,
        sizeUSD: finalSizeUSD,
        riskAmount: finalRiskAmount,
        riskPercent,
        kellyFraction,
        volatilityAdjustment,
        correlationAdjustment,
        confidenceAdjustment,
        finalSize,
        finalSizeUSD,
        warnings,
        metadata
      };
      
    } catch (error) {
      console.error('Error calculating position size:', error);
      return {
        size: 0,
        sizeUSD: 0,
        riskAmount: 0,
        riskPercent: 0,
        kellyFraction: 0,
        volatilityAdjustment: 1,
        correlationAdjustment: 1,
        confidenceAdjustment: 1,
        finalSize: 0,
        finalSizeUSD: 0,
        warnings: ['Calculation error'],
        metadata: {
          maxSize: 0,
          maxSizeUSD: 0,
          stopLossDistance: 0,
          takeProfitDistance: 0,
          expectedReturn: 0,
          riskRewardRatio: 0
        }
      };
    }
  }
  
  // Calculate Kelly fraction
  private calculateKellyFraction(context: SizingContext): number {
    // Use provided values or estimate from historical data
    const winRate = context.winRate ?? this.estimateWinRate(context.symbol);
    const avgWin = context.avgWin ?? this.estimateAvgWin(context.symbol);
    const avgLoss = context.avgLoss ?? this.estimateAvgLoss(context.symbol);
    
    if (avgLoss <= 0) {
      return 0; // Cannot calculate Kelly with zero or negative loss
    }
    
    // Kelly formula: f = (bp - q) / b
    // where b = avgWin/avgLoss, p = winRate, q = 1 - winRate
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - winRate;
    
    const kelly = (b * p - q) / b;
    
    // Apply signal strength adjustment
    const signalStrength = Math.abs(context.signal);
    const adjustedKelly = kelly * signalStrength;
    
    return Math.max(0, adjustedKelly);
  }
  
  // Calculate confidence adjustment
  private calculateConfidenceAdjustment(confidence: number): number {
    // Linear adjustment based on confidence
    // Confidence < 0.5 gets penalized, > 0.8 gets bonus
    if (confidence < 0.5) {
      return confidence * 0.5; // Heavy penalty for low confidence
    } else if (confidence > 0.8) {
      return 0.8 + (confidence - 0.8) * 0.5; // Bonus for high confidence
    } else {
      return confidence; // Linear scaling for medium confidence
    }
  }
  
  // Calculate volatility adjustment
  private calculateVolatilityAdjustment(expectedVol: number, targetVol: number): number {
    if (expectedVol <= 0 || targetVol <= 0) {
      return 1; // No adjustment if volatility is invalid
    }
    
    const volRatio = targetVol / expectedVol;
    
    // Cap the adjustment to prevent extreme sizing
    return Math.max(0.1, Math.min(2.0, volRatio));
  }
  
  // Calculate correlation adjustment
  private calculateCorrelationAdjustment(context: SizingContext): number {
    if (context.correlation === undefined) {
      return 1; // No adjustment if correlation not provided
    }
    
    const absCorrelation = Math.abs(context.correlation);
    
    // Reduce size for highly correlated positions
    if (absCorrelation > this.config.maxCorrelation) {
      return 0.5; // 50% reduction for high correlation
    } else if (absCorrelation > this.config.maxCorrelation * 0.7) {
      return 0.7; // 30% reduction for medium correlation
    }
    
    return 1; // No adjustment for low correlation
  }
  
  // Get maximum size for symbol
  private getSymbolMaxSize(symbol: string): number {
    const symbolLimits = this.config.symbolLimits[symbol];
    const maxPosUSD = symbolLimits?.maxPosUSD ?? this.config.maxPosUSD;
    
    // Check total exposure limit
    const currentExposure = this.riskEngine.getRiskMetrics().totalExposure;
    const remainingExposure = this.config.maxExposureUSD - currentExposure;
    
    return Math.min(maxPosUSD, remainingExposure);
  }
  
  // Generate warnings
  private generateWarnings(context: SizingContext, finalSize: number, baseSize: number, warnings: string[]): void {
    // Size reduction warning
    if (finalSize < baseSize * 0.5) {
      warnings.push('Position size significantly reduced due to limits');
    }
    
    // High volatility warning
    if (context.expectedVolatility > this.config.targetAnnVol * 2) {
      warnings.push('High volatility detected - consider reducing size');
    }
    
    // Low confidence warning
    if (context.confidence < 0.6) {
      warnings.push('Low confidence signal - consider waiting for better setup');
    }
    
    // High correlation warning
    if (context.correlation && Math.abs(context.correlation) > this.config.maxCorrelation) {
      warnings.push('High correlation with existing positions');
    }
    
    // Risk budget warning
    const riskAmount = finalSize * context.currentPrice * this.config.stopLossPct;
    const riskPercent = (riskAmount / this.config.riskBudget) * 100;
    
    if (riskPercent > this.config.maxRiskPerTrade * 100) {
      warnings.push('Position exceeds maximum risk per trade');
    }
  }
  
  // Calculate metadata
  private calculateMetadata(context: SizingContext, size: number): any {
    const maxSizeUSD = this.getSymbolMaxSize(context.symbol);
    const maxSize = maxSizeUSD / context.currentPrice;
    const stopLossDistance = context.currentPrice * this.config.stopLossPct;
    const takeProfitDistance = context.currentPrice * this.config.takeProfitPct;
    
    // Calculate expected return
    const winRate = context.winRate ?? this.estimateWinRate(context.symbol);
    const avgWin = context.avgWin ?? this.estimateAvgWin(context.symbol);
    const avgLoss = context.avgLoss ?? this.estimateAvgLoss(context.symbol);
    
    const expectedReturn = winRate * avgWin - (1 - winRate) * avgLoss;
    const riskRewardRatio = avgWin / avgLoss;
    
    return {
      maxSize,
      maxSizeUSD,
      stopLossDistance,
      takeProfitDistance,
      expectedReturn,
      riskRewardRatio
    };
  }
  
  // Estimate win rate from historical data
  private estimateWinRate(symbol: string): number {
    const returns = this.historicalReturns.get(symbol);
    if (!returns || returns.length < 10) {
      return 0.5; // Default 50% win rate
    }
    
    const wins = returns.filter(ret => ret > 0).length;
    return wins / returns.length;
  }
  
  // Estimate average win from historical data
  private estimateAvgWin(symbol: string): number {
    const returns = this.historicalReturns.get(symbol);
    if (!returns || returns.length < 10) {
      return 0.01; // Default 1% average win
    }
    
    const wins = returns.filter(ret => ret > 0);
    if (wins.length === 0) return 0.01;
    
    return wins.reduce((sum, win) => sum + win, 0) / wins.length;
  }
  
  // Estimate average loss from historical data
  private estimateAvgLoss(symbol: string): number {
    const returns = this.historicalReturns.get(symbol);
    if (!returns || returns.length < 10) {
      return 0.01; // Default 1% average loss
    }
    
    const losses = returns.filter(ret => ret < 0);
    if (losses.length === 0) return 0.01;
    
    return Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length);
  }
  
  // Update historical returns
  updateHistoricalReturns(symbol: string, returns: number[]): void {
    this.historicalReturns.set(symbol, [...returns]);
  }
  
  // Add a single return to history
  addReturn(symbol: string, returnValue: number): void {
    let returns = this.historicalReturns.get(symbol) || [];
    returns.push(returnValue);
    
    // Keep only recent returns (last 1000)
    if (returns.length > 1000) {
      returns = returns.slice(-1000);
    }
    
    this.historicalReturns.set(symbol, returns);
  }
  
  // Get historical returns for a symbol
  getHistoricalReturns(symbol: string): number[] {
    return this.historicalReturns.get(symbol) || [];
  }
  
  // Calculate portfolio-level position sizing
  calculatePortfolioSize(contexts: SizingContext[]): Map<string, SizingResult> {
    const results = new Map<string, SizingResult>();
    
    // Calculate individual sizes first
    for (const context of contexts) {
      const result = this.calculateSize(context);
      results.set(context.symbol, result);
    }
    
    // Apply portfolio-level adjustments
    this.applyPortfolioAdjustments(results);
    
    return results;
  }
  
  // Apply portfolio-level adjustments
  private applyPortfolioAdjustments(results: Map<string, SizingResult>): void {
    const totalRisk = Array.from(results.values()).reduce((sum, result) => sum + result.riskAmount, 0);
    const maxTotalRisk = this.config.riskBudget * 0.8; // 80% of risk budget
    
    if (totalRisk > maxTotalRisk) {
      // Scale down all positions proportionally
      const scaleFactor = maxTotalRisk / totalRisk;
      
      for (const [symbol, result] of results) {
        result.size *= scaleFactor;
        result.sizeUSD *= scaleFactor;
        result.riskAmount *= scaleFactor;
        result.riskPercent *= scaleFactor;
        result.warnings.push('Scaled down due to portfolio risk limit');
      }
    }
  }
  
  // Cleanup
  cleanup(): void {
    this.historicalReturns.clear();
  }
}