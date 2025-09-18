import torch, torch.nn as nn, numpy as np
from typing import Tuple
ACTIONS = ["long","short","flat"]
class DuelingLSTMDQN(nn.Module):
    def __init__(self, n_features:int, hidden:int=64):
        super().__init__()
        self.lstm = nn.LSTM(input_size=n_features, hidden_size=hidden, num_layers=1, batch_first=True)
        self.adv  = nn.Sequential(nn.Linear(hidden,64), nn.ReLU(), nn.Linear(64,3))
        self.val  = nn.Sequential(nn.Linear(hidden,64), nn.ReLU(), nn.Linear(64,1))
    def forward(self, x):
        h,_ = self.lstm(x); h = h[:,-1,:]
        adv = self.adv(h);  val = self.val(h)
        return val + adv - adv.mean(dim=1, keepdim=True)
class RLModel:
    def __init__(self, n_features:int, device:str="cpu"):
        self.device = torch.device(device)
        self.net = DuelingLSTMDQN(n_features).to(self.device)
        self.net.eval()
    def load_weights(self, path:str):
        self.net.load_state_dict(torch.load(path, map_location=self.device))
    @torch.no_grad()
    def q_values(self, feat_seq:np.ndarray)->np.ndarray:
        import torch as t
        x = t.tensor(feat_seq, dtype=t.float32, device=self.device).unsqueeze(0)
        return self.net(x).squeeze(0).cpu().numpy()
