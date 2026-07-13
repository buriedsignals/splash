# Claude Code runtime module (macOS/Linux). Sourced by bootstrap.sh — see ./README.md.
# Claude Code loads skills via `--plugin-dir .` at launch, so it wires no ~/.agents/skills symlinks.
runtime_install() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "-> Installing Claude Code…"
    curl -fsSL https://claude.ai/install.sh | bash
  fi
  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v claude >/dev/null 2>&1; then
    echo "Claude Code could not be installed. See https://claude.ai, then re-run this installer." >&2
    exit 1
  fi
}

runtime_launch_cmd() { echo 'claude --plugin-dir .'; }
