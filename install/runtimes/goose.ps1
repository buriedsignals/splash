# Goose runtime module (Windows). Dot-sourced by bootstrap.ps1 — see ./README.md.
# Goose discovers native Agent Skills from ~\.agents\skills\<name>\SKILL.md — the SAME dir Codex and
# Gemini read — so the shared Link-AgentsSkills helper surfaces every skill. Goose's macOS/Linux
# curl installer is Unix-only, so on Windows we require a pre-installed goose (the official installer
# is a documented manual step) rather than guessing a one-liner, then wire discovery.
function Runtime-Install {
  if (-not (Get-Command goose -ErrorAction SilentlyContinue)) {
    throw "Goose is not installed. Install the Goose CLI for Windows from https://block.github.io/goose/docs/getting-started/installation, then re-run this installer."
  }
  # Wire native skill discovery (~\.agents\skills\<name>\SKILL.md) for all skills.
  Link-AgentsSkills
}

function Runtime-LaunchCmd { "goose session" }
