import os
from collections import deque
def model_paths(base="models/current"):
    return (os.path.join(base,"weights.pth"),
            os.path.join(base,"scaler.pkl"),
            os.path.join(base,"cal_long.pkl"),
            os.path.join(base,"cal_short.pkl"),
            os.path.join(base,"feature_order.txt"))
def load_feature_order(path:str):
    with open(path) as f: return [ln.strip() for ln in f if ln.strip()]
def make_window_store(maxlen:int): return deque(maxlen=maxlen)
