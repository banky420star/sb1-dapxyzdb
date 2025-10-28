#!/bin/bash
# Oracle Cloud Deployment Script for AI Trading System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-trading"
REGION="us-ashburn-1"
COMPARTMENT_NAME="AI-Trading-System"

echo -e "${BLUE}🚀 Starting Oracle Cloud deployment for AI Trading System${NC}"

# Check if OCI CLI is installed
if ! command -v oci &> /dev/null; then
    echo -e "${RED}❌ OCI CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it first.${NC}"
    echo "Visit: https://www.terraform.io/downloads"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"

# Function to create compartment
create_compartment() {
    echo -e "${YELLOW}📁 Creating compartment: $COMPARTMENT_NAME${NC}"
    
    # Check if compartment already exists
    COMPARTMENT_ID=$(oci iam compartment list --query "data[?name=='$COMPARTMENT_NAME'].id" --raw-output 2>/dev/null || echo "")
    
    if [ -z "$COMPARTMENT_ID" ]; then
        COMPARTMENT_ID=$(oci iam compartment create \
            --compartment-id $(oci iam compartment list --query "data[0].id" --raw-output) \
            --name "$COMPARTMENT_NAME" \
            --description "Compartment for AI Trading System resources" \
            --query "data.id" --raw-output)
        echo -e "${GREEN}✅ Compartment created: $COMPARTMENT_ID${NC}"
    else
        echo -e "${GREEN}✅ Compartment already exists: $COMPARTMENT_ID${NC}"
    fi
    
    echo "COMPARTMENT_OCID=$COMPARTMENT_ID" > .env.oci
}

# Function to setup OCI Container Registry
setup_container_registry() {
    echo -e "${YELLOW}🐳 Setting up OCI Container Registry${NC}"
    
    # Get tenancy OCID
    TENANCY_OCID=$(oci iam compartment list --query "data[0].compartment-id" --raw-output)
    
    # Create container registry namespace
    NAMESPACE=$(oci artifacts container repository create \
        --compartment-id $COMPARTMENT_ID \
        --display-name "$PROJECT_NAME-registry" \
        --is-public false \
        --query "data.namespace" --raw-output 2>/dev/null || echo "")
    
    if [ -z "$NAMESPACE" ]; then
        NAMESPACE=$(oci artifacts container repository list \
            --compartment-id $COMPARTMENT_ID \
            --query "data[0].namespace" --raw-output)
    fi
    
    echo "REGISTRY_NAMESPACE=$NAMESPACE" >> .env.oci
    echo "REGISTRY_URL=$REGION.ocir.io/$NAMESPACE" >> .env.oci
    echo -e "${GREEN}✅ Container Registry configured: $REGION.ocir.io/$NAMESPACE${NC}"
}

# Function to build and push Docker images
build_and_push_images() {
    echo -e "${YELLOW}🔨 Building and pushing Docker images${NC}"
    
    source .env.oci
    
    # Login to OCI Container Registry
    echo -e "${YELLOW}🔐 Logging in to OCI Container Registry${NC}"
    oci artifacts container repository get-login --region $REGION | bash
    
    # Build frontend image
    echo -e "${YELLOW}📦 Building frontend image${NC}"
    docker build -f Dockerfile.oracle-frontend -t $PROJECT_NAME-frontend .
    docker tag $PROJECT_NAME-frontend:latest $REGISTRY_URL/$PROJECT_NAME-frontend:latest
    docker push $REGISTRY_URL/$PROJECT_NAME-frontend:latest
    
    # Build backend image
    echo -e "${YELLOW}📦 Building backend image${NC}"
    docker build -f Dockerfile.oracle-backend -t $PROJECT_NAME-backend .
    docker tag $PROJECT_NAME-backend:latest $REGISTRY_URL/$PROJECT_NAME-backend:latest
    docker push $REGISTRY_URL/$PROJECT_NAME-backend:latest
    
    # Build ML service image
    echo -e "${YELLOW}📦 Building ML service image${NC}"
    docker build -f model-service/Dockerfile.oracle -t $PROJECT_NAME-ml ./model-service
    docker tag $PROJECT_NAME-ml:latest $REGISTRY_URL/$PROJECT_NAME-ml:latest
    docker push $REGISTRY_URL/$PROJECT_NAME-ml:latest
    
    echo -e "${GREEN}✅ All images built and pushed successfully${NC}"
}

# Function to deploy infrastructure with Terraform
deploy_infrastructure() {
    echo -e "${YELLOW}🏗️ Deploying infrastructure with Terraform${NC}"
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        echo -e "${RED}❌ terraform.tfvars not found. Please create it from terraform.tfvars.example${NC}"
        echo "Required variables:"
        echo "- tenancy_ocid"
        echo "- user_ocid"
        echo "- fingerprint"
        echo "- private_key_path"
        echo "- compartment_ocid"
        echo "- ssh_public_key"
        echo "- db_password"
        exit 1
    fi
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    # Get outputs
    terraform output -json > ../terraform-outputs.json
    
    cd ..
    
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Function to deploy applications
deploy_applications() {
    echo -e "${YELLOW}🚀 Deploying applications${NC}"
    
    # Get instance IPs from Terraform outputs
    FRONTEND_IP=$(jq -r '.frontend_public_ip.value' terraform-outputs.json)
    BACKEND_IP=$(jq -r '.backend_private_ip.value' terraform-outputs.json)
    ML_IP=$(jq -r '.ml_private_ip.value' terraform-outputs.json)
    DB_IP=$(jq -r '.db_private_ip.value' terraform-outputs.json)
    LB_IP=$(jq -r '.load_balancer_ip.value' terraform-outputs.json)
    
    echo -e "${BLUE}📋 Instance Information:${NC}"
    echo "Frontend IP: $FRONTEND_IP"
    echo "Backend IP: $BACKEND_IP"
    echo "ML Service IP: $ML_IP"
    echo "Database IP: $DB_IP"
    echo "Load Balancer IP: $LB_IP"
    
    # Create deployment environment file
    cat > .env.deployment << EOF
# Oracle Cloud Deployment Environment
NODE_ENV=production
VITE_API_URL=http://$LB_IP:8000
VITE_MODEL_SERVICE_URL=http://$LB_IP:9000
MODEL_SERVICE_URL=http://$ML_IP:9000
DATABASE_URL=postgresql://trader:secure_password@$DB_IP:5432/trading_system
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_API_SECRET=your_bybit_api_secret_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_minimum_32_characters
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
MAX_DRAWDOWN_PCT=0.15
PER_SYMBOL_USD_CAP=10000
EOF
    
    echo -e "${GREEN}✅ Deployment environment file created${NC}"
    echo -e "${YELLOW}📝 Please update .env.deployment with your actual API keys and secrets${NC}"
}

# Function to show deployment summary
show_summary() {
    echo -e "${GREEN}🎉 Deployment Summary${NC}"
    echo "=================="
    
    if [ -f "terraform-outputs.json" ]; then
        LB_IP=$(jq -r '.load_balancer_ip.value' terraform-outputs.json)
        FRONTEND_IP=$(jq -r '.frontend_public_ip.value' terraform-outputs.json)
        
        echo -e "${BLUE}🌐 Access URLs:${NC}"
        echo "Frontend: http://$LB_IP"
        echo "API: http://$LB_IP:8000"
        echo ""
        echo -e "${BLUE}🔧 Management:${NC}"
        echo "SSH to Frontend: ssh opc@$FRONTEND_IP"
        echo "OCI Console: https://cloud.oracle.com"
        echo ""
        echo -e "${BLUE}📋 Next Steps:${NC}"
        echo "1. Update .env.deployment with your API keys"
        echo "2. SSH to instances and start services"
        echo "3. Configure SSL certificates"
        echo "4. Set up monitoring and alerts"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting Oracle Cloud deployment...${NC}"
    
    # Step 1: Create compartment
    create_compartment
    
    # Step 2: Setup container registry
    setup_container_registry
    
    # Step 3: Build and push images
    build_and_push_images
    
    # Step 4: Deploy infrastructure
    deploy_infrastructure
    
    # Step 5: Deploy applications
    deploy_applications
    
    # Step 6: Show summary
    show_summary
    
    echo -e "${GREEN}🎉 Oracle Cloud deployment completed successfully!${NC}"
}

# Run main function
main "$@"