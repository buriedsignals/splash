#!/usr/bin/env bash
# Splash — installer.
#
# THIS FILE CONTAINS NO KEYS AND RECEIVES NONE. Every secret is typed into a page this script starts
# on your own machine, at 127.0.0.1, so nothing lands in your shell history or on any hosted page.
# The shape is Spotlight's, deliberately: one static reviewable script, a local configurator, keys
# staged to a 0600 file, and a `doctor` that has the last word.
#
# Usage:
#   bash install.sh                      install into ~/Splash from this checkout
#   bash install.sh --root ~/Newsroom    install somewhere else
#   bash install.sh --dry-run            print every step, change nothing
#   bash install.sh --headless           do not open a browser (the configurator URL is printed)
#   bash install.sh --skip-configure     leave keys and NEWSROOM.md for later
#
# WHAT IT INSTALLS, and why it is the whole tree rather than a handful of files. A Splash root has
# to be ONE directory that is at once: the package `bun install` runs in, the owner of the single
# `.env`, the `#shared/*` resolution root every beat imports through, the parent of `stories/`, and
# the directory the hosts' symlinks point into. Those five were not one directory before, which is
# how a producer came to read the developer's `.env` while the journalist's key sat unread in their
# own root. Making them one directory is what makes both resolutions land on the same file by
# construction rather than by care.
#
# It does NOT: install Bun, choose your AI host's model, or touch anything under a host's own
# configuration except the one skills symlink each host reads.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(cd "$HERE/.." && pwd)"

ROOT="$HOME/Splash"
DRY_RUN=0
HEADLESS=0
SKIP_CONFIGURE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --headless) HEADLESS=1; shift ;;
    --skip-configure) SKIP_CONFIGURE=1; shift ;;
    -h|--help) sed -n '1,30p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
run() { if [ "$DRY_RUN" = 1 ]; then printf '   would run: %s\n' "$*"; else "$@"; fi; }

case "$(uname -s)" in
  Darwin|Linux) ;;
  *) echo "macOS or Linux only. On Windows, use WSL." >&2; exit 1 ;;
esac

say "1/6  Checking the toolchain"
if ! command -v bun >/dev/null 2>&1; then
  cat >&2 <<'EOF'
   bun is not on your PATH, and every producer in Splash is a `bun` command.
   Install it with:  curl -fsSL https://bun.sh/install | bash
   Then open a new terminal and run this installer again.
EOF
  exit 1
fi
echo "   bun $(bun --version) at $(command -v bun)"

say "2/6  Copying Splash into $ROOT"
# The root template first (package.json, tsconfig.json, NEWSROOM.example.md, shared/), then the
# skills and the plugin manifest that the Claude-family door requires.
run mkdir -p "$ROOT"
if [ "$DRY_RUN" = 1 ]; then
  echo "   would copy: root-template/. skills/ .claude-plugin/ installer/  →  $ROOT"
else
  cp -R "$SOURCE/skills/splash-twin/assets/root-template/." "$ROOT/"
  cp -R "$SOURCE/skills" "$ROOT/skills"
  cp -R "$SOURCE/.claude-plugin" "$ROOT/.claude-plugin"
  cp -R "$SOURCE/installer" "$ROOT/installer"
  # A skill directory must never carry a node_modules: on Goose, `load_skill` enumerates a skill's
  # whole directory into the model's context, and the original's monolith reached 294 111 characters
  # that way and was dumped, the prose never arriving. The twin's largest payload is 38 642 against
  # a 200 000 threshold, and that margin exists ONLY because no skill directory holds one.
  find "$ROOT/skills" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
  echo "   copied $(ls "$ROOT/skills" | wc -l | tr -d ' ') skills"
fi

say "3/6  Installing dependencies"
if [ "$DRY_RUN" = 1 ]; then
  echo "   would run: bun install  (in $ROOT)"
else
  (cd "$ROOT" && bun install)
fi

say "4/6  Keys and the newsroom's identity"
if [ "$SKIP_CONFIGURE" = 1 ]; then
  echo "   skipped. Run later:  bun $ROOT/installer/configure.mjs --root $ROOT"
elif [ "$DRY_RUN" = 1 ]; then
  echo "   would start the local configurator on 127.0.0.1 (ephemeral port)"
else
  echo "   Starting a setup page on your own machine. Keys typed there never reach your shell history."
  if [ "$HEADLESS" = 1 ]; then
    bun "$ROOT/installer/configure.mjs" --root "$ROOT" --headless
  else
    bun "$ROOT/installer/configure.mjs" --root "$ROOT"
  fi
fi

say "5/6  Wiring the doors your AI hosts read"
run bun "$ROOT/installer/place-skills.mjs" --root "$ROOT"

say "6/6  Writing splash-twin-doctor, then running it"
# A generated doctor, pinned to THIS root, in the place a shell will already find. Spotlight writes
# `spotlight-doctor` the same way and for the same reason: after the install, the only question a
# journalist needs answered is "is it still well?", and it has to be answerable without them
# remembering where anything went.
BIN="$HOME/.local/bin"
if [ "$DRY_RUN" = 1 ]; then
  echo "   would write $BIN/splash-twin-doctor  →  bun $ROOT/installer/doctor.mjs --root $ROOT"
else
  mkdir -p "$BIN"
  cat > "$BIN/splash-twin-doctor" <<EOF
#!/usr/bin/env bash
# Generated by the Splash installer. Checks the host wiring, then hands the last word to Splash's
# own preflight. Re-generated by re-running the installer.
exec bun "$ROOT/installer/doctor.mjs" --root "$ROOT" "\$@"
EOF
  chmod +x "$BIN/splash-twin-doctor"
  echo "   wrote $BIN/splash-twin-doctor"
  case ":$PATH:" in
    *":$BIN:"*) ;;
    *) echo "   note: $BIN is not on your PATH — call it by its full path, or add it." ;;
  esac
fi

if [ "$DRY_RUN" = 1 ]; then
  echo; echo "Dry run — nothing was changed."; exit 0
fi

echo
bun "$ROOT/installer/doctor.mjs" --root "$ROOT" || true

cat <<EOF

Splash is installed at $ROOT.

  Ask your AI assistant:   "use splash-twin to make a chart from this article"
  Check it is still well:  splash-twin-doctor

Your stories live in $ROOT/stories/. Everything Splash produces is a file you own, in there.
EOF
