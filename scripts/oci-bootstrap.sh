#!/usr/bin/env bash
# OCI bootstrap script: install Docker + Compose, configure env, and run phase-1 stack
set -euo pipefail

REPO_DIR="/opt/ats"
REPO_URL="https://github.com/banky420star/sb1-dapxyzdb.git"
COMPOSE_FILE="docker-compose.phase1.yml"

log() { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err() { echo -e "\033[1;31m[✗]\033[0m $*"; }

require_root() {
  if [[ $(id -u) -ne 0 ]]; then
    err "Run as root (use sudo)."
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed: $(docker --version)"
    return
  fi
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
}

install_compose_plugin() {
  if docker compose version >/dev/null 2>&1; then
    log "Docker Compose v2 plugin present."
    return
  fi
  log "Installing Docker Compose v2 plugin..."
  mkdir -p /usr/local/lib/docker/cli-plugins
  ARCH=$(uname -m)
  OS=$(uname -s)
  curl -SL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-${OS}-${ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  docker compose version || warn "Compose plugin installed but not responding; ensure Docker is running."
}

clone_repo() {
  if [[ -d "${REPO_DIR}/.git" ]]; then
    log "Repo exists at ${REPO_DIR}. Pulling latest..."
    git -C "${REPO_DIR}" fetch --all --prune || true
    git -C "${REPO_DIR}" reset --hard origin/HEAD || true
  else
    log "Cloning repo to ${REPO_DIR}..."
    mkdir -p "${REPO_DIR}"
    git clone "${REPO_URL}" "${REPO_DIR}"
  fi
}

ensure_env() {
  cd "${REPO_DIR}"
  if [[ ! -f .env ]]; then
    log "Creating .env from env.example..."
    cp -n env.example .env || touch .env
  fi
  # Ensure required minimal variables exist
  grep -q '^NODE_ENV=' .env || echo 'NODE_ENV=production' >> .env
  grep -q '^PORT=' .env || echo 'PORT=8000' >> .env
  grep -q '^GRAFANA_PASSWORD=' .env || echo "GRAFANA_PASSWORD=admin" >> .env
  grep -q '^POSTGRES_PASSWORD=' .env || echo "POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo change_me)" >> .env
  grep -q '^REDIS_PASSWORD=' .env || echo "REDIS_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo change_me)" >> .env
}

bring_up_stack() {
  cd "${REPO_DIR}"
  log "Building and starting services from ${COMPOSE_FILE}..."
  docker compose -f "${COMPOSE_FILE}" up -d --build
}

health_check() {
  log "Waiting for API to start..."
  for i in {1..30}; do
    if curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
      log "API healthy at http://<server-ip>:8000/api/health"
      break
    fi
    sleep 3
  done || true
}

print_summary() {
  local ip
  ip=$(curl -s http://checkip.amazonaws.com || hostname -I | awk '{print $1}')
  echo ""
  echo "Endpoints:"
  echo "- API:        http://${ip}:8000/api/health"
  echo "- Frontend:   http://${ip}:3000/"
  echo "- Grafana:    http://${ip}:3001/ (admin / ${GRAFANA_PASSWORD:-admin})"
  echo "- Prometheus: http://${ip}:9090/"
  echo ""
  echo "Next steps:"
  echo "- Open ports 80, 443, 3000, 3001, 8000, 9090 in OCI security list"
  echo "- Set BYBIT_API_KEY and BYBIT_API_SECRET in ${REPO_DIR}/.env if trading live"
}

main() {
  require_root
  install_docker
  install_compose_plugin
  clone_repo
  ensure_env
  bring_up_stack
  health_check
  print_summary
}

main "$@"
