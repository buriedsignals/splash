#!/usr/bin/env bash
# Splash public installer — one static, reviewable script:
#
#   curl -fsSL https://buriedsignals.github.io/splash/install.sh | bash
#
# Fetches the signed public-installer bootstrap from GitHub release assets,
# verifies its SHA-256 against a digest pinned below, and runs the applicator
# to create a managed Splash checkout. Then installs Bun dependencies, the
# managed browser, and launches the protected setup page.
#
# Prerequisites: macOS or Linux; curl; git (for the pinned checkout).
set -euo pipefail

SPLASH_RELEASE_BASE="https://github.com/buriedsignals/splash/releases/download/v0.1.0"
BOOTSTRAP_SHA256="cfc35920ac7ad8d5615c7db12285103d69666b39d4ef863f691c62a4d89fc0f8"
BUNDLE_SHA256="992e50b3d78c239adc85dfe679f7972b5a27bca94985e776b047a4351d47a6e4"
INSTALL_PATH="${SPLASH_INSTALL_PATH:-$HOME/Documents/Splash}"
RUNTIME="${SPLASH_RUNTIME:-goose}"
SKIP_SETUP="${SPLASH_SKIP_SETUP:-0}"

log()  { printf '→ %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required"
command -v git  >/dev/null 2>&1 || { echo "git is required — install it from https://git-scm.com" >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || die "sha256sum or shasum is required"

digest() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

# ── 1. Fetch and verify bootstrap ──
log "Fetching the signed public-installer bootstrap…"
curl -fL --proto '=https' --tlsv1.2 "$SPLASH_RELEASE_BASE/bootstrap.sh" -o "$TMP/bootstrap.sh"
ACTUAL="$(digest "$TMP/bootstrap.sh")"
if [ "$ACTUAL" != "$BOOTSTRAP_SHA256" ]; then
  die "bootstrap digest mismatch: expected $BOOTSTRAP_SHA256, got $ACTUAL — the download may be corrupted or tampered with"
fi
ok "bootstrap verified ($ACTUAL)"

# ── 2. Run the applicator ──
log "Installing Splash into $INSTALL_PATH (runtime: $RUNTIME)…"
bash "$TMP/bootstrap.sh" \
  --product splash \
  --release-base "$SPLASH_RELEASE_BASE" \
  --install-path "$INSTALL_PATH" \
  --runtime "$RUNTIME" \
  --bundle-sha256 "$BUNDLE_SHA256"
ok "applicator completed"

# ── 3. Bun dependency install ──
if ! command -v bun >/dev/null 2>&1; then
  warn "Bun is not installed."
  printf 'Install it now? [Y/n] '
  read -r ans </dev/tty || ans="Y"
  if [[ ! "$ans" =~ ^[Nn] ]]; then
    log "Installing Bun…"
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    command -v bun >/dev/null 2>&1 || die "Bun installation did not produce a bun binary on PATH"
  else
    die "Bun is required. Install it from https://bun.sh, then rerun this command."
  fi
fi
ok "Bun $(bun --version)"

log "Installing production dependencies (this may take a minute)…"
(cd "$INSTALL_PATH" && bun install --frozen-lockfile --production)
ok "dependencies installed"

# ── 4. Managed browser ──
log "Checking managed browser…"
if [ -f "$HOME/.local/share/buriedsignals/runtime/splash-browser/browser.json" ]; then
  ok "managed browser already installed"
else
  (cd "$INSTALL_PATH" && bun installer/install-browser.mjs \
    --checkout-root "$INSTALL_PATH" \
    --runtime-root "$HOME/.local/share/buriedsignals/runtime/splash-browser") \
    && ok "managed browser installed" \
    || warn "browser install failed — visual proofs will fall back to system Chrome"
fi

# ── 5. Protected setup ──
if [ "$SKIP_SETUP" = "1" ]; then
  echo ""
  echo "Splash is installed from $INSTALL_PATH."
  echo "Onboarding skipped — run the setup page anytime:"
  echo "  bun $INSTALL_PATH/installer/configure.mjs --root $INSTALL_PATH"
else
  log "Opening protected setup for credentials and your newsroom profile…"
  SETUP_EXIT=0
  bun "$INSTALL_PATH/installer/configure.mjs" \
    --root "$INSTALL_PATH" --headless --idle-ms 60000 || SETUP_EXIT=$?
  if [ "$SETUP_EXIT" -ne 0 ]; then
    warn "Setup ended early (exit $SETUP_EXIT). Nothing was damaged."
  fi
  echo ""
  echo "Splash is installed from $INSTALL_PATH."
  if [ "$SETUP_EXIT" -eq 0 ]; then
    echo "Setup complete — open your agent and start creating visuals."
  else
    echo "Reopen setup via: bun $INSTALL_PATH/installer/configure.mjs --root $INSTALL_PATH"
  fi
fi
