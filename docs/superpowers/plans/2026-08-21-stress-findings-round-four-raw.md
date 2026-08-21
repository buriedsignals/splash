# Round four — findings measured by the controller, before the beats came back

## C1 — every claim needing a value column is dead as soon as a table has two measures

`findValueColumn` (`skills/storyboard/scripts/ground-claim.mjs:584`) is:

    const candidates = columns.filter((c) => c.type === "number" && c !== yearColumn);
    return candidates.length === 1 ? candidates[0] : null;

Two measures beside the year and it returns `null`; shapes 8 (superlative) and 9 ("more than all
the others combined") then return `unverifiable` no matter what the sentence says.

**Measured across the 21 frozen stories in `stories/`: 9 fall in the dead zone** — including
`stress-o-museum-visits` and `stress-j-partial-year-permits`, which SHIPPED through round three.
Round three's own plan opened with "a checker that recognises shapes will always be one shape
behind" and then shipped a checker that cannot see a two-column table.

Verdicts observed:
- `Attica has the most schools of any region.` (stress-r) → `unverifiable` —
  "cannot identify a single numeric value column with a range in this profile"
- `Lisboa carries more trips than all the other cities combined.` (stress-p) → same
- `Centro records more incidents than any other district.` (stress-q) → same

The sentence names its measure — "schools", "trips", "incidents". Nothing tries to match it to a
column. And the refusal does not name the candidates it was torn between, so the journalist cannot
even resolve it by hand.

## C2 — the superlative vocabulary is four phrases, and the false headline is not one of them

`SUPERLATIVE_MOST_RE` (`has the most`), `SUPERLATIVE_HL_RE` (`the highest|lowest`), `LEADS_RE`,
`TOPS_RE`. That is the whole list.

`Centro has the worst safety record in the city.` → `coverage: {sentences: 1, evaluated: 0}`.
Not refuted, not unverifiable — **unseen**, which is the exact defect round three's redesign was
written to close, one vocabulary item further out. Also absent: best, largest, biggest, smallest,
fewest, greatest, strongest, worst-hit.

"Worst" is not decidable from the data alone — it needs a polarity nothing in the profile carries.
That makes it an honest `unverifiable`; it does not make it invisible.

## C3 — the toolchain has no concept of a rate  ← the big one

`grep -rn "per capita|perCapita|denominator"` across `skills/` and `scripts/`: nothing in the
profile, nothing in grounding, nothing in the brief a craft skill receives. Not one line reasons
about a count against its denominator.

`stress-q` is the whole finding in one table: `incidents` and `residents`, adjacent columns.
Centro 412 incidents is the highest raw count and **205 per 100 000**; Sul is 205 incidents and
**233 per 100 000**. The headline "Centro has the worst safety record in the city" is false, the
column that refutes it is one column away, and every gate is green.

Name-based scan of the 21 frozen stories — four hand the toolchain an explicit denominator and
none was ever asked about it:

| story | count column | denominator sitting beside it |
|---|---|---|
| `stress-q-safety-incidents` | `incidents` | `residents` |
| `stress-p-transport-ridership` | `trips_millions` | `population` |
| `stress-a-energy-bills` | (bill totals) | `households` |
| `stress-r-greek-schools` | `σχολεία_*` | `μαθητές_2026` |

Two of those four have already shipped a beat.

Reporting, never repair — the profiler's existing doctrine for `gaps` and `mixedUnits`. The profile
names the candidate denominator; grounding refuses to confirm a raw-count superlative while one
exists, and names BOTH rankings in its detail so the journalist chooses with the numbers in front
of them.

## C4 — a corrupt cell is reported as a unit ambiguity  (candidate, low confidence)

`stress-r`'s `σχολεία_2026` contains `term378`. The profile correctly refuses to type the column,
and records:

> looked numeric but only some values carry a unit ("term378" has one, "1021" does not) — nothing
> settles whether the whole column is in that unit

It names the offending value, which is most of the job. But it calls `term` a unit, sending a
journalist to look for a unit column that does not exist, when the truth is that one cell of
thirteen is garbage. Judgment deferred to beat R's report.

### C3, second instance — the inversion is in `stress-p` too

`trips_millions` against `population`, computed by hand from the frozen data:

| city | trips (M) | per resident | raw rank | rate rank |
|---|---|---|---|---|
| Lisboa | 214 | **392** | 1 | **2** |
| Porto | 96 | **415** | 2 | **1** |
| Coimbra | 28 | 267 | 4 | 3 |
| Braga | 31 | 226 | 3 | 4 |
| Faro | 11 | 180 | 6 | 5 |
| Aveiro | 14 | 179 | 5 | 6 |

Porto beats Lisboa per resident and the ranking inverts at the top. `stress-p`'s "overall picture"
beat will draw Lisboa dominant and be no more wrong than the article — and no less.

For the record, `Lisboa carries more trips than all the other cities combined` is **true**
(214 against 180 summed). It came back `unverifiable` anyway, from C1.

### C5 — a bare numeral inside a column's range still returns `supported`

Over `stress-q`'s whole article: 2 of 4 sentences evaluated, verdicts `{unverifiable: 1,
supported: 2}` — the two `supported` are the bare numerals `412` and `388`. Each really is inside
the `incidents` range, so each verdict is defensible on its own; the aggregate a journalist reads
off it is "mostly checked out" for an article whose headline is false. Round three closed exactly
this shape for `2026` by fixing the number READER; the shape itself — a numeral's presence in a
range reported as editorial support — survived the fix.

### C3, and the case that says the rule must never divide anything

`stress-a-energy-bills` carries `households` (41 200 000 for Germany) beside `price_eur`, and its
shipped beat draws `price_eur` raw — **correctly**. A household energy bill is already a
per-household figure; dividing by `households` again would be nonsense.

So the rule cannot be "a denominator exists, therefore compute the rate". It reports that a
denominator-shaped column is present and that the takeaway's claim is a raw-count claim, and it
puts the question to the journalist. `stress-q` answers yes, `stress-a` answers no, and only the
journalist can tell the two apart — which is exactly why the toolchain's job is to ASK rather than
to divide.

## C6 — the ground round four was dispatched to cover, stated as a measurement

Across the 15 stress stories from rounds one to three, `export/` is **empty in every one**. The
only two non-empty exports in the tree belong to the hand-built demo stories
(`heat-pump-adoption-across-europe`, `milan-cortina-la-glace-des-sponsors`).

Three rounds of stress testing have therefore exercised **production and nothing after it**. The
`deliver` phase — handover, review binding, format replacement — has never once been reached from
imperfect input. Neither has a story with more than one beat: every stress story in the tree holds
exactly one `beats/` directory.

---

# Beat S — the story whose honest answer is one number

**Correct outcome, reached by hand.** The agent recorded `slots: []`, stopped at G2a with
`"no slot: nothing would be produced"`, and invented nothing. That is a pass.

But it reached that answer by reading `chart-choice.md` with its own judgment. The scored path
disagrees.

## S1 — the recommender proposes a streamgraph of one data point, with zero unresolved requirements

Reproduced independently by the controller against `stress-s-unspent-fund`'s frozen profile
(one row: `year=2026`, `fund=1`):

```
recommended: chart.streamgraph | tied: false
   6 chart.streamgraph      | unresolved: 0
   4 chart.area             | unresolved: 0
   4 chart.calendar-heatmap | unresolved: 0
   4 chart.connected-scatter| unresolved: 0
   4 chart.line             | unresolved: 0
```

Not a tie broken by catalogue order, not a "conservative fallback" — a confident top pick with
**no unresolved requirement at all** on a table that supports no comparison whatsoever.

### Why: row count is not evidence

`requirementFinding` (`propose.mjs:321`) holds **46 requirements; 2 consult `rowCount`**
(`raw-observations`, `distribution`). Every other one is satisfied by column TYPE alone:
`numeric-series`, `temporal`, `ordered-axis`, `multiple-series`, `numeric-pair`, `few-series`,
`part-to-whole`, `rank` — all true of a one-row table.

The vocabulary already contains the right idea in exactly one place:

    "two-moments": [facts.temporal.some((c) => c.distinct === null || c.distinct >= 2), ...]

`two-moments` asks for two distinct values. `temporal` and `ordered-axis`, which mean the same
thing for drawing purposes, do not. A time axis with one moment is not an axis.

### And the second half: the year column is counted as a measure

`facts.numeric` and `facts.temporal` are computed independently, so a `year` column lands in both.
A plain (year, value) table therefore reports "2 numeric columns" and satisfies `multiple-series`
and `numeric-pair` — on the strength of its own x axis.

**Measured: 9 of the 21 frozen stories** are in this state (`stress-m`, `stress-i`, `stress-d`,
`stress-j`, `stress-b`, `stress-c`, `stress-p`, `stress-s`, `heat-pump-adoption-across-europe`).

The sharpest part: **`ground-claim.mjs` already excludes the year column** — `findValueColumn`
takes `columns.filter((c) => c.type === "number" && c !== yearColumn)`. Two modules inside the SAME
skill answer "is `year` a measure?" opposite ways. This is precisely the divergence class the
traits catalogue exists to abolish between skills, occurring inside one, where the catalogue
cannot reach.

## S2 — no producer anywhere for "one confirmed figure"

The agent checked `chart-choice.md` (nine intent tables, every one needs two comparable values or
a series), `visual-catalog.json` (41 treatments: 32 chart, 8 map, 1 image — none for a single
figure; the nearest, `chart.bullet`, still needs an actual AND a target), and `image-beat` (needs
the journalist's own photographs). Doctrine uses "headline number" only to describe a title zone
inside an existing chart layout, never as a producible treatment.

So the honest answer to this story — a big number on a card — has no cell in the catalogue.
This is a gap, not a break: `chart-beat` draws its own geometry and could render it tomorrow.
Whether the catalogue should grow that cell is Rémy's call, not this round's.

## S3 — grounding returned `supported` on the takeaway that carries the story's two real numbers

The agent's G1 takeaway: *"Of the €4.1 billion allocated to the regional resilience fund, €0 had
been disbursed by the end of June 2026."* → `grounding: supported`.

It is `supported` because the incidental **2026** falls inside the `year` column's range. The two
numbers the sentence actually asserts, **4.1** and **0**, both come back `unverifiable`. One
incidental numeral outvoted the two load-bearing ones and closed the gate.

Same family as C5, one degree worse: here the scalar that CLOSES G1 is the one being decided this
way.

Verified by the controller, verbatim:

    scalar: supported
    detail: "1 of 3 claim(s) confirmed against the frozen data
             (2026: within the range of column \"year\" [2026, 2026]);
             2 could not be placed either way"

The detail string is honest. The **scalar the gate reads is not**, and the scalar is what closes
G1. Round three built `coverage` so that silence would stop looking like confirmation;
`groundingScalar` then discards it.

Worse, the one "confirmed" claim is a tautology: `year` has `min === max === 2026`, so every
numeral equal to 2026 is trivially "within range". A check that cannot fail is not support —
this plan's own definition of theatre, applied to the field that closes the editorial gate.

---

# Beat Q — the render (opened at first jet)

`stories/stress-q-safety-incidents/beats/1-rate-not-count/renders/still.png`

**Editorially, this is the right chart.** Sorted by rate, Sul accented, the rest in grey, the raw
count carried honestly in the footnote — and a headline that refutes the article's own. Every
number matches the controller's hand calculation (233.0 / 205.0 / 184.6 / 87.4 / 85.3).

**And the agent did all of that by hand.** Nothing in the storyboard, the profile, the grounding
check or the brief ever raised the denominator; the beat is correct because a careful producer
went looking. That is C3 confirmed from the other side: the toolchain does not prevent the right
answer, it just never asks the question, so whether the published chart is true depends on how
careful that particular run happened to be.

## Q1 — a double hyphen reaches the delivered pixels, and the screen reader

`render.mjs:68`:

    caveat: `Centro recorded the most incidents in raw terms (${centro.incidents}) -- but not the highest rate.`

It lands twice in `still.svg`: in the visible footnote, and inside `<desc>` — the string a screen
reader speaks aloud. Everything else in the same graphic uses proper typography (`·` in the
source line).

**Scanned the whole tree for reader-visible ` -- `:** 22 files contain the sequence, 21 of them
only inside code comments. `stress-q`'s `still.svg` is the **only** delivered artefact in the
repo where it reaches text a reader sees. So this is not an established pattern — it is a
first occurrence with nothing standing in its way.

Cheap to declare: detectable on the DELIVERED artefact, reachable by every skill carrying
`materialises-a-beat`.

---

# C1 and C2, superseded — the superlative check can never decide anything, in any story

C1 said the value-column resolver dies on 9 of 21 stories. That understated it. The real number
is **21 of 21**, for a different and simpler reason.

`resolveSuperlative` resolves the named entity to its own row and reads its value against the
column's extreme. The only structure it is ever handed is `source/profile.json`, whose keys are:

    [ "rowCount", "columns", "duplicates" ]

**There are no rows.** There have never been rows. Tested against every single-measure story in
the corpus — `stress-n`, `stress-k`, `stress-a`, `stress-e`, `stress-l` — the answer is identical
every time:

    unverifiable: could not resolve "<entity>" to a row — profile has no row-level data

So shape 8 has returned `unverifiable` for every superlative ever put to it, and always will.
Whether the sentence is true, false, or nonsense makes no difference to the output.

## Why round three could not see this

Round three's Task A shipped two shapes and its acceptance test was "run the four sentences and
put the verdicts in the commit body". Shape 9 (`resolveCombined`) genuinely works — it refutes
from `max` and `sum` alone, no rows needed, and still does:

    contradicted: even the largest single value in "loss_ha" (1120000) does not exceed the sum
    of the rest (1582000) — no row in this column could make this claim true

Shape 8 is dead. Both printed a verdict, and `unverifiable` reads as an honest answer, so the
acceptance test could not tell the working half from the dead half. **A mechanism whose failure
mode is indistinguishable from its success mode was accepted because nobody asked it to fail on
purpose** — round two's finding 8 ("a capability that cannot observe its own failure"), recurring
one skill over.

Either the profile grows the rows a superlative needs, or `groundTakeaway` is handed the frozen
CSV as well as the profile, or shape 8 is retired for saying nothing. What it must not do is keep
printing a verdict it cannot compute.

## C2, restated and measured

Twelve ordinary journalistic superlatives against a clean profile — **8 are invisible**
(`coverage.evaluated === 0`), and the 4 the vocabulary knows are the dead ones above:

| invisible | seen (and always `unverifiable`) |
|---|---|
| the worst · the best · the largest · the biggest | has the most |
| the fewest · the greatest · worst-hit · the smallest | the highest / the lowest · leads · tops |

`Centro has the worst safety record` — the false headline this round was built around — is in
the left column.

---

# Beat Q — the full report, verified

Q reached `{"phase":"done","missing":[]}` — **the first stress story in four rounds to be
delivered**, and it found two defects in `deliver` that only a first delivery can find.

## Q2 — the grounding check reports "3 of 3 confirmed" on numbers it matched to the wrong column

The single sharpest defect of the round. Verified by the controller, verbatim:

    takeaway: "Per capita, Sul has the worst safety record in the city, not Centro:
               233 incidents per 100k residents against Centro's 205."

    scalar: supported
    detail: 3 of 3 claim(s) confirmed against the frozen data
            (233: within the range of column "incidents" [96, 412];
             100: within the range of column "incidents" [96, 412];
             205: within the range of column "incidents" [96, 412])

`233` and `205` are **rates per 100 000**, checked against a column of **raw counts**, and they
land inside `[96, 412]` by pure coincidence. `100` is the "k" in "100k" — a fragment of a unit,
reported as a confirmed editorial claim.

This is worse than the invisible-headline defect it sits beside. An unseen sentence at least reads
as unseen. This one closes G1 at maximum confidence on the corrected, honest takeaway, for three
reasons all of which are wrong. C5 and S3 are the same shape one degree milder; this is the shape
at full strength.

## Q3 — `whereIs` says "delivery, nothing missing" on a beat `deliver` refuses to start

    whereIs → {"phase":"delivery","missing":[]}
    materialise → throws: "this output has no bound review: no OUTPUT-REVIEW.json in
                           stories/stress-q-safety-incidents/beats/1-rate-not-count"

Verified in the source. `where.mjs` reads `OUTPUT-REVIEW.json` in exactly one place — line 662,
inside `feedbackRevisionState` — and that function opens with:

    const feedbackDigest = await currentFeedbackDigest(beatDir);
    if (!feedbackDigest) continue;

So the review is only ever checked on a **second** delivery, after a `FEEDBACK.md` exists. On a
first delivery `beatsAwaitingDelivery` looks for `export/<beat>/HANDOVER.md` and nothing else.

`splash/SKILL.md`'s own "one gotcha" section describes this exact class — two gates that can refuse
for reasons the other cannot see — and records it as fixed for G2. **It is not fixed for G3→G4.**
And the documented path (`splash/SKILL.md`, `chart-beat/SKILL.md`) never mentions
`OUTPUT-REVIEW.json`, `planVersion` or `findingIds` at all, so a producer following the docs
cannot know what delivery will demand.

## Q4 — `language` is required by `deliver` and checked by neither Gate 2

`grep -n "language" skills/storyboard/scripts/storyboard.mjs skills/splash/scripts/where.mjs`
returns **nothing**.

    REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference"]
    HAND = ["subject","comparison","limits","placement","credit","effectiveDate"]

`language` is in neither. And `format-handover.mjs:30` says so on purpose:

    // `language` is deliberately not in this list: it has its own refusal, in
    // `resolveScaffoldLanguage`, which says where it is recorded and why it is never guessed.
    // One check, in the place that owns it.

The refusal is well-written and it is in the wrong place — at the very end, after the storyboard,
the palette, the component, the render and the approval are all done. `exchange.md`'s ruling R4
records that `language` exists because *"a hand-over came out in English on a French story for
want of it."* A story can still sail through every gate to the delivery call with no language
recorded — the same situation R4 was written after seeing for real, now merely detected later
instead of never.

## Q5 — grounding cannot verify a derived value at all

Named by the agent as what it could not do: there is no path through `ground-claim.mjs` that
checks a number computed from two columns. It compares literals against a single column's range
or sum. So the toolchain could not have caught this story's false headline, and could not
correctly confirm its correction either — only accidentally, as Q2 shows.

## Q6 — Q1 restated with the agent's own text

The agent's report renders the caveat with a proper em dash; `render.mjs` writes `--`. The
producer's intent was right and the string that reached the pixels was not.

## What Q got right, said plainly

The delivered `HANDOVER.md` is genuinely good work by the toolchain: it names the two files and
what each is for, states where the visual goes in the article ("replaces the headline's claim,
before the raw counts are cited"), gives paste-ready alt text that carries the FINDING rather than
a description of a chart, gives the credit line, and reprints the limit the journalist named —
*"residents is a single population figure per district, not adjusted to the same year the incidents
were logged"* — with a sentence explaining that it belongs beside the visual and not in a notebook.

Four rounds in, this is the first time any of that has been seen, because this is the first stress
story ever delivered.

The `--` reaches this file too, inside the alt text — a third surface, and the one a newsroom
pastes into its CMS by hand.

---

# Beat P — three beats, all delivered, eleven defects

`whereIs → {"phase":"done","missing":[]}`. **The first story in the repo with more than one beat**,
and the first multi-beat delivery. Everything below is ground no previous round could reach.

## What P got right

- **Beat 1** (`export/1-overall-picture/overall-picture.png`): Lisboa against the other five, with
  a dashed reference line at 180 m annotated *"more than Porto, Braga, Coimbra, Aveiro and Faro
  added together"*. Arithmetic checks out (214 · 96 · 31 · 28 · 14 · 11; others sum 180; total 394;
  214/394 = 54%). Proper em dashes throughout.
- **Beat 2** (`export/2-trips-per-resident/trips-per-resident.html`): headline *"Per resident,
  Porto — not Lisboa — carries the most trips"*. **P found the C3 inversion by itself**, as Q did,
  with nothing in the toolchain prompting either of them. An accessible table beneath carries all
  six readings.
- **Beat 3** (`export/3-aveiro-network/aveiro-network.png`): the journalist asked for the Aveiro
  line itself; the data has no route, no stops, no opening date. The beat **publishes the refusal
  in its own subtitle** — *"there is no route, no stops and no opening date in the data, so the new
  Aveiro line cannot be drawn — only measured against the five networks beside it"* — and draws the
  honest thing instead. That is exactly what the brief asked for and it is good work.
- The three beats stay coherent: same palette, same accent, same rounding, and the raw and
  per-resident readings are stated as two readings rather than contradicting one another.

## P1 — an invented source is printed on all three delivered artefacts  ← new, and serious

All three beats carry:

    Source: city network figures for 2025, compiled by Buried Signals

The frozen article names **no source at all**. `grep -in "source|according|figures|compiled|buried"`
on `source/article.md` returns nothing. The organisation, and the claim that it compiled the data,
were invented at G1 and printed into the pixels, the SVG, the web page and the hand-over.

`credit` is a REQUIRED scalar (`HAND` in `storyboard.mjs:27`). The journalist was not there to
supply one, there is no honest empty value for it, and so an unattended run filled it with
something plausible. This is round two's finding 9 in a new place — a required field with no
legitimate way to say "not given" is a field that will be fabricated — except the consequence here
is attributing data to a real named organisation that never touched it.

## P2 — all eighteen `chart-web` example runners are dead, and the skill's own overview predicted it

Reproduced by the controller:

    for x in proof/*/render-web.mjs; do bun "$x" <out> ... ; done
    runs=5 fails=18

The five that run belong to a different skill (`mapgen-*-web`). All eighteen `chart-web` beats die
identically:

    error: a delivered page declares the language it is written in, and none was given
      at assertRecordedLanguage (skills/chart-web/scripts/render-web.mjs:134:15)

That refusal is **round two's finding 1**, landed correctly, with its callers never migrated.

And `skills/chart-web/SKILL.md:29-31` says, in its own overview:

> **A cost worth knowing before you change `renderWeb`'s signature.** The second build dropped the
> `layouts` argument without migrating the beats that passed it, and all fifteen stopped rendering
> with the same `Cannot destructure property 'width'` — for an hour and a half, with a green suite

The warning is on line 29. The recurrence is in the same file, with a green suite again — because
the suite exercises the SEED, and `SEED` carries `language: "en"`.

`SKILL.md:287`, under **Quick start**, tells a reader to run `bun proof/co2-suisse/render-web.mjs`.
It has been dead since the round-two fix landed.

## P3 — `TYPEFACE.md` is refused-without by five skills and written by nothing

`readTypeface` throws *"No TYPEFACE.md found … Propose the newsroom's measured typefaces, let the
journalist choose, and record the answer"*. Five render paths read it
(`chart-beat`, `chart-web`, `chart-video`, `map-beat`, `shared/`). Searched for a writer:

    grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write   → nothing

There is no typeface movement in `exchange.md`, no gate in `checkStoryboard`, no owning skill.
Each skill ships its own `TYPEFACE.md` in its own directory, so the seed resolves by walking up —
which is exactly why nobody noticed that a STORY has none. A runner that calls `readTypeface`
cannot proceed; one that does not rasterises in `Helvetica, Arial, sans-serif`, a face nobody chose.
`PALETTE.md` exists to have closed this for colour; type has no equivalent.

(Second half: `NEWSROOM.md` records `Space Grotesk`, and `familyResolves("Space Grotesk, …")` is
`false` on this machine — the refusal is correct, there is just no path to answer it.)

## P4 — `SUBJECTS.md` is the same shape

`exchange.md` movement ⑩ requires that what the journalist DROPPED be written down. `grep -rn
"SUBJECTS.md" skills/ | grep -i write` → nothing. `checkStoryboard` returned `[]` and the story
went through three renders, three approvals and three deliveries with no `SUBJECTS.md` on disk.
`otherSubjectsFor` at the end of `deliver` reads a file whose only writer is a call nobody is
obliged to make — the "lives in a conversation and dies with it" failure the file exists to prevent.

## P5 — a chosen treatment is never checked against its own type sheet's refusals

Slot 2 first closed on **Scatter** for a six-row table. `types/scatter.md` refuses that outright
(*"fewer than about eight or ten points … a cloud needs enough members to have a shape"*).
`checkStoryboard` returned `[]`; `whereIs` said `production`. `formatCandidates` lifts a sheet's
*What it is for* sentence and never reads its *When NOT to use it*.

Its neighbour: `assertDistinctWays(["Bar and column","Lollipop","Treemap"])` is **accepted**, though
`types/lollipop.md` calls a lollipop *"a bar chart's thin sibling: same job … 'a bar, minus the
fill'"*. The function compares NAMES; two labels for one idea is precisely what it exists to refuse.

## P6 — no slopegraph can pass `verify-web`

    verify-web --file …/trips-per-resident.html   → 48 passed, 14 failed, 11 skipped
    verify-web --file proof/web-co2-decline-slope/co2-decline-slope.html → 43 passed, 11 failed

Every failure is one check: HOVER probes each mark at the CENTRE of its bounding box, which for a
diagonal is the line's midpoint — and on a slopegraph two crossing lines share that point exactly.
The probe is ambiguous by construction. Driving the same page with real pointer events at 15% and
85% along each line answers correctly 12 out of 12. `SKILL.md` claims "exit 0 only when every check
passed", so as it stands the format's own committed slopegraph cannot be delivered green.

The agent did not paper over it: beat 2's `OUTPUT-REVIEW.json` records the `verify-web` run as
`failed` beside the passing off-crossing probe, and the limitation is repeated in `APPROVED.md`,
the caveat and the delivered `HANDOVER.md`.

## P7 — `runPreflight` has no default for `fetchFn` and reports every capability closed

Without one: all three capabilities `available: false`, reason *"MapTiler threw: fetchFn is not a
function"* — which a journalist reads as "MapTiler is down". With `fetchFn: (u,i)=>fetch(u,i)`:
map 200, datawrapper 200, hostedEmbed 403. Two of three are actually open on this machine.
`preflight.mjs:177` destructures `fetchFn` with no default and no throw naming it.

## P8 — preflight and `offerForms` disagree about hosted embed, in the direction the journalist sees

Preflight: `hostedEmbed: {available: false, reason: "Cloudflare answered 403"}` — the token exists
and is refused. `offerForms` lists `[embed] Deploy and receive embed code` with no `available:
false` and no reason, because it checks for the PRESENCE of the two env vars, not the probe result.
Both skills' documented rules held, and the journalist is still told two different things.

## P9 — `whereIs` says `done` while both halves of the closing offer are pending

    whereIs → { phase: "done", missing: [] }
    deliveryClosed(export/1-overall-picture)    → { closed: false, missing: [...] }
    deliveryClosed(export/2-trips-per-resident) → { closed: false, missing: [...] }
    deliveryClosed(export/3-aveiro-network)     → { closed: false, missing: [...] }

All three carried `.another-format: pending` and `.other-subjects: pending`. `deliver/SKILL.md`
names the gap in its own parenthesis — *"(The story-level gate does not consult it yet; that wiring
belongs to `where.mjs`, which another chantier owns.)"* This is that gap, live, on the first story
that ever had three beats: a run that stopped at `done` ships with neither closing offer asked.

Same family as Q3 — `whereIs` and `deliver` disagreeing — at the other end of the phase.

## P10 — `chart-web`'s mechanism is not vendored

`shared/` holds `chart-beat/` and `chart-video/`. A web beat has no `#shared/` specifier and must
write `import { renderWeb } from "../../../../skills/chart-web/scripts/render-web.mjs"` — four
levels up, into another skill, which would not resolve at all in an installed Splash root. The
eighteen `proof/` web beats do the same.

## P11 — `chart-beat/SKILL.md` still declares a scope two skills ago

> **SP1 scope: the static format only.** Interactive and video chart beats are later sub-projects.
> `renderStill` is the first rung of the render ladder; the rungs above it do not exist yet.

`chart-web` and `chart-video` both exist and both ship beats; `splash/SKILL.md`'s phase table
dispatches to them by name.

---

# Beat R — Greek script, and a delivered chart that states two false facts

`stories/stress-r-greek-schools/export/1-attica-vs-the-rest/attica-vs-the-rest-still.png`

**The script itself passed cleanly.** All thirteen Greek region names render correctly in the
pixels, including the 29-character `Ανατολική Μακεδονία και Θράκη`. Nothing is clipped, nothing is
truncated, nothing is dropped, and the Greek column header survived the profile. The desk's stated
complaint from the article is answered.

## R1 — the delivered graphic attributes a missing figure to the wrong region  ← the worst artefact of the round

Ground truth, from the frozen CSV:

    Ανατολική Μακεδονία και Θράκη,412,term378,41205     ← the corrupt cell
    Πελοπόννησος,441,392,40118

What the delivered chart draws, extracted from its own SVG by row:

    y=535.7   Δυτική Ελλάδα — 488                 |  441
    y=574.1   Πελοπόννησος — 441                  |  2026 unavailable      ✗ (truth: 392)
    y=612.5   Ανατολική Μακεδονία και Θράκη — 412 |  392                   ✗ (truth: unavailable)
    y=650.9   Στερεά Ελλάδα — 398                 |  352

The two stacks share identical y values to one decimal place — the graphic puts each pair on one
line. Every other row of the thirteen is correct; exactly these two are swapped.

**Cause.** The left labels are de-collided in 2020 rank order; the right values are de-collided
independently against their own 2026 y. The one `null` has to borrow a y, and it borrows its 2020
one — which sorts it above `392` instead of below. Two independent de-collision passes, one
missing value, and the row correspondence silently breaks.

So a chart about school closures tells a reader that the Peloponnese has no 2026 figure and that
Eastern Macedonia and Thrace has 392 schools. Both false, both published, through approval,
`inspectSvg` (31/31 contrast entries passing), `assertDeliveredSize`, `assertTypeFloor` and
delivery. Nothing checks that a row's label and its value belong to the same row.

## R2 — the labels do not sit on their own marks

Label y positions are evenly spaced, step 38.4: `382, 420, 459, 497, 536, 574, 612, 651, 689, 728,
766, 805, 843`. The marks are positioned by VALUE and cluster hard: circle `cy` values are
`417, 430, 578, 597, 712, 716, 719, 720, 727, 730, 737, 740, 742, 751, 776, 777, 782, 784, 790,
794, 796, 799` — sixteen of twenty-two inside an 88-pixel band.

De-collision plus leader lines is the right idea for a thirteen-category slope, but the result is a
knot: eight dots inside 30 pixels at the bottom, with leaders fanning out to labels spread over 460.
No reader recovers which line is `Ιόνια Νησιά`.

## R3 — the agent's own first version inverted two regions' rank, and only the pixels caught it

Reported honestly by the producer: its first de-collision pass drew `Κεντρική Μακεδονία` (1104)
ABOVE `Αττική` (1802) — the exact inverse of their true positions, on a chart whose whole point is
relative position. `render-still.mjs` exited 0; `assertDeliveredSize` and `assertTypeFloor` check
size and type floor, not rank order.

`chart-beat`'s doctrine (`references/types/slope.md`) REQUIRES vertical label de-collision for a
many-category slope, and **the toolchain carries no shared helper for it** — unlike `wrap()`, which
the seed does carry. So every slope author writes the algorithm again, and R1 and R3 are two
different bugs from the same hand-rolled pass in a single beat.

That is the sharing question answering itself: a decision the doctrine mandates, that no skill
provides, produces a fresh data-integrity bug per author.

## R4 — `profile.json`'s refusal reason points a journalist at the wrong conclusion (C4, confirmed)

> looked numeric but only some values carry a unit ("term378" has one, "1021" does not) — nothing
> settles whether the whole column is in that unit

The agent's judgment matches the controller's: this frames a **units ambiguity**, sending a
journalist to hunt for a conversion factor or a unit column that does not exist. The truth is that
one cell of thirteen is garbage — paste or OCR damage. The reason names the offending value, which
is most of the job, and then mis-diagnoses it.

## R5 — the corrupt cell has no guardrail at any level

The agent's answer to the brief's binary — is the beat blocked, or does it quietly render 2020 and
call it the story? — is **neither, and that is worse**. Nothing refuses a slot referencing a
non-numeric column; nothing substitutes; nothing warns. A less careful pass through the identical
`STORYBOARD.md` and the identical skill could ship "schools by region" backed only by
`σχολεία_2020`, discarding the article's actual point, and `checkStoryboard`, `groundTakeaway` and
`chart-beat`'s render assertions would all stay green.

## R6 — the corrupt cell also silently disarms the grounding check, and nothing says so

Because `σχολεία_2026` is typed `text`, it is not among the profile's numeric columns, so the
takeaway's real numbers (1802 → 1744, −3.2%) are never attempted:

    resolveGrounding("Every Greek region lost schools between 2020 and 2026, but Attica's
                      decline was far smaller than the rest.", profile)
    => unverifiable — "2020" and "2026" cannot be placed in σχολεία_2020 [155,1802]
                      or μαθητές_2026 [12008,318440]

Twelve of the thirteen values in that column are clean integers. `unverifiable` is a legitimate
closing value for G1, so the gate closes — and nothing tells the journalist that this particular
`unverifiable` traces to one bad cell rather than to a genuinely hard claim.

## R7 — Q3 confirmed independently

R hit the same wall as Q, traced it the same way, and added the grep that settles it:

    grep -rn "writeOutputReview(" skills/ --include="*.mjs"   → no callers outside its own test

Nothing upstream of `deliver` ever writes the record `deliver` unconditionally requires, and none
of `splash/SKILL.md`, `storyboard/SKILL.md` or `chart-beat/SKILL.md` names `OUTPUT-REVIEW.json`,
`planVersion` or `findingIds` anywhere. Two independent agents found it the same way: by tracing a
throw back to its source.
