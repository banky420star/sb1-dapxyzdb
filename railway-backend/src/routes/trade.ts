import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { riskGate } from "../middleware/riskGate";
import { config } from "../config";
import { logger } from "../logger";

const router = Router();

const ExecIn = z.object({
  body: z.object({
    symbol: z.string(),
    side: z.enum(["buy", "sell"]),
    qtyUsd: z.number().positive(),
    confidence: z.number().min(0).max(1),
    slPct: z.number().positive().max(0.2).default(0.01),
    tpPct: z.number().positive().max(0.5).default(0.02),
  }),
});

router.post("/trade/execute", validate(ExecIn), riskGate, async (req, res) => {
  try {
    const { symbol, side, qtyUsd, confidence, slPct, tpPct } = (req as any).validated.body;
    const idempotencyKey = (req as any).idempotencyKey;

    logger.info({
      event: "trade_execution_request",
      symbol,
      side,
      qtyUsd,
      confidence,
      slPct,
      tpPct,
      idempotencyKey,
      tradingMode: config.trading.mode,
    });

    // TODO: Wire Bybit execution in future
    // For now, return dry-run response
    const order = {
      symbol,
      side,
      qtyUsd,
      confidence,
      slPct,
      tpPct,
      idempotencyKey,
      timestamp: new Date().toISOString(),
    };

    const response = {
      ok: true,
      dryRun: config.trading.mode === "paper",
      order,
      message: config.trading.mode === "paper" 
        ? "Paper trading mode - order simulated" 
        : "Live trading not yet implemented",
    };

    logger.info({
      event: "trade_execution_response",
      symbol,
      side,
      qtyUsd,
      dryRun: response.dryRun,
      idempotencyKey,
    });

    res.json(response);
  } catch (error) {
    logger.error({
      event: "trade_execution_failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "trade_execution_failed",
      message: "Failed to execute trade",
    });
  }
});

// Get trading status
router.get("/trade/status", (_req, res) => {
  const status = {
    tradingMode: config.trading.mode,
    confidenceThreshold: config.trading.confidenceThreshold,
    maxDrawdown: config.trading.maxDrawdownPct,
    perSymbolCap: config.trading.perSymbolUsdCap,
    timestamp: new Date().toISOString(),
  };

  res.json(status);
});

export default router;
