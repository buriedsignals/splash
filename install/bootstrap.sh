#!/usr/bin/env bash
# Splash bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys and receives
# none: it installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your
# keys — they are written straight to ~/Splash/.env, never passed on the command line.
set -euo pipefail

REPO="${SPLASH_REPO:-https://github.com/buriedsignals/splash}"   # confirm before public release (preflight-release.mjs)
REF="${SPLASH_REF:-main}"
DEST="$HOME/Splash"

# Shared skill-discovery helper for runtimes that read a skills directory (Codex, Gemini native
# skills, Goose). Symlinks every skill dir there by name; globs .dist/skills/*/ — the PACKAGED
# tree (step 5), never the engine checkout — so a skill added later is covered automatically.
# Claude Code uses --plugin-dir instead and does not call this.
#
# The target defaults to ~/.agents/skills and is overridable because not every host reads the same
# door: Claude Desktop scans ~/.claude/skills and never looks at ~/.agents/skills. One helper rather
# than one per host, so the two rules below — sweep dead links, link only what carries a SKILL.md —
# cannot drift apart between doors.
link_agents_skills() {
  local target="${1:-$HOME/.agents/skills}"
  mkdir -p "$target"
  # A renamed or moved source tree leaves links that EXIST but resolve to nothing — and to a host
  # a dead link is indistinguishable from an absent skill: it simply finds nothing, silently.
  # Sweep them first so an install that predates a rename repairs itself on re-run.
  for link in "$target"/*; do
    if [ -L "$link" ] && [ ! -e "$link" ]; then rm -f "$link"; fi
  done
  for skill_dir in "$DEST"/.dist/skills/*/; do
    # A host silently ignores a directory with no SKILL.md, so linking one (a production library
    # such as skills/image-native) inflates the link count while the host discovers one fewer
    # skill — measured on Goose Desktop: 12 linked, 11 discovered, and nothing said. Link only
    # what a host can read, so the two counts agree and a real gap shows up instead of hiding.
    [ -f "$skill_dir/SKILL.md" ] || continue
    ln -sfn "$skill_dir" "$target/$(basename "$skill_dir")"
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

# 3. Root dependencies. The setup page reads and writes the newsroom decor (lib/newsroom), which
# needs the root packages. Doing it here makes that dependency explicit and guarded, instead of
# leaving Bun to resolve it implicitly at the most critical moment of the install.
if ! ( cd "$DEST" && bun install >/dev/null ); then
  echo "Dependency install failed in $DEST (see the error above) — check your connection, then re-run this installer." >&2
  exit 1
fi

# 4. Local setup page — pick runtime + enter keys (verified live); writes ~/Splash/.env.
# Skip it on a re-run that already has a verified .env (set SPLASH_RECONFIGURE=1 to force it),
# so recovering from a later failure doesn't force re-entering and re-verifying every key.
if [ ! -f "$DEST/.env" ] || [ "${SPLASH_RECONFIGURE:-0}" = "1" ]; then
  echo "-> Opening the setup page in your browser to collect your keys…"
  if ! ( cd "$DEST" && bun install/configurator.ts ) || [ ! -f "$DEST/.env" ]; then
    echo "Configuration was not completed — re-run this installer." >&2
    exit 1
  fi
fi

# 5. Package what a host receives, then install its dependencies ONCE.
# The repo is the engine (20 640 files for map-native alone) and a host enumerates all of it,
# filters nothing and follows symlinks — load_skill then overflows and SKILL.md never reaches
# the model. The delivered tree drops node_modules/dist/tests/output-proof, and its dependencies
# install ABOVE the skill directories, where Bun resolves them and no host walks. This must run
# before step 6: runtime_install calls link_agents_skills, which globs $DEST/.dist/skills/*/.
echo "-> Packaging the skills…"
if ! ( cd "$DEST" && bun run pack-skills ); then
  echo "Packaging failed (see the error above) — re-run this installer." >&2
  exit 1
fi
echo "-> Installing render dependencies…"
if ! ( cd "$DEST/.dist" && bun install >/dev/null ); then
  echo "Dependency install failed in the packaged skills (see the error above) — check your connection, then re-run this installer." >&2
  exit 1
fi
# ONE download, from one skill, on purpose: Playwright caches per user and per browser revision
# (~/Library/Caches/ms-playwright on macOS), so map-native — and every other renderer — resolves
# the same executable this call fetches. Measured, both skills report the identical path. The
# decision holds only while those skills pin the SAME Playwright version, which
# install/native-browser.test.ts keeps true. Running it per skill would re-download nothing.
if ! ( cd "$DEST/.dist/skills/chart-native" && bunx playwright install chromium ); then
  echo "Playwright Chromium download failed (see above) — re-run this installer to resume." >&2
  exit 1
fi

# 6. Runtime — install the one the setup page recorded, via its module in install/runtimes/.
# Adding a runtime is a new install/runtimes/<name>.sh (see that dir's README), never a change here.
# The runtime lives in newsroom.json (the decor). install/read-runtime.ts resolves it — including
# the legacy .splash-runtime of an install that predates the setup page — and validates it against
# the shipped modules, so this variable is never an arbitrary string off disk.
runtime="$( cd "$DEST" && bun install/read-runtime.ts 2>/dev/null || echo claude )"
runtime_module="$DEST/install/runtimes/$runtime.sh"
if [ ! -f "$runtime_module" ]; then
  echo "No runtime module for '$runtime' (expected install/runtimes/$runtime.sh) — re-run the configurator and pick a supported runtime." >&2
  exit 1
fi
# shellcheck source=/dev/null
. "$runtime_module"
runtime_install

# 7. Local double-click launcher (created locally → no quarantine → clean re-launch).
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
