# Gemini CLI runtime module (macOS/Linux). Sourced by bootstrap.sh — see ./README.md.
# Gemini CLI has a NATIVE Agent Skills system and discovers user skills from ~/.agents/skills —
# the SAME dir the shared link_agents_skills helper populates — so the symlink route is the
# primary (and lightest) surfacing mechanism. A gemini-extension.json ships at the repo root for
# distribution parity; we do NOT run `gemini extensions install` here (it needs a published repo
# and a working CLI — the symlink route works locally with neither).
runtime_install() {
  if ! command -v gemini >/dev/null 2>&1; then
    echo "-> Installing Gemini CLI…"
    # Bun-first: the installer already guarantees Bun, so install the npm package globally and
    # link its `gemini` bin into ~/.bun/bin (already on PATH from bootstrap step 1). Pinned so a
    # public install reproduces a known-good CLI. (Gemini CLI needs Node 20+ at RUNTIME — its bin
    # has a node shebang — but Node install is out of this module's scope; see gemini-proof.md.)
    bun add -g "@google/gemini-cli@0.50.0" || true
  fi
  export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"
  if ! command -v gemini >/dev/null 2>&1; then
    echo "Gemini CLI could not be installed. Install Node 20+, run 'bun add -g @google/gemini-cli' (or see https://geminicli.com/docs/get-started/installation/), then re-run this installer." >&2
    exit 1
  fi
  # Surface Splash's skills to Gemini's native Agent Skills discovery (~/.agents/skills).
  link_agents_skills
}

runtime_launch_cmd() { echo 'gemini'; }
