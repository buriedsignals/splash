---
name: atelier
description: Use to run the whole atelier pipeline end-to-end from an article and/or data to a finished, exported visual. Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT with human gates, invoking suggest-article, suggest-chart, and the producers. The single entry point for "make me a visual from this". Keywords atelier, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# atelier — the end-to-end flow

## Overview

The single entry point that turns an article and/or data into a finished, exported visual. It runs
six ordered phases with explicit human gates and never re-decides what a sub-skill already decides —
it sequences and gates. Conduct the ENTIRE dialogue in the journalist's language (detect it from
their first message).

## The flow (run in order; every gate is a hard stop)

### 1. INPUT

Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

### 2. ANALYSE (silent)

Invoke `suggest-article` **as a real Skill call** (not a mental paraphrase — actually run the
`suggest-article` skill) to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. Improvising this
analysis inline instead of invoking the skill skips its provenance discipline and guardrails — a real
cost observed in practice, not a theoretical one. For a bare topic (no article/data), instead NAME the
real dataset the topic needs (the honest sans-rien path) and carry that forward.

### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, ≤4 questions, one at a time)

Ask each question as ONE well-formed single-select prompt (a short header, 2–4 concrete options) and
wait for the answer before the next — never batch several into one call, which is what malforms the
question tool. **Exception:** a question that must capture free-form data — most notably the data
SOURCE (its label and URL) — is NEVER single-select; a fixed menu of options cannot carry a URL. Ask
it as a free-text prompt instead (see GATE 2/3 source handling below).

1. Branch: "Do you already have a visual in mind, or should I guide you?"
2. **Takeaway — GATE 1b (un-skippable, both branches):** "What is the one thing a reader should leave
   with?" → the insight/angle. This is a DISTINCT, mandatory step — it is NEVER collapsed into Q3, and it
   is NEVER satisfied by inferring the takeaway from the article and moving on. Even when the article
   plainly implies a takeaway, you MUST state your inferred takeaway back to the journalist in one plain
   sentence and get their EXPLICIT confirmation (or correction) before leaving CADRAGE. On GUIDED, ask it
   openly (offer only supported framings, below); on DIRECT, the open-ended asking is replaced by a
   confirm-back of the takeaway inferred from the article + the named visual — but the confirmation itself
   is NEVER skipped. Do not advance to PROPOSITION/PRODUCTION on an unconfirmed, silently-inferred
   takeaway — that is exactly the miss this gate exists to close.
   **★ Every takeaway option you offer MUST be supported by the supplied data (use the ANALYSE data
   shape).** Never float a framing the data cannot substantiate: do NOT offer a temporal / trend framing
   ("the gap is widening", "growth since 2015", "rising", "over time") when the data is a **single
   snapshot with no time dimension** — a widening/narrowing story is undecidable from one point in time;
   do NOT offer a per-capita / rate framing when only absolute counts exist; do NOT offer a
   spatial-pattern framing when the data is not geographic. Offering an unsupported framing forces a
   later retraction and tempts a fabricated series to "back it up". If the journalist genuinely wants a
   trend, say the current data can't show it and ask for the time series — never invent one.
3. Audience & channel: a STRUCTURED single-select, journalist's language, exactly three options —
   **Social vertical (Stories/Reels)** · **Social feed (Instagram/Facebook post)** · **Article web / embed**.
   This is not a free-text prompt (never ask it as one) — the pick maps 1:1 onto
   `skills/atelier/src/channel.ts`'s `Channel` enum, which deterministically fixes both the media SIZE and
   the ALLOWED FORMAT SET for everything downstream:
   - **Social vertical** → portrait **9:16** · formats {image, video}.
   - **Social feed** → square **1:1** · formats {image, video}.
   - **Article web / embed** → media **landscape 16:9** / component **responsive** · formats {image, video,
     interactive}.
   **Hard rule: not article/embed ⇒ image or video only — NEVER interactive or scrolly.** Only the
   article/web channel can host an interactive (scrolly is a kind of interactive). **Always asked — on
   EITHER branch, never skipped.** A DIRECT-named visual still needs a channel: a journalist-naming "a bar
   chart" doesn't by itself say feed→square vs web→landscape, and downstream, `suggest-chart`'s routing
   cannot even restrict its format set without it (see `knowledge/references/formats/format-selection.md`).
   Skipping Q3 is exactly the failure mode that let a visual escalate to interactive/video/scrolly with
   none of the channel constraints established — never skip it.
4. Constraint (only if relevant): mobile-first, deadline, house palette.
   - **House palette (F2 brand profile):** if the project has a `brand.json` (loadBrandProfile → `palette` + optional `accent`), OFFER "use your house palette?" here. On yes, seed the producer spec's colour from the palette and mark it `brandExplicit` (seedBrandColor) — the brand colour is applied AS CHOSEN (policy b, brand-first). A non-CVD-safe / low-contrast house colour is NOT rewritten; the produce-time a11y guards downgrade it to a render-review concern (surfaced at Gate 3), the editor decides. No brand.json → auto subject-fit colour, unchanged. Colours only in this cut (fonts/logo deferred).

Branch:
- **DIRECT** (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION. Still ask Q3
  (audience & channel) before PRODUCTION — it is REQUIRED on both branches. Go to PRODUCTION,
  passing suggest-chart the (data, intent, channel) PLUS the forced element/format — suggest-chart still
  emits a VALIDATED spec and applies its guardrails (obey the choice, but if it violates a hard
  guardrail, surface the warning to the journalist rather than shipping a broken visual). On DIRECT, the
  branch fires at Q1. **Q2 (takeaway, GATE 1b) is NOT skipped either** — its open-ended asking is simply
  replaced by a confirm-back: state the takeaway inferred from the article + the named visual and get the
  journalist's explicit confirmation before PRODUCTION (a named visual carries a chart TYPE, not a
  confirmed CLAIM). **Q3 (channel) is likewise always asked, on both branches**, because the format/aspect
  routing downstream (PRODUCTION's aspect defaulting, `suggest-chart`'s Gate 1–4 ladder) depends on it.
  Q4 stays conditional, as above.
  If DIRECT names a visual whose exact sub-format is still open (e.g. "a scrolly" — bars vs line
  reveal), do not float multiple sub-format options to the journalist before checking each one's
  reachability via `suggest-chart` — confirm producibility first, then offer only what's reachable
  (same rule as PROPOSITION below; never offer then retract).
- **GUIDED**: go to PROPOSITION.

### 4. PROPOSITION — GATE 2 (guided path only)

For each `suggest-article` opportunity, invoke `suggest-chart` **as a real Skill call** (never guess
the element/format/producer yourself — that re-decides what a sub-skill already decides and skips its
KB-grounded guardrails) to get its routing decision. Present the ProposalSet × `suggest-chart` routing
as plain-language lines — for each opportunity: what it shows, which visual, why.

**Announce the reconciled `{format, size, sub-format}` — vetoable.** After routing, state in plain
language what the CADRAGE Q3 channel + `suggest-chart`'s routing land on for THIS opportunity, and let
the journalist veto or change it before moving on — e.g. « un chart INTERACTIF, responsive,
explore-libre — calé sur ton article web ; on part là-dessus ou tu changes ? » or « une image PORTRAIT
(9:16) pour ta Story — ok ? ». This is a statement of the already-routed decision offered for veto, not
a fresh options menu. **Hard rule surfaced here too:** a non-article/embed channel can only land on
image or video — never interactive or scrolly; if the journalist asks for an interactive on a social
channel, say so and point back to the CADRAGE Q3 channel pick rather than silently escalating.

**Narrative sub-format — who picks it reuses the CADRAGE branch:**
- **interactive** → the sub-format is **explore-libre** (pan/zoom/hover) vs **scrolly** (sequential).
- **video** → the sub-format is the camera/reveal mode (reveal-simple, guided-tour, zoom-out, pan,
  line-reveal, ranked-bars… — per producer).
- **GUIDED** → the AI PICKS the sub-format (grounded in the routing, announced above, vetoable) — do not
  make the journalist choose a reveal style blind.
- **DIRECT** → the journalist NAMES the sub-format themselves, but only once it is checked reachable via
  `suggest-chart` (see "Only offer what is confirmed producible" below) — never offer a named sub-format
  that turns out not to be producible.

**Article/web defaults to interactive — with a static HTML (no-JS) fallback ALWAYS produced (a11y
invariant).** For the article-web channel, `suggest-chart` routing DEFAULTS to interactive — it wins
unless there is a concrete reason not to — but whenever interactive is chosen, a self-contained static
HTML file (no JS) that carries the claim ON ITS OWN is ALSO produced alongside it, as part of the EXPORT
delivery (§6) — NOT a separate static PNG image (≈85% of readers never touch hover/click; interactive is
additive, never load-bearing). Never present an interactive-only proposal for article/web — the
static-HTML fallback is part of the SAME accept decision, not a separate ask, and interactive delivery
never offers or ships a standalone image.

**★ One opportunity = one accept decision = one `suggest-chart` call.** Each DISTINCT `suggest-article`
opportunity is routed and accepted INDEPENDENTLY — never fold a second opportunity's series/claim into
another opportunity's visual. If ANALYSE surfaces two claims (e.g. a minimum-wage series AND an
inflation series), that is TWO proposals, TWO Gate-2 accept decisions, and TWO `suggest-chart` calls —
even when both trend over time and could be stapled onto one chart. Combining them silently drops the
second opportunity from the journalist's sight (they never got to accept/reject it) and it never reaches
its own routing. Surface EVERY opportunity as its own line; the journalist decides which to keep, and
each kept one becomes its own `accepted.json` entry (5b) that `produce-all` renders separately.

**Only offer what is confirmed producible.** Before presenting an element/format (or sub-format —
e.g. which scrolly reveal style) to the journalist, it must already have been checked as reachable via
`suggest-chart`'s own routing/reachability, never assumed from memory. Never offer an option and then
have to retract it as engine-infeasible after the fact — if a candidate isn't reachable, drop it before
it reaches the journalist rather than proposing it and walking it back.

**GATE 2b (data provenance — prose proposals only):** if a proposal's figures are
`provenance:"prose"`, show the reconstructed table and get an explicit confirmation that the numbers
are correct BEFORE the journalist accepts/edits/rejects that proposal. The reconstructed table MUST be
built from the CURRENT article/data given this session — never carried over, silently, from a prior or
stale export sitting in `exports/<slug>/`; if a prior export exists, the journalist's current input is
always the authority. The ordering is: confirm the table (2b) FIRST as its OWN question, THEN accept /
edit / reject (2) — never bundle "are these figures right?" and "do you accept this visual?" into one
question (they are different decisions). Never fabricate a dataset attribution. **GATE 2b applies only
to `provenance:"prose"` proposals** — a `"table"` (or `"none"`) proposal never goes through 2b, so its
`confirmedTable` (set in 5b) stays `false`/absent; only set it `true` after an actual 2b confirmation
fires for a prose proposal.

**GATE 2c (source attribution — every accepted proposal, established BEFORE PRODUCTION).** Do not wait
for the render-review (Gate 3a) to be the first thing that catches a weak source — establish the
citable source now, for each proposal that just cleared Gate 2 (and 2b where it applies):
- Start from what `suggest-article` already surfaced (its `sourceHint`, set only when the article
  itself names where the figures come from, or quotes an actual URL). If that already gives BOTH a
  name and a specific, traceable dataset/page URL, use it verbatim — never invent or embellish it.
- Otherwise, ask the journalist ONE free-text question that collects the label AND the specific URL
  TOGETHER, in the SAME turn — never split it into "what's the source?" then a follow-up "and the
  URL?"; that two-step pattern is exactly the multi-turn back-and-forth this gate exists to close.
- Apply the same rejection rule used at Gate 3 (see Never, below) to the answer BEFORE accepting it: a
  name with no URL for a named dataset/publication, or a bare organisation homepage
  (`eurostat.ec.europa.eu`, `insee.fr`) standing in for the specific dataset/page, is incomplete — say
  so and ask again for the specific page. Never ship it as-is and never quietly downgrade to the
  "reported in this article" fallback just to avoid asking again.
- The honest prose fallback ("Figures as reported in this article" / the outlet's own name) is
  legitimate ONLY when the data genuinely has no separate cited dataset (`provenance:"prose"` or
  `"none"`) — never use it merely because the journalist has not yet answered, and never use it as a
  shortcut out of this gate.
- Only once the proposal's source is a name + a specific traceable URL (or the genuine no-dataset
  prose case) does it go into `accepted.json`'s spec (5b). This does not replace Gate 3a's render-review
  source check — that stays the safety net if the URL turns out unreachable once the actual render is
  seen — but it should rarely have anything left to catch.

Only accepted proposals continue.

### 5. PRODUCTION

PRODUCTION is a coded, **drop-proof** loop — you do NOT run producers one at a time from prose.
You assemble the accepted proposals into one file and let `produce-all` produce every one of them,
so a secondary proposal can never silently drop. If the element/format needs to change during
PRODUCTION (a fallback, a journalist request, a retry) — go back through `suggest-chart` for the new
routing, the same way `needs-fallback` (5d) already re-emits via suggest-chart; never hand-author the
producer spec yourself (see Never).

**5a. Validate each spec first.** For every accepted proposal, run the producer's spec validator
(`validateChartSpec` for charts; `validateChoroplethConfig` / `validateLocatorConfig` /
`validateSymbolConfig` / `validateMapSpec` for maps) and fix any warning — in particular a title that
reads as a label rather than the insight — so a weak spec never reaches GATE 3. The spec's `source`
must be the one already established at Gate 2c (name + a specific traceable URL, or the genuine
no-dataset prose case) — never a placeholder, never the `suggest-article` `dataSource.table` filename
slipped in as the label (see suggest-article's Gotcha (4)). **A reserved placeholder URL
(`…example.com`, `.test`, `.invalid`, `localhost`, RFC 2606/6761) is MECHANICALLY rejected by the spine's
validation gate (GUARD 2, `src/source-guard.ts`) — the proposal comes back `status:"failed"`, never
produced; a name-only prose source with no URL still passes.**

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"provenance": "table|prose|none", "confirmedTable": <true ONLY after an actual Gate 2b prose-table
confirmation — stays false/absent for "table" (and "none") provenance, which never go through 2b;
never set it true on a table-provenance proposal just because it looks accepted>,
"channel": "social-vertical|social-feed|article-web" }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article. **`channel`
is REQUIRED — it is the CADRAGE Q3 confirmed pick (§3, the structured audience & channel question),
copied verbatim onto every proposal it applies to.** `produce-all`'s channel/format gate (5c) reads this
field to enforce "not-embed ⇒ never interactive/scrolly"; **omitting it silently defeats that guard** —
it falls back to `"article-web"` (the permissive default, matching `normalizeChannel`), so a social-only
visual with a dropped `channel` would ship an interactive nobody asked for. Never omit it.

**5c. Produce everything at once** — report to a FILE (the gates and EXPORT read it back):
```bash
bun skills/atelier/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug> \
  > exports/<slug>/report.json
```
`produce-all` iterates EVERY proposal, dispatches to the right producer + format, and writes
`{ results: [{ id, producer, actualProducer, format, status, outputs?, publicUrl?, reason?, error?, renderApproved }] }`.
It exits non-zero only if some `status` is `"failed"`. (Redirecting to `report.json` is required — the
report is the machine channel; producer progress goes to stderr, so stdout stays pure JSON.)
**★ Mechanical producer-match guard (GUARD 1, `src/producer-guard.ts`):** `actualProducer` records the
producer that ACTUALLY ran; `produce-all` fails-hard (`status:"failed"`) when it diverges from the
accepted proposal's `producer` — so an accepted **dw-chart** that is silently produced with
**chart-native** (an observed flip) is refused, never shipped. The ONE sanctioned switch is the
native→dw fallback (`needs-fallback`, below). Any element/format change goes back through `suggest-chart`
(5d / see Never) — never hand-swap the producer in `accepted.json`.

**★ Spine validation gate re-applies suggest-chart's DETERMINISTIC guardrails (`src/validate-gate.ts`
→ `validateAccepted`).** Before dispatch, `produce-all` runs, on EVERY accepted proposal itself: the
producer's own validator (`validateChartSpec` / `validateMapSpec` / `validateChoroplethConfig` /
`validateShape`), the placeholder-source guard (GUARD 2), AND — since there is **no trust boundary**
between this orchestrator and `suggest-chart` (they are the same LLM, so a spec's provenance cannot be
proven) — the deterministic guardrails that otherwise lived only in `suggest-chart`'s eval
(`src/guardrail-parity.ts`): the **aspect↔type guard** (a row-driven horizontal chart type like `d3-bars`
can never take a portrait/square channel), **chart-native furniture** (an insight title + a source name
are present), and **chart-native subject-fit** (a declared non-water subject is not painted on a
blue-family hue). A spec the orchestrator HAND-AUTHORED — bypassing `suggest-chart` entirely — must still
clear this identical deterministic bar or it comes back `status:"failed"`, never shipped. **Out of scope
(genuinely non-deterministic at produce):** the SEMANTIC / gold-dependent parts of the eval — element vs
producer vs family "correctness", and the LLM-judge's editorial quality (is the title really the insight?
is this the RIGHT chart for the claim?) — have no gold at produce and are the render-review's job (GATE 3),
not a mechanical gate. Validator WARNINGS also stay advisory here by design (surfaced at the render gate),
unlike the eval's stricter `maxWarnings:0` suggester scorecard.

**★ Every re-produce (any re-run of 5c — a source fix, a fallback swap, a retry) writes a WHOLLY FRESH
`report.json`.** `renderApproved` starts `false` and `reviewed` is absent for EVERY proposal in that
run — even one that was already reviewed and approved before the correction — this is by design, not a
regression: a re-produced artifact has never been through Gate 3 itself, no matter how many times its
predecessor was. It means Gate 3a (`review-gate`) and Gate 3b (`gate-render`) MUST run again, in order,
on the NEW render before it can ship — never call `gate-render` right after a re-produce assuming a
prior sign-off still holds (see Never, below), and never hand-edit `report.json` to restore a prior
`reviewed`/`renderApproved` value onto a new artifact.
Each proposal's artifacts land in a **per-proposal subdir** `exports/<slug>/<id>/` — that subdir (not the
parent `exports/<slug>`) is the `<outDir>` you hand to the EXPORT scripts below.

**5d. Act on each result's `status` (every accepted id appears — nothing is dropped):**
- **`produced`** → go to GATE 3 for that visual.
- **`needs-confirmation`** (a `provenance:"prose"` proposal not yet confirmed) → this is **Gate 2b**:
  show the reconstructed table to the journalist, get an explicit OK, set that proposal's
  `confirmedTable: true` in `accepted.json`, and re-run 5c. Never chart a prose figure unconfirmed.
- **`needs-fallback`** (a native chart type chart-native cannot map) → re-emit a **dw-chart** `ChartSpec`
  for that claim via suggest-chart, replace that proposal's `producer`/`spec` in `accepted.json`, re-run
  5c. Do not hand-translate. This native→dw direction is the ONE producer switch GUARD 1 sanctions; the
  reverse (dw→native) or any other switch is refused (see 5c).
- **`failed`** → surface the `error`; fix the spec or drop the proposal. Never ship a failed visual. If the
  failure is a **conformance gate** rejecting the accepted spec (e.g. a colour/contrast/format
  violation) — do NOT silently mutate the accepted spec (`baseColor`, format, etc.) to make the gate
  pass without saying so: SURFACE the conformance issue to the journalist as-is, and if the spec
  genuinely needs to change to fix it, re-open GATE 2 for the journalist to re-accept the changed spec —
  never edit-and-reship a spec the journalist never saw (see Never). If the
  failure traces to the PRODUCER/COMPONENT'S own source code rather than the spec — a genuine engine bug,
  not a data/shape problem — do NOT edit that code (`skills/*/src`, any `.tsx`/`.ts` producer file) to force
  the gate green: REPORT the bug to the journalist (this visual cannot ship yet) and drop or route around
  the proposal instead (see Never).

**GATE 3 (render) — per produced visual.**

**3a. Render-review FIRST (mandatory, Layer 2).** Before you show the journalist anything, put the
produced visual through an INDEPENDENT editorial pass per `references/render-review.md`: read the ACTUAL
render + the article + data against the six criteria (title honesty — including that the title matches
the takeaway the journalist confirmed at CADRAGE Gate 1b, not a narrower or different claim — source
traceability, honest encoding, earns-its-place, legibility/a11y, fidelity). These catch what the spine's
code gates cannot — a title that misstates the metric, a fabricated or incomplete source, a misleading
encoding. **Never spawn an Agent/Task sub-agent to do this review** — during the atelier flow you ONLY
sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing
(an agentId) into the journalist-facing conversation. Review adversarially yourself (try to falsify each
criterion). **For an interactive or scrolly deliverable, a static read (`static.png` / a video frame)
verifies ONLY the still surface — layout, labels, colour, aspect, title, source, emphasis. It shows
NOTHING about hover/tooltip/pan/zoom: never assert an interaction "works" from a still.** An interaction
claim (a tooltip surfaces, its text is legible, it stays in-viewport, a map popup shows the right
name/value) is allowed only by citing the pass of the producer's interaction snapshot — which already ran
fail-hard inside `produce-all` — or re-running it: chart-native `snap-tooltip-contrast.mjs` /
`snap-tooltip-viewport.mjs`, map-native `snap-proof.mjs` (see `references/render-review.md`, "Interaction
claims require an interaction test"). No cited run → record "not interaction-tested", never a pass. Record
it (export is refused without a review record):
```bash
bun skills/atelier/scripts/review-gate.mjs exports/<slug>/report.json <id> [concern...]
```

**3b. Show + approve.** Show the ACTUAL render (open it / a screenshot) TOGETHER WITH the review's
concerns, and get an explicit "ship it". The concerns are advisory — the journalist is the editor. This
should rarely fire on source now that Gate 2c establishes it proactively before PRODUCTION — but if a
concern is about the source (missing, name-only, generic, or unclear), ask the journalist to supply it as
ONE free-text prompt collecting the label AND the **specific, traceable dataset/page URL** together (e.g.
the Eurostat dataset page for the exact table, the Insee series page — NOT the organisation's homepage) —
never a single-select (see CADRAGE) — then update the spec, **re-run 5c (`produce-all`) to get the NEW
render, and re-run 3a (`review-gate`) on THAT render** before showing again — never jump straight from an
updated spec to 3b (`gate-render`); the fresh report 5c writes resets `reviewed`/`renderApproved` for
exactly this reason (see the ★ note under 5c above), and 3b's approval is only ever for the render just
shown, never a prior one.
Verify quality, not just that it built. **After "ship it", record the approval — pass the LOCAL
artifact file path on disk, NEVER the public/cloud URL** (a Datawrapper `publicUrl`, a fly.io embed
link, etc.): `gate-render` opens and hashes the file at that path, so a public URL ENOENTs.
```bash
bun skills/atelier/scripts/gate-render.mjs exports/<slug>/report.json <id> exports/<slug>/<id>/static.png
```
(swap `static.png` for whichever local file the journalist approved — e.g. `interactive.html`,
`scrolly.html`, or the rendered `.mp4` — always the path under `exports/<slug>/<id>/`, never a URL.)
`gate-render` is the ONLY writer of the render approval; EXPORT refuses any visual not render-reviewed
(3a) AND not approved (3b) — so an unreviewed, unseen, or unapproved render can never ship.

_(Under the hood `produce-all` dispatches to `chart-native/scripts/produce-from-spec.mjs`,
`map-native/scripts/produce.mjs`, `scrolly/scripts/produce.mjs`, and the Datawrapper producers — you
call `produce-all`, not them directly. An omitted map-native format still defaults to `static`, never
the full video set.)_

### 6. EXPORT — GATE 4 (delivery depends on the visual's format)

**Delivery location — stable, never the scratchpad.** Write every hand-over (export folder, mp4, PNG) to
`exports/<slug>/` under the journalist's working directory (the atelier project root), NOT the session
scratchpad — the scratchpad is temporary and gets cleaned, so the journalist would lose the deliverable
(and cannot find it). After delivering, print the file/folder's ABSOLUTE path. `export-code.mjs` refuses
(non-zero) if the export path looks ephemeral. The ship scripts also refuse unless the proposal is
`produced` AND render-approved (GATE 3 done) — pass the report + id so the gate can check.

Branch EXACTLY on the channel/format model (`skills/atelier/src/channel.ts`) — **image and video hand
over the media directly, no delivery menu; only interactive gets a delivery choice, and only because
article-web is the one channel that can host it**:

- **VIDEO (mp4):** hand over the mp4 directly, at the CADRAGE channel's size and the narrative sub-format
  chosen at PROPOSITION (camera/reveal mode) — no code/embed forms, the media IS the deliverable. The
  producer renders **only the one aspect the channel requires** — social-vertical → **portrait 9:16**
  (1080×1920), social-feed → **square 1:1** (1080×1080), article-web → **landscape 16:9** — **one mp4, not
  three** (the aspect is threaded via `ATELIER_CHANNEL`; a fail-hard produce-time conformance step refuses
  a render whose size ≠ the channel). Native chart-native/map-native now render **true 9:16** for
  social-vertical (Slice 2 repointed the portrait comps 1080×1350 → 1080×1920), matching `dw-chart`'s
  static portrait — no more 4:5 caveat.
- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly, at the channel's size
  (portrait 1080×1920 for social-vertical, square 1080×1080 for social-feed, landscape 1200×675 for
  article-web) — no delivery menu, just the file.
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`, article-web only):**
  atelier **PROPOSES three delivery forms and the journalist CHOOSES one** — the delivery is shaped to the
  choice. Producing the artifacts stays unconditional (that is how the files get made); the DELIVERY FORM is
  now the journalist's choice, not a fixed hand-over. **There is no standalone image export** — the no-JS
  `static.html` is the accessibility artifact and lives INSIDE the code-source folder.
  1. **Run `export-code.mjs` FIRST, unconditionally** (it produces every artifact on disk regardless of the
     journalist's later choice — this is what keeps atelier local-first):
     `bun skills/atelier/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
     In ONE pass it writes the hand-over folder — `interactive.html` (the single self-contained file, JS
     inlined), `static.html` (the no-JS a11y fallback — **ALWAYS produced whenever the build has a `static.png`
     byproduct**, which every interactive chart/map does; a scrolly has none, so it ships without it),
     `EMBED.md`, and (for a **chart-native** producer) a `<id>-source/` **runnable React source bundle** (form
     1 — see below). It then EMITS a fixed three-form proposal: an `EXPORT_FORMS_JSON {…}` line (machine-parseable:
     `forms.a` = `{kind, path[, note]}`, `forms.b.path` = the standalone HTML file, `forms.c.command` OR
     `forms.c.url`) plus an `EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL` human block. **No `static.png`**
     is copied standalone — `export-code` only inlines it into `static.html`. This one run GUARANTEES the
     accessibility fallback exists AND that there IS a delivered artifact before the flow may call the visual
     delivered.
     - **The `<id>-source/` bundle (chart-native form 1)** is assembled by
       `skills/chart-native/scripts/export-source.mjs` from the `config.json` + `native-source.json` the
       producer drops in the build subdir: a self-contained Vite project (`src/` = a copy of chart-native/src,
       `config.json`, `main.tsx`/`index.html` that import the chart + config statically, `package.json` with the
       interactive deps only — no remotion, `vite.config.ts`, `tsconfig.json`, `README.md`). The journalist runs
       `bun install && bun run build` → `dist/index.html` (the interactive). Verified: it builds from scratch and
       renders the chart, fully self-contained.
     - **Hosted Datawrapper producers (`dw-chart` / `map-dw`) have NO local `interactive.html`** — a DW
       interactive IS the already-published hosted embed (the report's `publicUrl`), and its static export is
       named `<id>.png` (not `static.png`). `export-code` handles this shape from the report: it detects the
       hosted delivery (a `publicUrl` with no local html), recognises the static image via the producer's own
       declared `outputs`, and writes a COMPLETE folder anyway — `static.html` (no-JS a11y fallback, the DW
       image inlined) + `EMBED.md`. For this shape form B is that standalone `static.html` (the only
       self-contained file it has) and form C is the LIVE hosted URL (no `deploy-embed` step — already
       published). So a dw-chart/map-dw interactive delivers `static.html` + `EMBED.md`, never an empty folder.
  2. **THEN relay the emitted three-form proposal VERBATIM and ASK which form the journalist wants (a / b / c)
     — this is an explicit, un-skippable GATE.** Do NOT collapse it to a bare "Livré."; do NOT pick for them.
     Relay the script's `EXPORT_FORMS_PROPOSAL` block (it already carries the concrete paths/command for THIS
     export), then wait for their answer. The three forms are:
     - **a) Code source** (`forms.a`) — the delivery depends on the producer:
       - **chart-native** (`kind: "react-source-bundle"`) → the `<id>-source/` **runnable React source bundle**
         (`bun install && bun run build` → the interactive). For a technical journalist who rebuilds/customises
         the source. THIS is the headline form-1 capability.
       - **map-native / scrolly** (`kind: "built-files-folder"`) → the built `-export` folder. Their `src/` is
         NOT self-contained (map-native imports scrolly; scrolly imports chart-native + map-native + maptiler/
         turf), so a straight-copy React bundle would not build — they hand over the built files instead
         (follow-up: factor a self-contained core if a source bundle is wanted for them).
       - **hosted DW** (`kind: "built-files-folder"`, with a `note`) → the built `-export` folder + the live
         Datawrapper link. There is NO React source to rebuild (it is a Datawrapper embed); the `note` says so
         honestly ("Datawrapper — pas de source React à rebuilder ; voici les fichiers + le lien").
     - **b) HTML autonome** — hand over JUST the single self-contained file: the JS-inlined `interactive.html`
       (`scrolly.html` for a scrolly; the no-JS `static.html` for a hosted-DW producer, its only standalone
       file). One file, drops into any CMS/email/offline.
     - **c) Embed (hébergé)** — run `deploy-embed.mjs` to upload to the journalist's own fly.io host and share
       the returned URL (for a hosted-DW producer this is the already-live `publicUrl`, no deploy step).
  3. **THEN deliver per the choice** — a) hand over `forms.a.path` (the `<id>-source/` React bundle for
     chart-native, else the built-files folder) — print its ABSOLUTE path · b) print the standalone HTML
     file's ABSOLUTE path (that single file IS the delivery) · c) run
     `bun skills/atelier/scripts/deploy-embed.mjs exports/<slug>/<id>/interactive.html <slug> --results exports/<slug>/report.json --id <id> <appName>`
     and share the returned URL. The host is the **journalist's OWN fly.io app** (not a shared central host) —
     pass its name as the 3rd argument or via `$ATELIER_EMBED_APP`. **A SCROLLY has no `static.html`**, so its
     forms are **code source (a) + HTML autonome (the `scrolly.html`, b) + embed (c)** — same three, only the
     no-JS image-only fallback does not exist. Accessibility is preserved in every case: the no-JS `static.html`
     ships inside form a and IS form b's file for hosted-DW; it is only waived when the journalist explicitly
     picks the hosted embed (c). If the journalist has not set up their fly.io host yet, forms a and b are
     ALREADY produced on disk; only the embed link (c) pends their one-time setup.

  **★ `delivered` REQUIRES that `export-code.mjs` produced the folder** (for interactive/scrolly). Never
  report an interactive/scrolly as delivered on produce-time outputs alone — a Gate-3 review PNG,
  `interactive.png`, or the build subdir's `static.png` are NOT a delivery. If EXPORT did not run, the visual
  is NOT delivered, no matter how the run otherwise ended.

  **One-time fly.io host setup — on the JOURNALIST'S OWN fly.io account** (run once from
  `skills/atelier/embed-host/`; fly.io app names are globally unique, so the journalist picks their own,
  e.g. `<newsroom>-embeds`):
  ```bash
  flyctl auth login                        # the journalist's own fly.io account
  flyctl launch --no-deploy --name <their-app>   # creates their embed host app; commit fly.toml
  flyctl volumes create data --size 1
  flyctl deploy
  ```
  After that, `deploy-embed.mjs <html> <slug> <their-app>` (or `$ATELIER_EMBED_APP=<their-app>`) uploads
  directly to their app via `flyctl ssh sftp shell`. There is no shared default app name — each journalist
  hosts on their own account.

  **Auth:** `flyctl` reads credentials from either `flyctl auth login` (interactive, stored in `~/.fly/`)
  or a `FLY_API_TOKEN` in the environment (create with `flyctl tokens create deploy`). For a headless /
  automated run, put `FLY_API_TOKEN` (and `ATELIER_EMBED_APP`) in `.env` — Bun loads them into the
  environment and `flyctl` picks them up. See `.env.example`.

## Gates

| Gate | Phase | Stop condition | Failure mode if skipped |
|------|-------|---------------|------------------------|
| 1 | CADRAGE | Journalist answers the ≤4 questions + branch chosen | Wrong format, misread intent |
| 1b | CADRAGE | Takeaway stated back and EXPLICITLY confirmed by the journalist — never inferred-and-skipped; asked openly on GUIDED, confirmed via confirm-back on DIRECT (both branches) | Visual carries an unconfirmed/guessed claim; title diverges from the journalist's intent |
| 2b | PROPOSITION | Journalist confirms prose-extracted data table (fires BEFORE Gate 2 for prose proposals) | Fabricated data attribution |
| 2 | PROPOSITION | Journalist accepts / edits / rejects each proposal | Wrong claim visualised |
| 2c | PROPOSITION | Source established: name + a specific traceable URL (or the genuine no-dataset prose case), for every accepted proposal | Weak/generic/name-only source ships, caught only late (after a full produce→review cycle) by the render-review |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the ACTUAL render (re-run in full — 3a then 3b — after every re-produce, never reused from a prior render) | Visual quality not verified; a re-produced render ships on a stale sign-off |
| 4 | EXPORT | Video/static → give the media file directly; interactive/scrolly → relay the emitted three-form proposal and the journalist chooses ONE: code source (chart-native → runnable `<id>-source/` React bundle; else built-files folder) / HTML autonome (single self-contained file) / embed (hosted link) | Wrong delivery format; or the proposal collapsed to a bare "Livré." with nothing handed over |

## Never

- Never skip a gate.
- Never auto-progress from one phase to the next without the journalist's explicit response.
- Never produce a visual before the PROPOSITION / provenance OK (gates 2 and 2b) on the guided path.
- Never export before the render OK (gate 3).
- Never invent data or fabricate a dataset attribution. This covers EVERY required value the source does
  not state — not just a chart series, but a **coordinate (lon/lat), a date/year, a dimension label, or a
  number**. If a required value is absent from the article/data, atelier has exactly three honest moves:
  **stop and ask the journalist**, run a **real deterministic step** (e.g. a geocoder for coordinates —
  an actual API lookup, never a recollection), or **decline that visual** / fall back to one the data can
  support. Synthesizing the value from the model's own knowledge — a metro station's coordinates, a year
  where the text only said "cette année"/"this year" — is fabrication, and it is never allowed even when
  the guess would "probably" be right. (Reinforced at the extraction boundary in
  `suggest-article/SKILL.md` and the coordinate boundary in `suggest-chart/SKILL.md`.)
- Never fold two distinct opportunities into one visual. Each `suggest-article` opportunity gets its OWN
  Gate-2 accept decision and its OWN `suggest-chart` routing call (PROPOSITION); stapling a second
  series/claim onto an already-routed chart silently drops that opportunity from the journalist's view
  and skips its routing — surface and route each one separately.
- Never offer the journalist a CADRAGE takeaway framing the supplied data cannot support (a temporal /
  "widening gap" framing on single-snapshot data, a per-capita framing on absolute counts). Constrain the
  offered options to the ANALYSE data shape; if the wanted framing needs data you don't have, say so and
  ask for it — never invent the series to justify the framing.
- Never conduct the dialogue in a language other than the journalist's (detect from first message).
- Never let the produced visual's furniture (title, intro, source label, scrolly captions) default to English — the detected language is threaded to suggest-article and suggest-chart so the OUTPUT matches the dialogue, not only the chat.
- Never re-decide what a sub-skill (suggest-article, suggest-chart, a producer) already decides — only sequence and gate. This means actually INVOKING `suggest-article` (ANALYSE) and `suggest-chart` (PROPOSITION routing) as real Skill calls, not hand-authoring their output from memory/inspection — their eval-hardened guardrails and KB grounding only fire when they genuinely run. This holds for the FIRST routing AND for any LATER change to the chosen element/format (a journalist request mid-flow, a fallback, a retry after a failed gate): re-invoke `suggest-chart` again with the new signal — never re-decide it yourself by grepping producer source and hand-authoring/`Write`-ing a `spec.json`; only `suggest-chart`'s own re-run re-validates the choice and re-applies its guardrails.
- Never name a chart type in the intent passed to suggest-article or suggest-chart (on the guided path).
- Never ship a visual without the mandatory render-review (Gate 3a) — `assertShippable` refuses a visual with no review record; the review's concerns are advisory but running it is not optional.
- Never call `gate-render` (Gate 3b) right after a re-produce (any re-run of 5c — a source fix, a fallback swap, a retry) without first re-running `review-gate` (Gate 3a) on the NEW render. `produce-all` always writes a WHOLLY FRESH `report.json` — every proposal in that run comes back unreviewed and unapproved (`renderApproved:false`), even one that was already signed off before the correction — so the review MUST run again on what actually changed. Do not treat the script's hard refusal ("not render-reviewed") as the safety net to rely on; redo Gate 3a → 3b in order every time, and never hand-edit `report.json` to restore a prior review/approval onto a new artifact.
- Never edit the engine source (anything under `skills/`) during a journalist run — a bug is REPORTED and routed around, never patched in place. The "feedback → système" convention is for development sessions, not a live newsroom flow. This holds with NO exception for making a produce/conformance gate pass: never edit a producer/component's source code (`skills/*/src`, any `.tsx`/`.ts` producer file) mid-PRODUCTION to turn a failing gate green — a real newsroom journalist cannot patch the engine, so atelier must not either. If a produce or conformance gate fails because of a genuine engine bug (not a spec/data problem), SURFACE the bug to the journalist, do NOT ship that visual, and do NOT patch the code — the bug is reported, never worked around.
- Never silently mutate the ACCEPTED SPEC (`baseColor`, format, etc.) mid-PRODUCTION to route around a conformance-gate failure — this is the spec analogue of the rule above ("never edit product code" → "never silently edit the accepted spec to bypass a gate"). A conformance failure is SURFACED to the journalist as-is; if the spec must change to fix it, GATE 2 is re-opened for re-acceptance of the changed spec. The produce-time conformance guards exist precisely so a non-conformant visual never ships unseen.
- Never hand over an INTERACTIVE visual without running `export-code.mjs` FIRST (unconditionally, NOT gated on a journalist choice) — that one run produces the code-source folder AND the `static.html` no-JS a11y fallback, so both are delivered before any choice; only the hosted fly.io embed link stays an explicit opt-in afterwards (machinery: `export-code.mjs` then optional `deploy-embed.mjs`). Never mark an interactive/scrolly delivered on produce-time outputs alone — a Gate-3 review PNG / `interactive.png` / build-subdir `static.png` is NOT a delivery; only the `export-code` folder is (enforced mechanically by `assertDelivered`). A SCROLLY has no static image, so it ships **code source + embed link** only (its embed targets `scrolly.html`, not `interactive.html`) — do not promise a static-HTML form for a scrolly.
- Never spawn an Agent/Task sub-agent mid-flow — during the atelier flow you ONLY sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (e.g. an agentId) into the journalist-facing conversation.
- Never ship a source that is name-only for a NAMED dataset/publication (e.g. "Eurostat") — it MUST carry both a label and a real, verifiable URL; never fabricate a URL to fill the field. (The honest prose fallback — "Figures as reported in this article" / the outlet's own name — is the one legitimate name-only case, since it names no separate dataset to link.) Establish this proactively at Gate 2c (PROPOSITION), before PRODUCTION — never wait for the render-review to be the first thing that catches it, and never reach for the prose fallback just because the journalist has not answered yet. A *fabricated* placeholder URL is worse than none and is now MECHANICALLY refused: the spine's validation gate (GUARD 2, `src/source-guard.ts`) rejects any source URL on a reserved placeholder domain (`example.com`/`.org`/`.net`, or the `.example`/`.test`/`.invalid`/`.localhost` TLDs, RFC 2606/6761) — the proposal fails to produce rather than shipping a fake citation.
- Never accept a generic organisation homepage (e.g. `eurostat.ec.europa.eu`, `insee.fr`) or an unverifiable/404 URL as the source — it must be treated exactly like a missing URL. The source MUST point to the SPECIFIC, traceable dataset/page the figures come from (the Eurostat dataset page for the exact table, the Insee series page, …). If the journalist only gives an organisation name or its homepage, ASK for the specific dataset/page reference rather than shipping the generic one (see Gate 2c) — in the SAME free-text turn, never as a separate follow-up question.
- Never ship a title that narrows or diverges from the takeaway the journalist confirmed at CADRAGE (Gate 1b) — e.g. a specific multiplier ("2x") standing in for a confirmed "widening gap" insight, or a scope word ("Nordic") that excludes an entity the visual actually shows. If the data supports more than the title states, widen the title or flag it at Gate 3.
- Never silently substitute a value from a prior/stale export when it disagrees with the journalist's current article/data — the values used (and shown at Gate 2b) MUST always be the ones the journalist provided in the current session.
- Never offer the journalist an element/format (or sub-format) option before confirming — via `suggest-chart`'s reachability, not from memory — that it is actually producible. Retracting an offered option as infeasible forces the journalist to re-answer the same decision multiple times; check first, propose only what's confirmed.
