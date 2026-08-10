# Every AI host, and whether the twin's verbs and gates survive them

**Feedback item:** C1 (`twin/FEEDBACK-2026-08-10.md`, Part C) — *"L'ensemble doit fonctionner sur
tous les types d'IA : Goose App (le pilote), Claude Desktop, Claude Code, Codex, Gemini. Et
s'assurer que les verbes et gates fonctionnent aussi correctement sur chaque."*

**Date:** 2026-08-10 · **Read-only.** Nothing in the worktree was created, edited, moved or linked
except this file. Every live probe ran against an **isolated `HOME`** in the session scratchpad,
with symlinks pointing *into* the tree; the real `~/.agents/skills` and `~/.claude/skills` were
never touched.

**Instruments used, and their versions** — all five hosts are installed on this machine, which is
why this survey could measure rather than reason:

| Host | Binary / bundle | Version | Instrument that answered |
|---|---|---|---|
| Goose Desktop (the pilot's) | `/Applications/Goose.app/Contents/Resources/bin/goose` | **1.45.0** | `goose skills list` under an isolated `HOME` |
| Goose CLI | `~/.local/bin/goose` | **1.43.0** | same |
| Claude Code | `~/.local/bin/claude` | **2.1.226** | `claude plugin validate` · `claude plugin list` · `claude plugin details` (all non-model commands) |
| Claude Desktop | `/Applications/Claude.app` | present | *not instrumented here* — its door was established on the original (`docs/installer/claude-desktop-findings.md:11-34`) |
| Codex | `~/.bun/bin/codex` | **0.144.1** | no skill-listing command exists (`codex --help`); nothing measurable without a live model turn |
| Gemini CLI | `~/.bun/bin/gemini` | **0.50.0** | `gemini skills list` under an isolated `HOME` |

A fourth instrument, written for this survey and thrown away, reproduces Goose's own
`load_skill` enumeration rule as read in `aaif-goose/goose` v1.45.0 (`crates/goose/src/skills/mod.rs:383-388`,
`:456-466`, `:129-149`) — the rule and its validation against real Goose session payloads are
recorded in `docs/splash/skill-payload-2026-08-04.md` §1.4 and are not re-derived here.

---

## 0. The four things this survey establishes

1. **The gate-closes-into-a-file design really is more portable, and the measurement shows by how
   much.** Every gate in the twin is a file read or a file write. No gate anywhere in the six phases
   depends on conversation state, a structured-question tool, a file-sending tool, or a slash
   command — and the twin's prose contains **zero** host-specific tool names (measured, §2).
   This is the single largest difference from the original, whose audit lists four host-coupled
   gates by name (`docs/splash/host-gates-audit-2026-08-02.md` F6, F7, F11, F12).
2. **The Goose `load_skill` overflow — the blocking fact carried over from the original — does not
   reproduce on the twin as the tree stands.** Measured: the twin's largest skill payload is
   **38 642 characters against Goose's 200 000-character threshold**, a 5.2× margin, where the
   original's `splash` was 294 111 and was dumped to a temp file with the prose never entering
   context. The cause was `node_modules` recursion; **no twin skill directory contains a
   `node_modules` or a single symlink** (measured, §5).
3. **The skill-depth problem is real, host-specific, and already solved for two of the five hosts by
   the plugin manifest — verified, not assumed.** Goose discovers `twin/skills/*` at arbitrary depth;
   Claude Code loads all 15 through `.claude-plugin/plugin.json`; **Gemini discovers nothing at
   depth 2** and needs 15 flat links. Codex is untested (§5).
4. **What actually blocks the pilot is not discovery — it is that the twin has no installed form.**
   Three craft genres resolve their runtime, their key and their binary relative to *this
   development checkout*, three directories above the script (`../../..` = `twin/`), and the
   root-template install declares none of the packages they need. Preflight reports
   `dependencies: pass` on a root where video, map and web production cannot start (§1.4).

---

## 1. What the twin actually requires of a host

### 1.1 The gates are files, and that is the whole state machine

`whereIs(storyDir)` (`twin/skills/splash-twin/scripts/where.mjs:278-313`) reads a directory and
returns one of six phases. It consults nothing else — no transcript, no memory, no environment.
The six phases and the file each gate closes into (`twin/skills/splash-twin/SKILL.md:244-249`):

| Phase | Gate | Closes into | Host capability the closure needs |
|---|---|---|---|
| `intake` | — | `source/article.md`, `source/profile.json` | write-file |
| `framing` | G1 | `STORYBOARD.md` created | write-file |
| `storyboard` | G1, G2a/b/c | `STORYBOARD.md` front matter: `takeaway`, six hand fields, `grounding`, `reference`, and per slot `medium`/`genre`/`size`/`reachable`/`chosen` (`where.mjs:63-64`) | write-file, read-file |
| `production` | G3, per beat | `beats/<n>-<slug>/APPROVED.md` (`where.mjs:251-276`) | write-file, **plus the model must SEE the render** (§1.3) |
| `delivery` | — | `export/*` | write-file |
| `done` | — | terminal | read-file |

**What this buys.** A host that loses the conversation between turns still recovers the exact
phase, because the phase is a fact about the filesystem. This is not a claim — it is the design of
`whereIs`, and it is what makes the twin structurally immune to the failure the original hit on
Goose's `claude-code` provider, where *"le travail est perdu entre les tours … au troisième tour, le
modèle redemandait l'article qu'il avait déjà lu"* (`docs/installer/goose-desktop-findings.md:236-243`).
The original's six gates are non-skippable *by prose*; the twin's are non-skippable *by directory
listing*.

**What breaks if a host cannot write.** Everything, immediately and loudly — `intake` never leaves
its phase, and `whereIs` reports `["source/article.md", "source/profile.json"]`. There is no silent
degradation path: no gate has a conversational fallback that could stand in for its file. That is
the design's best property under host variance.

**What breaks if a host can write but cannot read back.** Nothing is detectable. `whereIs` would
report `intake` forever and the run would loop. No host among the five is known to have this
asymmetry; naming it because the design has no defence against it.

**What breaks if a host loses its working directory between turns.** This is the live risk, and it
is not hypothetical. Three separate mechanisms take a path relative to *something the host
controls*:

- `readPalette(import.meta.dirname, { stopAt: process.cwd() })` — the documented call in
  `twin/skills/twin-chart-beat/SKILL.md:129` and `twin/skills/twin-palette/SKILL.md:172`. The
  palette search walks up from the beat directory and **stops at the process's cwd**. A producer
  spawned from a different directory searches a different range.
- `runPreflight({root, …})` (`twin/skills/splash-twin/scripts/preflight.mjs:155`) takes `root` as a
  parameter. **Nothing in the twin resolves what `root` is.** No `SPLASH_ROOT`, no resolution
  sentence, no `<root>` definition — measured: a grep for `SPLASH_ROOT|repo-root|process.cwd` across
  all 15 `SKILL.md` files returns six hits, all of them the `<root>/shared/...` import path, none of
  them a rule for finding the root. This is finding **F5/S2** of the original's audit
  (`docs/splash/host-gates-audit-2026-08-02.md:300`) present unchanged in the twin.
- Goose Desktop starts its renderer with `GOOSE_WORKING_DIR=/Users/rmdms` — **the app opens in
  `$HOME`, not in a project** (measured on the original, `docs/installer/goose-desktop-findings.md:190-196`).
  So on the pilot's own host, the default cwd is the one place a Splash root is *not*.

### 1.2 The runtime requirement is Bun specifically, not "a JS runtime"

Measured across `twin/skills/*/scripts/*.mjs`:

| Bun-only API | Site |
|---|---|
| `Bun.resolveSync` | `splash-twin/scripts/preflight.mjs:56` — **in preflight**, so the very first thing a session runs cannot run on Node |
| `Bun.build` | `twin-deliver/scripts/deliver.mjs:235` |
| `Bun.CryptoHasher`, `Bun.file` | `twin-deliver/scripts/deploy-embed.mjs:89,138` |
| `Bun.file` | `twin-dw-beat/scripts/produce.mjs:97` |

None of the five hosts ships Bun. Every one of them reaches it the same way — through a shell whose
`PATH` resolves it. On Goose Desktop that resolution is real but conditional: the app's own `PATH`
is `/Applications/Goose.app/Contents/Resources/bin:/usr/bin:/bin:/usr/sbin:/sbin` (no `/usr/local/bin`),
and Bun is found only because Goose spawns a **login+interactive** shell (`-l -i`) to recover the
profile `PATH` — read in the upstream source at v1.45.0 and confirmed with a live probe under the
app's exact environment (`docs/installer/goose-desktop-findings.md:126-173`). **That recovery is
only as good as the journalist's shell profile**, and it fails silently as `command not found: bun`
(F3, same document).

### 1.3 The requirement nobody has written down: the host's model must be able to LOOK at a PNG

The render ladder's terminal rung is not a check, it is an act of vision. Measured occurrences:

- `twin-chart-beat/SKILL.md:6` — *"write the chart, render the still, look at it"*; `:109`
  *"**Look at the PNG**, on the ground the newsroom actually uses, on a dark one, and at the size…"*;
  `:148` *"Now open pngPath and look at it."*
- `twin-chart-web/SKILL.md:211-212` — *"Then look at the screenshots yourself … it cannot see a
  label colliding with a line, a clipped mark"*; `:237` *"OPEN THE SCREENSHOTS AND LOOK."*
- `twin-map-beat/SKILL.md:95` — *"Draw the still, and look at the PNG. Not the SVG, not the tests."*
- `twin-image-beat/SKILL.md:139`, `twin-scrolly/SKILL.md:137`, `twin-dw-beat/SKILL.md:147`,
  `twin-doctrine/SKILL.md:69` — the same instruction, seven skills in total.

This makes **a vision-capable model a hard host requirement for G3**, on every host, and it is not
a tool the host provides — it is a property of the model the journalist configured. On Goose that
model is chosen by the journalist in the app's own provider screen, which our install deliberately
does not touch (`docs/superpowers/specs/2026-08-03-goose-desktop-runtime-design.md`, step 4). A
text-only or image-blind free tier turns every "look at it" into a sentence the model answers from
the SVG or the test output — which is precisely the failure `twin-doctrine/SKILL.md:69` was written
against, and which the memory note on the original already records
(*"prendre un modèle gratuit qui accepte l'IMAGE"*). **Untested on all five hosts for the twin.**

### 1.4 The install: what a fresh root actually gets, and what it cannot then do

`twin/skills/splash-twin/SKILL.md:352-355` states the install in full: copy `assets/root-template/`,
*"This is the whole install: there is no separate installer script, so what lands under this
directory is exactly what a newsroom ends up with."* Measured, that template declares six runtime
packages (`root-template/package.json`): `@resvg/resvg-js`, `d3-array`, `d3-scale`, `d3-shape`,
`react`, `react-dom`.

Measured, what the craft scripts actually need beyond that:

| Need | Sites |
|---|---|
| `puppeteer` (real `import`) | 7 scripts across `twin-chart-web`, `twin-map-web`, `twin-map-beat`, `twin-scrolly` — e.g. `twin-map-beat/scripts/bake-plate.mjs:24` |
| the `remotion` **binary at `<PACKAGE_ROOT>/node_modules/.bin/remotion`**, spawned with `cwd: PACKAGE_ROOT` | `twin-chart-video/scripts/render-video.mjs:66-69` and `twin-map-beat/scripts/render-map.mjs:179-183`, where `PACKAGE_ROOT = resolve(HERE, "../../..")` (`:23` and `:48`) — i.e. **`twin/` itself** |
| MapLibre from `unpkg.com` at render time | `twin-map-beat/scripts/bake-plate.mjs:54-55` — outbound network to a CDN, not a vendored file |
| a Chrome binary | `resolveChrome()` in each puppeteer script, e.g. `bake-plate.mjs:74-92` |

And preflight's dependency check reads **only** `pkg.dependencies` of that same template
(`preflight.mjs:21-24`), resolving them from `root` (`:53-61`). So:

> **A fresh Splash root passes preflight with `dependencies: pass` and cannot render anything but a
> static chart.** Video and map production do not fail at the root at all — they reach for
> `twin/node_modules/.bin/remotion`, which exists only in this development checkout.

This is the same defect shape the original already paid for once: `pack-skills.mjs` merged only
`pkg.dependencies` and silently dropped `devDependencies`, so the first produce from a packed tree
died on `Cannot find package 'vite'` (`docs/installer/claude-desktop-findings.md:152-160`). Here the
gap is one level worse, because `PACKAGE_ROOT` does not merely miss a package — it points outside
the newsroom's root entirely.

**Same class, second instance — the key has two homes.** `recordKey` writes a pasted key to
`<root>/.env` (`splash-twin/scripts/keys.mjs:62`). The map producers read theirs from
`new URL("../../../.env", import.meta.url)` — `twin-map-beat/scripts/bake-plate.mjs:67`,
`twin-map-web/scripts/bake-plate.mjs:73`, `twin-map-web/scripts/verify-live-map.mjs:311` — i.e.
`twin/.env`, which exists in this checkout and holds a real `MAPTILER_KEY`. **The two are never the
same file.** The scripts accept a `--env` override; measured, **no `SKILL.md` ever passes it**.
Measured additionally: both Bun and Node resolve the symlink before computing `import.meta.url`, so
a symlink install does not repair this — it makes the producer read *the developer's* `.env` while
the journalist's key sits unread in their own root.

---

## 2. The verbs

The design adopts six abstract verbs — `read-file`, `write-file`, `execute-shell`, `search`,
`fetch`, `invoke-skill` — *"used in skill prose so the twin can leave Claude Code without a
rewrite"* (`docs/superpowers/specs/2026-08-06-splash-doctrine-twin-design.md:139`).

**Measured: the vocabulary is used in exactly one document.** `twin/skills/splash-twin/SKILL.md`
uses `invoke-skill` ×4, `fetch` ×4, `read-file` ×3, `execute-shell` ×3, `search` ×2, `write-file` ×1.
Every apparent hit in the other fourteen is ordinary English or a JavaScript identifier — `fetchFn`,
`fetchWithTimeout`, "fetches the homepage", "a search that finds". The craft skills speak in
concrete command lines instead (`bun …`: 5 in `twin-map-beat`, 3 each in `twin-chart-web` and
`twin-map-web`, 2 each in `twin-chart-video` and `twin-scrolly`, 1 in `twin-image-beat`).

That is less bad than it sounds, and the reason matters:

| Verb | Who performs it | Host-neutral? | The failure to hunt |
|---|---|---|---|
| `read-file` | the agent | **Yes** on all five | none known |
| `write-file` | the agent | **Yes** on all five, but sandboxed differently. Codex's `workspace-write` denies writes outside `[workdir, /tmp, $TMPDIR]`, which is how the original's produce died under unattended `codex exec` (`docs/installer/codex-proof.md:137-143`) | a producer's Chrome cache write denied → produce cannot finish |
| `execute-shell` | the agent | **Yes** on all five — and it is the twin's real workhorse: every render, every probe, every gate write goes through a `bun` command | `PATH` without Bun on a Dock-launched app (§1.2) |
| `fetch` | **a script, never the agent** — `runPreflight({fetchFn})`, `deriveCharter({fetchFn})`, `dw-client.mjs` | **Yes, and this is a genuine portability win**: no host needs a web-fetch tool, only outbound network from the shell | a sandbox with the shell but no network — Codex's `workspace-write` defaults `network_access = false` (`install/runtimes/codex.sh` seeds it true) |
| `search` | **the agent, with no script behind it** | **No.** `twin-doctrine/SKILL.md:47-49` — *"Live reference research — going out and finding a new real treatment"* — is the one verb with no implementation. There is no search script in `twin-doctrine/scripts/` | **This is the verb that silently does nothing.** It has already produced a hole once: A15 records the reference set having no line for the story's argument structure and *"a live search returned only NGO reports. Nothing was cited to fill it; the hole is written into `STORYBOARD.md`."* On a host with no web capability at all, the same gate closes the same way and nothing distinguishes "searched and found nothing" from "could not search" |
| `invoke-skill` | the agent | **Measured yes on three, untested on two** — see §4 |

**Measured, and worth stating plainly: the twin's prose names no host-specific tool.** A grep across
all 15 `SKILL.md` files for `AskUserQuestion`, `SendUserFile`, `SendUserMessage`, "slash command",
`/splash`, and each of the five host names returns **five hits, all of them file paths into
`skills/splash-twin/…`**. Compare the original, whose audit had to open two findings for exactly
this (F11: `SendUserFile` named first though Claude-only; F12: `/splash` documented as *the* entry
point though it exists on one host — `docs/splash/host-gates-audit-2026-08-02.md:306-307`).

**The one gate that is prose, everywhere.** `twin-deliver`'s offer-then-wait — *"offer the
journalist the forms their beat's genre allows, wait for the choice, and materialise only that
one"* — is the twin's version of the original's "WAIT means WAIT", which the audit graded **Non**
because nothing prevented phase 1 and phase 2 in the same turn (F7). The twin narrows it: `offerForms`
requires the beat's `APPROVED.md` and throws without it (`splash-twin/SKILL.md:291-294`). That makes
*calling it early* mechanical. It does not make *waiting for the answer* mechanical. Host-neutral,
because it is equally unenforced on all five.

---

## 3. The skill-depth problem, measured host by host

The twin's skills sit at `twin/skills/<name>/SKILL.md` — one level deeper than the original's
`skills/<name>/`. What each host does with that, measured today:

| Route | Goose 1.45.0 (app) | Goose 1.43.0 (CLI) | Claude Code 2.1.226 | Gemini 0.50.0 | Codex 0.144.1 |
|---|---|---|---|---|---|
| 15 flat symlinks in `~/.agents/skills/` | **15 ✔** | **15 ✔** | not applicable | **15 ✔** | untested |
| one symlink `~/.agents/skills/twin → twin/` (depth 2) | **15 ✔** | — | not applicable | **0 ✘ "No skills discovered"** | untested |
| one symlink `~/.claude/skills/splash-twin → twin/` | **15 ✔** | — | **15 ✔** as `splash-twin@skills-dir` | **0 ✘** | untested |
| `--plugin-dir twin` (session-only) | n/a | n/a | **15 ✔** as `splash-twin@inline` | n/a | n/a |

### 3.1 Does the manifest do the work? Verified by isolating it

The C1 note asks whether `.claude-plugin/plugin.json` already solves the depth problem, *and how
that was verified rather than assumed*. Two controlled probes, each a copy built in the scratchpad
with symlinks into the tree:

- **`--plugin-dir` route:** a directory holding only `skills/*` and **no** manifest still loads all
  15 (`plugin details` reports `Skills (15)`). So under `--plugin-dir` the manifest is **not**
  load-bearing for discovery — it supplies the name, version and description, and
  `claude plugin validate twin` passes.
- **`~/.claude/skills` route:** a directory holding `skills/*` and **no** manifest loads **nothing**
  ("No plugins installed"). Add `.claude-plugin/plugin.json` and the same tree loads all 15.
  **On this door the manifest is strictly required.**

Since `~/.claude/skills` is Claude Desktop's door (`docs/installer/claude-desktop-findings.md:11-34`),
the manifest added on 2026-08-09 is doing real work there — but that work has **only been verified
through the Claude Code CLI reading the same directory**, not through the Desktop app itself.

A third probe, for completeness: a **flat** skill directory placed directly under `~/.claude/skills`
(the shape the original's installer produces — `SKILL.md` at the top, no `skills/` subdir, no
manifest) registers **no plugin** in Claude Code 2.1.226. Those directories are still surfaced as
plain personal skills — this very session lists the original's 17 un-namespaced while
`claude plugin list` shows none of them — so the route works, but `plugin list` is not its
instrument and I could not instrument it without a model turn. **Recorded as inference, not
measurement.**

### 3.2 One symlink can serve three hosts

Measured, and the most useful single result here: with `~/.claude/skills/splash-twin → twin/` and
**nothing else**, both Claude Code **and** the Goose Desktop binary list all 15. Goose scans
`~/.claude/skills` among its eight discovery roots and walks to arbitrary depth
(`crates/goose/src/skills/mod.rs:316-342`, `:425-438`, recorded in
`docs/splash/skill-payload-2026-08-04.md` §2.4). Gemini does not read that directory at all
(measured: 0 skills).

So the smallest wiring that covers all five candidate hosts is **two doors**:

1. `~/.claude/skills/splash-twin → twin/` — one link. Serves Claude Code, Claude Desktop (inferred,
   same loader), and Goose.
2. `~/.agents/skills/<name> → twin/skills/<name>` — fifteen links. Serves Gemini (measured),
   Codex (documented + Layer A proven on the original), and Goose again.

---

## 4. Per host: measured, inferred, untested

### 4.1 Goose App — the pilot's host, so the one that decides

**Measured today, on the app's own embedded binary 1.45.0:**

- All 15 twin skills are discovered, by all three routes in §3. Locations resolve through symlinks.
- Description cost in every system prompt: **1 144 tokens** for the 15 (Goose's own tokenizer).
  Largest single description: `twin-palette` at 127.
- `SKILL.md` content tokens, Goose's tokenizer: `twin-chart-web` 7 944 · `splash-twin` 7 676 ·
  `twin-map-web` 7 321 · `twin-scrolly` 4 929 · `twin-storyboard` 4 387 · `twin-chart-video` 4 313 ·
  `twin-image-beat` 4 277 · `twin-doctrine` 4 217 · `twin-deliver` 4 054 · `twin-map-beat` 4 015 ·
  `twin-chart-beat` 4 014 · `twin-dw-beat` 3 606 · `twin-newsroom-charter` 3 093 · `twin-palette`
  3 018 · `twin-intake` 1 128.
- **Zero parasite skills.** The original surfaced `playwright-cli` and `playwright-trace` out of
  `dw-chart/node_modules/playwright-core/…` (B6, `docs/splash/skill-payload-2026-08-04.md` §4).
  No twin skill directory contains a `node_modules` or a symlink at all (measured: `find` over all
  15 returns 0 of each), so B6 cannot reproduce.
- **The `load_skill` overflow does not reproduce.** Simulating Goose's exact enumeration rule over
  the 15 skill directories:

  | skill | files enumerated | `SKILL.md` chars | enumeration chars | payload chars | vs 200 000 |
  |---|---|---|---|---|---|
  | `splash-twin` | 38 | 30 685 | 7 757 | **38 642** | ok (5.2× margin) |
  | `twin-chart-web` | 14 | 31 996 | 2 573 | 34 769 | ok |
  | `twin-map-web` | 20 | 29 706 | 3 588 | 33 494 | ok |
  | `twin-chart-beat` | 52 | 16 000 | 10 494 | 26 694 | ok |
  | *(the remaining 11)* | 7–27 | 4 738–19 534 | 1 216–4 944 | 6 154–24 540 | ok |

  For contrast, the original's `splash` enumerated **748 files** for **294 111 characters** and was
  dumped to a temp file, the model receiving *"50 lines of paths and zero prose"*
  (`docs/splash/skill-payload-2026-08-04.md` §0 item 4, §3).

  ⚠️ **This margin is a property of the current tree, not of the design.** The rule descends into
  everything except `.git`/`.hg`/`.svn` and follows symlinks. The day anything installs a
  `node_modules` inside a skill directory — or a beat's renders land there — the 5.2× margin is
  gone. Nothing in the tree guards it. `twin-chart-beat` at 52 files is already the shape to watch.

**Inferred (from measurements made on the original, which are facts about the host):** Goose Desktop
executes a skill's scripts and reaches `bun` through a login shell; it opens in `$HOME`; it can
invoke a skill from a skill (`load_skill` observed firing, `docs/installer/goose-desktop-proof.md:161-186`);
the free provider tiers are the binding constraint, not the host.

**Untested for the twin, and these are the ones that decide C1.1:**

- Whether any of the 15 has ever been loaded by a live Goose model. No twin run on any host has
  happened; the only recorded twin run is the owner's 2026-08-10 session, in Claude Code.
- Whether the app's **window** (as opposed to its embedded binary, which is what every probe here
  and in the original interrogated) lists and fires them. The reserve is stated in the original's
  own findings and applies unchanged: *"ce n'est pas la même chose que « l'app affiche `splash` dans
  sa liste de skills à l'écran »"* (`docs/installer/goose-desktop-findings.md:277-282`).
- Whether the model the journalist configures can **look at a PNG** (§1.3).
- Whether the app asks for a permission click before running a shell command — never observed,
  because every measurement so far entered through the CLI point of the same binary
  (`docs/installer/goose-desktop-findings.md:298-302`).

### 4.2 Claude Code

**Measured today (2.1.226):** `claude plugin validate twin` passes. `claude --plugin-dir twin
plugin details splash-twin` reports **Skills (15)**, always-on **~2 018 tokens**, per-skill on-invoke
1.7k–11.9k (`twin-chart-web` dearest at ~11.9k, `splash-twin` ~11.5k, `twin-map-web` ~11.1k). Through
the `~/.claude/skills` door the same tree reports 15 skills and **~1 483** always-on. The manifest is
required on that door and optional under `--plugin-dir` (§3.1).

**Inferred:** the twin will behave here as the original did — this is the one host where the
original's nested invocation is proven massively (425/444 transcripts,
`docs/splash/host-gates-audit-2026-08-02.md` §7.2) and the only host where a twin run has actually
happened (the owner's 2026-08-10 session, which is what `FEEDBACK-2026-08-10.md` records).

**Untested:** nothing important. This is the reference implementation.

### 4.3 Claude Desktop

**Measured today:** nothing. `/Applications/Claude.app` is present; I did not instrument it, because
its skill loader has no command-line surface and driving the window is a model turn.

**Inferred, on strong evidence:** the door is `~/.claude/skills/` — established on the shipped
bundle 1.12603.1 by two independent strings in `app.asar`, plus a third showing the directory mounted
read-only into the sandboxed VM (`docs/installer/claude-desktop-findings.md:11-34`). Since Claude
Code 2.1.226 reads that same directory and I measured all 15 twin skills loading through it, the
twin should load in Claude Desktop by the same route. **This is an inference across two products
that share a loader, not a measurement.**

**Untested:** everything downstream of discovery — whether the app runs a skill's scripts, whether it
can reach `bun`, whether Layer B (a visual comes out) is reachable at all. The original's flag was
raised to `verified: true` **by decision, not by proof**, and its own note says so
(`docs/installer/claude-desktop-findings.md:65-72`).

**A wrinkle that now belongs to the twin too:** `~/.claude/skills` currently holds the original's 17
flat links. Adding `splash-twin` there puts both toolchains in front of the same journalist. Ids are
disjoint (15 vs 17, verified 2026-08-09) and the plugin route namespaces the twin's, so they cannot
collide — but nothing cleans the other's links, which the original already recorded as unguarded
(`docs/installer/claude-desktop-findings.md:56-63`).

### 4.4 Codex

**Measured today:** the binary is present at 0.144.1 — the exact version the original's proof ran
against. `codex --help` exposes no skills command, so **nothing about the twin was measurable
without spending a model turn**. `codex plugin` is a marketplace mechanism, unrelated to
`~/.agents/skills` discovery.

**Inferred, from the original's live proof at this same version:** discovery is native and flat —
`~/.agents/skills/<name>/SKILL.md`, no manifest — and **nested skill-from-within-a-skill is proven,
not assumed**: a full `codex exec` fired `splash:suggest-article → splash:suggest-chart →
splash:dw-chart` as real nested calls (`docs/installer/codex-proof.md:128-135`). That retires
`invoke-skill` for Codex.

**The constraint that will bite the twin hardest,** and it is measured on the original: under
`workspace-write`, Playwright/Chromium writes outside `[workdir, /tmp, $TMPDIR]` are denied, so an
unattended produce cannot finish; the shipped launcher runs interactive Codex with
`approval_policy = on-request` and the journalist approves (`codex-proof.md:137-143`). The twin runs
**seven** puppeteer scripts across four skills and downloads MapLibre from `unpkg` at bake time, so
it presents more of that surface than the original did, not less.

**Untested:** whether Codex discovers `twin/skills/*` at depth 2 (my Gemini result makes depth-1
the safer assumption), and everything about the twin specifically.

### 4.5 Gemini

**Measured today (0.50.0), and it is the one clean negative in this survey:**

- 15 flat links in `~/.agents/skills` → **all 15 discovered `[Enabled]`**, with descriptions read
  correctly.
- One link at depth 2 (`~/.agents/skills/twin → twin/`) → **"No skills discovered."**
- The `~/.claude/skills` plugin-shaped door → **"No skills discovered."**

So Gemini needs the flat route and only the flat route. Everything else about Gemini is inherited
and unhappy: it needs **Node ≥ 20** at runtime while the toolchain installs only Bun; its free tier
caps at 20 requests/day and killed the original's Layer B before nested invocation
(`docs/installer/gemini-proof.md`, Proof result 2026-07-13); its auth path for individuals is
broken and needs an AI Studio key plus a settings fix. `gemini.verified = true` is, like Goose's,
a product decision rather than a proof, and its own document says so.

**Untested for the twin:** nested invocation, script execution, everything past discovery.

---

## 5. Ranked by what blocks the pilot

**Goose first, because that is the FJM pilot's host.**

| # | What blocks | Host | State | Cost to close |
|---|---|---|---|---|
| **1** | **The twin has no installed form.** Video and map production spawn `remotion` from `<twin>/node_modules/.bin` with `cwd` = `twin/` (`render-video.mjs:23,66-69`; `render-map.mjs:48,179-183`); map producers read the key from `twin/.env` (`bake-plate.mjs:67`); the root template declares neither `puppeteer` nor `remotion` nor `maplibre-gl`. **Nothing about this is host-specific — it blocks all five equally**, which is why it outranks every discovery question. | all | **measured** | a real install shape + a preflight that checks what production actually resolves |
| **2** | **Preflight goes green where production fails.** `checkDependencies` resolves only `root-template/package.json`'s six `dependencies` (`preflight.mjs:21-24,53-61`), from `root`, while producers resolve from the skill directory. A journalist is told they are ready and is not. | all | **measured** | make the check resolve what the craft scripts import, from where they run |
| **3** | **No root resolution anywhere.** `runPreflight({root})` and `readPalette(…, {stopAt: process.cwd()})` both need a root nobody defines; Goose Desktop opens in `$HOME`. F5/S2 of the original's audit, unclosed in the twin. | **Goose Desktop worst** | **measured** (twin) / measured (host) | one resolution sentence at the top of `splash-twin/SKILL.md` + a fail-loud when it is absent |
| **4** | **No host wiring at all.** The twin links itself into no door. The two-door recipe in §3.2 is measured and small. | all | **measured** | 16 symlinks |
| **5** | **`search` has no implementation.** The one verb a host must supply, with nothing to distinguish "found nothing" from "could not look" — already responsible for the hole recorded in A15. | all, unevenly | **measured** | make the reference loop record *which* it was |
| **6** | **Vision is an unstated hard requirement.** Seven skills terminate in "look at the PNG"; the pilot chooses their own model inside Goose. | all | **inferred from the prose; untested on every host** | state it in preflight and check it once |
| **7** | **The `load_skill` margin is unguarded.** 5.2× today, entirely because no skill directory holds a `node_modules`. Nothing keeps it that way. | **Goose only** | **measured** | a test that walks the 15 and fails on a payload over ~100 000 chars |
| **8** | Sandbox write denial for Chromium under unattended `codex exec`. | Codex | inferred (measured on the original at this version) | interactive approval, as shipped |
| **9** | Node ≥ 20 requirement; free-tier request caps. | Gemini | inferred | out of our hands |
| **10** | Claude Desktop's Layer B — no visual has ever come out of a desktop app on either codebase. | Claude Desktop, Goose App | **untested, both codebases** | one run, one paid provider |

---

## 6. The smallest first step

**Wire the two doors and run `splash-twin` once on Goose, with a vision-capable model, on a story
that only needs a static chart.**

Two doors is 16 symlinks (§3.2) and is measured to cover Goose, Claude Code, Claude Desktop and
Gemini. A static-chart story is the only genre whose producer the root template can actually
satisfy today (§1.4) — so it isolates the host question from the packaging question, which is
otherwise guaranteed to fail first and mask everything behind it. And it answers, in one run, the
four things nobody knows: does the pilot's window list the skills; does it fire
`splash-twin → twin-intake → twin-storyboard → twin-chart-beat` as real nested calls; does the shell
find `bun`; and can the model see the PNG it is told to look at.

If that run is green, blockers 1 and 2 become the whole remaining chantier, and they are packaging,
not hosts.

---

## 7. What this survey could not reach, stated rather than smoothed

- **No twin skill has ever been loaded by a live model on any host except Claude Code.** Every
  positive result above is a discovery-and-cost measurement — Layer A in the original's vocabulary.
  Layer B, for the twin, is **zero for five**.
- **Claude Desktop was not instrumented at all.** Its door is inferred from a sibling product
  reading the same directory. Nobody has watched the app itself list a twin skill.
- **Codex was not instrumented at all.** It ships no skill-listing command, and I would not spend a
  model turn on a read-only survey. Its depth behaviour is unknown; Gemini's negative makes depth-1
  the safer assumption.
- **The Goose payload table is a simulation of the upstream rule, not a capture of a real
  `load_skill` response.** The simulator reproduces the rule read at v1.45.0 and was validated
  against three real Goose payloads on the original to within 1.5 % (`docs/splash/skill-payload-2026-08-04.md`
  §1.4) — but not against a twin payload, because that needs a live turn.
- **The "flat personal skills under `~/.claude/skills` still work" claim is inference.** It rests on
  this session listing the original's 17 un-namespaced while `claude plugin list` shows none of them.
  I found no non-model command that enumerates personal skills.
- **The `.env`, `PACKAGE_ROOT` and dependency findings are read from code, not from a failed run.**
  They predict a failure; they do not record one. The prediction is cheap to falsify: copy
  `root-template/` somewhere clean, run a map beat, and see which `.env` it names in its error.
