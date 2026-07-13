# Runtime modules

One file per supported AI runtime. The bootstrap installer records the journalist's chosen
runtime in `~/Atelier/.atelier-runtime` (via the local configurator) and dispatches to the
matching module here — so adding a runtime is a new file in this directory, never a change to
`bootstrap.sh` / `bootstrap.ps1`.

## Contract

Each `<runtime>.sh` (macOS/Linux) is **sourced** by `bootstrap.sh` and must define:

- `runtime_install` — install the runtime's CLI if missing and wire skill discovery. For runtimes
  that discover skills from `~/.agents/skills/` (Codex, Gemini native skills), call the shared
  `link_agents_skills` helper defined by `bootstrap.sh`. Claude Code loads skills via
  `--plugin-dir` at launch instead, so it wires nothing here.
- `runtime_launch_cmd` — echo the command the double-click launcher runs after sourcing `.env`
  (e.g. `claude --plugin-dir .`, `codex`, `gemini`).

Each `<runtime>.ps1` (Windows) is **dot-sourced** by `bootstrap.ps1` and must define the same two
as PowerShell functions: `Runtime-Install` and `Runtime-LaunchCmd` (the latter returns the launcher
command string). The shared Windows helper is `Link-AgentsSkills` (junctions into
`%USERPROFILE%\.agents\skills\`).

Both layers run AFTER the source is unpacked to `$DEST` and BEFORE the launcher is written, with
`$DEST` (macOS/Linux) / `$Dest` (Windows) in scope.

`configurator-core.ts`'s `RUNTIMES` map gates which runtimes are selectable — flip a runtime's
`verified` to `true` only once its module exists here AND the end-to-end proof passes.
