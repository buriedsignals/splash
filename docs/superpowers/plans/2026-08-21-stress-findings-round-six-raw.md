# Round six — findings measured by the controller before any producer ran

## C1 — the lexicon policy protects against unknown SCRIPTS, not unknown LANGUAGES  ← headline

`stress-ad-polish-hospital-beds` is written in Polish. Polish uses the Latin alphabet.

    "Mazowieckie ma najwięcej łóżek szpitalnych w kraju."   ("has the most hospital beds")
    claims: 0
    coverage: {"sentences":1,"evaluated":0,"decided":0,"unreadable":[]}
    scriptsNotRead: []

`najwięcej` is a superlative. The checker produces **no claim at all**, and — this is the part that
matters — `coverage.unreadable` is EMPTY, because `scriptsNotRead` only fires on a script none of
`LEXICON_LANGUAGES` is written in. Polish is Latin, so the safety net built this morning does not
trip, and the checker reports a confident *"I read this sentence and there was nothing to check"*.

That is **worse than the Arabic case it was built for**. For `stress-x` the mechanism at least named
the script it could not read. For any Latin-script language outside the four declared — Polish,
Spanish, Portuguese, Italian, German, Dutch, Czech, Turkish, Vietnamese — the miss is silent again.

The policy's own commentary says the second rule "can never be finished". True, and the third rule
was supposed to be the answer. It only answers for scripts.

## C2 — the denominator prompt does not reach the language either

`ludność` (population) sits beside `łóżka_szpitalne` (hospital beds) and no denominator candidate is
reported. The article itself raises the per-capita reading in its second paragraph — *"Mazowieckie
jest jednak także najludniejszym województwem. W przeliczeniu na mieszkańca obraz wygląda
inaczej."* — and the toolchain never puts the question.

## C3 — what the round-five fixes got right, verified at freeze time

- `EMP-0001` … `EMP-0240` typed **text**. This morning that column would have been
  `number, unit "EMP", min -240`. The unit fix holds on a shape it was not tested against.
- `stress-z`'s `part_pct` includes a NEGATIVE share (−9.7, a provision write-back the French
  nomenclature allows) and the parts sum to 100.0 only if you keep it. Typed cleanly as a number.
- `stress-ae` froze 12 rows of a real time series with one pandemic break — the positive control for
  `reveal-order-is-earned`, which must ALLOW this stagger.

---

# Beat AA — the first distribution in six rounds. 13 defects.

`whereIs → done`. **Every printed number verified exact against the frozen data by the controller:**

    rows 240 | drawn 234 | blank 6         (chart: "234 of the company's 240 employees; 6 returned no salary")
    median 31420                            (chart: "Median 31,420 €")
    mean   36516                            (chart: "Average 36,516 €")
    below mean 151 = 65%                    (chart: "151 of them — 65% — earn less than the average")
    above 100k: 3, max 238530               (chart: "3 salaries above 100,000 € — the highest is 238,530 €")

It answers the article's actual editorial demand — *"quoting 'the average salary' is misleading…
show the distribution"* — by drawing median and mean as two separate lines that visibly do not
coincide, and it states its own limit: *"the table carries no job title, grade or hours, so nothing
here explains the tail."* The six blanks are named rather than silently dropped, which was the
denominator question the brief asked.

## AA1 — a row ceiling stated in prose never reaches the machine

A beeswarm was OFFERED on 234 points. The type sheet says in prose when not to reach for one; the
scored path cannot read prose. Same shape as round four's scatter-on-six-rows, one type over.

## AA2 — the two row-count requirements read the wrong count, at a floor of five

`raw-observations` and `distribution` are the only 2 of 46 requirements that consult row count, and
this is the first story with enough rows to satisfy them honestly. They read the wrong count, and a
floor of five is not a distribution.

## AA3 — a custom beat cannot reach `creditLine`

The "unattributed" fix landed in `dw-beat` this afternoon and **misses the custom static path**.
The delivered chart says "Source: not stated" only because this producer wrote it by hand.

## The rest, as reported

Three type-sheet refusals truncated mid-clause in the generated survey · the grounding check has no
shape for a distribution claim · `rowCount` and `column.missing` are never a numeral's home · a
numeral equal to a column's min or max is only `consistent` · thousands separators spelled three
ways · `framingMeasurement` cannot read a histogram's own marks · nothing measures x-tick collisions
(the first render shipped one; fixed in the story) · on a dark ground with a light accent no rule can
cross both and there is no helper · the closing offer asks for a word the recorder refuses.

---

# Beat AE — the positive control for this morning's motion guard. 13 defects.

`whereIs → done`. Verified exact:

    passengers 58.2 -> 74.6 = +28.2%   (chart: "up 28 per cent")
    punctuality 91.4 -> 81.6 = -9.8    (chart: "down 9.8 points")
    2020: 28.1m / 94.6%                (chart: both, joined by a dotted line)

**And it solved the dual-scale problem honestly**: two stacked panels, each with its own axis and
its own colour, sharing one x axis — not a twin-y overlay. 2020 is marked on both and connected, so
the reader sees one event breaking two series.

## AE1 — `reveal-order-is-earned` has a false positive on any MULTI-series time series  ← my own rule, four hours old

The control passes: 12 marks, 12 starts, 12 distinct years → *"the marks arrive in their own
ascending order."* No false positive on the single-series reading.

But the SAME BUILD, enumerated per series per year, is refused:

    reveal (shared head, 12 marks): the marks arrive in their own ascending order
    reveal (per series, 24 marks):  REFUSED — 24 marks hold 12 position(s) between them,
                                    so the order across them is the producer's and not the data's

Both are true descriptions of one build. A mark carries only `start` and `at`, so **a two-series
time series and a snapshot are indistinguishable to the guard** — the refusal text here is verbatim
the one it was earned by on `stress-t`'s eleven countries. Two series legitimately share each year's
x position; the guard reads that sharing as arbitrariness.

The rule needs a notion of a series: marks sharing a position but belonging to different series are
legitimate. Not fixed — the beat prints both readings and renders on the first.

## AE2 — the guard does not reach a real beat at all

`staggerLacksAnOrder` is imported by `chart-video/scripts/render-video.mjs`, which renders the
SKILL's own seed. A story's beat writes its own `render.mjs`, and the only sanctioned route into
shared code is `#shared/*`, which carries `chart-video/sizes.mjs` and `timing.ts` and nothing else.

    ls shared/chart-video/   ->  sizes.mjs  timing.ts

**Neither shipped chart-video story workspace carries the guard**, nor any of the three in
`verify-video.mjs`. This is theme 2 again — a guard that cannot reach the thing it judges — and it
applies to a rule added this morning.

---

# Beat Z — the part-to-whole that could not be one. 18 defects.

`whereIs → done`. The beat is a **diverging bar**, not a part-to-whole — and Z's best finding is the
mechanical reason why.

## Z1 — `part-to-whole` can never fire on a part-to-whole table  ← explains a six-round absence

    "part-to-whole": [measures.length >= 2 && nonnegative, "two or more non-negative measures"]

It requires two or more numeric COLUMNS. A part-to-whole table is long-form by nature — one category
column, one value column. **The canonical shape has one numeric column, so the requirement fails by
construction**, and five treatments depend on it: Diverging stacked bar, Marimekko, Pie and donut,
Stacked bar, Treemap.

That is the mechanical explanation for something I measured before this round began: in six rounds
and twenty-one stories, **no part-to-whole treatment has ever been chosen.** Not taste — arithmetic.

## Z2 — the totality check confirms a sentence that DENIES totality

Verified by the controller on the frozen story:

    part_pct sums to 100          (positive parts 109.7, the negative member -9.7)

    "Les parts font ensemble 100 % du budget."
      supported | column "part_pct" sums to 100, which is the whole (100)

    "La somme des parts est supérieure à 100."
      supported | equals the sum of column "part_pct" (100)

The first is confirmed for an arithmetic coincidence: the column reaches 100 only because a −9.7
provision write-back cancels a +9.7 overshoot. The parts do not make a whole; they cancel.

The second is worse — a sentence saying the sum is **greater than** 100 is confirmed because the
numeral `100` in it matches the column's sum. The checker read the number and not the relation.

## Z3 — `verify-web` asks whether a plot is "a strip" by measuring its HEIGHT

    verify-web.mjs:226   check(m.plot.h >= 100, "the plot is still a chart, not a strip")

A strip is a shape defined by its WIDTH. At 375×812 this beat's first render drew seven bars in a
**five-pixel-wide** column — three fixed gutter tracks taking 322 of 375 px, `1fr` taking what was
left — and the driver reported `52 checks passed, 0 failed` with `plot 327x210`. It measured the
whole grid including its gutters, in the wrong dimension. **The screenshot is what showed it.**

## Z4 — an argued catalogue exception is true of the wrong path

`typeface-is-recorded` records an exception for `chart-web`, reasoned on its vendored
`render-still.mjs` carrying `readTypeface`. That is the STATIC PREVIEW. This format's delivered
artefact is the HTML page, and `render-web.mjs` imports `readTypeface` **zero times** and hard-codes
`font-family: Helvetica, Arial, sans-serif` at line 524. `NEWSROOM.md` records `Space Grotesk`.

The exception was written this morning. This branch's whole premise is that an exception needs a
measured reason; this one measured a path the format does not deliver.

---

# Beat AD — Polish, static, for print. 13 defects.

`whereIs → done`. **The best editorial judgment of the round.** The toolchain never prompted the
per-capita reading — the denominator detector cannot read `ludność` — and the producer computed it
anyway and made it the story:

> **Mazowieckie ma najwięcej łóżek szpitalnych — ale nie na mieszkańca**

Verified by the controller: Śląskie 40.5, Łódzkie 40.2, **Mazowieckie 38.8 (3rd)**, and the raw
count kept as an annotation rather than dropped. Polish diacritics render correctly throughout —
ł, ą, ę, ś, ż, ó, ń — in the title, the labels, the subtitle and the source line. `proposeCredit`
read the article's own source: *Narodowy Fundusz Zdrowia*. And the limit is stated in the subtitle:
the table covers 8 of 16 voivodeships, so no national ranking can be read from it.

**A controller correction.** I checked the printed mean of 38.0 against a simple mean of the eight
rates (37.8) and was about to call it a discrepancy. The chart used the POOLED rate — all beds
divided by all residents — which is the correct average for "the eight together". The chart was
right and my check was wrong.

## AD1 — a denominator in an undeclared language does not weaken the check, it SWITCHES IT OFF

Reproduced by the controller. Same table, same sentence; only the denominator column's NAME changes
language:

    denominator "ludność"     -> scalar: supported
                                 "Mazowieckie"'s own value in "hospital_beds" (21400) is the maximum
    denominator "population"  -> scalar: unverifiable
                                 … — and note that "population" sits beside …

So the English table gets the round-four downgrade and the Polish table gets **`supported`** — a
verdict MORE confident than the one an unreadable claim receives. `findDenominatorColumn` is bound
to the same four languages, and a fifth language reopens round four's finding 5 by a side door.

This is the sharpest form of C1: the lexicon gap is not a missing prompt, it is a false confirmation.

## The rest, as reported

Five of fifteen Datawrapper treatment names match no type-survey row, which silently disables the
only mechanically enforced row limit the survey has · `proposePalette` measures a house palette only
against the ground `NEWSROOM.md` records, so a PRINT delivery found the newsroom's primary accent at
**2.20:1** with nothing objecting · `SUBJECTS.md` is required at G4, produced at G2, and required by
no gate between — `whereIs` answered `production, missing: []` on a story that could not close.

---

# Beat AC — chart, photographs and a map in one scrolly. 21 defects.

`whereIs → done`. `verify-scrolly`: **0 failures at 1600×900, 1280×800 and 375×812**, redraw per
step 91.4% / 25.0% / 63.6%.

## AC1 — `fills-its-frame` reaches eight skills and is called by none  ← MY OWN FIX, FOUR HOURS OLD

Verified by the controller across all eight producing skills:

    chart-beat   present | callers outside the detector: 0
    chart-web    present | callers outside the detector: 0
    chart-video  present | callers outside the detector: 0
    map-beat     present | callers outside the detector: 0
    map-web      present | callers outside the detector: 0
    image-beat   present | callers outside the detector: 0
    scrolly      present | callers outside the detector: 0
    dw-beat      present | callers outside the detector: 0

This morning I re-declared `fills-its-frame` from `ships-standalone-html` to `materialises-a-beat`
and reported it as "the fix for the gap I found earlier — the question now reaches static and video
too". **It reaches them in the catalogue and not in the code.** The file was distributed to all
eight; no producer calls it; the behaviour of all eight is unchanged. By this round's own test — a
fix that does not change what a producer does has not landed — it has not landed.

Theme 2, on a fix I made today, and the reason the triage put "guards that measure nothing" in
tier 2 rather than tier 3.

## The rest, as reported

`reveal-fills-the-frame` still walks a hard-coded list, unchanged · `plateFollowsGround` measured a
PHOTOGRAPH and called it the plate · 5 of 13 `verify-scrolly` guards uncalled, and **nine more guard
kinds declared beyond those** · a slot carries one `medium` so the storyboard contract cannot say
what a mixed-media beat IS · the two scrolly-only types in MATRIX exist in no type sheet · lat/lon
counted as measures · six gap years reported in a series with no gaps · a thousands separator makes
a claim unverifiable · `proposePalette` answers "there is no NEWSROOM.md" about a complete one ·
`bake-plate.mjs` hard-codes `dataviz-light` with no flag.

---

# Beat AB — a flow map on the web, which this repository had never built. 29 defects.

`whereIs → done`. The highest defect count of any beat in six rounds, and the reason is structural:
**`map/web` reports as reachable and `map-web` has no flow machinery at all.** The seed, the pure
core, the live-plan builder and the interaction model are every one of them proportional-symbol.

## AB1 — `fills-its-frame` IS a real guard, and it caught a real defect  ← this refines AC1

Against the delivered page, at three viewports:

    23.2% / 22.3% / 38.6%   against a 17.9% floor — clears

It did **not** on the first render: **16.6% and 14.8%, both under**, on a page whose only fault was
needing a five-row table. The guard is correct and it fires on real material.

So AC1 and this are two sides of one fact, and the honest statement is the narrow one: the rule I
re-declared this morning is **right and unwired**. It catches real defects when a producer writes a
runner by hand, and no producer runs it by itself. "Correct and unreachable", not "useless".

## AB2 — the refusal that should have stopped this beat is in the sentence the survey drops

`flow-map.md` refuses many-to-many origin-destination data in its **second** sentence, and names a
type the catalogue does not hold. `type-survey.mjs` lifts only the FIRST sentence of a refusal.

That is round-four finding 24 — *a treatment is never checked against its own sheet's refusals* —
recurring one level down: the refusals ARE read now, and only the first sentence of each. The half
still missing is the half that decides this beat.

## AB3 — five silent failures, every one found by driving or looking

A 451×2 px map · another route's number under the pointer · a live map that made zero requests · a
live layer with zero ribbons painted · and an export shipping the literal `__MAPTILER_KEY__` while
the hand-over told the journalist no key was recorded.

Checked by the controller on the DELIVERED page: the placeholder is gone, a real 20-character key
is embedded (by design — ruling R1: a web map you cannot move through is a picture), and the
hand-over now names the key it carries, that it is not domain-restricted, and what happens if the
account reaches its spending limit. The agent fixed all five inside the story.

**Every one of them was found by driving the page or looking at it.** Not one came from a test.
