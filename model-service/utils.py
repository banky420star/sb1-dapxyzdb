import os
import time
import joblib
import numpy as np
from typing import Dict, Any, Optional
from pathlib import Path

def model_version() -> str:
    """Get model version from environment or generate timestamp-based version."""
    return os.getenv("MODEL_VERSION", time.strftime("%Y%m%d_%H%M%S"))

def load_model(model_path: Optional[str] = None) -> Any:
    """Load the trained model from disk."""
    if model_path is None:
        model_path = os.getenv("MODEL_PATH", "./models/latest_model.pkl")
    
    model_file = Path(model_path)
    if not model_file.exists():
        print(f"Warning: Model file {model_path} not found, using fallback model")
        return None
    
    try:
        model = joblib.load(model_path)
        print(f"Loaded model from {model_path}")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

def preprocess_features(features: Dict[str, float]) -> np.ndarray:
    """Preprocess features for model inference."""
    # Define expected feature names (adjust based on your model)
    expected_features = [
        'mom_20', 'rv_5', 'rsi_14', 'bb_position', 'macd_signal',
        'volume_sma_ratio', 'price_sma_ratio', 'volatility_20'
    ]
    
    # Fill missing features with 0
    processed = []
    for feature in expected_features:
        processed.append(features.get(feature, 0.0))
    
    return np.array(processed).reshape(1, -1)

def calibrate_probabilities(raw_probs: np.ndarray, method: str = 'isotonic') -> np.ndarray:
    """Calibrate raw probabilities using various methods."""
    if method == 'isotonic':
        # Simple isotonic calibration (you can implement more sophisticated methods)
        return np.clip(raw_probs, 0.01, 0.99)
    elif method == 'sigmoid':
        # Sigmoid calibration
        return 1 / (1 + np.exp(-raw_probs))
    else:
        return raw_probs

def calculate_confidence(prob_long: float, prob_short: float) -> float:
    """Calculate confidence score based on probability distribution."""
    # Higher confidence when probabilities are more polarized
    max_prob = max(prob_long, prob_short)
    min_prob = min(prob_long, prob_short)
    
    # Confidence based on probability separation
    confidence = max_prob - min_prob
    
    # Boost confidence if max probability is high
    if max_prob > 0.7:
        confidence += 0.1
    
    return min(confidence, 1.0)
