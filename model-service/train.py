# skeleton exporter: builds scaler/calibrators + random weights and flips models/current
import os, time, numpy as np, joblib, torch
from sklearn.preprocessing import StandardScaler
from sklearn.isotonic import IsotonicRegression
from rl_agent import DuelingLSTMDQN
FEATURES=["mom_5","mom_20","rv_5","rv_20","rsi_14","atr_14","spread_bps","imbalance_1m","hour_sin","hour_cos"]
def main():
    N=len(FEATURES); rng=np.random.default_rng(17)
    X=rng.normal(size=(10000,N)).astype(np.float32)
    scaler=StandardScaler().fit(X)
    net=DuelingLSTMDQN(n_features=N)
    s_long=(X[:,0]-X[:,2]); s_short=(X[:,1]-X[:,2])
    y_long=(X[:,0]>0).astype(float); y_short=(X[:,1]>0).astype(float)
    cal_long=IsotonicRegression(out_of_bounds="clip").fit(s_long,y_long)
    cal_short=IsotonicRegression(out_of_bounds="clip").fit(s_short,y_short)
    ver=time.strftime("%Y%m%d_%H%M"); out=f"models/{ver}"; os.makedirs(out,exist_ok=True)
    torch.save(net.state_dict(), f"{out}/weights.pth")
    joblib.dump(scaler,   f"{out}/scaler.pkl")
    joblib.dump(cal_long, f"{out}/cal_long.pkl")
    joblib.dump(cal_short,f"{out}/cal_short.pkl")
    with open(f"{out}/feature_order.txt","w") as f: f.write("\n".join(FEATURES))
    cur="models/current"; 
    try: os.remove(cur)
    except: pass
    os.symlink(ver, cur)  # relative symlink
    print("Exported:", out, " -> models/current")
if __name__=="__main__": main()
