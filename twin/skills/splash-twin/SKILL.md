---
name: splash-twin
description: Use to run the doctrine twin end to end — recover a story's phase from its own directory, refuse any jump ahead of it, close each gate into a file, and dispatch to the one craft skill a beat actually needs. Never produces a visual itself; that is always the craft skill's job.
---

# splash-twin — the orchestrator, sequencing and nothing else

## Overview

Runs the whole journey (spec §4) without ever holding it in memory. `whereIs(storyDir)`
(`scripts/where.mjs`) reads a story's own directory and returns the one phase it is actually in —
so a session resuming three days later, or a completely different runtime, recovers the same phase
a human would read off the filesystem by eye. This skill has exactly **four responsibilities, and
no fifth**:

1. **Sequence the phases and refuse the jumps.** The next legal action is whatever `whereIs` says
   the current phase is, dispatched to the skill that owns it. There is no path from `intake`
   straight to `production`.
2. **Hold state on disk, never in memory.** A story's phase is a fact about its directory, not a
   fact this skill remembers across a conversation. Two sessions reading the same `storyDir` get the
   same phase every time, whether or not either of them saw the other happen.
3. **Make each gate close into a file.** A gate is "closed" when the file it writes exists and is
   valid — never when a conversation merely reads as though it agreed. `twin-storyboard`'s own
   gotcha about a truthy-but-not-confirmed takeaway is a direct instance of this rule: a gate that
   can be satisfied by a fact readable *only* from a transcript is not really closed.
4. **Dispatch to the craft skill.** This skill decides *which* skill runs next; it never runs the
   render itself. Production of any pixel, embed or video belongs entirely to the craft skill
   matching the chosen candidate's medium and genre: `twin-chart-beat` (`chart`, `static`),
   `twin-chart-web` (`chart`, `web`), `twin-chart-video` (`chart`, `video`), `twin-map-beat`
   (`map`, `static` or `video`) — plus `twin-dw-beat`, the delegated Datawrapper path a chart
   slot's `vehicle` can name instead of a bespoke component.

This skill **produces nothing at runtime** — no artifact of its own, ever. Its entire value is the
sequencing discipline above and the test (`test/phases.test.ts`) that keeps this document and
`where.mjs` from drifting apart, the way `main`'s `SKILL.md` once kept promising a fallback the code
had stopped producing.

## When to use

- At the start of **every** turn of a doctrine-twin conversation, before doing anything else: call
  `whereIs(storyDir)` and let its `phase` decide what runs next. Never assume the phase from what the
  previous turn was doing.
- When a caller (human or agent) asks to skip a phase — refuse, and report `missing` verbatim.
  A missing prerequisite is **reported**, never argued around.
- Once per session, before any story exists: run `runPreflight` (`scripts/preflight.mjs`) —
  dependencies, `NEWSROOM.md`'s identity, and a **probed** (not merely present) `MAPTILER_KEY` /
  `DATAWRAPPER_TOKEN`. **Never silent**: it states the newsroom's identity, its credit convention,
  and every capability with what would open it, and asks once whether the journalist wants to fill
  a closed one. See "Preflight establishes what is possible" below for what "ready" actually means
  now — it is not "every check passed".
- **Not** for writing a chart, a map, a brief, or an export. Those are `twin-intake`,
  `twin-storyboard`, the craft skill, and `twin-deliver` respectively — this skill only decides
  which one of them runs next.

## The one gotcha that will waste your day (read first)

**A confirmed takeaway is G1, not G2 — and a resumed session that treats it as "storyboard done"
dispatches a producer against a contract nobody actually confirmed.** The concrete failure this
guards against: the editorial exchange writes a `takeaway` into `STORYBOARD.md`, then the session
is interrupted before the journalist's hand (all six fields — `subject`, `comparison`, `limits`,
`placement`, `credit`, `effectiveDate`) or the slots are filled in. Three days later a fresh session
calls `whereIs`. If it trusted the takeaway alone, it would report `production` — no renders or
exports exist yet either — and this skill's own dispatch table would send the craft skill straight
at a storyboard that `twin-storyboard`'s own `checkStoryboard` would refuse outright. `whereIs`
closes the gap: `missingForGate2` (in `where.mjs`) holds a story in the `storyboard` phase, naming every
reason in `missing`, until the takeaway **and** every hand field **and** every slot's `chosen` (each
one actually drawn from its own listed `candidates`) are present — the real G2 condition, not a
truthy takeaway standing in for it.

That condition is reimplemented in `where.mjs`'s own `missingForGate2`, not imported from
`twin-storyboard`'s `checkStoryboard` — this branch's runtime code never imports across a skill
boundary, only the file format two skills share. `where.mjs` already had precedent for this before
the fix: its `isMissingScalar` and `twin-storyboard`'s null-sentinel handling were already two
independent readings of the same rule, cross-referenced by comment rather than unified by an import
(see that file's own `isNullSentinel` note). `HAND` and the slot/candidate check follow the same
pattern — and a reimplementation is exactly the shape of risk that got this document written in the
first place, so it does not rest on the comment alone. Two things are mechanically closed, by two
different tests, and neither claims more than it proves:

- **Every branch of `missingForGate2` is pinned directly** in `test/where.test.ts` (missing hand
  field, empty slots, an unchosen slot, a chosen value with no `candidates` key at all, a chosen
  value present but off the candidate list) — this catches a break in `where.mjs`'s *own* logic,
  the same way any other function's tests would.
- **A second, narrower test proves the two implementations still agree with each other.** Runtime
  code never crosses a skill boundary — this one test does, for exactly this reason: it imports
  `checkStoryboard`/`parseStoryboard` from `twin-storyboard` and feeds shared fixtures to both
  gates, asserting they reach the same open/closed verdict every time. This is the one that catches
  the failure a same-file mutation cannot: a rule changed on `checkStoryboard`'s side alone (a
  seventh `HAND` field added there, say) with `where.mjs` left untouched. Verified in both
  directions — a rule mutated on the `twin-storyboard` side only, and a rule mutated on the
  `where.mjs` side only, both turn this test red.

  **Those fixtures are GENERATED, and that is the second half of this gotcha.** They used to be
  nine hand-typed strings, and a hand-typed list cannot know about a rule added after it was
  written: three rules landed on `checkStoryboard` (grounding, genre, capability) and this suite
  stayed green through all three. Worse, the parity call itself read
  `checkStoryboard(meta).length === 0` — one argument — which switched the new rules off inside the
  test that existed to compare them (`twin/FEEDBACK-2026-08-10.md`, A14). Both halves are closed:
  `checkStoryboard` genuinely takes one argument now, and the fixtures are built from ONE complete
  template mutated field by field, with the field list read from **both** gates' exported
  `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` and unioned. Add a required field to either side and
  its fixtures exist immediately; add it to only one side and the two gates disagree, loudly.

- **The expensive semantic checks are not in either gate any more.** `groundTakeaway`, `genreGap`
  and `capabilityGap` each run ONCE, in the phase that owns them — grounding at G1, genre and
  capability at G2b — and record a resolved scalar into `STORYBOARD.md` (`grounding:`, and the
  slot's `reachable:`). Both gates read the record. That is what closes this divergence class *by
  construction* rather than by vigilance: neither gate can run a check the other cannot, because
  neither runs one. Do not give `checkStoryboard` a second argument again.

## Preflight establishes what is possible — it does not validate an environment

Preflight's whole job changed shape: it used to hand back a pass/fail verdict on the environment,
gating the entire session on every check at once — a chart-only story got told its environment had
failed because `MAPTILER_KEY` was absent, a key it would never touch. That conflated two different
questions: "can this session run at all" and "what can this session honestly offer". `runPreflight`
now answers only the first question with `ready`, and answers the second with `capabilities` — a
small declarative report, not a dispatcher, meant to be read by whichever later phase is about to
offer a medium or a delivery form.

**A key gates a capability, never the session.**

| key | opens | when required |
| --- | --- | --- |
| `MAPTILER_KEY` | map beats | only if the story has a map |
| `DATAWRAPPER_TOKEN` | Datawrapper beats | only if the story uses one |
| Cloudflare Pages | the hosted embed delivery form | never blocks the session — but it IS probed, like the other two, and it opens a real delivery form |

That third row used to read *"not yet built: this row is hardcoded closed, never probed"*, and it was
false in both halves: `runPreflight` calls `probeCloudflare` with both credentials
(`scripts/preflight.mjs`), and `twin-deliver`'s `offerForms` lists the `embed` form for a web or
scrolly beat whenever they resolve. A model reading that row told a journalist a hosted embed was
unavailable while `offerForms` would have offered it — **a delivery constraint that did not come from
`offerForms`, which is the one absolute in this file's own never-list.**

`runPreflight({root, env, fetchFn})` returns `{ready, blockers, checks, capabilities}`:

- `checks` holds only the two facts that can block the session outright: `dependencies` and
  `newsroom-profile`. `ready` is `true` exactly when neither is a blocker — see the newsroom
  section below for what counts as answered.
- `capabilities.map` / `capabilities.datawrapper` / `capabilities.hostedEmbed` each carry
  `{available, reason}` (plus `opens`, the label from the table above) — a missing or rejected key
  narrows `capabilities`, and never appears in `blockers`.
- `assertPreflightReady(report)` (`scripts/preflight.mjs`) is the mechanical stop the old prose
  only described: it throws, naming every blocker, when `ready` is false, and does nothing at all
  otherwise. It never inspects `capabilities` — call it once, right after `runPreflight`, instead of
  trusting a human to read the JSON and honour it by hand.
- `capabilityGap(capabilities, medium)` (`scripts/preflight.mjs`) is the seam a later phase reads
  before offering a medium: `null` when the medium is open, otherwise the exact line to surface —
  phrased as an unavailable **capability** ("map beats are unavailable: …"), never as an environment
  failure. A map story with no working `MAPTILER_KEY` is told the truth about what is missing
  instead of being told its whole environment is broken; a chart-only story never calls this with
  `"map"` at all, so a missing map key never reaches it.

**Both naming conventions are accepted.** This project's own names (`MAPTILER_KEY`,
`DATAWRAPPER_TOKEN`) stay canonical; `resolveEnvKey` (`scripts/keys.mjs`) also accepts the sibling
engine's own names as aliases — `MAPTILER_API_KEY` / `REMOTION_MAPTILER_KEY` / `VITE_MAPTILER_KEY`
for the map key, `DATAWRAPPER_API_TOKEN` for the Datawrapper token (measured directly in that
repository's scripts, not guessed) — so a `.env` that already works for the engine does not
silently report `missing` here. The canonical name always wins when both happen to be set. Same
remedy the main repository used for its own `ATELIER_*`→`SPLASH_*` rename
(`process.env.SPLASH_X ?? process.env.ATELIER_X`, canonical first) — a repeated inline idiom, not a
shared module, and this project follows the same shape rather than inventing a registry for it.

**The newsroom's identity gets three honest outcomes, not two.** `newsroom-profile` in `checks` is:

- `pass` — `NEWSROOM.md` is present and complete (as before).
- `missing` — nobody has answered the question yet. This is where **twin-newsroom-charter** plugs
  in: the seam it fills is "when this status is `missing`, offer to derive a profile by measuring
  the newsroom's own website, and offer to skip". Whichever it does, it must leave `NEWSROOM.md`
  resolved — either a complete, valid profile, or the `declined` shape below. Nothing else counts as
  resolved; a session that dispatches to it and gets neither back has not actually closed this
  question, whatever twin-newsroom-charter itself reports.
- `declined` — the journalist was asked and said no, recorded in `NEWSROOM.md`'s own front matter
  as `decision: declined` (checked by `isDeclinedProfile` in `scripts/newsroom.mjs`, **before**
  `validateNewsroom` ever runs, so a declined stub is never scored against the fields it was
  never meant to carry). This is the subtle part: **a declined theme is a recorded choice, not a
  silent default.** It behaves like `pass` for `ready` — a considered "no" is exactly as closed a
  question as a "yes" — but it is a genuinely different fact from `missing`, and a later reader must
  be able to tell them apart (`newsroom-profile: missing` means "ask"; `newsroom-profile: declined`
  means "already asked, the answer was no"). Reading a declined profile and "fixing" it by inventing
  a default colour would be exactly the anti-fallback failure this whole design exists to prevent —
  a visual must never ship in a colour nobody chose, and an explicit refusal is not that.
- `fail` — a file exists, was meant to answer the question, and does not: unparsable front matter,
  or a profile short of one of the required fields. This is the only newsroom outcome that
  blocks the session the same way `missing` does — the file is present and wrong, not merely unmade.

**A newsroom is not monolingual, and its palette is not one colour.** `NEWSROOM.md` records
`languages` (comma-separated, most-used first) and, beside the primary `brandColor`, an optional
`accents` list. Both are read back by `newsroomLanguages` / `newsroomAccents` in
`scripts/newsroom.mjs`, and both accept the older shape unchanged: a profile carrying the singular
`language: fr` and no `accents` is exactly as valid as it ever was, and means one language and one
accent. Two rules make the plural safe rather than merely wider:

- A singular that names a language the plural does not hold is REFUSED as a contradiction, not
  silently resolved — one of the two lines is stale, and picking either would publish in a language
  the newsroom may not have chosen. The language of a visual follows the ARTICLE and is confirmed
  with the journalist; the recorded list is what that confirmation chooses among, which is what a
  single slot could never give it.
- Every recorded accent is measured against the ground by twin-palette, exactly like the primary,
  and `recommended` only ever names a measured pass. A longer palette is not a way past the 3:1
  non-text contrast floor; a failing accent is shown failing, with the nearest passing variant
  offered beside it and never applied.

**Installing a fresh root leaves it at `missing` unless the installer answers it.** The root
template ships `NEWSROOM.example.md`, never `NEWSROOM.md`, so a root created by hand reliably fails
preflight on a file nobody was told to create. `installer/configure.mjs` closes that: the setup page
collects the fields and writes `NEWSROOM.md` itself, after validating it with this same reader — and
it OFFERS the derivation rather than only naming it: `POST /derive` runs twin-newsroom-charter
against the newsroom's own address and shows every proposed value beside the declaration it was read
from, filling the empty fields and leaving each undeclared one as a named question. It proposes;
only the form's own submit writes. Leaving it blank there is also an answer — preflight then reports `missing`, which is the prompt to
invoke twin-newsroom-charter (derive from the newsroom's own website, or record a decline). Either
path lands `NEWSROOM.md` in a resolved state; the example file left un-renamed is the one shape that
never resolves.

## The install, and the one directory it all hangs off

**A Splash root is ONE directory that is five things at once**, and it has to be, because each of
the five resolves paths independently:

| It is | Who depends on that |
| --- | --- |
| the package `bun install` runs in | every `import` in every beat |
| the owner of the single `.env` | `recordKey`, and every producer that reads a key |
| the `#shared/*` resolution root | every beat's craft import, at any depth |
| the parent of `stories/` | `createStory`, `whereIs` |
| what the hosts' symlinks point into | Goose, the Claude family, Gemini, Codex |

They were not one directory before, and that is exactly how a producer came to read the DEVELOPER's
`.env` while a journalist's key sat unread in their own root — both Bun and Node resolve a symlink
before computing `import.meta.url`, so a symlinked install made the old fixed climb (`../../../.env`)
land in the checkout. `scripts/splash-root.mjs` replaces the climb with a search for the nearest
ancestor declaring `#shared/*`, which is correct in the checkout AND in an installed root, and
throws rather than guessing when there is none. `test/the-key-has-one-home.test.ts` proves the
producers and `recordKey` name the same file.

Installing is therefore `installer/install.sh`, and it copies the template, the fifteen skills and
the plugin manifest into that one root. It contains **no keys and receives none**: secrets are typed
into `installer/configure.mjs`, a page served on 127.0.0.1, so nothing reaches shell history — and
each key is PROBED against its real service before it is written, at `0600`. `installer/place-skills.mjs`
then wires the two doors every host reads, and the generated `splash-twin-doctor`
(`installer/doctor.mjs`) checks the wiring preflight structurally cannot see — the links, the skill
front matter, `bun` on a login shell's PATH, a browser — and then hands the last word to
`runPreflight` rather than re-deciding anything it owns.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Phase recovery | `scripts/where.mjs` | `whereIs(storyDir)` — the state machine; the sole source of truth for "what phase is this story in". `missingForGate2` applies the real Gate 2 condition (takeaway, all six hand fields, the recorded `grounding` and `reference` scalars, every slot's medium/genre/size/`reachable`/`chosen`) before ever reporting `production`. Past Gate 2 it walks the beats: `beatsAwaitingApproval` first — **nothing about `export/` may shorten the walk past it** — then `beatsAwaitingDelivery`, per beat, into `export/<beat>/`. `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` are exported for the parity test to generate fixtures from |
| Preflight | `scripts/preflight.mjs` | `runPreflight({root, env, fetchFn})` → `{ready, blockers, checks, capabilities}`. `ready` depends only on `dependencies` and `newsroom-profile` (`pass`/`declined`, never `missing`/`fail`); `capabilities.{map,datawrapper,hostedEmbed}` are probed but never block `ready`, and each row carries a `fill` naming what would open it. `checkNewsroom` carries the parsed `profile` on its check, so preflight can read the newsroom's identity back instead of discarding it. `assertPreflightReady(report)` is the mechanical stop; `capabilityGap(capabilities, medium)` is the seam a later phase reads before offering one. "Dependencies" covers both `bun install`-resolvable packages **and** the vendored craft files under the root's own `shared/` — a root missing either reports `fail`, naming what's missing |
| Key probes | `scripts/keys.mjs` | `probeMapTiler`, `probeDatawrapper` — a real network call each; a present key that answers 403 fails, exactly the failure a presence check would have missed. `resolveEnvKey(env, canonical)` accepts the sibling engine's own key names as aliases before falling through to empty. `recordKey({root, name, value})` is the ONE path that accepts a key from a journalist: it writes or replaces a single line in the root `.env`, refuses a name this toolchain does not read, and never returns, logs or echoes the value |
| Charter reader | `scripts/newsroom.mjs` | `parseNewsroom`, `validateNewsroom`, `isDeclinedProfile` — the front matter of `NEWSROOM.md` (name, url, languages/language, brandColor, accents, ground, typefaces, or a recorded `decision: declined`), plus `newsroomLanguages` / `newsroomAccents`, which read the plural and the singular alike so a profile written before either existed stays valid, and `OPTIONAL_FIELDS` — `credit`, `languages`, `language`, `accents` |
| Workspace scaffolder | `scripts/new-story.mjs` | `slugify`, `createStory({root, title})` — the `stories/<slug>/{source,beats,export}` shape every later phase reads and writes into |

## How it works (the shape)

1. **Preflight runs once, and it is NEVER silent** (`execute-shell` the dependency check,
   `read-file` `NEWSROOM.md`, `fetch` the MapTiler and Datawrapper probes). It used to run
   "silently when `ready`", which meant a journalist first heard what their own `NEWSROOM.md` said
   nine phases later, from `twin-palette` — long past the point where a wrong value could still
   have been corrected — and heard about a closed key only as a restriction, with no moment at
   which it could be opened. Three things are STATED, and one is ASKED, in one turn:

   - **The newsroom's identity, read back.** `checkNewsroom` now carries the parsed `profile` on
     its check. State the values and which are present. On `missing`, offer the three branches by
     name: derive it with **twin-newsroom-charter** (it measures the newsroom's own website) ·
     supply your own (hand over `assets/root-template/NEWSROOM.example.md`, which documents every
     field) · decline, recorded. On `pass`, still say what it holds — a profile whose values were
     assumed rather than measured is exactly what a journalist can correct here and nowhere later.
   - **Credits.** The profile's optional seventh field, `credit`, is the newsroom's standing
     convention. When it is absent, say so plainly — *"no house credit convention is recorded, so
     credit is asked per story"* (it is already hand field 5) — rather than leaving the journalist
     to discover it at movement ③.
   - **The capabilities, with what would open each.** Every row carries a `fill` naming its own
     environment variable, where the key is obtained, and the file it goes in.

   Then, **when any capability row is closed, ask ONCE**: *"these are closed — paste a key now, or
   continue without them."* `recordKey` (`scripts/keys.mjs`) writes what is given into the root
   `.env` and never echoes it; re-probe **that one capability**; move on either way. Say in the same
   turn that a key pasted into a chat is a secret in a transcript, which is outside this
   toolchain's reach. One question, one re-probe, "continue" always available. It never branches,
   never installs, and never blocks.

   Call `assertPreflightReady` right after — it throws, naming every blocker, exactly when
   `dependencies` or `newsroom-profile` is not `pass`/`declined`; this is the one point that halts
   the session, and it is mechanical, not a line of prose a caller has to remember to honour. A
   missing or rejected `MAPTILER_KEY` / `DATAWRAPPER_TOKEN` is **never** a blocker — it narrows
   `capabilities`, reported honestly rather than worked around, and the genre gate (G2b) reads
   `capabilityGap` before it would otherwise offer a medium the environment cannot honour.
2. **Recover the phase.** `read-file` the story's own directory tree via `whereIs(storyDir)`. Its
   result is the entire input to every dispatch decision — nothing else is consulted, nothing is
   carried over from an earlier turn.
3. **The phase table** (spec §4, folded onto the six phases `whereIs` actually recovers — Preflight
   has no story directory yet to read state from, and Assembly, for SP1's single-beat stories, does
   not yet need a recoverable state of its own):

   | Phase | What happens | Gate | File the gate closes into |
   | --- | --- | --- | --- |
   | `intake` | Article and data frozen and profiled, silently — `twin-intake` asks nothing. | — | `source/article.md`, `source/profile.json` |
   | `framing` | Intent named, the editorial exchange opens, `STORYBOARD.md` is created. | G1 | `STORYBOARD.md` (created) |
   | `storyboard` | Restitution, the journalist's hand, the survey, the medium/genre/size sub-gates, the reference loop, slots and candidates — `twin-storyboard`'s exchange completes the contract. | G1, G2a, G2b, G2c | `STORYBOARD.md`'s front matter carries a confirmed `takeaway`, all six hand-of-the-journalist fields, the recorded `grounding` verdict (G1) and `reference` answer, and every slot's `medium` (G2a), `genre` (G2b), `size` (G2c), `reachable: yes` and `chosen` drawn from its own `candidates` |
   | `production` | Beat by beat: `BRIEF.md` written first, bespoke component written under doctrine, render ladder climbed one rung at a time, checklist applied to the pixels. Then **SURFACE THE ARTIFACT** — the file path to open for a static, the opened HTML for a web or scrolly beat, the mp4 for a video — and ask approve-or-correct. That turn says **nothing about delivery**: the forms are `offerForms`' output and cannot be known before it runs. | G3, per beat | `beats/<n>-<slug>/APPROVED.md` |
   | `delivery` | Per beat, `twin-deliver` offers the forms its genre allows; the journalist chooses; only that one is materialised — into that beat's OWN `export/<beat>/`, never a directory shared with another beat. | — | `export/<beat>/*` |
   | `done` | Terminal — **every** approved beat has been delivered. One delivered beat does not close a story that has two. | — | (`export/<beat>/` holds the chosen form, for each of them) |

4. **Dispatch, one `invoke-skill` per phase** — every action in this skill is named with an
   abstract verb, precisely so this doctrine can move to a different runtime without a rewrite.
   This skill uses four of spec §8's six verbs — `read-file` (a story's directory, `NEWSROOM.md`),
   `execute-shell` (the dependency check), `fetch` (the MapTiler and Datawrapper probes), and `invoke-skill` (every
   dispatch below). It never uses the other two: `write-file` and `search` belong to the skills it
   dispatches to (`twin-intake` writes the frozen source, `twin-doctrine`'s reference loop searches
   for a new reference) — naming a verb this skill never itself performs would be decoration, not
   vocabulary:

   | Phase | `invoke-skill` |
   | --- | --- |
   | `intake` | `twin-intake` |
   | `framing`, `storyboard` | `twin-storyboard` (which itself reads `twin-doctrine`'s reference set for the reference loop, movement ⑧) |
   | `production` | the craft skill matching the chosen candidate's medium AND genre — the same pairs `twin-storyboard`'s `GENRE_CATALOG` records: `twin-chart-beat` (`chart`/`static`), `twin-chart-web` (`chart`/`web`), `twin-chart-video` (`chart`/`video`), `twin-map-beat` (`map`/`static`, `map`/`video`), `twin-map-web` (`map`/`web`), `twin-image-beat` (`image`/`static`), `twin-scrolly` (`chart`/`scrolly`, `map`/`scrolly`, `image`/`scrolly`); `twin-dw-beat` instead of `twin-chart-beat` when the slot's `vehicle` names the delegated Datawrapper path |
   | `delivery` | `twin-deliver` |
   | `done` | nothing — report completion and stop |

5. **Production's turn budget and stall** (spec §8): a beat gets **three cycles** — implement,
   render, check against the pixel checklist, and if it fails, one targeted fix naming the cause.
   On the third failure, **stall**: hand back to the journalist with the gaps named and what was
   tried, rather than a fourth silent attempt or a self-declared win.
6. **The never-list** — every one of these is an absolute, not a preference:
   - This skill **produces nothing itself** — no chart, no map, no video, no HTML. That is always
     the craft skill it dispatched to.
   - It **writes no ad-hoc script** to patch around a gap it finds.
   - It **moves no artifact by hand** — a rendered file exists because a producer wrote it, or it
     does not exist; this skill never relocates, renames, or fabricates one to make a gate look
     closed.
   - It **never continues past a producer that exited non-zero.** A failed `execute-shell` call
     halts the phase right there.
   - **A defect in this toolchain is written to `stories/<slug>/NOTES-FOR-MAINTAINER.md` and never
     spoken to the journalist; a question to the journalist is never about our code.** The run's
     closing message was four fifths internals — three paragraphs naming our own files and their
     defects — and at one point the journalist was asked to arbitrate an internal defect, with
     options naming two of our modules. All of it was valuable, and none of it was theirs. Write it
     to the story root, never to `export/`, never to the conversation. `formatHandover`
     (`twin-deliver/scripts/format-handover.mjs`) is the mechanical half of this: it takes a closed
     parameter set with no free-text field, and throws on any string naming one of our paths or
     modules, so a maintainer-facing sentence physically cannot reach a delivered document.
   - It **never states a delivery constraint that did not come from `offerForms`.** Delivery's
     forms are that function's output; anything said about them before it runs is a guess. The run
     guessed twice, both times wrongly, once *inside* the Gate-3 approval question — and had to
     retract it. `offerForms` now requires the beat's `APPROVED.md` and throws without it, so
     calling it early fails loudly instead of licensing a guess.
   - **A missing prerequisite is reported and never designed around.** (`scripts/preflight.mjs`
     carries the same line verbatim, for the same reason.) A missing hard prerequisite — unresolved
     dependencies, or a newsroom identity nobody has answered yet — blocks `ready` and is reported
     via `assertPreflightReady`, never worked around. A missing **capability** key is reported too,
     honestly, in `capabilities` — but it is not a workaround to leave it out of `blockers`: it was
     never a prerequisite for the whole session, only for the one medium it opens.

## Quick start

```js
import { whereIs } from "./scripts/where.mjs";

const { phase, missing } = await whereIs("stories/annemasse-rain");

const DISPATCH = {
  intake: "twin-intake",
  framing: "twin-storyboard",
  storyboard: "twin-storyboard",
  production: "twin-chart-beat", // or whichever craft skill the chosen candidate names
  delivery: "twin-deliver",
  done: null, // nothing left to dispatch
};

if (missing.length > 0) {
  // report `missing` verbatim and stop — never designed around, never guessed past.
} else if (DISPATCH[phase]) {
  // invoke-skill DISPATCH[phase], passing storyDir — this skill runs nothing else.
} else {
  // phase is "done" — report completion, dispatch nothing.
}
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many phases the state machine recognises | `6` (`intake`, `framing`, `storyboard`, `production`, `delivery`, `done`) | `scripts/where.mjs` |
| How many responsibilities this skill holds | `4`, and no fifth | this document, `Overview` |
| Source files intake must freeze before leaving `intake` | `2` (`article.md`, `profile.json`) | `whereIs` |
| Hand-of-the-journalist fields `whereIs` itself requires before leaving `storyboard` | `6` (`HAND.length` — mirrors `twin-storyboard`'s own `HAND` constant) | `scripts/where.mjs` |
| What a beat needs before the story can be `done` | `2` files of its own — `APPROVED.md` (G3) and something in `export/<beat>/` (G4). Both are checked per beat, never story-wide | `beatsAwaitingApproval` / `beatsAwaitingDelivery`, `scripts/where.mjs` |
| Turns a beat gets before production stalls | `3` | spec §8, `How it works` step 5 |
| Hard stops preflight recognises | `2` (`dependencies`, `newsroom-profile`) — capability keys are never among them | `scripts/preflight.mjs`, `runPreflight` |
| Capabilities preflight reports | `3` (`map`, `datawrapper`, `hostedEmbed`) | `scripts/preflight.mjs`, `runPreflight` |
| Newsroom identity outcomes | `4` (`pass`, `missing`, `declined`, `fail`) — `pass`/`declined` both count as answered | `scripts/preflight.mjs`, `checkNewsroom` |

## Files

- `scripts/where.mjs` — `whereIs(storyDir)`, the six-phase recovery function.
- `scripts/preflight.mjs` — `runPreflight` (capabilities, not a verdict — see "Preflight
  establishes what is possible" above), `assertPreflightReady` (the mechanical stop), and
  `capabilityGap` (the seam a later phase reads before offering a medium).
- `scripts/keys.mjs` — `probeMapTiler`, `probeDatawrapper`, `resolveEnvKey` (canonical name first,
  then the sibling engine's own aliases).
- `scripts/newsroom.mjs` — `parseNewsroom`, `validateNewsroom`, `isDeclinedProfile` (a recorded
  `decision: declined` in `NEWSROOM.md`'s own front matter — a different answer, not an invalid
  one).
- `scripts/new-story.mjs` — `slugify`, `createStory`.
- `scripts/splash-root.mjs` — `splashRoot(startDir)`, `splashEnvPath(startDir)`: the nearest
  ancestor declaring `#shared/*`. Duplicated byte-for-byte into every craft skill that reads a key
  (never imported across a boundary), and guarded by `test/the-key-has-one-home.test.ts`.
- `../../installer/` — `install.sh` (one static, key-free script), `configure.mjs` (the 127.0.0.1
  setup page: keys probed live, written at `0600`, never on a command line; it also runs the charter
  derivation with its evidence, REPORTS the doors rather than asking about them, and collects the
  CMS credential), `place-skills.mjs` (the two doors — and the module `configure.mjs` reads `DOORS`,
  `HOSTS`, `detectHosts` and `planPlacement` from, so the doors are written down once),
  `doctor.mjs` (host wiring, then delegates to `runPreflight`).
- `assets/root-template/` — `package.json` (declares the root's npm dependencies **and** its
  `"imports": {"#shared/*": "./shared/*"}` subpath map), `tsconfig.json`, `NEWSROOM.example.md`,
  `shared/`. The template is the *manifest half* of the install; `installer/` (below) is the rest.
  What the template declares is what `checkDependencies` validates a root against, which makes the
  check circular by construction — so `test/root-template-tells-the-truth.test.ts` WALKS the tree
  and asserts the template declares every package actually imported, vendors every `#shared/` file
  actually imported, pins the same versions this repository pins, and declares whatever provides
  each binary a script spawns. Before that guard the template declared six packages against nine
  imported, and a fresh root reported `ready: true` while only the static chart genre could run.
- `assets/root-template/shared/twin-chart-beat/{render-still.mjs,inspect-render.mjs}` — the
  vendored **mechanism** of `twin-chart-beat` (never its seed — that stays in the skill, read as
  documentation, not copied). Physical copies, checked in, so the plain `cp -r root-template/`
  install carries them along with no extra step; a beat imports the copy that lands at
  `<root>/shared/twin-chart-beat/render-still.mjs` as `#shared/twin-chart-beat/render-still.mjs`,
  resolved by the root's own `package.json`, the same specifier regardless of how deep the beat
  sits under `stories/<slug>/beats/<n>-<name>/`. This closes the gap named in `TRIAL-THREE-BEATS.md`
  §4 and `PROOF.md` §1: a beat no longer imports craft code by an absolute path into this
  repository, so a fresh root works on a machine that has never seen it.
- `test/{where,preflight,keys,newsroom,new-story}.test.ts` — `bun:test` coverage for each script
  above. `where.test.ts` also carries this skill's one deliberate exception to "no cross-skill
  imports": a `checkStoryboard`/`parseStoryboard` import from `twin-storyboard`, used only to
  assert the two gates agree on nine shared fixtures — never in runtime code.
- `test/root-template-shared.test.ts` — a second, narrower cross-skill read for the same reason:
  asserts the vendored copies above stay byte-identical to `twin-chart-beat/scripts/*`, so an edit
  to the canonical mechanism can't silently leave the vendored copy stale.
- `test/phases.test.ts` — drives `whereIs` through a real story directory across all six phases and
  asserts this document names every phase it actually returned, never a phase it did not.
