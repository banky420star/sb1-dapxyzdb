import axios from "axios";
import { config } from "../config";
import { modelLogger } from "../logger";

export type PredictReq = {
  symbol: string;
  features: Record<string, number>;
  timestamp?: number;
};

export type PredictResp = {
  signal: "long" | "short" | "flat";
  prob_long: number;
  prob_short: number;
  confidence: number;
  model_version: string;
  explain?: {
    regime?: string;
    drivers?: string[];
    feature_importance?: Record<string, number>;
  };
};

class ModelService {
  private client = axios.create({
    baseURL: config.model.serviceUrl,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  /**
   * Get model service health
   */
  async health(): Promise<{ ok: boolean; model_version: string; model_loaded: boolean }> {
    try {
      const response = await this.client.get("/health");
      return response.data;
    } catch (error) {
      modelLogger.error({
        event: "health_check_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get prediction from model service
   */
  async predict(req: PredictReq): Promise<PredictResp> {
    try {
      modelLogger.info({
        event: "prediction_request",
        symbol: req.symbol,
        features: Object.keys(req.features),
        timestamp: req.timestamp,
      });

      const response = await this.client.post("/predict", req);
      const result = response.data as PredictResp;

      modelLogger.info({
        event: "prediction_response",
        symbol: req.symbol,
        signal: result.signal,
        confidence: result.confidence,
        model_version: result.model_version,
      });

      return result;
    } catch (error) {
      modelLogger.error({
        event: "prediction_failed",
        symbol: req.symbol,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<{
    version: string;
    loaded: boolean;
    type: string;
    features: string[];
  }> {
    try {
      const response = await this.client.get("/model/info");
      return response.data;
    } catch (error) {
      modelLogger.error({
        event: "model_info_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Reload model
   */
  async reloadModel(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await this.client.post("/model/reload");
      return response.data;
    } catch (error) {
      modelLogger.error({
        event: "model_reload_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export const modelService = new ModelService();
