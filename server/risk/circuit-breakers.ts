/**
 * Circuit Breakers - Hard limits and automatic trading halts
 * Implements DDL (Daily Drawdown Limit), kill switch, and position caps
 */

import { RiskEngine, RiskViolation } from './risk-engine.js';
import { RiskConfig } from '../../config/risk.js';

export interface CircuitBreakerState {
  isHalted: boolean;
  haltReason: string | null;
  haltTimestamp: number | null;
  lastCheck: number;
  violations: RiskViolation[];
}

export interface CircuitBreakerAction {
  action: 'halt' | 'reduce' | 'warn' | 'continue';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

export class CircuitBreakers {
  private riskEngine: RiskEngine;
  private config: RiskConfig;
  private state: CircuitBreakerState;
  private haltCallbacks: Array<(reason: string) => void> = [];
  private violationCallbacks: Array<(violation: RiskViolation) => void> = [];
  
  constructor(riskEngine: RiskEngine, config: RiskConfig) {
    this.riskEngine = riskEngine;
    this.config = config;
    this.state = {
      isHalted: false,
      haltReason: null,
      haltTimestamp: null,
      lastCheck: Date.now(),
      violations: []
    };
  }
  
  // Main circuit breaker check
  check(): CircuitBreakerAction {
    const now = Date.now();
    this.state.lastCheck = now;
    
    // Get all violations
    const violations = this.riskEngine.checkCircuitBreakers();
    this.state.violations = violations;
    
    // Process violations by severity
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');
    const mediumViolations = violations.filter(v => v.severity === 'medium');
    
    // Critical violations trigger immediate halt
    if (criticalViolations.length > 0) {
      return this.handleCriticalViolations(criticalViolations);
    }
    
    // High violations may trigger halt or reduction
    if (highViolations.length > 0) {
      return this.handleHighViolations(highViolations);
    }
    
    // Medium violations trigger warnings
    if (mediumViolations.length > 0) {
      return this.handleMediumViolations(mediumViolations);
    }
    
    // Check if we should resume from halt
    if (this.state.isHalted) {
      return this.checkResumeConditions();
    }
    
    // All good
    return {
      action: 'continue',
      message: 'All circuit breakers clear',
      severity: 'low',
      details: { violations: violations.length }
    };
  }
  
  // Handle critical violations
  private handleCriticalViolations(violations: RiskViolation[]): CircuitBreakerAction {
    const violation = violations[0]; // Use first critical violation
    
    if (!this.state.isHalted) {
      this.halt(violation.message);
    }
    
    return {
      action: 'halt',
      message: `CRITICAL: ${violation.message}`,
      severity: 'critical',
      details: {
        violation,
        haltReason: this.state.haltReason,
        haltTimestamp: this.state.haltTimestamp
      }
    };
  }
  
  // Handle high violations
  private handleHighViolations(violations: RiskViolation[]): CircuitBreakerAction {
    const violation = violations[0];
    
    // Check if this should trigger a halt
    if (this.shouldHaltForHighViolation(violation)) {
      if (!this.state.isHalted) {
        this.halt(`High severity violation: ${violation.message}`);
      }
      
      return {
        action: 'halt',
        message: `HIGH: ${violation.message}`,
        severity: 'high',
        details: { violation }
      };
    } else {
      // Reduce position sizes or trading frequency
      return {
        action: 'reduce',
        message: `HIGH: ${violation.message} - Reducing activity`,
        severity: 'high',
        details: { violation, action: 'reduce_positions' }
      };
    }
  }
  
  // Handle medium violations
  private handleMediumViolations(violations: RiskViolation[]): CircuitBreakerAction {
    const violation = violations[0];
    
    // Trigger callbacks for medium violations
    this.violationCallbacks.forEach(callback => callback(violation));
    
    return {
      action: 'warn',
      message: `MEDIUM: ${violation.message}`,
      severity: 'medium',
      details: { violation }
    };
  }
  
  // Check if we should resume from halt
  private checkResumeConditions(): CircuitBreakerAction {
    if (!this.state.isHalted) {
      return {
        action: 'continue',
        message: 'Not halted',
        severity: 'low',
        details: {}
      };
    }
    
    const now = Date.now();
    const haltDuration = now - (this.state.haltTimestamp || 0);
    
    // Check if halt duration has exceeded minimum (e.g., 1 hour)
    const minHaltDuration = 60 * 60 * 1000; // 1 hour
    
    if (haltDuration < minHaltDuration) {
      return {
        action: 'halt',
        message: `Still halted: ${this.state.haltReason}`,
        severity: 'high',
        details: {
          haltReason: this.state.haltReason,
          haltDuration,
          minHaltDuration
        }
      };
    }
    
    // Check if conditions have improved
    const currentViolations = this.riskEngine.checkCircuitBreakers();
    const criticalOrHigh = currentViolations.filter(v => 
      v.severity === 'critical' || v.severity === 'high'
    );
    
    if (criticalOrHigh.length === 0) {
      this.resume('Conditions improved');
      return {
        action: 'continue',
        message: 'Resumed - conditions improved',
        severity: 'low',
        details: { resumeReason: 'conditions_improved' }
      };
    }
    
    return {
      action: 'halt',
      message: `Still halted: ${this.state.haltReason} - conditions not improved`,
      severity: 'high',
      details: {
        haltReason: this.state.haltReason,
        remainingViolations: criticalOrHigh.length
      }
    };
  }
  
  // Determine if high violation should trigger halt
  private shouldHaltForHighViolation(violation: RiskViolation): boolean {
    switch (violation.type) {
      case 'drawdown':
        // Halt if drawdown exceeds 80% of daily limit
        return violation.value > this.config.maxDDDailyPct * 0.8;
      
      case 'exposure':
        // Halt if exposure exceeds 90% of limit
        return violation.value > this.config.maxExposureUSD * 0.9;
      
      case 'consecutive_losses':
        // Halt if we have too many consecutive losses
        return violation.value >= this.config.maxConsecutiveLosses;
      
      default:
        // Default to halt for high severity
        return true;
    }
  }
  
  // Halt trading
  halt(reason: string): void {
    this.state.isHalted = true;
    this.state.haltReason = reason;
    this.state.haltTimestamp = Date.now();
    
    // Trigger emergency stop in risk engine
    this.riskEngine.emergencyStop();
    
    // Call halt callbacks
    this.haltCallbacks.forEach(callback => callback(reason));
    
    console.error(`🚨 TRADING HALTED: ${reason}`);
  }
  
  // Resume trading
  resume(reason: string): void {
    this.state.isHalted = false;
    this.state.haltReason = null;
    this.state.haltTimestamp = null;
    
    // Resume in paper mode only
    this.riskEngine.resumeTrading();
    
    console.log(`✅ TRADING RESUMED: ${reason}`);
  }
  
  // Manual halt (kill switch)
  manualHalt(reason: string = 'Manual halt activated'): void {
    this.halt(reason);
  }
  
  // Manual resume (admin only)
  manualResume(reason: string = 'Manual resume'): void {
    this.resume(reason);
  }
  
  // Check if trading is currently halted
  isHalted(): boolean {
    return this.state.isHalted;
  }
  
  // Get current halt reason
  getHaltReason(): string | null {
    return this.state.haltReason;
  }
  
  // Get halt duration in milliseconds
  getHaltDuration(): number {
    if (!this.state.isHalted || !this.state.haltTimestamp) {
      return 0;
    }
    
    return Date.now() - this.state.haltTimestamp;
  }
  
  // Get current circuit breaker state
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
  
  // Get all current violations
  getViolations(): RiskViolation[] {
    return [...this.state.violations];
  }
  
  // Register callback for halt events
  onHalt(callback: (reason: string) => void): void {
    this.haltCallbacks.push(callback);
  }
  
  // Register callback for violation events
  onViolation(callback: (violation: RiskViolation) => void): void {
    this.violationCallbacks.push(callback);
  }
  
  // Remove halt callback
  offHalt(callback: (reason: string) => void): void {
    const index = this.haltCallbacks.indexOf(callback);
    if (index > -1) {
      this.haltCallbacks.splice(index, 1);
    }
  }
  
  // Remove violation callback
  offViolation(callback: (violation: RiskViolation) => void): void {
    const index = this.violationCallbacks.indexOf(callback);
    if (index > -1) {
      this.violationCallbacks.splice(index, 1);
    }
  }
  
  // Get circuit breaker status for monitoring
  getStatus(): any {
    return {
      isHalted: this.state.isHalted,
      haltReason: this.state.haltReason,
      haltTimestamp: this.state.haltTimestamp,
      haltDuration: this.getHaltDuration(),
      lastCheck: this.state.lastCheck,
      violationCount: this.state.violations.length,
      violations: this.state.violations.map(v => ({
        type: v.type,
        severity: v.severity,
        message: v.message,
        value: v.value,
        limit: v.limit
      }))
    };
  }
  
  // Reset circuit breaker state (use with caution)
  reset(): void {
    this.state = {
      isHalted: false,
      haltReason: null,
      haltTimestamp: null,
      lastCheck: Date.now(),
      violations: []
    };
    
    this.riskEngine.resumeTrading();
  }
  
  // Update configuration
  updateConfig(newConfig: RiskConfig): void {
    this.config = newConfig;
  }
  
  // Cleanup
  cleanup(): void {
    this.haltCallbacks = [];
    this.violationCallbacks = [];
    this.state = {
      isHalted: false,
      haltReason: null,
      haltTimestamp: null,
      lastCheck: Date.now(),
      violations: []
    };
  }
}