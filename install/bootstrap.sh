#!/usr/bin/env bash
# Atelier bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys:
# the copy-paste one-liner and the downloaded launcher both set the key env vars BEFORE
# invoking this, and this script writes them into ~/Atelier/.env.
set -euo pipefail

REPO="https://github.com/buriedsignals/atelier"   # confirm before public release (preflight-release.mjs)
REF="${ATELIER_REF:-main}"
DEST="$HOME/Atelier"
NATIVE_SKILLS=("skills/chart-native" "skills/map-native")

echo "-> Installing Atelier (a few minutes)…"

# 1. Bun (its own installer — no package manager needed)
if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Runtime — Claude Code (native installer, lands in ~/.local/bin)
if ! command -v claude >/dev/null 2>&1; then
  echo "-> Installing Claude Code…"
  curl -fsSL https://claude.ai/install.sh | bash
fi
export PATH="$HOME/.local/bin:$PATH"

# 3. Atelier source (zip — no git; extracts to atelier-<ref>/)
if [ ! -d "$DEST" ]; then
  echo "-> Downloading Atelier…"
  tmp="$(mktemp -d)"
  curl -fsSL "$REPO/archive/$REF.zip" -o "$tmp/atelier.zip"
  unzip -q "$tmp/atelier.zip" -d "$tmp"
  mv "$tmp"/atelier-* "$DEST"
  rm -rf "$tmp"
fi

# 4. Producer deps + render engine (Playwright Chromium, shared cache)
echo "-> Installing render dependencies…"
for skill in "${NATIVE_SKILLS[@]}"; do
  ( cd "$DEST/$skill" && bun install >/dev/null 2>&1 )
done
( cd "$DEST/skills/chart-native" && bunx playwright install chromium )

# 5. Write ~/Atelier/.env from the env vars the caller set
echo "-> Writing configuration…"
cat > "$DEST/.env" <<ENV
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
VITE_MAPTILER_KEY=${VITE_MAPTILER_KEY:-}
REMOTION_MAPTILER_KEY=${REMOTION_MAPTILER_KEY:-}
DATAWRAPPER_API_TOKEN=${DATAWRAPPER_API_TOKEN:-}
ATELIER_EMBED_APP=${ATELIER_EMBED_APP:-}
FLY_API_TOKEN=${FLY_API_TOKEN:-}
ENV

# 6. Local double-click launcher (created locally → no quarantine → clean re-launch)
launcher="$DEST/Launch Atelier.command"
cat > "$launcher" <<'LAUNCH'
#!/usr/bin/env bash
cd "$(dirname "$0")" && set -a && . ./.env && set +a && claude --plugin-dir .
LAUNCH
chmod +x "$launcher"

echo ""
echo "Done! Double-click 'Launch Atelier.command' in $DEST to start."
echo "(Your keys live only in $DEST/.env, git-ignored.)"

# 7. Scrub the secrets from this process's environment
unset ANTHROPIC_API_KEY VITE_MAPTILER_KEY REMOTION_MAPTILER_KEY DATAWRAPPER_API_TOKEN FLY_API_TOKEN
