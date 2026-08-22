---
name: storyboard
description: Use to run the STORYBOARD phase of the doctrine twin — the editorial exchange, platform-neutral treatment selection, and conditional custom-or-Datawrapper choice that close Gate 2 by writing STORYBOARD.md, never by conversation alone.
---

# storyboard — the editorial contract, closed into a file

## Stop at every human gate

At every human gate, present the decision and recommendation, then **end the turn**. Do not
continue, self-approve, or treat silence as approval. At G2b, use the confirmed medium to recommend
one reachable publication format, show the alternatives, ask which format Splash should produce
first, and end the turn. Only the user's next message may supply `format:`. Before that reply, do
not run the reference loop, choose a palette or treatment, write `reachable: yes`, or dispatch a
producer.

When Goose can render the Splash app, Storyboard mode may show that same gate through the shared
chooser. `recommendVisualChoice` ranks only the currently reachable U7 options against confirmed
Storyboard fields and the frozen profile, names unresolved requirements and transparent ties, and
never writes. The journalist still presses the separate app-only Confirm; focus, recommendation,
silence, timeout, dismissal, or a model message does not supply the answer. Without app-only tools,
use the textual gate above.

After a chart treatment is chosen, consult `references/datawrapper-chart-types.json` through
`scripts/producer-gate.mjs`. If that treatment has a faithful Datawrapper implementation in the
chosen format, present the custom-or-Datawrapper choice and end the turn again. Never ask this
before treatment selection, and never ask it for an unmapped treatment.

## Overview

Runs the STORYBOARD phase: the ten-movement editorial exchange (`references/exchange.md`) that
turns an article's claims into an ordered list of **slots**, each carrying **one to n candidate
treatments**, one of them **chosen**. This skill **proposes — it does not interrogate.** It gives
back what it read, asks one question at a time, always with a recommendation attached — on the
hand-of-the-journalist questions as much as on the slots, so an "I don't know" is met with a
proposal to accept, adjust or reject, never silently logged as a blank — and never fills a field the
journalist should have filled themselves. `scripts/storyboard.mjs` is the
machine half of the contract: `parseStoryboard` reads the `STORYBOARD.md` a conversation produced,
and `checkStoryboard` says whether Gate 2 has actually closed — a proposal the journalist never
answered does not close it, no matter how the conversation reads.

Persist a provisional slot before G2a with `id` and the confirmed claim in `proves`. Complete
G2a → G2b → G2c for the first incomplete slot in array order before asking about the next slot.
After candidate selection, resolve the conditional G2-producer gate for that slot before Gate 2
closes.
Use `scripts/storyboard.mjs`'s atomic writer for every creation or mutation of `STORYBOARD.md`;
never rewrite the file ad hoc.

The slots-with-candidates shape is why "the journalist wants one visual" and "the journalist wants
a sequence" are the same object: one slot with three candidates (the same takeaway as a trajectory,
as a comparison, as a map) is the first case; N slots with one candidate each, ordered, is the
second. Gate 2 always asks the same question per slot — *which one do you keep, or do you drop the
slot?* — regardless of which case it is.

**Nothing is produced outside the storyboard.** Production (the next phase) reads chosen
candidates from a closed `STORYBOARD.md`; it does not invent a beat that was never proposed and
never confirmed.

`scripts/ground-claim.mjs`'s `groundTakeaway` is the second half of the machine contract: the
confirmed takeaway is a claim about the frozen data, and nothing upstream of this skill ever
checks it against that data. A takeaway can be false about its own numbers — an earlier trial
produced one that claimed a year was the lowest since a given year
while the fetched series showed the opposite — and nothing in the toolkit caught it until this.
`checkStoryboard` surfaces a claim the data actively contradicts as a gate error; a claim it
cannot check comes back `unverifiable`, which is not an error — it is information the journalist
should see, never silently upgraded to "supported."

## When to use

- At the FRAMING→STORYBOARD handoff, once `whereIs` (Task 3, `skills/splash/scripts/where.mjs`)
  reports the phase as `storyboard` — source is frozen, but `STORYBOARD.md` is missing or its
  takeaway is not yet confirmed.
- To validate a `STORYBOARD.md` a conversation just wrote, before treating Gate 2 as closed —
  always run `checkStoryboard` on the parsed front matter; never assume the exchange succeeded
  because the conversation felt complete.
- **Not** for production. This skill's whole output is the file; it never renders a beat.

## The one gotcha that will waste your day (read first)

**A "confirmed" takeaway and a `truthy` takeaway are not the same thing, and the two gates in
this codebase must agree on which one they mean.** `where.mjs`'s `isMissingScalar` refuses
the bare YAML sentinels `null` and `~` as well as an empty string — a `takeaway: null` line reports
`phase: "storyboard"`, gate still open. A naive front-matter scalar reader that just trims and
strips quotes turns `null` into the **non-empty string `"null"`**, which is truthy — `checkStoryboard`
would then say Gate 2 is closed while `whereIs` still says it isn't. `scripts/storyboard.mjs`'s
`scalar()` resolves the bare `null`/`~` tokens to a real `null` *before* `checkStoryboard` ever sees
them, specifically so the two gates cannot diverge. If you touch `scalar()`, keep that resolution —
and if you touch `where.mjs`'s sentinel list, mirror the change here.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Survey | `references/type-survey.md` | Every visual type this toolchain holds a sheet for — 32 chart, 8 map — each with its own opening sentence verbatim, the same sheet's own "when NOT to reach for it" sentence verbatim, any count that refusal states in a machine-readable form, the type it says it already IS, and the formats proven on disk for it. **Generated** by `twin/scripts/type-survey.mjs` from the two `references/types/` directories and `matrix.mjs`'s own beat reader; drift-checked by `test/type-survey.test.ts` |
| Choice guide | `references/chart-choice.md` | Splash's advisory intent rankings. Hard data requirements remove types before rank; editorial fit precedes reachability; a lower-ranked choice remains available when its candidate reason explains why the higher surviving form lost. `test/chart-choice.test.ts` keeps every local type sheet represented and every ranking consecutive |
| Doctrine | `references/exchange.md` | The ten movements of the editorial exchange **in the order they must happen** (restitution · takeaway **and its grounding** · the hand · the survey · medium · format · size · the reference loop · palette · proposal and brief), the hand-of-the-journalist questions with their medium-neutral destinations, and the discipline list — what a conversation running this phase must actually do |
| Reader + gate | `scripts/storyboard.mjs` | `parseStoryboard(text)` splits front matter from prose; `checkStoryboard(meta)` — **one argument** — returns the list of reasons Gate 2 has not closed (empty means it has), reading only RECORDED scalars. `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` are exported so the parity test can drive off them |
| Claim grounding | `scripts/ground-claim.mjs` | `groundTakeaway(takeaway, profile, { csv })` checks the confirmed takeaway's own numbers, comparisons and superlatives against the frozen data profile — and against the frozen `source/data.csv` itself, which is where ROW-level facts come from, since no `profile.json` in this tree carries rows. A number equal to a column's `sum` (a part-to-whole total) is `supported`, **read together with the comparator that governs it** ("more than 100" against a column summing to exactly 100 is `contradicted`, not confirmed); the frozen `rowCount` and a column's `missing` count are numerals' homes too; a number merely inside the range of the column **its own sentence names** is **`consistent`** — placed, not confirmed, and the detail says when it is exactly that column's min or max or is held verbatim in a row; a number it can place neither way is `unverifiable`, naming the column it was put to and the range it missed, never `contradicted`. A stated multiplier ("1.12 million") is read as a second reading beside the numeral as written, and a comma-grouped numeral the token reader calls ambiguous is settled by the frozen table when exactly one of its two readings is a number that table holds. Not a fact-checker, not a conformance engine, one narrow class of error |
| Reachability | `scripts/format-catalog.mjs` | `FORMAT_CATALOG`, keyed on the **medium/format PAIR**, and `formatGap(medium, format)` — whether this kind of beat, in this format, has both a producer and a delivery path. `formatsFor(medium)` is what the format gate (G2b) may offer. `image/web` and `image/video` are absent on purpose: no producer exists, and an absent row is what the journalist is told at the gate rather than at the last phase |
| Format gate prompt | `scripts/format-gate.mjs` | `formatPublicationFormatGate({recommended, rationale, options, treatment})` renders the complete G2b assistant turn from the reachability rows. Its output is the last action in the turn; never append a later movement. `treatment` is optional and is the reachability answer ONE LEVEL BELOW the pair: `treatmentFormatGap(treatment, format)` withdraws a format whose TREATMENT this toolchain has no producer for, even where the medium/format pair itself is entirely reachable. **The population is DERIVED, never typed**: `PRODUCER_TREATMENT_REACH` declares what a producing skill holds machinery for, in that skill's own words (today only `map/web`, whose SKILL.md says it draws proportional symbols, choropleths, dot density, hex grids and locators and holds no flow path), and every treatment of that medium outside the declaration is a gap — `TREATMENT_FORMAT_GAPS` is that subtraction, and a new type sheet is a gap until a producer claims it. It carried ONE cell while it was typed by hand; subtraction finds three (cartogram, contour/isoline and flow map, all on the web). A pair with no declaration draws whatever the beat needs, which is every chart producer and `map-beat` |
| Producer catalogue and gate | `references/datawrapper-chart-types.json`; `scripts/producer-gate.mjs` | Complete upstream `VisualizationType` inventory at its recorded source revision, conservative mappings from Splash treatments, the conditional custom-or-Datawrapper question, and validation of persisted `producer`/`datawrapperType` fields |
| Proposal | `scripts/propose.mjs` | **Where the four verdicts are actually called.** `resolveGrounding` runs `groundTakeaway` at G1 and collapses its ARRAY of claim verdicts into the one `grounding:` scalar (`groundingScalar` refuses to close on `contradicted` without the journalist's own override reason); `proposeMediums` / `proposeFormats` / `proposeSizes` compute what may be offered at ⑤ / ⑥ / ⑦, each row carrying its refusal; `confirmFormatReachable` is the ONE function that returns the `"yes"` a slot's `reachable:` records, and only after `formatGap` and `capabilityGap` both return `null`; `assertDistinctWays` refuses a candidate set that is one idea wearing three labels; `formatCandidates` renders the textual menu; `recommendVisualChoice` adds a deterministic, revision-bound advisory order for the graphical view without treating proof coverage as fit or confirmation |
| Capability gate | `scripts/capability-gap.mjs` | `capabilityGap(capabilities, medium)` says whether a chosen slot's medium is one the environment can actually honour — a **carried copy** of `splash`'s own function (see Files below), not an import |

## How it works (the shape)

1. **Restitution → the exchange runs** (`references/exchange.md`, movements ①–⑩): the claims read
   back, the confirmed takeaway **and its grounding at G1**, the journalist's hand (each question
   landing somewhere named, and no destination presuming a medium), the survey of every type this
   data could support and the advisory intent ranking in `references/chart-choice.md`, then the
   three sub-gates in order — **medium (G2a), format (G2b), size
   (G2c)** — the reference loop, the palette, the slots-and-candidates proposal, the conditional
   producer choice, and the beat brief.
   The order is the argument: each movement depends on the one before it. This is prose conducted
   in conversation — this skill's reference is what governs it, not code.
2. **The exchange writes `STORYBOARD.md`**: YAML front matter (`takeaway`, the hand-of-the-journalist
   fields, the two recorded verdicts `grounding` and `reference`, `language`, and
   `slots: [{id, proves, medium, format, size, reachable, candidates, chosen, producer,
   datawrapperType}, ...]`) above the prose
   the journalist actually reads.

   **`language` is the story's own, as a code** (`fr`, `de-CH`) — ruling R4: it follows the ARTICLE
   rather than the newsroom's configuration, and is confirmed with the journalist against the
   languages `NEWSROOM.md` records. It is written down because the exchange is not the last thing
   the journalist reads: `deliver` writes `HANDOVER.md` and makes the closing offer in it, by
   READING this field. A hand-over came out in English on a French story for want of it.

   **And Gate 2 now REQUIRES it** (round-four finding 9). This paragraph was here, and the field was
   required by `deliver` and checked by neither gate — `grep -n "language"` over both gate files
   returned nothing — so a story could pass every gate and meet the question at the delivery call,
   after the storyboard, the palette, the component, the render and the approval were all done.
   `stories/milan-cortina-la-glace-des-sponsors` is that story in this tree: French throughout,
   gate-2 verdict `[]`, hand-over refused. The gate checks that a code was recorded and that it has
   the shape of one; what a code MEANS — whether a delivery can be written in it, and what to say
   when it cannot — stays in `deliver`'s `resolveScaffoldLanguage`, which is the only place that has
   ever decided it. It is the cheapest field on the list to answer, and it is asked here.

   **`size` is asked at G2c only where the format has one** (ruling R2). A `static` or `video` beat
   ships at `landscape` (YouTube, article web), `square` (social posts) or `portrait` (stories), and
   the slot records which. A `web` beat is asked NOTHING at G2c and must carry no `size` — web is
   not a fourth size, it fills whatever container the CMS gives it, like an embed component; a
   `scrolly` has no single exported frame at all. `checkStoryboard` refuses all three ways: a size
   this toolchain does not export, a sized format with none, and an unsized format carrying one.
   `splash/scripts/where.mjs` reads the same rule independently and words its refusals
   identically, and `splash/test/where.test.ts` compares the two string for string.

   **A `static` beat is asked one thing more at G2c: WHERE IT IS PUBLISHED** — `destination: screen`
   or `destination: print`. "Static / print" is one option at G2b and two publications, and a
   graphic on a printed page is not a graphic on a display; guessing it put a 2.20:1 accent on paper
   in `stories/stress-ad-polish-hospital-beds`. Render the turn with
   `formatPublicationDestinationGate` (`scripts/format-gate.mjs`) and record what they say. The
   field is OPTIONAL — six frozen static slots predate it and must keep closing — so absence is an
   answer, never a default; the phase that needs the fact refuses and names it. Both gate-2 readings
   run `destinationGap`, copied byte-identically, and refuse the field on a `web`, `video` or
   `scrolly` beat, which is read on a display whatever else is true of it.
3. **`parseStoryboard`** reads that file back: a dependency-free reader for the narrow YAML subset
   in use here — scalars (quoted or bare, with `null`/`~` resolved to a real missing value), and a
   list of slot maps whose values are scalars or quote-aware inline string arrays (a comma inside
   a quoted element, e.g. `["a, b", "c"]`, does not split it — a naive `.split(",")` would silently
   fragment a candidate name that happens to contain one).
4. **`checkStoryboard(meta)`** names every reason the gate has not closed: a missing or unconfirmed
   takeaway, any missing hand-of-the-journalist field, a missing or unresolved `grounding` verdict,
   a missing `reference`, a missing `language` or one recorded as a language's NAME rather than its
   code, zero slots (nothing would be produced), a slot missing its `medium`,
   `format` or `size` (Gate 2's three sub-gates), a slot whose `reachable` is not `yes`, a slot with
   nothing chosen, a slot whose `chosen` value has no `candidates` ever listed to verify it against
   (malformed — a real choice can only be confirmed from a list that was actually shown), or a slot
   whose `chosen` value is not one of its own listed `candidates`, or an eligible chart treatment
   whose custom-or-Datawrapper decision is missing or inconsistent. `datawrapperType` is required
   only for `producer: datawrapper`; unmapped treatments skip this human question and carry no
   producer fields — absence is their canonical custom state. An empty array is the only
   "yes" — Gate 2 closes into this file, or it has not closed.

   **It takes ONE argument, and that is load-bearing.** It used to accept a `profile` and a
   `capabilities` argument and re-derive three expensive semantic checks from them —
   `groundTakeaway`, `formatGap`, `capabilityGap`. `where.mjs`'s own Gate-2 reading has neither
   argument, so it could not run any of the three, and the two gates disagreed for real: `whereIs`
   reported `production` on a storyboard this function was refusing. Each check now runs ONCE, in the phase that owns it —
   grounding at **G1**, format and capability at **G2b** — and records its verdict into
   `STORYBOARD.md` (`grounding:`, and the slot's `reachable:`). Both gates read the record. Neither
   can run a check the other cannot, because neither runs one at all. Do not reintroduce a second
   argument here without adding the same reading to `where.mjs`; the parity test
   (`skills/splash/test/where.test.ts`) generates its fixtures from both sides' exported
   `REQUIRED_SCALARS` / `REQUIRED_SLOT_FIELDS`, so a field added to one side alone turns red.

   `grounding:` closes on `supported`, `unverifiable`, or `overridden — "<reason>"` with a
   non-empty reason. **`contradicted` is never a closing value**: a takeaway the data refutes is
   corrected, or the journalist records the override and says why.
5. **`groundTakeaway`** checks the takeaway text against `profile` for exactly one class of
   failure: a number or a direction the frozen data itself contradicts. It is not a fact-checker
   (it knows nothing outside `profile`) and not a conformance engine (it never looks at a rendered
   chart). It recognises: a numeric token that falls inside some numeric column's range — which is
   **`consistent`, not `supported`**: `233` really is inside `incidents [96, 412]`, and so is the
   `100` of "100k", and neither confirms the sentence it sits in; a numeric
   token that equals a numeric column's `sum` within `AGGREGATE_TOLERANCE` — **a part-to-whole
   total**, the one numeric reading here that can genuinely fail, and so the one that stays
   `supported`; a two-year comparison ("X in 2024 was lower than in 1993") where both years are present
   in `profile.rows`; a windowed superlative ("lower... than in any year since 1993", "the lowest
   since 1993") checked against every row in the claimed range, not just its boundary year; and
   "highest/lowest ever" checked against the whole profile.

   **A numeral is placed against the column its own SENTENCE names** (round five), never against
   whichever column happens to contain it. `chooseValueColumn` is asked the same question here as
   for every other shape, so two clauses of one takeaway cannot be decided against two different
   columns; a numeral the sentence gives no column for is reported unplaced, naming the candidates
   and the range it would have fallen into. A bare **calendar year** belongs to the profile's own
   period column and to nothing else — `stress-y-rural-broadband`'s survey year `2025` used to be
   "placed" inside `households [240, 47933]`.

   **ROUND SIX splits that rule in two, because one rule decided both halves and was wrong about
   each of them once.** `stress-ac-alcanede-kilns` says "the kilns employed 1,860 people in 1980":
   `1860` is `workers`' own MAXIMUM, and it was put to the PERIOD column, which cannot hold it, so
   the answer named `year [1980, 2026]` about a number that was never a year. `stress-ab-emigration-flows`
   carries no period column at all, and its survey year `2025` landed inside `people_2025 [1900, 18400]`
   and came back `consistent` — the same coincidence, reached by the other road. The **frozen table**
   decides both now: a year-shaped numeral belongs to the period column when that column's own range
   covers it; otherwise it belongs to the column the sentence names ONLY IF that column actually
   HOLDS the number in one of its rows; neither, and it is refused, naming both misses and the
   column it would have fallen into by coincidence.

   **A stated multiplier is read as an ALTERNATIVE reading, never as a replacement** (round five).
   "1.12 million" is checked both as written and as 1120000, and the detail says which reading
   placed it: the column's own unit may already carry the scale, as `glace_fondue_mt` does for
   "34 millions de tonnes". The scale-word table declares its languages — **English, French, Greek
   and Arabic**, the four this tree has frozen a story in — and a scale word outside them is not
   read at all, leaving the numeral checked as written. `billion` carries both 10^9 and 10^12,
   because it means one in English and the other in French, so both are tried and neither assumed.
   A run of digits glued to a WORD on its left is not a number the sentence states: `Commune-063`
   produced the claim `-063` and `consumption_m3` produced `3`.

   **AND A COMMA-GROUPED NUMERAL IS SETTLED BY THE TABLE, NOT BY THE TOKEN** (round six, beats AA
   and AC). `readNumericToken` refuses "238,530" because a lone token carries no evidence for
   itself — it could be 238530 grouped, or 238.530 with a decimal comma — and that refusal is right
   about the token and wrong about the situation: this check is never handed a token alone, it is
   handed a token AND the frozen table the sentence is about. On `stress-aa-salary-spread` 238530 is
   a cell of `annual_salary_eur` and 238.53 is nowhere; on `stress-j-partial-year-permits` 14205 is
   `permits_issued`'s own minimum and 14.205 is nowhere. Exactly ONE reading held by the table
   settles the numeral; two, or none, and it stays ambiguous, which is what keeps a French decimal
   comma from being read as a grouping wherever the table cannot tell them apart. **`readNumericToken`
   itself is untouched** — it is a byte-identical copy of `intake`'s and answers a question about a
   token; `settleGroupedNumeral` answers a different question only this file can ask.

   **THE RELATION A NUMERAL SITS UNDER, NOT ONLY THE NUMERAL** (round six, finding Z2 — the round's
   headline). Measured by the controller on the frozen `stress-z-budget-parts`:

   > `"La somme des parts est supérieure à 100."` → **`supported`**, *"equals the sum of column
   > part_pct (100)"*

   A sentence that DENIES equality was confirmed because the numeral in it matched the column's sum.
   The check read the number and not the relation. A numeral matched to a column TOTAL is now read
   together with the comparator that governs it: an equality is evidence FOR a sentence asserting
   equality and evidence AGAINST one asserting a strict inequality, so "plus de 34 millions de
   tonnes" against `glace_fondue_mt`, which sums to exactly 34, comes back `contradicted` and "au
   moins 34" comes back `supported`. The vocabulary declares its languages like every other lexicon
   here — English, French, Greek and Arabic — and a comparator outside them is not read, leaving the
   numeral decided as an equality.

   **AND PARTS THAT CANCEL ARE NOT PARTS OF A WHOLE** (the same finding's other half). `part_pct`
   reaches 100 only because a −9.7 provision write-back cancels a +9.7 overshoot: its positive parts
   sum to 109.7. A column carrying a negative member has TWO totals — its net and its positive parts
   — and they can answer a relation differently, which is a question for the journalist, named as
   one, not a verdict. The totality check (shape 7) is now asymmetric, and that asymmetry is the
   whole of it: **a confirmation requires non-negative parts, a refutation does not.** A column that
   misses the whole misses it whichever total you take, so `stress-e-electricity-mix` (share_pct
   summing to 95.2 against an article claiming the whole) is still `contradicted` — it simply now
   says the column is signed as well.

   **`rowCount` AND `column.missing` ARE A NUMERAL'S HOME** (round six, beat AA). The chart that
   beat shipped prints *"234 of the company's 240 employees; 6 returned no salary"*. Both of those
   numbers are stated exactly by the frozen profile — `rowCount` is 240, `annual_salary_eur.missing`
   is 6 — and both came back "could not be placed in the column this sentence names", because the
   only homes a numeral had were a column's range and a column's sum. They are tried only once a
   numeral has FAILED to be a member of the column its own sentence names, so a plausible measurement
   is never re-read as a fact about the table's shape instead.

   **A COORDINATE IS NOT A MEASURE** (round six, beat AC). `stress-ac-alcanede-kilns` carries
   `site_lat` and `site_lon` and `stress-ab-emigration-flows` carries four of them, so every
   superlative in either story came back *"this profile carries 4 measures ("kilns_active",
   "workers", "site_lat", "site_lon") and the claim names none of them"* — a geographic story that
   could not decide a geographic claim. A latitude is where a row IS, not what it measures, which is
   the statement `measureColumns` has always made about the year column. Name and value both have to
   agree, because "long" is an ordinary English word.

   **AND THE TWO-YEAR COMPARISON READS ITS DIRECTION WORD WHEREVER IT SITS** (round six). Both
   English comparison patterns demanded the comparative BEFORE the first year, so "There were fewer
   kilns in 2020 than in 1990" was decided and "Kilns in 2020 were fewer than in 1990" produced no
   comparison at all — its two years fell through to the per-numeral range check and came back
   `consistent`, which decides nothing.

   **EVERY NAME-BASED LEXICON IN THIS FILE DECLARES ITS LANGUAGES, AND NAMES A SCRIPT IT COULD NOT
   READ** (round five, finding X1 — the round's structural theme, fixed in the same movement in
   `palette`, `intake` and the delivery guards). `LEXICON_LANGUAGES` is **English, French, Greek and
   Arabic**, the four this tree has frozen a story in, and it covers the superlative and comparison
   vocabulary, the share-column names `isShareColumn` reads, and the denominator tokens. Before it,
   `stress-x-tunisian-water`'s takeaway — `أكثر من غيرها`, "more than any other" — produced NO CLAIM
   AT ALL, so the one thing that beat asserts was never put to the frozen table and nothing said so.
   Gaining languages can never be finished, so the half that CAN be: a takeaway written in a script
   none of the four uses is reported in `coverage.unreadable`, by name, and `resolveGrounding` says
   it out loud. **A silent miss is the defect; a stated one is not.**

   **AND A LANGUAGE IT CANNOT READ MAY NOT RAISE THE VERDICT** (round six, findings C1 and AD1).
   The script net above is one level too coarse to catch what it was built for. Polish is written
   in the Latin script, so `scriptsNotRead` returns `[]` for `ludność`, `coverage.unreadable` comes
   back EMPTY, and the checker reports a confident *"I read this sentence and there was nothing to
   check"* — measured on `stress-ad-polish-hospital-beds`, whose takeaway carries the superlative
   `najwięcej`. Worse, one level down: the controller ran ONE table and ONE sentence with only the
   denominator column's name changing language, and got `population` → `unverifiable` (round four's
   raw-count downgrade) against `ludność` → **`supported`**, the one word that closes G1. The gap
   did not withhold a prompt; it raised the verdict past the one an unreadable claim gets.

   No fifth language was added. **The check knows its own coverage instead, one level finer than
   script**: the four declared languages are written with a repertoire that can be written down —
   ASCII, French's own diacritics, Greek, Arabic — and `lettersNotRead` names a letter outside it
   (`ń`, `ř`, `ğ`, `ơ`, `ñ`, `ß`), which says "this is a fifth language" without being taught one.
   It reports in `coverage.unreadableLetters`, `resolveGrounding` says it out loud, `isShareColumn`'s
   refusal names the letters as well as the script, and a numeric column whose NAME the denominator
   lexicon could not read withholds `supported` exactly as a denominator it CAN name does. **A check
   that cannot classify a numeric column may not come back more confident than one that can.**

   **The limit that remains is stated where a journalist reads it, not where a maintainer would.**
   An undeclared language that spells itself in plain ASCII — Dutch `bevolking`, Italian
   `popolazione`, Indonesian `penduduk` — passes both nets, and no character test will ever see it.
   So a raw-count superlative that comes back `supported` with other measure columns beside it
   carries, in its own detail, the sentence that no column NAMES a denominator, that the answer was
   given in those four languages and no others, and which sibling columns were read to give it. The ENTITY a claim is about is
   read the same way twice over — a capitalised phrase where there is case, and a row key of the
   frozen table itself where there is none, because Arabic, Hebrew and CJK have no capitals and a
   refusal about the script must never read as a refusal about the claim.

   **A number it can place in neither a range nor a total is `unverifiable`, never `contradicted`.**
   Reading "I could not place this number" as "the data refutes this number" refused every
   part-to-whole takeaway ever written, including a real production case. Only a value that contradicts a fact this function DID
   establish — the year comparisons and the superlatives, which read real rows — stays
   `contradicted`. Everything else, including "first time" claims, comparisons the profile cannot
   resolve to a single value column, and phrasing shapes this function does not parse, comes back
   `unverifiable` with a reason, never silently `supported`.

   **A raw-count superlative is not confirmed while a denominator sits beside it** (round four,
   finding 5). `stress-q-safety-incidents` used to come back `supported` on "more than any other
   district" — true about raw counts, and standing in for a headline ("Centro has the worst safety
   record") that is FALSE per resident, with `residents` one column away: Centro is 205 incidents
   per 100,000 residents, Sul is 233. `stress-p-transport-ridership` inverts at the very top, Porto
   carrying 416 trips per resident against Lisboa's 393. So shapes 8 and 9 both come back through
   `askAboutTheDenominator`: a `supported` verdict is downgraded to `unverifiable` while a
   denominator-shaped column (`findDenominatorColumn`, read off the column's own NAME exactly as
   `intake`'s profiler reads it) sits in the same table, and every verdict gains a detail naming
   **both rankings** — who leads by the raw column, who leads per denominator, each with its own
   figure. A `contradicted` claim stays contradicted: the data really did refute the raw reading.
   Round six adds the two answers that arise when the lexicon is out of its depth rather than out
   of candidates: a numeric column whose own NAME it could not read withholds `supported` for the
   same reason a named denominator does — it is not in a position to say no — and where every
   sibling name WAS read, the negative stands with its reach stated in the detail.

   **It never divides into a verdict.** The quotient appears only as a number in a sentence the
   journalist reads, as a bare ratio (`205 / 88000 = 0.00233`) rather than "per 100,000", because
   scaling it would choose a unit the data never states. `stress-a-energy-bills` carries
   `households` beside `price_eur` and its shipped beat draws `price_eur` RAW, correctly — a
   household energy bill is already a per-household figure. Reporting and asking, never repair.

6. **`propose.mjs` is the seam that consults all of the above**, and until it existed there was
   none: `grep -rn "formatGap(\|capabilityGap(\|groundTakeaway(" skills/` returned four lines and
   all four were the definitions. `grounding:` and `reachable:` were recorded scalars both gates
   checked and no code produced — not trusted verdicts, unwritten ones. Each phase now calls the
   verdict it owns:

   - **G1** — `resolveGrounding(takeaway, profile, { csv })` — hand it the story's own frozen
     `source/data.csv` text, or every superlative comes back unverifiable for want of rows — then
     `groundingScalar(resolved)` for the field.
     `groundTakeaway` returns one verdict PER CLAIM and `grounding:` is a single word, so the
     collapse is stated rather than left to the model: **any refuted claim → `contradicted`**
     (which never closes G1 — correct it, or record the journalist's override with their reason);
     **at least one CONFIRMED claim, none refuted, and every sentence of the takeaway read →
     `supported`**; **anything less → `unverifiable`**. A numeral merely placed inside a range is
     `consistent` and can never make the verdict `supported` on its own, and neither can a
     takeaway one of whose sentences produced no claim at all — the detail names both, and that
     half is said out loud, because an unverifiable claim is information, not a refusal.

     **Ask the second G1 question too** — is the claim a maximum, a minimum, a comparison between
     two named things, a total, or none of those, and about which column (`references/exchange.md`
     ②). A superlative is grammar, not vocabulary, so no lexicon will ever read
     `najwięcej` or `أكثر من غيرها` reliably, and `stress-ad-polish-hospital-beds` produced no
     claim at all for its own. The answer is recorded as `claimShape` / `claimColumn` /
     `claimEntity` / `claimVersus` / `claimDirection` and passed as
     `resolveGrounding(takeaway, profile, { csv, recorded })`, or read back later as
     `{ csv, storyboard: meta }`. **The guess stays as the default** — nothing recorded, nothing
     changes — **the recorded shape wins**, and where the check's own patterns disagree with it,
     the overruled reading is printed in `resolved.detail` and must be said out loud: it is the
     only way a defect in those patterns is ever seen. `recordedClaimGaps` refuses a HALF-recorded
     answer at gate 2, because nobody can tell that state from never having been asked.
   - **④ ⑤** — `typeSurvey()` reads the generated survey back. The exchange reads
     `references/chart-choice.md`, removes types whose hard data requirements fail, and ranks the
     survivors by the confirmed intent before reachability is considered. The ranking is advisory:
     a lower-ranked candidate is valid when its reason says why the higher surviving form lost.
     `proposeMediums({capabilities})` then marks a medium the environment has closed AT THE MEDIUM
     QUESTION, with what would open it.
   - **⑥** — `proposeFormats({medium, capabilities})` returns every format in the vocabulary, each
     marked reachable or not AND CARRYING ITS REFUSAL, so an absent pair is named rather than
     quietly omitted. Render those rows with `formatPublicationFormatGate`, send its output as the
     final action of the turn, and wait. Pass the slot's own `chosen` treatment as `treatment` when
     it already has one (a re-opened G2b), and the turn withdraws any format that treatment has no
     producer for. After the reply,
     `confirmFormatReachable({medium, format, capabilities})` produces the recorded
     `"yes"`, or throws the refusal the journalist hears.
   - **⑦** — `proposeSizes(format)`: the three export sizes for a static or a video, none for a page
     that fills its container.
   - **⑩** — **a candidate is `{ type, why, format?, marks? }`**, and both functions below read
     exactly that shape: `type` is the treatment name (any name its type sheet's title yields),
     `why` is the reason THIS story is worth seeing that way and is REQUIRED, because a candidate
     with no reason is a name in a list; `format` is optional and is checked through
     `confirmFormatReachable`; `marks` is optional and is HOW MANY MARKS THIS BEAT WOULD DRAW. A
     bare string, a missing reason, an unknown key and a `marks` that is not a whole count are each
     refused by name.
     `assertDistinctWays(candidates)` refuses a set whose candidates are not one IDEA each
     (the run offered three and all three were bars of the same three numbers; a bar and a lollipop
     are one idea, in the lollipop sheet's own words), and
     `formatCandidates({medium, candidates, profile})` renders the menu from the computed options —
     every candidate carrying the type sheet's own purpose sentence verbatim, the same sheet's own
     "when NOT to reach for it" sentence, and the caller's reason why THIS story is worth
     seeing that way. A candidate whose pair the catalog refuses cannot be rendered at all.
     **A sheet's limit in ROWS is about the MARKS, not the source table.** Pass `marks` and the menu
     throws when the beat exceeds the sheet's own ceiling; leave it out and the limit travels to the
     journalist as a by-hand check with the row count printed beside it. `profile.rowCount` is never
     the number the limit is tested against: on a long-form panel it was 7,585 where the beat drew
     211 marks, and the sheet's own sentence was quoted at the journalist as though it were about
     their beat.
     The graphical variant passes those same currently reachable choices to
     `recommendVisualChoice({model, profile})`. Its scored facts come only from confirmed
     `STORYBOARD.md` fields and `source/profile.json`; unknown data-shape requirements remain named
     as unresolved, and equal scores retain catalogue order while disclosing the tie. Reading or
     rejecting this advice writes nothing.
   - **After ⑩, and only after the journalist chooses a treatment** —
     `datawrapperMatch({medium, format, treatment})` checks the pinned provider catalogue. No match
     means no extra question, no producer fields, and production remains custom. A match means
     `formatProducerGate({treatment, match, format, capabilities})` presents the
     Datawrapper-or-custom preference as the final action of the turn. On the next reply,
     `confirmProducerChoice({medium, format, treatment, producer, datawrapperType, capabilities})`
     records either `producer: custom`, or `producer: datawrapper` plus the exact
     `datawrapperType`. This is a producer choice for the chosen treatment, never another treatment
     candidate.
     **Pass `capabilities` — preflight's own report — to both.** `capabilities.datawrapper.surface`
     was measured before this story existed and says which of the delegate's two forms this
     newsroom's ground can carry: a static export can be requested on the matching side, a published
     embed follows the READER's colour scheme and defaults to light. Where the surface rules the
     chosen format out, the gate STATES the measurement and the ground instead of asking a question
     whose Datawrapper answer `confirmProducerChoice` would then refuse. Omit `capabilities` and
     nothing is claimed about a surface — which is the honest answer when nobody measured one, and
     not the same as the surface being fine.

## Quick start

```js
import { readFile } from "node:fs/promises";
import {
  parseStoryboard,
  checkStoryboard,
  groundTakeaway,
  formatGap,
  capabilityGap,
} from "./scripts/storyboard.mjs";

// At G1, the moment the takeaway is confirmed — BEFORE the journalist is asked to pick anything.
// The verdict is written into STORYBOARD.md as `grounding:`; a claim the data actually refutes is
// corrected here, or the journalist records `overridden — "<reason>"` and says why.
const profile = JSON.parse(await readFile("stories/annemasse-rain/source/profile.json", "utf8"));
const csv = await readFile("stories/annemasse-rain/source/data.csv", "utf8");
const claims = groundTakeaway(confirmedTakeaway, profile, { csv });

// At G2b, once a medium and a format have been offered and picked. The verdict is written into the
// slot as `reachable:`; a pair nothing can produce or deliver is refused HERE, at the gate, not
// three phases downstream at deliver.
const { capabilities } = await runPreflight({ root, env: process.env, fetchFn: fetch });
const unreachable = formatGap(medium, format) ?? capabilityGap(capabilities, medium);

// And the gate itself, which re-derives none of it — one argument, recorded scalars only.
const text = await readFile("stories/annemasse-rain/STORYBOARD.md", "utf8");
const { meta, prose } = parseStoryboard(text);
const errors = checkStoryboard(meta);

if (errors.length > 0) {
  // Gate 2 is not closed — surface `errors` to the exchange, do not proceed to production. An
  // ungrounded takeaway, an unanswered reference loop, and a slot whose medium/format/size were
  // never chosen or never confirmed reachable are all among these reasons.
} else {
  // meta.slots[*].chosen names the candidate production reads.
}
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many hand-of-the-journalist fields are required | `6` (`HAND.length`: subject, comparison, limits, placement, credit, effectiveDate) | `scripts/storyboard.mjs` |
| Minimum slots before the storyboard can produce anything | `1` (`slots.length === 0` is the refusal threshold) | `checkStoryboard` |
| Fewest candidates a slot may list once something is `chosen` | `1` (`candidates.length === 0` refuses as malformed, not silently passed) | `checkStoryboard` |
| Leading spaces that mark a line as a slot's own field, not a top-level one | `4` (`/^\s{4,}[A-Za-z]+:/`) | `parseStoryboard` |
| How many numeric columns a comparison claim may resolve to before it is ambiguous | `1` (`findValueColumn`'s `candidates.length === 1` — more or fewer and the comparison comes back `unverifiable`, never guessed) | `scripts/ground-claim.mjs` |
| How far around a "highest/lowest ... ever" phrase this looks for the year to anchor on | `80` characters each side | `scripts/ground-claim.mjs`'s `SUPERLATIVE_EVER_RE` handling |
| How far a rounded total may sit from its column's exact sum and still resolve | `AGGREGATE_TOLERANCE` = `0.01` (relative) or half a unit of the numeral's **own last written digit** ("34" → 0.5, "0.61" → 0.005), whichever is wider — and never more than the smaller of the two numbers being compared | `scripts/ground-claim.mjs` |
| Which languages a numeral's stated multiplier is read in | `4` — English, French, Greek, Arabic (`MULTIPLIER_WORDS`); outside them the scale word is not read and the numeral is checked as written | `scripts/ground-claim.mjs` |
| Which languages the COMPARATOR governing a numeral is read in | `4` — English, French, Greek, Arabic (`RELATION_VOCABULARY`); outside them no relation is read and the numeral is decided as an equality, which is what this file did for every language before round six | `scripts/ground-claim.mjs` |
| How close a comparator must sit to the numeral it governs | `RELATION_WINDOW` = `48` characters, and only whitespace may stand between the phrase and the digits | `scripts/ground-claim.mjs` |
| What makes a numeric column a COORDINATE rather than a measure | its own name token is a coordinate word (`lat`/`lon`/`lng`/`long`/`latitude`/`longitude` and their Latin spellings) **and** its values stay inside that word's range (±90 / ±180) — `tunnel_long_m [900, 5400]` is a length and stays a measure | `scripts/ground-claim.mjs`'s `isCoordinateColumn` |
| What settles a comma-grouped numeral the token reader calls ambiguous | the frozen table: exactly ONE of "238530" and "238.53" being a number some numeric column holds (as a cell, a min, a max or a sum). Two readings held, or none, and it stays ambiguous — which is what keeps a French decimal comma from being read as a grouping | `scripts/ground-claim.mjs`'s `settleGroupedNumeral` |
| Which languages EVERY name-based lexicon in the grounding check is read in | `4` — English, French, Greek, Arabic (`LEXICON_LANGUAGES`); a script outside them is NAMED in `coverage.unreadable` rather than answered in silence | `scripts/ground-claim.mjs` |
| The shapes G1 may record for a claim | `5` — maximum, minimum, comparison, total, none (`RECORDED_CLAIM_SHAPES`); a comparison also records its two entities and its direction, and gate 2 refuses a half-recorded answer | `scripts/ground-claim.mjs`, `scripts/storyboard.mjs` |
| Where the two WORD lists those lexicons match against come from | `doctrine/references/concept-labels.json` — Wikidata's own labels and aliases for the concepts, measured once and VENDORED into the generated region of each file that decides with them. Regenerate with `scripts/concept-labels.mjs --write`; nothing reaches a network at runtime | `scripts/ground-claim.mjs` |
| What a LETTER outside those four's own repertoire does | NAMED in `coverage.unreadableLetters` (`lettersNotRead`), and a numeric column whose name carries one WITHHOLDS `supported` from a raw-count superlative — an undeclared language may not raise the verdict | `scripts/ground-claim.mjs` |
| Fewest genuinely different ways of seeing the data a candidate set must offer | `2` (`assertDistinctWays`'s `min` — two honest ways beat three labels over one idea; fewer is allowed when that is the honest answer, and above `min` EVERY candidate must be its own idea) | `scripts/propose.mjs` |

## Files

- `references/exchange.md` — the movements, the hand-of-the-journalist questions with
  their destinations, and the discipline list. Read by every conversation running this phase.
- `references/type-survey.md` — **generated, do not edit by hand.** Every type sheet in the tree,
  what each is for in its own words, and which formats are proven on disk for it. Regenerate with
  `bun scripts/type-survey.mjs` from `twin/`; `bun scripts/type-survey.mjs --check` fails on drift,
  and `test/type-survey.test.ts` runs that check. It exists as a generated copy because a script in
  this skill may not read `chart-beat/references/types/` — that path resolves inside another
  skill — which is the same reason `twin/MATRIX.md` is generated rather than hand-kept.
- `references/chart-choice.md` — the advisory intent-to-form rankings used at movement ④. It keeps
  hard data refusals ahead of rank, fit ahead of reachability, and agent judgement ahead of an
  automatic dispatch rule. `test/chart-choice.test.ts` makes a new type sheet fail until the guide
  accounts for it.
- `references/datawrapper-chart-types.json` — the complete Datawrapper visualization-type inventory
  at the recorded upstream source revision, plus the deliberately conservative Splash-treatment
  mappings that may open the producer preference gate, each named by its type sheet's own TITLE — every name that title yields opens the gate (`treatmentNames`), and the only spellings still declared beside a mapping are the two no title can yield. Unmapped treatments never trigger it, which is why a name the rule cannot reach is not a neutral outcome: it removes a human gate.
- `scripts/storyboard.mjs` — `parseStoryboard`, `checkStoryboard`.
- `scripts/format-gate.mjs` — `formatPublicationFormatGate`, the complete G2b assistant turn, and
  `treatmentFormatGap` / `PRODUCER_TREATMENT_REACH` / `TREATMENT_FORMAT_GAPS`, the treatment-level
  half of the reachability answer that `formatGap` and `confirmFormatReachable` cannot see from a
  medium and a format alone. What is declared is a producer's REACH; the gaps are the subtraction.
- `scripts/producer-gate.mjs` — `datawrapperMatch`, `producerGap`,
  `formatProducerGate`, and `confirmProducerChoice`: eligibility, journalist-facing question, and
  persisted-answer validation for the conditional G2-producer gate.
- `scripts/propose.mjs` — `resolveGrounding`, `groundingScalar`, `typeSurvey`, `readTypeSurvey`,
  `proposeMediums`, `proposeFormats`, `proposeSizes`, `confirmFormatReachable`, `assertDistinctWays`,
  `formatCandidates`. The one file that CALLS `groundTakeaway`, `formatGap` and `capabilityGap`.
- `scripts/ground-claim.mjs` — `groundTakeaway` and `readFrozenRows`, the claim-grounding guard the **G1 phase** calls
  through `propose.mjs`'s `resolveGrounding`. `checkStoryboard` does NOT call it and takes no
  profile: it reads the recorded `grounding:` scalar, which is what stops the two gates diverging.
- `scripts/capability-gap.mjs` — `capabilityGap(capabilities, medium)`, the guard the **G2b phase**
  calls through `propose.mjs` (`proposeMediums`, `proposeFormats`, `confirmFormatReachable`), never
  `checkStoryboard`, which takes no `capabilities` argument either. This is a **carried copy** of `splash`'s own
  `capabilityGap` (`skills/splash/scripts/preflight.mjs`), not an import — a skill directory
  has to stay copy-pasteable on its own, the same rule `format-catalog.mjs` follows for
  `deliver`'s `FORMS_BY_FORMAT`. **Do not delete it as duplication**: `test/capability-gap-parity.test.ts`
  is the guard against the two copies drifting apart, and it is the reason this file is allowed to exist
  twice.
- `test/storyboard.test.ts` — `bun:test` coverage, including a regression test locking the
  `null`/`~` sentinel resolution described in the gotcha above, and the medium/capability gate.
- `test/ground-claim.test.ts` — `bun:test` coverage for `groundTakeaway`, including the real
  Norway/Swiss regression cases that motivated it, and — its last block — the
  seam A13 actually lived in: `intake`'s own `profileTable` output fed to the real check. Every
  other fixture in that file hand-builds its columns, so deleting `sum` from `profileTable` used to
  leave the whole file green while the defect it was written for came back.
- `test/propose.test.ts` — `bun:test` coverage for the proposal seam, opening with the walking
  guard that gives this file its reason to exist: each of `groundTakeaway`, `formatGap` and
  `capabilityGap` must be called by a script other than its own definition. It strips comments
  before scanning, because its first draft stayed green through the mutation that deleted all three
  calls — `propose.mjs`'s header quotes the grep that found the hole, so the literals were sitting
  in a comment.
- `test/capability-gap-parity.test.ts` — asserts this skill's `capabilityGap` copy agrees with
  `splash`'s original across the full `{map, datawrapper, hostedEmbed} × {open, closed,
  absent}` matrix (the one place a cross-skill import is legitimate: a `test/` directory asserting
  two deliberate duplicates still agree — see `skills/splash/test/helper-parity.test.ts`, the
  pattern this follows).
