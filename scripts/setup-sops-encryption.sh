#!/bin/bash
# Setup SOPS Encryption for Runtime Secrets (T-14)
# Encrypts .env file and stores decryption key securely

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        error ".env file not found. Create one first with your secrets."
    fi
    
    # Install SOPS if not available
    if ! command -v sops >/dev/null 2>&1; then
        log "📦 Installing SOPS..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew install sops
            else
                curl -LO https://github.com/mozilla/sops/releases/latest/download/sops-v3.8.1.darwin.amd64
                chmod +x sops-v3.8.1.darwin.amd64
                sudo mv sops-v3.8.1.darwin.amd64 /usr/local/bin/sops
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LO https://github.com/mozilla/sops/releases/latest/download/sops-v3.8.1.linux.amd64
            chmod +x sops-v3.8.1.linux.amd64
            sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
        else
            error "Unsupported OS. Please install SOPS manually."
        fi
    fi
    
    # Install age if not available
    if ! command -v age >/dev/null 2>&1; then
        log "📦 Installing age..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew install age
            else
                error "Please install age manually: brew install age"
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt >/dev/null 2>&1; then
                sudo apt update && sudo apt install -y age
            else
                error "Please install age manually"
            fi
        fi
    fi
    
    log "✅ Prerequisites verified"
}

# Generate AGE key for encryption
generate_age_key() {
    log "🔑 Generating AGE encryption key..."
    
    if [ -f "age.key" ]; then
        warn "AGE key already exists. Using existing key."
        return
    fi
    
    # Generate new age key
    age-keygen -o age.key
    chmod 600 age.key
    
    # Extract public key
    age-keygen -y age.key > age.key.pub
    
    log "✅ AGE key generated: age.key"
    log "📋 Public key: $(cat age.key.pub)"
    
    echo
    warn "🔒 IMPORTANT: Store the private key (age.key) securely!"
    warn "📁 Save to 1Password/Bitwarden: $(cat age.key)"
    warn "🗑️  Delete local age.key after storing securely"
    echo
}

# Create SOPS configuration
create_sops_config() {
    log "⚙️ Creating SOPS configuration..."
    
    AGE_PUBLIC_KEY=$(cat age.key.pub)
    
    cat > .sops.yaml << EOF
creation_rules:
  - path_regex: \.env\.enc$
    age: $AGE_PUBLIC_KEY
  - path_regex: secrets/.*\.yaml$
    age: $AGE_PUBLIC_KEY
  - path_regex: vultr-production\.env$
    age: $AGE_PUBLIC_KEY
EOF
    
    log "✅ SOPS configuration created"
}

# Encrypt the .env file
encrypt_env_file() {
    log "🔐 Encrypting .env file..."
    
    # Backup original .env
    cp .env .env.backup
    
    # Encrypt with SOPS
    sops --encrypt .env > .env.enc
    
    # Verify encryption
    if [ -f ".env.enc" ] && [ -s ".env.enc" ]; then
        log "✅ Environment file encrypted: .env.enc"
        
        # Test decryption
        log "🧪 Testing decryption..."
        if sops --decrypt .env.enc > /tmp/test-decrypt.env && [ -s /tmp/test-decrypt.env ]; then
            log "✅ Decryption test passed"
            rm -f /tmp/test-decrypt.env
        else
            error "Decryption test failed"
        fi
        
        # Remove original .env
        rm -f .env
        log "✅ Original .env removed for security"
        
    else
        error "Encryption failed"
    fi
}

# Update .gitignore
update_gitignore() {
    log "🛡️ Updating .gitignore..."
    
    # Add SOPS-related entries to .gitignore
    cat >> .gitignore << 'EOF'

# SOPS Encryption
age.key
age.key.pub
.env.backup
**/secrets/**/*.yaml
!**/secrets/**/*.enc
EOF
    
    log "✅ .gitignore updated"
}

# Create decryption script
create_decryption_script() {
    log "📝 Creating decryption script..."
    
    cat > scripts/decrypt-env.sh << 'EOF'
#!/bin/bash
# Decrypt environment file for local development
# Usage: ./scripts/decrypt-env.sh

set -euo pipefail

if [ ! -f ".env.enc" ]; then
    echo "Error: .env.enc not found"
    exit 1
fi

if [ ! -f "age.key" ]; then
    echo "Error: age.key not found. Retrieve from 1Password/Bitwarden"
    exit 1
fi

# Decrypt environment file
SOPS_AGE_KEY_FILE=age.key sops --decrypt .env.enc > .env
echo "✅ Environment file decrypted to .env"
echo "⚠️ Remember to delete .env when done with development"
EOF
    
    chmod +x scripts/decrypt-env.sh
    log "✅ Decryption script created: scripts/decrypt-env.sh"
}

# Create Docker Compose override for secrets
create_docker_secrets_override() {
    log "🐳 Creating Docker Compose secrets override..."
    
    cat > docker-compose.secrets.yml << 'EOF'
# Docker Compose override for secrets management
# Usage: docker compose -f docker-compose.yml -f docker-compose.secrets.yml up

version: '3.8'

services:
  api:
    environment:
      # Use file-based secrets instead of environment variables
      - DATABASE_URL_FILE=/run/secrets/database_url
      - REDIS_URL_FILE=/run/secrets/redis_url
      - ALPHAVANTAGE_API_KEY_FILE=/run/secrets/alphavantage_key
      - BYBIT_API_KEY_FILE=/run/secrets/bybit_key
      - BYBIT_SECRET_KEY_FILE=/run/secrets/bybit_secret
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - GRAFANA_PASSWORD_FILE=/run/secrets/grafana_password
    secrets:
      - database_url
      - redis_url
      - alphavantage_key
      - bybit_key
      - bybit_secret
      - jwt_secret
      - grafana_password

  grafana:
    environment:
      - GF_SECURITY_ADMIN_PASSWORD_FILE=/run/secrets/grafana_password
    secrets:
      - grafana_password

secrets:
  database_url:
    file: ./secrets/database_url.txt
  redis_url:
    file: ./secrets/redis_url.txt
  alphavantage_key:
    file: ./secrets/alphavantage_key.txt
  bybit_key:
    file: ./secrets/bybit_key.txt
  bybit_secret:
    file: ./secrets/bybit_secret.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  grafana_password:
    file: ./secrets/grafana_password.txt
EOF
    
    log "✅ Docker Compose secrets override created"
}

# Main execution
main() {
    echo "🔐 SOPS Encryption Setup for AI Trading System"
    echo "=============================================="
    echo
    
    check_prerequisites
    generate_age_key
    create_sops_config
    encrypt_env_file
    update_gitignore
    create_decryption_script
    create_docker_secrets_override
    
    echo
    echo "🎯 ENCRYPTION SETUP COMPLETE"
    echo "============================="
    echo
    echo "✅ Files created:"
    echo "   • .env.enc (encrypted environment)"
    echo "   • .sops.yaml (SOPS configuration)"
    echo "   • age.key (encryption key - STORE SECURELY!)"
    echo "   • scripts/decrypt-env.sh (decryption helper)"
    echo "   • docker-compose.secrets.yml (secrets override)"
    echo
    echo "🔒 Security checklist:"
    echo "   1. Store age.key in 1Password/Bitwarden"
    echo "   2. Delete local age.key file"
    echo "   3. Commit .env.enc to Git"
    echo "   4. Never commit .env files"
    echo
    echo "🚀 Next steps:"
    echo "   • git add .env.enc .sops.yaml .gitignore"
    echo "   • git commit -m 'Add encrypted environment configuration'"
    echo "   • rm -f age.key age.key.pub .env.backup"
    echo
}

# Run main function
main "$@" 