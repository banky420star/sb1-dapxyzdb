# 🚀 Deploy AI Trading System to Oracle Cloud - Quick Start

## 🎯 Overview

Your AI Trading System is **100% ready** to deploy to Oracle Cloud Infrastructure (OCI). Everything is configured and optimized for OCI's free tier Arm-based instances.

---

## ⚡ Super Quick Start (5 Minutes)

### 1️⃣ Create OCI Free Tier Account
👉 [Click here to sign up](https://www.oracle.com/cloud/free/)

### 2️⃣ Create Compute Instance

**Settings:**
- **Shape**: VM.Standard.A1.Flex (Arm - Free Tier)
- **OCPUs**: 4
- **Memory**: 24 GB
- **Image**: Ubuntu 22.04
- **Boot Volume**: 100 GB

**Configure Security:**
- Allow ports: 22, 80, 443, 3000, 8000, 3001, 9090, 5555, 5556

### 3️⃣ Connect & Deploy

```bash
# SSH into your instance
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_PUBLIC_IP

# Run ONE command to deploy everything:
bash <(curl -s https://raw.githubusercontent.com/banky420star/sb1-dapxyzdb/main/deploy-oci.sh)
```

**That's it!** 🎉

---

## 🌐 Access Your System

After deployment:
- **Trading Dashboard**: http://YOUR_PUBLIC_IP:3000
- **API**: http://YOUR_PUBLIC_IP:8000
- **Monitoring**: http://YOUR_PUBLIC_IP:3001 (admin/admin123)

---

## 📁 What's Included

### Deployment Files Created:

| File | Purpose |
|------|---------|
| `ORACLE_CLOUD_DEPLOYMENT_GUIDE.md` | Complete deployment guide with all details |
| `OCI_DEPLOYMENT_SUMMARY.md` | Quick reference and troubleshooting |
| `deploy-oci.sh` | Automated deployment script |
| `oci-quick-start.sh` | Quick deployment alternative |
| `docker-compose.oci.yml` | OCI-optimized Docker configuration |
| `monitoring/prometheus.yml` | Monitoring configuration |

---

## 💰 Cost

**FREE** - Uses Oracle Cloud Free Tier:
- ✅ 4 OCPUs (Arm-based)
- ✅ 24 GB RAM
- ✅ 200 GB Storage
- ✅ 10 TB/month bandwidth

---

## 🔧 Quick Commands

```bash
# View logs
docker logs ai-trading-backend -f

# Restart services
cd ~/ai-trading-system && docker compose -f docker-compose.oci.yml restart

# Update API keys
nano ~/ai-trading-system/.env
docker compose -f docker-compose.oci.yml restart

# Check status
docker ps
curl http://localhost:8000/api/health
```

---

## 📚 Full Documentation

- **Complete Guide**: [ORACLE_CLOUD_DEPLOYMENT_GUIDE.md](./ORACLE_CLOUD_DEPLOYMENT_GUIDE.md)
- **Quick Summary**: [OCI_DEPLOYMENT_SUMMARY.md](./OCI_DEPLOYMENT_SUMMARY.md)
- **System Architecture**: [FULL_STACK_BREAKDOWN.md](./FULL_STACK_BREAKDOWN.md)

---

## 🆘 Need Help?

1. **Check logs**: `docker compose -f docker-compose.oci.yml logs`
2. **Verify services**: `docker ps`
3. **Test health**: `curl http://localhost:8000/api/health`
4. **Read troubleshooting**: See [OCI_DEPLOYMENT_SUMMARY.md](./OCI_DEPLOYMENT_SUMMARY.md)

---

## ✅ Deployment Checklist

- [ ] Oracle Cloud account created
- [ ] Compute instance running
- [ ] Security lists configured
- [ ] Deployment script completed
- [ ] API keys configured in .env
- [ ] Services running (docker ps)
- [ ] Health check passes
- [ ] Dashboard accessible

---

## 🎉 Success!

Your AI Trading System is now running on Oracle Cloud Infrastructure!

**Next Steps:**
1. Configure your API keys in `.env`
2. Test with paper trading
3. Monitor performance
4. Scale up when ready

---

**Questions?** Check the [complete deployment guide](./ORACLE_CLOUD_DEPLOYMENT_GUIDE.md) for detailed instructions.

🚀 **Happy Trading!**
