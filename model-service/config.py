"""
Configuration for the FastAPI Model Service
"""

import os
from typing import Dict, Any
from pydantic import BaseModel, Field

class ModelServiceConfig(BaseModel):
    # Service configuration
    host: str = Field(default="0.0.0.0", env="MODEL_SERVICE_HOST")
    port: int = Field(default=8001, env="MODEL_SERVICE_PORT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Database configuration
    database_url: str = Field(default="postgresql://user:password@localhost/trading_db", env="DATABASE_URL")
    
    # Redis configuration
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    
    # Model storage
    models_dir: str = Field(default="models", env="MODELS_DIR")
    
    # Training configuration
    max_training_samples: int = Field(default=100000, env="MAX_TRAINING_SAMPLES")
    min_training_samples: int = Field(default=1000, env="MIN_TRAINING_SAMPLES")
    
    # Backtesting configuration
    default_initial_capital: float = Field(default=10000.0, env="DEFAULT_INITIAL_CAPITAL")
    default_transaction_cost: float = Field(default=0.001, env="DEFAULT_TRANSACTION_COST")
    default_slippage: float = Field(default=0.0001, env="DEFAULT_SLIPPAGE")
    
    # Walk-forward validation
    walk_forward_train_ratio: float = Field(default=0.7, env="WALK_FORWARD_TRAIN_RATIO")
    walk_forward_steps: int = Field(default=10, env="WALK_FORWARD_STEPS")
    
    # Model parameters
    default_model_params: Dict[str, Any] = Field(default={
        "random_forest": {
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 2,
            "min_samples_leaf": 1,
            "random_state": 42
        },
        "xgboost": {
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42
        }
    })
    
    # Feature engineering
    feature_lookback_periods: Dict[str, int] = Field(default={
        "returns": [1, 5, 10, 20],
        "volatility": [5, 10, 20],
        "rsi": [14, 21],
        "macd": [12, 26, 9],
        "bollinger": [20, 2]
    })
    
    # Risk management
    max_position_size: float = Field(default=0.1, env="MAX_POSITION_SIZE")  # 10% of capital
    stop_loss_threshold: float = Field(default=0.02, env="STOP_LOSS_THRESHOLD")  # 2%
    take_profit_threshold: float = Field(default=0.05, env="TAKE_PROFIT_THRESHOLD")  # 5%
    
    # Performance metrics
    benchmark_return: float = Field(default=0.08, env="BENCHMARK_RETURN")  # 8% annual
    risk_free_rate: float = Field(default=0.02, env="RISK_FREE_RATE")  # 2% annual
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # Monitoring
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=9090, env="METRICS_PORT")
    
    # Caching
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    max_cache_size: int = Field(default=1000, env="MAX_CACHE_SIZE")

# Global configuration instance
config = ModelServiceConfig()

def get_config() -> ModelServiceConfig:
    """Get the global configuration instance"""
    return config

def update_config(**kwargs) -> None:
    """Update configuration values"""
    global config
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)