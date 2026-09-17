---
format: web
type: gantt
medium: chart
grounding: supported
derived: v1
---

# Beat — 16 pays sont passés par le top 10 mondial des émetteurs, 6 n'en sont jamais sortis (web)

**Type:** gantt (positioned spans on a shared date axis). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Between 1990 and 2024, **sixteen countries** held a place in the world's ten largest CO₂ emitters at
least once. **Six held it every single year** — China, the United States, Russia, India, Japan,
Germany. Two rows are interrupted rather than continuous (Italy, South Korea) and **Kuwait appears
for a single year, 1991**.

Every span is computed in the runner from the frozen `data.csv` — the same ranking the bump beat
next door reads, taken as **tenure** rather than as position — and asserted before anything is
drawn. Interruptions are found, not listed: a row with more than one span had a gap, and the page
says which years.

## The reader's question, and why no still can answer it

*Vingt-sept ans, c'est long comment ?*

A gantt is the only type in this catalogue whose **mark is an interval**. A bar has a length, a dot
has a position; an interval has **both, and they are two different readings of two different
quantities**: where it sits says WHEN, how long it runs says HOW LONG. One horizontal axis has to
carry them at the same time, and it can only do that by spending its origin: the axis's zero is
1990 for all sixteen rows, so a bar's left edge is a date and its length is a duration measured from
that date.

That spend is what makes the three comparisons a gantt invites mutually exclusive on one plate:

| the question | what the axis has to be | what it costs |
| --- | --- | --- |
| qui était là en même temps | a shared calendar | durations start in sixteen different places |
| qui a tenu le plus longtemps | a shared stopwatch | the dates are gone |
| qui était là en telle année | a shared calendar, read vertically | nothing — it is the first one |

A still picks the calendar, because the calendar is the only one that also carries the overlaps.
And then the second question has no instrument at all: **the reader is asked to compare sixteen
lengths that begin at sixteen different x**, by eye, across a plate 780 units wide.

This file's own data makes that failure concrete, and it is the finding this page exists for:

> **Le Canada et la Corée du Sud ont tenu exactement le même nombre d'années — 27.** Le Canada de
> 1990 à 2016, d'un seul tenant. La Corée de 1996 à 2024, en deux fois, avec deux ans d'absence au
> milieu. Sur le calendrier, ces deux barres ne se touchent jamais : elles sont à cinq lignes et à
> six ans l'une de l'autre, l'une finit là où l'autre commence à peine. **Aucun lecteur ne peut voir
> qu'elles sont égales.**

And there is a second one underneath it, which is the interruption's own price:

> Sur le calendrier comme sur le chronomètre, la barre de la Corée court sur **29 ans** — de son
> arrivée à aujourd'hui. Elle n'en a tenu que **27**. La différence est le trou, et le trou est
> dessiné : mais il faut le soustraire de tête pour comparer la Corée au Canada.

## The gesture — `align.ts`, a new vocabulary: **what every interval is lined up on**

The reader chooses **where each bar's own zero is put**. Three origins, one scale:

| option | x = 0 is | what the axis reads | what becomes visible |
| --- | --- | --- | --- |
| **le calendrier** (default, the plate) | 1990, for all sixteen | 1990 … 2020 | who was there at the same time; the eight handovers; the year each row arrives and leaves |
| **leur propre entrée** | each row's own first year | 0 … 30 **ans écoulés** | the lengths, all from one edge — the Canada/Korea pair lands on the same starting line |
| **les seules années tenues** | each row's own first year, **interruptions refermées** | 0 … 30 **ans tenus** | every bar is now exactly as long as the figure printed at its tip; Korea's 29 becomes 27, Italy's 16 becomes 15, and Korea and Canada are the **same bar** |

**One unit of length is one year, in every one of the three states.** The scale is never recomputed
— 22,29 geometry units per year, from the first option to the last — so the graduations sit at the
same seven pixels throughout and only their WORDS change. That is what makes the three states
comparable to each other rather than three charts that happen to share a frame, and it is the whole
difference between an alignment and a rescale.

Measured on this beat's own frozen file, in years:

| row | entrée | calendrier | depuis l'entrée | années tenues |
| --- | ---: | --- | --- | --- |
| Chine, États-Unis, Russie, Inde, Japon, Allemagne | 1990 | 0 → 35 | 0 → 35 | 0 → 35 |
| Canada | 1990 | 0 → 27 | 0 → 27 | 0 → 27 |
| Royaume-Uni | 1990 | 0 → 19 | 0 → 19 | 0 → 19 |
| Italie | 1990 | 0 → 1, 2 → 16 | 0 → 1, 2 → 16 | **0 → 1, 1 → 15** |
| Ukraine | 1990 | 0 → 6 | 0 → 6 | 0 → 6 |
| Koweït | 1991 | **1 → 2** | 0 → 1 | 0 → 1 |
| Corée du Sud | 1996 | **6 → 8, 10 → 35** | 0 → 2, 4 → 29 | **0 → 2, 2 → 27** |
| France | 1998 | **8 → 10** | 0 → 2 | 0 → 2 |
| Iran | 2006 | **16 → 35** | 0 → 19 | 0 → 19 |
| Arabie saoudite | 2009 | **19 → 35** | 0 → 16 | 0 → 16 |
| Indonésie | 2017 | **27 → 35** | 0 → 8 | 0 → 8 |

The largest travel is Indonesia's, 27 years — **601,7 geometry units**, three quarters of the frame.
The smallest difference the control has to survive is between the second and third options, where
only two rows move at all: Korea's second block by 2 years (**44,6 units**) and Italy's by 1
(**22,3 units**), both well over the **3,697** units one CSS pixel is worth at the narrowest verified
width — measured, not estimated: at 375 px `svg.chart` renders 211 px wide for a 780-unit viewBox, the
same on all three directions. Two rows out of sixteen is not thin — **they are the only two rows that were ever
interrupted**, which is exactly what that option is for.

### Why it is a new file and not one of the nineteen

`datum.ts` is the near miss and the distinction is exact. A datum subtracts **one level, the same
for every mark** — that is its whole shape, one `value` per key per option, and its refusals are
about the SIGN that subtraction produces. This control subtracts **a different number from every
row, and the number is a property of the row itself** (its own entry year). And the two do opposite
things to the mark: a datum changes a bar's LENGTH and leaves its origin at the rule; an alignment
changes a bar's ORIGIN and may never change its length, because a length here is a duration and a
duration is a fact about the world. `assertAlignDeclaration` refuses an option that stretches one.

`stack.ts` is the second near miss. A `StackedColumn { key, dx, dy }` is one rigid displacement per
member, which is the right shape for moving a whole mark — but a row here is not one mark. Italy is
two spans and Korea is two spans, and the third option moves **the second span of a row and not the
first**, by the size of that row's own gap. One displacement per member cannot say that.

`floor.ts` re-places a stack's bands and preserves every value; it is the closest in spirit and the
furthest in geometry (a shear, per step, on a stream). `filter.ts` removes marks — nothing leaves
here, all sixteen rows are drawn in every state. `brush.ts` selects a span OF the axis; this control
changes what the axis MEANS. `level.ts` lays a reference across and moves nothing. `cutoff.ts` draws
the claim's own line — a real temptation on this data, since "top ten" is as editorial as any zero,
but changing the depth of the top **manufactures and destroys rows**, which is a filter's job and a
different beat's argument.

So `align.ts` says **what every interval is lined up on**: a set of spans with fixed lengths, one
declared placement per span per state, one scale, and the axis's own words per state.

### The refusals `align.ts` makes, and two of them no sibling can make

- **A span that changes length.** Lengths are declared ONCE, on the bars, and an option only says
  where each one starts. A vocabulary that let an option carry its own length would let an
  alignment quietly report a different number of years for the same span.
- **Two spans of one row that overlap, or that swap order.** This is the type sheet's own failure
  mode — *"every bar's end has to fall on or after its own start — an inverted span isn't a stylistic
  oddity, it's a broken date pair"* — made mechanical and extended to the thing only this control
  can break: a row's spans are DISJOINT INTERVALS, and an option that closed a gap by too much would
  draw one country as present twice at the same time. Refused per row, per state, by name.
- **An option that moves every mark and keeps the axis's words.** The one refusal that is the
  gesture itself: if the bars are measured from their own entry and the graduations still say
  *1995*, the furniture is lying, and it is lying fluently. An option whose placements differ from
  the default's must differ from the default's tick words too.
- **A span placed off the frame**, either end.
- **Two options that lay every span in the same place**, measured against the geometry units one
  CSS pixel is worth at the narrowest verified width — the reader would operate the control and
  watch the picture not move.
- **An option that lays every span where the default laid it** — `directed-interaction.md`'s own
  rule, the default under a second name.
- Plus the ordinary couture: every option places exactly the drawn spans and no others, one word
  per graduation, no slug collision, no key slugging to the reserved `none`, every note present,
  and every accessible name containing its visible one (WCAG 2.5.3).

## The owner's ruling that bites this type, met head on

*« Rien ne bouge sans que le lecteur voie pourquoi »*, and the re-rank clause: rows that re-rank
under a control were refused twice unless the movement reads as a re-ranking, and it must
interpolate.

**The rows do not re-rank, and the refusal cost something real.** Under the second option the
obvious next move is to sort the sixteen into a ladder — it is one line of code and it would make
"who lasted longest" a single glance. It is refused three times over:

1. **The readout would lie.** `interaction.mjs` resolves the pointer off `cx`/`cy` read **once at
   initialisation**; no CSS transform ever changes them. A re-sorted row would answer for the
   country whose slot it landed in. Here the sixteen readings sit at **one identical x** at their
   own row's height — a coordinate no option touches — so `nearestCell` reduces to "which row",
   and any pointer anywhere in a row resolves to that row in every state.
   `assertAlignRest` is how the beat states it and it is checked against what is drawn.
2. **Sixteen country names would move.** The ruling's own words. A ladder is a reason one can see,
   so this would have been arguable — but it would have been arguable, and the ruling is precisely
   that an argument does not buy the movement.
3. **The rows are already in the order this type asks for.** `types/gantt.md`: *"Rows sort by start
   date, earliest first, so overlapping items cluster visibly rather than scattering in an arbitrary
   row order."* That order is a property of the DATA, not of the chosen origin, so it is true in all
   three states — which is the same argument the diverging bar makes for sorting by a property no
   zero can change.

What is paid for it, stated rather than hidden: under the second and third options the first ten
rows (all of which enter in 1990, secondary-sorted by tenure) form a clean descending staircase —
35, 35, 35, 35, 35, 35, 27, 19, 16, 6 — and the last six do not — 1, 29, 2, 19, 16, 8. **The
alignment makes the lengths comparable; it does not sort them.** The pointer says where a row stands
(*« 2e plus longue tenure »*), because that is a reading, and a reading is what a pointer is for.

**And what does move, interpolates.** Every placement is one `transform: translateX()` on a `<g>`
that is rendered in every state, 560 ms, `cubic-bezier(.4,0,.2,1)`; the tenure figure rides its own
bar's tip on an interpolated `left`; the axis's two sets of words crossfade on `opacity` (paired
with `visibility`, so the set nobody is reading leaves the accessibility tree instead of being
narrated twice). Nothing anywhere is revealed by `display` except the sentence under the pills,
which is text about the control and not part of the picture.

## What moves, and what is nailed down

**Moves:** the twenty spans, horizontally, along the axis the pills name. The sixteen tenure figures,
each welded to its own bar's tip — `datum.ts`'s one allowed movement of text, and the one the type
sheet asks for. The seven graduations' WORDS, in place, without the graduations themselves moving a
pixel. The sentence under the pills.

**Nailed down:** the sixteen country names, the seven graduation positions, the gridlines, the
title, the caveat, the source, the note on Kuwait, the row order, the colours, and the scale.
Nothing moves vertically at all.

## The type sheet's trap, and what it turned out to be here

`types/gantt.md` names two failures. The literal one — *an inverted span* — is absent from this
file by construction: the spans are built by walking sorted held-years, so an end can never precede
its own start. It is **not absent from this page**, and that is the turn: an alignment is exactly
the operation that could invert one, because it re-places both ends of every interval and closes
gaps between them. So the refusal is made anyway, per row and per state, and extended to the thing
that IS reachable here — two spans of one row landing on top of each other.

The second failure is the one this format makes worse before it makes it better: *"because a Gantt
bar's length reads exactly like a plain bar's length at first glance, a reader with no stated caption
explaining that length here means DURATION, not magnitude, can walk away having silently misread
every bar as a value comparison."* Under the second and third options **the plate becomes a plain
bar chart to look at** — sixteen bars from a common left edge. That is the point, and it is also
precisely the misreading the sheet warns about. So the caption is not furniture here, it is the
control's own answer: each option owns a sentence that says what a length means in it, the
graduations change from years to counts of years in the same breath, and the figure at every tip
carries the word *ans*.

## Treatments

- `an-open-span-says-it-is-open` — **spent, and it had to change shape to survive the gesture.** The
  static sibling notates an open span two ways at once, and one of them is *"flush at the axis's
  present edge"*. That answer does not survive here: under the second and third options a row still
  in post ends wherever its duration puts it, nowhere near the edge. So the notation is the taper
  alone, drawn INSIDE the span's own length, and it is now load-bearing in a way it was not on the
  plate — it is the only thing that says "this one has not finished" once the calendar is gone.
- `both-dates-in-the-row-label` — **refused, and replaced.** Sixteen rows with both dates spelled out
  is sixteen strings that are true under one option and meaningless under the other two ("1996–2024"
  says nothing about a bar measured from its own entry). What every row prints instead is the one
  figure true in **all three** states — the years it held — and the dates go to the pointer, which
  can afford them.
- `accent-marks-the-thread` — the six that never left are the accent; the ten that came and went are
  one measured tint of it. `PALETTE.md` records both, against the ground each direction really
  paints.
- `the-subject-is-ringed-not-recoloured` — **refused by a ruling**: a ring plaqued over a mark is
  refused three times in this tree. What answers a pointer is the span itself, lifted off its own
  fill by a sought dose.

## The hard-coded `lineHeight`

This beat is on `KNOWN-STATE.md`'s list of ten. The literal was `lineHeight: 1.05` on the y-axis
label, paired with `whiteSpace: "normal"` — a vertical-rhythm tool aimed at a horizontal-overflow
problem, and one that beat the leading the axis register emits. **Both are gone.** The right lever
is the gutter, measured in a real browser against the widest of the sixteen names, and the names are
back on one line under the shared `nowrap` with the register owning its own leading.

## The systemic defect this type touches

`WEB-TYPE-BRIEF.md` (a): `preserveAspectRatio="none"` plus a `.chart-plot` that renders height under
`max-height: 100dvh` stretches the plot horizontally, so **a shape drawn in the plane is not the
shape it was drawn as**. This type draws one: the taper on an open span. Its horizontal extent is
7 geometry units, and at 1512×860 it renders about 1,4× wider than it was drawn, so the point is
blunter than the source says. A length here is a duration and must follow the stretch; the taper is
notation and should not. **Not patched locally** — no counter-scale is bodged in — and reported so
the single trunk pass can take it with the rest.

## What the render taught, and every one of these was read in a capture or in a driven browser

- **A six-pixel stub of bar showed past every figure that turned inward.** The outward offset was
  being reused for the inward case, so a chip anchored 6 CSS px short of the tip left a sliver of
  bar with no meaning after it — the kind of thing a reader reports as a rendering fault. An inward
  chip is anchored in GEOMETRY now, not in pixels: it ends where the tip ends, minus whatever
  notation that row's end carries. Which is the second half of the fix — the six longest rows are
  all open AND all end at the frame's own edge, so they are exactly the rows whose figure has
  nowhere to go but onto the bar, and a flush chip would have covered the taper that says they have
  not finished.
- **The plate's one annotation was typed at 8 % and the calendar origin put a figure on it.** It is
  derived now: the furthest right the single-year row ever reaches, over all three origins, plus the
  room its own figure takes at the narrowest verified width.
- **The page did not fit a phone.** Adding a control, its reserved caption and a third graduation set
  put `nocturne` 181 px past an 812 px window. Paid for in words, not by shrinking the chart: the
  title is the static sibling's own (11 words against 18), the caveat is two clauses, and the note
  under the plot no longer lists the six countries — they are already named in the gutter, in the
  accent, which at 375 px was three wrapped lines saying what the plate says.
- **The pointer's answer read "à égalité avec Canada".** The give-away of a string assembled rather
  than written. Every member now carries its article beside its name, and a country that reaches the
  top ten without one refuses the render.
- **The hard-coded `lineHeight`** this beat is on `KNOWN-STATE.md`'s list for — `1.05` with
  `white-space: normal` on the y-axis label — is gone, with the overflow it was covering fixed by
  the right lever: the gutter, measured in a real browser at 88 px on creme and rapport and 96 px on
  nocturne for "Arabie saoudite", and set to 116 px. `grep -n lineHeight` over the component now
  returns nothing but two comments explaining why.

## The pointer's answer, and what it is paying for

`Corée du Sud · 27 ans tenus sur 35 · 7e tenure la plus longue à égalité avec le Canada ·
1996–1997, 2000–2024 · absente en 1998–1999 · entrée 6 ans après l'ouverture du relevé · meilleur
rang atteint : 7 · toujours présente au dernier relevé` — seven readings, and the two that matter
are the ones the refusal to re-sort took away (*where this row stands in the tenure order*) and the
one the second origin subtracts (*how long after the record opened it arrived*). Both spans of an
interrupted row light together, because the reader is asking about a country and a country with a
gap is still one country.

## Verification

`verify-web.mjs` per direction: **creme 105/0/5, nocturne 99/0/5, rapport 93/0/5.** The five skipped
are the filter checks and the filter control's own affordance, which this beat has no filter for.

`bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/filter-vocabulary-parity.test.ts`
— **410 pass, 1 fail**, the one being `chart-web — the canon's assets … preview.png is a current
render of the seed`, a stale committed render of a seed this beat does not touch and which the
connected-scatter sibling records failing the same way. And
`bun test skills/splash/test/{a-directed-plate-names-no-colour-of-its-own,a-directed-layout-types-no-leading,a-leading-is-read-only-through-the-register,filters-are-declared-or-absent,number-format-honest,notes}.test.ts`
— **310 pass, 0 fail**.

The control driven in a real browser at 1440x900, every pill clicked, **once with the script on and
once with it off** — the two runs are byte-identical in all three directions, which is the whole
claim the mechanism makes. Read back off the rendered geometry rather than off the declaration:

| state | graduations | Corée du Sud | Canada |
| --- | --- | --- | --- |
| le calendrier | 1990 … 2020 | 133,7 → 178,3 and 222,9 → 780 | 0 → 601,7 |
| leur propre entrée | 0 … 30 | 0 → 44,6 and 89,1 → **646,3** | 0 → **601,7** |
| les seules années tenues | 0 … 30 | 0 → 44,6 and 44,6 → **601,7** | 0 → **601,7** |

Under the third origin the two bars end on the same geometry unit, five rows apart — the finding,
rendered rather than asserted. `ArrowRight` from the first radio moves focus and selection to the
second in all three directions.

### Mutations — five run, four refused, one green and repaired

1. **An origin that closes a gap by one year too many.** Refused in all three directions, by name:
   *"option « les seules années tenues » puts "ITA-0" at 0.000…1.000 and "ITA-1" at 0.000…14.000 —
   two intervals of row "ITA" overlap"*, and the runner exits 1. This is the refusal no sibling
   vocabulary can make.
2. **An origin that moves every mark and keeps the default's graduation words.** Refused: *"moves 7
   of 18 intervals and keeps every one of the default's graduation words … an axis still reading
   "1990" is furniture that lies about what it graduates"*. This is the gesture's own refusal.
3. **`alignCss` dropped from the beat's assembled stylesheet — AND IT WENT GREEN THE FIRST TIME.**
   `assertAlignStylesheet` was being handed `alignSheet`, the string the vocabulary returned, which
   was still perfectly well formed; what had gone missing was its presence in the array that reaches
   the `<style>`. The page shipped with eighteen intervals stacked flush on the left margin, all
   three states at once, and `verify-web.mjs` reported **103 passed, 2 failed** — `aim.ts`'s own
   recorded hole arriving at a second vocabulary, in a second form. **Fixed:** the guard is handed
   `css`, the text the page actually carries. Re-mutated, it is refused in all three directions and
   the runner exits 1.
4. **The pointer dose raised from 0,3 to 0,6 — GREEN in all three, and that was itself the finding.**
   The two floors this beat shipped are minima, and nothing capped them from the other side; at 0,6
   the neutral's pointer step measures 3,649:1 on creme against the 2,191:1 that separates the two
   fills. The diverging bar's third guard had been declined here on a reason that is still true for
   the reader (colour carries a group, not a sign) and does not cover the author. **It is shipped
   now**, in this page's own terms, and re-mutating refuses `creme` (3,649 against 2,191) and
   `rapport` (3,693 against 2,337) while staying correctly green on `nocturne`, where lightening a
   mint on a dark ground moves the ratio far less. `PALETTE.md` carries the table.
5. **The dose lowered to 0,05**, and **the sixteen readings spread along the axis instead of sharing
   one x**. Both refused in all three directions, the first quoting the step it found (1,070 / 1,026
   / 1,078 against the 1,12 floor), the second quoting the two x it found.

One gap named rather than papered over: `interaction-plan.ts`'s `shippedControls` discovers a control
by its radio-id prefix and knows `chart-filter-`, `chart-stack-`, `chart-level-` and `chart-cutoff-`
only, so a `chart-align-` group is invisible to the format's mechanical "every control changes the
picture" refusal — as `fold`, `brush`, `trace`, `floor`, `reorder`, `aim` and `datum` already are.
This beat therefore ships no `interaction` plan (declaring a gesture the detector cannot see is
refused), and the refusals are made instead by `assertAlignDeclaration` and `assertAlignStylesheet`,
in the vocabulary's own terms.

And one narrow-width debt, stated: `.align-notes` reserves 3 em so the plot does not move under the
control, which holds at 1440 and does not at 375, where the longest caption runs to four lines.
Choosing an option at phone width moves the plot. `floor.ts` and `datum.ts` record the same debt for
the same reason. The plot itself comes to 211 x 135 px at 375 (105 on nocturne, which is the format's
own floor), where sixteen fixed-size figures over a plot a quarter of the size collide — the right
instrument is a size container per label, and it is not built here, deliberately: the standing
instruction is desktop first and mobile once the desktop is validated.

## Source

Global Carbon Budget (2025), via Our World in Data · 1990–2024, ranking computed over the 215
countries in the file. `data.csv` is a byte-for-byte copy of
`proof/static-gantt-top-ten-tenure/data.csv`, per this corpus's "duplicate, do not link" ruling.

## The choreography

The declaration below is this beat's own `const interaction`, in the shape
`chart-web/scripts/choreography.mjs` cuts out of a source. It lives here rather than in
`render-directions-web.mjs` because this beat's controls are built by a vocabulary of its own that
`shippedControls` cannot see, so no plan travels with the render — the reason the section above
already records. The block under it is what the parser reads out of it.

```js
const interaction = {
  earns:
    "A calendar answers who was there at the same time and hides how long each one stayed; lengths " +
    "measured from sixteen different starting years cannot be compared by eye. A still fixes one " +
    "origin. Here the reader moves every interval's own zero while one unit of length stays one " +
    "year in all three states.",
  controls: [
    {
      question: "Ils ont tenu combien de temps, eux — et ça fait quoi si on les aligne tous sur leur entrée ?",
      gesture: "toggle-a-comparison",
      changes:
        "Every bar slides to its new origin on a scale that is never recomputed — 22,29 geometry " +
        "units per year throughout — so the seven graduations stay at the same pixels and only " +
        "their words change, from calendar years to years elapsed to years actually held. The rows " +
        "do not re-rank, and closing the interruptions makes Korea and Canada the same bar.",
    },
    {
      question: "Cette barre-là, elle vaut quoi, et où se place-t-elle dans l'ordre des durées ?",
      gesture: "ask-a-mark",
      changes:
        "Both spans of an interrupted row light together, because a country with a gap is still one " +
        "country, and the row answers with seven readings — its years held out of the years open, " +
        "its rank in the tenure order, its blocks, its absences, how long after the record opened it " +
        "arrived, its best rank, and whether it is still there.",
    },
  ],
};
```

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "toggle-a-comparison",
      "input": "tap"
    },
    {
      "order": 2,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "spans-are-computed-in-the-runner": null,
    "no-span-may-be-inverted-and": null,
    "the-printed-figure-at-a-bar": null,
    "asserted-in-the-js-off-floor": null
  }
}
```
