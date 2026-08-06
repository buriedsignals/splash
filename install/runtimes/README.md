# Runtime modules

One file per supported AI runtime. The bootstrap installer records the journalist's chosen
runtime in `~/Splash/.splash-runtime` (via the local configurator) and dispatches to the
matching module here — so adding a runtime is a new file in this directory, never a change to
`bootstrap.sh` / `bootstrap.ps1`.

## Contract

Each `<runtime>.sh` (macOS/Linux) is **sourced** by `bootstrap.sh` and must define:

- `runtime_install` — install the runtime's CLI if missing and wire skill discovery. Call the shared
  `link_agents_skills` helper defined by `bootstrap.sh`; it takes the directory to fill and defaults
  to `~/.agents/skills/` (Codex, Gemini native skills, Goose). **A host that reads another door
  passes it**: Claude Desktop scans `~/.claude/skills/` and never looks at `~/.agents/skills`, so
  `claude-desktop.sh` calls `link_agents_skills "$HOME/.claude/skills"`. One helper, so the rules it
  enforces — sweep dead links, link only what carries a `SKILL.md` — cannot drift between doors.
  The Claude Code CLI loads skills via `--plugin-dir` at launch instead, so it wires nothing here.
- `runtime_launch_cmd` — echo the command the double-click launcher runs after sourcing `.env`
  (e.g. `claude --plugin-dir .`, `codex`, `gemini`).

Each `<runtime>.ps1` (Windows) is **dot-sourced** by `bootstrap.ps1` and must define the same two
as PowerShell functions: `Runtime-Install` and `Runtime-LaunchCmd` (the latter returns the launcher
command string). The shared Windows helper is `Link-AgentsSkills` (junctions into
`%USERPROFILE%\.agents\skills\`). It takes **no target**, deliberately: the two runtimes that need
another door — `goose-desktop`, `claude-desktop` — are macOS-only and ship no `.ps1`. The setup
page's runtime radio no longer OFFERS either on a Windows install
(`install/preflight/model.ts`'s `hasRuntimeModuleForPlatform`, read off this same directory, gates
selectability per platform — I1). What is left, and stays a fail-loud rather than a silent case, is
a decor edited or carried over by hand that names one anyway: it fails at the dispatch
(`bootstrap.ps1:168` throws with the expected path). Give `Link-AgentsSkills` a target when the
first Windows runtime needs one, not before.

Both layers run AFTER the source is unpacked to `$DEST` and BEFORE the launcher is written, with
`$DEST` (macOS/Linux) / `$Dest` (Windows) in scope.

`configurator-core.ts`'s `RUNTIMES` map gates which runtimes are selectable. A runtime's
`verified` goes `true` when its module exists here AND either the end-to-end proof passes, or the
project decides to ship it without one — in which case the motive is written beside the flag,
naming what IS measured and what is not. `configurator-core.test.ts` reads this file's source to
keep that true: a flag raised in silence fails the suite.
