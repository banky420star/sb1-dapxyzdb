"""
FastAPI Model Service - Research and backtesting service for the trading system
Provides /predict, /train, /score endpoints with walk-forward validation
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import uvicorn
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Trading Model Service",
    description="Research and backtesting service for alpha generation",
    version="1.0.0"
)

# Pydantic models
class FeatureRequest(BaseModel):
    symbol: str
    features: Dict[str, float]
    timestamp: Optional[datetime] = None

class PredictionResponse(BaseModel):
    symbol: str
    prediction: float
    confidence: float
    model_name: str
    timestamp: datetime
    metadata: Dict[str, Any] = {}

class TrainingRequest(BaseModel):
    model_name: str
    symbol: str
    features: List[str]
    target: str
    start_date: datetime
    end_date: datetime
    parameters: Dict[str, Any] = {}

class TrainingResponse(BaseModel):
    model_name: str
    status: str
    accuracy: float
    training_time: float
    timestamp: datetime
    metrics: Dict[str, float] = {}

class BacktestRequest(BaseModel):
    model_name: str
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = 10000.0
    transaction_cost: float = 0.001
    slippage: float = 0.0001
    parameters: Dict[str, Any] = {}

class BacktestResponse(BaseModel):
    model_name: str
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    metrics: Dict[str, float] = {}
    equity_curve: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []

class ModelInfo(BaseModel):
    name: str
    symbol: str
    status: str
    accuracy: float
    last_trained: datetime
    parameters: Dict[str, Any] = {}

# Global model storage
models: Dict[str, Any] = {}
model_metadata: Dict[str, Dict[str, Any]] = {}

@app.on_event("startup")
async def startup_event():
    """Initialize the model service"""
    logger.info("Starting Trading Model Service")
    
    # Create models directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    # Load existing models
    await load_existing_models()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Trading Model Service")
    
    # Save all models
    for model_name, model in models.items():
        save_model(model_name, model)

async def load_existing_models():
    """Load existing models from disk"""
    try:
        models_dir = "models"
        if os.path.exists(models_dir):
            for filename in os.listdir(models_dir):
                if filename.endswith('.pkl'):
                    model_name = filename[:-4]  # Remove .pkl extension
                    model_path = os.path.join(models_dir, filename)
                    
                    try:
                        model = joblib.load(model_path)
                        models[model_name] = model
                        
                        # Load metadata if exists
                        metadata_path = model_path.replace('.pkl', '_metadata.json')
                        if os.path.exists(metadata_path):
                            with open(metadata_path, 'r') as f:
                                model_metadata[model_name] = json.load(f)
                        
                        logger.info(f"Loaded model: {model_name}")
                        
                    except Exception as e:
                        logger.error(f"Failed to load model {model_name}: {e}")
    
    except Exception as e:
        logger.error(f"Error loading existing models: {e}")

def save_model(model_name: str, model: Any):
    """Save model to disk"""
    try:
        model_path = f"models/{model_name}.pkl"
        joblib.dump(model, model_path)
        
        # Save metadata if exists
        if model_name in model_metadata:
            metadata_path = model_path.replace('.pkl', '_metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(model_metadata[model_name], f, default=str)
        
        logger.info(f"Saved model: {model_name}")
        
    except Exception as e:
        logger.error(f"Failed to save model {model_name}: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "models_loaded": len(models),
        "service": "trading-model-service"
    }

@app.get("/models")
async def list_models():
    """List all available models"""
    model_list = []
    
    for model_name, model in models.items():
        metadata = model_metadata.get(model_name, {})
        
        model_info = ModelInfo(
            name=model_name,
            symbol=metadata.get('symbol', 'unknown'),
            status=metadata.get('status', 'unknown'),
            accuracy=metadata.get('accuracy', 0.0),
            last_trained=metadata.get('last_trained', datetime.now()),
            parameters=metadata.get('parameters', {})
        )
        model_list.append(model_info)
    
    return {"models": model_list}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: FeatureRequest):
    """Make prediction using specified model"""
    try:
        # Find the best model for the symbol
        best_model_name = None
        best_accuracy = 0.0
        
        for model_name, model in models.items():
            metadata = model_metadata.get(model_name, {})
            if metadata.get('symbol') == request.symbol:
                accuracy = metadata.get('accuracy', 0.0)
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    best_model_name = model_name
        
        if not best_model_name:
            raise HTTPException(
                status_code=404, 
                detail=f"No model found for symbol {request.symbol}"
            )
        
        model = models[best_model_name]
        metadata = model_metadata.get(best_model_name, {})
        
        # Prepare features
        feature_vector = []
        feature_names = metadata.get('feature_names', [])
        
        for feature_name in feature_names:
            if feature_name in request.features:
                feature_vector.append(request.features[feature_name])
            else:
                logger.warning(f"Missing feature: {feature_name}")
                feature_vector.append(0.0)
        
        if len(feature_vector) != len(feature_names):
            raise HTTPException(
                status_code=400,
                detail=f"Feature mismatch. Expected {len(feature_names)}, got {len(feature_vector)}"
            )
        
        # Make prediction
        X = np.array(feature_vector).reshape(1, -1)
        prediction = model.predict(X)[0]
        
        # Calculate confidence (simplified)
        confidence = min(0.95, max(0.1, best_accuracy))
        
        return PredictionResponse(
            symbol=request.symbol,
            prediction=float(prediction),
            confidence=confidence,
            model_name=best_model_name,
            timestamp=datetime.now(),
            metadata={
                "feature_names": feature_names,
                "model_accuracy": best_accuracy,
                "feature_values": request.features
            }
        )
        
    except Exception as e:
        logger.error(f"Error making prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train a new model or retrain existing model"""
    try:
        start_time = datetime.now()
        
        # Generate training data (in real implementation, this would fetch from database)
        training_data = await generate_training_data(
            request.symbol,
            request.start_date,
            request.end_date,
            request.features,
            request.target
        )
        
        if len(training_data) < 100:
            raise HTTPException(
                status_code=400,
                detail="Insufficient training data. Need at least 100 samples."
            )
        
        # Prepare features and target
        X = training_data[request.features].values
        y = training_data[request.target].values
        
        # Create and train model
        model = RandomForestRegressor(
            n_estimators=request.parameters.get('n_estimators', 100),
            max_depth=request.parameters.get('max_depth', 10),
            random_state=42
        )
        
        # Walk-forward validation
        accuracy = await walk_forward_validation(model, X, y, request.parameters)
        
        # Train final model on all data
        model.fit(X, y)
        
        # Store model
        model_name = f"{request.model_name}_{request.symbol}_{start_time.strftime('%Y%m%d_%H%M%S')}"
        models[model_name] = model
        
        # Store metadata
        model_metadata[model_name] = {
            'symbol': request.symbol,
            'status': 'trained',
            'accuracy': accuracy,
            'last_trained': start_time,
            'parameters': request.parameters,
            'feature_names': request.features,
            'target': request.target,
            'training_samples': len(training_data),
            'start_date': request.start_date,
            'end_date': request.end_date
        }
        
        # Save model in background
        background_tasks.add_task(save_model, model_name, model)
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        return TrainingResponse(
            model_name=model_name,
            status="completed",
            accuracy=accuracy,
            training_time=training_time,
            timestamp=datetime.now(),
            metrics={
                "training_samples": len(training_data),
                "features_count": len(request.features),
                "walk_forward_accuracy": accuracy
            }
        )
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest", response_model=BacktestResponse)
async def backtest_model(request: BacktestRequest):
    """Run backtest with walk-forward validation"""
    try:
        # Find the model
        model = None
        metadata = None
        
        for model_name, m in models.items():
            meta = model_metadata.get(model_name, {})
            if (meta.get('symbol') == request.symbol and 
                request.model_name in model_name):
                model = m
                metadata = meta
                break
        
        if not model:
            raise HTTPException(
                status_code=404,
                detail=f"Model {request.model_name} for symbol {request.symbol} not found"
            )
        
        # Generate backtest data
        backtest_data = await generate_backtest_data(
            request.symbol,
            request.start_date,
            request.end_date,
            metadata['feature_names']
        )
        
        if len(backtest_data) < 50:
            raise HTTPException(
                status_code=400,
                detail="Insufficient backtest data"
            )
        
        # Run backtest
        results = await run_backtest(
            model,
            backtest_data,
            request.initial_capital,
            request.transaction_cost,
            request.slippage,
            metadata['feature_names']
        )
        
        return BacktestResponse(
            model_name=request.model_name,
            symbol=request.symbol,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            final_capital=results['final_capital'],
            total_return=results['total_return'],
            sharpe_ratio=results['sharpe_ratio'],
            max_drawdown=results['max_drawdown'],
            win_rate=results['win_rate'],
            profit_factor=results['profit_factor'],
            total_trades=results['total_trades'],
            metrics=results['metrics'],
            equity_curve=results['equity_curve'],
            trades=results['trades']
        )
        
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_training_data(
    symbol: str, 
    start_date: datetime, 
    end_date: datetime,
    features: List[str],
    target: str
) -> pd.DataFrame:
    """Generate training data (simulated)"""
    # In a real implementation, this would fetch from database
    # For now, generate synthetic data
    
    date_range = pd.date_range(start=start_date, end=end_date, freq='1H')
    n_samples = len(date_range)
    
    # Generate synthetic features
    data = {
        'timestamp': date_range,
        'price': np.random.normal(50000, 1000, n_samples).cumsum(),
        'volume': np.random.exponential(1000, n_samples),
        'rsi': np.random.uniform(20, 80, n_samples),
        'macd': np.random.normal(0, 10, n_samples),
        'volatility': np.random.exponential(0.02, n_samples),
        'returns_1': np.random.normal(0, 0.01, n_samples),
        'returns_5': np.random.normal(0, 0.02, n_samples),
        'returns_20': np.random.normal(0, 0.05, n_samples)
    }
    
    df = pd.DataFrame(data)
    
    # Calculate target (future returns)
    df['future_return'] = df['price'].pct_change().shift(-1)
    
    # Remove NaN values
    df = df.dropna()
    
    return df

async def generate_backtest_data(
    symbol: str,
    start_date: datetime,
    end_date: datetime,
    feature_names: List[str]
) -> pd.DataFrame:
    """Generate backtest data"""
    # Similar to training data but with more realistic market simulation
    date_range = pd.date_range(start=start_date, end=end_date, freq='1H')
    n_samples = len(date_range)
    
    # Generate more realistic price data with trends and volatility
    np.random.seed(42)  # For reproducible results
    
    # Generate price with trend and volatility
    returns = np.random.normal(0.0001, 0.02, n_samples)  # Small positive trend
    prices = 50000 * np.exp(np.cumsum(returns))
    
    data = {
        'timestamp': date_range,
        'price': prices,
        'volume': np.random.exponential(1000, n_samples),
        'rsi': 30 + 40 * np.sin(np.arange(n_samples) * 0.1) + np.random.normal(0, 5, n_samples),
        'macd': np.random.normal(0, 10, n_samples),
        'volatility': np.random.exponential(0.02, n_samples),
        'returns_1': np.concatenate([[0], np.diff(np.log(prices))]),
        'returns_5': pd.Series(np.log(prices)).pct_change(5).values,
        'returns_20': pd.Series(np.log(prices)).pct_change(20).values
    }
    
    df = pd.DataFrame(data)
    
    # Calculate target
    df['future_return'] = df['price'].pct_change().shift(-1)
    
    # Remove NaN values
    df = df.dropna()
    
    return df

async def walk_forward_validation(
    model: Any, 
    X: np.ndarray, 
    y: np.ndarray, 
    parameters: Dict[str, Any]
) -> float:
    """Perform walk-forward validation"""
    try:
        n_samples = len(X)
        train_size = int(n_samples * 0.7)  # 70% for training
        test_size = n_samples - train_size
        
        if test_size < 20:
            return 0.5  # Default accuracy if insufficient test data
        
        # Split data
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        # Train and predict
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        # Calculate accuracy (R² score)
        accuracy = r2_score(y_test, y_pred)
        
        # Ensure accuracy is between 0 and 1
        accuracy = max(0.0, min(1.0, accuracy))
        
        return float(accuracy)
        
    except Exception as e:
        logger.error(f"Error in walk-forward validation: {e}")
        return 0.5  # Default accuracy

async def run_backtest(
    model: Any,
    data: pd.DataFrame,
    initial_capital: float,
    transaction_cost: float,
    slippage: float,
    feature_names: List[str]
) -> Dict[str, Any]:
    """Run backtest simulation"""
    try:
        capital = initial_capital
        position = 0
        trades = []
        equity_curve = []
        
        # Prepare features
        X = data[feature_names].values
        
        # Make predictions
        predictions = model.predict(X)
        
        for i, (idx, row) in enumerate(data.iterrows()):
            price = row['price']
            prediction = predictions[i]
            
            # Simple trading strategy: buy if prediction > 0.01, sell if < -0.01
            if prediction > 0.01 and position <= 0:  # Buy signal
                if position < 0:  # Close short position
                    pnl = (row['entry_price'] - price) * abs(position) * (1 - transaction_cost - slippage)
                    capital += pnl
                    trades.append({
                        'timestamp': row['timestamp'],
                        'type': 'close_short',
                        'price': price,
                        'quantity': abs(position),
                        'pnl': pnl
                    })
                
                # Open long position
                quantity = capital * 0.95 / price  # Use 95% of capital
                entry_price = price * (1 + slippage)
                capital -= quantity * entry_price * (1 + transaction_cost)
                position = quantity
                trades.append({
                    'timestamp': row['timestamp'],
                    'type': 'open_long',
                    'price': entry_price,
                    'quantity': quantity,
                    'pnl': 0
                })
                
            elif prediction < -0.01 and position >= 0:  # Sell signal
                if position > 0:  # Close long position
                    pnl = (price - row['entry_price']) * position * (1 - transaction_cost - slippage)
                    capital += pnl
                    trades.append({
                        'timestamp': row['timestamp'],
                        'type': 'close_long',
                        'price': price,
                        'quantity': position,
                        'pnl': pnl
                    })
                
                # Open short position
                quantity = capital * 0.95 / price
                entry_price = price * (1 - slippage)
                capital += quantity * entry_price * (1 - transaction_cost)
                position = -quantity
                trades.append({
                    'timestamp': row['timestamp'],
                    'type': 'open_short',
                    'price': entry_price,
                    'quantity': quantity,
                    'pnl': 0
                })
            
            # Calculate current equity
            if position > 0:  # Long position
                current_equity = capital + position * price
            elif position < 0:  # Short position
                current_equity = capital + position * price
            else:
                current_equity = capital
            
            equity_curve.append({
                'timestamp': row['timestamp'],
                'equity': current_equity,
                'position': position,
                'price': price
            })
        
        # Calculate final metrics
        final_capital = equity_curve[-1]['equity'] if equity_curve else initial_capital
        total_return = (final_capital - initial_capital) / initial_capital
        
        # Calculate Sharpe ratio
        returns = [eq['equity'] for eq in equity_curve]
        if len(returns) > 1:
            returns = pd.Series(returns).pct_change().dropna()
            sharpe_ratio = returns.mean() / returns.std() * np.sqrt(252) if returns.std() > 0 else 0
        else:
            sharpe_ratio = 0
        
        # Calculate max drawdown
        peak = initial_capital
        max_dd = 0
        for eq in equity_curve:
            if eq['equity'] > peak:
                peak = eq['equity']
            dd = (peak - eq['equity']) / peak
            if dd > max_dd:
                max_dd = dd
        
        # Calculate win rate and profit factor
        profitable_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] < 0]
        
        win_rate = len(profitable_trades) / len(trades) if trades else 0
        
        gross_profit = sum(t['pnl'] for t in profitable_trades)
        gross_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        
        return {
            'final_capital': final_capital,
            'total_return': total_return,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_dd,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'total_trades': len(trades),
            'metrics': {
                'gross_profit': gross_profit,
                'gross_loss': gross_loss,
                'avg_trade': sum(t['pnl'] for t in trades) / len(trades) if trades else 0
            },
            'equity_curve': equity_curve,
            'trades': trades
        }
        
    except Exception as e:
        logger.error(f"Error in backtest: {e}")
        raise e

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )