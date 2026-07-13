# Gemini CLI runtime module (Windows). Dot-sourced by bootstrap.ps1 — see ./README.md.
# Gemini CLI discovers native Agent Skills from ~\.agents\skills — the SAME dir the shared
# Link-AgentsSkills helper junctions — so the symlink route is the primary surfacing mechanism.
# A gemini-extension.json ships at the repo root for distribution parity; we do NOT run
# `gemini extensions install` here (it needs a published repo and a working CLI).
function Runtime-Install {
  if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
    Write-Host "-> Installing Gemini CLI…"
    # Bun-first: the installer guarantees Bun, so install the npm package globally and link its
    # `gemini` bin into ~\.bun\bin (already on PATH from bootstrap step 1). Pinned for a
    # reproducible public install. (Node 20+ — installed by bootstrap.ps1 for Playwright — is
    # what actually RUNS the CLI; its bin has a node shebang.)
    bun add -g "@google/gemini-cli@0.50.0"
    $env:PATH = "$HOME\.bun\bin;$env:PATH"
  }
  if (-not (Get-Command gemini -ErrorAction SilentlyContinue)) {
    throw "Gemini CLI could not be installed. Ensure Node 20+ is present, run 'bun add -g @google/gemini-cli' (or see https://geminicli.com/docs/get-started/installation/), then re-run this installer."
  }
  # Surface Atelier's skills to Gemini's native Agent Skills discovery (~\.agents\skills).
  Link-AgentsSkills
}

function Runtime-LaunchCmd { "gemini" }
