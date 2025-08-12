#!/usr/bin/env bash
set -euo pipefail
APPLY="${1:-}"

say() { echo "[$(date +%H:%M:%S)] $*"; }

# Targets
JUNK=(".DS_Store" "Thumbs.db" ".vscode")
ARTIFACTS=("dist" "build" ".next" "out")
ENVFILES=(".env" ".env.local" ".env.production" ".env.development")

clean_path () {
  local p="$1"
  if [ -e "$p" ]; then
    if [ "$APPLY" = "--apply" ]; then
      rm -rf "$p" && say "removed $p"
    else
      say "would remove $p"
    fi
  fi
}

say "Repo cleanup (dry run unless --apply)"
for j in "${JUNK[@]}"; do
  git ls-files | grep -E "(^|/)$j$" || true
  git ls-files | grep -E "(^|/)$j$" | while read -r f; do clean_path "$f"; done
done

for a in "${ARTIFACTS[@]}"; do
  git ls-files | grep -E "(^|/)$a(/|$)" || true
  git ls-files | grep -E "(^|/)$a(/|$)" | while read -r f; do clean_path "$f"; done
done

for e in "${ENVFILES[@]}"; do
  git ls-files | grep -E "(^|/)$e$" || true
  git ls-files | grep -E "(^|/)$e$" | while read -r f; do
    if [ "$APPLY" = "--apply" ]; then
      git rm --cached "$f" || true
      say "untracked $f (remember to rotate secrets)"
    else
      say "would untrack $f (rotate secrets after)"
    fi
  done
done

if [ "$APPLY" = "--apply" ]; then
  echo -e "\n.env\n.env.*\n!.env.example" >> .gitignore
  say "appended env ignores to .gitignore"
fi

say "done" 