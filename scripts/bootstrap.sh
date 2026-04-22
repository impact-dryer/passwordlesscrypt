#!/usr/bin/env bash
# bootstrap.sh
# Entry-point bootstrap script. Runs all setup steps needed to get a fresh
# machine ready for development:
#   1. Installs nvm, Node.js, npm, and opencode-ai.
#
# Usage: bash scripts/bootstrap.sh [node-version]
#   node-version  Optional. Forwarded to install-node.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info()  { echo "[bootstrap] $*"; }
error() { echo "[bootstrap] ERROR: $*" >&2; exit 1; }

info "Starting bootstrap ..."

# ---------------------------------------------------------------------------
# Step 1 – Install nvm, Node.js, npm, and opencode-ai
# ---------------------------------------------------------------------------
info "Running install-node.sh ..."
bash "${SCRIPT_DIR}/install-node.sh" "$@"

info "Bootstrap complete."
