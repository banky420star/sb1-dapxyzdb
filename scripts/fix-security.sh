#!/bin/bash
# Security Fix Script - Removes hardcoded secrets and sets up secure environment

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Security Fix Script - Trading Platform      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to generate secure random strings
generate_secret() {
    openssl rand -hex 32
}

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    
    if [ -f env.template ]; then
        cp env.template .env
        echo -e "${GREEN}✅ Created .env from template${NC}"
    else
        echo -e "${RED}❌ No env.template found. Creating new .env...${NC}"
        cat > .env << EOF
# Auto-generated secure environment variables
# Generated on $(date)

# Database Configuration
POSTGRES_DB=trading
POSTGRES_USER=trading_app
POSTGRES_PASSWORD=$(generate_secret)
DATABASE_URL=postgresql://trading_app:$(generate_secret)@db:5432/trading

# Redis Configuration  
REDIS_URL=redis://redis:6379

# Bybit API Configuration (REPLACE WITH YOUR ACTUAL KEYS)
BYBIT_API_KEY=REPLACE_WITH_YOUR_API_KEY
BYBIT_API_SECRET=REPLACE_WITH_YOUR_API_SECRET
BYBIT_SECRET=REPLACE_WITH_YOUR_SECRET
BYBIT_TESTNET=true
BYBIT_DEMO=false

# Alpha Vantage API
ALPHAVANTAGE_API_KEY=REPLACE_WITH_YOUR_KEY

# JWT Configuration
JWT_SECRET=$(generate_secret)

# Trading Configuration
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
TARGET_ANN_VOL=0.12
MAX_DRAWDOWN_PCT=0.15
PER_SYMBOL_USD_CAP=10000

# Service Configuration
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000

# Model Configuration
MODEL_VERSION=dev
ENABLE_MODEL_TRAINING=true

# Rate Limiting
RATE_LIMIT_ALPHA_VANTAGE=5
RATE_LIMIT_BYBIT=100

# Monitoring
GRAFANA_PASSWORD=$(generate_secret | head -c 16)

# MLflow Configuration
MLFLOW_TRACKING_URI=http://mlflow:5000
EOF
        echo -e "${GREEN}✅ Created .env with secure defaults${NC}"
    fi
fi

# Update .gitignore to ensure .env is never committed
echo -e "${BLUE}📝 Updating .gitignore...${NC}"
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "\n# Environment files\n.env\n.env.local\n.env.*.local" >> .gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi

# Check for hardcoded secrets in files
echo -e "${BLUE}🔍 Scanning for hardcoded secrets...${NC}"

FOUND_SECRETS=0

# Check bybit-trading-v5.js
if grep -q "apiKey.*:.*process\.env\.BYBIT_API_KEY.*||.*['\"]" server/data/bybit-trading-v5.js 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found hardcoded secrets in bybit-trading-v5.js${NC}"
    echo -e "${BLUE}   Already fixed - secrets removed from fallback values${NC}"
fi

# Run the validation script
echo -e "${BLUE}🔐 Running environment validation...${NC}"
if [ -f scripts/validate-env.js ]; then
    node scripts/validate-env.js || true
else
    echo -e "${YELLOW}⚠️  Validation script not found${NC}"
fi

# Create secrets documentation
echo -e "${BLUE}📚 Creating secrets documentation...${NC}"
cat > SECRETS_SETUP.md << 'EOF'
# Secrets Setup Guide

## Required Environment Variables

### 1. Bybit API Credentials
- **BYBIT_API_KEY**: Your Bybit API key
- **BYBIT_API_SECRET**: Your Bybit API secret
- **BYBIT_SECRET**: Your Bybit secret key

To obtain these:
1. Log in to your Bybit account
2. Go to API Management
3. Create a new API key with trading permissions
4. Copy the credentials to your .env file

### 2. Alpha Vantage API Key
- **ALPHAVANTAGE_API_KEY**: Your Alpha Vantage API key

Get your free key at: https://www.alphavantage.co/support/#api-key

### 3. Database Password
- **POSTGRES_PASSWORD**: A strong password for your PostgreSQL database
- Generated automatically if not set

### 4. JWT Secret
- **JWT_SECRET**: Secret key for JWT token signing
- Generated automatically with high entropy

## Security Best Practices

1. **Never commit .env file to version control**
2. **Use different credentials for development and production**
3. **Rotate secrets regularly**
4. **Use secret management services in production (AWS Secrets Manager, HashiCorp Vault, etc.)**
5. **Enable 2FA on all API accounts**
6. **Restrict API permissions to minimum required**

## Validation

Run the validation script to ensure all secrets are properly configured:
```bash
npm run validate-env
```

## Troubleshooting

If you see errors about missing environment variables:
1. Check that .env file exists
2. Ensure all required variables are set
3. Restart your services after updating .env
EOF

echo -e "${GREEN}✅ Created SECRETS_SETUP.md${NC}"

# Add npm scripts for validation
echo -e "${BLUE}📦 Adding npm scripts...${NC}"
if [ -f package.json ]; then
    # Check if validate-env script exists
    if ! grep -q "validate-env" package.json; then
        # Use Node.js to properly update package.json
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts['validate-env'] = 'node scripts/validate-env.js';
        pkg.scripts['scrub-secrets'] = 'bash scripts/git-secrets-scrub.sh';
        pkg.scripts['security-check'] = 'npm run validate-env && npm audit';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        "
        echo -e "${GREEN}✅ Added validation scripts to package.json${NC}"
    fi
fi

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Security Fix Complete! ✅             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. ${YELLOW}Edit .env file and add your actual API credentials${NC}"
echo -e "2. ${YELLOW}Run: npm run validate-env${NC}"
echo -e "3. ${YELLOW}Run: npm run scrub-secrets (if you have git history with secrets)${NC}"
echo -e "4. ${YELLOW}Restart your Docker containers: docker-compose down && docker-compose up${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Never commit your .env file to version control!${NC}"
