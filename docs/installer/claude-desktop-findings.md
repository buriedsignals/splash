# Claude Desktop — what was measured, and the two other desktop targets

Written 2026-08-04, closing backlog items **B2** (Claude Desktop), **B3** (Gemini desktop) and
**B4** (ChatGPT desktop). Its sibling for Goose is `goose-desktop-findings.md` / `goose-desktop-proof.md`.

The product question behind all three (CLAUDE.md § CAP PRODUIT B) is the same: **can a third party
put a skill in front of the journalist, in an app they open from the Dock?**

---

## B2 — Claude Desktop: yes, and the door is `~/.claude/skills/`

Measured on the shipped bundle, version **1.12603.1** (`/Applications/Claude.app`).

### The door

The app embeds Claude Code's plugin loader, which **auto-loads every skill directory under
`~/.claude/skills/`**. Two independent strings in `Contents/Resources/app.asar` establish it:

- the loader reserves a marketplace name for that scan —
  *"Marketplace name `skills-dir` is reserved for plugins auto-loaded from .claude/skills/"*;
- managed settings carry a sentinel to turn it off —
  *"Policy-list sentinel for the `~/.claude/skills/` auto-load (@skills-dir plugins)"*, which is
  only meaningful if the scan exists by default.

A third string shows the same directory is **mounted into the Cowork VM read-only**:
`l[Es(".claude/skills")] = {path: join(<dir>, "skills"), mode: "ro"}`. So a sandboxed session sees
the skills too — whether our engines can *run* in that VM is a separate question, unmeasured, and
nothing here promises it.

On this machine the ten Splash skills were already linked there (symlinks into `splash-merge`), so
the layout our installer produces is exactly the layout the app expects.

### The door that is NOT it

`~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/…` looks like the
place to drop a skill and is not: its `plugin.json` says `"anthropic-skills" — "Anthropic-managed
skills for Claude Desktop"`, every entry carries `creatorType: "anthropic"`, and the surrounding
config records a completed **remote marketplace migration**. It is a synced, managed directory.

`~/.agents/skills` — the directory Codex, Gemini CLI and Goose read, and the only one our shared
helper filled before today — **is not scanned by this app**. A module that called the helper bare
would have installed a runtime that discovers nothing, silently. That is why
`link_agents_skills` now takes a target: one helper, one set of rules (sweep dead links, link only
what carries a `SKILL.md`), several doors.

### The launcher, and what could not be established

`Info.plist` declares `public.folder` as an **Editor** document type, so `open -a Claude <dir>` is
meaningful in principle — the shape that made `open -a Goose .` work. But opening the app on a
throwaway folder left **no observable trace of that folder** anywhere in its state directory within
the launch window. Unlike Goose, where `GOOSE_WORKING_DIR` could be read back, there is nothing to
rely on. So `runtime_launch_cmd` is a plain `open -a Claude`, and the journalist picks the working
folder inside the app. Recorded rather than guessed, so the next person does not re-derive it.

### A wrinkle worth naming rather than discovering later

`~/.claude/skills` is also what the **Claude Code CLI** auto-loads, and our `claude` runtime launches
`claude --plugin-dir .` from the repository. A machine that has been through *both* installs would
therefore offer the same skills twice, by two routes. The setup page records **one** runtime, so
this needs a journalist to reconfigure from one to the other — and no install cleans the other's
links, which has been true of `~/.agents/skills` since the first runtime shipped. Not introduced
here, not guarded here, written down here.

### Status

`claude-desktop` is registered with **`verified: false`**, the same flag as `goose-desktop` and for
the same reason: Layer A (the app finds our skills) is measured, Layer B (a visual comes out of it)
has not been seen. A product decision is not a proof.

---

## B3 — Gemini desktop: not established, do not invest

The Agent Skills standard is documented for the **CLI only**. `geminicli.com/docs/cli/skills`
lists the discovery paths — `~/.gemini/skills/` and `~/.agents/skills/` (alias), plus their
workspace equivalents — and every command on the page is the `gemini` terminal command. Nothing on
it mentions a desktop or macOS app reading `SKILL.md`.

This also **confirms a claim our shipped `gemini.sh` already makes**: `~/.agents/skills` is a
documented discovery path for that runtime, not an inference.

The macOS app (Spark, June 2026) does have local file access, but file access is not skill
discovery. **Verdict: no module.** Re-qualify if Google documents skills for the app.

---

## B4 — ChatGPT desktop: the backlog's premise was wrong, and the answer changes shape

The backlog recorded ChatGPT as *"MCP / connectors configured on the web side, which a priori
forbids launching Bun/Playwright/Remotion on the journalist's machine"*, and asked whether that
model can produce a local file at all.

**It can.** OpenAI's own documentation (`learn.chatgpt.com/docs/extend/mcp`) says the desktop app
supports **STDIO servers — "servers that run as a local process (started by a command)"** — with a
`command` field naming that local command, alongside remote HTTP servers. It also says *"The
ChatGPT desktop app, Codex CLI, and IDE extension support MCP servers and share MCP
configuration"*, through `~/.codex/config.toml`.

Two consequences, and neither is "write an adapter":

1. **Local execution is not the blocker.** The reason to stop investing was that the host could not
   run our producers on the journalist's machine. That reason is gone.
2. **The gap is the surface, not the execution.** MCP exposes *tools*, not skills; nothing indicates
   this app reads `SKILL.md`. Reaching it means publishing Splash as an MCP server — a different
   distribution shape, and a decision rather than a module.

There is also a **cheaper hypothesis worth testing before any of that**: the surface in question is
Codex embedded in the app, and `codex` is a runtime we already ship and mark verified. If the
embedded Codex reads `~/.agents/skills` the way the CLI does, ChatGPT desktop may already be
reachable with no new code. ~~**Untested — the app is not installed on this machine.**~~
**PÉRIMÉ, corrigé le 2026-08-05** : `/Applications/Claude.app` **est** présente sur la machine, et
la qualification B2 a été faite depuis. La phrase ci-dessus décrivait un état, pas une propriété —
elle est restée vraie une journée. Ce qui reste exact est la ligne suivante : aucun visuel n'est
sorti de l'app, donc la couche B reste non prouvée et le drapeau `verified` reste `false`.

---

## What the whole wave did not settle

Nothing here observes a *visual* coming out of a desktop app. That remains Layer B, it remains
`goose-desktop`'s open item, and the 2026-08-04 re-run attempt is recorded in
`goose-desktop-proof.md` § "The 2026-08-04 re-run".

---

## Addendum, same day — the small tree also renders (a different Layer B, closed)

The item above is about a desktop *app* rendering something. This one is narrower and does not
answer it: it asks whether the **small tree a host receives** (the packer built by the
`skill-distribution-payload` work — `.dist/`, none of the engine's tests/node_modules/output-proof,
one merged `package.json`) can still produce a real visual once installed, with no access to the
source repo at all. `scripts/verify-dist-produce.mjs` packs into a throwaway temp dir, `bun
install`s there from scratch, and produces for real. Full run recorded in
`.superpowers/sdd/2026-08-04-skill-distribution-payload/task-6-report.md`; summary here.

**Result: yes.** A chart-native static PNG (47 991 bytes) and a map-native video (10.4 MB mp4,
948 frames, `snap-video`-verified) both came out of a tree that started as a fresh temp
directory with nothing in it but the packer's output plus `bun install`.

**Question 1 — does the per-engine `package.json` left in `.dist/skills/<engine>/` disturb
resolution from `.dist/node_modules`?** No. `bun install` at the dist root only ever reads the
root manifest — the lockfile's `workspaces` block lists exactly one member (`""`, the root), and
no `node_modules` appears under any `.dist/skills/<engine>/` after install. The stray files are
inert for installation and are kept on purpose: `skills/chart-native/scripts/export-source.mjs`
and `skills/splash/scripts/bundle-source.mjs` read a skill's own `package.json` to pin dependency
versions when building a journalist's runnable source bundle — dropping it would silently break
that unrelated, already-shipped feature the first time it ran from a packed tree.

**What DID break, and was the real bug**: the merge in `pack-skills.mjs` only read
`pkg.dependencies`, silently dropping `pkg.devDependencies`. Several producers need packages filed
there — `vite`, `@vitejs/plugin-react`, `vite-plugin-singlefile` (chart-native's `vite.config.ts`
imports the last two directly) — because a delivered tree has no separate "dev install" step; `bun
install` at `.dist/` is the only install that ever runs. The first static produce failed hard:
`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite'`. Fixed by merging both
`dependencies` and `devDependencies` into the one root manifest; a regression test
(`docs/installer/pack-skills.test.ts`, "merges devDependencies too") pins it.

**Question 2 — is `map-native/remotion/` enough to render video from the delivered tree?** Yes,
once the tree has a MapTiler key to reach. The render itself needed no fix — the `.mp4` came out
clean on the first attempt that supplied the key correctly. The key is deliberately never
packaged (secrets do not belong in `.dist/`); `map-native/scripts/produce.mjs` already falls back
to reading a `.env` two directories above the skill root, which lands on `.dist/.env` in the
packed tree — exactly where a real install's `.env` (written by the installer, not by this
verifier) would sit. `verify-dist-produce.mjs` reproduces that by loading the repo's own `.env`
into its *own* process before packing, so the key is already in `process.env` (not read from a
file inside `.dist/`) by the time it shells out to `bunx remotion`; Remotion's CLI independently
whitelists any inherited `REMOTION_`-prefixed env var (`@remotion/cli/dist/get-env.js`), so this
works without writing a second copy of the secret into the temp tree. Chromium/Chrome Headless
Shell downloaded once (93.5 MB, cached by Remotion outside any project's `node_modules`) and was
not re-downloaded on repeat runs.
