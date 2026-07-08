# Atelier bootstrap (Windows). Idempotent — safe to re-run. Contains NO keys: the caller
# (copy-paste one-liner or downloaded .cmd launcher) sets the key env vars before invoking
# this, and this script writes them into %USERPROFILE%\Atelier\.env.
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/buriedsignals/atelier"   # confirm before public release
$Ref  = if ($env:ATELIER_REF) { $env:ATELIER_REF } else { "main" }
$Dest = Join-Path $HOME "Atelier"
$NativeSkills = @("skills\chart-native", "skills\map-native")

Write-Host "-> Installing Atelier (a few minutes)…"

# 1. Bun (native Windows build)
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Bun…"
  irm bun.sh/install.ps1 | iex
}
$env:PATH = "$HOME\.bun\bin;$env:PATH"
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun could not be installed. Install it from https://bun.sh, then re-run this installer."
}

# 2. Node.js — ONLY to drive Playwright/Remotion (they hang under Bun on Windows: Bun #15679)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Node.js…"
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required (it drives Playwright/Remotion on Windows) but could not be installed via winget. Install Node LTS from https://nodejs.org, then re-run this installer."
}

# 3. Runtime — Claude Code (native installer)
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Claude Code…"
  irm https://claude.ai/install.ps1 | iex
}
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw "Claude Code could not be installed. See https://claude.ai, then re-run this installer."
}

# 4. Atelier source (zip — no git; extracts to atelier-<ref>\)
if (-not (Test-Path $Dest)) {
  Write-Host "-> Downloading Atelier…"
  $zip = Join-Path $env:TEMP "atelier.zip"
  Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $env:TEMP -Force
  Move-Item (Join-Path $env:TEMP "atelier-$Ref") $Dest
  Remove-Item $zip
}

# 5. Producer deps + render engine
Write-Host "-> Installing render dependencies…"
foreach ($skill in $NativeSkills) {
  Push-Location (Join-Path $Dest $skill)
  bun install | Out-Null
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "bun install failed in $skill." }
  Pop-Location
}
Push-Location (Join-Path $Dest "skills\chart-native")
bunx playwright install chromium
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Playwright Chromium download failed — re-run this installer to resume." }
Pop-Location

# 6. Write .env from env vars
Write-Host "-> Writing configuration…"
@"
ANTHROPIC_API_KEY=$($env:ANTHROPIC_API_KEY)
VITE_MAPTILER_KEY=$($env:VITE_MAPTILER_KEY)
REMOTION_MAPTILER_KEY=$($env:REMOTION_MAPTILER_KEY)
DATAWRAPPER_API_TOKEN=$($env:DATAWRAPPER_API_TOKEN)
ATELIER_EMBED_APP=$($env:ATELIER_EMBED_APP)
FLY_API_TOKEN=$($env:FLY_API_TOKEN)
"@ | Set-Content -Path (Join-Path $Dest ".env") -Encoding ascii

# 7. Local double-click launcher (.cmd — created locally → no MOTW → clean re-launch)
$launcher = Join-Path $Dest "Launch Atelier.cmd"
@'
@echo off
cd /d "%~dp0"
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
claude --plugin-dir .
'@ | Set-Content -Path $launcher -Encoding ascii

Write-Host ""
Write-Host "Done! Double-click 'Launch Atelier.cmd' in $Dest to start."

# 8. Scrub secrets from this session's environment
Remove-Item Env:\ANTHROPIC_API_KEY, Env:\VITE_MAPTILER_KEY, Env:\REMOTION_MAPTILER_KEY, Env:\DATAWRAPPER_API_TOKEN, Env:\FLY_API_TOKEN -ErrorAction SilentlyContinue
