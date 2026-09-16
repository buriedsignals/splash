---
format: web
type: area
medium: chart
grounding: supported
derived: v1
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986 (web)

**Type:** area (chart). **Medium/format:** chart / **web**. **Frame:** fluid — the geometry stretches
to whatever container it is given, the type never does.

The first `area` beat in this tree's web format, and **the first directed beat in any format other
than static**: it is drawn once per filed direction, through the direction's own six registers,
and nothing about its colour or its type is written in this workspace.

## What "directed" means for a page

The static pass proved the design base could reach a pixel. A page is not a pixel, and the two
halves of the base arrive here differently:

- **Colour** arrives the same way. The direction's ground and accent are the only colours named;
  `deriveFurniture` resolves ink, muted and grid against that ground at render time, and
  `render-web.mjs`'s own stylesheet reads them back as custom properties. The tinted half of the
  surface is `mix(accent, ground, 0.62)` lifted until it clears the non-text floor — never a second
  hue.
- **Type** arrives translated. A plate sets its words as SVG `<text>`; this format draws no `<text>`
  at all, because a word inside a `preserveAspectRatio="none"` viewBox stretches with the geometry.
  So `#shared/design-base/web.mjs` turns each register into a CSS declaration block instead, and two
  things change on the way: case is applied by `text-transform` rather than baked into the string
  (the words are in the DOM here — they are read out, copied and searched), and the resolved face
  carries a generic fallback, because the machine that renders is not the machine that reads.

## The claim

**Switzerland has emitted 3 158 Mt of CO₂ since 1858, and 51,2 % of it since 1986** — 39 years out
of 167. The runner recomputes the total, the crossing year and the split from the frozen file and
throws rather than render if the split is not near half or if the recent span is not far the
shorter one.

## What the web adds, and it is not the static beat repeated

An area chart's claim is that the SURFACE is a quantity — the stock a rate accumulates to. The
static plate states that claim, cuts the surface at **one** year, and prints the two shares either
side of that cut. The cut is the AUTHOR'S: 1986, because that is where the running total crosses its
own half. A plate can only ever hold one cut, so a reader who arrives with a different year in
their head — the year they were born — is holding a question the still cannot answer.

**So the cut becomes the reader's.** The partition of the surface is the one thing this page hands
over, and it is the claim itself rather than a decoration on it.

### The controls, and what each one had to pass

**1 — « Et depuis ma naissance ? »**

| | |
| --- | --- |
| **the reader's question** | Depuis l'année où je suis venu au monde, quelle part de tout le CO₂ suisse a été émise ? |
| **the gesture** | `find-your-own-case` — `chart-web/assets/level.ts`, a reference stood UP at a year the reader chooses |
| **what changes** | The surface **re-partitions at that year**: the tint/accent seam leaves 1986 and travels to 1950, 1965, 1980, 1995 or 2005, so the accent block IS the reader's own lifetime. An ink rule, cased in ground, stands up on the new seam; the year is written at the foot of it; that year's reading takes a ring among 166 that stay anonymous; and a sentence gives four readings no axis on this plate holds — how many of the 167 years the reader has lived, what share of the TIME that is, the Mt and the share of the STOCK emitted since, and the mean annual rate of those years against the mean of every year before. |

What it answers, in the reader's own hand: a reader born in **1950** has lived 75 of the 167 years —
45 % of the time — and **85,3 %** of Switzerland's whole stock has been emitted inside them. One born
in **2005** has lived 20 years, 12 % of the time, and a **quarter** of the stock. The still can say
that half came after 1986; it cannot say either of those, and it cannot be made to.

**Two things the control does NOT do, and both are rule 5 of `directed-interaction.md`.** The
midpoint rule at 1986, its note, the title, the total line and the reading line are drawn
unconditionally and no option removes any of them — the reader's cut is laid *against* the claim,
never *instead of* it. And the untouched state is exactly the plate: `noneLabel` is
« La moitié, en 1986 », and it is the picture a reader with no script never leaves.

**2 — « Cette année-là, elle valait combien ? »**

| | |
| --- | --- |
| **the reader's question** | Cette année-là vaut combien, et quelle part du total était déjà derrière ? |
| **the gesture** | `ask-a-mark` — hover, tap, keyboard focus on any of the 167 readings |
| **what changes** | The year answers with its own annual figure and with the share of the whole surface lying to its left — the 167 readings the plate had room to label six of. Baked server-side from the same arithmetic that drew the mark; the browser never formats a number. |

The two controls answer on two channels and one of them is not a repetition of the other: the ask
reads the cumulative share **at** a year, the yardstick states what is **left after** it, in Mt, in
years, and as a rate — and it repaints the surface to show it. `directed-interaction.md` says in as
many words that two controls producing related states is not a defect when they answer two
different questions.

### How this is not the scrolly sibling's choreography

`proof/scrolly-area-swiss-co2` (on `quality/scrolly`) traces, names, fills with a counted stock,
splits, rescales onto the recent half, and pulls back. Its split is **card 4**: the author's, at
1986, arrived at once and left behind. Its rescale is a moving `viewBox`.

This page inverts the authorship and keeps the frame still. There is no sequence, no arrival and no
camera: the split is the only thing that moves, it moves where the READER puts it, it can be put
back, and every position of it is answered with arithmetic the scrolly never states because the
scrolly only ever stands in one of them. Nothing here rescales — the 167 years stay in frame at
every option, which is what makes the reader's block visibly a *part of* the whole rather than a
frame of its own.

### The type sheet's trap, and why it does not apply here

`chart-beat/references/types/area.md`: *"Every band above the bottom one sits on a moving floor…
a reader judging whether the SECOND-from-bottom band is growing is actually subtracting two wavy
lines in their head."*

**Its literal form is absent: this beat is not stacked.** It draws ONE series. The two chromas are
not two bands — they are one band cut at a year, both halves sitting on the same flat zero, neither
on a floor that moves. There is no second-from-bottom band to read, so the sheet's own remedy (let
the reader choose which band rests on the baseline, as `proof/webx-electricity-mix` did) has nothing
to act on, and reaching for it because it is at hand would have been a control over a problem this
beat does not have.

**Its reason is open, in this form's own shape, and the yardstick is the answer to it.** The reason
the sheet gives is that the chart claims a reading the eye cannot take directly. A single-series
area makes exactly that claim one axis over: the reader perceives HEIGHT directly and must
INTEGRATE to get the stock, so *every* statement about the surface — including "these two halves are
the same size", which the plate asserts of a 129-year slab and a 38-year block of utterly different
shape — is a reading no eye can take off the picture. The plate answers it once, for its own cut.
This page answers it for the reader's, wherever they put it, and states the integral on both sides
in Mt and in percent rather than asking anyone to compare two areas by eye.

The sheet's second, rendering failure — *"opaque, unbordered bands similar in hue fuse into a single
mass"* — does apply, and was already paid: the curve carries its own stroke along the top edge, and
the two chromas are separated by the rule standing on the seam.

## The two refusals, both checked rather than commented

**An area closes across a gap.** The polygon joins the years either side of a missing one and the
reader integrates a value nobody measured, with nothing on the page to show it. The runner refuses a
series whose years are not consecutive, before a mark is drawn.

**An area needs its zero.** The moment a series is filled, every clipped tonne becomes surface a
reader integrates. The component throws if the ticks it is handed do not start at zero.

## One thing this build learned, and it is the format's, not this beat's

The first render scrolled sideways at three of the seven verified viewports — "document 558px in a
375px window". The cause was an overlay annotation: the shared stylesheet gives `.note`
`white-space: nowrap` and no transform, which is right for a label anchored at 0 % and wrong for one
anchored at 50 %. An unwrapped run started at the middle of a 300px plot and 230px long IS 80px of
horizontal document scroll.

The fix is positional and belongs to every directed web beat, so it went into the shared spine as
`noteAnchor(xPct)`: a label near the left edge hangs right, one near the right edge hangs left, one
in the middle is centred, and any of them may wrap. Every beat after this one gets it for free.

A second defect the same first render showed, and only the eye could: the top tick's own label sat
on top of the caveat line, because the scale's maximum WAS the top tick and the label is centred on
its own height. The scale now carries 6 % of headroom.

## Verification

`bun skills/chart-web/scripts/verify-web.mjs --file proof/web-area-swiss-co2/renders/creme.html` —
**56 checks passed, 0 failed, 5 skipped** (all five skips are the filter's, which this beat declares
none of). Fit at seven viewports from 3440×900 to 375×812, real pointer events over 40 of the 167
marks at two viewports, the same again through the overlay, and every argument-bearing word drawn
with scripting on and with JavaScript disabled.

Then the frames were looked at, in all three directions, which is what caught both defects above.

## Source

Global Carbon Budget 2025, via Our World in Data · Switzerland, 1858–2024, 167 consecutive annual
readings. `data.csv` is a byte-for-byte copy of `proof/static-area-swiss-co2/data.csv` — the same
frozen file, re-parsed independently here, per this tree's "duplicate, do not link" rule between
beats.

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
    "the-total-the-crossing-year-and": null,
    "every-readings-a-control-reveals-years": null,
    "the-untouched-state-label-names-the": null,
    "asserted-in-the-js-off-floor": null
  }
}
```

## The choreography

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "find-your-own-case",
      "input": "hover"
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
