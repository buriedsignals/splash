---
size: landscape
type: area
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986

**Type:** area (chart). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above.

The first `area` beat in this tree.

## It draws the same series as the line beat, and the pair is the argument

`proof/co2-suisse` draws this exact frozen file as a **line**. A line carries a **rate**: how much in
this year, which way it is going. Filling it adds exactly one claim — that the surface between the
curve and the baseline is a **quantity**, the stock the rate accumulates to.

That claim has a price, and the two BRIEFs say opposite things for stated reasons. The line beat
refuses a forced zero in as many words: *« Pas d'axe à zéro forcé : c'est une ligne ; la pente porte
la valeur. »* This beat requires one. **The moment the same series is filled, every clipped tonne
becomes surface a reader integrates.** The component throws rather than draw one pixel over a
non-zero base — written as a check, because a comment does not fail.

The second price is paid before a mark is drawn: **an area closes across a gap.** The polygon joins
the years either side of a missing one and the reader integrates a value nobody measured, with
nothing on the plate to show it. `render-directions.mjs` refuses a series whose years are not
consecutive.

## The claim

**Switzerland has emitted 3 158 Mt of CO₂ since 1858, and half of it since 1986 — 38 years out of
167.** The 38 recent years carry 49.9 % of the total, the 129 earlier ones 50.1 %.

Every number is the integral the surface draws, computed from the same readings the surface is drawn
from, and the plate refuses to render if the split it measures is not near half or if the recent
span is not far shorter than the earlier one.

## The two surfaces are the same size, and a reader can check it

The plate cuts the surface at the year the running total passes its midpoint, and names both halves
inside themselves with their spans and their shares. Those are **two states of one quantity, not two
categories**, so `two-states-of-one-measure-are-one-hue-at-two-chromas` (Datawrapper, Statista)
governs the colour: one hue, two chromas of the direction's own accent, and no imported second hue.
The tint is taken as far toward the ground as it can go while still clearing the non-text floor
against it — a tint nobody can see is not a state, it is a hole in the surface.

A half is named inside itself only where the surface there is measurably taller than the label and
wider than it; a half too small for its name would be named above the plot rather than written over
a surface that cannot hold it.

## What the corpus decided

`the-target-is-named-on-the-line-that-draws-it` — 1986 is written on the rule that marks it, not in a
legend. `direct-end-label-in-the-series-colour` — the last reading is written at the end of the
curve, in the surface's own colour. `accent-marks-the-thread` — the accent is spent on the surface,
which is the subject; the rule, the axis and the baseline are neutrals.

`a-free-baseline-forbids-a-value-axis` is the streamgraph family's rule and it is the reason a value
axis is **admissible** here: this baseline is not free, it is zero.

`raw-under-smoothed` is offered and **not taken**. A smoothed mean drawn over a filled area is a
second curve bounding a surface it does not bound, and the reading is the surface.

## A note on this form's own evidence

The `area` form's single filed reference is **Ferdio's 100 datavizproject #34**, which draws paired
triangles rather than a time series — one publication, below this base's floor of two independent
ones, and about a different mark. It contributes exactly one rule, and the plate takes it: **let a
guide rule stop at the data's own extent rather than spanning the frame.** The rule at 1986 rises
from the baseline to the curve and stops there.

Everything else this beat leans on comes from the `line` and `streamgraph` families, which are
evidenced. The form gets no family rules of its own until a second desk is harvested — the same
position `proof/static-proportional-symbol-europe-capacity` and `proof/static-contour-europe-distance`
record for the same reason.

## Source

Global Carbon Budget 2025, via Our World in Data, territorial emissions, frozen beside this beat as
`data.csv` — a duplicate of the file the line beat carries, copied rather than linked, because a beat
that reads across a folder boundary cannot be re-rendered on its own.

## The choreography

The surface is the only mark, so the eye lands on it before it lands on anything else — one
silhouette, two tints, cut once. The cut is what turns a shape into an argument: the pale side is
the 129 years before 1986, the accented side the 38 after, and the two italic labels seated inside
them are the reading the whole plate exists for. The `32,1 Mt` at the end of the curve is the
last height, not the claim; it is read after the shares, not before them.

**The eye enters at** `the filled surface`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the filled surface` | `the 1987–2024 area` |
| reference | `the 1986 cut` | `the 1987–2024 area` |
| subject | `the 1987–2024 area` | — |
| conclusion | `the two share labels` | `the 1987–2024 area` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the filled surface",
  "stations": [
    {
      "station": "establish",
      "carries": "the filled surface",
      "subordinateTo": "the 1987–2024 area"
    },
    {
      "station": "reference",
      "carries": "the 1986 cut",
      "subordinateTo": "the 1987–2024 area"
    },
    {
      "station": "subject",
      "carries": "the 1987–2024 area",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the two share labels",
      "subordinateTo": "the 1987–2024 area"
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **1986 is found, not typed** — the split year is the year at which the cumulated stock passes half, searched in the frozen series; the title's 38 years and 167 years are counted off it.
- **The years are consecutive before anything is drawn** — 1858 to 2024 with no hole, asserted before the surface exists — an area bridged over a missing year would draw a stock nobody measured.
- **Every printed share is the integral** — 50,1 % and 49,9 % are integrals of the same readings the surface is drawn from, never a ratio of two heights.
- **The plate refuses a split off the claim** — if the measured halves are not the halves the headline states, the beat throws rather than render a near miss.
- **The one frame carries every number** — both shares, the cut year and the last height are on the plate at once; nothing here is held back for a second reading.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "1986-is-found-not-typed",
    "the-years-are-consecutive-before-anything",
    "every-printed-share-is-the-integral",
    "the-plate-refuses-a-split-off",
    "the-one-frame-carries-every-number"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "1986-is-found-not-typed",
    "the-years-are-asserted-consecutive-before": "the-years-are-consecutive-before-anything",
    "every-printed-number-is-the-integral": "every-printed-share-is-the-integral",
    "the-plate-refuses-to-render-if": "the-plate-refuses-a-split-off",
    "asserted-in-the-one-frame": "the-one-frame-carries-every-number"
  }
}
```
