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
2. Takeaway: "What is the one thing a reader should leave with?" → the insight/angle. **Skippable on
   DIRECT only** (see branch logic below) — a named visual already carries its own intent.
   **★ Every takeaway option you offer MUST be supported by the supplied data (use the ANALYSE data
   shape).** Never float a framing the data cannot substantiate: do NOT offer a temporal / trend framing
   ("the gap is widening", "growth since 2015", "rising", "over time") when the data is a **single
   snapshot with no time dimension** — a widening/narrowing story is undecidable from one point in time;
   do NOT offer a per-capita / rate framing when only absolute counts exist; do NOT offer a
   spatial-pattern framing when the data is not geographic. Offering an unsupported framing forces a
   later retraction and tempts a fabricated series to "back it up". If the journalist genuinely wants a
   trend, say the current data can't show it and ask for the time series — never invent one.
3. Audience & channel: "Where does this publish — article embed, social, print?" → the format signal
   (feeds suggest-chart Gates 1–4: static / interactive / video / scrolly) AND the media aspect for a
   video/image: social-vertical → portrait (9:16), feed → square (1:1), article/web → landscape (16:9).
   **Always asked — on EITHER branch, never skipped.** A DIRECT-named visual still needs a channel: a
   journalist-naming "a bar chart" doesn't by itself say feed→square vs web→landscape, and downstream,
   `suggest-chart`'s Gate 2 escalation to interactive cannot even be evaluated without it — one of its
   three ALL-required criteria IS the channel ("distribution is web-only"; see
   `knowledge/references/formats/format-selection.md`). Skipping Q3 is exactly the failure mode that lets
   a visual escalate to interactive/video/scrolly with none of the escalation criteria established —
   never skip it.
4. Constraint (only if relevant): mobile-first, deadline, house palette.
   - **House palette (F2 brand profile):** if the project has a `brand.json` (loadBrandProfile → `palette` + optional `accent`), OFFER "use your house palette?" here. On yes, seed the producer spec's colour from the palette and mark it `brandExplicit` (seedBrandColor) — the brand colour is applied AS CHOSEN (policy b, brand-first). A non-CVD-safe / low-contrast house colour is NOT rewritten; the produce-time a11y guards downgrade it to a render-review concern (surfaced at Gate 3), the editor decides. No brand.json → auto subject-fit colour, unchanged. Colours only in this cut (fonts/logo deferred).

Branch:
- **DIRECT** (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION. Still ask Q3
  (audience & channel) before PRODUCTION — it is REQUIRED on both branches. Go to PRODUCTION,
  passing suggest-chart the (data, intent, channel) PLUS the forced element/format — suggest-chart still
  emits a VALIDATED spec and applies its guardrails (obey the choice, but if it violates a hard
  guardrail, surface the warning to the journalist rather than shipping a broken visual). On DIRECT, the
  branch fires at Q1 and Q2 (takeaway) is skipped — intent is inferred from the article + the named
  visual instead. **Q3 (channel) is the ONLY other question DIRECT may skip and it does NOT skip it** —
  it is always asked, on both branches, because the format/aspect routing downstream (PRODUCTION's
  aspect defaulting, `suggest-chart`'s Gate 1–4 ladder) depends on it. Q4 stays conditional, as above.
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
reads as a label rather than the insight — so a weak spec never reaches GATE 3.

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"provenance": "table|prose|none", "confirmedTable": <true ONLY after an actual Gate 2b prose-table
confirmation — stays false/absent for "table" (and "none") provenance, which never go through 2b;
never set it true on a table-provenance proposal just because it looks accepted> }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article.

**5c. Produce everything at once** — report to a FILE (the gates and EXPORT read it back):
```bash
bun skills/atelier/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug> \
  > exports/<slug>/report.json
```
`produce-all` iterates EVERY proposal, dispatches to the right producer + format, and writes
`{ results: [{ id, producer, format, status, outputs?, publicUrl?, reason?, error?, renderApproved }] }`.
It exits non-zero only if some `status` is `"failed"`. (Redirecting to `report.json` is required — the
report is the machine channel; producer progress goes to stderr, so stdout stays pure JSON.)
Each proposal's artifacts land in a **per-proposal subdir** `exports/<slug>/<id>/` — that subdir (not the
parent `exports/<slug>`) is the `<outDir>` you hand to the EXPORT scripts below.

**5d. Act on each result's `status` (every accepted id appears — nothing is dropped):**
- **`produced`** → go to GATE 3 for that visual.
- **`needs-confirmation`** (a `provenance:"prose"` proposal not yet confirmed) → this is **Gate 2b**:
  show the reconstructed table to the journalist, get an explicit OK, set that proposal's
  `confirmedTable: true` in `accepted.json`, and re-run 5c. Never chart a prose figure unconfirmed.
- **`needs-fallback`** (a native chart type chart-native cannot map) → re-emit a **dw-chart** `ChartSpec`
  for that claim via suggest-chart, replace that proposal's `producer`/`spec` in `accepted.json`, re-run
  5c. Do not hand-translate.
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
the takeaway the journalist confirmed at CADRAGE Gate 1, not a narrower or different claim — source
traceability, honest encoding, earns-its-place, legibility/a11y, fidelity). These catch what the spine's
code gates cannot — a title that misstates the metric, a fabricated or incomplete source, a misleading
encoding. **Never spawn an Agent/Task sub-agent to do this review** — during the atelier flow you ONLY
sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing
(an agentId) into the journalist-facing conversation. Review adversarially yourself (try to falsify each
criterion). Record it (export is refused without a review record):
```bash
bun skills/atelier/scripts/review-gate.mjs exports/<slug>/report.json <id> [concern...]
```

**3b. Show + approve.** Show the ACTUAL render (open it / a screenshot) TOGETHER WITH the review's
concerns, and get an explicit "ship it". The concerns are advisory — the journalist is the editor. If a
concern is about the source (missing, name-only, generic, or unclear), ask the journalist to supply it as
ONE free-text prompt collecting the label AND the **specific, traceable dataset/page URL** together (e.g.
the Eurostat dataset page for the exact table, the Insee series page — NOT the organisation's homepage) —
never a single-select (see CADRAGE) — then update the spec and re-run 3a before showing again.
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

Branch on the format the journalist chose at CADRAGE / that `suggest-chart` routed to:

- **VIDEO (mp4):** the producer emits three aspect ratios — **landscape** (`*landscape.mp4`, 16:9, for
  article/web/YouTube), **square** (`*square.mp4`, 1:1, for a feed post), **portrait** (`*portrait.mp4`,
  9:16, for Reels/TikTok/Shorts). Confirm which aspect the journalist needs — default it from the CADRAGE
  channel answer (social/vertical → portrait; feed → square; article/web → landscape) — and hand over
  that mp4. A video IS the media — no code/embed forms; just give the chosen file.
- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly (the aspect the
  producer rendered). A static image IS the media — just give the file.
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`):** only here do the
  three delivery forms apply — ask which the journalist wants:
  - **Code source (dev — self-host / customise):** run `bun skills/atelier/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
    Hands over a folder with all the built files (`interactive.html`, `static.png`, `static.html`) + an
    `EMBED.md`. Embed the interactive visual with the `<iframe src="interactive.html">` snippet.
  - **HTML statique (one self-contained file, no JS):** the `static.html` produced by `export-code`
    (the image inlined) — a single dependency-free file that embeds in any CMS/email/offline.
  - **Composant en lien embed (hosted, non-technical):** run
    `bun skills/atelier/scripts/deploy-embed.mjs exports/<slug>/<id>/interactive.html <slug> --results exports/<slug>/report.json --id <id> <appName>` → an
    iframe-ready URL to the hosted interactive component. The host is the **journalist's OWN fly.io app**
    (not a shared central host) — pass its name as the 3rd argument or via `$ATELIER_EMBED_APP`. If the
    journalist has not set up their fly.io host yet, offer the code-source / static-HTML forms now and say
    the embed link is pending their one-time setup.

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
| 2b | PROPOSITION | Journalist confirms prose-extracted data table (fires BEFORE Gate 2 for prose proposals) | Fabricated data attribution |
| 2 | PROPOSITION | Journalist accepts / edits / rejects each proposal | Wrong claim visualised |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the real render | Visual quality not verified |
| 4 | EXPORT | Video/static → give the media file directly; interactive/scrolly → journalist chooses code source / static HTML / embed link | Wrong delivery format |

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
- Never edit the engine source (anything under `skills/`) during a journalist run — a bug is REPORTED and routed around, never patched in place. The "feedback → système" convention is for development sessions, not a live newsroom flow. This holds with NO exception for making a produce/conformance gate pass: never edit a producer/component's source code (`skills/*/src`, any `.tsx`/`.ts` producer file) mid-PRODUCTION to turn a failing gate green — a real newsroom journalist cannot patch the engine, so atelier must not either. If a produce or conformance gate fails because of a genuine engine bug (not a spec/data problem), SURFACE the bug to the journalist, do NOT ship that visual, and do NOT patch the code — the bug is reported, never worked around.
- Never silently mutate the ACCEPTED SPEC (`baseColor`, format, etc.) mid-PRODUCTION to route around a conformance-gate failure — this is the spec analogue of the rule above ("never edit product code" → "never silently edit the accepted spec to bypass a gate"). A conformance failure is SURFACED to the journalist as-is; if the spec must change to fix it, GATE 2 is re-opened for re-acceptance of the changed spec. The produce-time conformance guards exist precisely so a non-conformant visual never ships unseen.
- Never hand over an INTERACTIVE visual without offering the three delivery forms at GATE 4 — code source, static HTML, and the fly.io embed link — as an explicit choice (machinery: `export-code.mjs` + `deploy-embed.mjs`). A SCROLLY has no static image, so it offers only **code source + embed link** (its embed targets `scrolly.html`, not `interactive.html`) — do not promise a static-HTML form for a scrolly.
- Never spawn an Agent/Task sub-agent mid-flow — during the atelier flow you ONLY sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (e.g. an agentId) into the journalist-facing conversation.
- Never ship a source that is name-only for a NAMED dataset/publication (e.g. "Eurostat") — it MUST carry both a label and a real, verifiable URL; never fabricate a URL to fill the field. (The honest prose fallback — "Figures as reported in this article" / the outlet's own name — is the one legitimate name-only case, since it names no separate dataset to link.)
- Never accept a generic organisation homepage (e.g. `eurostat.ec.europa.eu`, `insee.fr`) or an unverifiable/404 URL as the source — it must be treated exactly like a missing URL. The source MUST point to the SPECIFIC, traceable dataset/page the figures come from (the Eurostat dataset page for the exact table, the Insee series page, …). If the journalist only gives an organisation name or its homepage, ASK for the specific dataset/page reference rather than shipping the generic one.
- Never ship a title that narrows or diverges from the takeaway the journalist confirmed at CADRAGE (Gate 1, Q2) — e.g. a specific multiplier ("2x") standing in for a confirmed "widening gap" insight, or a scope word ("Nordic") that excludes an entity the visual actually shows. If the data supports more than the title states, widen the title or flag it at Gate 3.
- Never silently substitute a value from a prior/stale export when it disagrees with the journalist's current article/data — the values used (and shown at Gate 2b) MUST always be the ones the journalist provided in the current session.
- Never offer the journalist an element/format (or sub-format) option before confirming — via `suggest-chart`'s reachability, not from memory — that it is actually producible. Retracting an offered option as infeasible forces the journalist to re-answer the same decision multiple times; check first, propose only what's confirmed.
