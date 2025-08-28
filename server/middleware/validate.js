// middleware/validate.js
import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    if (!parsed.success) {
      return res.status(400).json({
        error: "bad_request",
        details: parsed.error.flatten(),
        message: "Request validation failed"
      });
    }
    
    // Assign validated data back to request
    Object.assign(req, parsed.data);
    next();
  } catch (error) {
    return res.status(500).json({
      error: "validation_error",
      message: "Validation middleware error"
    });
  }
};

// Common schemas for trading operations
export const schemas = {
  // Trade execution schema
  executeTrade: z.object({
    body: z.object({
      symbol: z.string().min(1, "Symbol is required"),
      side: z.enum(["buy", "sell"], {
        errorMap: () => ({ message: "Side must be 'buy' or 'sell'" })
      }),
      qty: z.number().positive("Quantity must be positive"),
      price: z.number().positive("Price must be positive").optional(),
      stopLoss: z.number().positive("Stop loss must be positive").optional(),
      takeProfit: z.number().positive("Take profit must be positive").optional(),
      idempotencyKey: z.string().optional()
    })
  }),

  // Risk configuration schema
  riskConfig: z.object({
    body: z.object({
      maxRiskPerTrade: z.number().min(0.001).max(0.1),
      maxDailyLoss: z.number().min(0.01).max(0.2),
      maxDrawdown: z.number().min(0.05).max(0.5),
      maxPositions: z.number().int().min(1).max(50)
    })
  }),

  // Model prediction schema
  modelPrediction: z.object({
    body: z.object({
      symbol: z.string().min(1),
      features: z.record(z.number()),
      modelVersion: z.string().optional()
    })
  }),

  // Autonomous trading config
  autonomousConfig: z.object({
    body: z.object({
      enabled: z.boolean(),
      tradingPairs: z.array(z.string()).min(1),
      maxPositionSize: z.number().positive(),
      riskLimit: z.number().min(0.001).max(0.1),
      dataInterval: z.number().int().min(1000).max(300000)
    })
  })
};