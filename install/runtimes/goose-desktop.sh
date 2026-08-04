# Goose Desktop runtime module (macOS). Sourced by bootstrap.sh — see ./README.md.
#
# This is the NEWSROOM-facing runtime: the journalist installs once by double-click, then launches
# Splash from the Dock like any application and never sees a terminal again. The CLI module
# (goose.sh) stays for developer use — same agent, different audience.
#
# Goose is model-agnostic and the desktop app owns its own provider screen, so this module bakes no
# provider key. The Splash setup page collects the PRODUCT keys (MapTiler, Datawrapper); the
# journalist picks their model inside Goose.
#
# Everything below that is not obvious was MEASURED on Goose Desktop 1.45.0 — see
# docs/installer/goose-desktop-findings.md, which the comments cite by finding number.

# The bundle path. Overridable so the hermetic tests can stand up a stub bundle without writing
# into /Applications; production never sets it.
GOOSE_APP="${GOOSE_APP:-/Applications/Goose.app}"

# The desktop app is NOT the CLI release: it ships as a .zip of the .app (no .dmg to mount), and the
# release owner moved — github.com/block/goose now only redirects here (F4). Apple Silicon and Intel
# are different assets, and shipping one to the other is a silent wrong install.
GOOSE_DESKTOP_RELEASE="https://github.com/aaif-goose/goose/releases/latest/download"

runtime_install() {
  if [ ! -d "$GOOSE_APP" ]; then
    # F1 — a .zip unpacked in Downloads and double-clicked runs from a temporary, read-only
    # AppTranslocation mount. The bundle is then absent from /Applications while Goose is RUNNING,
    # so the check above is false for an app that exists. Reinstalling over that is the wrong move:
    # say what to do instead.
    if pgrep -f "AppTranslocation/.*Goose\.app" >/dev/null 2>&1; then
      echo "Goose Desktop is running from a temporary, read-only copy (macOS moves a quarantined app there). Drag Goose.app into your Applications folder, quit and reopen it, then re-run this installer." >&2
      exit 1
    fi
    echo "-> Installing Goose Desktop…"
    # Homebrew when it is there — self-updating and clean to remove. The cask is `block-goose`;
    # a cask named `goose` does not exist (F4).
    if command -v brew >/dev/null 2>&1; then
      brew install --cask block-goose >/dev/null 2>&1 || true
    fi
    # Otherwise the direct channel, because Homebrew is not a reasonable prerequisite for a
    # journalist.
    if [ ! -d "$GOOSE_APP" ]; then
      asset="Goose.zip"
      [ "$(uname -m)" = "x86_64" ] && asset="Goose_intel_mac.zip"
      tmp="$(mktemp -d)"
      if curl -fsSL "$GOOSE_DESKTOP_RELEASE/$asset" -o "$tmp/goose.zip"; then
        # ditto, not unzip: it preserves the bundle's resource forks and code signature.
        if ditto -x -k "$tmp/goose.zip" "$tmp/unpacked" 2>/dev/null; then
          cp -R "$tmp/unpacked/Goose.app" "$(dirname "$GOOSE_APP")/" 2>/dev/null || true
          # A downloaded bundle carries the quarantine flag, which is what sends a launch through
          # AppTranslocation (F1). Installing it ourselves means it never reaches the journalist
          # quarantined, so the trap above stays a diagnostic rather than a routine.
          xattr -dr com.apple.quarantine "$GOOSE_APP" 2>/dev/null || true
        fi
      fi
      rm -rf "$tmp"
    fi
  fi
  if [ ! -d "$GOOSE_APP" ]; then
    echo "Goose Desktop could not be installed. Install it from https://block.github.io/goose, then re-run this installer." >&2
    exit 1
  fi
  # Wire skill discovery. The app reads ~/.agents/skills — the directory the shared helper already
  # fills — and it follows symlinks, so there is nothing to copy and no second root to mirror
  # (findings Q1, Q2).
  link_agents_skills
  ensure_bun_on_login_path
}

# F3 — why an install-time check earns its keep.
#
# Launched from the Dock, the app inherits the bare launchd PATH (/usr/bin:/bin:/usr/sbin:/sbin) and
# recovers the real one by spawning a LOGIN + INTERACTIVE shell, whose PATH it then injects into
# every command it runs. So a producer finds `bun` only if the journalist's own shell profile
# exports it. bootstrap.sh puts $BUN_INSTALL/bin on PATH for its own lifetime only; what makes it
# survive is Bun's installer appending the export to the profile — a third party editing a file.
#
# When that has not happened the failure is SILENT and lands far from its cause: the app finds the
# skills, reads the prose, runs the command, and reports `command not found: bun`. One check here,
# and that whole failure mode disappears.
ensure_bun_on_login_path() {
  login_shell="${SHELL:-/bin/zsh}"
  # The same shape goose itself probes with, stdin closed so an interactive profile cannot block.
  if "$login_shell" -l -i -c 'command -v bun' >/dev/null 2>&1 </dev/null; then return 0; fi

  bun_home="${BUN_INSTALL:-$HOME/.bun}"
  # Nothing to point at: bootstrap.sh's own Bun step already failed louder than this could.
  [ -x "$bun_home/bin/bun" ] || return 0

  case "$(basename "$login_shell")" in
    zsh) profile="$HOME/.zshrc" ;;
    bash) profile="$HOME/.bash_profile" ;;
    *)
      echo "Note: Splash needs 'bun' on the PATH of your login shell ($login_shell). Add $bun_home/bin to it, or Splash will not be able to build a visual." >&2
      return 0
      ;;
  esac

  # Idempotent — a re-run must not stack a second export.
  if [ -f "$profile" ] && grep -q 'BUN_INSTALL' "$profile" 2>/dev/null; then return 0; fi
  {
    echo ''
    echo '# Splash: the desktop agent reads this profile to find its toolchain.'
    echo "export BUN_INSTALL=\"$bun_home\""
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
  } >>"$profile"
}

# THE TRAILING DOT IS THE WHOLE POINT, and it took a measurement to find.
#
# `open` hands the launch to launchd, so the generated launcher's `cd "$(dirname "$0")"` does NOT
# reach the app: started plain, Goose Desktop opens in $HOME (GOOSE_WORKING_DIR=/Users/<user>,
# observed). Every executable command in our prose is relative to the repository root and no
# SKILL.md resolves that root (host-gates audit §2.3), so a plain `open -a Goose` would put the
# journalist in the one directory where none of it works.
#
# Passing a folder fixes it — `open -a Goose <dir>` sets both GOOSE_WORKING_DIR and REQUEST_DIR to
# that folder (measured: two windows, two different roots, each honoured). The DOT rather than
# "$PWD" because bootstrap.sh writes the launcher through an UNQUOTED heredoc: a `$` here would be
# expanded when the launcher is WRITTEN — to the installer's own directory — instead of when it is
# RUN. The dot carries no `$`, and `open` resolves it against the launcher's own cd.
runtime_launch_cmd() { echo 'open -a Goose .'; }
