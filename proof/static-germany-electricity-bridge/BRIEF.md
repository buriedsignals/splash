---
size: landscape
type: waterfall
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Germany generated 143 fewer terawatt-hours in 2024 than 2015

**Type:** waterfall. **Medium/format:** chart / static. **Channel:** article web, 900 x 560.

## Claim

Germany's total electricity generation fell from 639 TWh in 2015 to 496 TWh in 2024 — a net drop
of 143 TWh — because the nuclear phase-out (-92 TWh) and a falling fossil share (-154 TWh)
outweighed renewables growth (+103 TWh).

## Subject and accent

Three roles, three colours per `references/types/waterfall.md`: increase (blue), decrease
(vermillion) — deliberately not red/green — and total (the page's own muted ink, not a third
saturated hue). Value labels float above each bar's growing edge in ink, never set inside a bar in
white, the sheet's own named defect on narrow bars.

## Source

Same `electricity-mix.csv` pull as the other electricity beats, Germany only, 2015 and 2024. The
bridge's three steps are each source group's own change (2024 minus 2015), not independent
readings — computed once in `render.mjs` and replayed/verified before the component ever sees
them (opening total + every step = closing total, exactly).

## What went wrong, caught by looking

This beat's first draft used a Swiss demographic bridge (births/deaths/migration on a population
base) — arithmetically exact (verified: 8,792,180 + 83,702 - 73,789 + 68,471 = 8,870,564 exactly),
but the render showed the three floating bars as barely-visible slivers, because the deltas were
about 1% of the ~8.8M opening total. Correct, but the whole point of a waterfall — walking the
bridge and seeing what drove the change and by how much — was invisible at that scale. Replaced
with this beat, whose three steps are 15-25% of the total: the shape is now genuinely legible.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize` and verified from
the delivered PNG's own IHDR. It shipped 1800 x 1120 before — the frame stated twice as literals
that agreed with each other, rasterised at x2.

**Square and portrait are refused by `type-at-size.mjs`, before a mark is drawn.** A waterfall's
category axis is nominal but its bars FLOAT on a running total, so transposing it is not the same
drawing rotated — the connectors, the zero rule and the two full-height totals all change meaning.
It is therefore not in `BAND_SCALE_TYPES`, and no aspect range has been measured for it, so the
toolchain refuses rather than stretching it into a shape nobody chose. Reversing that is one probe
run: render the stretch arm at the two frames, take the extremes, record them in `MEASURED_ASPECT`.

**What the bigger type broke, caught by looking.** The legend stepped its three swatches by bare
offsets — `PAD + 100` and `PAD + 205`. At a 2.2x scale the word "Increase" alone measures 100px, so
the Decrease swatch would have landed inside it. Each entry is measured off its own words now. The
beat also gained a plot-and-bar floor of its own: a waterfall has no measured aspect range, so
`assertPlotAspect` never clamps it, and a bar narrower than the value printed over it clears
`assertTypeFloor` while being unreadable.

## The choreography

Two full-height bars stand at the two ends of the plate, and the bridge is what runs between them:
the eye takes the opening and the closing first, because they are the only bars touching the
baseline. Then the three steps, each in its role's own colour — one up, two down, three roles and
three colours, deliberately not red and green. The dotted connectors carry the running level
across each gap, which is the only thing that makes a floating bar readable. Under all of it, one
black rule spans the two totals and prints the net: the closing is 143,2 TWh below the opening,
and that is where the reading ends.

**The eye enters at** `the two totals`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the two totals` | `the net-change rule` |
| reference | `the three steps` | `the two totals` |
| reveal | `the connectors` | `the three steps` |
| conclusion | `the net-change rule` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the two totals",
  "stations": [
    {
      "station": "establish",
      "carries": "the two totals",
      "subordinateTo": "the net-change rule"
    },
    {
      "station": "reference",
      "carries": "the three steps",
      "subordinateTo": "the two totals"
    },
    {
      "station": "reveal",
      "carries": "the connectors",
      "subordinateTo": "the three steps"
    },
    {
      "station": "conclusion",
      "carries": "the net-change rule",
      "subordinateTo": null
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **143 TWh is the difference of two totals** — 639,2 minus 496,0 is computed from the frozen file; the headline rounds it once and the rule prints it to a tenth.
- **Opening plus the three steps equals the close** — the bridge is asserted to balance to a stated precision before the render, because a waterfall that does not close is a stacked bar with gaps.
- **One scale from zero for totals and steps** — the same zero-based scale carries the two full-height bars and the three floating ones, or a step's height would not be a quantity.
- **Each step's from and to is computed** — every step's start and end level comes from the frozen file rather than being typed to make the bridge land.
- **The bridge closes inside one frame** — opening, steps, connectors and closing are all at rest together; the net rule is only checkable because both totals are visible beside it.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "143-twh-is-the-difference-of",
    "opening-plus-the-three-steps-equals",
    "one-scale-from-zero-for-totals",
    "each-step-from-and-to-is",
    "the-bridge-closes-inside-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "143-twh-is-the-difference-of",
    "opening-plus-every-step-equals-the": "opening-plus-the-three-steps-equals",
    "one-scale-from-zero-for-the": "one-scale-from-zero-for-totals",
    "each-step-from-to-is-computed": "each-step-from-and-to-is",
    "asserted-in-the-one-frame": "the-bridge-closes-inside-one-frame"
  }
}
```
