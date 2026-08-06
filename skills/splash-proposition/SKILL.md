---
name: splash-proposition
description: "Use as phase 4 of the splash flow: propose the visual element, its format and its producer, and pin exactly one of them behind the journalist's veto. Invoked by skills/splash at the PROPOSITION step, never directly by a journalist. Keywords proposition, gate 2, menu, candidates, pin format, veto, suggest-chart, suggest-article."
---

# splash-proposition — PROPOSITION — turn the framing into a pinned visual element. Gate 2.

### 4. PROPOSITION — GATE 2 (guided path only)

For each `suggest-article` opportunity, invoke `suggest-chart` **as a real Skill call** (the ACT
differs per host — see « How to invoke a nested skill » above; never
guess the element/format/producer yourself — that re-decides what a sub-skill already decides and
skips its KB-grounded guardrails). Since the canonical 12-step flow (2026-07-16) it answers in TWO
stages, and the presentation is BATCHED:

**Stage 1 — candidates, all opportunities, ONE batched message.** For every opportunity,
`suggest-chart` returns its reachable candidates — charts AND maps — each with its editorial
why ("why it can be interesting" for THIS claim), the first one recommended. Reachable = a
mapper exists × the data shape fits × every deterministic guardrail passes × the channel
(known since CADRAGE Q6) allows at least one of its formats — a barred candidate NEVER
appears. An engine that fails preflight (C2) is annotated, never hidden.

**A fifth language is refused HERE, at the offer — never later, at delivery.** A run whose
declared language has no furniture row (`isCoveredLang`, `lib/core/language-coverage.ts` — today
`en`/`fr`/`de`/`it`) returns ZERO candidates and one honest refusal naming the languages that ARE
covered, before a single candidate is even considered — never a chart that ships mixed (its
numbers in the run's language under a caption still reading the English "Source:"). Point the
journalist at `docs/splash/language-debt.md` if they want to see what closing that gap for their
language would actually take — it is a debt list, not a promise. **If `suggest-chart`
returns a single decision with NO candidates payload, re-invoke it ONCE demanding Stage 1
explicitly** (« return the candidates JSON first — every reachable type with its why ») — the
bounded-retry rules apply; never relay a take-it-or-leave-it decision to the journalist.
**Write the raw Stage-1 payload to `exports/<slug>/candidates.json` BEFORE presenting** —
one entry per opportunity, each candidate with `type`/`producer`/`tier`/`why` exactly as
suggest-chart returned them — including, per opportunity, either a narrative candidate — from the WHOLE family matched to
the story shape (chart-scrolly/chart-video for a temporal series, map-story/map-scrolly for a
geographic progression, image-scrolly for a prose-visual sequence) — or the explicit
`narrativeRuledOut` reason (suggest-chart's contract: silent narrative absence is not a valid
payload). The journalist never sees this JSON (the presentation below is
plain language); the file is the mechanical trace that the menu existed, and the resume point
if the session dies mid-PROPOSITION (see Context recovery). **`produce-all` ENFORCES this: it
resolves `candidates.json` beside `accepted.json` and REFUSES (fail-hard, per proposal) any
non-direct proposal whose PRODUCER is not named in the menu — or any run with no
`candidates.json` at all.** So the menu is a hard precondition of production, not a courtesy: a
spec for a producer the suggester never proposed cannot ship. (The gate is producer-level, not
type-level — a narrative candidate names a format like `chart-scrolly` while its spec names the
underlying `line`/`choropleth`, so a type-strict gate would false-block scrolly; off-menu TYPE
within an offered producer stays caught by the render review + GUARD 4/5.) The ONLY exemption is
the DIRECT branch (journalist NAMED the visual) — declare it with
`skillsInvoked: ["splash:cadrage-direct", …]` on that proposal (5b). Never satisfy the gate by
faking a candidate or a direct declaration.
**★ Each option says what it SHOWS that the others do not — never only what it is.** Observed on a
real run: two options, each described correctly (« nuage de points, 12 communes, km en x, €/m² en
y ») and neither saying why a journalist would pick it. A description is not a reason. The `why`
already travels on every candidate (§5b, `candidates.json`) and was simply not rendered — the same
shape as a placement the code emits and the prose drops. Give each option ONE clause of editorial
consequence, and make them comparable: « celui-ci montre que le prix décroche avec la distance ;
celui-là, que ce sont les communes les plus lointaines qui grossissent le plus vite. Le premier
explique, le second surprend. » A journalist choosing between two scatter plots described
identically is choosing at random.

**★ A narrative format is an option, not an afterthought.** When the material carries a sequence — a
before/after, a threshold crossed, a geography walked, a claim needing two steps to land — scrolly
and video belong in the list ON THE SAME FOOTING as the static and interactive ones: same one-clause
why, same visual weight. Do not bury them in a trailing sentence, and do not present three variants
of one static idea as if that were the whole space. `candidates.json` already carries either a
narrative candidate or an explicit `narrativeRuledOut` reason — `check:narrative-not-considered`
enforces that in the DATA. This rule is about the MESSAGE: the journalist must SEE the option the
data already knows about. If narrative was ruled out, say so in one clause with its reason rather
than silently listing only what remains.

Present ALL opportunities' candidate lists in ONE batched message — never a per-opportunity question loop
— and let the journalist answer per opportunity (pick a candidate, or « aucun » = veto; a
vetoed opportunity emits `no-chart` with the reason). Each kept opportunity remains its OWN
accept decision and its OWN `accepted.json` entry with its OWN confirmedTakeaway — the
batching is presentation, never a merged decision.

**Chosen candidate on a yellow engine → collect the key NOW (prerequisite before
production):** explain where to get it (the preflight `reason` carries the URL), take the
journalist's key in one free-text prompt, save it via `save-key.mjs`, re-run
`preflight.mjs` and confirm green — then produce. A `red` engine (deps not installed) is not
key-fixable: surface the `bun install` instruction and stop for that element (stall-protocol
options apply). Never start PRODUCTION on a non-green engine.

**Stage 2 — one spec per kept opportunity.** For each choice, `suggest-chart` emits the full
validated spec. The format is **derived from channel × type** (social ⇒ static or video at
the channel's size; article-web ⇒ interactive by default) and announced for veto in the same
breath, WITH its size — « un chart colonnes INTERACTIF, responsive, calé sur ton canal
article web — on part là-dessus ou tu le veux en image ? » · « une image PORTRAIT (9:16)
pour ta Story — ok ? ». An explicit journalist format signal (« une image
statique », « pour le print ») WINS over the default. The accepted spec pins exactly ONE
`format`; `assertFormatAllowed(channel, format)` re-checks it at produce time, unchanged.

`suggest-chart` pins exactly ONE `VisualFormat` from `allowedFormats(channel)` (never the whole set);
`interactiveDefault` (`skills/splash/src/channel.ts`) only steers the article-web default. The journalist
may change it, but to another single member of the channel's allowed set. Q6 set only the ALLOWED SET, so
this Stage-2 announce is the FIRST and ONLY place the single format is surfaced — channel and format never
double-ask. **Hard rule:** a non-article/embed channel lands on image or video only, never
interactive/scrolly; point back to the Q6 pick rather than escalating.

**★ Colour/palette — name the subject-encoding HERE, for the same veto.** When the emitted spec
carries a **subject-motivated** palette — an auto subject-fit ramp (no house profile), or a colour
chosen to ENCODE the subject (sequential for magnitude, a diverging scale around a midpoint, a domain
hue) — announce the palette AND *why it fits the subject* in the same breath as the format, so the
journalist consciously confirms the colour reads right for the topic (« je code l'intensité en vert
séquentiel — ça te va ? » · « une échelle divergente rouge↔bleu centrée sur zéro »). This makes
palette-fit — the one axis no code can judge (green≠politically-loaded, sequential-for-ordered-data, no
rainbow) — a NAMED, vetoable editorial confirm, not a silent default. **No call-out for a default
CVD-safe categorical palette or a confirmed house palette** — they carry no subject claim (the house
palette is already veto'd at profile-merge; a categorical set encodes identity, not a subject scale).
The semantic *correctness* of the fit stays the journalist's call (and a Gate-3a render-review concern);
this rule only guarantees the choice is surfaced, never buried.

**Narrative sub-format — who picks it reuses the CADRAGE branch:**
- **interactive** → the sub-format is **explore-libre** (pan/zoom/hover) vs **scrolly** (sequential).
- **video** → the sub-format is the camera/reveal mode (reveal-simple, guided-tour, zoom-out, pan,
  line-reveal, ranked-bars… — per producer).
- **GUIDED** → the AI PICKS the sub-format (grounded in the routing, announced above, vetoable) — do not
  make the journalist choose a reveal style blind.
- **DIRECT** → the journalist NAMES the sub-format themselves, but only once it is checked reachable via
  `suggest-chart` (see "Only offer what is confirmed producible" below) — never offer a named sub-format
  that turns out not to be producible.

**Story-warrant check (mechanical, before proposing scrolly/video).** When the routed candidate would
be a chart scrolly or chart-video, CONSULT `assessStoryArc` (`skills/splash/src/story-warrant.ts` — a
design heuristic, not credited literature: no source cited here claims "some data shapes don't deserve
an arc" — Segel & Heer (2010, "Narrative Visualization", IEEE TVCG 16(6):1139-1148, the author↔reader
axis), McKenna et al. (2017, "Visual Narrative Flow", Computer Graphics Forum 36(3):377-387), and Kosara
& Mackinlay (2013, "Storytelling: The Next Step for Visualization", IEEE Computer 46(5):44-50) are
adjacent design context that INFORMED this heuristic, never its authority) on the series; if it returns
`hasArc:false`, PROPOSE the static annotated chart instead and say why (its `reason`) — the journalist
may veto back to the scrolly/video.
**Flagged fallback — say this at the same moment.** Absent a journalist-confirmed claim-arc (Gate 1b
above), a chart-scrolly/chart-video still ships — it falls back to the salience auto-pick
(`narrativeFallbackWarning`, `skills/chart-native/src/chart-story.ts`) — but that fallback is never
silent: it surfaces as an advisory concern at the render-review (Gate 3a, below), read as "this
narrative is auto-generated by salience, not confirmed as an argument". An un-confirmed, auto-picked
narrative is not blocked — it is flagged. Confirm a claim-arc at Gate 1b to turn a sequence of salient
points into an actual argument.

**Chart-scrolly BEAT MODEL — announce it honestly HERE, and carry a confirmed plan into the spec.**
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
- **★ Claim-arc `role` (line/bar, since S2):** a controllable beat may ALSO carry a `role`
  (`establish`/`build`/`turn`/`payoff`) alongside its anchor + caption — see the widened Gate 1b above for
  how the plan is proposed/confirmed. A beat WITHOUT a `role` still works exactly as before (anchor +
  caption only, byte-identical legacy path) — `role` is additive, never required to ship a scrolly.
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
- **Map scrolly** named-step control is `arcBeats`, NOT this track's `beats` field — a chart-native
  `beats` field submitted on a map spec is still mechanically rejected (see the region-anchored
  claim-arc at Gate 1b, above): every map-native type accepts a confirmed `arcBeats` plan
  (`establish → build+ → [turn] → payoff`, same confirm/tweak/veto) at validation — but **`route` is
  the one exception with nowhere for it to land**: its scrolly is refused at the gate outright (no
  `MAP_SCROLLY_TYPES` branch — see the claim-arc rule above), so an `arcBeats` plan on a route never
  reaches a scrolly reader. For the other six — choropleth/symbol/locator/cartogram/dot-density/
  hex-grid — point the journalist at `arcBeats` here; never tell them a map story has no named-step
  control — that limitation no longer exists for THEM.

**Article/web has NO static fallback — the pinned format is the ONLY artifact, so pin the one the
journalist actually wants.** For the article-web channel, `suggest-chart` routing DEFAULTS to interactive
(`interactiveDefault`, `skills/splash/src/channel.ts`) — it wins ONLY absent a concrete reason otherwise.
That default is NOT a mandate: an explicit journalist format signal ("a static image", "a static chart",
"just an image", "pour le print") WINS over it — pin `static`, never interactive. **Print is the
strongest such signal**: when the STATED destination is print (the journalist answered (c) at CADRAGE
Q6 NAMING the print destination — print is a sub-case of that channel, the pick alone does not imply
it — or says the piece is print-bound at any point), pin `static` — a printed page cannot run
an interactive or a video, so `interactiveDefault` never applies to it. Since the single-format
redesign there is NO auto no-JS `static.html` produced alongside an interactive (a11y = choosing the
`static` FORMAT, see §6 and the export guardrail below) — whichever ONE format is pinned is the ONLY
artifact the journalist gets, so a wrong default is NOT backstopped by a byproduct. Announce that pinned
`{format}` explicitly for veto (Gate 2, above) — never silently default to interactive and jump straight
to production as if a static image still tagged along.

**One opportunity = one accept decision = one `suggest-chart` call.** Each DISTINCT `suggest-article`
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

**Preflight annotation (C2).** Before presenting engines/types, run
`bun skills/splash/scripts/preflight.mjs`; a not-ready engine is **annotated, never silently omitted**
(the journalist picks it and fixes the key, or picks a ready alternative). The produce-time gate re-checks
mechanically — this annotation is honesty, not the enforcement (`docs/splash/guardrails.md`).

**Data truth was established at CADRAGE (Gates 2b/2c — Q3/Q4), BEFORE this routing.** The prose
table (2b) and the source (2c) are NOT re-asked here. If — exceptionally — an accepted element's
figures turn out to rest on prose the journalist never confirmed, `produce-all` refuses it
(`needs-confirmation`, 5d): go back to the CADRAGE Q3 rules, confirm the table as its OWN question
(never bundled with the visual accept), set `confirmedTable: true`, and re-run. The resolved 2c
source (one of the three states — name+URL verbatim, named org name-only, or the honest prose
fallback) goes onto every accepted proposal's spec at 5b, with `suggest-article`'s `sourceHint`
copied verbatim alongside it.

**★ PHRASING CONTRACT — when the offer comes from the proposal brain (`lib/brain`).** The brain
hands over an offer as **data**, never as prose: each option carries `id` · `engine` · `format` ·
`intent` · `whySource` (the sheet's own `bestFor`/`notFor` fragments + the computed facts) · and,
when something stands in the way, `readiness: { status, reason }`. Alongside it comes `excluded` —
every discarded form with the reason it was discarded. **The code decides; the model only writes.**

**An explicit journalist format signal wins here too — but only if it is RECORDED.** Write it to
the element's `requestedFormat` on the run manifest BEFORE `propose()` builds the offer: the brain
then filters the whole offer down to it and names a refusal if the channel does not carry it — an
unrecorded signal is a signal the offer never sees. (This pipeline is the one with a run manifest
to write it onto; Stage 2's `suggest-chart` above has none — its own format announcement is pinned
straight onto that spec instead.)

Five rules, all mechanical:

1. **`why` is rendered, not inherited.** A brain-built option arrives with `why: ""` — deliberately
   empty, because `whySource.fragments` are the KB's ENGLISH sentences and the journalist reads
   French, German or Italian. Write each `why` in the journalist's language **from that option's
   `whySource` only** (its fragments and its facts) — no other source, no number that is not in
   `whySource.facts` / `fragments` / `readiness.reason`. Never show, and never persist, an option
   whose `why` is still empty.
2. **`verifyOffer(phrased, offer)` runs BEFORE the offer is shown — it is not optional** (spec §7).
   It throws on an id that was not offered, a discarded id presented as offered, and on ANY change
   to the list or its order (dropping an option — including dropping them all — is a silent removal
   and fails exactly like reordering). Go through `applyPhrasing()` (`lib/loop/phrase.ts`): it is
   the one path that calls the guard and then writes the `why` back onto the manifest. From a host
   that is not JavaScript, that path is `phrase --run <dir> < phrasing.json`.
   **This is no longer only a contract in prose:** `nextActions` answers `phrase` while any offered
   `why` is still empty, and `assertInvariants` refuses to WRITE a manifest whose chosen option
   carries a blank one. "Never persist an option whose `why` is still empty" is now enforced by the
   manifest itself.
3. **A marked option is presented marked.** Set `markAcknowledged: true` on the phrasing of every
   option carrying a `readiness` (the guard refuses the phrasing otherwise, and equally refuses the
   flag on an unmarked option), **and print `readiness.reason` beside that option's `why`** — the
   mark's own words are emitted by the code, never left to the model to restate. The guard checks
   the acknowledgement STRUCTURALLY; it cannot verify meaning across languages, so printing the
   reason is what makes the disclosure real.
4. **A marked form is still offered — and it is never chosen silently.** Marks come from three
   places: a capability the newsroom has not turned on, an INPUT the run has not declared (an
   image scrolly walks the journalist's own photographs), and an engine production cannot build
   yet (`lib/loop/buildable.ts`). All three MARK, none removes. There used to be a fourth — "the
   whole-article branch, not built yet" — on every scrolly; it is gone, because a scrolly is an
   embeddable element like any other (one self-contained HTML file, the embed genre, the same
   publishers and the same iframe snippet an interactive gets), proven end to end in
   `lib/loop/scrolly-e2e.test.ts`. A mark WARNS, it does not forbid: the journalist may pick a
   marked form and the choice stands. The one exception is a form nothing can build —
   `chooseForm` refuses it in the words the offer displayed, and the loop routes back to the
   choice rather than looping on a refusal. Say so plainly and offer the ranked alternatives again.
5. **Une limite DÉCLARÉE est imprimée, pas résumée.** Une option peut porter `limits` : ce que la
   forme, une fois construite, **ne fera pas** (« cette carte interactive ne sera pas navigable au
   clavier »). Ce n'est pas une marque de readiness — la forme est constructible, elle est classée
   normalement, et elle reste choisissable. Poser `limitsAcknowledged: true` sur le phrasage de
   chaque option qui en porte une (le garde refuse le phrasage sinon, et refuse également le
   drapeau sur une option qui n'en porte aucune), et **imprimer chaque phrase de `limits` à côté
   du `why`** — les mots sont émis par le code, jamais restitués par le modèle.

**★ THE DECISIONS ARE MECHANICAL — never hand-edit `run.json`.** A decision the journalist makes
is written by CODE, with its own refusals, exactly like the offer is built by code. Editing the
manifest to record a choice produces state nothing validated, in a loop whose every guard assumes
the opposite — and it is the last place where the flow was prose instead of a mechanism.

**Including the run's own creation.** This rule used to name a path that did not exist: nothing
created a run, so hand-editing was the only way to get one. `initRun` closes that, and every row
below is now reachable from a host that is not JavaScript.

| The act | The mechanism | Refuses |
|---|---|---|
| starting the run | `initRun(runDir, declaration)` (`lib/loop/init.ts`) — host: `init --run <dir> < declaration.json` | a declaration carrying anything a command must EARN (`angle`, `proposal`, `artifact`, `delivery`, `orient`, `events` — refused **by name**) · a directory that already holds a run · an input path that does not exist · **a data input whose source is not declared** (`sources.data` is written once, HERE — no later step can add it, so a run begun without it is stuck at produce for good; the refusal carries the question to put to the journalist) · a source ledger the policy rejects (checked before a byte is written) · a declared geography path that does not exist or is not a file · a declared geography file that is not valid JSON · a declared geography file that is not a GeoJSON geometry or FeatureCollection object · **a declared geography file whose coordinates fall outside its declared CRS's valid range** (`lib/geo/crs.ts`'s `coordinateRangeVerdict`, checked before a byte is frozen — a projected CRS mistaken for WGS84, the most journalist-visible of the four geography refusals) |
| the confirmed angle | `confirmAngle(el, parts)` (`lib/loop/angle.ts`) — host: `confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s> --intent <id> [--emphasis <s>]` | a blank takeaway (it becomes the title) · a blank alt text (WCAG 1.1.1 — the producers fail hard on it) · a blank unit · a blank or out-of-vocabulary intent (one of nine closed values — put the question to the journalist first with `suggest-intent --takeaway <s>`, never present the raw id). Five NAMED slots, never a field the caller designates: that is what keeps it from being a "write any prose anywhere" command |
| writing the offer's prose | `applyPhrasing(run, elId, phrased)` (`lib/loop/phrase.ts`) — host: `phrase --run <dir> < phrasing.json` | see the phrasing contract above — ids, count, exact order, discards, marks, every number grounded, and a blank `why` |
| which form gets built | `chooseForm(el, id)` (`lib/loop/choose.ts`) — host: `choose-form --run <dir> --option <id>` | an id that is not in the offer (naming the ones that are) · an empty offer (carrying the brain's own refusal) · a form nothing can build |
| where it goes | `requestDelivery(run, el, decor, opts)` (`lib/loop/request-delivery.ts`) — host: `request-delivery --run <dir> [--to <id,id>]` | nothing produced yet · a stale artifact · a destination this install does not know |
| shipping it | `approve(run, el, runDir, ceremony, policy)` (`lib/loop/approve.ts`) — host: `approve --run <dir> [< ceremony.json]` | an artifact nobody CAPTURED, REVIEWED or was SHOWN · a blocking finding still open without a valid override · a warning nobody acknowledged · an override with no reason or no actor, or naming a finding the review does not carry · under `requiredSigners`, a missing/foreign/invalid Ed25519 signature over the artifact's exact bytes |

**The unit is stated ONCE, in the subtitle — never repeated onto every value label.** A standalone
static/interactive/video chart-native render states it once, right above the plot
(`BarChart.tsx:98-101`, the pattern every chart-native component's `subtitle={config.unit}`
repeats); the one exception is a scrolly-embedded chart, whose walked bar's DIRECT value label
must read complete on its own with nobody having scrolled past the subtitle, so it appends a
short unit there instead (same file). The rule holds for a Datawrapper chart too, despite
`ChartSpec` having no `unit` field of its own: the assembler states it once in the printed
subtitle, and never lets a subtitle the journalist already wrote swallow it silently — matched on
a real token boundary, not a raw substring, so a single-letter unit ("m", "t", "h", "g") is not
lost inside an unrelated word (`lib/loop/assemble/dw-chart.ts`). A map has no subtitle slot for
it: the unit travels WITH the values themselves, via `valueUnit` (every map-native branch), with
the choropleth additionally emitting a distinct `unit` for its own legend-header reader.

Then the deterministic steps run themselves: `advance()` (`lib/loop/driver.ts`), or
`advance --run <dir>` from a host that is not JavaScript. Deciding and sending are TWO acts —
`request-delivery` records where it goes, `advance` publishes it — so a missing credential never
erases what the journalist decided.

**★ THE GATE IS MECHANICAL TOO — "show the render" is no longer prose.** Gate 3's rule (below)
is that nobody is asked to approve a visual they have not seen, and in the V1 flow that rule
lives in this document, which is what made it skippable (issue #3). In the V2 loop it is a
STATE: between `produce` and `deliver`, `nextActions` routes through **capture → review →
preview → approve**, each one a step `advance` performs, and `deliver()` refuses an artifact
that carries no approval covering its exact provenance.

| The step | What it does | What it refuses to let pass |
|---|---|---|
| `capture` | opens the REAL deliverable at the container it publishes into (the newsroom's embed box, else the channel's own size) and measures the component, its furniture and its colours — at the article width plus the narrow/wide edges for a responsive one | furniture that is missing, hidden, or outside the frame; a component that overflows its container; an image that is not the size its destination publishes at; a still taken for another destination |
| `review` | turns those measurements into findings whose severity comes from ONE central table, records the reviewer's mode and hashes, and routes the axes no machine can settle into a verdict-free `tasteRisk` lane | a severity chosen by whoever found the defect; a claim of independence nobody earned (`independentSemanticReview` reads `unavailable`, never `pass`) |
| `preview` | resolves the deliverable FROM THE MANIFEST, re-hashes it, and presents it — recording which bytes were shown and how | a png standing in for an interactive; stale bytes; a printed path with no reason why no viewer opened |
| `approve` | the journalist's decision, written by `approveElement` — the only sanctioned writer of `approved` — plus a sign-off document beside the run | everything in the row above, and publication itself: `deliver` has no path around it |

**The Ed25519 sign-off is not a second approval.** `approved` says WHAT was approved; the
signature says WHO. With `requiredSigners` in `NEWSROOM-PROFILE.md`, an approval cannot be
written without a verified signature over the artifact's bytes, and it travels inside the
sign-off document `approved.signoffPath` names — the editor still signs with
`scripts/sign-artifact.mjs`, unchanged. **Publishing never goes through `verb publish`**: that path
skips the sign-off, the provenance-freshness check, the profile-derived metadata, the readiness
and the genre legality, and the façade refuses it for that reason.

**Nor does rendering, when the credit matters.** `verb render` IS callable — it is a first-class
façade capability — but it validates no `spec.source`: the contract holds the spec opaque, so the
credit inside it is whatever the caller typed. The façade's answer therefore carries
`sourcePolicy: { checked: false }`, so such an artifact cannot pass for a policy-checked one. It
also carries no provenance, so it can never be published through Splash. To render under the
source policy, create a run and let `produce` take the credit from the declared ledger.

Only accepted proposals continue.

#### ★ A NARRATIVE FORM OWES A WALK — propose it here, before producing

A **scrolly** or a **narrative video** does not merely state the takeaway: it proves it step by
step. So the moment one is pinned, the step plan is owed, and this is where it is proposed — not
discovered later by a refusal.

**Propose, do not write.** The machine's job is to MATCH and to ORDER, never to author:

- **The steps and their order.** Which anchor each one sits on — a category, a point on the axis,
  a region — and in the order the ARTICLE argues, not the order the data ranks.
- **A sentence per step, drawn from the passage of the journalist's own article that speaks to
  that anchor**, reformulated to stand alone. Never invented, never derived from the data alone.
  Show the passage beside the sentence so they can check it against their own prose.
- **What the article does not supply is ASKED, never filled in.** If no passage speaks to an
  anchor the data makes salient, say so and offer to drop the step or hear what it should say.

The journalist **corrects, reorders, deletes, or sends it back to the automatic selection**. What
ships is what they confirmed, pinned verbatim.

**This is enforced, not advisory.** `validateAccepted` refuses a narrative form whose spec carries
no confirmed walk (`skills/splash/src/narrative-walk-gate.ts`), before any engine runs — a step
whose claim is unwritten is not publishable. The refusal names the act that resolves it, but
meeting it means the proposal was skipped: propose the walk here.

**★ NEVER TELL A JOURNALIST A FORM CANNOT CARRY THEIR WORDS WITHOUT ASKING.** One command
answers it, and its answer is the registry's, not yours:

```
bun lib/host/cli.ts can-carry-walk --producer <p> --type <t> --format <f> [--camera-mode <m>]
```

**A map video is not one thing** — pass its `cameraMode`. The **guided tour** and the **stepped**
kind narrate: their families paint each beat's sentence. The **reveal** (`simple`, and a route's
`route-reveal`) shows no words at all, by design — the camera holds and the data animates. A walk
still orders what appears when, but nothing of it is read, so none is owed. If the journalist's
sentences are meant to be seen, that is a reason to choose the guided tour, and to say so.

Run it BEFORE saying a narrative form is impossible, and quote what it returns — `why` is written
to be said to a journalist as-is. This is not advisory. On 2026-08-06 a journalist was told his
bar video could not carry his two sentences, **nine minutes after the merge that made it carry
them**, with this very page loaded. Prose stating the capability was not enough: an incapacity was
asserted and never checked. And a refusal is CREDIBLE — he had no reason to argue, so the
capability would have died unnoticed.

A guard cannot catch this: a guard refuses what is ATTEMPTED, and nothing is attempted when the
form is talked out of existence first. Asking is the only mechanism that turns "I don't think I
can" into "the registry says I cannot".
