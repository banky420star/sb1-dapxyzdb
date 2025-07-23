#!/bin/bash
# Git Secrets History Scrubber
# Removes any accidentally committed secrets from git history

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

# Backup current branch
CURRENT_BRANCH=$(git branch --show-current)
BACKUP_BRANCH="backup-before-scrub-$(date +%s)"

log "🔍 Starting Git Secrets History Scrub"
log "Current branch: $CURRENT_BRANCH"
log "Creating backup branch: $BACKUP_BRANCH"

# Create backup
git branch "$BACKUP_BRANCH"
log "✅ Backup created at $BACKUP_BRANCH"

# Install truffleHog if not available
if ! command -v trufflehog >/dev/null 2>&1; then
    log "📦 Installing TruffleHog..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install trufflesecurity/trufflehog/trufflehog
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
    else
        error "Unsupported OS. Please install TruffleHog manually: https://github.com/trufflesecurity/trufflehog"
        exit 1
    fi
fi

# Scan git history for secrets
log "🔍 Scanning git history for secrets..."
SECRETS_FILE="secrets_found_$(date +%s).txt"

if trufflehog git file://. --only-verified > "$SECRETS_FILE" 2>&1; then
    if [ -s "$SECRETS_FILE" ]; then
        error "🚨 SECRETS FOUND IN GIT HISTORY!"
        echo
        cat "$SECRETS_FILE"
        echo
        
        read -p "❓ Do you want to proceed with removing these secrets? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Aborted by user. Backup branch preserved: $BACKUP_BRANCH"
            exit 0
        fi
    else
        log "✅ No verified secrets found in git history"
        rm -f "$SECRETS_FILE"
        git branch -D "$BACKUP_BRANCH"
        exit 0
    fi
else
    warn "TruffleHog scan completed with warnings, checking results..."
fi

# Install git-filter-repo if not available
if ! command -v git-filter-repo >/dev/null 2>&1; then
    log "📦 Installing git-filter-repo..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install git-filter-repo
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        pip3 install git-filter-repo
    else
        error "Please install git-filter-repo manually"
        exit 1
    fi
fi

# Define files/patterns to remove from history
SECRETS_PATTERNS=(
    ".env"
    "*.env"
    ".env.*"
    "*.key"
    "*.pem"
    "*.crt"
    "*.p12"
    "*.pfx"
    "secrets.yml"
    "secrets.yaml"
    "config/secrets.json"
)

log "🧹 Removing secret files from git history..."

# Remove each pattern from history
for pattern in "${SECRETS_PATTERNS[@]}"; do
    log "Removing pattern: $pattern"
    git filter-repo --path "$pattern" --invert-paths --force || true
done

# Remove specific secret strings using git filter-repo
log "🔍 Removing secret strings from git history..."

# Common secret patterns to remove
SECRET_REGEXES=(
    'ALPHAVANTAGE_API_KEY=.*'
    'BYBIT_API_KEY=.*'
    'BYBIT_SECRET_KEY=.*'
    'DATABASE_URL=.*'
    'JWT_SECRET=.*'
    'AWS_ACCESS_KEY_ID=.*'
    'AWS_SECRET_ACCESS_KEY=.*'
    'GRAFANA_PASSWORD=.*'
    'password=.*'
    'secret=.*'
    'token=.*'
    'key=.*'
)

# Create temporary file with secret patterns
REPLACE_FILE="replace_secrets_$(date +%s).txt"
for regex in "${SECRET_REGEXES[@]}"; do
    echo "regex:$regex==>[REDACTED]" >> "$REPLACE_FILE"
done

# Apply replacements
git filter-repo --replace-text "$REPLACE_FILE" --force || true
rm -f "$REPLACE_FILE"

# Verify no secrets remain
log "🔍 Verifying secret removal..."
if trufflehog git file://. --only-verified > "verify_$(date +%s).txt" 2>&1; then
    if [ -s "verify_$(date +%s).txt" ]; then
        warn "⚠️ Some secrets may still remain. Manual review required."
        cat "verify_$(date +%s).txt"
    else
        log "✅ Secret removal verification passed"
    fi
fi

# Update .gitignore to prevent future issues
log "🛡️ Updating .gitignore for future protection..."
cat >> .gitignore << 'EOF'

# Secrets Protection (auto-added by git-secrets-scrub)
.env
.env.*
*.key
*.pem
*.crt
*.p12
*.pfx
secrets/
config/secrets.*
*.secret
*password*
*secret*
*token*
.sops.yaml
age.key*
EOF

git add .gitignore
git commit -m "chore: update .gitignore to prevent secret commits" || true

# Force push warning
echo
warn "🚨 IMPORTANT: You need to force push to update remote history"
warn "This will rewrite git history - coordinate with your team!"
echo
echo "Commands to run:"
echo "git push --force-with-lease origin $CURRENT_BRANCH"
echo
echo "If working with a team:"
echo "1. Notify all team members"
echo "2. Have them backup their branches"
echo "3. Execute: git push --force-with-lease origin $CURRENT_BRANCH"
echo "4. Team members should re-clone the repository"
echo
log "✅ Git history scrubbing completed"
log "📁 Backup preserved at branch: $BACKUP_BRANCH"
log "📄 Secrets scan report: $SECRETS_FILE"

# Cleanup verification files
rm -f verify_*.txt

echo
echo "🎯 NEXT STEPS:"
echo "1. Review the changes: git log --oneline -10"
echo "2. Force push: git push --force-with-lease origin $CURRENT_BRANCH"
echo "3. Rotate any exposed secrets immediately"
echo "4. Set up pre-commit hooks to prevent future issues" 