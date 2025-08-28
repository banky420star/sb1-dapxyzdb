import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { modelService } from "../services/modelService";
import { config } from "../config";
import { logger } from "../logger";

const router = Router();

const ConsensusIn = z.object({
  body: z.object({
    symbol: z.string(),
    features: z.record(z.number()).default({}),
    timestamp: z.number().optional(),
  }),
});

router.post("/ai/consensus", validate(ConsensusIn), async (req, res) => {
  try {
    const { symbol, features, timestamp } = (req as any).validated.body;

    logger.info({
      event: "consensus_request",
      symbol,
      features: Object.keys(features),
      timestamp,
    });

    // Get prediction from model service
    const prediction = await modelService.predict({
      symbol,
      features,
      timestamp,
    });

    // Determine if trade should be allowed
    const allow =
      prediction.confidence >= config.trading.confidenceThreshold &&
      prediction.signal !== "flat";

    const response = {
      ...prediction,
      allow,
      threshold: config.trading.confidenceThreshold,
      timestamp: new Date().toISOString(),
    };

    logger.info({
      event: "consensus_response",
      symbol,
      signal: prediction.signal,
      confidence: prediction.confidence,
      allow,
      model_version: prediction.model_version,
    });

    res.json(response);
  } catch (error) {
    logger.error({
      event: "consensus_failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(503).json({
      error: "model_service_unavailable",
      message: "Unable to get consensus from model service",
    });
  }
});

export default router;
