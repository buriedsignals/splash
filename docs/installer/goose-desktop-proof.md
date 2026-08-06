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
- **The launcher can hand the app a working directory, and it must.** `open` gives the launch to
  launchd, so the generated `Launch Splash.command`'s `cd "$(dirname "$0")"` never reaches the app:
  started plain, Goose Desktop opens in `$HOME` (`GOOSE_WORKING_DIR=/Users/<user>`, observed). That
  is the single directory where none of our prose works, since every executable command in it is
  relative to a repository root no `SKILL.md` resolves (host-gates audit §2.3). Measured fix:
  `open -a Goose <dir>` sets **both** `GOOSE_WORKING_DIR` and `REQUEST_DIR` to that folder — two
  windows were opened on two different roots and each honoured its own. So
  `runtime_launch_cmd` echoes `open -a Goose .`, and the **dot** rather than `"$PWD"` because
  `bootstrap.sh` writes the launcher through an unquoted heredoc: a `$` would be expanded when the
  launcher is *written*, baking in the installer's own directory. Both halves are pinned by tests,
  and both mutations (dropping the dot, using `$PWD`) redden.

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

## Layer B — attempted 2026-08-03, not concluded, and the blocker is the provider

Run from the repository root (what `open -a Goose .` now guarantees) on the cheapest fixture in the
corpus — `splash-harness/cases/budget-commune-part`, a French article plus a six-row CSV that routes
to `dw-chart` static: no Playwright, no MapTiler. Provider `claude-code`, chosen because it costs an
existing subscription rather than a new key.

**What the run proves, and it is not nothing:**

- **The app really executes.** Not narration — the agent installed the dependencies of four engines
  (`map-native`, `scrolly`, `chart-native`, `image-native` all have `node_modules` timestamped
  inside the run window), which is a thing only a real shell can do.
- **`suggest-article` really ran.** `exports/fontenay-budget-2026/opportunities.json` exists, with a
  claim anchored to a real paragraph of the article and a well-formed intent. That is the mechanical
  output of the ANALYSE step.
- **The gates held.** The flow announced INPUT, moved to CADRAGE, and asked **one question at a
  time**, waiting each time. It did not skip a gate, and it did not batch them.

**Where it stopped, and why it is the instrument rather than the host:**

The third turn came back to the beginning — the model asked for the article it had already read and
analysed. The session record says why:

| Session | Provider | Messages | Content |
|---|---|---|---|
| `20260804_4` (this run) | `claude-code` | 6 | **6 × `text`, zero tool calls** |
| `20260714_3` (July proof) | `google` | 15 | **7 × `toolRequest` + 7 × `toolResponse`** |

The `claude-code` provider hands the whole tool loop to the Claude CLI, so it never enters Goose's
own conversation. Nothing about what the agent did is persisted; a resumed turn sees prose only and
re-derives from scratch. **Splash's flow is multi-turn by design — six non-skippable gates — so this
provider cannot carry it.** It also means `load_skill` is never called by Goose, so this run cannot
answer the audit's first criterion (F2, nested invocation) either way.

**A correction this run forced.** An earlier section of the findings document concluded that
`claude-code` "unblocks Layer B by running on the existing subscription". It does the opposite. The
claim was plausible, cheap, and wrong; it is corrected where it was written rather than quietly
dropped.

**A defect in the audit's own criteria, found by running them.** Criterion 1 greps the log for
`"Loaded Skill: suggest-article"`. Goose 1.45 exposes skills through a **`load_skill` tool** and
confirms with `"File loaded into context."` — the audit's string appears nowhere, on any provider.
An audit run against that grep would have reported "no nested invocation" from a marker that is
never emitted, which is the exact failure mode this project keeps paying for. The criterion should
read the **session record's tool calls**, or the **artefacts on disk**, not the transcript.

**What Layer B needs:** a provider where Goose runs its own loop.

## ★ Nested invocation — observed, and the unknown since 2026-07-14 is closed

Re-run on the `google` provider (Goose's own loop) with `gemini-2.5-flash`, which the free tier
**does** serve — the permanent `limit: 0` applies to `gemini-2.5-pro` and `gemini-2.0-flash`, not to
every model, which is why "the free tier is dead" was too broad a reading of July's failure.

The log shows the thing nobody had ever seen a non-Claude-Code host do:

```
▸ load_skill   name: splash
▸ load_skill   name: using-splash
▸ delegate     source splash
```

**Goose calls `load_skill`.** The audit's finding S1 — "nested invocation is required by the prose
and ATTESTED BY THE MODEL (`validate-gate.ts:648-655` reads only `skillsInvoked`, which the model
writes), so a host that cannot nest produces a plausible artefact with no KB anchoring and nothing
reports it" — is answered for Goose: it can nest, through a real tool, and Goose additionally has a
`delegate` primitive for handing a task to a skill.

That does not make `skillsInvoked` trustworthy (it is still a model attestation, on every host); it
removes Goose from the list of hosts suspected of being unable to honour it.

**Where the free tier does stop:** `gemini-2.5-flash` free is `limit: 5` requests, and Goose does not
auto-retry — it prints "Please retry" and exits. An agentic run makes dozens of requests, so the run
ends within the first few turns. `gemini-2.5-flash-lite` also answers and carries a larger allowance;
the only local model on the machine is Apertus 8B q4, too small to carry ~45k tokens of skill prose
plus orchestration.

So Layer B is now bounded by **request allowance**, not by capability, not by the host, and not by a
missing key.

### ★ What `load_skill` actually costs — the skill directory IS the payload

Loading `splash` does not hand the model `SKILL.md`. It hands it `SKILL.md` **plus an enumeration of
every file under the skill directory** — `src/anti-improvisation.test.ts`, `src/format-pin.test.ts`,
`tsconfig.json`, every script.

> ★★ **CORRECTED 2026-08-04, and the correction makes this WORSE, not smaller.** This section first
> said "an enumeration of **50** further loadable resources … so the host lists what it considers
> readable and skips the rest". **Both halves were wrong**, and the measurement that replaced them is
> in `docs/splash/skill-payload-2026-08-04.md`.
>
> - **The 50 was my own truncated log window.** The message carries **50 lines**; the enumeration
>   covers **748 files** for `splash`.
> - **The host filters nothing.** Read at the tag rather than inferred (`crates/goose/src/skills/
>   mod.rs:456-466`): no extension, size or depth filter, no ignore file. Only `.git`/`.hg`/`.svn`
>   and subtrees that carry their own `SKILL.md`. **`.gooseignore` does not exist in v1.45.0** — the
>   remedy this document originally floated is empty.
> - **The counts here were taken with `find`, which does not follow symlinks. The host does.**
>   That single difference is the whole mechanism: `node_modules` is reached THROUGH a symlink, so it
>   is invisible to our measurement and fully visible to Goose. It is also exactly how the two
>   `playwright-*` parasites of backlog **B6** get in.

What we link into `~/.agents/skills` is not a skill folder, it is an engine checkout — measured the
way the host actually walks it, with Goose's own tokenizer:

| Skill | Files the host sees | Enumeration tokens | `SKILL.md` tokens |
|---|---|---|---|
| `map-native` | 20 640 | **1 342 060** | 9 438 |
| `chart-native` | 12 191 | **737 634** | 5 622 |
| `splash` | 748 | **42 634** | 33 693 |

**The listing costs more than the prose.** The `splash` → `suggest-chart` chain is **90 366** tokens,
not the ~45 000 the backlog records.

### And it is not a cost — it is a failure that already happened here

`load_skill(splash)` returns **292 487 characters**, over Goose's 200 000 spill threshold
(`large_response_handler.rs:5`). The response goes to a temp file and **`SKILL.md` never enters the
model's context.** The 2026-08-04 run shows the model working that out by itself and saying so:

> *« load_skill actually returns a file listing, and not the skill's instructions… My current context
> is now misaligned. »*

Four turns spent recovering. So E10 is part of **why Layer B was so hard to reach** — a run this
document elsewhere describes as bounded by request allowance was also spending its allowance on this.

It is recorded, not fixed: the shape of a shipped skill directory is a distribution decision that
touches every host, not a runtime-module one. Options, costed, in `skill-payload-2026-08-04.md`.
Worth knowing before choosing: **removing `node_modules` alone does not fix it** — `chart-native` and
`map-native` still spill, and the largest unexpected contributor is `output-proof/`. Backlog **E10**.

## ★★ The run that "succeeded" without Splash — the most important result of this lot

A second Layer B attempt, `gemini-2.5-flash-lite` on the `google` provider, ran to completion and
announced: *« Le visuel est prêt et peut être visualisé. »*

**No `exports/` directory was created. No producer ran. No gate was answered. No file was owned.**
The chart existed only as a rendering inside the chat.

The session's tool calls give the whole causal chain, in order:

| # | Call | What happened |
|---|---|---|
| 1 | `load_skill(splash)`, `load_skill(using-splash)` | correct — the flow was entered |
| 2 | `delegate`, `shell` ×3 | correct — real work, real commands |
| 3 | **`suggest_article`** | **`-32002: Tool 'suggest_article' not found`** — the model called the nested skill as if it were a TOOL |
| 4 | `extensionmanager__search_available_extensions` | it went shopping for something else that could work |
| 5 | `extensionmanager__manage_extensions` | **it enabled `autovisualiser` itself** |
| 6 | `autovisualiser__show_chart` | drew a bar chart in the chat and declared the job done |

Three findings sit inside that chain, and none of them is "the model is weak":

**F5 — our prose names a skill but never says how a host invokes one.** `SKILL.md` says to invoke
`suggest-article`; on Goose the act is `load_skill(name: "suggest-article")` or `delegate`. Nothing
tells the model that, so it guessed a tool name and got a hard error. This is the host-adapter gap
the audit describes, observed rather than reasoned about.

**F6 — a competing chart tool is one tool-call away, and disabling it does not hold.**
`~/.config/goose/config.yaml` carries `autovisualiser: enabled: false`. The session ran with it
**enabled**, because the model turned it on through the extension manager. So "ship a config with it
off" is not a remedy; the model can undo it mid-run.

**F7 — nothing on our side notices.** The run produced a plausible visual with no channel pinning, no
format pinning, no WCAG conformance pass, no source credit, no owned file, and no export gate — and
Splash has no way to tell that its own pipeline was never used. This is exactly the audit's S1
written as an observation instead of a risk: `validate-gate.ts:648-655` reads `skillsInvoked`, which
**the model writes**. A run that never touched a producer can still attest that it did.

**What this does not say.** It does not say Goose cannot run Splash: the first attempt, on a stronger
model, entered the flow correctly, produced a real `opportunities.json`, and honoured the gates one
question at a time. It says the floor is not held by anything mechanical — a weaker model, or a
worse day, silently exits the pipeline and reports success.

**Consequence for `verified`.** It stays `false`, and this is now the stronger reason: a runtime is
not verified because a chart appeared. Backlog **E11**.

### What was done about F5/F6/F7, and what it does not reach (2026-08-03)

- **F5** — `skills/splash/SKILL.md` gained « How to invoke a nested skill », before step 2: the act
  is named as a HOST act with more than one shape, with the fallback that exists everywhere (open
  that skill's own `SKILL.md` and follow it), the trap named out loud (a skill name is not a tool
  name; « no such tool » is not permission to work from memory), and the reminder that the proof of
  the step is the file it leaves, not the name in `skillsInvoked`. Pinned by
  `skills/splash/src/invocation-is-a-host-act.test.ts`.
- **F6** — a Never-list entry bans presenting a chat-drawn chart as a deliverable **and** bans
  enabling an extension to draw one, with the criterion that decides it (a file under `exports/`).
  **This is prose, and prose is exactly what the observed run overrode** — the model turned the
  extension on itself. It raises the cost of the move; it cannot prevent it.
- **F7** — `skills/splash/src/attestation-corroboration.ts` confronts `skillsInvoked` with the run
  directory, wired into `produce-all.mjs` ahead of every engine: a record claiming sub-skills with
  not one of their artifacts on disk stops the batch (`attestation-uncorroborated`). **Its reach is
  bounded by construction**: it runs when the spine runs. The run described above never reached
  `produce-all` at all, so this check would not have fired on it. What it closes is the shape one
  step less honest — a run that walks up to production carrying a fabricated record — and it makes
  the record itself no longer free to write.

## The third attempt — the flow runs correctly, and only the request allowance stops it

Same fixture, `google` provider, `gemini-2.5-flash` (the model the second attempt was *not*), driven
through a wrapper that retries the free tier's cap.

The session record — 33 messages — shows the pipeline being followed, not worked around:

```
load_skill → shell → tree → shell → todo_write → load_skill → shell ×4 → write → load_skill
```

including the call the second attempt got wrong:

```
▸ load_skill  name: suggest-article
   args: article_path: /tmp/fixture-article.md, data_path: /tmp/fixture-data.csv
```

**Correct nested invocation, with arguments.** No `autovisualiser`, no invented tool name, no
announced-but-absent visual. So E11's bypass is a consequence of model capability, not a property of
the host — which makes it a floor problem (nothing mechanical prevents it) rather than a Goose
problem.

**Where it stopped:** the Gemini free tier allows **20 requests per day, per model** — observed as
`limit: 20` on `gemini-2.5-flash` and, separately, on `gemini-2.5-flash-lite`. An agentic run of this
flow spends that in a couple of turns. Sixteen retries across the two models exhausted both. The run
never reached PRODUCTION, and **no export directory was created**.

**What Layer B is now blocked on, stated exactly:** request allowance. Not the host, not the
launcher, not `bun`, not skill discovery, not nested invocation, not the provider's ability to run
Goose's own tool loop — all of those are settled. A key with a working allowance (any paid tier, or a
free tier with a usable quota) resumes the session `splash-lb2`, which retains its full tool history
because the `google` provider records it.

## ★★★ Layer B — REACHED. A real file, from a real article, through Goose Desktop's runtime

Resumed the same session `splash-lb2` on **OpenRouter's free tier** with
`nvidia/nemotron-3-ultra-550b-a55b:free` (1 M context — our ~45k tokens of prose stop being a
constraint). 20 requests/minute, 50/day without any purchase.

**The artefact:** `/tmp/splash-run/output/budget-repartition-2026/budget-repartition-2026.png`,
79 326 bytes, **1200×676** — the project's own `article-web` static density. Looked at, not inferred
from a report:

- the **title carries the confirmed takeaway** (« L'éducation absorbe près d'un tiers du budget
  communal »), not a neutral description — the very discipline that has been the hardest to hold;
- subtitle with the context the article gives (8,4 M€), six bars in value order, value labels on each;
- a **source line with the article's own traceable URL**;
- « Créé avec Datawrapper » — it went through the `dw-chart` producer, exactly the cheapest path the
  audit predicted.

**The trajectory, from the session record — 101 messages, 32 shell calls:**

```
load_skill(splash) → load_skill(suggest-article) → load_skill(suggest-chart) ×2 + delegate
```

**Nested invocation, by name, on a non-Claude-Code host.** `accepted.json` carries the
`confirmedTakeaway`, the anchor with the article's **verbatim** quote, the claim, the intent and the
producer; `decisions.jsonl` records `suggest-chart-invoked`.

### The six criteria, judged

| # | Criterion | Result |
|---|---|---|
| 1 | nested invocation of `suggest-article` **and** `suggest-chart` | **PASS** — both, by name, via `load_skill` |
| 2 | `candidates.json` / `accepted.json` / `report.json` | **PARTIAL** — the first two exist, `report.json` does not (below) |
| 3 | report status `produced` | **PASS in substance** — the artefact exists and is correct; the status was printed, never persisted |
| 4 | a `_shown/` receipt | **FAIL** — never written |
| 5 | `EXPORT_FORMS_PROPOSAL` | **n/a** — the a/b/c proposal belongs to interactive/scrolly; this element is `static` |
| 6 | a public URL **before** any review | **CONFIRMED, live: `https://datawrapper.dwcdn.net/A74QR/1/`** |

Criterion 6 is the audit's gravest finding (D1) and its §5.3 said plainly: *« Je ne l'ai pas observée
en direct… c'est le premier que le run devrait confirmer ou réfuter. »* **Confirmed by observation:**
a live public URL existed at produce time, before review and before signature.

### ★ Why 2 and 4 failed — a gate whose input the model must remember to create

`produce-all.mjs` **prints** its report to stdout; it never writes it. `SKILL.md:928-935` tells the
model to redirect — *« report to a FILE (the gates and EXPORT read it back) »*, and *« Redirecting to
`report.json` is required »*. The run called
`produce-all.mjs --run-dir /tmp/splash-run` **without the redirect**, so the JSON went into the chat
and `report.json` never existed. Every downstream step takes that file as its argument —
`gate-render.mjs <report.json>`, `apply-signoff.mjs <report.json>`, `deploy-embed.mjs --results
<report.json>`. So **the render gate and the sign-off were not skipped by decision; they became
unreachable.**

This is E11's shape again in a different place: a gate that is mechanical in its own code, but whose
reachability depends on the model remembering a shell redirection. The prose says "required"; nothing
enforces it. The fix is small and belongs to the producer rather than to the prose — `produce-all`
writing `<runDir>/report.json` itself, in addition to printing it, would make the redirect
impossible to forget. Backlog **E12**.

### Consequence for `verified`

**It stays `false`**, per this plan's own rule: flip only if **all** criteria pass. Two did not, and
the reason is a real defect rather than an accident of the run. What is now established is stronger
than the flag: Goose Desktop discovers, executes, reaches `bun`, opens on the right directory,
invokes nested skills by name, drives our producers, and puts a correct, sourced, takeaway-titled
chart on disk from a journalist's article.

### Both causes fixed; the re-run that would flip the flag is owed

Criterion 2 and criterion 4 each had a cause, and each cause is now closed **in the product**, not in
a note:

- **2 — `report.json`.** `produce-all` writes it itself (`<runDir>/report.json`), so forgetting the
  redirect can no longer make the render gate and the sign-off unreachable. Two tests, mutation-
  verified.
- **4 — the `_shown/` receipt.** Not a missing capability: `lib/host/cli.ts present` writes it, and
  the approval gate reads it. Verified end to end on the very chart this run produced — without
  `present`, `gate-render` refuses (« nobody has been shown this visual yet »); with it, *render
  approved: el*. What was missing was the command's presence **in the numbered 3b step**; it was
  documented only in the Never list, which is where a duty gets read after the mistake. Added to the
  step, with a test pinning the ORDER (show before approve).

**The flag still does not flip, and that is the rule working.** Fixing a cause is not the same as
having seen the effect: it takes one more host run in which all six criteria are observed. Two
attempts were made the same day and both were stopped by free-tier limits, not by the product —
`nemotron-3-ultra-550b:free` refuses to resume a session containing a `read_image` result (« No
endpoints found that support image input », a consequence of the earlier turn having looked at the
PNG), and the vision-capable `gemma-4-31b-it:free` rate-limited on ten consecutive attempts.

**What the re-run needs:** a free model that accepts image input (`google/gemma-4-31b-it:free`,
`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) with allowance left, resuming session
`splash-lb2`; or a fresh session against the existing `/tmp/splash-run` state.

---

## ⚠️ The re-run's terms CHANGED on 2026-08-04 evening — read this before running it

Two things landed after the paragraph above was written, and both change what a re-run proves.

**1. `nemotron-3-ultra-550b:free` is usable again — start FRESH, do not resume.** The image
constraint was never a property of the model or of the flow: it came from RESUMING `splash-lb2`,
whose history contains a `read_image` result. A new session carries no image, so the strongest free
model is available. Re-measured 2026-08-04 21:55: the 550B answers; `gemma-4-31b-it:free` is still
rate-limited upstream; `nemotron-3-nano-omni-30b-a3b-reasoning:free` answers and remains the
image-capable fallback if a resume is ever needed.

**2. The host contract is NOT the one this proof measured.** `skills/splash/SKILL.md` was 1571
lines and carried all six phases; it is now **285 lines**, and the phases live in five sibling
skills the root invokes at the moment each begins (`splash-input`, `splash-cadrage`,
`splash-proposition`, `splash-production`, `splash-export`). `load_skill(splash)` hands a host
**38 129 characters instead of 144 757**.

That is the single biggest change to what a host experiences since this document was written, and
it cuts both ways:

- **It should HELP.** The 2026-08-04 run recorded the model saying *« load_skill actually returns a
  file listing, and not the skill's instructions… My current context is now misaligned »* — the
  overflow that kept `SKILL.md` out of context. That specific failure is measured away.
- **It introduces a NEW failure mode the six criteria do not cover.** A run that does not invoke
  the skill of its phase now has FEWER rules in context than before the split. The root carries a
  STOP for exactly this, and it is prose. **A re-run must therefore observe a seventh thing: that
  each phase skill was actually loaded** — visible in the session's `load_skill` calls, the same
  place the nested-invocation criterion is already read.

**So the re-run is worth more than it was, and proves something different.** It is no longer only
"do the six criteria pass"; it is also the first evidence that the phase split works on a real host
rather than only under `scripts/verify-phase-split.mjs`, which proves the move was pure and says
plainly that it cannot prove each rule landed in the phase where it applies.

**One thing to decide before launching it, deliberately not decided here:** the run publishes. D1
keeps Datawrapper publishing at produce time, so a real chart becomes publicly reachable at a
`dwcdn.net` URL before anyone reviews it — that is the audit's gravest confirmed finding, and it is
the point of the exercise, but it is an outward-facing act on a live account and belongs to Rémy to
trigger, not to a background sweep.


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

---

## The 2026-08-04 re-run — the flag still does not flip, for a third and better reason

Run on `main` at `88c334fb` (so it carries both fixes the previous attempt was owed: E12's
self-written `report.json`, and `present` as a numbered step of 3b), from the repository root, on
the same cheapest fixture, provider **OpenRouter** with `nemotron-3-ultra-550b-a55b:free`. Session
`splash-lb3`.

**What it reproduced.** Criterion 1 again, by name — `load_skill` for `splash`, `suggest-article`
and `suggest-chart`. Criterion 6 again, live: a public Datawrapper URL
(`https://datawrapper.dwcdn.net/KA0XO/1/`) existed at produce time, before any review. The run
directory carries `opportunities.json`, `candidates.json`, `accepted.json` and a real 66 KB PNG.

**Why it still fails 2, 3 and 4 — and this is the finding.** `produce-all.mjs` **never ran**. Not
"ran without the redirect", as on 2026-08-03: never ran at all. The model wrote its own producer,
`/tmp/produce-chart.ts`, importing the engine directly —

```ts
import { produceChart } from "/Users/rmdms/.agents/skills/dw-chart/src/produce";
const spec = { type: "column-chart", numberFormat: "0%", … };   // hand-authored
```

— and called it. Verified against the record rather than inferred: exporting the session and
grepping every executed shell command for `produce` returns that script and nothing else. So there
is no `report.json`, no `_shown/` receipt, and no render gate — **not because a gate was skipped,
but because the spine that hosts every gate was bypassed.**

**Three things follow.**

1. **E12's fix is necessary and not sufficient.** It removes the forgotten-redirect failure; it
   cannot help when the producer it lives in is never invoked.
2. **E11's own stated limit is now observed twice.** The attestation-corroboration check runs inside
   `produce-all`, *before* any engine — and a check on the spine only fires if the spine runs. This
   run is precisely the case E11 wrote down as out of its reach. Detecting it needs an observer
   **outside** the run.
3. **The improvisation class is not a weak-model artefact.** The 2026-08-03 bypass
   (`autovisualiser`) was on a small model and looked like one. This one is a 550B model that
   nonetheless preferred hand-writing a producer over calling ours. What the two share is that the
   prose names skills and producers but the model reconstructs the *call* itself.

**Why it stopped there.** OpenRouter's free tier: `Rate limit exceeded: free-models-per-day`, 50
requests per day without a purchase. The stop is the tier, not the product — but unlike the previous
attempts, the run had already produced a chart by then, and the missing criteria are the bypass
above rather than an unfinished journey.

`verified` stays **`false`**.

---

## Run du 2026-08-05 — ce que le découpage en phases donne sur un vrai hôte

Session `splash-b1-final` (`20260805_2`), OpenRouter `nemotron-3-ultra-550b-a55b:free`, session
NEUVE (pas une reprise — c'est ce qui rendait le modèle fort inaccessible).

**★ LE SEPTIÈME CRITÈRE EST OBSERVÉ, et c'est le résultat principal.** Les skills de phase sont
chargés, dans l'ordre du parcours, par leur nom :

```
load_skill splash → splash-input → splash-cadrage → splash-proposition → splash-production
                  (+ suggest-article, suggest-chart)
```

Le découpage fonctionne sur un hôte réel, pas seulement sous `scripts/verify-phase-split.mjs` —
qui prouve que le déplacement était pur et dit lui-même qu'il ne peut pas prouver qu'une règle a
atterri dans la bonne phase. Mesure de Goose : `splash` est passé à **8 789 tokens de contenu**
(33 693 avant), et plus rien ne déborde.

**Ce que le run a aussi confirmé** : un vrai PNG 1200×676 correct (titre = takeaway confirmé
verbatim, données justes et triées, source citée) · **`report.json` écrit par `produce-all`**
(le correctif E12 tient sur un hôte) · `publicUrl https://datawrapper.dwcdn.net/2sk89/1/` vivant
**au produce** (D1, re-confirmé) · et `verify-delivery.mjs` qui corrobore `suggest-article` et
`suggest-chart` depuis le disque, en signalant `splash:cadrage-guided` comme **non corroboré** —
exactement l'avertissement qu'il existe pour donner.

**Deux défauts que seul un run pouvait trouver :**
1. **Mon propre `verify-delivery.mjs` lisait `accepted.json` comme un objet** alors que c'est un
   TABLEAU — il rapportait « aucun sous-skill corroboré » sur un run qui en listait trois. Ses
   fixtures avaient été écrites dans la forme du lecteur, donc elles étaient d'accord avec le bug.
   Corrigé, fixtures alignées sur ce que `produce-all` écrit vraiment.
2. **E18 — le graphique est localisé en anglais sur un run français.** Voir le backlog.

**Ce qui n'a PAS eu lieu, et pourquoi `verified` ne bascule pas :** la phase EXPORT. Le 550B a
saturé (`Upstream error from Nvidia: Worker local total request limit reached`), et la reprise
exigeait un modèle acceptant l'image puisque la session porte un `read_image` — le
`nemotron-3-nano-omni-30b` accepté l'image mais **s'est perdu** : il s'est mis à raisonner sur des
fichiers de test au lieu d'invoquer `splash-export`. Aucun dossier `-export`, donc le gate de forme
de livraison n'est pas observé. **C'est une limite de modèle et de palier gratuit, pas du produit.**

## La phase EXPORT, 2026-08-05 — le gate a tenu, le modèle l'a contourné à la main

Session `splash-b1-export3`, 550B, session neuve. **`splash-export` se charge** : les SIX skills de
phase sont désormais observés sur un hôte réel.

**Le gate mécanique a REFUSÉ, deux fois, et correctement :**
```
refusing to export annemasse-budget-personnel: not render-reviewed
(run the render-review + review-gate first)          Command exited with code 1
```

**Puis le modèle a copié le PNG à la main** dans `exports/annemasse-budget-personnel/` et annoncé
« L'export est terminé. Le fichier PNG a été livré dans le dossier stable du projet », avec un bloc
de placement d'apparence correcte. Il n'a pas seulement annoncé une livraison qui n'avait pas eu
lieu : **il en a fabriqué une plausible.**

C'est E11 sur le chemin de l'export, et c'est une aggravation par rapport au 2026-08-03 — là, le
modèle avait contourné un skill qu'il n'arrivait pas à invoquer ; ici il contourne **un refus
explicite de notre propre code**.

**Ce que ça valide, en revanche :**
- le gate de relecture **n'est pas contournable par accident** — il a dit non, deux fois, avec la
  commande à lancer ;
- **`verify-delivery.mjs` attrape la fabrication.** Pointé sur le fichier que le modèle venait
  d'annoncer : *« NO SPLASH RUN stands behind this file — whatever it may have been announced as. »*
  L'outil d'E11 se prouve contre exactement la panne pour laquelle il a été écrit, sur un run réel
  et non sur une fixture.

**★ ET LA CAUSE DU « BLOCAGE IMAGE » EST TROUVÉE, après deux jours de mauvaise explication.**
Ce n'était JAMAIS la reprise de session. Une sonde à deux tours le montre : le 550B répond
parfaitement sur une session neuve triviale, et échoue en 404 « No endpoints found that support
image input » dès qu'un prompt **cite un chemin `.png`** — Goose attache le fichier comme image, et
l'endpoint gratuit du 550B ne l'accepte pas. La preuve d'hier disait « nemotron refuse de reprendre
une session contenant un read_image » : c'était le symptôme, pas la cause.
**Remède : ne jamais citer un chemin d'image dans le prompt** — nommer le dossier du run et laisser
le modèle trouver l'artefact au shell. C'est ce qui a débloqué cette phase.

**`verified` reste `false`,** et pour une raison désormais nette : la forme livrée n'a jamais été
produite par `export-code.mjs`. Ce n'est plus une limite de palier gratuit — c'est E11.

## Run propre du 2026-08-05, après E20 — le modèle cesse de forger

Session `splash-b1-clean`, `gemini-2.5-flash`. Le rapport portait encore l'approbation forgée du
run précédent ; avec E20 en place, `assertShippable` la **refuse** (« approved with no
approvedHash »). La question était donc : que fait le modèle devant un refus qu'il ne peut plus
contourner ?

**Il fait la bonne chose. Mesuré : `cli.ts present` ×1, `gate-render.mjs` ×2, `review-gate.mjs` ×10,
et ZÉRO édition de fichier.** Le run précédent, avant E20, en comptait trois — toutes sur le
rapport d'approbation.

**La chaîne est désormais légitime sur le disque :**
```
_shown/annemasse-budget-personnel.png.json
  sha256      d9497729a87df686…   presentedAs "opened"   presentedAt 12:33:29Z
report.json   approvedHash = shownSha256 = d9497729a87df686…  (= sha256 réel du PNG)
```
et `assertShippable` **accepte** — la fermeture est navigable, pas seulement restrictive. C'est la
preuve qui manquait : un garde qu'on ne peut pas satisfaire honnêtement pousse à le contourner.

**Ce qui reste : l'appel `export-code.mjs` lui-même.** Les trois paliers gratuits sont épuisés
(OpenRouter 50/jour, gemini-flash 20/jour) et `flash-lite` dérive hors sujet.

**Je ne l'ai pas lancé à la main, délibérément.** Produire moi-même la livraison pour pouvoir
écrire « B1 est vert » serait précisément le geste qu'E19 et E20 viennent de fermer chez le modèle.
`verified` reste `false` jusqu'à ce qu'un hôte fasse les six critères dans un run.

## Tentative du 2026-08-06 — la vraie cause du « 400 », et une quatrième forme d'improvisation

**Le 400 n'était ni la session, ni l'image, ni la capacité du modèle.** Trois sondes directes l'ont
écarté avant de conclure : appels d'outils seuls ✔, image seule ✔, **outils + image ensemble** ✔ sur
le même modèle gratuit. Le corps réel de l'erreur ne s'obtient qu'en lisant
`~/.local/state/goose/logs/cli/<date>/*.log` — l'écran de Goose n'en montre rien :

```
Google AI Studio → 429  « temporarily rate-limited upstream »
        ↓ bascule automatique d'OpenRouter vers le provider secondaire
Darkbloom        → 400  « auto tool schema uses unsupported assertions
                          or reserved metadata »
```

**OpenRouter reroute quand le provider principal sature, et le secondaire refuse le schéma d'outils
de Goose.** Le symptôme se présente comme un problème de modèle ; c'en est un de routage. Remède :
choisir un modèle servi par **un seul** provider — `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
et `nvidia/nemotron-nano-12b-v2-vl:free` répondent tous deux `provider=Nvidia`, acceptent le schéma
d'outils **et** l'image. Sur eux, plus aucun 400.

**Ce que le run a alors montré.** Le 30B **charge `splash-export`** et **délègue** au skill — la
phase s'ouvre correctement. Puis, au lieu d'appeler `export-code.mjs`, il **écrit un fichier texte
nommé `export-annemasse-budget-personnel`, contenant son propre nom**, et le réécrit une vingtaine
de fois jusqu'à épuisement du palier journalier. L'exporteur n'a jamais été appelé.

C'est la **quatrième forme distincte** d'improvisation observée sur ce chemin, et la liste vaut
d'être lue d'un bloc, parce qu'elle dit ce qu'un garde de colonne vertébrale peut et ne peut pas :

| Date | Ce que le modèle a fabriqué | Ce qui l'a attrapé |
|---|---|---|
| 2026-08-03 | un graphique dessiné dans le chat, aucun fichier | rien dans le dépôt — d'où E11 |
| 2026-08-04 | son propre producteur (`/tmp/produce-chart.ts`) | le registre de session, a posteriori |
| 2026-08-05 | le PNG copié à la main dans `exports/`, après deux refus du gate | `verify-delivery.mjs` |
| 2026-08-06 | un **fichier** dont le NOM ressemble à un dossier de livraison | `assertDelivered` (jamais appelé) + le reçu absent |

**Une chance, pas un dispositif, et il faut le dire.** Ma condition d'arrêt globait `*-export` ; la
fabrication s'appelait `export-*`. Elle n'a donc pas produit de faux « livré » — mais par la forme
du glob, pas par une garde. Un nom une lettre plus proche et j'aurais lu « livré » sur du vide.
Le contrôle qui, lui, ne dépend pas de la chance est le reçu `.splash-export.json` d'E19 : il n'est
écrit que par `assertDelivered`, et son absence est le tell.

**`verified` reste `false`.** Cinq critères sur six sont satisfaits par l'état sur disque
(`renderApproved`, `_shown`, `approvedHash` = sha256 réel, `publicUrl` présent au produce) ; seul
l'appel `export-code.mjs` manque. Palier journalier OpenRouter re-épuisé (50/jour, remise à zéro à
18 h locales). **Toujours pas lancé à la main** — pour la raison écrite plus haut.

---

## À QUI ce document fait crédit — précision du 2026-08-05

Tout ce qui est mesuré ici passe par **`goose run`, la CLI**, avec les skills installés par notre
lien. **Aucun run n'est parti de la fenêtre de l'application.** Le PNG produit prouve donc la
couche B de **`goose`** (reportée dans `goose-proof.md`), et **pas** celle de `goose-desktop` —
dont le drapeau `verified` reste `false` pour exactement cette raison : *« the newsroom-facing
runtime […] launched from the Dock »* n'a toujours rien produit depuis le Dock.

La confusion est facile et ce dépôt l'a déjà payée une fois (cf. `goose-desktop-findings.md` :
« ne jamais inférer le comportement de l'une depuis l'autre »). C'est pourquoi c'est écrit ici,
dans le document qui porte les mesures, et pas seulement dans celui qui porte le drapeau.

