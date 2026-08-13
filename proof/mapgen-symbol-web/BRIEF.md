# Beat — the biggest circle on this map is only 2.9 % wider than the next

**Type:** proportional symbol. **Medium/format:** map / **web** — one self-contained
`quake-symbol.html`, drawn over a 1000 × 1000 plate frozen beside this brief (`plate/`, with its
`geometry.json`). The static and video formats of the same seventeen events are
`proof/map-quake-symbol`; this is the missing third cell.

## Claim

Of the great earthquakes in this file, the 2011 Tohoku event is the largest — **magnitude 9.1**,
against a next-largest of **8.6** — and **its circle is 2.87 % wider than that one**, about
**1.25 pixels** at the plate's own scale. The ranking the map is about is not readable from the map.
That is the claim, and it is why this beat exists in the web format: hovering, focusing or reading the
table gives the exact magnitude the encoding cannot.

## Why this type earns the WEB format

A still and a video can both SAY that magnitude is logarithmic and the circles barely differ; both
of the siblings do. Neither can let a reader ask a circle what it is worth. This format can, and the
addition is not decoration — it is the only channel on which the beat's own comparison is legible.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific.
- `quakes-symbol.csv`: **17 rows**, `time, mag, longitude, latitude, place` — the same frozen file
  `proof/map-quake-symbol` carries, copied so this beat reads only what is committed beside it.
- Extent: longitude 97.05 → 166.38, latitude −12.52 → 46.59. The camera is `[[90,-19],[173,53]]`, the
  same box the static and video siblings bake, so all three formats of this story share one camera.

## Exact values — computed by `render-web.mjs` at every render, never typed

| What | Value | How it is derived |
| --- | --- | --- |
| Events | 17 | `rows.length` |
| Window | 2005–2017 | `yearWindow()` over the rows' own ISO timestamps |
| Magnitude floor / peak | M7.8 / M9.1 | min / max of the file |
| Subject vs. second | 9.1 vs 8.6 | `drawOrder`, and `symbolClaimViolations` throws if any event matches or exceeds the subject |
| Circle ratio | 1.028659 → **+2.87 %**, **1.25 px** | through the beat's OWN `radiusScale`, so the sentence cannot drift from the circles |
| Energy, subject over second | **5.6×** | `energyRatio(9.1, 8.6)` |
| Energy per whole magnitude step | **31.6× → "about 32×"** | `energyRatio(1, 0)`; no hand-waived constant |
| Closest pair on the plate | Singkil / Sinabang, **3.6 px** apart at plate scale, **34 km** | pairwise minimum, then haversine |
| Arcs | Eastern China 1 · Japan & Kuril 5 · Melanesian 6 · Sunda 5 | `arcOf`, from each event's own coordinates |

## Subject and accent

One accent (`#0B7A75`, `PALETTE.md`, house origin) on one mark: the subject circle's fill and
outline, plus its own `M9.1` label. Every other event is the derived muted grey — a second hue on a
univariate map would invent a second variable. Radius is `scaleSqrt` rooted at zero over `[0, maxMag]`:
an equal-AREA encoding, never a linear radius.

## Hierarchy of the proof

1. The title, which states the claim in full before any interaction.
2. The accent circle and its `M9.1` label — drawn unconditionally; no control on the page can remove
   them.
3. The legend, whose three reference circles are visibly almost the same size. That is the argument,
   not a failure of the legend.
4. The per-event exact value, on hover, on keyboard focus, and in the table.

## The controls, and the tests they had to pass

- **Filter — SHIPPED.** By seismic arc, four groups (5 / 5 / 6 / 1). The dimension is orthogonal to
  the encoded variable (magnitude), so narrowing never hides part of the claim, and it is DERIVED
  from each event's own coordinates by `arcOf` rather than typed into a column: a row that falls in
  no named box throws instead of landing in a silent "other". One group holds a single event (the
  2008 Sichuan quake, the only continental one in the file) — that is a fact about the data, not a
  filter designed around it. Pure CSS (`:checked` + `:has()`), so it works with JavaScript disabled.
  The default, "All arcs", is SSR'd checked: a reader who never touches it sees all seventeen.
- **Bounded zoom — NOT shipped, and the reason is measured.** The format's zoom exists for points too
  dense to reach at the narrowest width. Here the worst pair is 34 km apart on a camera 83° wide:
  at 1600px that is 6 px between centres against a 28 px target, and no bounded multiplier this format
  would allow closes it. A control that looks like it solves the problem and does not is worse than
  no control; the answer is the table and the keyboard, both of which reach every event.
- **Accessible table — ON.** `regionTable: true`, deliberately. Seventeen magnitudes whose circles
  differ by under 3 % cannot be ranked by eye, so the table is not a fallback here, it is the channel
  the comparison is legible on. It also carries the events whose hit target is covered by a
  neighbour's.

## What was verified by driving a real browser (1600×900, 1024×768, 375×812)

Real pointer moves at rounded integer coordinates, `document.elementFromPoint` at every target's own
centre, real clicks on every chip, real key presses, and a JavaScript-disabled pass.

- **Fit:** the whole beat inside the window at all three sizes (884/900, 752/768, 796/812); nothing
  scrolls inside the visual. The table below it is normal document reading.
- **Plate:** baked aspect 1.0000, drawn aspect 1.0000 at every viewport — Δ 0.00000. Never stretched.
- **Type:** title 21 px and labels 12 px at all three widths; only the geometry scales.
- **Hover:** 13/17, 11/17 and 9/17 events answered a real pointer at their own centre (1600 / 1024 /
  375). Every tooltip matched the frozen csv; moving away always cleared it.
- **The covered ones are always the smaller event.** `targetOrder` lays the hit targets down smallest
  first, so where two collide the one on top is the larger — the M8.6 the claim is measured against
  is reachable at every width, and the covered events keep their tab stop and their table row
  (checked: the Sinabang M7.8, covered at every width, announces its own value from keyboard focus).
- **Filter:** each chip is a 32 px target, a real click at its centre lands inside it, and each
  narrows the map, the circles AND the table to exactly its own arc (1 / 5 / 6 / 5). Clicking back to
  "All arcs" restores all seventeen.
- **Keyboard:** Tab reaches the filter group in one press, ArrowRight narrows the map with no script
  involved; Tab reaches a point in two, and its value is announced from focus alone.
- **No JavaScript:** all seventeen points, the subject label and all seventeen table rows render, a
  real click on a chip still narrows to that arc, and every hit target keeps its native `title`.

## Anti-patterns for this case

- Never linear-scale a symbol's radius. Area is what a reader compares.
- Never let a reader read circle area as energy. The legend caption states the scale and the caveat
  states the logarithm, and both are drawn in the frame, not behind an interaction.
- Do not label every point. Label positions are percentages of a frame that changes size while label
  width is a fixed number of CSS pixels, so a declutter computed once is wrong at every width but one.
  The only label drawn is the subject's, which is the claim.
- Do not describe a difference the geometry does not make. The sibling beat once called this circle
  "the largest by a wide margin"; through the same scale it is 2.87 % wider.

## Found and NOT fixed

- **A mojibake in the frozen source data**, inherited from the sibling: row 12's place reads
  `47 km E of ?arai, Japan` — USGS's own string is "Ōarai". It is in `proof/map-quake-symbol`'s copy
  too. Correcting it means editing frozen data that another beat is rendered from, which is an
  editorial call about provenance, not a rendering fix.
- **On a phone this map cannot be pointer-interrogated**, and no wording hides it: 8 of 17 targets
  are covered at 375 px. The caveat says so in the frame, and the table and the keyboard carry every
  reading.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), western Pacific, M7.8+, 2005–2017 · basemap © MapTiler, © OpenStreetMap`
(Derived: the magnitude floor and the window are read out of the frozen file at render time.)
