#!/usr/bin/env python3
"""
ML Training Worker - Continuously trains and updates models
"""
import os
import time
import json
import logging
import redis
import psycopg2
from datetime import datetime
from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ModelTrainingWorker:
    def __init__(self):
        self.redis_client = self._connect_redis()
        self.db_conn = self._connect_db()
        self.model_service_url = os.getenv('MODEL_SERVICE_URL', 'http://model-service:9000')
        self.training_interval = int(os.getenv('TRAINING_INTERVAL', 3600))  # 1 hour default
        
    def _connect_redis(self):
        """Connect to Redis"""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        return redis.from_url(redis_url)
        
    def _connect_db(self):
        """Connect to PostgreSQL"""
        db_url = os.getenv('DATABASE_URL', 'postgres://trading_app:secure_trading_pass_2024@localhost:5432/trading')
        return psycopg2.connect(db_url)
        
    def fetch_training_data(self) -> pd.DataFrame:
        """Fetch historical data for training"""
        try:
            query = """
            SELECT * FROM market_data 
            WHERE timestamp > NOW() - INTERVAL '30 days'
            ORDER BY timestamp DESC
            LIMIT 10000
            """
            with self.db_conn.cursor() as cursor:
                cursor.execute(query)
                columns = [desc[0] for desc in cursor.description]
                data = cursor.fetchall()
                if data:
                    return pd.DataFrame(data, columns=columns)
        except Exception as e:
            logger.error(f"Error fetching training data: {e}")
        
        # Return dummy data for demo
        logger.info("Using dummy training data")
        dates = pd.date_range(end=datetime.now(), periods=1000, freq='H')
        return pd.DataFrame({
            'timestamp': dates,
            'open': np.random.randn(1000) * 10 + 100,
            'high': np.random.randn(1000) * 10 + 105,
            'low': np.random.randn(1000) * 10 + 95,
            'close': np.random.randn(1000) * 10 + 100,
            'volume': np.random.randint(1000, 10000, 1000),
            'signal': np.random.choice([0, 1], 1000)
        })
        
    def prepare_features(self, df: pd.DataFrame) -> tuple:
        """Prepare features for training"""
        # Simple feature engineering
        df['returns'] = df['close'].pct_change()
        df['volatility'] = df['returns'].rolling(20).std()
        df['sma_20'] = df['close'].rolling(20).mean()
        df['sma_50'] = df['close'].rolling(50).mean()
        df['rsi'] = self.calculate_rsi(df['close'])
        
        # Drop NaN values
        df = df.dropna()
        
        # Features and target
        feature_cols = ['returns', 'volatility', 'sma_20', 'sma_50', 'rsi']
        X = df[feature_cols].values
        y = (df['returns'].shift(-1) > 0).astype(int).values[:-1]
        X = X[:-1]  # Align with target
        
        return X, y
        
    def calculate_rsi(self, prices, period=14):
        """Calculate RSI indicator"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
        
    def train_model(self, X, y) -> Dict[str, Any]:
        """Train a Random Forest model"""
        logger.info("Starting model training...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        
        logger.info(f"Model trained - Train accuracy: {train_score:.4f}, Test accuracy: {test_score:.4f}")
        
        # Save model
        model_path = f"/app/models/model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
        joblib.dump(model, model_path)
        
        return {
            'model_path': model_path,
            'train_score': train_score,
            'test_score': test_score,
            'timestamp': datetime.now().isoformat()
        }
        
    def publish_training_update(self, metrics: Dict[str, Any]):
        """Publish training updates to Redis for WebSocket broadcast"""
        try:
            # Publish to Redis channel
            self.redis_client.publish('training_updates', json.dumps({
                'type': 'model_training',
                'data': metrics
            }))
            
            # Store in Redis for persistence
            self.redis_client.hset('model_metrics', 'latest', json.dumps(metrics))
            
            # Notify model service
            requests.post(
                f"{self.model_service_url}/update",
                json={'model_path': metrics['model_path']}
            )
            
            logger.info("Training update published")
        except Exception as e:
            logger.error(f"Error publishing update: {e}")
            
    def run(self):
        """Main training loop"""
        logger.info("ML Training Worker started")
        
        while True:
            try:
                # Fetch data
                df = self.fetch_training_data()
                
                if df is not None and len(df) > 100:
                    # Prepare features
                    X, y = self.prepare_features(df)
                    
                    if len(X) > 100:
                        # Train model
                        metrics = self.train_model(X, y)
                        
                        # Publish updates
                        self.publish_training_update(metrics)
                    else:
                        logger.warning("Insufficient data for training")
                else:
                    logger.warning("No data available for training")
                    
            except Exception as e:
                logger.error(f"Training error: {e}")
                
            # Wait for next training cycle
            logger.info(f"Waiting {self.training_interval} seconds for next training cycle...")
            time.sleep(self.training_interval)

if __name__ == "__main__":
    worker = ModelTrainingWorker()
    worker.run()
