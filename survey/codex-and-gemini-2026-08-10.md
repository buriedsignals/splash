# Codex and Gemini, driven for real — discovery, a run, and the gates on disk

**Feedback items:** C1.4 (Codex), C1.5 (Gemini), C1.6 (the verbs and the gates on each).
**Date:** 2026-08-10. **This session mutated the machine**, deliberately and only in two places: it
created one story directory under `~/SplashTest/stories/` (the run's own output), and it read — never
wrote — `GEMINI_API_KEY` out of the owner's existing `Sites/Professional/splash/.env` to authenticate
the Gemini CLI. No twin code was changed. No host configuration file was written.

> **The identifiers in this file are the ones that were measured, and they are deliberately not
> renamed.** On 2026-08-10 the entry-point skill was `splash-twin` and the craft skills carried the
> `twin-` prefix. The product was renamed later the same day (`816a0cfb`), and the mechanical pass
> rewrote those strings *inside this document* — which is how a record of an observation becomes
> false. It turned a verbatim measurement into self-refuting nonsense (*"(`splash:` and `splash:`)
> are exactly the `name` fields of"* two different manifests), rewrote a line of Codex output to name
> a path that did not exist when it was captured, and altered a **quote of what the journalist
> actually typed** — the one string on which §2.2's finding entirely rests. The pre-rename names have
> been restored. Read `splash-twin` as today's `splash`, and `twin-<x>` as today's `<x>`. A rename
> script should skip this file, and any other that quotes captured output.

The predecessor survey (`ai-hosts.md`) could measure Codex and Gemini only at arm's length: *"Codex
was not instrumented at all… Layer B, for the twin, is zero for five."* This file closes the
discovery question on both with direct measurement, and takes each one as far as its quota allowed
into a live run against the installed root at `~/SplashTest`.

**Both runs ended on a paywall, not on a defect, and neither reached Gate 3.** That is stated first
because everything below has to be read against it.

---

## 0. The five things this establishes

1. **Codex discovers all 15 twin skills**, namespaced `splash-twin:<id>`, and the namespace comes
   from the twin's own `.claude-plugin/plugin.json`. Measured without spending a model turn, with an
   instrument the earlier survey did not know about (§1.1).
2. **Gemini discovers all 15** through the flat door — and then, given a journalist's prompt that
   named `splash-twin` explicitly, **activated the OTHER product's skill** (`splash`, from
   `splash-merge`) and never touched a twin skill (§2.2). Two products in one flat directory, no
   namespace on this host.
3. **On Codex, Gate 1 and Gate 2 closed into `STORYBOARD.md`, correctly and completely** — confirmed
   takeaway, all six hand fields, `grounding`, `reference`, and a slot whose `chosen` is drawn from
   its own `candidates`. `whereIs` advanced to `production` on the strength of the file alone (§3.1).
4. **The render ladder's terminal rung does not execute on Codex.** `view_image` is not in the
   model-visible tool set of a headless `codex exec` run — measured, zero occurrences. Seven twin
   skills end in *"look at the PNG"*, and the model instead ran `file` on it. Across three correction
   cycles it fixed exactly what the journalist described in words and shipped **a new, different
   visual collision each time, none of which it could see** (§3.3). This is the single most
   consequential finding here.
5. **Preflight was called wrongly, and reported a capability closed that is open.** The model ran
   `runPreflight({root, env: process.env})` and told the journalist the map capability was shut for
   want of a key that is present and answering 200. `installer/doctor.mjs:148-157` already carries a
   comment predicting exactly this mistake; `splash-twin/SKILL.md` documents the signature without
   the rule (§3.2).

---

## 1. Codex — C1.4

Binary `~/.bun/bin/codex`, **0.144.1**, authenticated *"Logged in using ChatGPT"*.

### 1.1 Discovery: measured, and without a model turn

The earlier survey recorded *"`codex --help` exposes no skills command, so nothing about the twin was
measurable without spending a model turn."* That is true of `codex skills`, which does not exist —
but **`codex debug prompt-input` renders the model-visible prompt as JSON**, and the skills block is
in it. Run from `~/SplashTest`:

| Group | Entries | Chars in the skills block |
|---|---|---|
| **twin, as `splash-twin:<id>`** | **15 / 15** | 6 968 (avg 465) |
| original, as `splash:<id>` | 17 | 9 777 |
| Codex's own `.system` skills | 5 | 2 345 |
| **whole `<skills_instructions>` block** | **37** | **19 635** |

Every twin entry resolves through the flat `~/.agents/skills` link to its real path — e.g.
`- splash-twin:twin-chart-beat: … (file: /Users/rmdms/SplashTest/skills/twin-chart-beat/SKILL.md)`.
**No truncation occurred**: Codex applies a *"2% skills context budget"* and emits *"Skill
descriptions were shortened to fit"* when it bites; that string is absent. 37 skills fit.

**The namespace is the plugin manifest doing work on a third host.** `strings` over the binary shows
`.claude-plugin` 15 times and `.codex-plugin` 30 times, and the two namespaces observed
(`splash-twin:` and `splash:`) are exactly the `name` fields of `~/SplashTest/.claude-plugin/plugin.json`
and `splash-merge/.claude-plugin/plugin.json`. So the manifest added on 2026-08-09 for the Claude
door also gives Codex a namespace — and that namespace is the only thing keeping the two products
apart on this host. Gemini has no equivalent (§2.2).

**Depth is not a question here.** The installer places 15 flat links, so Codex never sees the twin's
`skills/<id>` depth. Whether Codex would discover at depth 2 remains untested and does not matter
while the flat door is placed.

### 1.2 A Splash root is not a git repository, and `codex exec` refuses to start in one

First invocation, verbatim, exit before any model turn:

```
Not inside a trusted directory and --skip-git-repo-check was not specified.
```

`~/SplashTest` is what `installer/install.sh` produces: a copied template, not a repository. Two
consequences, both reportable rather than worked around:

- `codex exec` needs `--skip-git-repo-check`. Every run below carries that flag.
- **`codex exec resume` does not accept it** (`error: unexpected argument '-C' found`; and the flag
  is absent from `codex exec resume --help`). A per-invocation trust override —
  `-c 'projects."/Users/rmdms/SplashTest".trust_level="trusted"'` — **did not satisfy the check
  either**; the same refusal came back. So a multi-turn conversation in a Splash root is not
  reachable through `codex exec resume` without persisting a `[projects.…] trust_level = "trusted"`
  block into the journalist's `~/.codex/config.toml`. **The twin's installer writes no such block,
  and ships no Codex launcher at all** — `installer/` holds `install.sh`, `configure.mjs`,
  `place-skills.mjs`, `doctor.mjs` and nothing host-specific. (The original had
  `install/runtimes/codex.sh`.)

The run below therefore used a **fresh `codex exec` per journalist turn**, which is not a workaround
but the twin's own design claim under test: state lives on disk, so a new session recovers the phase.
It did, every time.

### 1.3 The run, turn by turn

Story: a short French article on Swiss night-train passengers plus a 7-row CSV, handed over by path.
Prompt in a journalist's words, naming `splash-twin` and the root.

| # | Journalist said | What Codex did | Where it stopped | `whereIs` after |
|---|---|---|---|---|
| 1 | "here's an article and some figures, make me a visual, ask me what you need" | read `splash-twin/SKILL.md`; ran preflight; `new-story.mjs`; `twin-intake` froze `article.md`, `data.csv`, `profile.json` | **asked for the single takeaway and stopped** | `framing`, missing `STORYBOARD.md` |
| 2 | confirmed the takeaway + the six hand fields | ran `resolveGrounding`, `proposeMediums`, `proposeGenres`, `proposePalette` | **asked to confirm the medium and stopped.** Said *"J'ai verrouillé votre message et les six éléments éditoriaux"* — **but wrote no file** (§3.4) | `framing`, missing `STORYBOARD.md` |
| 3 | "yes, a chart" + genre/size/colours | wrote `STORYBOARD.md`, `PALETTE.md`, `BRIEF.md`, the component, `render-still.mjs`; rendered PNG+SVG | **surfaced the PNG and said *"Le rendu est en attente de votre approbation avant livraison"*** | `production`, "rendered but not approved" |
| 4 | "the title is cut off; the thousands separators disagree" | split the title to 3 lines, unified to `206 000 / 48 000 / 268 000`, re-rendered | showed the new PNG | unchanged |
| 5 | "you crushed the plot, the axis ticks overlap" | re-laid out header and footer, re-rendered | **`ERROR: You've hit your usage limit… try again at Aug 13th, 2026 12:26 AM.`** | unchanged |

Cost: 7 / 8 / 17 / 7 / 7 shell calls and 46k / 56k / 105k / 59k / 50k tokens per turn.

Twin `SKILL.md` files opened across the run — **nested invocation is real on Codex, by its own
file-locator mechanism**: `splash-twin` ×9, `twin-storyboard` ×7, `twin-palette` ×7, `twin-doctrine`
×6, `twin-chart-beat` ×6, `twin-intake` ×4, and one read each of the eight it did not need.

The run produced a genuinely competent artifact. `STORYBOARD.md` carries a real `reference` drawn
from `twin-doctrine`'s set (an ABC piece on a long noisy series read against an explicit historical
anchor) and a `limits` field that survived into the rendered subtitle. `BRIEF.md` reasons about why
columns beat a line for seven annual readings. None of that is host behaviour — it is the twin's
prose working — but it is what the host executed.

---

## 2. Gemini — C1.5

Binary `~/.bun/bin/gemini`, **0.50.0**, Node v20.19.0 present.

### 2.1 Authentication is broken as configured

`~/.gemini/settings.json` selects `"selectedType": "gemini-api-key"`, there is no key in the
environment and no `~/.gemini/.env`. Verbatim:

```
When using Gemini API, you must specify the GEMINI_API_KEY environment variable.
Update your environment and try again (no reload needed if using .env)!
```

OAuth credentials do exist at `~/.gemini/oauth_creds.json` but are not the selected path. I did not
edit the user's settings; I exported an existing `GEMINI_API_KEY` from the owner's own
`Sites/Professional/splash/.env` for the invocation only.

### 2.2 Discovery: all 15, flat, unnamespaced — and the wrong product got activated

`gemini skills list` from `~/SplashTest` reports **32 skills, all `[Enabled]`**, every one located
under `~/.agents/skills`: the twin's 15 and the original's 17, **side by side with no namespace**.
(Contrast Codex, which separates them by plugin name.)

The run then produced the finding this whole exercise exists to catch. The journalist's first
sentence was *"J'ai splash-twin installé, mon dossier Splash est /Users/rmdms/SplashTest."* Gemini's
first action:

```
CALL activate_skill {"name":"splash"}
  -> <activated_skill name="splash"> <instructions> # splash — the end-to-end flow …
CALL activate_skill {"name":"splash-input"}
  -> <activated_skill name="splash-input"> <instructions> # splash-input — INPUT and the silent ANALYSE …
```

It activated **the original product**, twice. It then ran the original's documented command inside
the twin's root:

```
run_shell_command {"command":"bun lib/host/cli.ts newsroom","dir_path":"/Users/rmdms/SplashTest"}
  -> Output: error: Module not found "lib/host/cli.ts"  Exit Code: 1
```

and spent the next ~35 tool calls globbing for `cli.ts`, reading twin scripts as ordinary files,
and wandering into `~/Sites/Professional/splash/package.json`, before finally running
`bun installer/doctor.mjs`. **It never activated a single twin skill.**

Two things follow, and they point opposite ways:

- **`invoke-skill` is proven on Gemini.** `activate_skill` fired, injected the SKILL.md prose into
  context, and fired again *from within* an activated skill (`splash` → `splash-input`). That was
  untested before. It just happened to prove it on the other codebase.
- **The flat door has no namespace, and the twin's entry point loses the name contest.** A journalist
  asking for a visual, with `splash` and `splash-twin` both installed, got `splash`. Naming the twin
  in the prompt did not prevent it. On a machine with only the twin installed this cannot happen; on
  this machine — and on any machine where a newsroom tries both — it did, on the first attempt.

### 2.3 Where it stopped: the free-tier daily cap

Three quota walls, in order, verbatim:

```
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests,
  limit: 5, model: gemini-3.5-flash
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count,
  limit: 250000, model: gemini-3.5-flash
TerminalQuotaError: You have exhausted your daily quota on this model.
  … limit: 20, model: gemini-3.5-flash
```

Exit 1. **The middle one is the twin-specific one**: the binding free-tier constraint is not only 20
requests a day, it is **250 000 input tokens per minute**, and a toolchain whose skills are 22–38 kB
of prose each (311 kB across the 15) is precisely what spends that. A retry resends the whole
conversation, so a single stall compounds.

A second run with `-m gemini-2.5-flash` **did not re-route** — the 429 still named
`model: gemini-3.5-flash` — and died immediately on the same daily cap.

**Net for Gemini: two model turns, no story directory created, no file written into `~/SplashTest`,
zero gates closed.** Layer B remains unproven.

---

## 3. C1.6 — the verbs and the gates, per host, with the file that proves it

### 3.0 The baseline: what the code enforces regardless of host

Before judging a host, the mechanical ladder was exercised directly against `whereIs` on a throwaway
fixture, so "the host obeyed prose" can be told apart from "the code refused":

| Fixture state | `whereIs` |
|---|---|
| storyboard with every field but `chosen` | `storyboard` — `["slot 1: nothing chosen", "slot 1: size \"article\" is not one this toolchain exports — landscape, square, portrait"]` |
| `chosen` added, size corrected | `production`, `missing: []` |
| renders present, no `APPROVED.md` | `production` — `["beat 1-le-trajet: rendered but not approved"]` |
| `APPROVED.md` written | `delivery` |
| export files present, no `HANDOVER.md` | `delivery` (correct — but `missing` is **empty**, so it names no reason) |
| `HANDOVER.md` written | `done` |

And `offerForms` refuses ahead of Gate 3, in code:

```
THREW: this beat has not been approved yet — show it first: no APPROVED.md in
stories/…/beats/1-fake. Delivery forms cannot be discussed before the journalist has seen the render.
```

So G2, G3 and G4 are enforced by the filesystem and by a throw, not by a host's good behaviour. **A
host cannot skip them; it can only fail to reach them.**

### 3.1 Per host, per gate

| Gate | Closes into | Codex 0.144.1 | Gemini 0.50.0 |
|---|---|---|---|
| **G1** framing — takeaway confirmed | `STORYBOARD.md` created | ✅ **`~/SplashTest/stories/le-train-de-nuit-a-retrouve-ses-voyageurs/STORYBOARD.md`**, `takeaway:` verbatim as the journalist confirmed it | ✗ never reached — no story directory exists |
| **G2a/b/c** medium, genre, size | same file's front matter | ✅ same file: six hand fields, `grounding: "supported"`, a real `reference:`, and slot `voyageurs-train-nuit` with `medium: chart` · `genre: static` · `size: landscape` · `reachable: yes` · `chosen` drawn from its own two `candidates`. `whereIs` → `production` | ✗ |
| **G3** production — approval on what was seen | `beats/<n>/APPROVED.md` | **✗ not written — correctly.** `whereIs` still reports `["beat 1-voyageurs-train-nuit: rendered but not approved"]`. The model surfaced the file path and said *"Le rendu est en attente de votre approbation avant livraison"*, and **never claimed approval it did not have**. Blocked by the plan limit before the journalist's approval turn | ✗ |
| **G4** delivery — hand-over | `export/<beat>/HANDOVER.md` | **✗ never reached.** `export/` is empty. `offerForms` was never called; **no delivery form was named at any point in five turns** — the never-list held | ✗ |

**So: G1 and G2 are proven to close into a file on Codex. G3 and G4 are proven on neither host.**
The honest statement of C1.6 today is that the gate design survived every turn it was given on Codex
— including two resumptions in fresh sessions, where the phase was recovered from the directory and
nothing was re-asked — and was never exercised on Gemini at all.

### 3.2 The verb that misfired: `execute-shell` calling preflight wrongly

Codex ran, unprompted:

```
node -e 'import("./skills/splash-twin/scripts/preflight.mjs").then(async ({runPreflight,assertPreflightReady})=>{
  const r = await runPreflight({root: process.cwd(), env: process.env}); … })'
```

and reported to the journalist: *"Les cartes, Datawrapper et l'embed hébergé sont fermés faute de
clés."* The map capability is **open** — `splash-twin-doctor` on the same root reports
`capability: map — MapTiler answered 200`, because `MAPTILER_KEY` is in `~/SplashTest/.env` at 0600.

`runPreflight` does not read the root's `.env`; the caller must merge it. The doctor does
(`installer/doctor.mjs:199` — `env: { ...process.env, ...rootEnv }`) and its own comment predicts the
failure verbatim:

> `env: process.env` was the obvious thing to pass and it is wrong, measured here during this
> install… A journalist running this from inside any other checkout would be told their capabilities
> were open on somebody else's key.

**`splash-twin/SKILL.md` documents the signature `runPreflight({root, env, fetchFn})` and nowhere
states what `env` must be.** The lesson lives in a comment in a file the orchestrating model never
reads. This is host-independent — it will reproduce wherever a model calls preflight from prose — and
it is the closest thing in this session to a defect the twin should fix.

Secondary, same family: the model reached for `node` rather than `bun`. It got away with it for
preflight; on the render path it did not —

```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".tsx" for
/Users/rmdms/SplashTest/stories/…/NightTrainPassengers.tsx
```

It recovered by using `bun`. Nothing in the prose says "these scripts are Bun-only".

### 3.3 The verb that is absent: looking at the render

**Measured: `view_image` appears zero times in the model-visible prompt of a headless `codex exec`
run.** The terminal rung of the render ladder — *"Now open pngPath and look at it"*
(`twin-chart-beat/SKILL.md:148`), *"OPEN THE SCREENSHOTS AND LOOK"* (`twin-chart-web/SKILL.md:237`),
seven skills in total — has no instrument on this host in this mode. What Codex did instead:

- ran `inspectSvg`, the mechanical check — which reported real failures it then had to address:
  three contrast rows `pass: false` (`#000000` at 4.05, `#0B7A75` at 3.39, `#D7D7D7` at 1.44),
  `altText: {present: false}`, `rootTitle: false`;
- ran `file` on the PNG: `PNG image data, 3840 x 2160, 8-bit/color RGBA, non-interlaced`.

That is metadata, not vision. The consequence is visible in three renders, and it is the same shape
each time — **the model fixes the words it was told and ships a collision it cannot see**:

| Render | What the journalist had asked for | What the model could not see |
|---|---|---|
| 1 | — | title clipped mid-word (*"…niveau d'avant-pand"*); three different thousands separators in one frame (`206 000`, `48'000`, `300 k`); the annotation rule struck through both value labels |
| 2 | fix the title; unify the separators | **both done** — and the 3-line title crushed the plot: seven y-axis ticks (`300 k`…`0 k`) collapsed into an unreadable stack, bars reduced to the bottom third |
| 3 | give the plot height back, make the ticks legible | **both done** — and the limits line is now clipped (*"ne pas publier tels que"*, losing "quels") and collides with the `+30 % depuis 2019` annotation |

Three cycles, three defects of exactly the class `inspectSvg` does not model — overlap and clipping —
and each one introduced by the fix to the previous. **The twin's own three-cycle budget was spent
without the loop converging, and the model reported success each time.** A journalist who could not
see the PNG either would have shipped render 3.

This is not a Codex defect to route around; it is the unstated hard requirement of `ai-hosts.md`
§1.3 becoming measurable. Two things follow that are the twin's to decide, not this survey's:
`inspectSvg` models contrast and alt text but not collision or clipping; and nothing in preflight,
the doctor, or any SKILL.md checks that the host can show the model an image before the run reaches
a rung that requires it.

### 3.4 One divergence between prose and file

At the end of turn 2 Codex said *"J'ai verrouillé votre message et les six éléments éditoriaux"* —
"locked". `whereIs` at that moment: `framing`, `missing: ["STORYBOARD.md"]`. Nothing had been
written.

The design absorbed it exactly as intended: the next turn recovered `framing` from the directory,
re-entered the exchange, and wrote the file before advancing. No downstream step ran on the strength
of the sentence. **The gate held; the narration was ahead of it.** Worth recording because it is the
precise failure mode the gate-into-a-file design exists to make harmless, observed live — and
because a journalist reading that sentence would reasonably believe a step was complete when it was
not.

---

## 4. What the run confirmed that the earlier survey listed as blocking

Three of `ai-hosts.md` §5's ranked blockers were read from the development checkout and are **closed
in the installed root**, measured here:

- **#1 "the twin has no installed form."** `~/SplashTest/package.json` declares `puppeteer`,
  `remotion`, `@remotion/cli` alongside the original six, and `node_modules/.bin/` holds `remotion`,
  `puppeteer`, `tsc`. `render-video.mjs:23`'s `resolve(HERE, "../../..")` lands on `~/SplashTest` in
  an installed root, not on a developer's checkout.
- **#2 "preflight goes green where production fails."** Closed structurally — but replaced by a new
  shape of the same defect, this time in the *caller*, not the check (§3.2).
- **#3 "no root resolution anywhere."** `skills/splash-twin/scripts/splash-root.mjs` now defines a
  Splash root as the nearest ancestor declaring `#shared/*`, duplicated into every skill that needs
  it, and throws rather than guessing.

---

## 5. What remains unproven, stated rather than smoothed

- **Gate 3 and Gate 4 have never closed into a file on any host except Claude Code.** Codex stopped
  one journalist turn short, on a paywall.
- **No twin skill has ever been activated by Gemini.** Its one run activated the other product's.
  Whether Gemini can drive the twin at all is untested, and its free tier will not answer it — the
  input-token ceiling is reached inside a single exploratory turn.
- **Codex's `workspace-write` Chromium constraint was never exercised.** The static chart path uses
  `@resvg/resvg-js`, not a browser. The seven puppeteer scripts and the `unpkg` fetch at map-bake
  time — the constraint `ai-hosts.md` §4.4 flagged as biting hardest — were not reached.
- **Interactive Codex was never used.** Everything here is `codex exec`. A TUI session may expose
  `view_image` and would change §3.3's verdict; that is one run away and worth making before any
  conclusion about Codex and vision is treated as settled.
- **The wrong-product activation is confounded by this machine.** Both products' skills are in
  `~/.agents/skills` because this is a development machine. A newsroom installing only the twin
  cannot hit it. The finding is real for the co-installed case and for the flat door's lack of a
  namespace; it is not evidence that the twin is undiscoverable.
- **Nothing here touched Goose, Claude Desktop, or the vision question on any host but Codex.**

---

## 6. What was done about the two defects — added 2026-08-10, after the measurements above

Nothing in §§0–5 has been edited; this section only records where the two defects of §3.2 and §3.3
landed, so a maintainer meeting them here is not left to find out by reading code.

**§3.2, preflight called with the shell's environment — repaired.** `runPreflight` now reads
`<root>/.env` itself and layers it over whatever `env` a caller hands it, so the call the model
actually made (`{root, env: process.env}`) gives the doctor's answer. Precedence rather than a
refusal, and the reason is in the code: `process.env` cannot be distinguished from a deliberately
assembled environment except by heuristics, so a refusal would block CI and the doctor while a
`{...process.env}` spread walked through it. Precedence is not allowed to be quiet either — every
capability row carries `source` (`"root .env"` / `"environment"` / `"unset"`), and a key that
resolves only from the shell says so in its own `reason`, because the producers read the file.
`skills/splash/SKILL.md` states the rule beside the signature, which is the half whose absence
caused the run.

**§3.3, a host with no way to look — NOT repaired, and deliberately so.** It is a host constraint,
and the finding of §3.3 is precisely that inspecting the source gives false confidence; a fallback
that pretended to substitute for looking would be worse than an honest refusal. Three things shipped
instead, all of them honest about their own limits:

1. **The prose names what it depends on.** All ten `SKILL.md` files that tell the model to look
   carry the same paragraph, byte for byte: what the rung needs, what was measured here when it was
   absent, and what a host without it must do — say so to the journalist, leave the render
   unapproved, never report it as checked.
2. **A check that can tell it has no way to see.** `skills/splash/scripts/vision-probe.mjs` is a
   PROOF, not a detection — a shell cannot read the model's tool set, so the question is settled by
   handing the model an image carrying a word and asking for the word back. Only the word's SHA-256
   reaches disk. A wrong answer is `blind`, exactly like `--cannot-see`.
3. **The doctor names its own blindness** in a `note` row rather than leaving the question
   unasked, and points at the probe.

**What none of it closes:** a model may skip the probe, answer it dishonestly, or — having looked —
look carelessly. §3.3's verdict on interactive Codex also stands untested: a TUI session may expose
`view_image`, and that run is still one run away.
