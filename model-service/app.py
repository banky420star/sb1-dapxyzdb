from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional
import os, numpy as np
from utils import model_version
from rl_agent import RLModel, ACTIONS
from features import FeaturePipe
from calibration import BinaryCalibrator
from registry import model_paths, load_feature_order, make_window_store
app = FastAPI(title="RL Model Service", version="1.0.0")
WEIGHTS, SCALER, CAL_LONG, CAL_SHORT, FEAT_PATH = model_paths()
FEATURE_ORDER = load_feature_order(FEAT_PATH)
N_FEATURES = len(FEATURE_ORDER)
WINDOW = int(os.getenv("MODEL_WINDOW","32"))
MODEL = RLModel(n_features=N_FEATURES, device=os.getenv("MODEL_DEVICE","cpu"))
MODEL.load_weights(WEIGHTS)
PIPE = FeaturePipe(FEATURE_ORDER, SCALER)
CAL  = BinaryCalibrator(CAL_LONG, CAL_SHORT)
WINDOW_STORE = make_window_store(WINDOW)
class PredictIn(BaseModel):
    symbol: str
    features: Dict[str,float] = Field(default_factory=dict)
    timestamp: Optional[int] = None
class PredictOut(BaseModel):
    signal: str
    prob_long: float
    prob_short: float
    confidence: float
    model_version: str
@app.get("/health")
def health(): return {"ok": True, "model_version": model_version(), "window_len": len(WINDOW_STORE)}
@app.post("/predict", response_model=PredictOut)
def predict(p: PredictIn):
    try:
        Xs = PIPE.make_window(p.features, WINDOW_STORE)
        if Xs.shape[0] < 4:
            return PredictOut(signal="flat", prob_long=0.33, prob_short=0.33, confidence=0.34, model_version=model_version())
        q = MODEL.q_values(Xs)
        pl, ps, pf = CAL.calibrate(q)
        probs = np.array([pl, ps, pf], dtype=float)
        idx = int(probs.argmax())
        return PredictOut(signal=ACTIONS[idx], prob_long=float(pl), prob_short=float(ps), confidence=float(probs.max()), model_version=model_version())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
