# Goose Desktop runtime — proof plan + result

The newsroom-facing runtime: installed once by double-click, launched from the Dock, no terminal
after install. The module is `install/runtimes/goose-desktop.sh`; what the app actually discovers
and executes was established first, in `docs/installer/goose-desktop-findings.md`.

Structure mirrors `docs/installer/goose-proof.md` (the CLI sibling), including its discipline of
separating what was proven from what was not.

## Verified facts (live, 2026-08-03, macOS 26.3 arm64, Goose Desktop 1.45.0)

- **Install channels:** the Homebrew cask is **`block-goose`** (a cask named `goose` does not
  exist), and the direct channel is `Goose.zip` / `Goose_intel_mac.zip` from the release. There is
  no `.dmg`. The release owner is now **`aaif-goose`** — `github.com/block/goose` survives on a
  redirect.
- **Discovery:** the app reads `~/.agents/skills` — the directory `link_agents_skills` already
  fills — and **follows symlinks**, so the project's distribution mechanism (link, never copy)
  holds. `~/.config/goose/skills` is read as well; nothing needs it.
- **Execution:** the app executes shell commands, and — unlike the CLI — recovers the user's real
  `PATH` from a login+interactive shell before doing so, which is what makes `bun` reachable from an
  application launched with the bare launchd `PATH`. Chain and measurements in the findings.
- **Provider:** Goose is model-agnostic and the desktop app owns its own provider screen, so the
  module bakes no key. Goose 1.45 also ships a `claude-code` provider, which is what makes Layer B
  affordable — it drives the local `claude` CLI on an existing subscription.

## What ships

- `install/runtimes/goose-desktop.sh` — two contract functions. `runtime_install` detects an
  existing bundle, installs through the cask or the `.zip` otherwise, wires discovery through the
  shared helper, and verifies `bun` is on the login shell's `PATH` (repairing the profile when it is
  not). `runtime_launch_cmd` echoes `open -a Goose` — an application, never a terminal session.
- `docs/installer/goose-desktop-runtime.test.ts` — 11 hermetic tests, no network, no real Goose
  required. Each guard was mutation-verified with the mutation confirmed landed by checksum first.
- `RUNTIMES["goose-desktop"]` in `install/configurator-core.ts`, **`verified: false`**.

## Proof result — Layer A (2026-08-03)

Run against the **real filesystem** with an **isolated `HOME`**, so the module's real behaviour was
observed without rewriting the machine's own `~/.agents/skills` (another session depends on those
links). `DEST` was this checkout; `GOOSE_APP` the real `/Applications/Goose.app`.

**1. The dead-link repair, on a real broken state.** A link left behind by a rename was planted
before the run:

```
BEFORE — dead link planted:
lrwxr-xr-x  stale -> /nonexistent/skills/stale

$ runtime_install ; EXIT=0

AFTER — dead link present?
ls: …/home/.agents/skills/stale: No such file or directory
AFTER — linked skills: 12
```

The sweep lives in the shared helper (`install/bootstrap.sh`), already merged; this proves it on a
real filesystem rather than only in its hermetic test.

**2. Discovery, through the app's own bundled binary, against that `HOME`:**

```
$ env HOME=<isolated> /Applications/Goose.app/Contents/Resources/bin/goose skills list
chart-native · dw-chart · map-dw · map-native · newsroom-charter · scrolly · splash ·
suggest-article · suggest-chart · suggest-image · using-splash        (11 Splash skills)
goose-doc-guide                                                      (Goose's own builtin)
```

**3. `bun` on the login path.** The check passed without touching anything — no profile was written
(`ls: …/.zshrc: No such file or directory`), because `/usr/local/bin` is on this machine's default
`path_helper` list. The repair branch is therefore proven by its two hermetic tests, not by this
run; that is stated rather than blurred.

### ★ What this run found that nobody was looking for

**`skills/image-native/` is linked into `~/.agents/skills` and is not a skill.** It is the only
directory under `skills/` with **no `SKILL.md`** — it never had one, and no prose references one. It
is a producer library that `suggest-image` drives, sitting in a directory whose every sibling is a
skill.

Consequences, in order of how much they matter:

1. **A claim in two documents is false.** `docs/installer/goose-desktop-findings.md` said "les 12
   skills Splash remontent" and `docs/splash/backlog-2026-08-03.md` records "12 skills découverts".
   Twelve directories are *linked*; **eleven** are discovered, and the twelfth row in that earlier
   count was Goose's own builtin. Corrected in the findings; left in the backlog with this
   cross-reference, since that file is a register of what remains rather than of what was measured.
2. **`link_agents_skills` assumes every directory under `skills/` is a skill** — it globs
   `"$DEST"/skills/*/ ` and links whatever it finds. Hosts skip a directory with no `SKILL.md`, so
   this is quiet today; it will be quiet again the next time, which is the problem with quiet.
3. **Whether `image-native` should be reachable at all is a product question, not an installer
   one**, and it is deliberately left open here: a journalist never invokes it directly (that is
   `suggest-image`'s job). Recorded in the backlog rather than fixed inside a runtime lot.

**The two parasite skills did not appear in this run** (`playwright-cli`, `playwright-trace`), and
that is an artefact of the isolated setup rather than good news: this checkout has no
`node_modules` yet. Against the machine's real `HOME` they do appear, from
`dw-chart/node_modules/playwright-core`. Backlog **B6** stands, for the desktop app as much as for
the CLI.

## Not proven

- **The bootstrap download.** `install/bootstrap.sh` fetches from `github.com/buriedsignals/splash`,
  which is **private** — an install "as a stranger" cannot complete until the repository is public
  (backlog A). What ran here is the runtime module and the shared helper, which is the part this lot
  owns; the download path is unchanged by it.
- **The window.** Every measurement went through the CLI entry point of the app's own bundled
  binary (`Contents/Resources/bin/goose`), which is the process the interface drives. That is strong
  — it is the same binary, the same config, the same discovery — but it is not the same thing as
  seeing `splash` listed in the app's own skills panel, or as knowing whether the interface puts a
  tool-approval prompt in front of the journalist.
- **Layer B — a produced file.** Nothing here shows a visual coming out of the app. That is the next
  task, and it is what flips `verified`.
- **Windows.** There is no `goose-desktop.ps1`; the desktop app is treated as macOS-first here. A
  Windows install that somehow recorded this runtime fails loudly at the dispatch
  (`bootstrap.ps1:105` throws with the expected path), which is the correct failure, not a silent
  one.

## Verdict

**Layer A: proven.** The module installs-or-detects, repairs a broken skill-link state, wires
discovery, and the app finds every skill that *is* a skill. **Layer B: not attempted.**
`RUNTIMES["goose-desktop"].verified` stays `false`, and the test in
`install/configurator-core.test.ts` pins it there.
