---
size: landscape
type: diverging-bar
---

# Beat — Croatia is the only EU country emitting more CO₂ per person than in 1990

**Proves:** of the 27 EU member states, exactly one emits more CO₂ per person in 2024 than it did in
1990 — Croatia, by 0.03 tonnes (4.73 → 4.76). The other 26 all emit less: by 4.93 tonnes per person
on average, and Luxembourg by 20.48, the largest fall in the union.

**Medium / format:** chart / **static**. **Type:** diverging bar — one row per country, signed values
growing left and right out of a zero line, rows sorted from the largest rise to the largest fall.

**Its siblings.** `vidz-diverging-bar-eu-per-capita` is the VIDEO of this same claim and was built
first; `webz-diverging-bar-eu-per-capita` is the WEB one. The three together are the first complete
type × format row for the deviation family, which no format in this corpus carried at all before the
video landed. Each is written fresh — no file here is imported from either sibling, and the frozen
`data.csv` is a copy, so this beat can be rendered and audited on its own.

**Frame:** 900 × 1000. Twenty-seven rows want the height: at the corpus's usual 900 × 560 each row
would get 12px to hold a country name, a bar and a value label.

## Data

- Source: Global Carbon Budget (2025); population based on various sources (2024) – with major
  processing by Our World in Data, indicator `co-emissions-per-capita`.
- `data.csv`: **4,357 data rows**, the full time series for the 27 EU member states, frozen unedited
  beside this beat. `render.mjs` reads the two years it needs out of it and asserts that all 27
  carry a reading in both.
- Unit: tonnes of CO₂ per person, fossil fuels and industry only.

## Exact values — computed from `data.csv` (change in tonnes per person, 1990 → 2024)

| | Country | 1990 | 2024 | Change |
| --- | --- | --- | --- | --- |
| ▲ | **Croatia** | 4.7332 | 4.7647 | **+0.0315** |
| ▼ | Cyprus | 5.8955 | 5.3739 | −0.5216 |
| ▼ | … 24 more … | | | |
| ▼ | Estonia | 23.5025 | 6.1055 | −17.3970 |
| ▼ | Luxembourg | 30.9378 | 10.4596 | −20.4781 |

Rose: 1. Fell: 26. Mean of the falls: −4.9281. Largest fall: Luxembourg, −20.4781. Smallest fall:
Cyprus, −0.5216. Croatia's rise as a share of its own 1990 reading: **0.667%**.

**"The only" is the fragile kind of claim**, so `render.mjs` asserts every part of it and throws
rather than shipping it stale: that all 27 member states have a reading in both years (a partial
field cannot support "the only EU country"), that exactly one rose, and that the remaining 26 all
fell with none exactly flat. The title, the subtitle, the axis title, the rule's label, the
subject's annotation and the whole alt text are derived from that same computation — nothing in the
rendered output is typed.

**And the margin is stated, not buried.** Croatia's rise is 0.03 tonnes on a base of 4.73 — 0.667%.
A headline that says "the only country" about a change that small owes the reader its size, so the
subtitle gives both readings and calls the rise small.

## What the STATIC format owes here that the video did not

This is not the video with the timing removed. A video can spend ten seconds introducing the zero
line, growing each bar out of it and only then descending the average rule — at no single instant
does it hold every word this frame has to hold at once. A still has one instant, and three
consequences follow.

1. **Every label legible at rest, simultaneously.** All 27 value labels are printed from the start,
   over four gridlines, the zero line and the dashed average rule. The video's labels faded in one
   row at a time and rode their own bar's growing tip, so the crowded band around −4.93 was never
   fully populated until the last frame.
2. **The subject is a sliver and a still cannot ring it in time.** Croatia's +0.03 on a 21.3-tonne
   domain is **1.3 pixels** of accent. The video spent a spring, a ring and a wash on it over 40
   frames. Here the row carries three redundant, motionless signals: an accent-tinted band, a bold
   name, and a direct annotation ("the only rise since 1990") printed into the empty half of its
   own row — the span left of zero that this one row, uniquely, does not use.
3. **The one thing the video could show and this cannot** is the sign being TAKEN — a bar growing
   out of zero to one side. That is the video's own reason to exist and it is not simulated here.

## Anti-patterns for this case

- **The domain genuinely straddles zero**, and the component throws if it ever stops doing so: a
  diverging bar drawn on a one-signed domain is a plain bar chart with a decorative complication,
  and the type sheet says exactly that.
- **The domain is not made symmetric.** Mirroring a −20.5 fall with a +20.5 half nobody occupies
  would halve the pixels per tonne on both sides to make room for nothing. Equal units per pixel
  either side of zero is what makes two bars comparable; the visible asymmetry is the data's.
- **The zero line is drawn on top of the bars**, so no fill can cover it — the sheet's own
  requirement, and the reason it is not painted before them.
- **Croatia's bar is not given a minimum visible width.** It is 1.3px because it is 0.03 tonnes.
  Padding it to "at least 3px so you can see it" would be a false statement about length on a type
  whose entire encoding is length, and the three signals above exist precisely so that honesty
  costs the reader nothing.
- **Every value label is signed explicitly**, with U+2212 rather than a hyphen, and stays in page
  ink. A label in the bar's own fill is this family's named WCAG failure.
- **Rows are sorted by value, descending**, so the one rise sits at the top and the deepest falls
  sit together at the bottom.
- **Two fills, one per sign — and the second is not an invented hue.** The recorded palette carries
  one accent, so the positive fill is that accent and the negative fill is the furniture's own
  `muted`, derived from the ground. See `PALETTE.md`. On this type colour encodes the SIGN, so the
  accent is spent when the positive bar arrives; here that costs nothing, because the subject IS the
  only positive row.

## Verification — what was looked at, and the two defects looking found

Rendered, then opened, then re-cropped at 6× and 9× around every place two things could touch.

1. **The white halo punched ragged holes through the subject's accent band.** The value labels carry
   a ground-coloured halo (see below); against a *tinted* band a white halo reads as a smear, not a
   highlight. Fixed at the colour, not by removing the halo: the band's fill is now composited once
   (`blend(ground, accent, 0.12)`) and drawn OPAQUE, and the two labels on that row stroke their
   halo in exactly that same colour — matching by construction rather than by eye.
2. **The −5 gridline landed 2px from the dashed average rule at −4.93** and the two read as one
   smeared line, printing a tick the reader could not locate. Fixed by dropping any regular gridline
   within `MIN_GRIDLINE_GAP_PX` (24) of the rule, MEASURED in pixels rather than by comparing tick
   values — the same interval is a collision on this frame and comfortably apart on a wider one. The
   rule's own label already states −4.93 at that position, so nothing is lost.

**The defect this beat was written to avoid, and did.** Its video sibling shipped, and had to fix, a
conclusion rule that struck clean through four value labels and turned Malta's "−3.39" into what
reads as "+3.39" — a reader would have seen a country RISE that fell. That is a claim defect, not a
cosmetic one, and this frame is DENSER than the video frame ever was, so the collision is guaranteed
rather than possible: measured on this render, the value axis runs at **28.54 px per tonne**, a
value label is 32–40px wide, and the rule stands **28.2px** from the near edge of the label of a row
one tonne away from it — inside the label, every time. Two things answer it together and neither alone
is enough — **draw order** (both rules, then every value label) and a **ground-coloured halo**
(`paintOrder="stroke"`), so a label crossing a gridline anywhere else stays readable too.

**Checked at 9×, by looking:** the rule passes beside −3.12, −3.39, −3.94, −4.01 and −4.09 with
every minus sign intact and unbroken; where the rule's own path runs through a label it is cut clean
and resumes above and below the row. Checked at 6×: the subject band is uniform, the annotation and
"+0.03" sit either side of the zero line without touching it, and "Luxembourg" and "−20.48" are
clearly separated — the name gutter sits OUTSIDE the value gutter, which is the fix for the video's
own first-render "Luxembo—20.48".

## A guard gap found while proving these beats can go red

`claims-grounded-in-data.test.ts` reads a reader-facing string either as `prop:` inside an object or
as a `const` whose own name is a reader-facing prop. Its expression reader does not treat `;` as a
terminator, so **a claim `const` declared immediately after another claim `const` is swallowed by
its predecessor's expression and never scanned** — the scan's own `lastIndex` is advanced past it.

Measured on a COPY of this tree (never the shared one — one agent's mutation here has already turned
the suite red for five other people): with `title` and the caveat/subtitle as consecutive `const`s,
replacing a figure inside the SECOND one with a value the frozen data cannot reproduce left the
guard **GREEN**. Both beats' claim strings now live in one `words` object instead, where every entry
ends at its own comma — which the reader does terminate on — and the same mutation turns the guard
**RED**, naming the line, the prop and the value. The tests themselves are untouched; this is a
change to the beats, not to the guard.

The guard's own limitation is worth recording separately, because it applies to every beat in the
corpus that declares two claim strings in a row and is not something these two beats can fix for
anyone else.

**And a second limitation, quantified on this beat's own data:** with 4,357 readings frozen beside
it, small values ground by accident. `0.05` and `4.71` — neither of them true of this chart — both
ground here (`0.053945992` and `4.712864` are real rows). The mutation proof above had to use
values no rounding of any reading can reach. This is the guard's own documented
grounds-by-coincidence hole, met in practice.

## Source line

`Source: Global Carbon Budget (2025); population based on various sources (2024) – with major processing by Our World in Data · fossil fuels and industry only`

## Alt text

Computed by `render.mjs` from the same figures and shipped as the SVG's `<desc>` — never a root
`<title>`.

## Size, and the packing it forced — 2026-08-11

**Pinned: landscape (1920 x 1080).** Front matter above; `render.mjs` reads it with `readPinnedSize`
and the delivered PNG is measured from its own IHDR. It shipped 1800 x 2000 before, a size nobody
chose.

**The inversion this beat pays for.** The old frame was 900 x 1000 and the 1000 was chosen FOR
twenty-seven rows: width fixed, height following the content. R2 pins both, so the content has to
fit the frame. At 1920 x 1080, after a headline, a standfirst, an axis and a credit, 27 rows get
**12.6 px of pitch each against a 29 px row label** — every name printed through its neighbours,
with `assertTypeFloor` GREEN (the type genuinely is 29 px) and `assertPlotAspect` silent (a
band-scale type has no measured aspect range, so it never clamps). Neither guard can see it. The
beat now measures its own row pitch and refuses under it.

**What a landscape frame has that the old one did not is WIDTH.** So the rows pack into columns —
each column its own name gutter, value gutter, zero line and axis, all on the SAME domain and the
SAME panel width, so pixels-per-tonne is identical everywhere and any two bars stay comparable.
That invariant is the one thing the packing may not cost.

The ladder is run **speculatively**, in its own order, and the first candidate reaching the fewest
columns anything reaches is drawn — `type-at-size.mjs`'s own "applied speculatively and kept only if
the slack actually improved", made mechanical:

| candidate | plot height | columns |
|---|---|---|
| keep everything | 339 px | 3 |
| R1 (axis title) | 401 px | 3 |
| **R1 + R3 (standfirst keeps its first sentence)** | **489 px** | **2** ← drawn |
| R1 + R7 (standfirst entirely) | 546 px | 2 |

Three columns is not merely worse, it is refused: a column costs a name gutter (209 px) plus two
value gutters (119 px each) before one pixel of bar is drawn, and a third column leaves 193 px of
panel against 328 px of gutter — a table with a decorative complication. The rungs that fired are
written into the artifact itself as `data-ladder` on the root `<svg>`, and the runner reads them back
out of the markup rather than recomputing them, so the record and the drawing cannot disagree.

**Two defects caught by looking, both fixed:**
- 27 rows in 2 columns is 14 and 13, not 13.5. Counting the pitch on `n / columns` landed at 28.6 px
  against a 29 px floor — half a row's worth of error. It counts `ceil(n / columns)` now.
- R1 folds the unit into a tick label, and the first render put it on the tick nearest zero: "−10
  tonnes" grew until it touched "−15" and the axis lost its spacing. It goes on the **outermost**
  tick — the first one read.

**Square and portrait: REFUSED at R9.** Both are 1080 wide, and at a 36 px type floor one column's
gutters alone cost 473 px of it (a 282 px name gutter plus two 161 px value gutters). There is no
width left to spend on the height, which is the whole mechanism this beat depends on.
