# 🚀 ORACLE CLOUD INFRASTRUCTURE (OCI) DEPLOYMENT GUIDE

## 📋 PROJECT COMPATIBILITY ASSESSMENT

### ✅ COMPATIBLE COMPONENTS
- **Node.js Application**: ✅ Fully compatible (Node 18+)
- **Docker Containers**: ✅ OCI Container Instances supported
- **PostgreSQL**: ✅ OCI Database Service available
- **Redis**: ✅ Can be deployed as container
- **Monitoring**: ✅ OCI Monitoring & Grafana compatible
- **Load Balancing**: ✅ OCI Load Balancer available
- **SSL/TLS**: ✅ OCI SSL certificates supported

### ⚠️ CONSIDERATIONS
- **MT5 Integration**: Requires public IP for ZMQ ports (5555, 5556)
- **WebSocket Connections**: May need sticky sessions
- **File Storage**: Consider OCI Object Storage for data persistence
- **Backup Strategy**: Use OCI Backup service

---

## 🏗️ DEPLOYMENT ARCHITECTURE

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OCI Load      │    │   Container     │    │   OCI Database  │
│   Balancer      │────│   Instances     │────│   (PostgreSQL)  │
│   (SSL/TLS)     │    │   (Node.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Redis Cache   │              │
         └──────────────│   (Container)   │──────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Monitoring    │
                        │   (Grafana)     │
                        └─────────────────┘
```

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: OCI Container Instances (RECOMMENDED)

#### Prerequisites:
- Oracle Cloud account with Always Free tier or paid account
- OCI CLI installed and configured
- Docker Hub account (for pushing images)

#### Step 1: Prepare Docker Images

```bash
# Build and tag your application
docker build -t ai-trading-system:latest .
docker tag ai-trading-system:latest your-dockerhub-username/ai-trading-system:latest

# Push to Docker Hub
docker push your-dockerhub-username/ai-trading-system:latest
```

#### Step 2: Create OCI Resources

```bash
# Create compartment
oci iam compartment create --name "AI-Trading" --description "AI Trading System"

# Create VCN (Virtual Cloud Network)
oci network vcn create --cidr-block "10.0.0.0/16" --display-name "trading-vcn" --compartment-id <COMPARTMENT_ID>

# Create subnet
oci network subnet create --vcn-id <VCN_ID> --cidr-block "10.0.1.0/24" --display-name "trading-subnet" --compartment-id <COMPARTMENT_ID>

# Create security list (allow required ports)
oci network security-list create --vcn-id <VCN_ID> --display-name "trading-security-list" --compartment-id <COMPARTMENT_ID> --egress-security-rules '[{"destination": "0.0.0.0/0", "protocol": "all", "isStateless": false}]' --ingress-security-rules '[{"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 80, "max": 80}}}, {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}}, {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 8000, "max": 8000}}}, {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 3000, "max": 3000}}}, {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 5555, "max": 5556}}}]'
```

#### Step 3: Deploy Container Instances

```bash
# Create container instance for backend
oci container-instances container-instance create \
  --compartment-id <COMPARTMENT_ID> \
  --display-name "ai-trading-backend" \
  --availability-domain <AD_NAME> \
  --shape "CI.Standard.E4.Flex" \
  --shape-config '{"ocpus": 1, "memoryInGBs": 4}' \
  --vnics '[{"subnetId": "<SUBNET_ID>", "displayName": "backend-vnic"}]' \
  --containers '[{"imageUrl": "your-dockerhub-username/ai-trading-system:latest", "displayName": "trading-backend", "resourceConfig": {"vcpusLimit": 1, "memoryLimitInGBs": 3}, "environmentVariables": {"NODE_ENV": "production", "PORT": "8000", "TRADING_MODE": "paper"}}]'
```

### Option 2: OCI Compute Instances with Docker

#### Step 1: Create Compute Instance

```bash
# Create VM instance
oci compute instance launch \
  --compartment-id <COMPARTMENT_ID> \
  --availability-domain <AD_NAME> \
  --shape "VM.Standard.E2.1.Micro" \
  --image-id <UBUNTU_IMAGE_ID> \
  --subnet-id <SUBNET_ID> \
  --display-name "ai-trading-vm" \
  --assign-public-ip true \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub
```

#### Step 2: Install Docker and Deploy

```bash
# SSH to your instance
ssh opc@<PUBLIC_IP>

# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker opc

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your repository
git clone https://github.com/banky420star/sb1-dapxyzdb.git
cd sb1-dapxyzdb

# Create environment file
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
ALPHA_VANTAGE_API_KEY=2ZQ8QZSN1U9XN5TK
ENABLE_LIVE_DATA=true
DB_HOST=<DB_PRIVATE_IP>
DB_PORT=5432
DB_NAME=trading_db
REDIS_HOST=localhost
REDIS_PORT=6379
ENVEOF

# Deploy with Docker Compose
docker-compose up -d
```

---

## 💰 COST ESTIMATION

### Always Free Tier (Recommended for Testing)
- **2 VM.Standard.E2.1.Micro instances**: Free
- **1 OCI Database (PostgreSQL)**: Free (up to 20GB)
- **10GB Object Storage**: Free
- **Load Balancer**: Free (up to 10Mbps)
- **Total**: $0/month

### Paid Tier (Production)
- **2 VM.Standard.E2.1.Micro instances**: ~$30/month
- **1 OCI Database (PostgreSQL)**: ~$50/month
- **Load Balancer**: ~$20/month
- **Object Storage**: ~$5/month
- **Total**: ~$105/month

---

## 🚀 QUICK DEPLOYMENT SCRIPT

Create this script for easy deployment:

```bash
#!/bin/bash
# oracle-deploy.sh

set -e

echo "🚀 Starting Oracle Cloud deployment..."

# Set your OCI configuration
COMPARTMENT_ID="ocid1.compartment.oc1..your-compartment-id"
VCN_ID="ocid1.vcn.oc1..your-vcn-id"
SUBNET_ID="ocid1.subnet.oc1..your-subnet-id"
AD_NAME="your-availability-domain"

# Create security list
echo "🔐 Creating security list..."
oci network security-list create \
  --vcn-id $VCN_ID \
  --display-name "trading-security-list" \
  --compartment-id $COMPARTMENT_ID \
  --egress-security-rules '[{"destination": "0.0.0.0/0", "protocol": "all", "isStateless": false}]' \
  --ingress-security-rules '[
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 80, "max": 80}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 8000, "max": 8000}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 3000, "max": 3000}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 5555, "max": 5556}}}
  ]'

# Deploy backend container
echo "🐳 Deploying backend container..."
oci container-instances container-instance create \
  --compartment-id $COMPARTMENT_ID \
  --display-name "ai-trading-backend" \
  --availability-domain $AD_NAME \
  --shape "CI.Standard.E4.Flex" \
  --shape-config '{"ocpus": 1, "memoryInGBs": 4}' \
  --vnics "[{\"subnetId\": \"$SUBNET_ID\", \"displayName\": \"backend-vnic\"}]" \
  --containers '[{"imageUrl": "your-dockerhub-username/ai-trading-system:latest", "displayName": "trading-backend", "resourceConfig": {"vcpusLimit": 1, "memoryLimitInGBs": 3}, "environmentVariables": {"NODE_ENV": "production", "PORT": "8000", "TRADING_MODE": "paper"}}]'

echo "✅ Deployment complete!"
echo "🌐 Your AI Trading System is now running on Oracle Cloud!"
```

---

## 🧪 TESTING & VERIFICATION

### Health Checks

```bash
# Test API health
curl http://<PUBLIC_IP>:8000/api/health

# Test trading system status
curl http://<PUBLIC_IP>:8000/api/status

# Test MT5 connection
curl -X POST http://<PUBLIC_IP>:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "test mt5 connection"}'
```

---

## 🎯 NEXT STEPS

1. **Deploy to Always Free tier** for testing
2. **Set up monitoring** and alerts
3. **Configure SSL** certificates
4. **Set up automated backups**
5. **Scale up** to paid tier for production
6. **Implement CI/CD** pipeline

---

## 🎉 SUCCESS!

Your AI Trading System is now ready for Oracle Cloud deployment! 

**Key Benefits:**
- ✅ **Scalable**: Auto-scaling container instances
- ✅ **Secure**: Built-in security and compliance
- ✅ **Cost-effective**: Always Free tier available
- ✅ **Reliable**: 99.95% uptime SLA
- ✅ **Global**: Multiple regions available

🚀 **Happy Trading on Oracle Cloud!** 💰
