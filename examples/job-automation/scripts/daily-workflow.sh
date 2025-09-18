#!/bin/bash
# Daily Developer Workflow Automation with Codex CLI
# This script automates common daily tasks for developers

set -e  # Exit on error

# ============================================
# Configuration
# ============================================
CODEX_CMD="codex"
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
LOG_DIR="${HOME}/.codex/logs"
TODAY=$(date +'%Y-%m-%d')
LOG_FILE="${LOG_DIR}/daily-${TODAY}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# ============================================
# Helper Functions
# ============================================

# Logging function with timestamp
log() {
    local level=$1
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Execute codex command with error handling
run_codex() {
    local task=$1
    local command=$2
    
    log "INFO" "Starting: $task"
    
    if $CODEX_CMD exec "$command" >> "$LOG_FILE" 2>&1; then
        log "SUCCESS" "Completed: $task"
        return 0
    else
        log "ERROR" "Failed: $task"
        return 1
    fi
}

# ============================================
# Daily Tasks
# ============================================

log "INFO" "=========================================="
log "INFO" "Starting Daily Workflow Automation"
log "INFO" "Project: $PROJECT_DIR"
log "INFO" "=========================================="

# 1. Morning Standup Preparation
standup_notes() {
    log "INFO" "Preparing standup notes..."
    
    # Get yesterday's commits
    YESTERDAY=$(date -v-1d +'%Y-%m-%d' 2>/dev/null || date -d 'yesterday' +'%Y-%m-%d')
    
    $CODEX_CMD exec "Based on git commits since $YESTERDAY, create standup notes with: 
    1. What I completed yesterday
    2. What I'm working on today
    3. Any blockers or concerns" > standup-notes-${TODAY}.md
    
    log "SUCCESS" "Standup notes saved to standup-notes-${TODAY}.md"
}

# 2. Code Quality Check
code_quality() {
    run_codex "Code Quality Analysis" \
        "Analyze code quality including:
        - Complexity metrics
        - Code duplication
        - Style violations
        - Potential bugs
        Generate a summary report"
}

# 3. Security Scan
security_check() {
    run_codex "Security Vulnerability Scan" \
        "Check for:
        - Known vulnerabilities in dependencies
        - Security anti-patterns in code
        - Exposed secrets or credentials
        - OWASP top 10 issues"
}

# 4. Test Coverage Analysis
test_coverage() {
    run_codex "Test Coverage Report" \
        "Analyze test coverage and:
        - Identify untested code paths
        - Suggest critical test cases to add
        - Report coverage trends"
}

# 5. Documentation Review
doc_review() {
    run_codex "Documentation Check" \
        "Review documentation for:
        - Outdated information
        - Missing API documentation
        - Incomplete README sections
        - Code comments that need updating"
}

# 6. Dependency Management
dependency_check() {
    run_codex "Dependency Analysis" \
        "Check dependencies for:
        - Outdated packages
        - Security vulnerabilities
        - Unused dependencies
        - Version conflicts
        Create an update plan if needed"
}

# 7. Performance Analysis
performance_check() {
    run_codex "Performance Review" \
        "Analyze code for:
        - Performance bottlenecks
        - Memory leaks
        - Inefficient algorithms
        - Database query optimization opportunities"
}

# 8. TODO and FIXME Review
todo_review() {
    run_codex "TODO/FIXME Analysis" \
        "Find all TODO and FIXME comments and:
        - Prioritize by importance
        - Suggest immediate actions
        - Create tasks for issue tracker"
}

# 9. Pull Request Preparation
pr_prep() {
    local BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
        run_codex "PR Preparation" \
            "For branch $BRANCH:
            - Generate PR description
            - List all changes
            - Suggest reviewers
            - Check PR checklist compliance"
    else
        log "INFO" "Skipping PR prep - on main branch"
    fi
}

# 10. Daily Learning
daily_learning() {
    run_codex "Daily Learning Suggestion" \
        "Based on this codebase and recent work:
        - Suggest a relevant technical concept to learn
        - Provide a quick tutorial or explanation
        - Recommend resources for deeper learning"
}

# ============================================
# Main Execution
# ============================================

main() {
    local start_time=$(date +%s)
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Run all daily tasks
    standup_notes
    code_quality
    security_check
    test_coverage
    doc_review
    dependency_check
    performance_check
    todo_review
    pr_prep
    daily_learning
    
    # Generate summary report
    log "INFO" "Generating daily summary report..."
    
    $CODEX_CMD exec "Create a daily summary report from today's analysis including:
    - Key findings and metrics
    - Action items prioritized by importance
    - Recommendations for immediate attention
    - Progress trends
    Format as markdown" > daily-summary-${TODAY}.md
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "=========================================="
    log "SUCCESS" "Daily workflow completed in ${duration} seconds"
    log "INFO" "Reports saved to:"
    log "INFO" "  - Standup: standup-notes-${TODAY}.md"
    log "INFO" "  - Summary: daily-summary-${TODAY}.md"
    log "INFO" "  - Full log: ${LOG_FILE}"
    log "INFO" "=========================================="
    
    # Optional: Send notification
    if command -v notify-send &> /dev/null; then
        notify-send "Codex Daily Workflow" "Automation complete! Check daily-summary-${TODAY}.md"
    fi
}

# ============================================
# Error Handling
# ============================================

trap 'log "ERROR" "Script interrupted"; exit 1' INT TERM

# ============================================
# Script Entry Point
# ============================================

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [PROJECT_DIR]"
    echo ""
    echo "Automate daily development tasks using Codex CLI"
    echo ""
    echo "Options:"
    echo "  PROJECT_DIR    Path to project (default: current directory)"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  OPENAI_API_KEY    Your OpenAI API key"
    echo "  PROJECT_DIR       Override project directory"
    exit 0
fi

# Override project directory if provided
if [ -n "$1" ]; then
    PROJECT_DIR="$1"
fi

# Check if Codex is installed
if ! command -v $CODEX_CMD &> /dev/null; then
    echo "Error: Codex CLI is not installed"
    echo "Install with: npm install -g @openai/codex"
    exit 1
fi

# Run main workflow
main
