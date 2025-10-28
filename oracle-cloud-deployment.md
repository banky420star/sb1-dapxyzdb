# Oracle Cloud Infrastructure (OCI) Deployment Guide

## Overview
This guide will help you deploy your AI Trading System on Oracle Cloud Infrastructure (OCI).

## Architecture on OCI

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Web Server    │────│   API Gateway   │
│   (OCI LB)      │    │   (React App)   │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   ML Service    │────│   Database      │
                       │   (Python)      │    │   (PostgreSQL)  │
                       └─────────────────┘    └─────────────────┘
```

## Prerequisites

1. **Oracle Cloud Account** with Always Free tier or paid account
2. **OCI CLI** installed and configured
3. **Docker** installed locally
4. **Terraform** (optional, for infrastructure as code)

## Step 1: Set Up OCI Resources

### 1.1 Create Compartment
```bash
# Create a compartment for your trading system
oci iam compartment create \
  --compartment-id <tenancy-ocid> \
  --name "AI-Trading-System" \
  --description "Compartment for AI Trading System resources"
```

### 1.2 Create VCN (Virtual Cloud Network)
```bash
# Create VCN
oci network vcn create \
  --compartment-id <compartment-ocid> \
  --cidr-block "10.0.0.0/16" \
  --display-name "trading-vcn" \
  --dns-label "trading"
```

### 1.3 Create Subnets
```bash
# Public subnet for load balancer
oci network subnet create \
  --compartment-id <compartment-ocid> \
  --vcn-id <vcn-ocid> \
  --cidr-block "10.0.1.0/24" \
  --display-name "public-subnet" \
  --dns-label "public"

# Private subnet for application servers
oci network subnet create \
  --compartment-id <compartment-ocid> \
  --vcn-ocid <vcn-ocid> \
  --cidr-block "10.0.2.0/24" \
  --display-name "private-subnet" \
  --dns-label "private"
```

## Step 2: Create Compute Instances

### 2.1 Frontend Server (React App)
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OS**: Oracle Linux 8
- **Storage**: 50GB boot volume

### 2.2 Backend Server (Node.js API)
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OS**: Oracle Linux 8
- **Storage**: 50GB boot volume

### 2.3 ML Service Server (Python/FastAPI)
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OS**: Oracle Linux 8
- **Storage**: 50GB boot volume

### 2.4 Database Server (PostgreSQL)
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OS**: Oracle Linux 8
- **Storage**: 100GB boot volume

## Step 3: Container Registry Setup

### 3.1 Create OCI Container Registry
```bash
# Create container registry namespace
oci artifacts container repository create \
  --compartment-id <compartment-ocid> \
  --display-name "ai-trading-registry" \
  --is-public false
```

### 3.2 Build and Push Images
```bash
# Build frontend image
docker build -f Dockerfile.frontend -t ai-trading-frontend .

# Build backend image
docker build -f Dockerfile -t ai-trading-backend .

# Build ML service image
docker build -f model-service/Dockerfile -t ai-trading-ml .

# Tag and push to OCI registry
docker tag ai-trading-frontend <region>.ocir.io/<namespace>/ai-trading-frontend:latest
docker tag ai-trading-backend <region>.ocir.io/<namespace>/ai-trading-backend:latest
docker tag ai-trading-ml <region>.ocir.io/<namespace>/ai-trading-ml:latest

# Push to registry
docker push <region>.ocir.io/<namespace>/ai-trading-frontend:latest
docker push <region>.ocir.io/<namespace>/ai-trading-backend:latest
docker push <region>.ocir.io/<namespace>/ai-trading-ml:latest
```

## Step 4: Database Setup

### 4.1 Install PostgreSQL
```bash
# On database server
sudo dnf install -y postgresql15-server postgresql15
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.2 Configure Database
```sql
-- Create database and user
CREATE DATABASE trading_system;
CREATE USER trader WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE trading_system TO trader;
```

## Step 5: Application Deployment

### 5.1 Deploy ML Service
```bash
# On ML service server
docker run -d \
  --name ai-trading-ml \
  -p 9000:9000 \
  -e MODEL_VERSION=production \
  <region>.ocir.io/<namespace>/ai-trading-ml:latest
```

### 5.2 Deploy Backend API
```bash
# On backend server
docker run -d \
  --name ai-trading-backend \
  -p 8000:8000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://trader:secure_password@<db-server-ip>:5432/trading_system \
  -e MODEL_SERVICE_URL=http://<ml-server-ip>:9000 \
  <region>.ocir.io/<namespace>/ai-trading-backend:latest
```

### 5.3 Deploy Frontend
```bash
# On frontend server
docker run -d \
  --name ai-trading-frontend \
  -p 3000:3000 \
  -e VITE_API_URL=http://<backend-server-ip>:8000 \
  -e VITE_MODEL_SERVICE_URL=http://<ml-server-ip>:9000 \
  <region>.ocir.io/<namespace>/ai-trading-frontend:latest
```

## Step 6: Load Balancer Configuration

### 6.1 Create Load Balancer
```bash
oci lb load-balancer create \
  --compartment-id <compartment-ocid> \
  --display-name "trading-lb" \
  --shape-name "flexible" \
  --subnet-ids '["<public-subnet-ocid>"]' \
  --is-private false
```

### 6.2 Configure Backend Sets
```bash
# Backend set for frontend
oci lb backend-set create \
  --load-balancer-id <lb-ocid> \
  --name "frontend-backend" \
  --policy "ROUND_ROBIN" \
  --health-checker-protocol "HTTP" \
  --health-checker-url-path "/" \
  --health-checker-port 3000

# Backend set for API
oci lb backend-set create \
  --load-balancer-id <lb-ocid> \
  --name "api-backend" \
  --policy "ROUND_ROBIN" \
  --health-checker-protocol "HTTP" \
  --health-checker-url-path "/api/health" \
  --health-checker-port 8000
```

## Step 7: Security Configuration

### 7.1 Security Lists
```bash
# Allow HTTP/HTTPS traffic
oci network security-list create \
  --compartment-id <compartment-ocid> \
  --vcn-id <vcn-ocid> \
  --display-name "web-traffic" \
  --egress-security-rules '[{"destination": "0.0.0.0/0", "protocol": "all", "isStateless": true}]' \
  --ingress-security-rules '[{"source": "0.0.0.0/0", "protocol": "6", "isStateless": false, "tcpOptions": {"destinationPortRange": {"min": 80, "max": 80}}}, {"source": "0.0.0.0/0", "protocol": "6", "isStateless": false, "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}}]'
```

### 7.2 SSL Certificate
```bash
# Upload SSL certificate to OCI
oci certs-management certificate create \
  --compartment-id <compartment-ocid> \
  --certificate-config-type "IMPORTED" \
  --certificate-pem "-----BEGIN CERTIFICATE-----..." \
  --private-key-pem "-----BEGIN PRIVATE KEY-----..."
```

## Step 8: Monitoring and Logging

### 8.1 Enable OCI Monitoring
```bash
# Create monitoring namespace
oci monitoring namespace create \
  --compartment-id <compartment-ocid> \
  --display-name "trading-monitoring"
```

### 8.2 Set up Logging
```bash
# Create log group
oci logging log-group create \
  --compartment-id <compartment-ocid> \
  --display-name "trading-logs" \
  --description "Logs for AI Trading System"
```

## Step 9: Environment Variables

Create a `.env` file for production:

```env
# Database
DATABASE_URL=postgresql://trader:secure_password@<db-server-ip>:5432/trading_system

# API Keys
BYBIT_API_KEY=your_bybit_api_key
BYBIT_API_SECRET=your_bybit_api_secret
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Service URLs
MODEL_SERVICE_URL=http://<ml-server-ip>:9000
API_URL=http://<backend-server-ip>:8000

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Trading Configuration
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
MAX_DRAWDOWN_PCT=0.15
```

## Step 10: Deployment Scripts

### 10.1 Deploy All Services
```bash
#!/bin/bash
# deploy-oracle.sh

echo "Deploying AI Trading System to Oracle Cloud..."

# Deploy ML Service
echo "Deploying ML Service..."
ssh <ml-server-ip> "docker pull <region>.ocir.io/<namespace>/ai-trading-ml:latest && docker stop ai-trading-ml && docker rm ai-trading-ml && docker run -d --name ai-trading-ml -p 9000:9000 <region>.ocir.io/<namespace>/ai-trading-ml:latest"

# Deploy Backend
echo "Deploying Backend API..."
ssh <backend-server-ip> "docker pull <region>.ocir.io/<namespace>/ai-trading-backend:latest && docker stop ai-trading-backend && docker rm ai-trading-backend && docker run -d --name ai-trading-backend -p 8000:8000 --env-file .env <region>.ocir.io/<namespace>/ai-trading-backend:latest"

# Deploy Frontend
echo "Deploying Frontend..."
ssh <frontend-server-ip> "docker pull <region>.ocir.io/<namespace>/ai-trading-frontend:latest && docker stop ai-trading-frontend && docker rm ai-trading-frontend && docker run -d --name ai-trading-frontend -p 3000:3000 --env-file .env <region>.ocir.io/<namespace>/ai-trading-frontend:latest"

echo "Deployment complete!"
```

## Cost Estimation (Always Free Tier)

- **4 VM.Standard.E2.1.Micro instances**: $0/month
- **200GB total storage**: $0/month
- **Load balancer**: $0/month (up to 10Mbps)
- **Container registry**: $0/month (up to 5GB)
- **Total**: $0/month (Always Free tier)

## Production Considerations

1. **High Availability**: Use multiple availability domains
2. **Auto Scaling**: Configure OCI Auto Scaling
3. **Backup**: Set up automated backups
4. **Monitoring**: Use OCI Monitoring and Alerting
5. **Security**: Enable OCI Security Zones
6. **Compliance**: Follow OCI security best practices

## Troubleshooting

### Common Issues:
1. **Container Registry Authentication**: Use OCI CLI to login
2. **Network Connectivity**: Check security lists and route tables
3. **Database Connection**: Verify PostgreSQL configuration
4. **SSL Certificates**: Ensure proper certificate chain

### Useful Commands:
```bash
# Check container status
docker ps -a

# View logs
docker logs <container-name>

# Check OCI resources
oci compute instance list --compartment-id <compartment-ocid>
oci network vcn list --compartment-id <compartment-ocid>
```

## Next Steps

1. Set up your OCI account and configure CLI
2. Create the infrastructure using the provided commands
3. Build and push your Docker images
4. Deploy the services following the step-by-step guide
5. Configure monitoring and logging
6. Test the complete system

Your AI Trading System is fully compatible with Oracle Cloud Infrastructure and can be deployed using the Always Free tier!