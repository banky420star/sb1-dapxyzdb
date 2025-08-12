/**
 * getConsensus(features)
 * Plug your real model calls here. For now: 3-model stub with deterministic logic hooks.
 */
export async function getConsensus(features = {}) {
  // TODO: call your real models here, e.g. via HTTP or local inference
  // Example placeholders using features:
  const baseConf = Number(process.env.CONFIDENCE_THRESHOLD || 0.7);

  // Model outputs – replace with real predictions
  const lstm = { signal: 'buy', confidence: 0.78 };
  const cnn  = { signal: 'buy', confidence: 0.74 };
  const xgb  = { signal: 'sell', confidence: 0.61 };

  const models = [lstm, cnn, xgb];
  const votes = models.reduce((acc, m) => { acc[m.signal] = (acc[m.signal]||0)+1; return acc; }, {});
  const finalSignal = (votes.buy||0) > (votes.sell||0) ? 'buy' : (votes.sell||0) > (votes.buy||0) ? 'sell' : 'hold';
  const avgConfidence = models.reduce((s, m) => s + m.confidence, 0) / models.length;
  const passes = ((votes.buy||0) >= 2 || (votes.sell||0) >= 2) && avgConfidence >= baseConf;

  return { passes, finalSignal, avgConfidence, models };
}

export async function getConsensusWithRisk(features = {}, riskParams = {}) {
  try {
    const consensus = await getConsensus(features);
    
    // Apply risk management rules
    const maxTradeSize = riskParams.maxTradeSizeBtc || Number(process.env.MAX_TRADE_SIZE_BTC) || 0.001;
    const stopLoss = riskParams.stopLossPct || Number(process.env.STOP_LOSS_PCT) || 0.02;
    const takeProfit = riskParams.takeProfitPct || Number(process.env.TAKE_PROFIT_PCT) || 0.05;
    
    // Calculate position size based on confidence
    const positionSize = consensus.passes ? 
      maxTradeSize * (consensus.avgConfidence / 0.8) : 0;
    
    const riskAdjustedConsensus = {
      ...consensus,
      riskParams: {
        positionSize: Math.round(positionSize * 1000000) / 1000000, // 6 decimal places
        stopLoss: stopLoss * 100, // Convert to percentage
        takeProfit: takeProfit * 100, // Convert to percentage
        maxTradeSize
      }
    };
    
    logger.info('Risk-adjusted consensus', riskAdjustedConsensus);
    
    return riskAdjustedConsensus;
    
  } catch (error) {
    logger.error('Risk-adjusted consensus failed', error);
    throw error;
  }
}

// Utility function to generate mock features for testing
export function generateMockFeatures() {
  return {
    volatility: Math.random(),
    trend: (Math.random() - 0.5) * 2, // -1 to 1
    volume: Math.random(),
    priceChange: (Math.random() - 0.5) * 0.1, // -5% to 5%
    rsi: Math.random() * 100, // 0 to 100
    macd: (Math.random() - 0.5) * 2, // -1 to 1
    momentum: (Math.random() - 0.5) * 2, // -1 to 1
    support: Math.random(),
    resistance: Math.random()
  };
} 