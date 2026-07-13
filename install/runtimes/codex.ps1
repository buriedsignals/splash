# Codex CLI runtime module (Windows). Dot-sourced by bootstrap.ps1 — see ./README.md.
# Codex discovers skills natively from ~\.agents\skills\<name>\SKILL.md, so this module wires that
# directory via the shared Link-AgentsSkills helper and seeds ~\.codex\config.toml so producers can
# reach the network under the workspace-write sandbox.

# Pinned Codex CLI version (@openai/codex, verified on npmjs.com 2026-07-13). Codex's native skills
# feature is recent and fast-moving, so we pin a known-good release instead of tracking @latest.
$CodexVersion = "0.144.1"

# Seed ~\.codex\config.toml. NON-CLOBBERING: only writes when the file is ABSENT. An existing user
# config is never rewritten (their settings win) — we print the stanza to add if the key is missing.
function Seed-CodexConfig {
  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
  $config = Join-Path $codexHome "config.toml"
  $block = @'
# Atelier — Codex sandbox settings.
# Atelier's producers call provider APIs (MapTiler, Datawrapper, fly.io) and the runnable-source
# export runs `bun install`, so the workspace-write sandbox needs outbound network access.
sandbox_mode = "workspace-write"
# Prompts before networked / out-of-workspace actions. Set to "never" for the smoothest
# double-click, fully-unattended UX (it removes every approval prompt).
approval_policy = "on-request"

[sandbox_workspace_write]
network_access = true
'@
  if (-not (Test-Path $config)) {
    New-Item -ItemType Directory -Force -Path $codexHome | Out-Null
    Set-Content -Path $config -Value $block -Encoding ascii
    Write-Host "-> Wrote Codex sandbox config to $config (network enabled for Atelier producers)."
  } elseif (-not (Select-String -Path $config -Pattern "network_access" -Quiet)) {
    Write-Warning "Existing $config has no 'network_access' key. Atelier's producers need outbound network under the workspace-write sandbox — add this:"
    Write-Host $block
  }
}

function Runtime-Install {
  if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    Write-Host "-> Installing Codex CLI…"
    # Bun-first (the installer already guarantees Bun; never npm): install the pinned package and
    # link its bin into ~\.bun\bin (prepended below so the existence check sees it this session).
    bun add -g "@openai/codex@$CodexVersion"
    $env:PATH = "$HOME\.bun\bin;$env:PATH"
  }
  if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI could not be installed via 'bun add -g @openai/codex'. See https://developers.openai.com/codex, then re-run this installer."
  }
  # Wire native skill discovery (~\.agents\skills\<name>\SKILL.md) for all skills.
  Link-AgentsSkills
  # Enable produce-time network under the workspace-write sandbox (idempotent, non-clobbering).
  Seed-CodexConfig
}

function Runtime-LaunchCmd { "codex" }
