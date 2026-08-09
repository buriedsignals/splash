# Task 0 — the verdict, after opening all three

`MEASUREMENTS.md` is generated. This file is not: it is what a person saw when the three PNGs were
opened, which is the half of the probe a counter cannot do.

Open, in this order:

- `probe-landscape.png` (1920×1080)
- `probe-square.png` (1080×1080)
- `probe-portrait.png` (1080×1920)
- `probe-landscape.png` beside `probe-landscape-half2x.png` — both 1920×1080 files

## The headline: every count came back zero, and portrait is still wrong

| | clipped | collisions | plot fill | plot aspect | tallest bar h:w |
|---|---|---|---|---|---|
| base 900×560 | 0 | 0 | 55% | 2.35:1 | 4.2:1 |
| landscape 1920×1080 | 0 | 0 | 51% | 2.82:1 | 3.5:1 |
| square 1080×1080 | 0 | 0 | 71.9% | 1.12:1 | 8.9:1 |
| **portrait 1080×1920** | **0** | **0** | **84.2%** | **0.54:1** | **18.4:1** |

Landscape reads. Square reads, with a reservation below. **Portrait is a green measurement and a bad
chart**, and that combination is precisely the failure this project has on its record
(`HANDOVER.md:668-681`: a heatmap that shipped as a flat grey slab with every assertion green).

What the picture shows and no counter above can: a histogram's argument is the SHAPE of a
distribution, and shape is an aspect ratio. Stretching the plot from 2.35:1 to **0.54:1** turns a
right-skewed distribution into one grey column three-quarters of a metre tall next to nine slivers,
with a third of the frame empty white to the right of bin 28. The tallest bar goes from 4.2:1 to
**18.4:1**. Not one label moved, nothing was clipped, nothing collided, and the chart stopped making
its point.

This is the static path meeting the defect the web genre already names for itself
(`web-discipline.md:247-273`, `preserveAspectRatio="none"` distorting any mark whose SHAPE is the
argument). Nobody had noticed it applies to a fixed-frame static as soon as the frame stops being
fixed.

## The five answers

**1 — clipping and collision.** Zero everywhere, **but only after a real edit** (see 3). The
probe's first run collided twice at landscape: the title's last line into the subtitle
(1634 × 4.5 px of overlap) and the subtitle's second line into the source
(413 × 5.8 px). Both are in `MEASUREMENTS.md`'s history only because they were fixed; the cause is
under 3.

**2 — plot fill.** 51% / 71.9% / 84.2%. The original Splash's own equivalent was ~47% before a
headroom factor and ~63% after (`skills/chart-native/src/core/format.ts:132-139`), so **no
`boostPlotAspect` is needed to make a portrait bigger** — the survey's hypothesis was that portrait
would come back starved and it comes back the opposite. The trigger the spec wrote down for a
`boostPlotAspect`-shaped follow-up (§6) **has fired, pointing the other way**: what portrait needs is
a CAP on plot aspect, not a boost.

**3 — did the measured gutters and the wrapped title re-derive with no edit?** **Split, and the
split is the finding.**

- *Yes* for everything that goes through `measureText`: `wrap()` re-flowed the title and the
  subtitle at every width with no edit, and `padding.left` re-derived from the widest y-tick label
  at its own new font size. That is the twin's advantage and it held.
- *No* for the **eleven bare spacing literals** in the layout arithmetic — `+ 28`, `+ 22`, `+ 34`
  between the header blocks; `+ 8`, `+ 24`, `+ 6`, `+ 10` inside `padding`; `+ 20`, `+ 4`, `+ 16`,
  `+ 8`, `− 10` at the marks (`CarbonFootprintHistogram.tsx:160-177, 246-323`). Every one of them is
  900×560 tuning wearing no name. Leaving them at their literal value while the type grew 2.1× is
  exactly what collided the header at landscape. They are not a re-layout — routing them through the
  same multiplier fixed all of it — but they are **eleven edits per beat that the survey's
  bucket-B claim did not anticipate.**

**4 — did anything outside {typeScale, tick hints, collision thresholds} need editing?**
**TRUE**, on the strength of the eleven literals, and per the spec's own instruction that answer
stops Task 1 until the spec is revised. The revision is in `specs/W4-export-sizes.md` §4 Task 3:
the token list a beat must parameterise is not the seven named font/pad constants, it is
**every spacing number in the file**, which is why `sp()` exists. Nothing beyond that was needed:
no bespoke label placement moved, no annotation was re-anchored, the median rule and its label were
correct at all three sizes.

**5 — the rasteriser.** Decided: **the frame IS the export size, rasterised 1:1; the `× 2` goes.**

Both files are 1920×1080 and the type is indistinguishable — resvg is a vector rasteriser, so a
960-wide frame at 2× and a 1920-wide frame at 1× resolve glyphs identically. What separates them is
visible on the median rule: at 2× **every `strokeWidth` and every `strokeDasharray` doubles**, so
the component's `strokeWidth={1}` gridline is delivered as a 2px line and the `"6 4"` dash as a
"12 8". The rasteriser is making a design decision the component thought it had made. At 1× every
number in the component means the pixel it will actually be.

*The losing option, recorded so nobody re-opens it without new evidence:* keep the halved frames
(960×540 / 540×540 / 540×960) at 2×. It delivers the same pixel count and the same text quality, and
it would have let the existing type tokens stay closer to their tuned values. It loses because
hairlines stop being hairlines and because a component that cannot state a 1px rule is a component
whose numbers are advisory.

## The reservation on square, which is not a defect and is a decision

Square reads, at `typeScale` 1.2. But R2 says square is **social posts** — seen on a phone at maybe
400 CSS px, where a 30px title on a 1080 frame lands at 11px. The probe's hand-picked scale
preserves *apparent size in an article column*, which is the wrong reference for a feed. That is the
spec's own point that `typeScale` is per size AND per craft skill, arriving on the static path too:
**square's static row wants a larger scale than `width / 900` gives it.** Recorded, not guessed at —
picking that number needs a phone-sized look, and it is named in the spec's residue.

## What this costs, against the spec's estimate

| task | spec said | probe says |
|---|---|---|
| 1 — the table + walker | low | unchanged |
| 2 — video | low mechanically | unchanged; `useVideoConfig()` is already there |
| 3 — static, 17 beats | **medium-high** | **higher.** Not seven constants per beat — every spacing number in the file, ~11 in the simplest type this corpus has, in a beat with no packing and no bespoke collision code. And a per-type aspect decision for portrait that the spec had not budgeted at all. |
| 4 — dw-beat | near zero | unchanged |

The spec's sequencing survives. Its Task 3 estimate does not.
