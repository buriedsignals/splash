# Claude Code runtime module (Windows). Dot-sourced by bootstrap.ps1 — see ./README.md.
# Claude Code loads skills via `--plugin-dir .` at launch, so it wires no ~\.agents\skills junctions.
function Runtime-Install {
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "-> Installing Claude Code…"
    irm https://claude.ai/install.ps1 | iex
    # claude.ai/install.ps1 updates the PERSISTENT user PATH (effective only in a NEW session),
    # not this process's $env:PATH — so the existence check below would throw a false "could not
    # be installed" on a fresh machine. Prepend claude's bin dir for THIS session.
    $env:PATH = "$HOME\.local\bin;$env:PATH"
  }
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    throw "Claude Code could not be installed. See https://claude.ai, then re-run this installer."
  }
}

function Runtime-LaunchCmd { "claude --plugin-dir ." }
