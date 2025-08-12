#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"

echo "Configuring Railway variables for project: $PROJECT_ID"

vars=(
  BYBIT_API_KEY
  BYBIT_API_SECRET
  BYBIT_RECV_WINDOW
  NODE_ENV
  ALLOWED_ORIGINS
  VITE_RAILWAY_API_URL
)

for v in "${vars[@]}"; do
  val=${!v-}
  if [ -n "${val:-}" ]; then
    railway variables set "$v"="$val" --project "$PROJECT_ID"
    echo "Set $v"
  else
    echo "Skip $v (not set)"
  fi

done

echo "Done."