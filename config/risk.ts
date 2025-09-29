/**
 * Risk Configuration - Centralized risk management configuration
 * Treat it as law, not advice
 */

import { z } from "zod";

export const RiskConfigSchema = z.object({
  // Core risk parameters
  targetAnnVol: z.number().default(0.10), // 10% annualized volatility target
  maxDDDailyPct: z.number().default(0.025), // 2.5% daily drawdown limit
  maxPosUSD: z.number().default(5000), // Maximum position size in USD
  maxExposureUSD: z.number().default(15000), // Maximum total exposure in USD
  
  // Position sizing
  kellyFractionCap: z.number().default(0.25), // Keep Kelly fraction small, always
  stopLossPct: z.number().default(0.02), // 2% stop loss
  takeProfitPct: z.number().default(0.05), // 5% take profit
  confidenceThreshold: z.number().default(0.7), // Minimum confidence to trade
  
  // Trading mode
  tradingMode: z.enum(["paper", "live", "halt"]).default("paper"),
  
  // Circuit breakers
  emergencyStop: z.boolean().default(false),
  maxConsecutiveLosses: z.number().default(5), // Stop after 5 consecutive losses
  maxDailyTrades: z.number().default(50), // Maximum trades per day
  
  // Volatility targeting
  volTargeting: z.boolean().default(true),
  volLookback: z.number().default(20), // Days to look back for volatility
  volSmoothing: z.number().default(0.1), // Volatility smoothing factor
  
  // Risk budget allocation
  riskBudget: z.number().default(10000), // Total risk budget in USD
  maxRiskPerTrade: z.number().default(0.02), // 2% max risk per trade
  maxRiskPerSymbol: z.number().default(0.05), // 5% max risk per symbol
  
  // Slippage and fees
  assumedSlippage: z.number().default(0.0001), // 0.01% assumed slippage
  assumedFees: z.number().default(0.0007), // 0.07% assumed fees
  
  // Advanced risk controls
  varConfidence: z.number().default(0.95), // VaR confidence level
  varHorizon: z.number().default(1), // VaR horizon in days
  maxCorrelation: z.number().default(0.7), // Maximum correlation between positions
  
  // Notification thresholds
  warningDrawdown: z.number().default(0.015), // 1.5% warning drawdown
  alertDrawdown: z.number().default(0.020), // 2.0% alert drawdown
  
  // Time-based controls
  tradingHours: z.object({
    enabled: z.boolean().default(false),
    startHour: z.number().default(9), // UTC hour
    endHour: z.number().default(17), // UTC hour
    timezone: z.string().default("UTC")
  }),
  
  // Symbol-specific limits
  symbolLimits: z.record(z.object({
    maxPosUSD: z.number().optional(),
    maxRiskPct: z.number().optional(),
    enabled: z.boolean().default(true)
  })).default({})
});

export type RiskConfig = z.infer<typeof RiskConfigSchema>;

// Default configuration
export const defaultRiskConfig: RiskConfig = {
  targetAnnVol: 0.10,
  maxDDDailyPct: 0.025,
  maxPosUSD: 5000,
  maxExposureUSD: 15000,
  kellyFractionCap: 0.25,
  stopLossPct: 0.02,
  takeProfitPct: 0.05,
  confidenceThreshold: 0.7,
  tradingMode: "paper",
  emergencyStop: false,
  maxConsecutiveLosses: 5,
  maxDailyTrades: 50,
  volTargeting: true,
  volLookback: 20,
  volSmoothing: 0.1,
  riskBudget: 10000,
  maxRiskPerTrade: 0.02,
  maxRiskPerSymbol: 0.05,
  assumedSlippage: 0.0001,
  assumedFees: 0.0007,
  varConfidence: 0.95,
  varHorizon: 1,
  maxCorrelation: 0.7,
  warningDrawdown: 0.015,
  alertDrawdown: 0.020,
  tradingHours: {
    enabled: false,
    startHour: 9,
    endHour: 17,
    timezone: "UTC"
  },
  symbolLimits: {}
};

// Configuration loader with environment variable override
export function loadRiskConfig(): RiskConfig {
  const config = { ...defaultRiskConfig };
  
  // Override with environment variables
  if (process.env.TARGET_ANN_VOL) {
    config.targetAnnVol = parseFloat(process.env.TARGET_ANN_VOL);
  }
  
  if (process.env.MAX_DD_DAILY_PCT) {
    config.maxDDDailyPct = parseFloat(process.env.MAX_DD_DAILY_PCT);
  }
  
  if (process.env.MAX_POS_USD) {
    config.maxPosUSD = parseFloat(process.env.MAX_POS_USD);
  }
  
  if (process.env.MAX_EXPOSURE_USD) {
    config.maxExposureUSD = parseFloat(process.env.MAX_EXPOSURE_USD);
  }
  
  if (process.env.KELLY_FRACTION_CAP) {
    config.kellyFractionCap = parseFloat(process.env.KELLY_FRACTION_CAP);
  }
  
  if (process.env.STOP_LOSS_PCT) {
    config.stopLossPct = parseFloat(process.env.STOP_LOSS_PCT);
  }
  
  if (process.env.TAKE_PROFIT_PCT) {
    config.takeProfitPct = parseFloat(process.env.TAKE_PROFIT_PCT);
  }
  
  if (process.env.CONFIDENCE_THRESHOLD) {
    config.confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD);
  }
  
  if (process.env.TRADING_MODE) {
    config.tradingMode = process.env.TRADING_MODE as "paper" | "live" | "halt";
  }
  
  if (process.env.EMERGENCY_STOP) {
    config.emergencyStop = process.env.EMERGENCY_STOP === "true";
  }
  
  if (process.env.MAX_CONSECUTIVE_LOSSES) {
    config.maxConsecutiveLosses = parseInt(process.env.MAX_CONSECUTIVE_LOSSES);
  }
  
  if (process.env.MAX_DAILY_TRADES) {
    config.maxDailyTrades = parseInt(process.env.MAX_DAILY_TRADES);
  }
  
  if (process.env.VOL_TARGETING) {
    config.volTargeting = process.env.VOL_TARGETING === "true";
  }
  
  if (process.env.VOL_LOOKBACK) {
    config.volLookback = parseInt(process.env.VOL_LOOKBACK);
  }
  
  if (process.env.RISK_BUDGET) {
    config.riskBudget = parseFloat(process.env.RISK_BUDGET);
  }
  
  if (process.env.MAX_RISK_PER_TRADE) {
    config.maxRiskPerTrade = parseFloat(process.env.MAX_RISK_PER_TRADE);
  }
  
  if (process.env.MAX_RISK_PER_SYMBOL) {
    config.maxRiskPerSymbol = parseFloat(process.env.MAX_RISK_PER_SYMBOL);
  }
  
  // Validate configuration
  const validationResult = RiskConfigSchema.safeParse(config);
  if (!validationResult.success) {
    console.error('Risk configuration validation failed:', validationResult.error);
    throw new Error('Invalid risk configuration');
  }
  
  return validationResult.data;
}