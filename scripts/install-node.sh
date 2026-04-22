#!/usr/bin/env bash
# install-node.sh
# Installs nvm, Node.js (version specified by .nvmrc or the engines field), npm,
# and opencode-ai (npm install -g opencode-ai).
# Usage: bash scripts/install-node.sh [node-version]
#   node-version  Optional. Defaults to the version in .nvmrc, then package.json engines, then "lts/*".

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo "[install-node] $*"; }
error() { echo "[install-node] ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Resolve the requested Node version
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ $# -ge 1 ]]; then
  NODE_VERSION="$1"
  info "Using Node version from CLI argument: ${NODE_VERSION}"
elif [[ -f "${REPO_ROOT}/.nvmrc" ]]; then
  NODE_VERSION="$(cat "${REPO_ROOT}/.nvmrc")"
  info "Using Node version from .nvmrc: ${NODE_VERSION}"
else
  # Fall back to the minimum version declared in package.json engines.node
  ENGINES_NODE=""
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    # Extract the leading version number from a semver range (e.g. ">=22.0.0" -> "22")
    # nvm accepts plain major versions and "lts/*", so we strip only leading range operators.
    ENGINES_NODE="$(node -e "try{const p=require('${REPO_ROOT}/package.json');const v=p?.engines?.node;if(v)process.stdout.write(v.replace(/^[^0-9]*/,'').replace(/\s.*$/,''));}catch(e){}"  2>/dev/null || true)"
  fi
  NODE_VERSION="${ENGINES_NODE:-lts/*}"
  info "Using Node version: ${NODE_VERSION}"
fi

# ---------------------------------------------------------------------------
# Install nvm
# ---------------------------------------------------------------------------
NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"

if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
  info "nvm already installed at ${NVM_DIR}"
else
  info "Installing nvm from ${NVM_INSTALL_URL} ..."
  curl -fsSL "${NVM_INSTALL_URL}" | bash
fi

# Load nvm into the current shell session
export NVM_DIR
# shellcheck source=/dev/null
\. "${NVM_DIR}/nvm.sh"

info "nvm version: $(nvm --version)"

# ---------------------------------------------------------------------------
# Install Node.js
# ---------------------------------------------------------------------------
info "Installing Node.js ${NODE_VERSION} ..."
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}"

info "Node version: $(node --version)"

# ---------------------------------------------------------------------------
# Update npm to latest
# ---------------------------------------------------------------------------
info "Updating npm to latest ..."
npm install -g npm@latest

info "npm version:  $(npm --version)"

# ---------------------------------------------------------------------------
# Install opencode-ai globally
# ---------------------------------------------------------------------------
info "Installing opencode-ai globally ..."
npm install -g opencode-ai

info "opencode version: $(opencode --version 2>/dev/null || echo "installed")"
info "Done. Node.js, npm, nvm, and opencode-ai are ready."
info ""
info "To activate nvm in future shell sessions, add the following to your shell rc file (~/.bashrc, ~/.zshrc, etc.):"
info '  export NVM_DIR="$HOME/.nvm"'
info '  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
