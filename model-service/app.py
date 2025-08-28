from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
import numpy as np
import time
import logging

from utils import model_version, load_model, preprocess_features, calibrate_probabilities, calculate_confidence

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RL Model Service", 
    version="1.0.0",
    description="Reinforcement Learning Trading Model Service"
)

# Global model instance
model = None

class PredictIn(BaseModel):
    symbol: str
    features: Dict[str, float] = Field(default_factory=dict)
    timestamp: Optional[int] = None
    model_version: Optional[str] = None

class PredictOut(BaseModel):
    signal: str  # long|short|flat
    prob_long: float
    prob_short: float
    confidence: float
    model_version: str
    explain: Optional[Dict[str, any]] = None

class HealthOut(BaseModel):
    ok: bool
    model_version: str
    model_loaded: bool
    uptime: float

# Startup event
@app.on_event("startup")
async def startup_event():
    global model
    logger.info("Starting RL Model Service...")
    model = load_model()
    logger.info(f"Model service started with version: {model_version()}")

def fake_model(features: Dict[str, float]) -> tuple:
    """Fallback model when trained model is not available."""
    # Simple momentum-based model
    mom_20 = features.get("mom_20", 0.0)
    rv_5 = features.get("rv_5", 0.0)
    rsi_14 = features.get("rsi_14", 50.0)
    
    # Calculate score based on features
    score = (mom_20 * 0.4) - (rv_5 * 0.3) + ((rsi_14 - 50) / 50 * 0.3)
    
    # Convert to probabilities
    import math
    prob_long = 1 / (1 + math.exp(-score * 2))
    prob_short = 1 - prob_long
    
    # Determine signal
    if prob_long > 0.55:
        signal = "long"
    elif prob_short > 0.55:
        signal = "short"
    else:
        signal = "flat"
    
    # Calculate confidence
    conf = calculate_confidence(prob_long, prob_short)
    
    return signal, prob_long, prob_short, conf

def predict_with_model(features: Dict[str, float]) -> tuple:
    """Make prediction using the loaded model."""
    if model is None:
        logger.warning("No model loaded, using fallback model")
        return fake_model(features)
    
    try:
        # Preprocess features
        X = preprocess_features(features)
        
        # Make prediction
        if hasattr(model, 'predict_proba'):
            # For sklearn models
            probs = model.predict_proba(X)[0]
            if len(probs) == 2:
                prob_long, prob_short = probs[1], probs[0]
            else:
                prob_long, prob_short = probs[0], 1 - probs[0]
        elif hasattr(model, 'predict'):
            # For other models
            prediction = model.predict(X)[0]
            if prediction > 0:
                prob_long, prob_short = 0.7, 0.3
            else:
                prob_long, prob_short = 0.3, 0.7
        else:
            # Fallback
            return fake_model(features)
        
        # Calibrate probabilities
        prob_long = calibrate_probabilities(np.array([prob_long]))[0]
        prob_short = 1 - prob_long
        
        # Determine signal
        if prob_long > 0.55:
            signal = "long"
        elif prob_short > 0.55:
            signal = "short"
        else:
            signal = "flat"
        
        # Calculate confidence
        conf = calculate_confidence(prob_long, prob_short)
        
        return signal, prob_long, prob_short, conf
        
    except Exception as e:
        logger.error(f"Error in model prediction: {e}")
        return fake_model(features)

@app.get("/health", response_model=HealthOut)
def health():
    """Health check endpoint."""
    return {
        "ok": True,
        "model_version": model_version(),
        "model_loaded": model is not None,
        "uptime": time.time() - app.start_time if hasattr(app, 'start_time') else 0
    }

@app.post("/predict", response_model=PredictOut)
def predict(p: PredictIn):
    """Main prediction endpoint."""
    try:
        # Validate input
        if not p.symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        
        # Make prediction
        signal, prob_long, prob_short, conf = predict_with_model(p.features)
        
        # Create explanation
        explain = {
            "regime": "momentum" if abs(p.features.get("mom_20", 0)) > 0.1 else "mean_reversion",
            "drivers": [k for k, v in p.features.items() if abs(v) > 0.1],
            "feature_importance": {k: abs(v) for k, v in p.features.items()}
        }
        
        return PredictOut(
            signal=signal,
            prob_long=prob_long,
            prob_short=prob_short,
            confidence=conf,
            model_version=model_version(),
            explain=explain
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
def model_info():
    """Get model information."""
    return {
        "version": model_version(),
        "loaded": model is not None,
        "type": type(model).__name__ if model else "fallback",
        "features": [
            'mom_20', 'rv_5', 'rsi_14', 'bb_position', 'macd_signal',
            'volume_sma_ratio', 'price_sma_ratio', 'volatility_20'
        ]
    }

@app.post("/model/reload")
def reload_model():
    """Reload the model from disk."""
    global model
    try:
        model = load_model()
        return {"ok": True, "message": "Model reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
