import type { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
import { logger } from "../logger";

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });

    if (!parsed.success) {
      logger.warn({
        error: "validation_failed",
        details: parsed.error.flatten(),
        path: req.path,
        method: req.method,
      });

      return res.status(400).json({
        error: "bad_request",
        details: parsed.error.flatten(),
      });
    }

    // Attach validated data to request
    (req as any).validated = parsed.data;
    next();
  };
