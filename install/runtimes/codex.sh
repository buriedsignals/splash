# Codex CLI runtime module (macOS/Linux). Sourced by bootstrap.sh — see ./README.md.
# Codex discovers skills natively from ~/.agents/skills/<name>/SKILL.md, so this module wires that
# directory via the shared link_agents_skills helper and seeds ~/.codex/config.toml so producers
# can reach the network under the workspace-write sandbox.

# Pinned Codex CLI version (@openai/codex, verified on npmjs.com 2026-07-13). Codex's native skills
# feature is recent and fast-moving, so we pin a known-good release instead of tracking @latest.
CODEX_VERSION="0.144.1"

# The sandbox stanza Splash seeds. A quoted (<<'TOML') heredoc keeps every char literal — the
# backticks and apostrophes below are safe. Kept in its own function (not a $()-captured var) to
# dodge a bash 3.2 command-substitution parse bug with quotes nested in a heredoc.
_codex_config_block() {
  cat <<'TOML'
# Splash — Codex sandbox settings.
# Splash's producers call provider APIs (MapTiler, Datawrapper, fly.io) and the runnable-source
# export runs `bun install`, so the workspace-write sandbox needs outbound network access.
sandbox_mode = "workspace-write"
# Prompts before networked / out-of-workspace actions. Set to "never" for the smoothest
# double-click, fully-unattended UX (it removes every approval prompt).
approval_policy = "on-request"

[sandbox_workspace_write]
network_access = true
TOML
}

# Seed ~/.codex/config.toml for Splash's produce-time needs. NON-CLOBBERING: only writes when the
# file is ABSENT. If the user already has a config.toml, their settings win — we never rewrite it;
# instead we print the exact stanza to add when the network key is missing (the limitation).
seed_codex_config() {
  codex_home="${CODEX_HOME:-$HOME/.codex}"
  # A pre-existing ~/.codex owned by another user (e.g. created by an earlier sudo run) makes Codex
  # itself fail later with a cryptic "app-server client: Permission denied (os error 13)". Surface
  # the real cause + the one-line fix now, instead of leaving the user to decode os error 13.
  if [ -d "$codex_home" ] && [ ! -w "$codex_home" ]; then
    echo "Warning: $codex_home exists but is not writable by $(whoami) — Codex needs to write there" >&2
    echo "and will fail to start. Fix it, then re-run this installer:" >&2
    echo "  sudo chown -R \"\$(whoami)\" \"$codex_home\"" >&2
    return
  fi
  config="$codex_home/config.toml"
  if [ ! -f "$config" ]; then
    mkdir -p "$codex_home"
    _codex_config_block >"$config"
    echo "-> Wrote Codex sandbox config to $config (network enabled for Splash producers)."
  elif ! grep -q 'network_access' "$config"; then
    echo "Note: $config already exists without a 'network_access' key. Splash's producers need" >&2
    echo "outbound network under the workspace-write sandbox — add this to $config:" >&2
    _codex_config_block >&2
  fi
}

runtime_install() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "-> Installing Codex CLI…"
    # Bun-first (the installer already guarantees Bun; never npm): install the pinned package and
    # link its bin into ~/.bun/bin. `|| true` so a Bun failure falls through to the standalone path.
    bun add -g "@openai/codex@${CODEX_VERSION}" || true
    export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"
    if ! command -v codex >/dev/null 2>&1; then
      # Bun didn't yield a runnable codex (e.g. a blocked native postinstall) — fall back to
      # OpenAI's Node-free standalone installer (symlinks ~/.local/bin/codex; unpinned channel).
      curl -fsSL https://chatgpt.com/codex/install.sh | sh
    fi
  fi
  # Bun's global bin and the standalone installer's symlink both land on PATH here.
  export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$HOME/.local/bin:$PATH"
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
