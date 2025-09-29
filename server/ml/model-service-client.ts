/**
 * Model Service Client - Integration with Python FastAPI model service
 * Provides seamless integration between Node.js backend and Python ML service
 */

import axios, { AxiosInstance } from 'axios';

export interface ModelServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface PredictionRequest {
  symbol: string;
  features: Record<string, number>;
  timestamp?: Date;
}

export interface PredictionResponse {
  symbol: string;
  prediction: number;
  confidence: number;
  model_name: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface TrainingRequest {
  model_name: string;
  symbol: string;
  features: string[];
  target: string;
  start_date: string;
  end_date: string;
  parameters?: Record<string, any>;
}

export interface TrainingResponse {
  model_name: string;
  status: string;
  accuracy: number;
  training_time: number;
  timestamp: string;
  metrics: Record<string, number>;
}

export interface BacktestRequest {
  model_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital?: number;
  transaction_cost?: number;
  slippage?: number;
  parameters?: Record<string, any>;
}

export interface BacktestResponse {
  model_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  metrics: Record<string, number>;
  equity_curve: Array<{
    timestamp: string;
    equity: number;
    position: number;
    price: number;
  }>;
  trades: Array<{
    timestamp: string;
    type: string;
    price: number;
    quantity: number;
    pnl: number;
  }>;
}

export class ModelServiceClient {
  private client: AxiosInstance;
  private config: ModelServiceConfig;
  
  constructor(config: ModelServiceConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making request to model service: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`Model service response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 500 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Retry with exponential backoff
          const delay = Math.pow(2, originalRequest._retryCount || 0) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.client(originalRequest);
        }
        
        console.error('Model service error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Model service health check failed:', error);
      return false;
    }
  }
  
  // List available models
  async listModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      throw error;
    }
  }
  
  // Make prediction
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    try {
      const response = await this.client.post('/predict', {
        symbol: request.symbol,
        features: request.features,
        timestamp: request.timestamp?.toISOString()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error making prediction:', error);
      throw error;
    }
  }
  
  // Train model
  async trainModel(request: TrainingRequest): Promise<TrainingResponse> {
    try {
      const response = await this.client.post('/train', request);
      return response.data;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }
  
  // Run backtest
  async runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
    try {
      const response = await this.client.post('/backtest', request);
      return response.data;
    } catch (error) {
      console.error('Error running backtest:', error);
      throw error;
    }
  }
  
  // Batch predictions
  async batchPredict(requests: PredictionRequest[]): Promise<PredictionResponse[]> {
    try {
      const promises = requests.map(request => this.predict(request));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in batch prediction:', error);
      throw error;
    }
  }
  
  // Get model info
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const models = await this.listModels();
      return models.find(model => model.name === modelName);
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  }
  
  // Check if model exists for symbol
  async hasModelForSymbol(symbol: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.symbol === symbol);
    } catch (error) {
      console.error('Error checking model for symbol:', error);
      return false;
    }
  }
  
  // Train model with default parameters
  async trainDefaultModel(symbol: string, startDate: Date, endDate: Date): Promise<TrainingResponse> {
    const defaultFeatures = [
      'returns_1', 'returns_5', 'returns_10', 'returns_20',
      'volatility_5', 'volatility_20',
      'rsi_14', 'rsi_21',
      'macd', 'macd_signal',
      'volume_ratio', 'volume_trend'
    ];
    
    const request: TrainingRequest = {
      model_name: `default_${symbol}`,
      symbol: symbol,
      features: defaultFeatures,
      target: 'future_return',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      parameters: {
        n_estimators: 100,
        max_depth: 10,
        random_state: 42
      }
    };
    
    return this.trainModel(request);
  }
  
  // Run default backtest
  async runDefaultBacktest(symbol: string, startDate: Date, endDate: Date): Promise<BacktestResponse> {
    const request: BacktestRequest = {
      model_name: `default_${symbol}`,
      symbol: symbol,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      initial_capital: 10000,
      transaction_cost: 0.001,
      slippage: 0.0001
    };
    
    return this.runBacktest(request);
  }
  
  // Get service status
  async getStatus(): Promise<{
    healthy: boolean;
    models_loaded: number;
    service: string;
    timestamp: string;
  }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error getting service status:', error);
      throw error;
    }
  }
}

// Factory function
export function createModelServiceClient(config?: Partial<ModelServiceConfig>): ModelServiceClient {
  const defaultConfig: ModelServiceConfig = {
    baseUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:8001',
    timeout: 30000, // 30 seconds
    retries: 3
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  return new ModelServiceClient(finalConfig);
}