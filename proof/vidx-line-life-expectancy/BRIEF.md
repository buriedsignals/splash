---
size: landscape
type: line
---

# Beat — Switzerland has kept a longer life expectancy than France for over three decades

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and what the other two sizes cost.** A line resists rotation — its x axis is
time, read left to right — so it has no twin form. What it has is the one MEASURED aspect range in
this lot (0.8:1 to 1.8:1, `type-at-size.mjs`), so square and portrait are `clamp` rather than
`refuse` and `assertPlotAspect` decides them at render time instead of a comment deciding them
here. Landscape is pinned because it is R2's row for video and because a slope read at 16:9 is the
shape this beat's claim was written against; the 1080 x 1080 it used to draw at was not a
decision, it was a default.

**What the two other sizes actually did, rendered rather than reasoned.** Portrait REFUSES, and the
refusal is the guard's own: the plot comes back 285 x 1158 — 0.25:1 — because the two end labels
need a gutter that is more than half of a 1080 px frame, and `assertPlotAspect` names the range it
is outside. Square PASSES both guards at 0.83:1 and is still a chart nobody should publish: the
render was opened, and the "80 years" reference label sits across both lines while the end labels
overflow the plot to the frame's edge. That is a datum about the range and not only about this
beat — 0.8 is the floor `type-at-size.mjs` carries with `suspect` set on it, learned from a square
render that was already stretched. It is used as given here, and it is reported.

**Proves:** since 1990, Switzerland's life expectancy at birth has stayed continuously above
France's — both countries crossed 80 years, and by 2023 they sit within a year of each other.

**Medium / format:** chart / video. **Type:** line (two series) — the video format's own copy of
`chart-video`'s seed shape (a series drawn against a fitted, non-zero axis) extended to two
series drawn together, which is what earns this beat its own component rather than a third copy of
a single-line beat: the type's own documented trap (`references/types/line.md`, "The trap that's
specific to this one") is two end-labels landing close enough to collide, which a single-series beat
never exercises. Two hues total (Switzerland accent, France muted-but-named), reference level drawn
before either line.

## Data

- Source: Our World in Data, `life-expectancy` grapher (UN World Population Prospects 2024 & other
  sources, via Our World in Data), filtered to Switzerland and France.
- Fetched: `https://ourworldindata.org/grapher/life-expectancy.csv?csvType=filtered&country=~CHE~FRA`
  — verified effective (2 entities only, not the full ~200-country set).
- `data.csv`: **356 data rows** (357 lines with the header), **1816–2023**, 2 countries — France 208
  rows from **1816**, Switzerland 148 rows from 1876 (Switzerland's series starts later than
  France's; the beat draws only **1990–2023**, the window both countries share cleanly and where the
  finding — a persistent, narrowing gap — is legible; filter at render time, never re-fetch).
  *(Corrected 2026-08-09: this line said 355 rows and 1751 for France's first year. The file has no
  trailing newline, so `wc -l` reports one fewer line than it holds and the header was subtracted
  from the wrong number; 1751 is not in this file at all. The counts and spans above are parsed
  records.)*

## Exact values — verified 2026-08-08

| Year | Switzerland | France | Gap (CHE − FRA) |
| --- | --- | --- | --- |
| 1990 | 77.3851 | 76.8351 | +0.55 |
| 2000 | 79.8340 | 79.0438 | +0.79 |
| 2010 | 82.2873 | 81.4047 | +0.88 |
| 2020 | 83.0626 | 82.1993 | +0.86 |
| 2023 | 83.9536 | 83.3253 | +0.63 |

Switzerland's line sits above France's at every single year in the 1990–2023 window (never crosses)
— "kept a longer life expectancy... for over three decades" is accurate for the whole span, not just
the endpoints. Both cross 80 years within the window (Switzerland around 2003, France around 2007),
which is why 80 is the reference level: a round, real milestone both countries actually reach, not
an arbitrary axis tick.

## The motion problem

Both lines share the same x-axis (time) and draw at the same pace, chronologically, left to right —
neither may lead the other, because "Switzerland stayed ahead" is a claim about the WHOLE span, not
just who arrives first. The two end labels ("Switzerland · 83,95" and "France · 83,33") land within
0.63 years of each other on an axis where the full range spans roughly 77–84 — close enough in pixel
space to collide if placed at the literal endpoint height. Per `line.md`'s trap, colour is not a
sufficient cue between an accent and a muted-but-named line for a reader with a colour-vision
deficiency, so the labels are nudged apart vertically (Switzerland's up, France's down) rather than
letting the two print on top of each other.

## Anti-patterns for this case

- Axis is NOT zero-anchored (`line.md`: zero is a length rule, this is a slope/position instrument);
  the fitted extent (reference joined in, per the seed's own `yScale`) keeps both lines' slopes
  legible instead of flattening a ~7-year climb onto a 0–85 axis.
- No dashed bridge across any gap — this window has none (both series report every year 1990–2023).
- The reference (80 years) draws once, left to right, before either line — not a second copy of a
  number already on an axis tick.
- Subject (Switzerland) gets one ring + bold label, landing after both lines have finished drawing —
  never mid-reveal, never before France's own line is visible.

## Source line

`Source: UN World Population Prospects (2024) & other sources, via Our World in Data · 1990–2023 data`
