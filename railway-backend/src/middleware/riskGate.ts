import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { config } from "../config";
import { riskService } from "../services/riskService";
import { logger } from "../logger";

export function riskGate(req: Request, res: Response, next: NextFunction) {
  const { symbol, qtyUsd, confidence } = req.body as {
    symbol: string;
    qtyUsd: number;
    confidence: number;
  };

  // Check drawdown breach
  if (config.trading.mode === "live" && riskService.isDrawdownBreached()) {
    logger.warn({
      event: "risk_gate_blocked",
      reason: "drawdown_breach",
      symbol,
      qtyUsd,
      confidence,
    });

    return res.status(423).json({
      error: "risk_locked",
      reason: "max_drawdown_breached",
      currentDrawdown: riskService.getState().rollingDrawdownPct,
      limit: config.trading.maxDrawdownPct,
    });
  }

  // Check confidence threshold
  if (confidence < config.trading.confidenceThreshold) {
    logger.warn({
      event: "risk_gate_blocked",
      reason: "low_confidence",
      symbol,
      qtyUsd,
      confidence,
      threshold: config.trading.confidenceThreshold,
    });

    return res.status(412).json({
      error: "low_confidence",
      min: config.trading.confidenceThreshold,
      got: confidence,
    });
  }

  // Check symbol caps
  if (!riskService.withinCaps(symbol, qtyUsd)) {
    logger.warn({
      event: "risk_gate_blocked",
      reason: "exceeds_cap",
      symbol,
      qtyUsd,
      cap: config.trading.perSymbolUsdCap,
    });

    return res.status(409).json({
      error: "exceeds_symbol_cap",
      capUsd: config.trading.perSymbolUsdCap,
      requested: qtyUsd,
    });
  }

  // Apply volatility targeting
  const realizedVol = 0.5; // TODO: wire real estimator
  const sized = riskService.sizeByVolTarget(qtyUsd, symbol, realizedVol);
  req.body.qtyUsd = sized;

  // Generate idempotency key if not provided
  if (!req.header("Idempotency-Key")) {
    const ik = crypto
      .createHash("sha256")
      .update(JSON.stringify(req.body))
      .digest("hex");
    (req as any).idempotencyKey = ik;
    res.setHeader("Idempotency-Key", ik);
  }

  logger.info({
    event: "risk_gate_passed",
    symbol,
    originalQty: qtyUsd,
    sizedQty: sized,
    confidence,
  });

  next();
}
