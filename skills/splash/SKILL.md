---
name: splash
description: Use to run the whole splash pipeline end-to-end from an article and/or data to a finished, exported visual. Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT with human gates, invoking suggest-article, suggest-chart, and the producers. The single entry point for "make me a visual from this". Keywords splash, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# splash — the end-to-end flow

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

**Announce the REAL running count — never a hardcoded question number the flow did not reach.** The
Q-labels below are STABLE positions (Q1 branch · Q2 takeaway/Gate 1b · Q3 channel · Q4 constraint), not a
promise that every one is a fresh single-select turn: Q2's takeaway is asked openly on GUIDED but folded
into a confirm-back on DIRECT, Q4 is conditional, and DIRECT fires at Q1 then skips Q2–Q4. So the number
of turns a journalist actually answers VARIES — announce the count that actually happened, never a canned
"Q3, toujours posée" when the flow did not reach it.

1. **Branch (DIRECT vs GUIDED) — an EXPLICIT journalist-facing turn, never a branch you pick silently
   from their opening message and merely announce as decided.** When the opening names no specific
   visual, ask it openly — "Do you already have a visual in mind, or should I guide you?". When the
   journalist NAMED a specific visual in their opening (e.g. "a scrolly map"), inferring DIRECT from that
   naming is legitimate, but CONFIRM the inference back rather than deciding it silently — « tu as déjà
   une idée précise (une carte scrolly) — on part là-dessus, ou tu préfères que je te guide ? ». The
   journalist must be able to SEE the branch decision and veto it into GUIDED; the branch is never set
   without their visible answer.
2. **Takeaway — GATE 1b (un-skippable, both branches):** "What is the one thing a reader should leave
   with?" → the insight/angle. This is a DISTINCT, mandatory step — it is NEVER collapsed into Q3, and it
   is NEVER satisfied by inferring the takeaway from the article and moving on. Even when the article
   plainly implies a takeaway, you MUST state your inferred takeaway back to the journalist in one plain
   sentence and get their EXPLICIT confirmation (or correction) before leaving CADRAGE. On GUIDED, ask it
   openly (offer only supported framings, below); on DIRECT, the open-ended asking is replaced by a
   confirm-back of the takeaway inferred from the article + the named visual — but the confirmation itself
   is NEVER skipped. Do not advance to PROPOSITION/PRODUCTION on an unconfirmed, silently-inferred
   takeaway — that is exactly the miss this gate exists to close.
   **★ Record the confirmed takeaway VERBATIM.** The exact sentence the journalist confirmed (or the
   corrected wording they gave back) becomes each accepted proposal's OWN confirmed sentence — its
   REQUIRED `confirmedTakeaway` field in `accepted.json` (5b, one per element; see ★ One element =
   one confirmedTakeaway below) — the spine's validation gate (`src/validate-gate.ts`) FAILS any
   proposal missing it or carrying an empty string, on BOTH branches (there is no path on which a
   takeaway was never confirmed). A MULTI-PART takeaway ("X is falling everywhere AND Italy is the only
   riser") is recorded WHOLE — every part, never just the half the chosen chart type happens to
   foreground. The render-review (Gate 3a) then quotes this field back against the produced
   title/insight, part by part.
   **★ One element = one confirmedTakeaway.** The multi-part rule above is about ONE element whose
   single claim has several parts. It is NOT a licence to share: when a session accepts SEVERAL
   elements (a multi-opportunity article), each element carries ITS OWN confirmed takeaway — the one
   sentence the journalist confirmed FOR THAT element — never one combined string ("both at once: the
   price cooldown AND the plateau") copied onto every entry. Confirm one takeaway PER accepted
   element before it reaches `accepted.json` (5b); if only a combined framing was confirmed at
   CADRAGE, split it and confirm each element's own claim at PROPOSITION. A shared combined string
   DILUTES the Gate-3a title check: element A's title (showing only prices) gets compared against a
   two-part claim half of which belongs to element B — the check can neither pass nor fail honestly.
   **★ Every takeaway option you offer MUST be supported by the supplied data (use the ANALYSE data
   shape).** Never float a framing the data cannot substantiate: do NOT offer a temporal / trend framing
   ("the gap is widening", "growth since 2015", "rising", "over time") when the data is a **single
   snapshot with no time dimension** — a widening/narrowing story is undecidable from one point in time;
   do NOT offer a per-capita / rate framing when only absolute counts exist; do NOT offer a
   spatial-pattern framing when the data is not geographic. Offering an unsupported framing forces a
   later retraction and tempts a fabricated series to "back it up". If the journalist genuinely wants a
   trend, say the current data can't show it and ask for the time series — never invent one.
3. Audience & channel: a STRUCTURED single-select, journalist's language, exactly three options —
   **Social vertical (Stories/Reels)** · **Social feed (Instagram/Facebook post)** · **Article web /
   embed — interactif, image ou vidéo (destination print ⇒ image statique)**.
   This is not a free-text prompt (never ask it as one) — the pick maps 1:1 onto
   `skills/splash/src/channel.ts`'s `Channel` enum, which deterministically fixes both the media SIZE and
   the ALLOWED FORMAT SET for everything downstream:
   - **Social vertical** → portrait **9:16** · formats {image, video}.
   - **Social feed** → square **1:1** · formats {image, video}.
   - **Article web / embed** → media **landscape 16:9** / component **responsive** · formats
     {image, video, interactive}. This is the FULL-CAPABILITY channel: interactive is the default
     (`interactiveDefault`), and image, video and scrolly (a kind of interactive) are all available.
     **PRINT lives HERE as a SUB-CASE — the channel model needs no 4th channel**: a paper
     page is a static-image deliverable, so a print-destined piece answers (c), and a STATED print
     destination steers the format pin to `static` at PROPOSITION (see "Article/web has NO static
     fallback" below) — never interactive/video, which no printed page can host. **Word option (c) so
     the channel reads full-capability with print as the parenthesised sub-case** — "article web /
     embed — interactif, image ou vidéo (destination print ⇒ image statique)" — NEVER as "article
     web / print (image statique) / embed", which reads as if the WHOLE channel were static-only and
     primes the journalist (and any later reviewer) toward the wrong expectation when the pinned
     format is interactive; never force a print piece into an off-fit social answer or leave it
     unable to answer.
   **Hard rule: not article/embed ⇒ image or video only — NEVER interactive or scrolly.** Only the
   article/web channel can host an interactive (scrolly is a kind of interactive). **Always asked — on
   EITHER branch, never skipped.** A DIRECT-named visual still needs a channel: a journalist-naming "a bar
   chart" doesn't by itself say feed→square vs web→landscape, and downstream, `suggest-chart`'s routing
   cannot even restrict its format set without it (see `knowledge/references/formats/format-selection.md`).
   Skipping Q3 is exactly the failure mode that let a visual escalate to interactive/video/scrolly with
   none of the channel constraints established — never skip it.
   **The formats named in option (c) describe the channel's ALLOWED SET — they are NOT a menu to pick
   from here, and NOT a second question.** "Interactif, image ou vidéo" tells the journalist what the
   article-web channel CAN host; splash must NEVER follow the channel pick with a separate CADRAGE turn
   re-offering static / interactive / video — that double-ask is redundant with this label and inflates
   the question count. The single format is decided later, exactly once: pinned at PROPOSITION and
   announced-vetoable on GUIDED (Gate 2), or named by the journalist inside Q1 on DIRECT. Q3 fixes the
   allowed SET; the format pin is surfaced ONCE, at PROPOSITION — the two never double-ask.
4. Constraint (only if relevant): mobile-first, deadline, house style.
   - **Newsroom profile (F2):** the project's house style lives in `NEWSROOM-PROFILE.md` (the journalist fills it once — palette + accent + default `source` + `lang` + `credit` + `theme` (dark/light map basemap); see `NEWSROOM-PROFILE.example.md`). It is **auto-applied at produce time** — `produce-all` calls `loadNewsroomProfile` and merges the profile onto every element's spec as DEFAULTS (the per-element value always wins): `source`/`lang` universally, brand colour for chart-native/dw-chart. You do NOT load it manually; just **ANNOUNCE** the house style is being applied (palette + default source/lang) so the journalist can veto or override. A non-CVD-safe / low-contrast house colour is applied AS CHOSEN (policy b, brand-first), NOT rewritten — the produce-time a11y guards downgrade it to a render-review concern (Gate 3), the editor decides. No profile → auto subject-fit colour + per-article source/lang, unchanged. Brand colour reaches **every producer**: chart-native/dw-chart take the house primary as `baseColor`; map-native derives a house **ramp** (choropleth/hex/cartogram — CVD-safe by monotonic luminance) or **fill/accent** (symbol/route/dot-density/locator), light **and** dark basemaps; map-dw derives the house gradient; scrolly inherits its host's colour. Two mechanics: for map-native the merge **clears the suggester's auto ramp `palette`** so the house ramp wins (mechanical); map-dw reads a `colorScale`, so its house colour depends on the suggester **omitting** the auto colorScale under a profile (the Map-colour rule in suggest-chart). An explicit per-element colour wins everywhere it is flagged `baseColorExplicit`. Exception: a **diverging** map keeps its registry palette (a sequential house ramp can't encode a signed midpoint — house diverging ramp is a follow-up). A house `theme: dark` sits every map-native/map-scrolly map on the **dark basemap** (map-dw dark = follow-up; a per-element `mapStyle` wins). Source + language apply universally. Logo/fonts and image-native accent are the remaining follow-ups.

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
a fresh options menu — and since the CADRAGE channel question (Q3) set only the ALLOWED SET (never a
format), this announce is the FIRST and ONLY place the single format is surfaced, so channel and format
never double-ask. **Hard rule surfaced here too:** a non-article/embed channel can only land on
image or video — never interactive or scrolly; if the journalist asks for an interactive on a social
channel, say so and point back to the CADRAGE Q3 channel pick rather than silently escalating.

**The accepted spec pins exactly ONE `format`.** `suggest-chart` commits to a single `VisualFormat`
(`static|interactive|video|scrolly`) from `allowedFormats(channel)` — never the whole allowed set — and
THIS is the `{format}` announced above for veto; the journalist may change it here, but to another single
member of `allowedFormats(channel)`, not to a list. `interactiveDefault` (`skills/splash/src/channel.ts`)
still steers `suggest-chart`'s default pick to interactive on article-web — it only sets the default, not
a fallback set. Once accepted, that one format is what `accepted.json` carries (5b) and what flows to
PRODUCTION; `produce-all` applies `assertFormatAllowed(channel, format)` (`skills/splash/src/channel.ts`)
as the produce-time guard that the pinned format is actually a member of the channel's allowed set — no
new gate, the check reuses PROPOSITION's own decision.

**Narrative sub-format — who picks it reuses the CADRAGE branch:**
- **interactive** → the sub-format is **explore-libre** (pan/zoom/hover) vs **scrolly** (sequential).
- **video** → the sub-format is the camera/reveal mode (reveal-simple, guided-tour, zoom-out, pan,
  line-reveal, ranked-bars… — per producer).
- **GUIDED** → the AI PICKS the sub-format (grounded in the routing, announced above, vetoable) — do not
  make the journalist choose a reveal style blind.
- **DIRECT** → the journalist NAMES the sub-format themselves, but only once it is checked reachable via
  `suggest-chart` (see "Only offer what is confirmed producible" below) — never offer a named sub-format
  that turns out not to be producible.

**★ Chart-scrolly BEAT MODEL — announce it honestly HERE, and carry a confirmed plan into the spec.**
When the routed sub-format is a chart scrolly (line/bar/scatter), the PROPOSITION must state, up front,
what is auto and what the journalist controls — the observed failure was a FLOW failure: the journalist
confirmed a 3-beat narrative plan, the engine silently auto-picked its own beats, and the mismatch
surfaced only at Gate 3 AFTER production. So:
- **Default (auto):** absent an explicit plan, the engine picks the steps itself — line: first + last +
  the 2 biggest moves; bar: the top-3 leaders + the lowest (a fixed 4-step walk); scatter: 3 outliers.
  Say this — never imply the steps will follow a plan that was only discussed in prose.
- **Controllable (explicit `beats`):** for a LINE, an ordered list of beats each anchored on an x-value
  (or an x..xEnd range) from the data + the confirmed step caption; for a BAR, the exact ordered list of
  categories to walk — the walk length follows the list (5 confirmed steps = 5 walk steps), and a named
  entity the journalist wants in its own step (e.g. « Alpes-Maritimes ») is simply listed. Scatter has
  no override (auto outliers only) — say so instead of promising one.
- **A confirmed plan MUST land in the spec** as the chart-scrolly `beats` field (see suggest-chart's
  Chart scrolly section) — never acknowledged in dialogue then dropped on the floor. The journalist's
  order is the emitted order (narrative order wins, even non-chronological).
- **Fail-loud tripwire:** every beat anchor is validated against the data at the spine gate (5a,
  `narrativeBeatErrors`) and again at derive — a typo'd year/category fails the proposal loud BEFORE
  production, never a silently shifted or dropped beat.
- **★ Comparative/rank captions MUST match the data ordering.** Every beat caption that makes a
  COMPARATIVE or RANK claim — « devant » / "ahead of", « top 3 », "the highest", « le plus bas » — is
  checked against the ACTUAL sorted data BEFORE production: the named entity's value must really sit
  in the asserted position relative to EVERY entity it is compared to. This is a real shipped error,
  not a hypothetical: a beat caption asserted a département ranks « devant » two others while its
  value (27.2) was LOWER than both (30.6, 28.4) — the caption inverted the sorted order visible on
  screen. A caption the data contradicts is corrected (or its claim dropped) before the spec is
  produced; the render-review (Gate 3a) then re-verifies each step caption against what that step
  visually shows (see 3a).
- **Map scrolly** steps stay derived from the data (temporal sequence / magnitude ranks — no explicit
  override exists on that track; a `beats` field there is mechanically rejected); if the journalist
  needs named-step control on a map story, say that limitation at PROPOSITION, not after production.

**Article/web has NO static fallback — the pinned format is the ONLY artifact, so pin the one the
journalist actually wants.** For the article-web channel, `suggest-chart` routing DEFAULTS to interactive
(`interactiveDefault`, `skills/splash/src/channel.ts`) — it wins ONLY absent a concrete reason otherwise.
That default is NOT a mandate: an explicit journalist format signal ("a static image", "a static chart",
"just an image", "pour le print") WINS over it — pin `static`, never interactive. **Print is the
strongest such signal**: when the STATED destination is print (the journalist answered (c) at CADRAGE
Q3 NAMING the print destination — print is a sub-case of that channel, the pick alone does not imply
it — or says the piece is print-bound at any point), pin `static` — a printed page cannot run
an interactive or a video, so `interactiveDefault` never applies to it. Since the single-format
redesign there is NO auto no-JS `static.html` produced alongside an interactive (a11y = choosing the
`static` FORMAT, see §6 and the export guardrail below) — whichever ONE format is pinned is the ONLY
artifact the journalist gets, so a wrong default is NOT backstopped by a byproduct. Announce that pinned
`{format}` explicitly for veto (Gate 2, above) — never silently default to interactive and jump straight
to production as if a static image still tagged along.

**★ One opportunity = one accept decision = one `suggest-chart` call.** Each DISTINCT `suggest-article`
opportunity is routed and accepted INDEPENDENTLY — never fold a second opportunity's series/claim into
another opportunity's visual. If ANALYSE surfaces two claims (e.g. a minimum-wage series AND an
inflation series), that is TWO proposals, TWO Gate-2 accept decisions, and TWO `suggest-chart` calls —
even when both trend over time and could be stapled onto one chart. Combining them silently drops the
second opportunity from the journalist's sight (they never got to accept/reject it) and it never reaches
its own routing. Surface EVERY opportunity as its own line; the journalist decides which to keep, and
each kept one becomes its own `accepted.json` entry (5b) that `produce-all` renders separately. Each
kept opportunity also carries its OWN Gate-1b `confirmedTakeaway` — that element's confirmed claim,
never one combined multi-element string stamped onto every entry (see CADRAGE Gate 1b).

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
- **A source resolves to exactly ONE of THREE states — and a NAMED org is never thrown away:**
  - **(a) name + specific, traceable dataset/page URL** — the goal; ship both verbatim.
  - **(b) named org kept NAME-ONLY** — when the article named an org (or the journalist confirms one)
    but no precise dataset/page URL can be obtained, ship `source.name` = that org, `url` omitted.
    Name-only is a legitimate, honest citation; it is NOT a reason to fall back to the generic prose.
  - **(c) generic prose fallback** ("Chiffres tels que rapportés dans cet article" / "Figures as
    reported in this article") — legitimate ONLY when the article names **no** org at all (the genuine
    no-dataset case), or when a hedged recollection stays unconfirmed (uncertainty rule below).
  Collapsing a named org (state b) into the generic fallback (state c) DISCARDS a real, verifiable
  attribution — a shipped defect (real cases: INSEE, REN/DGEG). The spine enforces this mechanically:
  carry `suggest-article`'s `sourceHint` onto each accepted proposal's `sourceHint` field (5b) so the
  source guards (`sourceNamePreservedReason`, `sourceUrlFidelityReason` in `src/source-guard.ts`, wired
  in `validate-gate.ts`) fail the produce for EVERY producer if a named org is dropped for the fallback,
  or if a shipped URL diverges from the one the journalist provided.
- Otherwise, ask the journalist ONE free-text question that collects the label AND the specific URL
  TOGETHER, in the SAME turn — never split it into "what's the source?" then a follow-up "and the
  URL?"; that two-step pattern is exactly the multi-turn back-and-forth this gate exists to close.
- Apply the same rejection rule used at Gate 3 (see Never, below) to the answer BEFORE accepting it: a
  bare organisation homepage (`eurostat.ec.europa.eu`, `insee.fr`) standing in for the specific
  dataset/page is not a URL you should promote to state (a) — ask once for the specific page; if none
  comes, keep the org NAME-ONLY (state b), never quietly downgrade to the "reported in this article"
  fallback. **And never do the inverse:** do NOT UPGRADE a homepage (or any journalist-provided URL) to
  a deeper `…/path/file.pdf` you cannot confirm — cite only the exact URL the journalist gave or one
  they explicitly confirm in-turn (Defect D: a fabricated-deeper `dares…/sites/…pdf` shipped as fact).
- **Journalist UNCERTAINTY is not a source.** When the answer comes hedged — « je crois », « de
  mémoire », "I think it was the 2023 report", the journalist cannot name the exact report/dataset —
  do NOT ship a flat, confident-looking citation built on that admission: a reader cannot tell a hedged
  recollection from a verified reference, so a confident citation over admitted uncertainty is a
  DEFECT, even when the guess happens to be right. Exactly two honest moves: **(1)** get the
  journalist's EXPLICIT confirmation of the exact source — the confirmed name + the specific
  dataset/page URL (offer to wait while they check); or **(2)** use the honest prose fallback —
  "Chiffres tels que rapportés dans cet article" / "Figures as reported in this article" (or name-only
  with the OUTLET's own name) — which claims no more than what is actually known. Never dress the
  uncertain recollection up as a confirmed dataset citation, and never invent a URL to firm it up.
- The honest prose fallback ("Figures as reported in this article" / the outlet's own name) is
  legitimate in exactly TWO cases: when the data genuinely has no separate cited dataset
  (`provenance:"prose"` or `"none"`), and when the journalist's recollection of a source stays
  UNCONFIRMED after the uncertainty rule above (they cannot confirm the exact report/dataset and choose
  not to hold for it). Never use it merely because the journalist has not yet answered, and never use
  it as a shortcut out of this gate.
- Only once the proposal's source is resolved to one of the three states above — (a) name + specific
  traceable URL, (b) named org kept name-only, or (c) the honest prose fallback (genuine no-dataset
  case, or a hedged source left unconfirmed per the uncertainty rule above) — does it go into
  `accepted.json`'s spec (5b). Also copy `suggest-article`'s `sourceHint` verbatim onto the accepted
  proposal's `sourceHint` field so the spine's source guards can enforce states (a)/(b)/(c)
  mechanically. This does not replace Gate 3a's render-review source check — that stays the safety net
  if the URL turns out unreachable once the actual render is seen — but it should rarely have anything
  left to catch.

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
must be the one already established at Gate 2c (name + a specific traceable URL, or the honest prose
fallback per 2c — the genuine no-dataset case, or a hedged source left unconfirmed; never a confident
citation over a « je crois ») — never a placeholder, never the `suggest-article` `dataSource.table` filename
slipped in as the label (see suggest-article's Gotcha (4)). **A reserved placeholder URL
(`…example.com`, `.test`, `.invalid`, `localhost`, RFC 2606/6761) is MECHANICALLY rejected by the spine's
validation gate (GUARD 2, `src/source-guard.ts`) — the proposal comes back `status:"failed"`, never
produced; a name-only prose source with no URL still passes.**

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"confirmedTakeaway": "<the takeaway the journalist EXPLICITLY confirmed FOR THIS ELEMENT (Gate 1b),
VERBATIM — every part of that element's multi-part takeaway, never a paraphrase, and never a combined
multi-element string shared across entries>",
"provenance": "table|prose|none", "confirmedTable": <true ONLY after an actual Gate 2b prose-table
confirmation — stays false/absent for "table" (and "none") provenance, which never go through 2b;
never set it true on a table-provenance proposal just because it looks accepted>,
"channel": "social-vertical|social-feed|article-web",
"sourceHint": <OPTIONAL — `suggest-article`'s `sourceHint` verbatim, `{ "name"?, "url"? }`, set ONLY
when the ARTICLE itself named a source/URL; omit entirely when it named none> }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article.
**`sourceHint`, when the article named a source, MUST be carried onto the accepted proposal** — the
spine's source guards (`validateAccepted` → `sourceNamePreservedReason` / `sourceUrlFidelityReason`)
consume it to FAIL (B) a named org collapsed to the generic "reported in this article" fallback, and
(D) a shipped URL that diverges from the journalist-provided one. This is prose-enforced the same way
as `channel` and `confirmedTakeaway`: there is no script that transforms `suggest-article`'s in-context
ProposalSet into `accepted.json` — YOU copy the hint across here, verbatim. Dropping `sourceHint`
silently disarms those guards, exactly like dropping `channel` disarms the format gate. **Backstop:**
when the shipped `source` is the generic fallback but no `sourceHint` was threaded (on a `table`-backed
claim), `validateAccepted` emits a non-blocking render-gate WARNING (`ProposalResult.warnings`) so a
dropped hint is no longer fully silent — treat that warning as "confirm the article really named no
source; if it did, thread the hint and re-produce". It is advisory only; it never blocks the produce.
**`confirmedTakeaway` is REQUIRED — the spine's validation gate (`src/validate-gate.ts`,
`validateAccepted`) FAILS any proposal whose `confirmedTakeaway` is missing or empty**, on both
branches (Gate 1b is un-skippable on guided AND direct, so no proposal legitimately lacks one). It is
the Gate-1b presence lever: the render-review (3a) quotes it VERBATIM against the produced
title/insight, part by part — copy the confirmed wording exactly, never a paraphrase that drops a
part. **Per-element, never shared:** in a multi-element run each entry's `confirmedTakeaway` is that
element's OWN confirmed claim — two accepted elements never carry the same combined takeaway string
(an observed miss: a two-opportunity run shipped BOTH elements with one combined "les deux à la
fois…" takeaway, so each title was checked against a claim half of which belonged to the other
visual). This is mechanically enforced: the same validation gate FAILS any two proposals of a batch
carrying the byte-identical `confirmedTakeaway` string (GUARD 3b). **`channel`
is REQUIRED — it is the CADRAGE Q3 confirmed pick (§3, the structured audience & channel question),
copied verbatim onto every proposal it applies to.** `produce-all`'s channel/format gate (5c) reads this
field to enforce "not-embed ⇒ never interactive/scrolly"; **omitting it silently defeats that guard** —
an ABSENT channel falls back to `"article-web"` (the permissive default, matching `normalizeChannel`'s
absent-input default), so a social-only visual with a dropped `channel` would ship an interactive nobody
asked for. Never omit it. (A GARBLED non-empty channel string does NOT widen that way: `normalizeChannel`
is fail-closed and the gate records it as a failed result naming the valid channels.)

**5c. Produce everything at once** — report to a FILE (the gates and EXPORT read it back):
```bash
bun skills/splash/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug> \
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
- **`failed`** → surface the `error`; fix the spec or drop the proposal. Never ship a failed visual.
  **A non-zero `produce-all` exit (or any gate refusal) is a HARD STOP surfaced to the journalist AS-IS
  — never worked around** by re-authoring code, hand-editing outputs, an ad-hoc script, or a silent retry
  with hidden changes (see Never; the harness `check:conformance-no-fabrication` catches a produce exit=1
  the run continued past). If the
  failure is a **conformance gate** rejecting the accepted spec (e.g. a colour/contrast/format
  violation) — do NOT silently mutate the accepted spec (`baseColor`, format, etc.) to make the gate
  pass without saying so: SURFACE the conformance issue to the journalist as-is, and if the spec
  genuinely needs to change to fix it, re-open GATE 2 for the journalist to re-accept the changed spec —
  never edit-and-reship a spec the journalist never saw (see Never). If the
  failure traces to the PRODUCER/COMPONENT'S own source code rather than the spec — a genuine engine bug,
  not a data/shape problem — do NOT edit that code (`skills/*/src`, any `.tsx`/`.ts` producer file) to force
  the gate green, and do NOT author a NEW ad-hoc script (a case-named `verify-*.mjs`) to stand in for a
  pipeline step: REPORT the bug to the journalist (this visual cannot ship yet) and drop or route around
  the proposal instead (see Never).

**GATE 3 (render) — per produced visual.**

**3a. Render-review FIRST (mandatory, Layer 2).** Before you show the journalist anything, put the
produced visual through an INDEPENDENT editorial pass per `references/render-review.md`: read the ACTUAL
render + the article + data against the six criteria (title honesty — including that the title matches
the takeaway the journalist confirmed at CADRAGE Gate 1b, not a narrower or different claim — source
traceability, honest encoding, earns-its-place, legibility/a11y, fidelity). **The review MUST QUOTE the
proposal's `confirmedTakeaway` (from `accepted.json`, 5b) VERBATIM and state EXPLICITLY whether the
produced title/insight carries ALL its parts** — a two-part takeaway ("X is falling everywhere AND
Italy is the only riser") needs BOTH parts carried by the visual's title/framing, or the dropped part
recorded as a concern; a review that never quotes the confirmed takeaway, or quotes it without the
part-by-part statement, is NOT a valid render-review (this omission is itself a review failure —
re-run 3a properly). This is the recurring miss this lever exists to close: a chart type that
foregrounds one half of the confirmed claim (a slope showing the fall but not the one riser) silently
drops the other half unless the review names it. **For a SCROLLY, the review MUST likewise verify EACH
step caption against what that step visually shows** — in particular any COMPARATIVE or RANK claim in
a caption (« devant » / "ahead of", « top 3 », "the highest") is checked against the actual data
ordering the step renders; a caption asserting an order the sorted values contradict is a concern (a
shipped beat caption claimed a value ranked « devant » two others while it was lower than both — see
the beat-model rule at PROPOSITION). A scrolly review that never states this per-step caption check is
not a valid render-review either. These catch what the spine's
code gates cannot — a title that misstates the metric, a fabricated or incomplete source, a misleading
encoding. **Never spawn an Agent/Task sub-agent to do this review** — during the splash flow you ONLY
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
it (export is refused without a review record) — **`--probes` is REQUIRED: the ledger of every check the
review actually ran** (`[{check, outcome: pass|concern|resolved, note?}, ...]`, inline JSON or a file path;
see `references/render-review.md`, "Record it"). The gate refuses an empty ledger, a probed concern the
review silently drops (EACH concern-outcome probe must be referenced by a surfaced concern quoting its
`check` verbatim — `"<check>: <what failed>"`; an unrelated concern never accounts for it), and a
failure keyword (404/absent/missing/mismatch…) no probe outcome reflects —
a probed failure is either surfaced as its own concern (advisory) or explicitly resolved with evidence,
never narrated away. (A fresh DW publish may 404 its `dataset.csv` briefly — retry once after
`DW_DATASET_PROPAGATION_RETRY_MS` before recording a data defect.)
```bash
bun skills/splash/scripts/review-gate.mjs exports/<slug>/report.json <id> --probes '[...]' [concern...]
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
bun skills/splash/scripts/gate-render.mjs exports/<slug>/report.json <id> exports/<slug>/<id>/static.png
```
(swap `static.png` for whichever local file the journalist approved — e.g. `interactive.html`,
`scrolly.html`, or the rendered `.mp4` — always the path under `exports/<slug>/<id>/`, never a URL.)
**PROVENANCE is enforced mechanically** (`src/render-provenance.ts`): the approved file must be an
output the pipeline emitted for the CURRENT produce generation — listed in this report's `outputs`
and no newer than the report's `generatedAt` stamp. A file hand-authored into the build subdir, or an
artifact from a later produce approved against a stale report, is a hard refusal — save the fresh
`report.json` and redo 3a → 3b. **Hosted-DW interactive (a `publicUrl`, NO local render):** never
write a stand-in file into `exports/<slug>/<id>/` (it would leak into export-code's hosted-embed
detection) — capture the reviewed live embed (screenshot or saved page) into the sanctioned
`_review-artifacts/<id>/` directory (SIBLING of the build subdir) and approve THAT file; the gate
accepts it only for a hosted result and only if captured AFTER the current produce generation.
**★ Capture to an ABSOLUTE, run-scoped path — never a bare relative `exports/...`.** Verifying an
interactive means you may have `cd skills/<producer>/` earlier to run an interaction snap, so a
relative `exports/<slug>/_review-artifacts/<id>/` resolves against THAT cwd and the screenshot lands
under `skills/<producer>/exports/…` (an observed miss on a dw-chart run, then papered over with a
manual `mv`). Resolve the absolute capture dir FIRST — anchored on where `report.json` lives, e.g.
`CAP="$(cd exports/<slug> && pwd)/_review-artifacts/<id>"; mkdir -p "$CAP"` — and capture into `$CAP`
(then approve `$CAP/<file>`). If a capture ever lands in the wrong place, that is a mis-path to RE-CAPTURE
at the absolute path (the provenance refusal names it), never to `mv` into position (see Never).
`gate-render` is the ONLY writer of the render approval; EXPORT refuses any visual not render-reviewed
(3a) AND not approved (3b) — so an unreviewed, unseen, or unapproved render can never ship.

_(Under the hood `produce-all` dispatches to `chart-native/scripts/produce-from-spec.mjs`,
`map-native/scripts/produce.mjs`, `scrolly/scripts/produce.mjs`, and the Datawrapper producers — you
call `produce-all`, not them directly. An omitted map-native format still defaults to `static`, never
the full video set.)_

### 6. EXPORT — GATE 4 (delivery depends on the visual's format)

**Delivery location — stable, never the scratchpad.** Write every hand-over (export folder, mp4, PNG) to
`exports/<slug>/` under the journalist's working directory (the splash project root), NOT the session
scratchpad — the scratchpad is temporary and gets cleaned, so the journalist would lose the deliverable
(and cannot find it). After delivering, print the file/folder's ABSOLUTE path. `export-code.mjs` refuses
(non-zero) if the export path looks ephemeral. The ship scripts also refuse unless the proposal is
`produced` AND render-approved (GATE 3 done) — pass the report + id so the gate can check. **If a ship
script exits non-zero (an ephemeral path, an unmet `assertDelivered` shape, a missing prerequisite), that
is a HARD STOP surfaced to the journalist — never worked around** by `mv`/`cp`-ing files into the shape a
gate expects, by hand-editing the export folder, or by a silent retry; fix the actual cause (re-run the
correct `--form` build, point the script at the file production emitted) and re-run the script (see Never).

Branch EXACTLY on the channel/format model (`skills/splash/src/channel.ts`) — **image and video hand
over the media directly, no delivery menu; only interactive gets a delivery choice, and only because
article-web is the one channel that can host it**:

- **VIDEO (mp4):** hand over the mp4 directly, at the CADRAGE channel's size and the narrative sub-format
  chosen at PROPOSITION (camera/reveal mode) — no code/embed forms, the media IS the deliverable. The
  producer renders **only the one aspect the channel requires** — social-vertical → **portrait 9:16**
  (1080×1920), social-feed → **square 1:1** (1080×1080), article-web → **landscape 16:9** — **one mp4, not
  three** (the aspect is threaded via `SPLASH_CHANNEL`; a fail-hard produce-time conformance step refuses
  a render whose size ≠ the channel). Native chart-native/map-native now render **true 9:16** for
  social-vertical (Slice 2 repointed the portrait comps 1080×1350 → 1080×1920), matching `dw-chart`'s
  static portrait — no more 4:5 caveat.
- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly, at the channel's size
  (portrait 1080×1920 for social-vertical, square 1080×1080 for social-feed, landscape 1200×675 for
  article-web) — no delivery menu, just the file.
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`, article-web only):**
  splash **PROPOSES three delivery forms and the journalist CHOOSES one — and ONLY the chosen form is built
  (LAZILY, on demand)**. There is no "produce all forms unconditionally": the React bundle and the fly.io
  deploy are expensive/irreversible, so nothing beyond the produced `interactive.html`/`scrolly.html` is
  materialised until the journalist has picked. **There is NO auto no-JS `static.html` fallback** — accessibility
  is a FORMAT choice at CADRAGE (picking `static` IS the accessible path), not a file bolted onto every
  interactive. `export-code.mjs` is a **two-phase** script:
  1. **Phase 1 — emit the proposal (build NOTHING).** Run WITHOUT `--form`:
     `bun skills/splash/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
     It emits a fixed three-form proposal DESCRIBING what each form WOULD be — an `EXPORT_FORMS_JSON {…}` line
     (machine-parseable: `forms.a` = `{kind, path, pending:true}`, `forms.b.path` = the standalone HTML file,
     `forms.c.command`/`url`, each with a `deliver` command = the exact `--form` re-invocation) plus an
     `EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL` human block. **No bundle is assembled, no deploy runs,
     no folder is written** at this phase — the paths in the proposal are `pending`.
  2. **THEN relay the emitted proposal VERBATIM and ASK which form the journalist wants (a / b / c) — an
     explicit, un-skippable GATE.** Do NOT collapse it to a bare "Livré."; do NOT pick for them. Relay the
     script's `EXPORT_FORMS_PROPOSAL` block (it already carries the concrete paths + the `deliver` command for
     THIS export), then wait for their answer.
     **★ WAIT means WAIT: after emitting the proposal, `--form` MUST NOT run until a journalist message
     answering THIS proposal exists in the conversation.** "The only possible form is c, so I finalize" is the
     NAMED VIOLATION — observed on a real two-element hosted-DW run, where splash emitted both proposals,
     announced « Je finalise la livraison sous cette forme pour les deux », and ran `--form embed` twice
     without a single journalist turn in between. A hosted-DW proposal offering ONLY form c is still this
     gate: the journalist confirms the single form; splash never confirms in their place.
     **Multi-element delivery: the form choice is PER ELEMENT (forms may differ).** Either ask element by
     element, or ask ONCE for all of them while EXPLICITLY offering the grouped reply (relay each element's
     proposal and invite « une forme par élément, ou la même pour tous »). A grouped journalist answer
     (« embed pour les deux ») is a valid choice for every element it names — but the grouping is the
     JOURNALIST's to give, never splash's to presume: applying one element's answer (or no answer at all)
     "to both" is auto-deciding, the same named violation.
     The three forms are:
     - **a) Code source** (`forms.a`) — the delivery depends on the producer:
       - **chart-native** (`kind: "react-source-bundle"`) → a `<id>-source/` **runnable React source bundle**,
         assembled ON DEMAND by `skills/chart-native/scripts/export-source.mjs` from the `config.json` +
         `native-source.json` the producer drops in the build subdir: a self-contained Vite project (`src/` = a
         copy of chart-native/src, `config.json`, `main.tsx`/`index.html` that import the chart + config
         statically, `package.json` with the interactive deps only — no remotion, `vite.config.ts`,
         `tsconfig.json`, `README.md`). The journalist runs `bun install && bun run build` → `dist/index.html`
         (the interactive). THIS is the headline form-1 capability.
       - **map-native / scrolly** (`kind: "react-source-bundle"` too) → a `<id>-source/` **runnable Vite
         project**, assembled ON DEMAND by `skills/splash/scripts/bundle-source.mjs`, which closure-traces
         from the `source-manifest.json` + `config.json` the producer drops (their `src/` is entangled —
         map-native imports scrolly; scrolly imports chart-native + map-native + maptiler/turf — so the copy
         PRESERVES the repo-relative `skills/<engine>/{src,assets}` layout and deps are DERIVED from the
         traced closure, remotion included on the map path). `bun install && bun run build` → `dist/index.html`
         — but the map fetches basemap tiles from MapTiler at runtime, so this bundle is **online-only** and
         needs the journalist's OWN `VITE_MAPTILER_KEY` (never baked in; documented in the bundle's
         `.env.example` + `README.md`).
     - **b) HTML autonome** — JUST the single self-contained file: the JS-inlined `interactive.html`
       (`scrolly.html` for a scrolly). One file, drops into any CMS/email/offline.
     - **c) Embed (hébergé)** — deploy the html to the journalist's own fly.io host and share the returned URL
       (for a **hosted-DW** producer, whose interactive IS the already-published embed, this is the live
       `publicUrl` — no deploy step). **A SELF-HOSTED embed (no live `publicUrl`) needs `FLY_API_TOKEN`** to
       deploy: when it is unconfigured, the emitted proposal FLAGS form c `available:false` (with a `reason`)
       and the relay text marks it « INDISPONIBLE ici » steering to **b) HTML autonome** — do NOT offer /
       run form c in that environment (a hosted-DW form c stays available — it needs no fly deploy).
  3. **THEN build + deliver ONLY the chosen form** — re-run `export-code.mjs` with `--form <html|code-source|embed>`
     (the `deliver` command from the proposal is exactly this):
     - `--form html` → copies the standalone `interactive.html`/`scrolly.html` into the export folder; print its
       ABSOLUTE path (that single file IS the delivery).
     - `--form code-source` → runs `export-source.mjs` NOW (chart-native) or `bundle-source.mjs` NOW
       (map-native/scrolly) to assemble the runnable `<id>-source/` bundle; print its ABSOLUTE path.
     - `--form embed` → runs `deploy-embed.mjs` NOW to upload to the journalist's OWN fly.io app (name via the
       3rd arg or `$SPLASH_EMBED_APP`) and records the hosted URL in `EMBED_URL.txt` (a hosted-DW producer
       records its already-live `publicUrl`, no deploy). Share the URL. **Integrity: `deploy-embed.mjs`
       FAIL-FASTS (non-zero, before any flyctl call) if `FLY_API_TOKEN` is unset and there is no live
       `publicUrl` — it never half-deploys or writes a placeholder; `export-code` surfaces that message and
       refuses.** The URL recorded must pass `isHostedUrl` (a real https origin) or the export fails.
     Each run ends with the `assertDelivered(files, { format, form })` gate — the folder must match the
     `(format, chosen form)` shape or the export fails loudly. For **form embed** that gate is strict like
     static/video: the folder must be EXACTLY `EMBED_URL.txt` holding a resolvable https URL — the pre-export
     PRODUCTION output (the produced `interactive.html`/`static.png`) is NOT an embed deliverable, so handing
     it over cannot fake `delivered`. **Hosted Datawrapper interactives** (`publicUrl`,
     no local html) offer ONLY form c (the live embed) — there is no React source and no standalone local html
     to hand over.

  **★ `delivered` REQUIRES that `export-code.mjs --form <chosen>` built the artifact** (for interactive/scrolly).
  Never report an interactive/scrolly as delivered on produce-time outputs alone — a Gate-3 review PNG,
  `interactive.png`, or the build subdir's byproducts are NOT a delivery. If the `--form` build did not run, the
  visual is NOT delivered, no matter how the run otherwise ended.

  **One-time fly.io host setup — on the JOURNALIST'S OWN fly.io account** (run once from
  `skills/splash/embed-host/`; fly.io app names are globally unique, so the journalist picks their own,
  e.g. `<newsroom>-embeds`):
  ```bash
  flyctl auth login                        # the journalist's own fly.io account
  flyctl launch --no-deploy --name <their-app>   # creates their embed host app; commit fly.toml
  flyctl volumes create data --size 1
  flyctl deploy
  ```
  After that, `deploy-embed.mjs <html> <slug> <their-app>` (or `$SPLASH_EMBED_APP=<their-app>`) uploads
  directly to their app via `flyctl ssh sftp shell`. There is no shared default app name — each journalist
  hosts on their own account.

  **Auth:** `flyctl` reads credentials from either `flyctl auth login` (interactive, stored in `~/.fly/`)
  or a `FLY_API_TOKEN` in the environment (create with `flyctl tokens create deploy`). For a headless /
  automated run, put `FLY_API_TOKEN` (and `SPLASH_EMBED_APP`) in `.env` — Bun loads them into the
  environment and `flyctl` picks them up. See `.env.example`.

**Session close — after the handover.** Once the deliverable is handed over and the journalist signals
completion — a pure thanks/goodbye with no new request ("Merci, tout est en ordre", "That is everything,
thanks") — send AT MOST ONE brief closing message and treat the session as ENDED: no new questions, no
re-engagement, no repeated farewells, and no echoing further goodbyes back (trading "Parfait, à bientôt."
/ "À bientôt !" variants turn after turn is noise, not service). A message that carries ANY new request
alongside the thanks is NOT a close — handle the request instead.

## Gates

| Gate | Phase | Stop condition | Failure mode if skipped |
|------|-------|---------------|------------------------|
| 1 | CADRAGE | Journalist answers the ≤4 questions + branch explicitly chosen or confirmed back | Wrong format, misread intent |
| 1b | CADRAGE (+PROPOSITION per element) | Takeaway stated back and EXPLICITLY confirmed by the journalist — never inferred-and-skipped; asked openly on GUIDED, confirmed via confirm-back on DIRECT (both branches) — and recorded VERBATIM as `confirmedTakeaway` on every accepted proposal (5b; the spine's validation gate fails a proposal without it). On a multi-element article, ONE takeaway PER accepted element — never a shared combined string; each element's own claim is confirmed at PROPOSITION if CADRAGE only confirmed a combined framing | Visual carries an unconfirmed/guessed claim; title diverges from the journalist's intent (or silently drops one part of a multi-part takeaway); a combined takeaway stamped on several elements dilutes each title check |
| 2b | PROPOSITION | Journalist confirms prose-extracted data table (fires BEFORE Gate 2 for prose proposals) | Fabricated data attribution |
| 2 | PROPOSITION | Journalist accepts / edits / rejects each proposal | Wrong claim visualised |
| 2c | PROPOSITION | Source established: name + a specific traceable URL, or the honest prose fallback (genuine no-dataset case, or a hedged/uncertain source left unconfirmed — never a confident citation over « je crois »/« de mémoire »), for every accepted proposal | Weak/generic/name-only source ships, or admitted uncertainty ships dressed as a verified citation — caught only late (after a full produce→review cycle) by the render-review |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the ACTUAL render (re-run in full — 3a then 3b — after every re-produce, never reused from a prior render) | Visual quality not verified; a re-produced render ships on a stale sign-off |
| 4 | EXPORT | Video/static → give the media file directly; interactive/scrolly → relay the emitted three-form proposal and the journalist chooses ONE: code source (runnable `<id>-source/` React bundle — chart-native, map-native, scrolly) / HTML autonome (single self-contained file) / embed (hosted link) — `--form` only runs AFTER their answer; per element on a multi-element delivery (a grouped answer like « embed pour les deux » is accepted from the journalist, never presumed) | Wrong delivery format; or the proposal collapsed to a bare "Livré." with nothing handed over; or the form auto-decided — `--form` ran (« je finalise pour les deux ») with no journalist answer to the proposal |

The full scripted-guard inventory lives in `docs/splash/guardrails.md`.

## Never

- Never skip a gate.
- Never auto-progress from one phase to the next without the journalist's explicit response.
- Never produce a visual before the PROPOSITION / provenance OK (gates 2 and 2b) on the guided path.
- Never export before the render OK (gate 3).
- Never invent data or fabricate a dataset attribution. This covers EVERY required value the source does
  not state — not just a chart series, but a **coordinate (lon/lat), a date/year, a dimension label, or a
  number**. If a required value is absent from the article/data, splash has exactly three honest moves:
  **stop and ask the journalist**, run a **real deterministic step** (e.g. a geocoder for coordinates —
  an actual API lookup, never a recollection), or **decline that visual** / fall back to one the data can
  support. Synthesizing the value from the model's own knowledge — a metro station's coordinates, a year
  where the text only said "cette année"/"this year" — is fabrication, and it is never allowed even when
  the guess would "probably" be right. (Reinforced at the extraction boundary in
  `suggest-article/SKILL.md` and the coordinate boundary in `suggest-chart/SKILL.md`.)
- Never fold two distinct opportunities into one visual. Each `suggest-article` opportunity gets its OWN
  Gate-2 accept decision and its OWN `suggest-chart` routing call (PROPOSITION); stapling a second
  series/claim onto an already-routed chart silently drops that opportunity from the journalist's view
  and skips its routing — surface and route each one separately. The same per-element rule holds for the
  takeaway: never stamp one combined takeaway string onto several elements' `confirmedTakeaway` — each
  accepted element carries its OWN confirmed claim (Gate 1b), or the Gate-3a title check compares every
  title against a claim that partly belongs to another visual.
- Never offer the journalist a CADRAGE takeaway framing the supplied data cannot support (a temporal /
  "widening gap" framing on single-snapshot data, a per-capita framing on absolute counts). Constrain the
  offered options to the ANALYSE data shape; if the wanted framing needs data you don't have, say so and
  ask for it — never invent the series to justify the framing.
- Never conduct the dialogue in a language other than the journalist's (detect from first message).
- Never let the produced visual's furniture (title, intro, source label, scrolly captions) default to English — the detected language is threaded to suggest-article and suggest-chart so the OUTPUT matches the dialogue, not only the chat.
- Never re-decide what a sub-skill (suggest-article, suggest-chart, a producer) already decides — only sequence and gate. This means actually INVOKING `suggest-article` (ANALYSE) and `suggest-chart` (PROPOSITION routing) as real Skill calls, not hand-authoring their output from memory/inspection — their eval-hardened guardrails and KB grounding only fire when they genuinely run. This holds for the FIRST routing AND for any LATER change to the chosen element/format (a journalist request mid-flow, a fallback, a retry after a failed gate): re-invoke `suggest-chart` again with the new signal — never re-decide it yourself by grepping producer source and hand-authoring/`Write`-ing a `spec.json`; only `suggest-chart`'s own re-run re-validates the choice and re-applies its guardrails.
- Never name a chart type in the intent passed to suggest-article or suggest-chart (on the guided path).
- Never ship a visual without the mandatory render-review (Gate 3a) — `assertShippable` refuses a visual with no review record; the review's concerns are advisory but running it is not optional.
- Never call `gate-render` (Gate 3b) right after a re-produce (any re-run of 5c — a source fix, a fallback swap, a retry) without first re-running `review-gate` (Gate 3a) on the NEW render. `produce-all` always writes a WHOLLY FRESH `report.json` — every proposal in that run comes back unreviewed and unapproved (`renderApproved:false`), even one that was already signed off before the correction — so the review MUST run again on what actually changed. Do not treat the script's hard refusal ("not render-reviewed") as the safety net to rely on; redo Gate 3a → 3b in order every time, and never hand-edit `report.json` to restore a prior review/approval onto a new artifact. Likewise never hand-author a file into the producer's build subdir `exports/<slug>/<id>/` to give `gate-render` something to approve — its provenance check refuses any file the pipeline did not emit for the CURRENT produce generation; a hosted-DW interactive (no local render) is approved via a fresh capture under `exports/<slug>/_review-artifacts/<id>/`, never a stand-in file next to the producer outputs.
- Never CREATE or edit ANY product source file (anything under `skills/` — a producer/component `src/*.ts`/`.tsx`, a `scripts/*.mjs`, a reference) during a journalist run — splash ORCHESTRATES and GATES; it does not author engine code. A bug is REPORTED and routed around, never patched in place. The "feedback → système" convention is for development sessions, not a live newsroom flow. This holds with NO exception for making a produce/conformance gate pass: never edit a producer/component's source code (`skills/*/src`, any `.tsx`/`.ts` producer file) mid-PRODUCTION to turn a failing gate green — a real newsroom journalist cannot patch the engine, so splash must not either. If a produce or conformance gate fails because of a genuine engine bug (not a spec/data problem), SURFACE the bug to the journalist, do NOT ship that visual, and do NOT patch the code — the bug is reported, never worked around. **The "create" half is not hypothetical: never AUTHOR a NEW ad-hoc script** — a case-named `verify-<case>.mjs` written into a skill's `scripts/` to satisfy a gate is the same violation as editing existing code (an observed real case: a `skills/scrolly/scripts/verify-aging.mjs`, a script that does NOT exist in the product). splash runs ONLY the scripts the pipeline ships (`produce-all` / `review-gate` / `gate-render` / `export-code` and the producers' own snaps); a gate that needs a script the pipeline does not provide means the FLOW is wrong — STOP and surface, never write the missing script yourself. (The QA harness `check:product-source-hot-patch` flags any Edit/Write under a skill's `src/`/`scripts/`; the rule is the product contract, that check is the net.)
- Never hand-author or copy files into a producer's output directory (`exports/<slug>/<id>/` or any
  build subdir) to satisfy a gate. The file-based gates (`gate-render`, `assertDelivered`,
  `export-code.mjs`'s hosted-DW detection) read those directories as PRODUCTION'S OWN record — a
  hand-planted artifact (e.g. a `hosted-embed.html` written by hand so `gate-render` has a file to
  hash, an observed real case) poisons every downstream detection that keys off the directory's
  contents and forces manual mid-flow cleanup. If a gate needs an artifact that production did not
  emit, the FLOW is wrong upstream — re-produce properly (re-run 5c) or fix the gate invocation (point
  it at the file production actually emitted) — never fabricate the file the gate expects.
- Never work around a NON-ZERO produce/exit or a FAILING gate by any means — not by re-authoring code, not by hand-editing outputs, not by an ad-hoc script, not by silently retrying with hidden changes. A non-zero exit from `produce-all` (or any gate refusal) is a HARD STOP that is SURFACED to the journalist AS-IS, never quietly papered over so the run can continue. This is the exit-code analogue of the spec/code rules above: a conformance violation that surfaced, a `produce-all` that exited 1 during a legitimate re-produce (an observed real case — the failing exit was worked around instead of reported), a snap that failed — each is reported to the journalist and the visual does NOT ship, not massaged until the command returns 0. If the failure is a genuine spec/data problem, fix the spec through the proper gate (re-open GATE 2 for a changed spec, 5d) and re-run; if it is an engine bug, report it and route around — but the non-zero result itself is never hidden. (The QA harness `check:conformance-no-fabrication` flags a conformance violation or a produce exit=1 that the run continued past instead of surfacing.)
- Never do ad-hoc file operations (`mv`/`cp`/`mkdir`/`find`-and-move) to RELOCATE a mis-pathed artifact. If a script (or a manual capture) wrote to the wrong place, that is a BUG to surface and fix at the source — not to paper over by shuffling the file into the position a gate expects. The observed real case: a Gate-3 render capture landed under `skills/dw-chart/exports/…` because a bare relative `exports/…` path resolved against an earlier `cd skills/dw-chart`, and the run manually `mv`'d it into the sanctioned dir. The correct move is to RE-CAPTURE at the absolute run-scoped path (Gate 3b's provenance refusal names that absolute path, `src/render-provenance.ts`; the capture instruction now specifies it — see 3b), never to move a stray file into place. Relocating a mis-pathed artifact is the same class of improvisation as hand-planting one: it makes a gate pass on something production did not honestly put there.
- Never silently mutate the ACCEPTED SPEC (`baseColor`, format, etc.) mid-PRODUCTION to route around a conformance-gate failure — this is the spec analogue of the rule above ("never edit product code" → "never silently edit the accepted spec to bypass a gate"). A conformance failure is SURFACED to the journalist as-is; if the spec must change to fix it, GATE 2 is re-opened for re-acceptance of the changed spec. The produce-time conformance guards exist precisely so a non-conformant visual never ships unseen.
- Never hand over an INTERACTIVE/SCROLLY visual without running `export-code.mjs` (two-phase): phase 1 (no `--form`) EMITS the a/b/c proposal building NOTHING; phase 2 (`--form <html|code-source|embed>`) builds + delivers ONLY the chosen form, gated by `assertDelivered`. Never run phase 2 — for ANY element — before the journalist's message answering THAT delivery-form proposal exists: « la seule forme possible est c, je finalise (pour les deux) » is auto-deciding, the named violation. A single-offered-form (hosted-DW) proposal still waits for the journalist's confirmation; on a multi-element delivery the choice is per element (forms may differ), and a grouped answer (« embed pour les deux ») is only ever GIVEN by the journalist, never presumed by splash. Never build all forms unconditionally, and never fabricate a no-JS `static.html` fallback — that fallback is GONE (accessibility is the `static` FORMAT choice at CADRAGE). Never mark an interactive/scrolly delivered on produce-time outputs alone — a Gate-3 review PNG / `interactive.png` / a build byproduct is NOT a delivery; only the `export-code --form <chosen>` artifact is (enforced mechanically by `assertDelivered`). A hosted-DW interactive delivers ONLY via `--form embed` (its live `publicUrl`) — it has no React source and no standalone local html.
- Never spawn an Agent/Task sub-agent mid-flow — during the splash flow you ONLY sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (e.g. an agentId) into the journalist-facing conversation.
- Never ship a source that is name-only for a NAMED dataset/publication (e.g. "Eurostat") — it MUST carry both a label and a real, verifiable URL; never fabricate a URL to fill the field. (The honest prose fallback — "Figures as reported in this article" / the outlet's own name — is the legitimate name-only case: when the data names no separate dataset to link, or when the journalist's hedged recollection of a source stays unconfirmed, per Gate 2c's uncertainty rule.) Establish this proactively at Gate 2c (PROPOSITION), before PRODUCTION — never wait for the render-review to be the first thing that catches it, and never reach for the prose fallback just because the journalist has not answered yet. And never ship a flat, confident-looking citation over a source the journalist only HEDGED at (« je crois », « de mémoire ») — confirmed exactly, or the honest fallback (Gate 2c). A *fabricated* placeholder URL is worse than none and is now MECHANICALLY refused: the spine's validation gate (GUARD 2, `src/source-guard.ts`) rejects any source URL on a reserved placeholder domain (`example.com`/`.org`/`.net`, or the `.example`/`.test`/`.invalid`/`.localhost` TLDs, RFC 2606/6761) — the proposal fails to produce rather than shipping a fake citation.
- Never accept a generic organisation homepage (e.g. `eurostat.ec.europa.eu`, `insee.fr`) or an unverifiable/404 URL as the source — it must be treated exactly like a missing URL. The source MUST point to the SPECIFIC, traceable dataset/page the figures come from (the Eurostat dataset page for the exact table, the Insee series page, …). If the journalist only gives an organisation name or its homepage, ASK for the specific dataset/page reference rather than shipping the generic one (see Gate 2c) — in the SAME free-text turn, never as a separate follow-up question.
- Never ship a title that narrows or diverges from the takeaway the journalist confirmed at CADRAGE (Gate 1b) — e.g. a specific multiplier ("2x") standing in for a confirmed "widening gap" insight, a scope word ("Nordic") that excludes an entity the visual actually shows, or ONE HALF of a two-part takeaway standing in for the whole (the fall without the confirmed "only riser", a regrouping that contradicts the confirmed grouping). If the data supports more than the title states, widen the title or flag it at Gate 3. The confirmed wording lives VERBATIM in each proposal's `confirmedTakeaway` (5b) precisely so Gate 3a can quote it and check every part — a render-review that skips that quote is invalid (see 3a).
- Never silently substitute a value from a prior/stale export when it disagrees with the journalist's current article/data — the values used (and shown at Gate 2b) MUST always be the ones the journalist provided in the current session.
- Never offer the journalist an element/format (or sub-format) option before confirming — via `suggest-chart`'s reachability, not from memory — that it is actually producible. Retracting an offered option as infeasible forces the journalist to re-answer the same decision multiple times; check first, propose only what's confirmed.
- Never keep the conversation going after the journalist signs off. Once the deliverable is handed over and the journalist signals completion (a pure thanks/goodbye with no new request), send AT MOST ONE brief closing message and treat the session as ENDED — no new questions, no repeated farewells, no re-engagement, no echoing further goodbyes back.
