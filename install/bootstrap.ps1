# Atelier bootstrap (Windows). Idempotent — safe to re-run. Contains NO keys and receives none: it
# installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your keys —
# written straight to %USERPROFILE%\Atelier\.env, never passed on the command line.
$ErrorActionPreference = "Stop"

$Repo = if ($env:ATELIER_REPO) { $env:ATELIER_REPO } else { "https://github.com/buriedsignals/atelier" }   # confirm before public release
$Ref  = if ($env:ATELIER_REF) { $env:ATELIER_REF } else { "main" }
$Dest = Join-Path $HOME "Atelier"
$NativeSkills = @("skills\chart-native", "skills\map-native")

# Shared skill-discovery helper for runtimes that read ~\.agents\skills\ (Codex, Gemini native
# skills). Junctions every skill dir there by name. Claude Code uses --plugin-dir instead.
function Link-AgentsSkills {
  $agentsSkills = Join-Path $HOME ".agents\skills"
  New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
  foreach ($skillDir in Get-ChildItem (Join-Path $Dest "skills") -Directory) {
    $link = Join-Path $agentsSkills $skillDir.Name
    if (Test-Path $link) { Remove-Item $link -Recurse -Force }
    cmd /c mklink /J "`"$link`"" "`"$($skillDir.FullName)`"" | Out-Null
  }
}

Write-Host "-> Installing Atelier (a few minutes)…"

# 1. Bun (native Windows build — needed to run the configurator and the skills)
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
  # winget is absent on Windows 10 LTSC / enterprise images / disabled app-execution-alias.
  # Calling it unguarded under $ErrorActionPreference='Stop' aborts with a raw
  # "'winget' is not recognized" before the friendly nodejs.org guidance below can run.
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "-> Installing Node.js…"
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
  } else {
    Write-Host "-> winget not available; skipping automatic Node.js install."
  }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required (it drives Playwright/Remotion on Windows) but could not be installed via winget. Install Node LTS from https://nodejs.org, then re-run this installer."
}

# 3. Atelier source (zip — no git; contains the configurator)
if (-not (Test-Path $Dest)) {
  Write-Host "-> Downloading Atelier…"
  $tmp = Join-Path $env:TEMP "atelier-dl"
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp "atelier.zip"
  Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $tmp -Force
  # GitHub's archive top-dir strips a leading "v" / rewrites "/" in tags — match by glob (mirror .sh).
  Move-Item (Get-ChildItem $tmp -Directory -Filter "atelier-*" | Select-Object -First 1).FullName $Dest
  Remove-Item $tmp -Recurse -Force
}

# 4. Local configurator — pick runtime + enter keys (verified live); writes .env
Write-Host "-> Opening the configurator in your browser to collect your keys…"
Push-Location $Dest
bun install/configurator.ts
Pop-Location
# $ErrorActionPreference = "Stop" does NOT stop on a native command's non-zero exit, so check
# both the exit code and the file — this also catches a Ctrl-C out of the configurator.
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $Dest ".env"))) {
  throw "Configuration was not completed — re-run this installer."
}

# 5. Runtime — install the one the configurator recorded, via its module in install\runtimes\.
# Adding a runtime is a new install\runtimes\<name>.ps1 (see that dir's README), never a change here.
$runtime = if (Test-Path (Join-Path $Dest ".atelier-runtime")) { (Get-Content (Join-Path $Dest ".atelier-runtime") -Raw).Trim() } else { "claude" }
$runtimeModule = Join-Path $Dest "install\runtimes\$runtime.ps1"
if (-not (Test-Path $runtimeModule)) {
  throw "No runtime module for '$runtime' (expected install\runtimes\$runtime.ps1) — re-run the configurator and pick a supported runtime."
}
. $runtimeModule
Runtime-Install

# 6. Producer deps + render engine
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

# 7. Local double-click launcher (.cmd — created locally → no MOTW → clean re-launch)
$launcher = Join-Path $Dest "Launch Atelier.cmd"
$launchCmd = Runtime-LaunchCmd
@"
@echo off
cd /d "%~dp0"
rem .env values are double-quoted so spaces (e.g. fly tokens "FlyV1 fm2_…") survive; %%~b strips the quotes.
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%~b"
$launchCmd
"@ | Set-Content -Path $launcher -Encoding ascii

Write-Host ""
Write-Host "Done! Double-click 'Launch Atelier.cmd' in $Dest to start."
