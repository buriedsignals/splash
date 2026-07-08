#!/usr/bin/env bash
# Atelier bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys and receives
# none: it installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your
# keys — they are written straight to ~/Atelier/.env, never passed on the command line.
set -euo pipefail

REPO="https://github.com/buriedsignals/atelier"   # confirm before public release (preflight-release.mjs)
REF="${ATELIER_REF:-main}"
DEST="$HOME/Atelier"
NATIVE_SKILLS=("skills/chart-native" "skills/map-native")

echo "-> Installing Atelier (a few minutes)…"

# 1. Bun (its own installer — needed to run the configurator and the skills)
if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Atelier source (zip — no git; contains the configurator)
if [ ! -d "$DEST" ]; then
  echo "-> Downloading Atelier…"
  tmp="$(mktemp -d)"
  curl -fsSL "$REPO/archive/$REF.zip" -o "$tmp/atelier.zip"
  unzip -q "$tmp/atelier.zip" -d "$tmp"
  mv "$tmp"/atelier-* "$DEST"
  rm -rf "$tmp"
fi

# 3. Local configurator — pick runtime + enter keys (verified live); writes ~/Atelier/.env
echo "-> Opening the configurator in your browser to collect your keys…"
if ! ( cd "$DEST" && bun install/configurator.ts ) || [ ! -f "$DEST/.env" ]; then
  echo "Configuration was not completed — re-run this installer." >&2
  exit 1
fi

# 4. Runtime — install the one the configurator recorded (Claude Code today)
runtime="$(cat "$DEST/.atelier-runtime" 2>/dev/null || echo claude)"
if [ "$runtime" = "claude" ] && ! command -v claude >/dev/null 2>&1; then
  echo "-> Installing Claude Code…"
  curl -fsSL https://claude.ai/install.sh | bash
fi
export PATH="$HOME/.local/bin:$PATH"

# 5. Producer deps + render engine (Playwright Chromium, shared cache)
echo "-> Installing render dependencies…"
for skill in "${NATIVE_SKILLS[@]}"; do
  ( cd "$DEST/$skill" && bun install >/dev/null 2>&1 )
done
( cd "$DEST/skills/chart-native" && bunx playwright install chromium )

# 6. Local double-click launcher (created locally → no quarantine → clean re-launch)
launcher="$DEST/Launch Atelier.command"
cat > "$launcher" <<'LAUNCH'
#!/usr/bin/env bash
cd "$(dirname "$0")" && set -a && . ./.env && set +a && claude --plugin-dir .
LAUNCH
chmod +x "$launcher"

echo ""
echo "Done! Double-click 'Launch Atelier.command' in $DEST to start."
echo "(Your keys live only in $DEST/.env, chmod 600.)"
