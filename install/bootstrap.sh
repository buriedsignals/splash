#!/usr/bin/env bash
# Splash bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys and receives
# none: it installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your
# keys — they are written straight to ~/Splash/.env, never passed on the command line.
set -euo pipefail

REPO="${SPLASH_REPO:-${ATELIER_REPO:-https://github.com/buriedsignals/splash}}"   # confirm before public release (preflight-release.mjs)
REF="${SPLASH_REF:-${ATELIER_REF:-main}}"
DEST="$HOME/Splash"
NATIVE_SKILLS=("skills/chart-native" "skills/map-native")

# Shared skill-discovery helper for runtimes that read ~/.agents/skills/ (Codex, Gemini native
# skills). Symlinks every skill dir there by name; globs skills/*/ so a skill added later is
# covered automatically. Claude Code uses --plugin-dir instead and does not call this.
link_agents_skills() {
  mkdir -p "$HOME/.agents/skills"
  for skill_dir in "$DEST"/skills/*/; do
    ln -sfn "$skill_dir" "$HOME/.agents/skills/$(basename "$skill_dir")"
  done
}

echo "-> Installing Splash (a few minutes)…"

# 1. Bun (its own installer — needed to run the configurator and the skills)
if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Splash source (zip — no git; contains the configurator)
if [ ! -d "$DEST" ]; then
  echo "-> Downloading Splash…"
  tmp="$(mktemp -d)"
  curl -fsSL "$REPO/archive/$REF.zip" -o "$tmp/splash.zip"
  unzip -q "$tmp/splash.zip" -d "$tmp"
  mv "$tmp"/splash-* "$DEST"
  rm -rf "$tmp"
fi

# 3. Local configurator — pick runtime + enter keys (verified live); writes ~/Splash/.env.
# Skip it on a re-run that already has a verified .env (set SPLASH_RECONFIGURE=1 to force it),
# so recovering from a later failure doesn't force re-entering and re-verifying every key.
if [ ! -f "$DEST/.env" ] || [ "${SPLASH_RECONFIGURE:-${ATELIER_RECONFIGURE:-0}}" = "1" ]; then
  echo "-> Opening the configurator in your browser to collect your keys…"
  if ! ( cd "$DEST" && bun install/configurator.ts ) || [ ! -f "$DEST/.env" ]; then
    echo "Configuration was not completed — re-run this installer." >&2
    exit 1
  fi
fi

# 4. Runtime — install the one the configurator recorded, via its module in install/runtimes/.
# Adding a runtime is a new install/runtimes/<name>.sh (see that dir's README), never a change here.
runtime="$(cat "$DEST/.splash-runtime" 2>/dev/null || echo claude)"
runtime_module="$DEST/install/runtimes/$runtime.sh"
if [ ! -f "$runtime_module" ]; then
  echo "No runtime module for '$runtime' (expected install/runtimes/$runtime.sh) — re-run the configurator and pick a supported runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
. "$runtime_module"
runtime_install

# 5. Producer deps + render engine (Playwright Chromium, shared cache). Keep stderr visible and
# guard each step: a failed install here (flaky wifi, proxy, full disk) must report its cause and
# stop with guidance — not die silently under `set -e` after the .env was already written.
echo "-> Installing render dependencies…"
for skill in "${NATIVE_SKILLS[@]}"; do
  if ! ( cd "$DEST/$skill" && bun install >/dev/null ); then
    echo "Dependency install failed in $skill (see the error above) — check your connection, then re-run this installer." >&2
    exit 1
  fi
done
if ! ( cd "$DEST/skills/chart-native" && bunx playwright install chromium ); then
  echo "Playwright Chromium download failed (see above) — re-run this installer to resume." >&2
  exit 1
fi

# 6. Local double-click launcher (created locally → no quarantine → clean re-launch).
# The runtime module supplies the launch command for the recorded runtime.
launch_cmd="$(runtime_launch_cmd)"
launcher="$DEST/Launch Splash.command"
cat > "$launcher" <<LAUNCH
#!/usr/bin/env bash
cd "\$(dirname "\$0")" && set -a && . ./.env && set +a && $launch_cmd
LAUNCH
chmod +x "$launcher"

echo ""
echo "Done! Double-click 'Launch Splash.command' in $DEST to start."
echo "(Your keys live only in $DEST/.env, chmod 600.)"
