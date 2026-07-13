# Installing Atelier for Codex

Atelier's skills run natively in [Codex](https://developers.openai.com/codex) through Codex's
built-in skill discovery. This guide is for people who **clone this repo directly** and wire it by
hand. If you used the double-click installer (`install/bootstrap.sh` / `.ps1`), this is already done
for you by `install/runtimes/codex.sh` — skip to [Verify](#verify).

## Prerequisites

- **Codex CLI** — `npm install -g @openai/codex` (needs Node.js 22+), or the Node-free standalone
  installer: `curl -fsSL https://chatgpt.com/codex/install.sh | sh`. Pinned/known-good: `0.144.1`.
- **[Bun](https://bun.sh)** — Atelier's producers run under Bun (`bun scripts/produce.mjs …`).
- **Git**.

## Installation

1. **Clone the repo:**

   ```bash
   git clone https://github.com/buriedsignals/atelier.git ~/Atelier
   ```

2. **Symlink every skill into `~/.agents/skills/`** — Codex discovers skills from
   `~/.agents/skills/<name>/SKILL.md` (user tier). Atelier ships nine skills, so we link each one by
   name (not one umbrella link), matching Codex's documented per-skill layout:

   ```bash
   mkdir -p ~/.agents/skills
   for d in ~/Atelier/skills/*/; do
     ln -sfn "$d" ~/.agents/skills/"$(basename "$d")"
   done
   ```

   **Windows (PowerShell):**

   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   foreach ($d in Get-ChildItem "$env:USERPROFILE\Atelier\skills" -Directory) {
     $link = Join-Path "$env:USERPROFILE\.agents\skills" $d.Name
     if (Test-Path $link) { Remove-Item $link -Recurse -Force }
     cmd /c mklink /J "`"$link`"" "`"$($d.FullName)`""
   }
   ```

3. **Seed the sandbox config** so producers can reach provider APIs (MapTiler, Datawrapper, fly.io)
   and the runnable-source export can `bun install`. Under Codex's default `workspace-write` sandbox
   the network is **blocked**, which breaks those calls — enable it in `~/.codex/config.toml`:

   ```toml
   sandbox_mode = "workspace-write"
   approval_policy = "on-request"   # set to "never" for the smoothest, fully-unattended UX

   [sandbox_workspace_write]
   network_access = true
   ```

   If you already have a `~/.codex/config.toml`, merge these keys in rather than overwriting it.

4. **Provide your keys.** Atelier reads provider keys from the environment when a producer runs
   (`VITE_MAPTILER_KEY`, `REMOTION_MAPTILER_KEY`, `DATAWRAPPER_API_TOKEN`, optional
   `ATELIER_EMBED_APP` / `FLY_API_TOKEN`). The bootstrap installer writes these to `~/Atelier/.env`;
   when running Codex by hand, export them (or `set -a && . ~/Atelier/.env && set +a`) before
   launching so the shell tool inherits them.

5. **Restart Codex** (quit and relaunch the CLI) to discover the newly linked skills.

## Verify

Launch Codex from `~/Atelier` and list skills:

```bash
codex
```

Then in the session:

```
/skills
```

You should see all nine Atelier skills:
`atelier`, `chart-native`, `dw-chart`, `image-native`, `map-dw`, `map-native`, `scrolly`,
`suggest-article`, `suggest-chart`.

Start a project by describing your article to the `atelier` skill (auto-matches by description, or
invoke it explicitly with `$atelier`). It orchestrates the rest.

## Updating

```bash
cd ~/Atelier && git pull
```

Skills update instantly through the symlinks — no re-linking needed (a skill added upstream is only
picked up after re-running the loop in step 2, since it globs the current `skills/*` set).

## Uninstalling

```bash
for d in ~/Atelier/skills/*/; do rm -f ~/.agents/skills/"$(basename "$d")"; done
```

Optionally delete the clone (`rm -rf ~/Atelier`) and remove the Atelier stanza from
`~/.codex/config.toml`.
