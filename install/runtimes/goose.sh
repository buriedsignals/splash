# Goose runtime module (macOS/Linux). Sourced by bootstrap.sh — see ./README.md.
# Goose discovers native Agent Skills from ~/.agents/skills/<name>/SKILL.md — the SAME dir Codex and
# Gemini read — so the shared link_agents_skills helper surfaces every skill with zero extra config.
# Goose is a Rust binary with its own curl installer (no npm, no Node). The journalist picks an LLM
# provider + key with `goose configure` (or is prompted on first `goose session`) — Goose is
# model-agnostic, so no provider key is baked here.

# Release channel. Block's installer takes the tag in the URL; "stable" tracks the latest verified
# release (native skills need v1.25.0+; the proof ran on 1.43.0).
GOOSE_VERSION="stable"

runtime_install() {
  if ! command -v goose >/dev/null 2>&1; then
    echo "-> Installing Goose…"
    # Official Rust-binary installer (never npm). CONFIGURE=false skips the interactive
    # LLM-provider prompt during install; the journalist configures it on first launch.
    curl -fsSL "https://github.com/block/goose/releases/download/${GOOSE_VERSION}/download_cli.sh" | CONFIGURE=false bash
  fi
  # The installer drops the binary in ~/.local/bin.
  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v goose >/dev/null 2>&1; then
    echo "Goose could not be installed. See https://block.github.io/goose, then re-run this installer." >&2
    exit 1
  fi
  # Wire native skill discovery (~/.agents/skills/<name>/SKILL.md) for all skills.
  link_agents_skills
}

runtime_launch_cmd() { echo 'goose session'; }
