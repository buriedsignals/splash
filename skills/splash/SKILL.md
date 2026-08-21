---
name: splash
description: Use to run the doctrine twin end to end — recover a story's phase from its own directory, refuse any jump ahead of it, close each gate into a file, and dispatch to the one craft skill a beat actually needs. Never produces a visual itself; that is always the craft skill's job.
---

# splash — the orchestrator, sequencing and nothing else

## Human gates stop the turn

At every human gate, present the decision and recommendation, then **end the turn**. Do not
continue, self-approve, or treat silence as approval. Act on the decision only after the user's
next message. This applies explicitly to **G2b, the publication-format gate**: recommend one
reachable choice, name Static / print, Interactive web, Video, and Scrollytelling with their
trade-offs, ask which format to produce first, and end the turn. Do not select a treatment, research
references, choose a palette, write `format:`, or dispatch production in that turn.

The conditional G2-producer gate stops a later turn too. After the journalist chooses a chart
treatment, `storyboard` checks its pinned Datawrapper mapping. When a faithful implementation
exists for the chosen format, ask Datawrapper or custom and end the turn. When none exists, ask
nothing and continue with the custom producer. Never ask for the producer before the treatment.

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
   valid — never when a conversation merely reads as though it agreed. `storyboard`'s own
   gotcha about a truthy-but-not-confirmed takeaway is a direct instance of this rule: a gate that
   can be satisfied by a fact readable _only_ from a transcript is not really closed.
4. **Dispatch to the craft skill.** This skill decides _which_ skill runs next; it never runs the
   render itself. Production of any pixel, embed or video belongs entirely to the craft skill
   matching the chosen candidate's medium and format: `chart-beat` (`chart`, `static`),
   `chart-web` (`chart`, `web`), `chart-video` (`chart`, `video`), `map-beat`
   (`map`, `static` or `video`), `map-web` (`map`, `web`), `image-beat` (`image`, `static`),
   `scrolly` (`chart`/`map`/`image`, `scrolly`) — plus `dw-beat`, the delegated Datawrapper path a
   chart slot's persisted `producer: datawrapper` and `datawrapperType` can name instead of a
   bespoke component. The full pairing is step 5's dispatch table, below.

This skill **produces nothing at runtime** — no artifact of its own, ever. Its entire value is the
sequencing discipline above and the test (`test/phases.test.ts`) that keeps this document and
`where.mjs` from drifting apart, the way `main`'s `SKILL.md` once kept promising a fallback the code
had stopped producing.

## When to use

- At the start of every turn for an **existing** story, call `whereIs(storyDir)` and let its `phase`
  decide what runs next. For a new story, preflight and `createStory({root, title})` must first create
  the canonical directory and local `AGENTS.md`; then call `whereIs` for the first time. Never infer
  the phase from what a previous turn was doing.
- When a caller (human or agent) asks to skip a phase — refuse, and report `missing` verbatim.
  A missing prerequisite is **reported**, never argued around.
- Once per session, before any story exists: run `runPreflight` (`scripts/preflight.mjs`) —
  dependencies, `NEWSROOM.md`'s identity, and a **probed** (not merely present) `MAPTILER_KEY` /
  `DATAWRAPPER_TOKEN`. **Never silent**: it states the newsroom's identity, its credit convention,
  and every capability with what would open it, and asks once whether the journalist wants to fill
  a closed one. See "Preflight establishes what is possible" below for what "ready" actually means
  now — it is not "every check passed".
- **Not** for writing a chart, a map, a brief, or an export. Those are `intake`,
  `storyboard`, the craft skill, and `deliver` respectively — this skill only decides
  which one of them runs next.

## Recovering a published output for editor feedback

Every new story carries its own `AGENTS.md`. A fresh session reads that file and follows one stable
relationship: `beats/<outputId>/` is the editable production source, while
`export/<outputId>/` is the current delivery and is never edited as source. Hosted deliveries add
`DEPLOYMENT.json`, `EMBED_URL.txt`, `EMBED_CODE.html`, and `HANDOVER.md`; the deployment receipt
names the editable source and the stable public URL. Record feedback in the beat, change the
canonical source (or Datawrapper `spec.json`), rerender, obtain a new bound output review, then
rematerialise the same form. Updating `FEEDBACK.md` is the durable trigger `whereIs` uses to reopen
production, then delivery. A custom Cloudflare output keeps its per-output project URL;
Datawrapper reuses the chart ID in `DATAWRAPPER.json` when production is rerun with the same
`beatDir`.

## The one gotcha that will waste your day (read first)

**A confirmed takeaway is G1, not G2 — and a resumed session that treats it as "storyboard done"
dispatches a producer against a contract nobody actually confirmed.** The concrete failure this
guards against: the editorial exchange writes a `takeaway` into `STORYBOARD.md`, then the session
is interrupted before the journalist's hand (all six fields — `subject`, `comparison`, `limits`,
`placement`, `credit`, `effectiveDate`) or the slots are filled in. Three days later a fresh session
calls `whereIs`. If it trusted the takeaway alone, it would report `production` — no renders or
exports exist yet either — and this skill's own dispatch table would send the craft skill straight
at a storyboard that `storyboard`'s own `checkStoryboard` would refuse outright. `whereIs`
closes the gap: `missingForGate2` (in `where.mjs`) holds a story in the `storyboard` phase, naming every
reason in `missing`, until the takeaway **and** every hand field **and** every slot's `chosen` (each
one actually drawn from its own listed `candidates`) **and any conditional producer preference**
are present — the real G2 condition, not a truthy takeaway standing in for it. Missing treatment
selection is `G2-treatment`; a Datawrapper-eligible chosen treatment with no persisted choice is
`G2-producer`.

That condition is reimplemented in `where.mjs`'s own `missingForGate2`, not imported from
`storyboard`'s `checkStoryboard` — this branch's runtime code never imports across a skill
boundary, only the file format two skills share. `where.mjs` already had precedent for this before
the fix: its `isMissingScalar` and `storyboard`'s null-sentinel handling were already two
independent readings of the same rule, cross-referenced by comment rather than unified by an import
(see that file's own `isNullSentinel` note). `HAND` and the slot/candidate check follow the same
pattern — and a reimplementation is exactly the shape of risk that got this document written in the
first place, so it does not rest on the comment alone. Two things are mechanically closed, by two
different tests, and neither claims more than it proves:

- **Every branch of `missingForGate2` is pinned directly** in `test/where.test.ts` (missing hand
  field, empty slots, an unchosen slot, a chosen value with no `candidates` key at all, a chosen
  value present but off the candidate list) — this catches a break in `where.mjs`'s _own_ logic,
  the same way any other function's tests would.
- **A second, narrower test proves the two implementations still agree with each other.** Runtime
  code never crosses a skill boundary — this one test does, for exactly this reason: it imports
  `checkStoryboard`/`parseStoryboard` from `storyboard` and feeds shared fixtures to both
  gates, asserting they reach the same open/closed verdict every time. This is the one that catches
  the failure a same-file mutation cannot: a rule changed on `checkStoryboard`'s side alone (a
  seventh `HAND` field added there, say) with `where.mjs` left untouched. Verified in both
  directions — a rule mutated on the `storyboard` side only, and a rule mutated on the
  `where.mjs` side only, both turn this test red.

  **Those fixtures are GENERATED, and that is the second half of this gotcha.** They used to be
  nine hand-typed strings, and a hand-typed list cannot know about a rule added after it was
  written: three rules landed on `checkStoryboard` (grounding, format, capability) and this suite
  stayed green through all three. Worse, the parity call itself read
  `checkStoryboard(meta).length === 0` — one argument — which switched the new rules off inside the
  test that existed to compare them. Both halves are closed:
  `checkStoryboard` genuinely takes one argument now, and the fixtures are built from ONE complete
  template mutated field by field, with the field list read from **both** gates' exported
  `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` and unioned. Add a required field to either side and
  its fixtures exist immediately; add it to only one side and the two gates disagree, loudly.

- **The expensive semantic checks are not in either gate any more.** `groundTakeaway`, `formatGap`
  and `capabilityGap` each run ONCE, in the phase that owns them — grounding at G1, format and
  capability at G2b — and record a resolved scalar into `STORYBOARD.md` (`grounding:`, and the
  slot's `reachable:`). Both gates read the record. That is what closes this divergence class _by
  construction_ rather than by vigilance: neither gate can run a check the other cannot, because
  neither runs one. Do not give `checkStoryboard` a second argument again.

### The same gotcha, one gate later — and it was open until round four

The paragraphs above are about G2. **The same class was live at G3 and G4 for as long, and two
independent stress runs found the two ends of it on real stories.**

- **G3.** `deliver` refuses every delivery whose beat has no `OUTPUT-REVIEW.json` binding the
  approval to the exact render — `requireApprovedOutput` is the first line of both `offerForms` and
  `materialise`. `where.mjs` read that record in exactly ONE place, inside `feedbackRevisionState`,
  behind a `FEEDBACK.md` that cannot exist before a first delivery ever happened. So on a first
  delivery it was never read, and `whereIs` answered `{"phase":"delivery","missing":[]}` on a beat
  whose delivery threw *"this output has no bound review"*. `beatsAwaitingBoundReview` now applies
  everything `approvalAgainstCurrent` applies except the current plan version and finding IDs, which
  are the caller's and genuinely outside a directory reader's reach.
- **And the other half of that defect was a documentation one.** Nothing in this file, in
  `storyboard/SKILL.md` or in any craft skill's own named `OUTPUT-REVIEW.json`, `planVersion` or
  `findingIds` at all, and `writeOutputReview` had no caller outside a test fixture. A required
  record that no documented path produces is not a gate, it is a wall. The G3 row of the phase table
  below now names the record and the function that writes it.
- **G4.** A hand-over is G4's file, not G4's whole question. `materialise` writes `.another-format`
  and `.other-subjects` as `pending` the moment a beat lands, precisely so that "nobody was ever
  asked" is a state on disk rather than a habit that can be forgotten — and nothing read them.
  A three-beat story reported `done` with all six halves still pending. `whereIs` carries
  `deliver`'s own `deliveryClosed`, byte for byte, walked by `test/guard-copies-parity.test.ts`.

The rule the three of them share is the one this whole section is about: **when two gates decide the
same question, they read the same record, and a test proves it on real material.**
`test/gates-3-and-4-read-one-requirement.test.ts` runs both gates over a copy of a real delivered
story and mutates its review one field at a time, asserting they never disagree.

## Preflight establishes what is possible — it does not validate an environment

Preflight's whole job changed shape: it used to hand back a pass/fail verdict on the environment,
gating the entire session on every check at once — a chart-only story got told its environment had
failed because `MAPTILER_KEY` was absent, a key it would never touch. That conflated two different
questions: "can this session run at all" and "what can this session honestly offer". `runPreflight`
now answers only the first question with `ready`, and answers the second with `capabilities` — a
small declarative report, not a dispatcher, meant to be read by whichever later phase is about to
offer a medium or a delivery form.

**A key gates a capability, never the session.**

| key                 | opens                          | when required                                                                                      |
| ------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `MAPTILER_KEY`      | map beats                      | only if the story has a map                                                                        |
| `DATAWRAPPER_TOKEN` | Datawrapper beats              | only if the story uses one                                                                         |
| Cloudflare Pages    | the hosted embed delivery form | never blocks the session — but it IS probed, like the other two, and it opens a real delivery form |

That third row used to read _"not yet built: this row is hardcoded closed, never probed"_, and it was
false in both halves: `runPreflight` calls `probeCloudflare` with both credentials
(`scripts/preflight.mjs`), and `deliver`'s `offerForms` lists the `embed` form for a web or
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
- An available `hostedEmbed` also carries `companionScriptUrl` and
  `whitelistOptional: true`: the script loads automatically, while the exact URL is disclosed for
  newsrooms whose CSP or script blocker requires an explicit allow-list.
- `assertPreflightReady(report)` (`scripts/preflight.mjs`) is the mechanical stop the old prose
  only described: it throws, naming every blocker, when `ready` is false, and does nothing at all
  otherwise. It never inspects `capabilities` — call it once, right after `runPreflight`, instead of
  trusting a human to read the JSON and honour it by hand.
- **The whole `capabilities` object travels to the delivery phase, not only through
  `capabilityGap`.** `deliver`'s `offerForms` takes it and reads `capabilities.hostedEmbed`, because
  that form is the one whose credential can be present and still refused. It used to check only that
  the two Cloudflare variables existed, so preflight said `{available: false, reason: "Cloudflare
  answered 403"}` and the delivery menu offered the form anyway, in the same session — one
  credential, two accounts of it, both documented rules held (round-four finding 10).
- `capabilityGap(capabilities, medium)` (`scripts/preflight.mjs`) is the seam a later phase reads
  before offering a medium: `null` when the medium is open, otherwise the exact line to surface —
  phrased as an unavailable **capability** ("map beats are unavailable: …"), never as an environment
  failure. A map story with no working `MAPTILER_KEY` is told the truth about what is missing
  instead of being told its whole environment is broken; a chart-only story never calls this with
  `"map"` at all, so a missing map key never reaches it.

**Engine owns the production credential names and values.** `MAPTILER_KEY`,
`MAPTILER_DELIVERY_KEY`, `DATAWRAPPER_TOKEN`, and `CLOUDFLARE_API_TOKEN` are the canonical IDs shown
by the Splash Readiness app. The journalist enters them only in its protected loopback setup page;
Engine validates and stores them through the operating-system credential broker, then hydrates only
the closed operation that requires one. `resolveEnvKey` still accepts historical aliases when an
explicit legacy root is inspected or run during migration. That is read-only compatibility input,
not the setup path and not a reason to ask for a credential in chat.

**Managed map production is declarative, not a disguised seed script.** After a map treatment and
format are confirmed, write `beats/<outputId>/MAP-BAKE.json` using
`references/managed-map-bake.md`. The closed `map-bake` operation accepts only the story/output
identity and that contract's SHA-256 digest. Engine verifies the contract and its story-local
geography/data digests before it releases `MAPTILER_KEY`, then uses only its recorded browser and
the installed local MapLibre files. Outputs are immutable and digest-addressed beneath the beat.
Never dispatch the fixed Europe or Potomac proof cameras for an unrelated story.

**The Goose chooser is a view of the same Storyboard gates, not another state machine.** After the
journalist confirms the exact Engine-inspected story path in the app session, À-la-carte reads only
the current canonical gate and presents its reachable catalogue choices in stable order. Focus,
filtering, details, setup links, cancellation, and app closure write nothing. An app-only Confirm
must carry the observed story, catalogue, and capability revisions through the shared selection
service; conflicts refresh instead of guessing. Changing publication format or treatment is a
separate explicit rewind. If app-only tools are unavailable, keep using this skill's textual human
gate rather than treating a model call as confirmation.

**The newsroom's identity gets three honest outcomes, not two.** `newsroom-profile` in `checks` is:

- `pass` — `NEWSROOM.md` is present and complete (as before).
- `missing` — nobody has answered the question yet. This is where **newsroom-charter** plugs
  in: the seam it fills is "when this status is `missing`, offer to derive a profile by measuring
  the newsroom's own website, and offer to skip". Whichever it does, it must leave `NEWSROOM.md`
  resolved — either a complete, valid profile, or the `declined` shape below. Nothing else counts as
  resolved; a session that dispatches to it and gets neither back has not actually closed this
  question, whatever newsroom-charter itself reports.
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
- Every recorded accent is measured against the ground by palette, exactly like the primary,
  and `recommended` only ever names a measured pass. A longer palette is not a way past the 3:1
  non-text contrast floor; a failing accent is shown failing, with the nearest passing variant
  offered beside it and never applied.

**A fresh managed install leaves the newsroom at `missing` until the journalist answers it.** The
tracked template is an example, never the active profile. The Readiness app starts
`installer/configure.mjs` through Engine; its protected setup page writes the manifest-owned external
`NEWSROOM.md` after validating it with this same reader — and
it OFFERS the derivation rather than only naming it: `POST /derive` runs newsroom-charter
against the newsroom's own address and shows every proposed value beside the declaration it was read
from, filling the empty fields and leaving each undeclared one as a named question. It proposes;
only the form's own submit writes. Leaving it blank there is also an answer — preflight then reports `missing`, which is the prompt to
invoke newsroom-charter (derive from the newsroom's own website, or record a decline). Either
path lands `NEWSROOM.md` in a resolved state; the example file left un-renamed is the one shape that
never resolves.

## The Engine-managed development install and its data boundaries

The development setup is one command backed by an Engine plan/apply transaction, with distinct
owned locations. Release provenance is reserved in the manifest but is not enforced while Splash is
still changing:

| State                                                                             | Authority                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| explicitly adopted current checkout and complete current lockfile dependency tree | Engine removable install state                            |
| browser compatible with the current Puppeteer dependency                          | Engine runtime state                                      |
| direct skill projections from the adopted checkout                                 | Engine transaction + projection ledger                    |
| story directories                                                                 | Engine-created, manifest-owned external data-bearing root |
| `NEWSROOM.md`                                                                     | manifest-owned external data-bearing configuration        |
| provider credentials and validation receipts                                      | Engine's operating-system credential broker               |
| `extensions.splash`                                                               | Engine's revision-checked Goose configuration transaction |

Operations run the installed checkout in place with package installation and automatic `.env`
loading disabled. They receive only their declared credential IDs and the canonical external paths.
No per-run copy of the checkout, dependency tree, Bun runtime, or browser is made.
The flat skill links are reconciled inside the same Engine apply and uninstall transaction; the
legacy `place-skills.mjs` CLI is not a second managed installer.
The shell wrapper does not create the stories root ahead of Engine; a missing root is created by the
adoption step and removed again if that transaction rolls back while it is still empty.

`scripts/splash-root.mjs`, `recordKey`, the root template, and the plaintext branch of
`installer/configure.mjs` remain bounded legacy compatibility for an existing copied root. They do
not define a new managed install. New setup uses the Readiness app and broker-backed controller; it
never asks the journalist to paste a key into a terminal or conversation.

## Architecture

| Layer                | File                                                       | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase recovery       | `scripts/where.mjs`                                        | `whereIs(storyDir)` — the state machine; the sole source of truth for "what phase is this story in". `missingForGate2` applies the real Gate 2 condition (takeaway, all six hand fields, the recorded `grounding`, `reference` and `language` scalars, every slot's medium/format/size/`reachable`/`chosen`, and the conditional `producer`/`datawrapperType` decision) before ever reporting `production`. It reports missing treatment selection as `G2-treatment` and a missing eligible provider choice as `G2-producer`. Past Gate 2 it walks the beats: `beatsAwaitingApproval` first — **nothing about `export/` may shorten the walk past it** — then the durable editor-feedback trigger (a valid review must bind the current `FEEDBACK.md` and render digests; delivery must bind that feedback/review/render tuple), then `beatsAwaitingBoundReview` (the same `OUTPUT-REVIEW.json` requirement `deliver` enforces, minus the two values only a caller holds), then `beatsAwaitingDelivery`, per beat, into `export/<beat>/`, and finally its carried copy of `deliveryClosed` — both closing-offer receipts, per beat. `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` are exported for the parity test to generate fixtures from |
| Preflight            | `scripts/preflight.mjs`                                    | `runPreflight({root, env, fetchFn})` → `{ready, blockers, checks, capabilities}`. `ready` depends only on `dependencies` and `newsroom-profile` (`pass`/`declined`, never `missing`/`fail`); `capabilities.{map,datawrapper,hostedEmbed}` are probed but never block `ready`, and each row carries a `fill` naming what would open it. `checkNewsroom` carries the parsed `profile` on its check, so preflight can read the newsroom's identity back instead of discarding it. `assertPreflightReady(report)` is the mechanical stop; `capabilityGap(capabilities, medium)` is the seam a later phase reads before offering one. "Dependencies" covers both `bun install`-resolvable packages **and** the vendored craft files under the root's own `shared/` — a root missing either reports `fail`, naming what's missing                                                                                                                                                                  |
| Credential boundary  | Engine record broker + `installer/setup/engine-bridge.mjs` | Lists non-secret metadata/status, validates and atomically replaces one record through bounded stdin, and hydrates only closed operations. `scripts/keys.mjs` retains provider probes and the explicitly legacy `recordKey` writer; production setup never invokes that writer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Charter reader       | `scripts/newsroom.mjs`                                     | `parseNewsroom`, `validateNewsroom`, `isDeclinedProfile` — the front matter of `NEWSROOM.md` (name, url, languages/language, brandColor, accents, ground, typefaces, or a recorded `decision: declined`), plus `newsroomLanguages` / `newsroomAccents`, which read the plural and the singular alike so a profile written before either existed stays valid, and `OPTIONAL_FIELDS` — `credit`, `languages`, `language`, `accents`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Maintainer notes     | `scripts/notes.mjs`                                        | `recordMaintainerNote({storyDir, phase, note})` — appends to `stories/<slug>/NOTES-FOR-MAINTAINER.md`, creating it with its own header. Refuses an empty note, a note with no phase, and any path inside `export/` (that directory is what the newsroom receives). The other end of `formatHandover`'s throw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Workspace scaffolder | `scripts/new-story.mjs`                                    | `slugify`, `createStory({root, title})` — the `stories/<slug>/{source,beats,export}` shape every later phase reads and writes into, plus a story-local `AGENTS.md` that makes the editable-source and published-output relationship recoverable in a fresh session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## How it works (the shape)

1. **Preflight runs once, and it is NEVER silent** (`execute-shell` the dependency check,
   `read-file` `NEWSROOM.md`, `fetch` the MapTiler and Datawrapper probes). It used to run
   "silently when `ready`", which meant a journalist first heard what their own `NEWSROOM.md` said
   nine phases later, from `palette` — long past the point where a wrong value could still
   have been corrected — and heard about a closed key only as a restriction, with no moment at
   which it could be opened. Three things are STATED, and one is ASKED, in one turn:
   - **The newsroom's identity, read back.** `checkNewsroom` now carries the parsed `profile` on
     its check. State the values and which are present. On `missing`, offer the three branches by
     name: derive it with **newsroom-charter** (it measures the newsroom's own website) ·
     supply your own (hand over `assets/root-template/NEWSROOM.example.md`, which documents every
     field) · decline, recorded. On `pass`, still say what it holds — a profile whose values were
     assumed rather than measured is exactly what a journalist can correct here and nowhere later.
   - **Credits.** The profile's optional seventh field, `credit`, is the newsroom's standing
     convention. When it is absent, say so plainly — _"no house credit convention is recorded, so
     credit is asked per story"_ (it is already hand field 5) — rather than leaving the journalist
     to discover it at movement ③.
   - **The capabilities, with what would open each.** Every row names its provider and acquisition
     page. It never asks for or carries the value.

   When any capability row is closed, offer the Readiness app's **Set up credentials and newsroom**
   action once, or continue without that optional capability. Never ask the journalist to paste a
   credential into chat or a terminal. The protected page verifies and saves each provider
   independently through Engine, clears the input, and leaves the multi-provider session open until
   the journalist chooses Done. Refresh status after it closes.

   Call `assertPreflightReady` right after — it throws, naming every blocker, exactly when
   `dependencies` or `newsroom-profile` is not `pass`/`declined`; this is the one point that halts
   the session, and it is mechanical, not a line of prose a caller has to remember to honour. A
   missing or rejected `MAPTILER_KEY` / `DATAWRAPPER_TOKEN` is **never** a blocker — it narrows
   `capabilities`, reported honestly rather than worked around, and the format gate (G2b) reads
   `capabilityGap` before it would otherwise offer a medium the environment cannot honour.

2. **Create or recover the story workspace before phase recovery.** For a new story, call
   `createStory({root, title})` exactly once before intake; do not make `stories/<slug>` or any of
   its children ad hoc. This guarantees `source/`, `beats/`, `export/`, and the story-local
   `AGENTS.md` exist before a craft skill receives the path. For an existing story, do not call the
   new-story scaffolder again: call `ensureStoryGuidance({storyDir})` once so a pre-feature story
   receives the missing file without overwriting existing instructions, then read its `AGENTS.md`.
3. **Recover the phase.** `read-file` the story's own directory tree via `whereIs(storyDir)`. Its
   result is the entire input to every dispatch decision — nothing else is consulted, nothing is
   carried over from an earlier turn.
4. **The phase table** (spec §4, folded onto the six phases `whereIs` actually recovers — Preflight
   has no story directory yet to read state from, and Assembly has no recoverable state of its own
   because nothing in it is recorded anywhere but the beats it assembles — `stress-p`'s three beats
   were produced, approved and delivered one at a time, and `whereIs` recovered every step of that
   from `beats/` and `export/` alone):

   | Phase        | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                    | Gate                                                       | File the gate closes into                                                                                                                                                                                                                                                                                                                                                                                 |
   | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `intake`     | Article and data frozen and profiled, silently — `intake` asks nothing.                                                                                                                                                                                                                                                                                                                                                                         | —                                                          | `source/article.md`, `source/profile.json`                                                                                                                                                                                                                                                                                                                                                                |
   | `framing`    | Intent named, the editorial exchange opens, `STORYBOARD.md` is created.                                                                                                                                                                                                                                                                                                                                                                         | G1                                                         | `STORYBOARD.md` (created)                                                                                                                                                                                                                                                                                                                                                                                 |
   | `storyboard` | Restitution, the journalist's hand, the survey, the medium/format/size sub-gates, the reference loop, slots and candidates, then the conditional post-treatment producer preference — `storyboard`'s exchange completes the contract.                                                                                                                                                                                                           | G1, G2a, G2b, G2c, G2-treatment, G2-producer when eligible | `STORYBOARD.md`'s front matter carries a confirmed `takeaway`, all six hand-of-the-journalist fields, the recorded `grounding` verdict (G1) and `reference` answer, the `language` the delivery will be written in (a code, ruling R4), and every slot's `medium` (G2a), `format` (G2b), `size` (G2c), `reachable: yes`, `chosen` drawn from its own `candidates`, and — only where the selected treatment maps faithfully to Datawrapper — `producer` plus `datawrapperType` |
   | `production` | Beat by beat: `BRIEF.md` written first, bespoke component written under doctrine, render ladder climbed one rung at a time, checklist applied to the pixels. Then **SURFACE THE ARTIFACT** — the file path to open for a static, the opened HTML for a web or scrolly beat, the mp4 for a video — and ask approve-or-correct. That turn says **nothing about delivery**: the forms are `offerForms`' output and cannot be known before it runs. | G3, per beat                                               | `beats/<n>-<slug>/APPROVED.md` **and** `beats/<n>-<slug>/OUTPUT-REVIEW.json` — the yes, and what binds the yes to the render it was given for. Write the second with `writeOutputReview` (`deliver/scripts/output-review.mjs`): it names the output, the `renders/` digest, the plan version, the finding IDs, and a passing QA run carrying the same tuple. `deliver` refuses every delivery without it, and so does `whereIs` |
   | `delivery`   | Per beat, `deliver` offers the forms its format allows; the journalist chooses; only that one is materialised — into that beat's OWN `export/<beat>/`, never a directory shared with another beat. The delivery closes by handing it over: which file goes where in the article, the alt text, the credit line, the one caveat — and then by putting both halves of the closing offer to them (the same beat in another format, the article's other subjects) and recording each answer.                                                                                                                 | **G4**, per beat                                           | `export/<beat>/HANDOVER.md` (beside the chosen form's own files), **and both closing-offer receipts answered** — `.another-format` and `.other-subjects`, which `materialise` writes as `pending` so an offer nobody made is a fact on disk                                                                                                                                                                 |
   | `done`       | Terminal — **every** approved beat has been delivered AND had both halves of its closing offer answered. One delivered beat does not close a story that has two, and a hand-over with the offer unasked does not close a beat.                                                                                                                                                                                                                                                                                                                                  | —                                                          | (`export/<beat>/` holds the chosen form, for each of them)                                                                                                                                                                                                                                                                                                                                                |

5. **Dispatch, one `invoke-skill` per phase** — every action in this skill is named with an
   abstract verb, precisely so this doctrine can move to a different runtime without a rewrite.
   This skill uses four of spec §8's six verbs — `read-file` (a story's directory, `NEWSROOM.md`),
   `execute-shell` (the dependency check), `fetch` (the MapTiler and Datawrapper probes), and `invoke-skill` (every
   dispatch below). It never uses the other two: `write-file` and `search` belong to the skills it
   dispatches to (`intake` writes the frozen source, `doctrine`'s reference loop searches
   for a new reference) — naming a verb this skill never itself performs would be decoration, not
   vocabulary:

   | Phase                   | `invoke-skill`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
   | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `intake`                | `intake`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
   | `framing`, `storyboard` | `storyboard` (which itself reads `doctrine`'s reference set for the reference loop, movement ⑧)                                                                                                                                                                                                                                                                                                                                                                                                        |
   | `production`            | the craft skill matching the chosen candidate's medium AND format — the same pairs `storyboard`'s `FORMAT_CATALOG` records: `chart-beat` (`chart`/`static`), `chart-web` (`chart`/`web`), `chart-video` (`chart`/`video`), `map-beat` (`map`/`static`, `map`/`video`), `map-web` (`map`/`web`), `image-beat` (`image`/`static`), `scrolly` (`chart`/`scrolly`, `map`/`scrolly`, `image`/`scrolly`); `dw-beat` when a chart slot records `producer: datawrapper`, using its persisted `datawrapperType` |
   | `delivery`              | `deliver`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
   | `done`                  | nothing — report completion and stop                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

6. **Production's turn budget and stall** (spec §8): a beat gets **three cycles** — implement,
   render, check against the pixel checklist, and if it fails, one targeted fix naming the cause.
   On the third failure, **stall**: hand back to the journalist with the gaps named and what was
   tried, rather than a fourth silent attempt or a self-declared win.
7. **The never-list** — every one of these is an absolute, not a preference:
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
     to the story root, never to `export/`, never to the conversation. Two mechanical halves, and
     the second one was missing until it was measured: `formatHandover`
     (`deliver/scripts/format-handover.mjs`) takes a closed parameter set with no free-text
     field and throws on any string naming one of our paths or modules, so a maintainer-facing
     sentence physically cannot reach a delivered document — and **`recordMaintainerNote`**
     (`scripts/notes.mjs`) is where the refused sentence actually goes. Before it, that throw named
     a file nothing in the tree wrote: a rule in prose, pointed at by a refusal that could not say
     where to put what it had just refused.
   - It **never states a delivery constraint that did not come from `offerForms`.** Delivery's
     forms are that function's output; anything said about them before it runs is a guess. The run
     guessed twice, both times wrongly, once _inside_ the Gate-3 approval question — and had to
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
  intake: "intake",
  framing: "storyboard",
  storyboard: "storyboard",
  production: "chart-beat", // or whichever craft skill the chosen candidate names
  delivery: "deliver",
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

| Want                                                                                | Knob                                                                                                                                  | Where                                                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| How many phases the state machine recognises                                        | `6` (`intake`, `framing`, `storyboard`, `production`, `delivery`, `done`)                                                             | `scripts/where.mjs`                                                    |
| How many responsibilities this skill holds                                          | `4`, and no fifth                                                                                                                     | this document, `Overview`                                              |
| Source files intake must freeze before leaving `intake`                             | `2` (`article.md`, `profile.json`)                                                                                                    | `whereIs`                                                              |
| Hand-of-the-journalist fields `whereIs` itself requires before leaving `storyboard` | `6` (`HAND.length` — mirrors `storyboard`'s own `HAND` constant)                                                                      | `scripts/where.mjs`                                                    |
| Story-level scalars `whereIs` requires before leaving `storyboard`                  | `10` (`REQUIRED_SCALARS.length` — the takeaway, the six hand fields, `grounding`, `reference`, `language`)                             | `scripts/where.mjs`                                                    |
| What a beat needs before the story can be `done`                                    | `3` records of its own — `beats/<n>/APPROVED.md` **with** its `OUTPUT-REVIEW.json` (G3), `export/<beat>/HANDOVER.md` (G4), and both closing-offer receipts answered. All are checked per beat, never story-wide | `beatsAwaitingApproval` / `beatsAwaitingBoundReview` / `beatsAwaitingDelivery` / `deliveryClosed`, `scripts/where.mjs` |
| Turns a beat gets before production stalls                                          | `3`                                                                                                                                   | spec §8, `How it works` step 5                                         |
| Hard stops preflight recognises                                                     | `2` (`dependencies`, `newsroom-profile`) — capability keys are never among them                                                       | `scripts/preflight.mjs`, `runPreflight`                                |
| Capabilities preflight reports                                                      | `3` (`map`, `datawrapper`, `hostedEmbed`)                                                                                             | `scripts/preflight.mjs`, `runPreflight`                                |
| Newsroom identity outcomes                                                          | `4` (`pass`, `missing`, `declined`, `fail`) — `pass`/`declined` both count as answered                                                | `scripts/preflight.mjs`, `checkNewsroom`                               |

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
- `scripts/new-story.mjs` — `slugify`, `storyAgentGuidance`, `createStory`; creates the canonical
  story directories and the story-local revision/resume instructions in `AGENTS.md`.
- `scripts/notes.mjs` — `recordMaintainerNote`, the one path that writes
  `stories/<slug>/NOTES-FOR-MAINTAINER.md`. It appends, because a run finds more than one defect.
- `scripts/splash-root.mjs` — `splashRoot(startDir)`, `splashEnvPath(startDir)`: the nearest
  ancestor declaring `#shared/*`. Duplicated byte-for-byte into every craft skill that reads a key
  (never imported across a boundary), and guarded by `test/the-key-has-one-home.test.ts`.
- `../../installer/` — `configure.mjs` defaults to the broker-backed 127.0.0.1 controller; its
  `setup/` modules own the Engine stdin boundary, canonical newsroom CAS writer, safe legacy import,
  and outbound derivation policy. `doctor.mjs` is only a thin handoff to
  `bsig doctor --product splash`. `install.sh`, `place-skills.mjs`, and the plaintext configurator
  branch are development or compatibility surfaces around the Engine plan; they are not a second
  production authority.
- `assets/root-template/` — `package.json` (declares the root's npm dependencies **and** its
  `"imports": {"#shared/*": "./shared/*"}` subpath map), `tsconfig.json`, `NEWSROOM.example.md`,
  `shared/`. The template is the _manifest half_ of the install; `installer/` (below) is the rest.
  What the template declares is what `checkDependencies` validates a root against, which makes the
  check circular by construction — so `test/root-template-tells-the-truth.test.ts` WALKS the tree
  and asserts the template declares every package actually imported, vendors every `#shared/` file
  actually imported, pins the same versions this repository pins, and declares whatever provides
  each binary a script spawns. Before that guard the template declared six packages against nine
  imported, and a fresh root reported `ready: true` while only the static chart format could run.
- `assets/root-template/shared/chart-beat/{render-still.mjs,inspect-render.mjs}` — the
  vendored **mechanism** of `chart-beat` (never its seed — that stays in the skill, read as
  documentation, not copied). Physical copies, checked in, so the plain `cp -r root-template/`
  install carries them along with no extra step; a beat imports the copy that lands at
  `<root>/shared/chart-beat/render-still.mjs` as `#shared/chart-beat/render-still.mjs`,
  resolved by the root's own `package.json`, the same specifier regardless of how deep the beat
  sits under `stories/<slug>/beats/<n>-<name>/`. A beat therefore no longer imports craft code by an absolute path into this
  repository, so a fresh root works on a machine that has never seen it.
- `test/{where,preflight,keys,newsroom,new-story}.test.ts` — `bun:test` coverage for each script
  above. `where.test.ts` also carries this skill's one deliberate exception to "no cross-skill
  imports": a `checkStoryboard`/`parseStoryboard` import from `storyboard`, used only to
  assert the two gates agree on nine shared fixtures — never in runtime code.
- `test/root-template-shared.test.ts` — a second, narrower cross-skill read for the same reason:
  asserts the vendored copies above stay byte-identical to `chart-beat/scripts/*`, so an edit
  to the canonical mechanism can't silently leave the vendored copy stale.
- `test/phases.test.ts` — drives `whereIs` through a real story directory across all six phases and
  asserts this document names every phase it actually returned, never a phase it did not.
