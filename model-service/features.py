import numpy as np, joblib
from typing import Dict
class FeaturePipe:
    def __init__(self, feature_order, scaler_path:str):
        self.feature_order = feature_order
        self.scaler = joblib.load(scaler_path)
    def make_window(self, features_live:Dict[str,float], window_store):
        row = np.array([float(features_live.get(k,0.0)) for k in self.feature_order], dtype=np.float32)
        window_store.append(row)
        X = np.stack(window_store, axis=0)
        return self.scaler.transform(X)
