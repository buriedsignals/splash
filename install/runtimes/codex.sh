# Codex CLI runtime module (macOS/Linux). Sourced by bootstrap.sh — see ./README.md.
# Codex discovers skills natively from ~/.agents/skills/<name>/SKILL.md, so this module wires that
# directory via the shared link_agents_skills helper and seeds ~/.codex/config.toml so producers
# can reach the network under the workspace-write sandbox.

# Pinned Codex CLI version (@openai/codex, verified on npmjs.com 2026-07-13). Codex's native skills
# feature is recent and fast-moving, so we pin a known-good release instead of tracking @latest.
CODEX_VERSION="0.144.1"

# The sandbox stanza Atelier seeds. A quoted (<<'TOML') heredoc keeps every char literal — the
# backticks and apostrophes below are safe. Kept in its own function (not a $()-captured var) to
# dodge a bash 3.2 command-substitution parse bug with quotes nested in a heredoc.
_codex_config_block() {
  cat <<'TOML'
# Atelier — Codex sandbox settings.
# Atelier's producers call provider APIs (MapTiler, Datawrapper, fly.io) and the runnable-source
# export runs `bun install`, so the workspace-write sandbox needs outbound network access.
sandbox_mode = "workspace-write"
# Prompts before networked / out-of-workspace actions. Set to "never" for the smoothest
# double-click, fully-unattended UX (it removes every approval prompt).
approval_policy = "on-request"

[sandbox_workspace_write]
network_access = true
TOML
}

# Seed ~/.codex/config.toml for Atelier's produce-time needs. NON-CLOBBERING: only writes when the
# file is ABSENT. If the user already has a config.toml, their settings win — we never rewrite it;
# instead we print the exact stanza to add when the network key is missing (the limitation).
seed_codex_config() {
  codex_home="${CODEX_HOME:-$HOME/.codex}"
  config="$codex_home/config.toml"
  if [ ! -f "$config" ]; then
    mkdir -p "$codex_home"
    _codex_config_block >"$config"
    echo "-> Wrote Codex sandbox config to $config (network enabled for Atelier producers)."
  elif ! grep -q 'network_access' "$config"; then
    echo "Note: $config already exists without a 'network_access' key. Atelier's producers need" >&2
    echo "outbound network under the workspace-write sandbox — add this to $config:" >&2
    _codex_config_block >&2
  fi
}

runtime_install() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "-> Installing Codex CLI…"
    if command -v npm >/dev/null 2>&1; then
      npm install -g "@openai/codex@${CODEX_VERSION}"
    else
      # bootstrap.sh installs Bun, not Node — so npm may be absent on a fresh machine. OpenAI's
      # standalone installer drops a native binary (no Node dependency) and symlinks
      # ~/.local/bin/codex. It tracks the current release channel rather than the pinned version.
      curl -fsSL https://chatgpt.com/codex/install.sh | sh
    fi
  fi
  # npm's global bin and the standalone installer's symlink both land here on a default setup.
  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v codex >/dev/null 2>&1; then
    echo "Codex CLI could not be installed. See https://developers.openai.com/codex, then re-run this installer." >&2
    exit 1
  fi
  # Wire native skill discovery (~/.agents/skills/<name>/SKILL.md) for all skills.
  link_agents_skills
  # Enable produce-time network under the workspace-write sandbox (idempotent, non-clobbering).
  seed_codex_config
}

runtime_launch_cmd() { echo 'codex'; }
