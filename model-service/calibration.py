import joblib, numpy as np
from typing import Tuple
class BinaryCalibrator:
    def __init__(self, path_long:str, path_short:str):
        self.long_cal = joblib.load(path_long)
        self.short_cal= joblib.load(path_short)
    def calibrate(self, q:np.ndarray)->Tuple[float,float,float]:
        s_long = float(q[0] - max(q[1], q[2]))
        s_short= float(q[1] - max(q[0], q[2]))
        p_long = float(np.clip(self.long_cal.predict([s_long])[0], 0, 1))
        p_short= float(np.clip(self.short_cal.predict([s_short])[0],0, 1))
        p_flat = max(0.0, 1.0 - max(p_long, p_short))
        s = p_long+p_short+p_flat
        return p_long/s, p_short/s, p_flat/s
