---
format: web
type: diverging-bar
---

# Beat — La Croatie est le seul pays de l'Union à émettre plus de CO₂ par personne qu'en 1990 (web)

**Type:** diverging bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Of the 27 EU member states, **exactly one** emits more CO₂ per person in 2024 than in 1990 —
**Croatia, by 0,03 t** (4,73 → 4,76). The other 26 all fall, by **4,93 t on average**, and Luxembourg
by **20,48 t**, the largest fall in the union.

The beat throws if the number of risers is not exactly one, and asserts every one of the 27 carries a
reading in both years before anything is drawn — a diverging bar with a country silently missing is a
ranking that is wrong and does not know it.

## What the web adds

**A diverging bar draws a difference, and a difference hides both of the numbers it came from**: a
fall of five tonnes could be 25 → 20 or 7 → 2. Every row here answers with both endpoints, the
change, and where the country sits in the ranking of falls — three readings the plate has no room for
beside twenty-seven names.

The pointer resolves in both axes (`data-hit="cell"`): twenty-seven rows stack vertically and share
every x, so an x-only answer would name the wrong country.

## Treatments spent

- `sign-is-direction-and-hue-only-doubles-it` — the **side** of the zero line carries the sign;
  colour repeats it. A reader who cannot separate the two hues still reads the chart correctly.
- `the-neutral-straddles-the-centre` — the zero rule is drawn in ink **over** the bars, because it is
  the only line here a reader measures against and a bar crossing it would hide it.

The right half of the frame is almost empty, and that **is** the finding: the axis stays symmetric
about zero rather than being cropped to the data, so the emptiness is visible as emptiness.

## What the render taught

The subject's note was first placed over the zero line at the top — directly on the subject's own row
and its own value label. It sits on the empty side now, where it is the only thing to read. Two
country names were clipped by the label gutter; the gutter is wider and names wrap.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**. One earlier failure
is worth recording: the note, lifted out of the svg's own rectangle with `translateY(-100%)`, sat
over the figure's padding where the hit area cannot answer for it, and the format's own "pointing at
the overlay still resolves to a reading" check went silent at two viewports.

## Source

Global Carbon Budget (2025) · population with major processing by Our World in Data · 1990 and 2024.
`data.csv` is a byte-for-byte copy of `proof/static-diverging-bar-eu-per-capita/data.csv`.
