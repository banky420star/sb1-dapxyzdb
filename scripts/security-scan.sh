#!/bin/bash

# AI Trading System - Security Scan Script
# Performs truffleHog secret scanning, npm audit, and docker scout checks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 AI Trading System - Security Scan"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. TruffleHog Secret Scanning
echo -e "\n1️⃣ Running TruffleHog secret scanning..."
if command_exists trufflehog; then
    if trufflehog git --no-update . --only-verified; then
        print_status 0 "No verified secrets found"
    else
        print_status 1 "Secrets detected - review output above"
        echo "ℹ️  Install: https://github.com/trufflesecurity/trufflehog#installation"
    fi
else
    print_warning "TruffleHog not installed - skipping secret scan"
    echo "ℹ️  Install: https://github.com/trufflesecurity/trufflehog#installation"
fi

# 2. NPM Audit
echo -e "\n2️⃣ Running NPM security audit..."
if command_exists npm; then
    echo "Checking production dependencies only..."
    if npm audit --omit=dev --audit-level=high; then
        print_status 0 "No high/critical NPM vulnerabilities found"
    else
        print_status 1 "High/critical NPM vulnerabilities detected"
        echo "🔧 Run: npm audit fix --omit=dev"
    fi
else
    print_warning "NPM not available - skipping NPM audit"
fi

# 3. Docker Scout Scanning
echo -e "\n3️⃣ Running Docker Scout vulnerability scan..."
if command_exists docker && docker info >/dev/null 2>&1; then
    # Check if any images exist
    if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "ghcr.io/banky420star/ats"; then
        echo "Scanning latest trading system image..."
        if command_exists docker-scout || docker scout version >/dev/null 2>&1; then
            if docker scout quickview ghcr.io/banky420star/ats:latest 2>/dev/null; then
                print_status 0 "Docker image scanned successfully"
            else
                print_warning "Docker Scout scan failed - image may not exist locally"
                echo "🔧 Build image first: docker compose build"
            fi
        else
            print_warning "Docker Scout not available"
            echo "ℹ️  Install: https://docs.docker.com/scout/"
        fi
    else
        print_warning "No trading system Docker images found locally"
        echo "🔧 Build images first: docker compose build"
    fi
else
    print_warning "Docker not available - skipping Docker Scout scan"
fi

# 4. Check for common security issues in code
echo -e "\n4️⃣ Checking for common security patterns..."

# Check for hardcoded secrets patterns
echo "Scanning for potential secret patterns..."
secret_patterns=(
    "password.*="
    "secret.*="
    "key.*="
    "token.*="
    "api.*key"
)

found_patterns=0
for pattern in "${secret_patterns[@]}"; do
    if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" "$pattern" . >/dev/null 2>&1; then
        if [ $found_patterns -eq 0 ]; then
            echo -e "${YELLOW}⚠️  Potential secrets found in code:${NC}"
            found_patterns=1
        fi
        echo "  Pattern: $pattern"
        grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" -n "$pattern" . | head -3
    fi
done

if [ $found_patterns -eq 0 ]; then
    print_status 0 "No obvious secret patterns found in code"
fi

# 5. Check file permissions
echo -e "\n5️⃣ Checking sensitive file permissions..."

sensitive_files=(
    ".env"
    "deploy_key"
    "ecosystem.config.cjs"
    "docker-compose.yml"
)

for file in "${sensitive_files[@]}"; do
    if [ -f "$file" ]; then
        perms=$(stat -f "%Mp%Lp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
        if [[ "$perms" =~ ^[67][0-4][0-4]$ ]]; then
            print_status 0 "$file permissions secure ($perms)"
        else
            print_status 1 "$file permissions too open ($perms)"
            echo "🔧 Run: chmod 600 $file"
        fi
    fi
done

# 6. Summary
echo -e "\n📋 Security Scan Summary"
echo "========================"
echo "✅ Secret scanning: $(command_exists trufflehog && echo "Available" || echo "Install trufflehog")"
echo "✅ NPM audit: $(command_exists npm && echo "Available" || echo "Install npm")"
echo "✅ Docker scanning: $(command_exists docker && echo "Available" || echo "Install docker")"
echo "✅ Code patterns: Checked"
echo "✅ File permissions: Checked"

echo -e "\n🛡️  Security Recommendations:"
echo "1. Run this script before each deployment"
echo "2. Keep dependencies updated (npm update)"
echo "3. Use .env files for secrets (already in .gitignore)"
echo "4. Enable GitHub secret scanning in repository settings"
echo "5. Set up Dependabot for automated security updates"

echo -e "\n🔗 Additional Security Resources:"
echo "- OWASP Top 10: https://owasp.org/www-project-top-ten/"
echo "- Node.js Security: https://nodejs.org/en/security/"
echo "- Docker Security: https://docs.docker.com/engine/security/"

echo -e "\n✅ Security scan completed!" 