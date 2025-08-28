# model-service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import numpy as np
import joblib
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Trading Model Service",
    description="ML model service for trading predictions",
    version="1.0.0"
)

# Model configuration
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0.0")
MODEL_PATH = os.getenv("MODEL_PATH", "./models/ensemble_model.pkl")
CALIBRATION_PATH = os.getenv("CALIBRATION_PATH", "./models/calibration.pkl")

# Global model state
model = None
calibrator = None
model_loaded = False

# Pydantic models for request/response
class PredictionRequest(BaseModel):
    symbol: str
    features: Dict[str, float]
    model_version: Optional[str] = None

class PredictionResponse(BaseModel):
    symbol: str
    signal: int  # 1 for buy, -1 for sell, 0 for hold
    confidence: float
    model_version: str
    timestamp: str
    features_used: int
    calibration_applied: bool

class HealthResponse(BaseModel):
    status: str
    model_version: str
    model_loaded: bool
    timestamp: str
    uptime: float

# Confidence buckets for position sizing
CONFIDENCE_BUCKETS = {
    "high": (0.8, 1.0),
    "medium": (0.6, 0.8),
    "low": (0.4, 0.6),
    "very_low": (0.0, 0.4)
}

def load_model():
    """Load the trained model and calibrator"""
    global model, calibrator, model_loaded
    
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            logger.info(f"Model loaded from {MODEL_PATH}")
        else:
            # Create a mock model for development
            logger.warning("No model file found, using mock model")
            model = MockModel()
        
        if os.path.exists(CALIBRATION_PATH):
            calibrator = joblib.load(CALIBRATION_PATH)
            logger.info(f"Calibrator loaded from {CALIBRATION_PATH}")
        else:
            logger.warning("No calibrator found, using identity calibration")
            calibrator = IdentityCalibrator()
            
        model_loaded = True
        logger.info("Model service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model_loaded = False
        raise

class MockModel:
    """Mock model for development/testing"""
    def predict_proba(self, X):
        # Return random probabilities
        n_samples = len(X) if hasattr(X, '__len__') else 1
        probs = np.random.random((n_samples, 3))  # 3 classes: sell, hold, buy
        return probs / probs.sum(axis=1, keepdims=True)
    
    def predict(self, X):
        probs = self.predict_proba(X)
        return np.argmax(probs, axis=1) - 1  # Convert to -1, 0, 1

class IdentityCalibrator:
    """Identity calibrator (no calibration)"""
    def predict_proba(self, X):
        return X

def get_confidence_bucket(confidence: float) -> str:
    """Get confidence bucket for position sizing"""
    for bucket, (min_conf, max_conf) in CONFIDENCE_BUCKETS.items():
        if min_conf <= confidence < max_conf:
            return bucket
    return "very_low"

def decide_signal(probabilities: np.ndarray) -> tuple[int, float]:
    """Convert probabilities to trading signal and confidence"""
    # Assuming probabilities are [sell, hold, buy]
    sell_prob = probabilities[0]
    hold_prob = probabilities[1]
    buy_prob = probabilities[2]
    
    # Decision logic
    if buy_prob > 0.6:
        signal = 1  # Buy
        confidence = buy_prob
    elif sell_prob > 0.6:
        signal = -1  # Sell
        confidence = sell_prob
    else:
        signal = 0  # Hold
        confidence = hold_prob
    
    return signal, confidence

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    load_model()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        model_version=MODEL_VERSION,
        model_loaded=model_loaded,
        timestamp=datetime.utcnow().isoformat(),
        uptime=0.0  # You could track actual uptime here
    )

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Generate trading prediction"""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Extract features
        features = request.features
        feature_vector = np.array(list(features.values())).reshape(1, -1)
        
        # Get raw predictions
        raw_probs = model.predict_proba(feature_vector)[0]
        
        # Apply calibration if available
        if calibrator is not None:
            calibrated_probs = calibrator.predict_proba(raw_probs.reshape(1, -1))[0]
            calibration_applied = True
        else:
            calibrated_probs = raw_probs
            calibration_applied = False
        
        # Convert to signal and confidence
        signal, confidence = decide_signal(calibrated_probs)
        
        # Get confidence bucket
        confidence_bucket = get_confidence_bucket(confidence)
        
        # Log prediction
        logger.info(f"Prediction for {request.symbol}: signal={signal}, confidence={confidence:.3f}, bucket={confidence_bucket}")
        
        return PredictionResponse(
            symbol=request.symbol,
            signal=signal,
            confidence=confidence,
            model_version=MODEL_VERSION,
            timestamp=datetime.utcnow().isoformat(),
            features_used=len(features),
            calibration_applied=calibration_applied
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/model-info")
async def model_info():
    """Get model information"""
    return {
        "version": MODEL_VERSION,
        "loaded": model_loaded,
        "confidence_buckets": CONFIDENCE_BUCKETS,
        "features_expected": 20,  # Adjust based on your model
        "calibration_available": calibrator is not None
    }

@app.get("/confidence-buckets")
async def get_confidence_buckets():
    """Get confidence bucket definitions"""
    return {
        "buckets": CONFIDENCE_BUCKETS,
        "description": "Confidence buckets for position sizing"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)