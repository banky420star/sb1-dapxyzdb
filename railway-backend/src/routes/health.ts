import { Router } from "express";
import { config } from "../config";
import { modelService } from "../services/modelService";
import { riskService } from "../services/riskService";
import { logger } from "../logger";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    // Check model service health
    let modelHealth = { ok: false, model_version: "unknown", model_loaded: false };
    try {
      modelHealth = await modelService.health();
    } catch (error) {
      logger.warn({
        event: "model_service_unreachable",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Get risk state
    const riskState = riskService.getState();

    const health = {
      ok: true,
      timestamp: new Date().toISOString(),
      env: config.server.env,
      commit: config.env.COMMIT_SHA ?? "dev",
      tradingMode: config.trading.mode,
      modelService: {
        url: config.model.serviceUrl,
        ...modelHealth,
      },
      risk: {
        drawdown: riskState.rollingDrawdownPct,
        maxDrawdown: config.trading.maxDrawdownPct,
        symbolCaps: Object.fromEntries(riskState.symbolCaps),
      },
      config: {
        confidenceThreshold: config.trading.confidenceThreshold,
        targetAnnVol: config.trading.targetAnnVol,
        perSymbolUsdCap: config.trading.perSymbolUsdCap,
      },
    };

    res.json(health);
  } catch (error) {
    logger.error({
      event: "health_check_failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      ok: false,
      error: "health_check_failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
