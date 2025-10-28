#!/bin/bash
# Oracle Cloud Infrastructure Deployment Script for AI Trading System

set -e

echo "🚀 Starting Oracle Cloud deployment for AI Trading System..."

# Check if OCI CLI is installed
if ! command -v oci &> /dev/null; then
    echo "❌ OCI CLI is not installed. Please install it first:"
    echo "   https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first."
    exit 1
fi

# Configuration (Update these with your OCI details)
COMPARTMENT_ID="${OCI_COMPARTMENT_ID:-ocid1.compartment.oc1..your-compartment-id}"
VCN_ID="${OCI_VCN_ID:-ocid1.vcn.oc1..your-vcn-id}"
SUBNET_ID="${OCI_SUBNET_ID:-ocid1.subnet.oc1..your-subnet-id}"
AD_NAME="${OCI_AD_NAME:-your-availability-domain}"
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-your-dockerhub-username}"

echo "📋 Configuration:"
echo "   Compartment ID: $COMPARTMENT_ID"
echo "   VCN ID: $VCN_ID"
echo "   Subnet ID: $SUBNET_ID"
echo "   Availability Domain: $AD_NAME"
echo "   Docker Hub Username: $DOCKERHUB_USERNAME"

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
docker build -t ai-trading-system:latest .
docker tag ai-trading-system:latest $DOCKERHUB_USERNAME/ai-trading-system:latest
docker push $DOCKERHUB_USERNAME/ai-trading-system:latest

# Create security list
echo "🔐 Creating security list..."
oci network security-list create \
  --vcn-id $VCN_ID \
  --display-name "ai-trading-security-list" \
  --compartment-id $COMPARTMENT_ID \
  --egress-security-rules '[{"destination": "0.0.0.0/0", "protocol": "all", "isStateless": false}]' \
  --ingress-security-rules '[
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 80, "max": 80}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 8000, "max": 8000}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 3000, "max": 3000}}},
    {"source": "0.0.0.0/0", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 5555, "max": 5556}}}
  ]' || echo "⚠️  Security list may already exist"

# Deploy backend container
echo "🐳 Deploying backend container..."
oci container-instances container-instance create \
  --compartment-id $COMPARTMENT_ID \
  --display-name "ai-trading-backend" \
  --availability-domain $AD_NAME \
  --shape "CI.Standard.E4.Flex" \
  --shape-config '{"ocpus": 1, "memoryInGBs": 4}' \
  --vnics "[{\"subnetId\": \"$SUBNET_ID\", \"displayName\": \"backend-vnic\"}]" \
  --containers "[{\"imageUrl\": \"$DOCKERHUB_USERNAME/ai-trading-system:latest\", \"displayName\": \"trading-backend\", \"resourceConfig\": {\"vcpusLimit\": 1, \"memoryLimitInGBs\": 3}, \"environmentVariables\": {\"NODE_ENV\": \"production\", \"PORT\": \"8000\", \"TRADING_MODE\": \"paper\", \"ALPHA_VANTAGE_API_KEY\": \"2ZQ8QZSN1U9XN5TK\"}}]"

# Deploy Redis container
echo "🔴 Deploying Redis container..."
oci container-instances container-instance create \
  --compartment-id $COMPARTMENT_ID \
  --display-name "ai-trading-redis" \
  --availability-domain $AD_NAME \
  --shape "CI.Standard.E4.Flex" \
  --shape-config '{"ocpus": 0.5, "memoryInGBs": 2}' \
  --vnics "[{\"subnetId\": \"$SUBNET_ID\", \"displayName\": \"redis-vnic\"}]" \
  --containers "[{\"imageUrl\": \"redis:7-alpine\", \"displayName\": \"redis\", \"resourceConfig\": {\"vcpusLimit\": 0.5, \"memoryLimitInGBs\": 1}, \"environmentVariables\": {}}]"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your AI Trading System is now running on Oracle Cloud!"
echo ""
echo "📊 Next steps:"
echo "   1. Get the public IP of your container instances"
echo "   2. Test the API: curl http://<PUBLIC_IP>:8000/api/health"
echo "   3. Access the dashboard: http://<PUBLIC_IP>:3000"
echo "   4. Configure MT5 with the public IP"
echo ""
echo "🔍 To get container instance details:"
echo "   oci container-instances container-instance list --compartment-id $COMPARTMENT_ID"
