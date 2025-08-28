import { config } from "../config";
import { riskLogger } from "../logger";

// Risk state management
interface RiskState {
  rollingDrawdownPct: number;
  symbolCaps: Map<string, number>;
  lastUpdate: number;
}

class RiskService {
  private state: RiskState = {
    rollingDrawdownPct: 0,
    symbolCaps: new Map(),
    lastUpdate: Date.now(),
  };

  /**
   * Check if drawdown limit has been breached
   */
  isDrawdownBreached(): boolean {
    const breached = this.state.rollingDrawdownPct <= -Math.abs(config.trading.maxDrawdownPct);
    
    if (breached) {
      riskLogger.warn({
        event: "drawdown_breach",
        currentDrawdown: this.state.rollingDrawdownPct,
        limit: config.trading.maxDrawdownPct,
      });
    }
    
    return breached;
  }

  /**
   * Check if position size is within symbol caps
   */
  withinCaps(symbol: string, notionalUsd: number): boolean {
    const cap = this.state.symbolCaps.get(symbol) ?? config.trading.perSymbolUsdCap;
    const within = Math.abs(notionalUsd) <= cap;
    
    if (!within) {
      riskLogger.warn({
        event: "cap_exceeded",
        symbol,
        requested: notionalUsd,
        cap,
      });
    }
    
    return within;
  }

  /**
   * Calculate position size based on volatility targeting
   */
  sizeByVolTarget(notionalUsd: number, symbol: string, realizedVol = 0.5): number {
    const scale = Math.min(1, config.trading.targetAnnVol / Math.max(1e-6, realizedVol));
    const sized = notionalUsd * scale;
    
    riskLogger.info({
      event: "vol_target_sizing",
      symbol,
      originalSize: notionalUsd,
      sizedAmount: sized,
      realizedVol,
      targetVol: config.trading.targetAnnVol,
      scale,
    });
    
    return sized;
  }

  /**
   * Update drawdown tracking
   */
  updateDrawdown(pnlPctSincePeak: number): void {
    this.state.rollingDrawdownPct = pnlPctSincePeak;
    this.state.lastUpdate = Date.now();
    
    riskLogger.info({
      event: "drawdown_update",
      drawdown: pnlPctSincePeak,
      timestamp: this.state.lastUpdate,
    });
  }

  /**
   * Update symbol-specific caps
   */
  updateSymbolCap(symbol: string, cap: number): void {
    this.state.symbolCaps.set(symbol, cap);
    
    riskLogger.info({
      event: "cap_update",
      symbol,
      newCap: cap,
    });
  }

  /**
   * Get current risk state
   */
  getState(): RiskState {
    return { ...this.state };
  }

  /**
   * Reset risk state (for testing or emergency)
   */
  reset(): void {
    this.state = {
      rollingDrawdownPct: 0,
      symbolCaps: new Map(),
      lastUpdate: Date.now(),
    };
    
    riskLogger.warn({
      event: "risk_state_reset",
    });
  }
}

export const riskService = new RiskService();
