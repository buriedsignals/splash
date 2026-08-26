#!/usr/bin/env bash
# Splash development installer.
#
# One command adopts the current checkout through Engine, installs the complete root dependency and
# browser payload, smoke-tests it, projects the shipped skills, and wires Goose when present. Public
# release download/signing and immutable source pins are intentionally not part of development setup.
#
# Usage:
#   bash installer/install.sh
#   bash installer/install.sh --root /absolute/path/to/splash
#   bash installer/install.sh --stories-root /absolute/path/to/stories
#   bash installer/install.sh --bsig /absolute/path/to/bsig
#   bash installer/install.sh --dry-run

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(cd "$HERE/.." && pwd)"
ROOT="$SOURCE"
STORIES_ROOT="$HOME/.local/share/splash-stories"
BSIG_PATH=""
DRY_RUN=0
SKILL_NAMESPACE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    --stories-root) STORIES_ROOT="$2"; shift 2 ;;
    --bsig) BSIG_PATH="$2"; shift 2 ;;
    --skill-namespace) SKILL_NAMESPACE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '1,15p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$SKILL_NAMESPACE" in
  "") ;;
  [A-Za-z0-9]*)
    case "$SKILL_NAMESPACE" in
      *[!A-Za-z0-9_-]*) echo "invalid skill namespace: $SKILL_NAMESPACE" >&2; exit 2 ;;
    esac
    ;;
  *) echo "invalid skill namespace: $SKILL_NAMESPACE" >&2; exit 2 ;;
esac

case "$(uname -s)" in
  Darwin|Linux) ;;
  *) echo "This development installer currently supports macOS and Linux. Other topologies remain unclaimed." >&2; exit 1 ;;
esac

for required in package.json bun.lock skills apps/goose/server.mjs installer/enrol-engine.mjs; do
  [ -e "$ROOT/$required" ] || { echo "Splash checkout marker is missing: $ROOT/$required" >&2; exit 1; }
done

command -v bun >/dev/null 2>&1 || {
  echo "Bun is required. Install it from https://bun.sh/docs/installation, then rerun this command." >&2
  exit 1
}

if [ -z "$BSIG_PATH" ]; then BSIG_PATH="$(command -v bsig || true)"; fi
if [ -z "$BSIG_PATH" ]; then
  echo "Engine is required. Install bsig, then rerun this same command; Splash does not download Engine during development." >&2
  exit 1
fi

if [ "$DRY_RUN" = 1 ]; then
  printf 'would adopt and apply %s through %s\n' "$ROOT" "$BSIG_PATH"
  printf 'would preserve stories under %s\n' "$STORIES_ROOT"
  printf 'would project the shipped skills from %s into the shared agents store\n' "$ROOT"
  exit 0
fi

(
  # Bun treats an explicitly empty BUN_INSPECT_PRELOAD as a real preload path. Remove inherited
  # loader controls instead of replacing them with empty values before entering the trusted wrapper.
  unset BUN_OPTIONS BUN_INSPECT_PRELOAD BUN_INSPECT_NOTIFY NODE_OPTIONS NODE_PATH
  bun --no-env-file "$ROOT/installer/enrol-engine.mjs" \
    --root "$ROOT" --stories-root "$STORIES_ROOT" \
    --newsroom-path "$HOME/.config/splash/NEWSROOM.md" --skill-namespace "$SKILL_NAMESPACE" \
    --bsig "$BSIG_PATH"
)

# Surface real doctor findings instead of swallowing them: a nonzero result warns loudly but
# does not abort, because the Engine apply transaction above already gated activation on smoke.
DOCTOR_EXIT=0
"$BSIG_PATH" doctor --product splash || DOCTOR_EXIT=$?
if [ "$DOCTOR_EXIT" -ne 0 ]; then
  printf '\nWarning: bsig doctor reported problems (exit %s). Run it again with --json for details.\n' "$DOCTOR_EXIT" >&2
fi

# After a successful apply, optionally open the same newsroom setup page the studio uses.
# Provider keys are saved in Indicator Labs, not on this page.
SPLASH_SETUP_STATE="skipped"
if [ "${SPLASH_SKIP_SETUP:-}" != "1" ]; then
  SETUP_EXIT=0
  bun --no-env-file "$ROOT/installer/configure.mjs" \
    --root "$ROOT" --bsig "$BSIG_PATH" || SETUP_EXIT=$?
  if [ "$SETUP_EXIT" -eq 0 ]; then
    SPLASH_SETUP_STATE="closed"
  else
    printf '\nSetup ended early (exit %s). Nothing was damaged.\n' "$SETUP_EXIT"
  fi
fi

printf '\nSplash is installed from %s.\n' "$ROOT"
if [ "$SPLASH_SETUP_STATE" = "closed" ]; then
  printf 'Newsroom setup closed — saves made there are kept. Reopen anytime via Splash Readiness → “Set up newsroom”. Save MapTiler, Datawrapper, and Cloudflare keys in Indicator Labs.\n'
else
  printf 'Newsroom identity may still be unset. Open Splash Readiness → “Set up newsroom” when ready. Save provider keys in Indicator Labs.\n'
fi
printf 'Rerun this same command after intentional source or lockfile changes.\n'
