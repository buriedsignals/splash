# Splash bootstrap (Windows). Idempotent — safe to re-run. Contains NO keys and receives none: it
# installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your keys —
# written straight to %USERPROFILE%\Splash\.env, never passed on the command line.
$ErrorActionPreference = "Stop"

$Repo = if ($env:SPLASH_REPO) { $env:SPLASH_REPO } else { "https://github.com/buriedsignals/splash" }   # confirm before public release
$Ref  = if ($env:SPLASH_REF) { $env:SPLASH_REF } else { "main" }
$Dest = Join-Path $HOME "Splash"

# Shared skill-discovery helper for runtimes that read ~\.agents\skills\ (Codex, Gemini native
# skills). Junctions every skill dir there by name. Claude Code uses --plugin-dir instead.
function Link-AgentsSkills {
  $agentsSkills = Join-Path $HOME ".agents\skills"
  New-Item -ItemType Directory -Force -Path $agentsSkills | Out-Null
  # A renamed or moved source tree leaves junctions that EXIST but resolve to nothing — and to a
  # host a dead junction is indistinguishable from an absent skill: it simply finds nothing,
  # silently. Sweep them first so an install that predates a rename repairs itself on re-run.
  foreach ($existing in Get-ChildItem $agentsSkills -Force -ErrorAction SilentlyContinue) {
    $isReparse = $existing.Attributes -band [System.IO.FileAttributes]::ReparsePoint
    if ($isReparse -and -not (Test-Path $existing.FullName)) {
      Remove-Item $existing.FullName -Recurse -Force
    }
  }
  # The PACKAGED tree, never the engine (registry E10/B6). The repo is 20 640 files for
  # map-native alone; a host enumerates all of it, filters nothing and follows junctions, so
  # load_skill overflows and SKILL.md never reaches the model. Mirrors bootstrap.sh's
  # $DEST/.dist/skills/*/ glob — the two installers must deliver the same thing or the measurement
  # that closed this only ever held on one operating system.
  foreach ($skillDir in Get-ChildItem (Join-Path $Dest ".dist\skills") -Directory) {
    # A host silently ignores a directory with no SKILL.md, so junctioning one (a production
    # library such as skills\image-native) inflates the link count while the host discovers one
    # fewer skill — measured on Goose Desktop: 12 linked, 11 discovered, and nothing said. Link
    # only what a host can read, so the two counts agree and a real gap shows up instead of hiding.
    if (-not (Test-Path (Join-Path $skillDir.FullName "SKILL.md"))) { continue }
    $link = Join-Path $agentsSkills $skillDir.Name
    if (Test-Path $link) { Remove-Item $link -Recurse -Force }
    cmd /c mklink /J "`"$link`"" "`"$($skillDir.FullName)`"" | Out-Null
  }
}

Write-Host "-> Installing Splash (a few minutes)…"

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

# 3. Splash source (zip — no git; contains the configurator)
if (-not (Test-Path $Dest)) {
  Write-Host "-> Downloading Splash…"
  $tmp = Join-Path $env:TEMP "splash-dl"
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp "splash.zip"
  Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $tmp -Force
  # GitHub's archive top-dir strips a leading "v" / rewrites "/" in tags — match by glob (mirror .sh).
  Move-Item (Get-ChildItem $tmp -Directory -Filter "splash-*" | Select-Object -First 1).FullName $Dest
  Remove-Item $tmp -Recurse -Force
}

# 4. Root dependencies. The setup page reads and writes the newsroom decor (lib\newsroom), which
# needs the root packages — explicit and guarded here rather than resolved implicitly at the most
# critical moment of the install.
Push-Location $Dest
bun install | Out-Null
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "bun install failed in $Dest — check your connection, then re-run this installer." }
Pop-Location

# 5. Package what a host receives, then install its dependencies ONCE, ABOVE the skill
# directories — where Bun resolves them and no host walks. The browser download that follows is
# part of the same delivered tree (mirrors bootstrap.sh, which bundles it into the same step).
# This runs BEFORE the setup page (step 6) for two reasons: the page MEASURES this tree — a page
# opened first reports every in-house engine as missing (chart-native/map-native included, whose
# readiness probe reads a Remotion-only cache — Playwright's chromium here is only for the
# static-render screenshots, docs/installer/remotion-cache-measurement.md) — and a failure here
# must stop the install before anyone fills in a form for a tree that will not work. It also runs
# before step 7, whose Runtime-Install calls Link-AgentsSkills, which globs $Dest\.dist\skills.
Write-Host "-> Packaging the skills…"
Push-Location $Dest
bun run pack-skills
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Packaging failed (see the error above) — re-run this installer." }
Pop-Location

Write-Host "-> Installing render dependencies…"
Push-Location (Join-Path $Dest ".dist")
bun install | Out-Null
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Dependency install failed in the packaged skills — check your connection, then re-run this installer." }
Pop-Location

# ONE download, from one skill, on purpose: Playwright caches per user and per browser revision,
# so map-native — and every other renderer — resolves the same executable this call fetches
# (mirrors bootstrap.sh, and install/native-browser.test.ts keeps the versions pinned together,
# which is the condition that makes one download enough).
Push-Location (Join-Path $Dest ".dist\skills\chart-native")
bunx playwright install chromium
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Playwright Chromium download failed — re-run this installer to resume." }
Pop-Location

# The render browser Remotion itself uses — a DIFFERENT cache from Playwright's, written only by
# Remotion, and located per skill directory: it walks up from its cwd to the nearest package.json,
# and each packed skill keeps its own (measured: docs/installer/remotion-cache-measurement.md).
# So it is fetched once per video engine, and the setup page's probe finds it where it looks.
foreach ($engine in @("chart-native", "map-native")) {
  Write-Host "-> Downloading the video renderer for $engine…"
  Push-Location (Join-Path $Dest ".dist\skills\$engine")
  bunx remotion browser ensure
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "The video renderer could not be downloaded for $engine — re-run this installer to resume." }
  Pop-Location
}

# 6. Local setup page — pick runtime + enter keys (verified live); writes .env
Write-Host "-> Opening the setup page in your browser to collect your keys…"
Push-Location $Dest
bun install/configurator.ts
Pop-Location
# $ErrorActionPreference = "Stop" does NOT stop on a native command's non-zero exit, so check
# both the exit code and the file — this also catches a Ctrl-C out of the configurator.
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $Dest ".env"))) {
  throw "Configuration was not completed — re-run this installer."
}

# 7. Runtime — install the one the setup page recorded, via its module in install\runtimes\.
# Adding a runtime is a new install\runtimes\<name>.ps1 (see that dir's README), never a change here.
# The runtime lives in newsroom.json (the decor). install\read-runtime.ts resolves it — including
# the legacy .splash-runtime of an install that predates the setup page — and validates it against
# the shipped modules, so this variable is never an arbitrary string off disk.
Push-Location $Dest
$runtime = (bun install/read-runtime.ts) | Select-Object -First 1
Pop-Location
if ($LASTEXITCODE -ne 0 -or -not $runtime) { $runtime = "claude" }
$runtime = $runtime.Trim()
$runtimeModule = Join-Path $Dest "install\runtimes\$runtime.ps1"
if (-not (Test-Path $runtimeModule)) {
  throw "No runtime module for '$runtime' (expected install\runtimes\$runtime.ps1) — re-run the configurator and pick a supported runtime."
}
. $runtimeModule
Runtime-Install

# 8. Local double-click launcher (.cmd — created locally → no MOTW → clean re-launch)
$launcher = Join-Path $Dest "Launch Splash.cmd"
$launchCmd = Runtime-LaunchCmd
@"
@echo off
cd /d "%~dp0"
rem .env values are double-quoted so spaces (e.g. fly tokens "FlyV1 fm2_…") survive; %%~b strips the quotes.
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%~b"
$launchCmd
"@ | Set-Content -Path $launcher -Encoding ascii

Write-Host ""
Write-Host "Done! Double-click 'Launch Splash.cmd' in $Dest to start."
