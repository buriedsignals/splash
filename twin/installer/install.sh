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
#   bash install.sh --provision-from-public-bundle
#                                        called BY the signed installer channel, never by hand
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
#
# PROVISIONED MODE. When Splash is installed through the signed public channel, an engine-built
# bootstrap has ALREADY verified a signature, checked out this repository at its pinned ref, created
# the profile and workspace directories, placed the canonical skills store and written an install
# receipt — and only then does it run THIS script with --provision-from-public-bundle. The flag
# means one thing, and it is what Mycroft and Spotlight both make it mean
# (mycroft/install.sh:1134-1139, spotlight/install-spotlight.sh:864-869): the checkout already
# exists, so ASSERT it and never create it. Everything after that point is unchanged, because every
# later step is idempotent and re-running it is how the two shipped products behave too.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(cd "$HERE/.." && pwd)"

ROOT=""
DRY_RUN=0
HEADLESS=0
SKIP_CONFIGURE=0
PROVISIONED=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --headless) HEADLESS=1; shift ;;
    --skip-configure) SKIP_CONFIGURE=1; shift ;;
    --provision-from-public-bundle) PROVISIONED=1; shift ;;
    -h|--help) sed -n '1,30p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# The default root differs by mode, so it is resolved after parsing rather than before. Provisioned,
# the root is not a destination to copy into — it IS the checkout the bundle made, the one the
# receipt owns and the canonical skills store already points at. Choosing anything else would give a
# journalist two trees and leave the bundle's symlinks aimed at the one they are not using.
if [ -z "$ROOT" ]; then
  if [ "$PROVISIONED" = 1 ]; then ROOT="$SOURCE"; else ROOT="$HOME/Splash"; fi
fi

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

if [ "$PROVISIONED" = 1 ]; then
  say "2/6  Using the checkout the signed bundle created"
  # Assert, never create — the same check and the same refusal as
  # spotlight/install-spotlight.sh:864-869. If the tree is not here, something upstream failed
  # silently and copying a second one would hide it.
  #
  # Spotlight tests `[ -d "$SPOTLIGHT_DIR/.git" ]` because its product root IS its repository root.
  # Splash's is not: the product sits at twin/ inside the checkout, so .git is one level above the
  # root that holds package.json and skills/. The two things worth asserting are therefore separate
  # — the Splash root's own markers, and a checkout at or above it — and written this way the check
  # also passes unchanged if the published repository is ever laid out product-at-root like theirs.
  for required in skills package.json; do
    [ -e "$ROOT/$required" ] || {
      echo "Splash installer: the signed public bundle did not create the product checkout ($ROOT/$required is missing)" >&2
      exit 1
    }
  done
  checkout_root="$ROOT"
  while [ ! -e "$checkout_root/.git" ] && [ "$checkout_root" != "/" ]; do
    checkout_root="$(dirname "$checkout_root")"
  done
  [ -e "$checkout_root/.git" ] || {
    echo "Splash installer: $ROOT is not inside a git checkout; the signed bundle did not create it" >&2
    exit 1
  }
  echo "   checkout at $checkout_root, Splash root $ROOT ($(ls "$ROOT/skills" | wc -l | tr -d ' ') skills)"
else

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
